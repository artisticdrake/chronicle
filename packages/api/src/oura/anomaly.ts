import path from 'path'
import fs from 'fs'
import type { OuraAnomalyResult, OuraDailyRecord } from '../types'

interface OuraMockData {
  baseline_30day: {
    hrv_rmssd: number
    resting_hr: number
    readiness_score: number
    temperature_deviation: number
  }
  last_7_days: OuraDailyRecord[]
}

function loadMock(): OuraMockData {
  const mockPath = path.resolve(__dirname, '../../../../demo/oura_mock.json')
  return JSON.parse(fs.readFileSync(mockPath, 'utf-8')) as OuraMockData
}

export async function fetchOuraData(): Promise<OuraMockData> {
  if (process.env.DEMO_MODE?.trim() === 'true' || !process.env.OURA_ACCESS_TOKEN) {
    return loadMock()
  }

  const end = new Date().toISOString().split('T')[0]
  const start = new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0]
  const res = await fetch(
    `https://api.ouraring.com/v2/usercollection/daily_readiness?start_date=${start}&end_date=${end}`,
    { headers: { Authorization: `Bearer ${process.env.OURA_ACCESS_TOKEN}` } }
  )
  const json = await res.json() as OuraMockData
  if (!json?.last_7_days) {
    console.warn('[Oura] Unexpected response shape, falling back to mock data')
    return loadMock()
  }
  return json
}

export function detectAnomaly(data: OuraMockData): OuraAnomalyResult {
  const { baseline_30day: baseline, last_7_days: days } = data

  let consecutiveAnomalyNights = 0
  let maxAnomalousSignals: string[] = []

  for (let i = days.length - 1; i >= 0; i--) {
    const d = days[i]
    const flagged: string[] = []

    const hrvPct = ((d.hrv_rmssd - baseline.hrv_rmssd) / baseline.hrv_rmssd) * 100
    if (hrvPct < -15) flagged.push('hrv_rmssd')

    if (d.resting_hr - baseline.resting_hr > 8) flagged.push('resting_hr')

    if (Math.abs(d.temperature_deviation - baseline.temperature_deviation) > 0.5)
      flagged.push('temperature_deviation')

    const readinessPct =
      ((d.readiness_score - baseline.readiness_score) / baseline.readiness_score) * 100
    if (readinessPct < -20) flagged.push('readiness_score')

    if (flagged.length >= 2) {
      consecutiveAnomalyNights++
      if (flagged.length > maxAnomalousSignals.length) maxAnomalousSignals = flagged
    } else {
      break
    }
  }

  const latest = days[days.length - 1]
  return {
    anomalyDetected: consecutiveAnomalyNights >= 2,
    anomalousSignals: maxAnomalousSignals,
    hrvDelta: ((latest.hrv_rmssd - baseline.hrv_rmssd) / baseline.hrv_rmssd) * 100,
    hrDelta: latest.resting_hr - baseline.resting_hr,
    readinessScore: latest.readiness_score,
    readinessBaseline: baseline.readiness_score,
    tempDeviation: latest.temperature_deviation,
    consecutiveNights: consecutiveAnomalyNights,
    last_7_days: days,
    baseline: { ...baseline },
  }
}

export type { OuraMockData }
