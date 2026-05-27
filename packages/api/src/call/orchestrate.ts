import { Router } from 'express'
import type { PatientChart, OuraAnomalyResult, ParsedSOAPTranscript } from '../types'
import type { OuraMockData } from '../oura/anomaly'
import { fetchOuraData, detectAnomaly } from '../oura/anomaly'
import { parseTranscript, SCENARIOS, getScenarioOura } from '../soap/questions'
import { scoreDecompensation } from '../scoring/score'
import { generateClinicalBrief } from '../synthesis/brief'
import { getPatient, saveBrief } from '../db/store'

export const callRouter = Router()

async function runCallPipeline(
  patient: PatientChart,
  rawTranscript?: string,
  scenarioSoap?: Partial<ParsedSOAPTranscript>,
  scenarioOura?: OuraMockData | null
) {
  const ouraData = scenarioOura ?? await fetchOuraData()
  const oura = detectAnomaly(ouraData)
  const soap = parseTranscript(rawTranscript ?? '', scenarioSoap)
  const score = scoreDecompensation({ soap, oura, patientChart: patient })
  const briefText = await generateClinicalBrief(soap, oura, patient, score)

  const brief = saveBrief({
    patientId: patient.id,
    patientName: `${patient.firstName} ${patient.lastName}`,
    alertLevel: score.alertLevel,
    score,
    oura: { ...oura, last_7_days: ouraData.last_7_days },
    soap,
    briefText,
  })

  if (!score.suppressAlert) {
    console.log(`[ALERT] ${score.alertLevel.toUpperCase()} — ${patient.firstName} ${patient.lastName} — Brief ID: ${brief.id} — Score: ${score.total}/175`)
  } else {
    console.log(`[MONITOR] Score: ${score.total}/175 — no clinician alert sent`)
  }

  return brief
}

export async function placeChronicleCall(
  patient: PatientChart,
  oura: OuraAnomalyResult
): Promise<string> {
  const apiKey = process.env.ELEVENLABS_API_KEY
  const agentId = process.env.ELEVENLABS_AGENT_ID
  const phoneNumberId = process.env.ELEVENLABS_PHONE_NUMBER_ID

  if (!apiKey || !agentId || !phoneNumberId) {
    throw new Error('Missing ElevenLabs credentials (ELEVENLABS_API_KEY, ELEVENLABS_AGENT_ID, ELEVENLABS_PHONE_NUMBER_ID)')
  }

  const dynamicVariables = {
    patient_name: patient.firstName,
    condition: 'heart failure',
    oura_summary: oura.anomalyDetected
      ? `Your ring showed lower heart rate variability and higher resting heart rate over the past ${oura.consecutiveNights} nights.`
      : 'Your ring has been detecting some changes recently.',
    known_medications: patient.medications.join(', '),
    last_episode_date: patient.lastDecompensationDate,
  }

  console.log(`[CALL] Placing ElevenLabs outbound call to ${patient.phone}`, dynamicVariables)

  const res = await fetch('https://api.elevenlabs.io/v1/convai/twilio/outbound_call', {
    method: 'POST',
    headers: {
      'xi-api-key': apiKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      agent_id: agentId,
      agent_phone_number_id: phoneNumberId,
      to_number: patient.phone,
      conversation_initiation_client_data: {
        dynamic_variables: dynamicVariables,
      },
    }),
  })

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`ElevenLabs call failed: ${res.status} ${err}`)
  }

  const data = await res.json() as Record<string, unknown>
  console.log(`[CALL] ElevenLabs response:`, JSON.stringify(data))
  const callId = (data.conversation_id ?? data.callSid ?? data.call_sid ?? Object.values(data)[0] ?? 'unknown') as string
  console.log(`[CALL] ElevenLabs call initiated — id: ${callId}`)
  return callId
}

// GET /api/call/scenarios — list available demo scenarios
callRouter.get('/scenarios', (_req, res) => {
  try {
    const list = Object.entries(SCENARIOS).map(([id, s]) => ({
      id,
      label: s.label,
      description: s.description,
      expectedScore: s.expectedScore,
      expectedAlert: s.expectedAlert,
    }))
    res.json({ scenarios: list })
  } catch (err) {
    console.error('[/scenarios error]', err)
    res.status(500).json({ error: String(err) })
  }
})

