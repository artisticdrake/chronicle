import type { ParsedSOAPTranscript, OuraAnomalyResult, PatientChart, ScoreOutput } from '../types'

interface ScoreInput {
  soap: ParsedSOAPTranscript
  oura: OuraAnomalyResult
  patientChart: PatientChart
}

export function scoreDecompensation(input: ScoreInput): ScoreOutput {
  let total = 0
  const breakdown: Record<string, number> = {}

  if (input.oura.anomalyDetected && input.oura.anomalousSignals.length >= 2) {
    total += 20
    breakdown['oura_multisignal'] = 20
  }

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
  if (input.soap.O3_missed_meds) { total += 20; breakdown['missed_diuretics'] = 20 }
  if (input.soap.O4_weight_gain) { total += 25; breakdown['weight_gain'] = 25 }

  const threshold = input.patientChart.suppressionActive ? 40 : 35
  let alertLevel: ScoreOutput['alertLevel']
  if (total >= 80) alertLevel = 'urgent'
  else if (total >= threshold) alertLevel = 'review'
  else alertLevel = 'monitor'

  return {
    total,
    breakdown,
    alertLevel,
    suppressAlert: alertLevel === 'monitor',
  }
}
