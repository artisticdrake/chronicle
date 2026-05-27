# Chronicle — CHF Remote Intelligence System
> Implementation plan for Claude Code · Boston Protocol Hackathon · May 27 2026

---

## Overview

Chronicle is a proactive CHF decompensation detection system. An Oura Ring monitors physiological signals continuously. When multi-signal anomalies are detected against a patient's personal baseline, an ElevenLabs voice agent calls the patient, conducts a structured SOAP interview, and Claude synthesizes the transcript + wearable data into a clinical brief. A clinician reviews and acts. The patient is notified of the outcome.

**Stack:** Oura API · ElevenLabs Conversational AI · Twilio · Anthropic Claude API · Spezi / SpeziVibe · React + Node/Express · Supabase

---

## Repository Structure

```
chronicle/
├── CHRONICLE_PLAN.md          ← this file
├── .env.example
├── packages/
│   ├── api/                   ← Node/Express backend
│   │   ├── src/
│   │   │   ├── oura/          ← Oura API polling + anomaly detection
│   │   │   ├── call/          ← Twilio + ElevenLabs call orchestration
│   │   │   ├── soap/          ← SOAP question pipeline + branch logic
│   │   │   ├── synthesis/     ← Claude transcript → clinical brief
│   │   │   ├── scoring/       ← Confidence score engine
│   │   │   ├── clinician/     ← Clinician action endpoints
│   │   │   └── patient/       ← Patient notification endpoints
│   │   └── index.ts
│   ├── dashboard/             ← React frontend (clinician + patient views)
│   │   ├── src/
│   │   │   ├── clinician/
│   │   │   └── patient/
│   └── mobile/                ← SpeziVibe (React Native) — stretch goal
├── demo/
│   ├── patient_profile.json   ← demo patient data
│   └── oura_mock.json         ← 7-day mock Oura signal data
└── prompts/
    ├── elevenlabs_agent.md    ← ElevenLabs agent system prompt
    └── claude_synthesis.md   ← Claude clinical brief prompt
```

---

## Environment Variables

```env
# Oura
OURA_CLIENT_ID=
OURA_CLIENT_SECRET=
OURA_ACCESS_TOKEN=          # demo: use personal dev token

# ElevenLabs
ELEVENLABS_API_KEY=
ELEVENLABS_AGENT_ID=        # create agent in ElevenLabs dashboard

# Twilio
TWILIO_ACCOUNT_SID=
TWILIO_AUTH_TOKEN=
TWILIO_PHONE_NUMBER=

# Anthropic
ANTHROPIC_API_KEY=

# Supabase
SUPABASE_URL=
SUPABASE_SERVICE_KEY=

# App
PORT=3001
DEMO_MODE=true              # skips real Oura polling, uses mock data
```

---

## Pipeline 1 — Oura Anomaly Detection

### File: `packages/api/src/oura/anomaly.ts`

**What it does:** Polls Oura API for the last 7 days of data. Computes patient's 30-day rolling baseline per signal. Flags anomaly if ≥2 signals deviate for ≥2 consecutive nights.

### Signals tracked

| Signal | Oura endpoint | Anomaly threshold |
|---|---|---|
| HRV (rMSSD) | `/v2/usercollection/daily_readiness` | ↓ >15% vs. 30-day baseline |
| Resting heart rate | `/v2/usercollection/daily_readiness` | ↑ >8 bpm vs. baseline |
| Skin temperature deviation | `/v2/usercollection/daily_readiness` | ±0.5°C vs. norm |
| Sleep efficiency / readiness score | `/v2/usercollection/daily_readiness` | ↓ >20% vs. baseline |

### Alert suppression logic

```
if (patient.recentFalsePositives >= 3 in last 7 days):
  required_signals = 3   // tighten from 2-of-4 to 3-of-4
else:
  required_signals = 2

if (anomalous_signals >= required_signals for 2+ nights):
  trigger_call()
else:
  log_and_monitor()
```

### Demo mode

```typescript
// demo/oura_mock.json — use this when DEMO_MODE=true
// Simulates: HRV dropped 18%, resting HR up 10bpm, readiness crashed
// Triggers 2-of-4 anomaly → call fires
```

### Oura API call

