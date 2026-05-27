import Anthropic from '@anthropic-ai/sdk'
import type { OuraAnomalyResult, PatientChart, ParsedSOAPTranscript, ScoreOutput } from '../types'

const client = process.env.ANTHROPIC_API_KEY?.trim()
  ? new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY.trim() })
  : null

const SYNTHESIS_SYSTEM_PROMPT = `You are a clinical documentation assistant. You generate structured clinical briefs for cardiologists reviewing remote CHF patient check-ins.

You will receive: a SOAP call transcript, Oura wearable data, patient chart context, and a confidence score.

Output a clinical brief in this exact format:

---
CHRONICLE BRIEF — [PATIENT NAME] — [DATE]
Alert level: [URGENT / REVIEW / MONITOR]
Confidence score: [X/175]

OBJECTIVE (wearable data)
- HRV: [value and delta vs baseline]
- Resting HR: [value and delta]
- Readiness: [score, trend]
- Temperature: [deviation]
- Signal pattern: [summary sentence]

SUBJECTIVE (patient-reported)
- [Bullet per confirmed symptom, verbatim patient phrasing in quotes where useful]
- Medications: [adherence status]
- Weight change: [reported value or not reported]

ASSESSMENT
[2–3 sentences. Clinical interpretation of the combined signals. Reference prior episodes if relevant. State what changed vs. last check-in.]

RED FLAGS
[List any high-weight positive findings. If none: "No red flags identified."]

RECOMMENDED ACTIONS
[ ] Schedule appointment within 48h
[ ] Adjust diuretic dose (clinician decision)
[ ] No action required — continue monitoring
[ ] URGENT: recommend patient call 911 or go to ER

CLINICIAN NOTES FIELD
[Leave blank — clinician fills this in dashboard]
---

Rules:
- Never diagnose. Frame everything as "findings consistent with" or "suggests possible."
- Keep total brief under 400 words.
- If any red flag symptom present (dyspnea at rest, severe orthopnea, weight gain >3 lbs + missed meds), mark URGENT regardless of score.
- Use plain clinical language. No jargon overload.`

export async function interpretOuraForPatient(
  oura: OuraAnomalyResult,
  patient: PatientChart
): Promise<string> {
  const baseline = oura.baseline
  const days = oura.last_7_days ?? []
  const latest = days[days.length - 1]

  const trendSummary = days.length > 1
    ? `HRV ${days[0].hrv_rmssd.toFixed(1)}→${latest.hrv_rmssd.toFixed(1)} ms, ` +
      `resting HR ${days[0].resting_hr}→${latest.resting_hr} bpm, ` +
      `readiness ${days[0].readiness_score}→${latest.readiness_score}/100 over 7 nights.`
    : 'Insufficient data.'

  const anomalyContext = oura.anomalyDetected
    ? `Concerning signals detected for ${oura.consecutiveNights} consecutive nights: ${oura.anomalousSignals.join(', ')}.`
    : 'No significant anomalies detected.'

  if (!client) {
    if (oura.anomalyDetected) {
      return `Your ring has picked up some changes over the past ${oura.consecutiveNights} nights that your care team is keeping an eye on. Your heart rate variability has been lower and your resting heart rate slightly higher than your usual range — these are early signals that sometimes appear before symptoms develop.

This doesn't mean something is definitely wrong, but it's why your care team may reach out. The most important thing you can do is keep taking your medications as prescribed, and let your care team know if you notice any new shortness of breath, swelling, or fatigue.

Your readiness score of ${oura.readinessScore}/100 (your usual is around ${oura.readinessBaseline}) suggests your body may be working a bit harder than normal. Rest when you can, and don't hesitate to contact your care team if anything feels off.`
    }
    return `Your Oura ring data from the past week looks reassuring. Your heart rate variability, resting heart rate, and readiness scores are all within your normal range — no unusual patterns detected.

Keep up the good work with your daily routine and medications. Your ring is continuously tracking these signals, and your care team will be notified if anything changes.

Your current readiness score of ${oura.readinessScore}/100 is right in line with your typical baseline of ${oura.readinessBaseline}. That's a good sign.`
  }

  const response = await client.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 400,
    system: `You are a compassionate health communication assistant for a heart failure monitoring app.
Write in plain, warm language a patient can easily understand. No medical jargon.
Explain what their Oura ring data means for them personally.
Be honest but reassuring. Keep to 3 short paragraphs.`,
    messages: [{
      role: 'user',
      content: `Patient: ${patient.firstName}, age ${patient.age}, CHF (EF ${patient.ejectionFraction}%, NYHA Class ${patient.nyhaClass}).
Baseline: HRV ${baseline?.hrv_rmssd ?? 'unknown'} ms, resting HR ${baseline?.resting_hr ?? 'unknown'} bpm, readiness ${baseline?.readiness_score ?? 'unknown'}/100.
7-night trend: ${trendSummary}
Anomaly status: ${anomalyContext}
HRV change: ${oura.hrvDelta.toFixed(1)}%, HR change: ${oura.hrDelta > 0 ? '+' : ''}${oura.hrDelta} bpm.
Write a patient-friendly explanation of what this data means for them.`,
    }],
  })

  return response.content[0].type === 'text' ? response.content[0].text : ''
}

