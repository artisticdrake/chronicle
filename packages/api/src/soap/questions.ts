import path from 'path'
import fs from 'fs'
import type { ParsedSOAPTranscript } from '../types'
import type { OuraMockData } from '../oura/anomaly'

function last7Dates(): string[] {
  const today = new Date()
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(today)
    d.setDate(d.getDate() - 6 + i)
    return d.toISOString().split('T')[0]
  })
}

const BASELINE = { hrv_rmssd: 28.4, resting_hr: 62, readiness_score: 72, temperature_deviation: 0.1 }

export function getScenarioOura(scenarioId: string): OuraMockData | null {
  const dates = last7Dates()
  switch (scenarioId) {
    case 'urgent_full':
      return {
        baseline_30day: BASELINE,
        last_7_days: [
          { date: dates[0], hrv_rmssd: 23.0, resting_hr: 71, readiness_score: 65, temperature_deviation: 0.4 },
          { date: dates[1], hrv_rmssd: 22.5, resting_hr: 72, readiness_score: 63, temperature_deviation: 0.5 },
          { date: dates[2], hrv_rmssd: 22.0, resting_hr: 73, readiness_score: 61, temperature_deviation: 0.55 },
          { date: dates[3], hrv_rmssd: 21.0, resting_hr: 73, readiness_score: 58, temperature_deviation: 0.62 },
          { date: dates[4], hrv_rmssd: 20.0, resting_hr: 74, readiness_score: 55, temperature_deviation: 0.68 },
          { date: dates[5], hrv_rmssd: 19.0, resting_hr: 75, readiness_score: 48, temperature_deviation: 0.75 },
          { date: dates[6], hrv_rmssd: 18.3, resting_hr: 76, readiness_score: 43, temperature_deviation: 0.80 },
        ],
      }
    case 'review_moderate':
    case 'suppression_test':
      return {
        baseline_30day: BASELINE,
        last_7_days: [
          { date: dates[0], hrv_rmssd: 27.0, resting_hr: 63, readiness_score: 70, temperature_deviation: 0.2 },
          { date: dates[1], hrv_rmssd: 26.5, resting_hr: 64, readiness_score: 69, temperature_deviation: 0.2 },
          { date: dates[2], hrv_rmssd: 26.0, resting_hr: 64, readiness_score: 68, temperature_deviation: 0.2 },
          { date: dates[3], hrv_rmssd: 25.5, resting_hr: 65, readiness_score: 66, temperature_deviation: 0.3 },
          { date: dates[4], hrv_rmssd: 24.8, resting_hr: 66, readiness_score: 64, temperature_deviation: 0.3 },
          { date: dates[5], hrv_rmssd: 23.0, resting_hr: 71, readiness_score: 62, temperature_deviation: 0.4 },
          { date: dates[6], hrv_rmssd: 22.0, resting_hr: 72, readiness_score: 55, temperature_deviation: 0.45 },
        ],
      }
    case 'monitor_mild':
      return {
        baseline_30day: BASELINE,
        last_7_days: [
          { date: dates[0], hrv_rmssd: 28.0, resting_hr: 62, readiness_score: 72, temperature_deviation: 0.1 },
          { date: dates[1], hrv_rmssd: 27.8, resting_hr: 63, readiness_score: 71, temperature_deviation: 0.15 },
          { date: dates[2], hrv_rmssd: 27.5, resting_hr: 63, readiness_score: 71, temperature_deviation: 0.15 },
          { date: dates[3], hrv_rmssd: 27.2, resting_hr: 63, readiness_score: 70, temperature_deviation: 0.2 },
          { date: dates[4], hrv_rmssd: 26.8, resting_hr: 63, readiness_score: 70, temperature_deviation: 0.2 },
          { date: dates[5], hrv_rmssd: 26.5, resting_hr: 64, readiness_score: 69, temperature_deviation: 0.2 },
          { date: dates[6], hrv_rmssd: 26.0, resting_hr: 65, readiness_score: 68, temperature_deviation: 0.25 },
        ],
      }
    default:
      return null
  }
}

export const SOAP_WEIGHTS = {
  S2_dyspnea_on_exertion: 30,
  S2a_dyspnea_at_rest: 15,
  S3_orthopnea: 25,
  S4_peripheral_edema: 15,
  S4a_edema_constant: 5,
  S5_fatigue_worse: 10,
  S6_new_cough: 10,
  O3_missed_diuretics: 20,
  O4_weight_gain_2lb: 25,
  O1_oura_multisignal: 20,
} as const

export type SOAPKey = keyof typeof SOAP_WEIGHTS