```typescript
const response = await fetch(
  'https://api.ouraring.com/v2/usercollection/daily_readiness?start_date=2026-05-20&end_date=2026-05-27',
  { headers: { Authorization: `Bearer ${process.env.OURA_ACCESS_TOKEN}` } }
)
const data = await response.json()
// data.data[] → array of daily readiness objects
// fields: hrv_balance, resting_heart_rate, temperature_deviation, readiness_score
```

---

## Pipeline 2 — Place the Call

### File: `packages/api/src/call/orchestrate.ts`

**What it does:** Once anomaly is confirmed, load patient chart from Supabase, then fire Twilio outbound call routed through ElevenLabs agent.

### Flow

```
1. Load patient chart (Supabase) → patientContext
2. Build agent context payload (patientContext + Oura signals)
3. Twilio: place outbound call to patient.phone
4. Twilio webhook → ElevenLabs agent handles conversation
5. On call end: ElevenLabs sends transcript webhook → POST /api/call/complete
```

### Twilio outbound call

```typescript
const call = await twilioClient.calls.create({
  to: patient.phone,
  from: process.env.TWILIO_PHONE_NUMBER,
  url: `https://your-ngrok.io/api/call/twiml?patientId=${patient.id}`,
})
```

### TwiML connecting to ElevenLabs

```xml
<!-- GET /api/call/twiml -->
<Response>
  <Connect>
    <Stream url="wss://api.elevenlabs.io/v1/convai/twilio?agent_id=AGENT_ID" />
  </Connect>
</Response>
```

### Patient context injected into agent

```typescript
// Passed as dynamic variables to ElevenLabs agent at call start
const agentContext = {
  patient_name: patient.firstName,
  condition: "heart failure",
  oura_summary: "Your ring showed lower heart rate variability and higher resting heart rate over the past two nights.",
  known_medications: patient.medications.join(", "),
  last_episode_date: patient.lastDecompensationDate,
}
```

---

## Pipeline 3 — SOAP Question Tree

### File: `packages/api/src/soap/questions.ts`

**What it does:** Defines the CHF-specific SOAP question pipeline. ElevenLabs agent follows this structure. Each question has a weight used in confidence scoring.

### ElevenLabs agent system prompt

```
File: prompts/elevenlabs_agent.md
```

Paste this into ElevenLabs agent "System Prompt" field:

```markdown
You are Chronicle, a compassionate health monitoring assistant for patients with congestive heart failure.

Your role: conduct a structured health check-in call with the patient. You are NOT a doctor. Never diagnose. Your job is to collect information that will be reviewed by their clinical care team.

Patient context (injected dynamically):
- Name: {{patient_name}}
- Condition: {{condition}}
- Wearable summary: {{oura_summary}}
- Current medications: {{known_medications}}