// POST /api/call/trigger
// DEMO_MODE=true  → skip real call, use pre-baked SOAP answers (fast pipeline test)
// DEMO_MODE=false → always place a real ElevenLabs call; scenario Oura data used as context
callRouter.post('/trigger', async (req, res) => {
  const patientId = ((req.query.patientId ?? req.body?.patientId ?? 'demo-patient-001') as string)
  const scenarioId = req.query.scenario as string | undefined

  const patient = getPatient(patientId)
  if (!patient) return res.status(404).json({ error: 'patient not found' })

  if (scenarioId === 'suppression_test') {
    patient.consecutiveRejections = 3
    patient.suppressionActive = true
  }

  // DEMO_MODE: bypass real call, score immediately with pre-baked answers
  if (process.env.DEMO_MODE?.trim() === 'true') {
    const scenarioSoap = scenarioId ? SCENARIOS[scenarioId]?.soap : undefined
    const scenarioOura = scenarioId ? getScenarioOura(scenarioId) : null
    try {
      const brief = await runCallPipeline(patient, undefined, scenarioSoap, scenarioOura)
      return res.json({
        ok: true,
        mode: scenarioId ?? 'demo',
        briefId: brief.id,
        alertLevel: brief.alertLevel,
        score: brief.score.total,
      })
    } catch (err) {
      console.error('Pipeline error:', err)
      return res.status(500).json({ error: String(err) })
    }
  }

  // Real path: place ElevenLabs call; use scenario Oura for agent opening context if provided
  const scenarioOura = scenarioId ? getScenarioOura(scenarioId) : null
  const ouraData = scenarioOura ?? await fetchOuraData()
  const oura = detectAnomaly(ouraData)
  try {
    const conversationId = await placeChronicleCall(patient, oura)
    return res.json({ ok: true, conversationId, scenario: scenarioId ?? null })
  } catch (err) {
    console.error('ElevenLabs call error:', err)
    return res.status(500).json({ error: String(err) })
  }
})

// POST /api/call/process/:conversationId — manually fetch transcript from ElevenLabs and run pipeline
// Use this if the post-call webhook didn't fire (tunnel was down, etc.)
callRouter.post('/process/:conversationId', async (req, res) => {
  const { conversationId } = req.params
  const patientId: string = (req.query.patientId as string) ?? 'demo-patient-001'

  const patient = getPatient(patientId)
  if (!patient) return res.status(404).json({ error: 'patient not found' })

  const apiKey = process.env.ELEVENLABS_API_KEY
  if (!apiKey) return res.status(500).json({ error: 'Missing ELEVENLABS_API_KEY' })

  const r = await fetch(`https://api.elevenlabs.io/v1/convai/conversations/${conversationId}`, {
    headers: { 'xi-api-key': apiKey },
  })
  if (!r.ok) {
    const err = await r.text()
    return res.status(502).json({ error: `ElevenLabs fetch failed: ${r.status} ${err}` })
  }

  const data = await r.json() as { transcript?: Array<{ role: string; message: string }> }
  const turns = data.transcript ?? []
  const rawTranscript = turns.filter(t => t.role === 'user').map(t => t.message).join(' ')

  console.log(`[PROCESS] Fetched transcript for ${conversationId} — ${turns.length} turns`)

  try {
    const brief = await runCallPipeline(patient, rawTranscript)
    return res.json({ ok: true, briefId: brief.id, alertLevel: brief.alertLevel, score: brief.score.total })
  } catch (err) {
    console.error('Process pipeline error:', err)
    return res.status(500).json({ error: String(err) })
  }
})

// POST /api/call/complete — ElevenLabs post-call webhook
// Payload: { event_type: "post_call_transcription", data: { conversation_id, transcript: [{role, message}] } }
callRouter.post('/complete', async (req, res) => {
  const patientId: string =
    (req.query.patientId as string) ??
    req.body?.patientId ??
    'demo-patient-001'

  const patient = getPatient(patientId)
  if (!patient) return res.status(404).json({ error: 'patient not found' })

  // Parse ElevenLabs transcript format: array of {role: 'agent'|'user', message: string}
  const turns: Array<{ role: string; message: string }> =
    req.body?.data?.transcript ??
    req.body?.transcript ??
    []

  // Join patient (user) turns into a single transcript string for SOAP parsing
  const rawTranscript = Array.isArray(turns)
    ? turns.filter(t => t.role === 'user').map(t => t.message).join(' ')
    : String(turns)

  const conversationId = req.body?.data?.conversation_id ?? 'unknown'
  console.log(`[WEBHOOK] Post-call received — conversation: ${conversationId}, patient: ${patientId}`)

  try {
    const brief = await runCallPipeline(patient, rawTranscript)
    return res.json({ ok: true, briefId: brief.id, alertLevel: brief.alertLevel })
  } catch (err) {
    console.error('Call complete pipeline error:', err)
    return res.status(500).json({ error: String(err) })
  }
})