export async function generateClinicalBrief(
  soap: ParsedSOAPTranscript,
  oura: OuraAnomalyResult,
  patient: PatientChart,
  score: ScoreOutput
): Promise<string> {
  if (!client) {
    return `---
CHRONICLE BRIEF — ${patient.firstName} ${patient.lastName} — ${new Date().toLocaleDateString()}
Alert level: ${score.alertLevel.toUpperCase()}
Confidence score: ${score.total}/175

[DEMO MODE — No ANTHROPIC_API_KEY set. Add your key to .env to enable Claude synthesis.]

OBJECTIVE (wearable data)
- HRV: ${oura.hrvDelta.toFixed(1)}% change from baseline
- Resting HR: ${oura.hrDelta > 0 ? '+' : ''}${oura.hrDelta} bpm from baseline
- Readiness score: ${oura.readinessScore} (baseline: ${oura.readinessBaseline})
- Temp deviation: ${oura.tempDeviation}°C
- Anomalous signals: ${oura.anomalousSignals.length > 0 ? oura.anomalousSignals.join(', ') : 'none'}

SUBJECTIVE (patient-reported)
- Dyspnea: ${soap.S2_dyspnea ? 'Yes' + (soap.S2a_at_rest ? ' (at rest)' : ' (on exertion)') : 'No'}
- Orthopnea: ${soap.S3_orthopnea ? 'Yes' : 'No'}
- Edema: ${soap.S4_edema ? 'Yes' + (soap.S4a_constant ? ' (constant)' : '') : 'No'}
- Fatigue worse: ${soap.S5_fatigue_worse ? 'Yes' : 'No'}
- New cough: ${soap.S6_cough ? 'Yes' : 'No'}
- Missed diuretics: ${soap.O3_missed_meds ? 'Yes' : 'No'}
- Weight gain: ${soap.O4_weight_gain ? `Yes${soap.O4_pounds ? ` (~${soap.O4_pounds} lbs)` : ''}` : 'No'}

ASSESSMENT
Score ${score.total}/175 places this patient in the ${score.alertLevel.toUpperCase()} category.
${score.suppressAlert ? 'Alert suppression is active (3+ consecutive rejections).' : ''}

SCORE BREAKDOWN
${Object.entries(score.breakdown).map(([k, v]) => `- ${k}: +${v}`).join('\n')}
---`
  }
  const response = await client.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 1500,
    system: SYNTHESIS_SYSTEM_PROMPT,
    messages: [{
      role: 'user',
      content: `
PATIENT CHART:
- Name: ${patient.firstName} ${patient.lastName}
- Age: ${patient.age}
- Diagnosis: Congestive Heart Failure, EF ${patient.ejectionFraction}%, NYHA Class ${patient.nyhaClass}
- Current medications: ${patient.medications.join(', ')}
- Last decompensation: ${patient.lastDecompensationDate}

OURA SIGNALS (last 7 days vs 30-day baseline):
- HRV: ${oura.hrvDelta.toFixed(1)}% change
- Resting HR: ${oura.hrDelta > 0 ? '+' : ''}${oura.hrDelta} bpm change
- Readiness score: ${oura.readinessScore} (baseline: ${oura.readinessBaseline})
- Temp deviation: ${oura.tempDeviation}°C
- Anomalous signals: ${oura.anomalousSignals.join(', ')}

CALL TRANSCRIPT:
${soap.raw}

CONFIDENCE SCORE: ${score.total}/175
ALERT LEVEL: ${score.alertLevel.toUpperCase()}
SCORE BREAKDOWN: ${JSON.stringify(score.breakdown, null, 2)}
      `,
    }],
  })

  return response.content[0].type === 'text' ? response.content[0].text : ''
}
