import path from 'path'
import fs from 'fs'
import { Router } from 'express'
import { fetchOuraData, detectAnomaly } from './anomaly'
import { listPatientBriefs, getPatient } from '../db/store'
import { interpretOuraForPatient } from '../synthesis/brief'

export const ouraRouter = Router()

// GET /api/oura/debug
ouraRouter.get('/debug', (_req, res) => {
  const mockPath = path.resolve(__dirname, '../../../../demo/oura_mock.json')
  try {
    const raw = fs.readFileSync(mockPath, 'utf-8')
    const parsed = JSON.parse(raw)
    res.json({ __dirname, mockPath, keys: Object.keys(parsed), hasLastSevenDays: 'last_7_days' in parsed, len: parsed.last_7_days?.length, DEMO_MODE: process.env.DEMO_MODE })
  } catch (err) {
    res.json({ __dirname, mockPath, error: String(err), DEMO_MODE: process.env.DEMO_MODE })
  }
})

// GET /api/oura/check
ouraRouter.get('/check', async (_req, res) => {
  try {
    const data = await fetchOuraData()
    const result = detectAnomaly(data)
    res.json(result)
  } catch (err) {
    res.status(500).json({ error: String(err) })
  }
})

// GET /api/oura/data?patientId=... — full Oura data, uses latest brief if available
ouraRouter.get('/data', async (req, res) => {
  try {
    const patientId = (req.query.patientId as string) ?? 'demo-patient-001'
    const briefs = listPatientBriefs(patientId)
    const latest = briefs[0]

    if (latest?.oura?.last_7_days?.length) {
      return res.json({
        baseline: latest.oura.baseline ?? null,
        last7Days: latest.oura.last_7_days,
        anomaly: latest.oura,
      })
    }

    const data = await fetchOuraData()
    const anomaly = detectAnomaly(data)
    return res.json({
      baseline: data.baseline_30day,
      last7Days: data.last_7_days,
      anomaly,
    })
  } catch (err) {
    res.status(500).json({ error: String(err) })
  }
})

// GET /api/oura/interpret/:patientId — LLM plain-English explanation for patient
ouraRouter.get('/interpret/:patientId', async (req, res) => {
  try {
    const { patientId } = req.params
    const patient = getPatient(patientId)
    if (!patient) return res.status(404).json({ error: 'patient not found' })

    // Get the most recent brief's oura data, or fall back to mock
    const briefs = listPatientBriefs(patientId)
    const latest = briefs[0]

    let oura = latest?.oura
    if (!oura || !oura.last_7_days?.length) {
      const mockData = await fetchOuraData()
      oura = detectAnomaly(mockData)
    }

    const interpretation = await interpretOuraForPatient(oura, patient)
    return res.json({ interpretation })
  } catch (err) {
    console.error('Interpret error:', err)
    res.status(500).json({ error: String(err) })
  }
})
