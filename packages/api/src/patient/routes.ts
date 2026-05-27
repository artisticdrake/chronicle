import path from 'path'
import fs from 'fs'
import { Router } from 'express'
import { listPatientBriefs } from '../db/store'
import { detectAnomaly } from '../oura/anomaly'

export const patientRouter = Router()

// GET /api/patient/:id/trends — Oura data for patient view
// Returns data from most recent brief if available, falls back to mock
patientRouter.get('/:id/trends', (req, res) => {
  const briefs = listPatientBriefs(req.params.id)
  const latest = briefs[0]

  if (latest?.oura?.last_7_days?.length) {
    return res.json({
      patientId: req.params.id,
      trends: latest.oura.last_7_days,
      baseline: latest.oura.baseline ?? null,
      anomaly: latest.oura,
    })
  }

  // Fallback: mock data
  const mockData = JSON.parse(
    fs.readFileSync(path.resolve(__dirname, '../../../../demo/oura_mock.json'), 'utf-8')
  )
  const anomaly = detectAnomaly(mockData)
  return res.json({
    patientId: req.params.id,
    trends: mockData.last_7_days,
    baseline: mockData.baseline_30day,
    anomaly,
  })
})

// GET /api/patient/:id/checkins — check-in history
patientRouter.get('/:id/checkins', (req, res) => {
  const briefs = listPatientBriefs(req.params.id)
  const checkins = briefs.map(b => ({
    id: b.id,
    createdAt: b.createdAt,
    alertLevel: b.alertLevel,
    scoreTotal: b.score.total,
    clinicianAction: b.clinicianAction ?? null,
  }))
  res.json({ patientId: req.params.id, checkins })
})

// POST /api/patient/notify — send notification to patient (SMS in production)
patientRouter.post('/notify', (req, res) => {
  const { patientId, type, message } = req.body as {
    patientId: string
    type: 'appointment_booked' | 'all_clear' | 'urgent_referral'
    message?: string
  }
  const defaultMessages: Record<string, string> = {
    appointment_booked: 'Your care team will schedule a follow-up appointment.',
    all_clear: 'Your care team reviewed your check-in. No immediate changes needed.',
    urgent_referral: 'URGENT: Please contact your care team or call 911.',
  }
  console.log(`[NOTIFY] Patient ${patientId} (${type}): ${message ?? defaultMessages[type]}`)
  res.json({ ok: true })
})
