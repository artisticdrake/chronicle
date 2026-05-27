import { Router } from 'express'
import {
  listPendingBriefs,
  getBrief,
  getPatient,
  updateBriefAction,
  incrementRejections,
  resetRejections,
  clearAll,
} from '../db/store'

export const clinicianRouter = Router()

// POST /api/clinician/reset — wipe all briefs and reset patient state (demo only)
clinicianRouter.post('/reset', (_req, res) => {
  clearAll()
  res.json({ ok: true, message: 'DB cleared' })
})

// GET /api/clinician/dashboard — list of pending briefs (no clinician action yet)
clinicianRouter.get('/dashboard', (_req, res) => {
  const briefs = listPendingBriefs()
  res.json({ briefs })
})

// GET /api/clinician/brief/:id — full brief view
clinicianRouter.get('/brief/:id', (req, res) => {
  const brief = getBrief(req.params.id)
  if (!brief) return res.status(404).json({ error: 'brief not found' })
  const patient = getPatient(brief.patientId)
  res.json({ brief, patient })
})

// POST /api/clinician/brief/:id/action
clinicianRouter.post('/brief/:id/action', (req, res) => {
  const { action, notes } = req.body as {
    action: 'approve' | 'reject' | 'urgent'
    notes?: string
  }

  const brief = getBrief(req.params.id)
  if (!brief) return res.status(404).json({ error: 'brief not found' })

  updateBriefAction(req.params.id, action, notes)

  const patient = getPatient(brief.patientId)
  const patientPhone = patient?.phone ?? 'unknown'
  const patientName = brief.patientName

  if (action === 'reject') {
    incrementRejections(brief.patientId)
    console.log(`[SMS → ${patientPhone}] Hi ${patientName.split(' ')[0]}, your care team reviewed your check-in. Everything looks okay for now — keep taking your medications as prescribed.`)
  } else if (action === 'approve') {
    resetRejections(brief.patientId)
    console.log(`[SMS → ${patientPhone}] Hi ${patientName.split(' ')[0]}, your care team reviewed your check-in. They will follow up to schedule an appointment.`)
  } else if (action === 'urgent') {
    resetRejections(brief.patientId)
    console.log(`[SMS → ${patientPhone}] URGENT: ${patientName.split(' ')[0]}, your care team has been notified. Please call your doctor or 911 if you feel unwell.`)
  }

  res.json({ ok: true, action })
})