Conversation rules:
- Warm, calm, unhurried tone. Speak like a caring human, not a robot.
- Ask one question at a time. Wait for the answer before continuing.
- If the patient says something concerning (chest pain, can't breathe, feels like emergency), STOP the SOAP interview immediately and say: "I'm going to let your care team know right away. If you feel this is an emergency, please call 911 now."
- Never ask more than 10 questions total.
- End the call by telling the patient their care team will review this and follow up.

Question sequence (follow this order, adapt naturally):

S1 [ANCHOR]: "Hey {{patient_name}}, this is your Chronicle health assistant. Your ring has shown some changes the last couple of nights — how have you been feeling overall?"
→ Listen for keywords: breathless, tired, swelling, discomfort, fine/okay

S2 [DYSPNEA]: "Are you feeling more short of breath than usual — like when walking around the house or climbing stairs?"
→ YES: ask "Does it happen at rest too, or only when moving?"
→ NO: proceed to S3

S3 [ORTHOPNEA]: "Have you needed more pillows than usual to sleep comfortably, or woken up feeling like you couldn't breathe?"
→ YES: note it, high weight signal
→ NO: proceed to S4

S4 [EDEMA]: "Have you noticed any swelling in your legs, ankles, or feet — more than usual?"
→ YES: ask "Is it worse at the end of the day, or has it been constant?"
→ NO: proceed to S5

S5 [FATIGUE]: "How's your energy been compared to last week — about the same, a little worse, or noticeably worse?"

S6 [COUGH]: "Any new cough, or has your cough changed recently?"

O3 [MEDS]: "Have you been taking your water pills every day this week?" (ask only if adherence unclear from chart)

O4 [WEIGHT]: "Have you weighed yourself recently? Any change of more than 2–3 pounds in the last couple of days?"

CLOSE: "Thank you so much for talking with me today. I'm going to send everything to your care team right now and they'll follow up with you soon. Take care."

After the call: output a clean JSON transcript with each Q&A pair labeled by SOAP section.
```

### Question weights for scoring

```typescript
export const SOAP_WEIGHTS = {
  S2_dyspnea_on_exertion: 30,
  S2a_dyspnea_at_rest: 15,       // additional if at rest
  S3_orthopnea: 25,
  S4_peripheral_edema: 15,
  S4a_edema_constant: 5,         // additional if constant
  S5_fatigue_worse: 10,
  S6_new_cough: 10,
  O3_missed_diuretics: 20,
  O4_weight_gain_2lb: 25,
  O1_oura_multisignal: 20,       // already confirmed by trigger
}
```

---

## Pipeline 4 — Confidence Score Engine

### File: `packages/api/src/scoring/score.ts`

**What it does:** Takes parsed SOAP transcript + Oura signals → returns numerical confidence score + alert level.

```typescript
interface ScoreInput {
  soap: ParsedSOAPTranscript
  oura: OuraAnomalyResult
  patientChart: PatientChart
}

interface ScoreOutput {
  total: number
  breakdown: Record<string, number>
  alertLevel: 'urgent' | 'review' | 'monitor'
  suppressAlert: boolean
}

function scoreDecompensation(input: ScoreInput): ScoreOutput {
  let total = 0
  const breakdown: Record<string, number> = {}

  // Oura signals (pre-confirmed anomaly = baseline 20 points)
  total += 20
  breakdown['oura_multisignal'] = 20

  // SOAP subjective
  if (input.soap.S2_dyspnea) {
    total += 30; breakdown['dyspnea_exertion'] = 30
    if (input.soap.S2a_at_rest) {
      total += 15; breakdown['dyspnea_rest'] = 15
    }
  }
  if (input.soap.S3_orthopnea) { total += 25; breakdown['orthopnea'] = 25 }
  if (input.soap.S4_edema) {
    total += 15; breakdown['edema'] = 15
    if (input.soap.S4a_constant) { total += 5; breakdown['edema_constant'] = 5 }
  }
  if (input.soap.S5_fatigue_worse) { total += 10; breakdown['fatigue'] = 10 }
  if (input.soap.S6_cough) { total += 10; breakdown['cough'] = 10 }

  // Objective
  if (input.soap.O3_missed_meds) { total += 20; breakdown['missed_diuretics'] = 20 }
  if (input.soap.O4_weight_gain) { total += 25; breakdown['weight_gain'] = 25 }

  // Alert level
  let alertLevel: ScoreOutput['alertLevel']
  const threshold = input.patientChart.suppressionActive ? 40 : 30

  if (total >= 60) alertLevel = 'urgent'
  else if (total >= threshold) alertLevel = 'review'
  else alertLevel = 'monitor'

  // Alert suppression: if monitor-only, don't send to clinician
  const suppressAlert = alertLevel === 'monitor'

  return { total, breakdown, alertLevel, suppressAlert }
}
```

### Alert thresholds

| Score | Alert level | Action |
|---|---|---|
| ≥ 60 | `urgent` | Clinician dashboard — red flag, prompt immediate action |
| 30–59 | `review` | Clinician dashboard — standard review |
| < 30 | `monitor` | No clinician alert. Patient gets reassurance. Log only. |

### Alert fatigue suppression

```typescript
// If clinician rejected last 3 consecutive briefs as no-issue:
// raise review threshold from 30 → 40
// Reset on any confirmed clinical event (appointment booked or urgent triggered)
if (patient.consecutiveRejections >= 3) {
  patient.suppressionActive = true  // threshold becomes 40
}
```

---

## Pipeline 5 — Claude Synthesis

### File: `packages/api/src/synthesis/brief.ts`

**What it does:** Takes SOAP transcript + Oura data + patient chart → Claude generates structured clinical brief.

### Claude API call

```typescript
import Anthropic from '@anthropic-ai/sdk'
const client = new Anthropic()

async function generateClinicalBrief(
  transcript: string,
  ouraData: OuraAnomalyResult,
  patientChart: PatientChart,
  scoreResult: ScoreOutput
): Promise<string> {
  const response = await client.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 1500,
    system: SYNTHESIS_SYSTEM_PROMPT,
    messages: [{
      role: 'user',
      content: `
PATIENT CHART:
- Name: ${patientChart.firstName} ${patientChart.lastName}
- Age: ${patientChart.age}
- Diagnosis: Congestive Heart Failure, EF ${patientChart.ejectionFraction}%, NYHA Class ${patientChart.nyhaClass}
- Current medications: ${patientChart.medications.join(', ')}
- Last decompensation: ${patientChart.lastDecompensationDate}

OURA SIGNALS (last 7 days vs 30-day baseline):
- HRV: ${ouraData.hrvDelta}% change
- Resting HR: ${ouraData.hrDelta} bpm change
- Readiness score: ${ouraData.readinessScore} (baseline: ${ouraData.readinessBaseline})
- Temp deviation: ${ouraData.tempDeviation}°C
- Anomalous signals: ${ouraData.anomalousSignals.join(', ')}

CALL TRANSCRIPT:
${transcript}

CONFIDENCE SCORE: ${scoreResult.total}/175
ALERT LEVEL: ${scoreResult.alertLevel.toUpperCase()}
SCORE BREAKDOWN: ${JSON.stringify(scoreResult.breakdown, null, 2)}
      `
    }]
  })

  return response.content[0].type === 'text' ? response.content[0].text : ''
}
```

### Claude synthesis system prompt

```
File: prompts/claude_synthesis.md
```

```markdown
You are a clinical documentation assistant. You generate structured clinical briefs for cardiologists reviewing remote CHF patient check-ins.

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
- Use plain clinical language. No jargon overload.
```

---

## Pipeline 6 — Clinician Dashboard

### File: `packages/dashboard/src/clinician/`

**What it does:** Web interface for the clinician. Shows the brief, Oura chart, transcript, score breakdown. Three action buttons. Editable notes field.

### Routes

```
GET  /clinician/dashboard        → list of pending briefs
GET  /clinician/brief/:id        → full brief view
POST /clinician/brief/:id/action → { action: 'approve' | 'reject' | 'urgent', notes: string }
```

### Action outcomes

```typescript
switch (action) {
  case 'approve':
    // ElevenLabs agent calls patient to book appointment
    await placeBookingCall(patient)
    await notifyPatient(patient, 'appointment_booked')
    break

  case 'reject':
    // Send reassurance email/SMS to patient
    await notifyPatient(patient, 'all_clear', clinicianNotes)
    // Increment consecutiveRejections for suppression logic
    await incrementRejections(patient.id)
    break

  case 'urgent':
    // ElevenLabs agent calls patient immediately for ER referral
    await placeUrgentCall(patient)
    await notifyPatient(patient, 'urgent_referral')
    // Reset suppression counter
    await resetRejections(patient.id)
    break
}
```

### Clinician dashboard components

```
BriefCard.tsx          → alert level badge, score, patient name, timestamp
OuraChart.tsx          → 7-day HRV + HR + readiness trend (recharts)
SOAPTranscript.tsx     → full call transcript, Q&A formatted
ScoreBreakdown.tsx     → bar chart of score contributions per signal
ActionPanel.tsx        → Approve / Reject / Urgent buttons + notes textarea
```

---

## Pipeline 7 — Patient Dashboard

### File: `packages/dashboard/src/patient/`

**What it does:** Simple patient-facing view. Shows their Oura trends, recent check-in summaries, clinician decisions. No raw clinical language.

### Components

```
OuraTrends.tsx         → HRV, readiness, sleep — plain language ("Your heart variability has been lower than usual")
CheckInHistory.tsx     → List of past Chronicle calls + outcome
NextSteps.tsx          → Current status: "Your care team reviewed your check-in. [Outcome]"
```

---

## Demo Data

### File: `demo/patient_profile.json`

```json
{
  "id": "demo-patient-001",
  "firstName": "James",
  "lastName": "Reilly",
  "age": 67,
  "phone": "+16175550001",
  "diagnosis": "Congestive Heart Failure",
  "ejectionFraction": 32,
  "nyhaClass": "III",
  "medications": ["Furosemide 40mg", "Carvedilol 6.25mg", "Lisinopril 10mg", "Spironolactone 25mg"],
  "lastDecompensationDate": "2026-02-14",
  "consecutiveRejections": 0,
  "suppressionActive": false
}
```

### File: `demo/oura_mock.json`

```json
{
  "baseline_30day": {
    "hrv_rmssd": 28.4,
    "resting_hr": 62,
    "readiness_score": 72,
    "temperature_deviation": 0.1
  },
  "last_7_days": [
    { "date": "2026-05-21", "hrv_rmssd": 27.1, "resting_hr": 63, "readiness_score": 70, "temperature_deviation": 0.2 },
    { "date": "2026-05-22", "hrv_rmssd": 26.0, "resting_hr": 65, "readiness_score": 67, "temperature_deviation": 0.3 },
    { "date": "2026-05-23", "hrv_rmssd": 24.5, "resting_hr": 68, "readiness_score": 63, "temperature_deviation": 0.4 },
    { "date": "2026-05-24", "hrv_rmssd": 22.8, "resting_hr": 70, "readiness_score": 58, "temperature_deviation": 0.5 },
    { "date": "2026-05-25", "hrv_rmssd": 21.2, "resting_hr": 72, "readiness_score": 52, "temperature_deviation": 0.6 },
    { "date": "2026-05-26", "hrv_rmssd": 19.8, "resting_hr": 74, "readiness_score": 47, "temperature_deviation": 0.7 },
    { "date": "2026-05-27", "hrv_rmssd": 18.3, "resting_hr": 75, "readiness_score": 43, "temperature_deviation": 0.8 }
  ],
  "anomaly_detected": true,
  "anomalous_signals": ["hrv_rmssd", "resting_hr", "readiness_score", "temperature_deviation"],
  "hrv_delta_percent": -35.6,
  "hr_delta_bpm": 13,
  "readiness_delta_percent": -40.3,
  "temp_deviation": 0.8
}
```

### Demo SOAP answers (simulate patient responses)

```json
{
  "S1": "I've been feeling pretty tired honestly, more than usual",
  "S2": true,
  "S2a_at_rest": false,
  "S3": true,
  "S4": true,
  "S4a_constant": false,
  "S5": "noticeably worse",
  "S6": true,
  "O3_missed_meds": true,
  "O4_weight_gain": true,
  "O4_pounds": 3.5
}
```

**Expected demo score:** 30 (oura) + 25 (orthopnea) + 30 (dyspnea) + 15 (edema) + 10 (fatigue) + 10 (cough) + 20 (missed meds) + 25 (weight) = **165/175 → URGENT**

---

## Build Order for Demo

```
Phase 1 — Core pipeline (build first)
  [ ] 1. Oura anomaly detection (use demo/oura_mock.json)
  [ ] 2. Claude synthesis prompt + brief generation
  [ ] 3. Score engine (scoring/score.ts)
  [ ] 4. Clinician dashboard — brief display + 3 action buttons

