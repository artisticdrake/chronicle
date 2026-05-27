# Chronicle

**AI-powered remote monitoring for congestive heart failure patients.**

Chronicle detects early signs of cardiac decompensation by combining passive biometric data from an Oura Ring with an AI-conducted voice check-in call. When signals indicate risk, a clinical brief is generated and routed to the care team for review — before the patient ends up in the ER.

---

## How It Works

```
Oura Ring anomaly detected
        ↓
ElevenLabs AI places outbound call to patient
        ↓
Conversational SOAP assessment (8 clinical questions)
        ↓
Claude synthesizes transcript + biometrics → clinical brief
        ↓
Clinician reviews brief → approve / escalate / dismiss
        ↓
Patient notified via SMS
```

### Scoring Engine (0–175 pts)

| Signal | Points |
|---|---|
| Dyspnea on exertion | 30 |
| Dyspnea at rest | +15 |
| Orthopnea | 25 |
| Peripheral edema | 15 |
| Edema constant | +5 |
| Fatigue worsening | 10 |
| New cough | 10 |
| Missed diuretics | 20 |
| Weight gain ≥2 lb | 25 |
| Oura multi-signal anomaly | 20 |

**Alert thresholds:** `urgent` ≥100 · `review` ≥40 · `monitor` <40

Adaptive suppression: if a clinician rejects 3 consecutive alerts for the same patient, the review threshold raises to prevent alert fatigue.

---

## Tech Stack

| Layer | Tech |
|---|---|
| Voice AI | ElevenLabs Conversational AI |
| Clinical synthesis | Anthropic Claude (claude-sonnet-4-6) |
| Biometrics | Oura Ring API |
| API | Node.js + Express + TypeScript |
| Dashboard | React + Vite + Recharts |

---

## Project Structure

```
packages/
  api/                  Express API server
    src/
      call/             ElevenLabs outbound call + webhook
      clinician/        Clinician review routes
      oura/             Anomaly detection + interpretation
      patient/          Patient trends + check-in history
      scoring/          Decompensation scoring engine
      soap/             SOAP question set + scenario data
      synthesis/        Claude clinical brief generation
      db/               In-memory store
  dashboard/            React dashboard (clinician + patient + dev)
demo/
  patient_profile.json          Demo patient (James Reilly, CHF NYHA III)
  oura_mock.json                Baseline Oura data
  soap_answers.json             Demo SOAP answers
  elevenlabs_agent_system_prompt.md   Agent script for Jenna
```

---

## Setup

### Prerequisites

- Node.js 18+
- ElevenLabs account with a Conversational AI agent and phone number
- Anthropic API key (optional — falls back to canned brief if not set)

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment

```bash
cp .env.example .env
```

Fill in `.env`:

```env
DEMO_MODE=true              # false to place real calls
ELEVENLABS_API_KEY=...
ELEVENLABS_AGENT_ID=...
ELEVENLABS_PHONE_NUMBER_ID=...
ANTHROPIC_API_KEY=...       # optional
PUBLIC_URL=http://localhost:3001
```

### 3. Start the API server

```bash
cd packages/api
npx ts-node-dev --respawn src/index.ts
```

### 4. Start the dashboard

```bash
cd packages/dashboard
npm run dev
```

Dashboard → **http://localhost:5173**

---

## ElevenLabs Agent Configuration

1. Create an agent in the ElevenLabs Conversational AI dashboard
2. Paste the system prompt from `demo/elevenlabs_agent_system_prompt.md`
3. Add dynamic variables: `patient_name`, `oura_summary`, `known_medications`, `last_episode_date`, `condition`
4. Set the post-call webhook to: `https://<your-public-url>/api/call/complete?patientId=demo-patient-001`

For local development, use [ngrok](https://ngrok.com) or `npx localtunnel --port 3001` to expose the webhook.

---

## API Reference

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/call/scenarios` | List demo scenarios |
| `POST` | `/api/call/trigger` | Trigger call or pipeline run |
| `POST` | `/api/call/complete` | ElevenLabs post-call webhook |
| `POST` | `/api/call/process/:conversationId` | Manually fetch + process transcript |
| `GET` | `/api/clinician/dashboard` | Pending brief list |
| `GET` | `/api/clinician/brief/:id` | Full brief + patient |
| `POST` | `/api/clinician/brief/:id/action` | Approve / reject / escalate |
| `GET` | `/api/patient/:id/trends` | Oura trends (patient view) |
| `GET` | `/api/patient/:id/checkins` | Check-in history |
| `GET` | `/api/oura/interpret/:patientId` | AI plain-English Oura summary |
| `POST` | `/api/clinician/reset` | Clear all briefs (demo only) |

### Trigger a scenario (demo mode)

```bash
curl -X POST "http://localhost:3001/api/call/trigger?scenario=urgent_full&patientId=demo-patient-001"
```

Available scenarios: `urgent_full` · `review_moderate` · `monitor_mild` · `suppression_test`

### Trigger a real call

Set `DEMO_MODE=false`, then:

```bash
curl -X POST "http://localhost:3001/api/call/trigger?patientId=demo-patient-001"
```

---

## Dashboard Views

**Clinician** — pending briefs sorted by severity, full brief view with SOAP transcript, Oura charts, score breakdown, and approve/reject/escalate actions.

**Patient** — Oura ring data with AI interpretation, check-in history, and a "I'm not feeling well" button that triggers an immediate call.

**Developer** — scenario simulator, pipeline diagram, clear everything button.

---

## Demo Scenarios

| Scenario | Score | Alert | Description |
|---|---|---|---|
| Full Decompensation | 165/175 | URGENT | All 4 Oura signals + all symptoms + missed meds + 3.5 lb gain |
| Moderate Presentation | 55/175 | REVIEW | Dyspnea + edema + fatigue, stable meds |
| Mild / Fatigue Only | 30/175 | MONITOR | Oura flagged, patient reports only mild fatigue |
| Alert Suppression | 55/175 | REVIEW | Same as moderate, but with 3 prior rejections |

---

## License

MIT
