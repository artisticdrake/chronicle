import path from 'path'
import fs from 'fs'
import { v4 as uuidv4 } from 'uuid'
import type { PatientChart, ClinicalBrief } from '../types'

const patients = new Map<string, PatientChart>()
const briefs = new Map<string, ClinicalBrief>()

// Seed demo patient at module load
const demoPatient = JSON.parse(
  fs.readFileSync(path.resolve(__dirname, '../../../../demo/patient_profile.json'), 'utf-8')
) as PatientChart
patients.set(demoPatient.id, { ...demoPatient })

export function getPatient(id: string): PatientChart | null {
  return patients.get(id) ?? null
}

export function saveBrief(data: Omit<ClinicalBrief, 'id' | 'createdAt'>): ClinicalBrief {
  const brief: ClinicalBrief = {
    ...data,
    id: uuidv4(),
    createdAt: new Date().toISOString(),
  }
  briefs.set(brief.id, brief)
  return brief
}

export function getBrief(id: string): ClinicalBrief | null {
  return briefs.get(id) ?? null
}

const ALERT_ORDER: Record<string, number> = { urgent: 0, review: 1, monitor: 2 }

export function listPendingBriefs(): ClinicalBrief[] {
  return [...briefs.values()]
    .filter(b => !b.clinicianAction)
    .sort((a, b) => {
      const levelDiff = (ALERT_ORDER[a.alertLevel] ?? 2) - (ALERT_ORDER[b.alertLevel] ?? 2)
      if (levelDiff !== 0) return levelDiff
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    })
}

export function listPatientBriefs(patientId: string): ClinicalBrief[] {
  return [...briefs.values()]
    .filter(b => b.patientId === patientId)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
}

export function updateBriefAction(
  id: string,
  action: 'approve' | 'reject' | 'urgent',
  notes?: string
): void {
  const brief = briefs.get(id)
  if (!brief) return
  brief.clinicianAction = action
  if (notes) brief.clinicianNotes = notes
}

export function incrementRejections(patientId: string): void {
  const patient = patients.get(patientId)
  if (!patient) return
  patient.consecutiveRejections += 1
  if (patient.consecutiveRejections >= 3) {
    patient.suppressionActive = true
  }
}

export function resetRejections(patientId: string): void {
  const patient = patients.get(patientId)
  if (!patient) return
  patient.consecutiveRejections = 0
  patient.suppressionActive = false
}

export function clearAll(): void {
  briefs.clear()
  const fresh = JSON.parse(
    fs.readFileSync(path.resolve(__dirname, '../../../../demo/patient_profile.json'), 'utf-8')
  ) as PatientChart
  patients.set(fresh.id, { ...fresh })
}
