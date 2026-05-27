import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import type { Scenario, TriggerResult } from '../types'

interface Props {
  scenario: Scenario
  onTriggered: (result: TriggerResult) => void
}

const ALERT = {
  urgent:  { fg: '#EF4444', bg: 'rgba(239,68,68,0.08)',  border: 'rgba(239,68,68,0.22)',  label: 'URGENT' },
  review:  { fg: '#F59E0B', bg: 'rgba(245,158,11,0.08)', border: 'rgba(245,158,11,0.20)', label: 'REVIEW' },
  monitor: { fg: '#64748B', bg: 'rgba(100,116,139,0.06)', border: 'rgba(100,116,139,0.18)', label: 'MONITOR' },
}

function Spinner() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ animation: 'spin 0.8s linear infinite' }}>
      <style>{`@keyframes spin { from { transform: rotate(0deg) } to { transform: rotate(360deg) } }`}</style>
      <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
    </svg>
  )
}

interface ProcessedBrief {
  briefId: string
  alertLevel: 'urgent' | 'review' | 'monitor'
  score: number
}

export default function ScenarioCard({ scenario, onTriggered }: Props) {
  const [loading, setLoading] = useState(false)
  const [processing, setProcessing] = useState(false)
  const [result, setResult] = useState<TriggerResult | null>(null)
  const [processed, setProcessed] = useState<ProcessedBrief | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [btnHover, setBtnHover] = useState(false)
  const navigate = useNavigate()

  const cfg = ALERT[scenario.expectedAlert] ?? ALERT.monitor

  async function handleTrigger() {
    setLoading(true)
    setError(null)
    setResult(null)
    setProcessed(null)
    try {
      const res = await fetch(
        `/api/call/trigger?scenario=${scenario.id}&patientId=demo-patient-001`,
        { method: 'POST' }
      )
      const data = (await res.json()) as TriggerResult
      if (!res.ok) throw new Error((data as unknown as { error: string }).error ?? 'Unknown error')
      setResult(data)
      onTriggered(data)
    } catch (e) {
      setError(String(e))
    } finally {
      setLoading(false)
    }
  }

  async function handleProcess() {
    if (!result?.conversationId) return
    setProcessing(true)
    setError(null)
    try {
      const res = await fetch(
        `/api/call/process/${result.conversationId}?patientId=demo-patient-001`,
        { method: 'POST' }
      )
      const data = await res.json() as { briefId?: string; alertLevel?: string; score?: number; error?: string }
      if (!res.ok) throw new Error(data.error ?? 'Process failed')
      const brief: ProcessedBrief = {
        briefId: data.briefId ?? '',
        alertLevel: (data.alertLevel ?? 'monitor') as ProcessedBrief['alertLevel'],
        score: data.score ?? 0,
      }
      setProcessed(brief)
      onTriggered({ ok: true, briefId: brief.briefId, alertLevel: brief.alertLevel, score: brief.score, mode: 'real-call' })
    } catch (e) {
      setError(String(e))
    } finally {
      setProcessing(false)
    }
  }

  const isRealCall = result && result.conversationId && !result.briefId
  const briefResult = processed ?? (result?.briefId ? { briefId: result.briefId, alertLevel: result.alertLevel!, score: result.score! } : null)
  const resultCfg = briefResult ? (ALERT[briefResult.alertLevel] ?? ALERT.monitor) : null

  return (
    <div style={{
      background: '#0B1628',
      border: `1px solid ${briefResult ? resultCfg!.border : '#1E3554'}`,
      borderRadius: 14,
      padding: '20px 22px',
      display: 'flex',
      flexDirection: 'column',
      gap: 14,
      transition: 'border-color 0.2s',
    }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 700, fontSize: 15, color: '#E8F4FF', marginBottom: 5 }}>
            {scenario.label}
          </div>
          <div style={{ fontSize: 12, color: '#7CA3C4', lineHeight: 1.55 }}>
            {scenario.description}
          </div>
        </div>
        <span style={{
          background: cfg.bg,
          color: cfg.fg,
          border: `1px solid ${cfg.border}`,
          fontSize: 10,
          fontWeight: 700,
          padding: '3px 10px',
          borderRadius: 20,
          letterSpacing: '0.08em',
          whiteSpace: 'nowrap',
          textTransform: 'uppercase',
        }}>
          {cfg.label}
        </span>
      </div>

      {/* Expected score bar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <div style={{ flex: 1, height: 3, background: '#1E3554', borderRadius: 2 }}>
          <div style={{
            height: '100%',
            width: `${(scenario.expectedScore / 175) * 100}%`,
            background: cfg.fg + '60',
            borderRadius: 2,
          }} />
        </div>
        <span style={{ fontSize: 11, color: '#3A5472', whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums' }}>
          ~{scenario.expectedScore}/175 expected
        </span>
      </div>

      {/* Run button */}
      <button
        onClick={handleTrigger}
        onMouseEnter={() => setBtnHover(true)}
        onMouseLeave={() => setBtnHover(false)}
        disabled={loading}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 8,
          background: loading ? '#0D1C30' : btnHover ? '#2563EB' : '#1D4ED8',
          color: loading ? '#3A5472' : '#fff',
          border: '1px solid ' + (loading ? '#1E3554' : 'transparent'),
          borderRadius: 9,
          padding: '10px 16px',
          fontWeight: 600,
          fontSize: 13,
          cursor: loading ? 'not-allowed' : 'pointer',
          transition: 'background 0.15s',
          fontFamily: 'Inter, sans-serif',
        }}
      >
        {loading ? <Spinner /> : (
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polygon points="5 3 19 12 5 21 5 3"/>
          </svg>
        )}
        {loading ? 'Placing call…' : 'Run Scenario'}
      </button>

      {/* Real call — waiting state */}
      {isRealCall && !processed && (
        <div style={{
          background: 'rgba(59,130,246,0.06)',
          border: '1px solid rgba(59,130,246,0.20)',
          borderRadius: 10,
          padding: '12px 14px',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#3B82F6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.15 13a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.06 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 21 16.92z"/>
            </svg>
            <span style={{ fontSize: 12, color: '#3B82F6', fontWeight: 600 }}>Call placed — phone is ringing</span>
          </div>
          <div style={{ fontSize: 11, color: '#3A5472', fontFamily: "'JetBrains Mono', monospace", marginBottom: 10, wordBreak: 'break-all' }}>
            {result.conversationId}
          </div>
          <p style={{ fontSize: 12, color: '#7CA3C4', margin: '0 0 10px', lineHeight: 1.5 }}>
            Complete the call, then click below to fetch the transcript and process it into a brief.
          </p>
          <button
            onClick={handleProcess}
            disabled={processing}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              background: processing ? '#0D1C30' : 'rgba(59,130,246,0.12)',
              border: '1px solid rgba(59,130,246,0.30)',
              borderRadius: 8,
              color: processing ? '#3A5472' : '#3B82F6',
              fontSize: 12, fontWeight: 600, cursor: processing ? 'not-allowed' : 'pointer',
              padding: '8px 14px', fontFamily: 'inherit',
              transition: 'background 0.15s',
            }}
          >
            {processing ? <Spinner /> : (
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 .49-3.51"/>
              </svg>
            )}
            {processing ? 'Fetching transcript…' : 'Process transcript → Brief'}
          </button>
        </div>
      )}

      {/* Brief result (demo pipeline or after processing real call) */}
      {briefResult && resultCfg && (
        <div style={{
          background: resultCfg.bg,
          border: `1px solid ${resultCfg.border}`,
          borderRadius: 10,
          padding: '12px 14px',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#22C55E" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12"/>
            </svg>
            <span style={{ fontSize: 12, color: '#22C55E', fontWeight: 600 }}>Pipeline complete</span>
            <span style={{
              background: resultCfg.fg + '20',
              color: resultCfg.fg,
              border: `1px solid ${resultCfg.fg}35`,
              fontSize: 10,
              fontWeight: 700,
              padding: '2px 8px',
              borderRadius: 20,
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
            }}>
              {briefResult.alertLevel}
            </span>
          </div>
          <div style={{ fontSize: 13, color: '#7CA3C4', marginBottom: 4, fontVariantNumeric: 'tabular-nums' }}>
            Score: <span style={{ color: '#E8F4FF', fontWeight: 600 }}>{briefResult.score}/175</span>
          </div>
          <div style={{ fontSize: 11, color: '#3A5472', fontFamily: "'JetBrains Mono', monospace" }}>
            {briefResult.briefId}
          </div>

          {briefResult.alertLevel !== 'monitor' ? (
            <button
              onClick={() => navigate('/clinician')}
              style={{
                marginTop: 10,
                display: 'inline-flex', alignItems: 'center', gap: 5,
                background: 'transparent', border: 'none',
                color: '#3B82F6', fontSize: 12, fontWeight: 600,
                cursor: 'pointer', padding: 0, fontFamily: 'Inter, sans-serif',
              }}
            >
              View in Clinician dashboard
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="9 18 15 12 9 6"/>
              </svg>
            </button>
          ) : (
            <div style={{ marginTop: 8, fontSize: 11, color: '#3A5472', fontStyle: 'italic' }}>
              Score below threshold — alert suppressed (working as intended)
            </div>
          )}
        </div>
      )}

      {/* Error */}
      {error && (
        <div style={{
          background: 'rgba(239,68,68,0.07)',
          border: '1px solid rgba(239,68,68,0.20)',
          borderRadius: 8,
          padding: '10px 14px',
          color: '#F87171',
          fontSize: 12,
        }}>
          {error}
        </div>
      )}
    </div>
  )
}