Phase 2 — Voice layer (build second)
  [ ] 5. ElevenLabs agent — create in dashboard, paste system prompt
  [ ] 6. Twilio outbound call + TwiML webhook
  [ ] 7. Call complete webhook → transcript → scoring → brief

Phase 3 — Polish for demo
  [ ] 8. Oura chart component (recharts — 7-day HRV + HR)
  [ ] 9. Patient dashboard (simplified view)
  [ ] 10. Demo mode toggle (skip real call, use mock transcript)
```

---

## Need Statement (for slide deck)

> "A way to detect early decompensation in patients with congestive heart failure at home in order to reduce 30-day readmission rates."

## Quintuple Aim

| Dimension | How Chronicle addresses it |
|---|---|
| Patient experience | Proactive, voice-first — no app to open, no form to fill |
| Population health | Scalable to any CHF patient with a wearable |
| Lower cost | Fewer avoidable ER visits and readmissions |
| Clinician experience | One-page brief instead of chasing patient calls |
| Health equity | Works for elderly, low-digital-literacy patients — just a phone call |

## Reimbursement Path

- CPT 99091 — remote physiologic monitoring data interpretation (≥30 min/month)
- CPT 99457 — remote patient monitoring management, first 20 min
- Payer: health system or payer-at-risk (ACO, value-based care contract)
- 90-day pilot: 10 CHF patients, 1 cardiologist, measure call-to-action rate and 30-day readmission vs. historical baseline
