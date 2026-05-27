export interface OuraDailyRecord {
  date: string
  hrv_rmssd: number
  resting_hr: number
  readiness_score: number
  temperature_deviation: number
}

export interface PatientChart {
  id: string
  firstName: string
  lastName: string
  age: number
  phone: string
  diagnosis: string
  ejectionFraction: number
  nyhaClass: string
  medications: string[]
  lastDecompensationDate: string
  consecutiveRejections: number
  suppressionActive: boolean
}

export interface OuraAnomalyResult {
  anomalyDetected: boolean
  anomalousSignals: string[]
  hrvDelta: number
  hrDelta: number
  readinessScore: number
  readinessBaseline: number
  tempDeviation: number
  consecutiveNights: number
  last_7_days?: OuraDailyRecord[]
  baseline?: {
    hrv_rmssd: number
    resting_hr: number
    readiness_score: number
    temperature_deviation: number
  }
}

export interface ParsedSOAPTranscript {
  S1_general?: string
  S2_dyspnea?: boolean
  S2a_at_rest?: boolean
  S3_orthopnea?: boolean
  S4_edema?: boolean
  S4a_constant?: boolean
  S5_fatigue_worse?: boolean
  S6_cough?: boolean
  O3_missed_meds?: boolean
  O4_weight_gain?: boolean
  O4_pounds?: number
  raw: string
}

export interface ScoreOutput {
  total: number
  breakdown: Record<string, number>
  alertLevel: 'urgent' | 'review' | 'monitor'
  suppressAlert: boolean
}

export interface ClinicalBrief {
  id: string
  patientId: string
  patientName: string
  createdAt: string
  alertLevel: ScoreOutput['alertLevel']
  score: ScoreOutput
  oura: OuraAnomalyResult
  soap: ParsedSOAPTranscript
  briefText: string
  clinicianAction?: 'approve' | 'reject' | 'urgent'
  clinicianNotes?: string
}

export interface Scenario {
  id: string
  label: string
  description: string
  expectedScore: number
  expectedAlert: 'urgent' | 'review' | 'monitor'
}

export interface TriggerResult {
  ok: boolean
  // Demo / pre-baked pipeline (DEMO_MODE=true)
  briefId?: string
  alertLevel?: 'urgent' | 'review' | 'monitor'
  score?: number
  mode?: string
  // Real call (DEMO_MODE=false) — webhook or manual process delivers the brief later
  conversationId?: string
  scenario?: string | null
}

export interface CheckInSummary {
  id: string
  createdAt: string
  alertLevel: 'urgent' | 'review' | 'monitor'
  scoreTotal: number
  clinicianAction: 'approve' | 'reject' | 'urgent' | null
}