export const SOAP_QUESTIONS = [
  {
    id: 'S1',
    label: 'ANCHOR',
    text: "Hey {{patient_name}}, this is your Chronicle health assistant. Your ring has shown some changes the last couple of nights — how have you been feeling overall?",
    keywords: ['breathless', 'tired', 'swelling', 'discomfort', 'fine', 'okay'],
  },
  {
    id: 'S2',
    label: 'DYSPNEA',
    text: "Are you feeling more short of breath than usual — like when walking around the house or climbing stairs?",
    followUp: "Does it happen at rest too, or only when moving?",
  },
  {
    id: 'S3',
    label: 'ORTHOPNEA',
    text: "Have you needed more pillows than usual to sleep comfortably, or woken up feeling like you couldn't breathe?",
  },
  {
    id: 'S4',
    label: 'EDEMA',
    text: "Have you noticed any swelling in your legs, ankles, or feet — more than usual?",
    followUp: "Is it worse at the end of the day, or has it been constant?",
  },
  {
    id: 'S5',
    label: 'FATIGUE',
    text: "How's your energy been compared to last week — about the same, a little worse, or noticeably worse?",
  },
  {
    id: 'S6',
    label: 'COUGH',
    text: "Any new cough, or has your cough changed recently?",
  },
  {
    id: 'O3',
    label: 'MEDS',
    text: "Have you been taking your water pills every day this week?",
    conditional: true,
  },
  {
    id: 'O4',
    label: 'WEIGHT',
    text: "Have you weighed yourself recently? Any change of more than 2–3 pounds in the last couple of days?",
  },
]

export const SCENARIOS: Record<string, {
  label: string
  description: string
  expectedScore: number
  expectedAlert: 'urgent' | 'review' | 'monitor'
  soap: Partial<ParsedSOAPTranscript>
}> = {
  urgent_full: {
    label: 'Full Decompensation',
    description: 'All 4 Oura signals + all symptoms + missed meds + 3.5 lb weight gain',
    expectedScore: 165,
    expectedAlert: 'urgent',
    soap: {
      S2_dyspnea: true, S2a_at_rest: false, S3_orthopnea: true,
      S4_edema: true, S4a_constant: false, S5_fatigue_worse: true,
      S6_cough: true, O3_missed_meds: true, O4_weight_gain: true, O4_pounds: 3.5,
    },
  },
  review_moderate: {
    label: 'Moderate Presentation',
    description: 'Dyspnea on exertion + edema + fatigue, no missed meds, no weight gain',
    expectedScore: 55,
    expectedAlert: 'review',
    soap: {
      S2_dyspnea: true, S3_orthopnea: false, S4_edema: true,
      S5_fatigue_worse: true, S6_cough: false, O3_missed_meds: false, O4_weight_gain: false,
    },
  },
  monitor_mild: {
    label: 'Mild / Fatigue Only',
    description: 'Oura signals triggered check-in but patient reports only mild fatigue',
    expectedScore: 30,
    expectedAlert: 'monitor',
    soap: {
      S2_dyspnea: false, S3_orthopnea: false, S4_edema: false,
      S5_fatigue_worse: true, S6_cough: false, O3_missed_meds: false, O4_weight_gain: false,
    },
  },
  suppression_test: {
    label: 'Alert Suppression Active',
    description: 'Moderate symptoms (55 pts) with 3 prior rejections — threshold raised to 40, still REVIEW',
    expectedScore: 55,
    expectedAlert: 'review',
    soap: {
      S2_dyspnea: true, S4_edema: true, S5_fatigue_worse: true,
      O3_missed_meds: false, O4_weight_gain: false,
    },
  },
}

function extractPounds(t: string): number | undefined {
  const m = t.match(/(\d+(?:\.\d+)?)\s*(?:pound|lb)/)
  return m ? parseFloat(m[1]) : undefined
}

export function parseTranscript(
  rawText: string,
  scenarioOverride?: Partial<ParsedSOAPTranscript>
): ParsedSOAPTranscript {
  if (scenarioOverride) {
    return {
      raw: `[SCENARIO] ${JSON.stringify(scenarioOverride)}`,
      ...scenarioOverride,
    } as ParsedSOAPTranscript
  }

  if (process.env.DEMO_MODE?.trim() === 'true') {
    const a = JSON.parse(
      fs.readFileSync(path.resolve(__dirname, '../../../../demo/soap_answers.json'), 'utf-8')
    )
    return {
      S1_general: a.S1 as string,
      S2_dyspnea: a.S2 as boolean,
      S2a_at_rest: a.S2a_at_rest as boolean,
      S3_orthopnea: a.S3 as boolean,
      S4_edema: a.S4 as boolean,
      S4a_constant: a.S4a_constant as boolean,
      S5_fatigue_worse: (a.S5 as string) === 'noticeably worse',
      S6_cough: a.S6 as boolean,
      O3_missed_meds: a.O3_missed_meds as boolean,
      O4_weight_gain: a.O4_weight_gain as boolean,
      O4_pounds: a.O4_pounds as number,
      raw: `[DEMO] ${JSON.stringify(a)}`,
    }
  }

  const t = rawText.toLowerCase()
  return {
    S1_general: rawText.slice(0, 200),
    S2_dyspnea: /short.{0,10}breath|breathless/.test(t) && !/not.{0,5}short/.test(t),
    S2a_at_rest: /at rest|sitting still|lying/.test(t),
    S3_orthopnea: /pillow|wake.{0,10}breath/.test(t),
    S4_edema: /swelling|swollen|ankles|feet/.test(t) && !/no swelling/.test(t),
    S4a_constant: /constant|all day/.test(t),
    S5_fatigue_worse: /noticeably worse|much worse|exhausted/.test(t),
    S6_cough: /\bcough/.test(t) && !/no cough/.test(t),
    O3_missed_meds: /missed|forgot|didn.t take/.test(t) && /pill|diuretic/.test(t),
    O4_weight_gain: /gained|weight.{0,20}pound|put on weight/.test(t),
    O4_pounds: extractPounds(t),
    raw: rawText,
  }
}
