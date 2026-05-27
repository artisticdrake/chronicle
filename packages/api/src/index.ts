import path from 'path'
import dotenv from 'dotenv'
dotenv.config({ path: path.resolve(__dirname, '../../../.env') })
import express, { type Request, type Response, type NextFunction } from 'express'
import { clinicianRouter } from './clinician/routes'
import { patientRouter } from './patient/routes'
import { callRouter } from './call/orchestrate'
import { ouraRouter } from './oura/routes'

const app = express()
app.use(express.json())
app.use(express.urlencoded({ extended: true }))

app.use('/api/clinician', clinicianRouter)
app.use('/api/patient', patientRouter)
app.use('/api/call', callRouter)
app.use('/api/oura', ouraRouter)

app.get('/health', (_req, res) => res.json({ status: 'ok' }))

// Catch-all error handler — logs exact error to console and returns it in the response
app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('[Express error]', err)
  res.status(500).json({ error: err.message, stack: err.stack })
})

const PORT = process.env.PORT ?? 3001
app.listen(PORT, () => {
  console.log(`Chronicle API running on port ${PORT}`)
  console.log(`DEMO_MODE: ${process.env.DEMO_MODE ?? 'false'}`)
})
