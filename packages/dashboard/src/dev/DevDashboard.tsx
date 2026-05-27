import { useState } from 'react'
import { useApi } from '../hooks/useApi'
import ScenarioCard from './ScenarioCard'
import type { Scenario, TriggerResult } from '../types'

function ClearButton() {
  const [state, setState] = useState<'idle' | 'confirm' | 'loading' | 'done' | 'error'>('idle')

  async function doClear() {
    setState('loading')
    try {
      const res = await fetch('/api/clinician/reset', { method: 'POST' })
      if (!res.ok) throw new Error('failed')
      setState('done')
      setTimeout(() => setState('idle'), 3000)
    } catch {
      setState('error')
      setTimeout(() => setState('idle'), 3000)
    }
  }

  if (state === 'confirm') {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ fontSize: 12, color: '#7CA3C4' }}>Clear all briefs and reset demo state?</span>
        <button onClick={doClear} style={{ padding: '5px 14px', borderRadius: 8, border: 'none', background: '#EF4444', color: '#fff', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
          Confirm
        </button>
        <button onClick={() => setState('idle')} style={{ padding: '5px 14px', borderRadius: 8, border: '1px solid #1E3554', background: 'transparent', color: '#7CA3C4', fontSize: 12, cursor: 'pointer', fontFamily: 'inherit' }}>
          Cancel
        </button>
      </div>
    )
  }

  return (
    <button
      onClick={() => state === 'idle' ? setState('confirm') : undefined}
      style={{
        display: 'flex', alignItems: 'center', gap: 6,
        padding: '7px 16px', borderRadius: 8,
        border: '1px solid rgba(239,68,68,0.30)',
        background: state === 'done' ? 'rgba(34,197,94,0.08)' : state === 'error' ? 'rgba(239,68,68,0.12)' : 'rgba(239,68,68,0.06)',
        color: state === 'done' ? '#22C55E' : state === 'error' ? '#F87171' : '#EF4444',
        fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
        transition: 'all 0.15s',
      }}
    >
      {state === 'loading' ? (
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ animation: 'spin 1s linear infinite' }}>
          <line x1="12" y1="2" x2="12" y2="6"/><line x1="12" y1="18" x2="12" y2="22"/><line x1="4.93" y1="4.93" x2="7.76" y2="7.76"/><line x1="16.24" y1="16.24" x2="19.07" y2="19.07"/><line x1="2" y1="12" x2="6" y2="12"/><line x1="18" y1="12" x2="22" y2="12"/>
        </svg>
      ) : state === 'done' ? (
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
      ) : (
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/>
        </svg>
      )}
      {state === 'loading' ? 'Clearing…' : state === 'done' ? 'Cleared' : state === 'error' ? 'Error' : 'Clear Everything'}
    </button>
  )
}

const PIPELINE_STEPS = [
  { label: 'Oura mock data', detail: 'Anomaly detection — 4/4 signals flagged, 7 consecutive nights' },
  { label: 'SOAP answers', detail: 'Scenario transcript parsed → confidence score engine (0–175 pts)' },
  { label: 'Claude synthesis', detail: 'Score + transcript + patient chart → structured clinical brief' },
  { label: 'Store & alert', detail: 'Brief saved in memory → clinician dashboard polls every 5s' },
  { label: 'Clinician review', detail: 'Approve / reject / escalate → patient notified via SMS' },
]

export default function DevDashboard() {
  const { data, loading, error } = useApi<{ scenarios: Scenario[] }>('/api/call/scenarios')
  const [lastResult, setLastResult] = useState<TriggerResult | null>(null)

  return (
    <div style={{ maxWidth: 960 }}>
      {/* Header */}
      <div style={{ marginBottom: 32 }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 6 }}>
          <p style={{ margin: 0, fontSize: 12, fontWeight: 600, letterSpacing: '0.08em', color: '#3A5472', textTransform: 'uppercase' }}>
            Developer Tools
          </p>
          <ClearButton />
        </div>
        <h1 style={{ margin: '0 0 8px', fontSize: 26, fontWeight: 700, color: '#E8F4FF', letterSpacing: '-0.5px' }}>
          Scenario Simulator
        </h1>
        <p style={{ margin: 0, color: '#7CA3C4', fontSize: 14, lineHeight: 1.6, maxWidth: 580 }}>
          Trigger clinical scenarios end-to-end without a real phone call. Each run exercises the full pipeline — Oura anomaly detection, SOAP parsing, confidence scoring, and Claude synthesis.
        </p>
      </div>

      {/* Last result banner */}
      {lastResult && (
        <div style={{
          background: lastResult.conversationId && !lastResult.briefId ? 'rgba(59,130,246,0.07)' : 'rgba(59,130,246,0.07)',
          border: '1px solid rgba(59,130,246,0.20)',
          borderRadius: 12,
          padding: '14px 20px',
          marginBottom: 24,
          display: 'flex',
          alignItems: 'center',
          gap: 16,
          fontSize: 13,
        }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#3B82F6" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12"/>
          </svg>
          {lastResult.briefId ? (
            <span style={{ color: '#7CA3C4' }}>
              Last run: <strong style={{ color: '#E8F4FF' }}>{lastResult.mode ?? 'real-call'}</strong>
              {' '}→{' '}
              <strong style={{ color: '#E8F4FF', fontVariantNumeric: 'tabular-nums' }}>{lastResult.score}/175</strong>
              {' '}→{' '}
              <strong style={{
                color: lastResult.alertLevel === 'urgent' ? '#EF4444' : lastResult.alertLevel === 'review' ? '#F59E0B' : '#64748B',
                textTransform: 'uppercase',
              }}>
                {lastResult.alertLevel}
              </strong>
            </span>
          ) : (
            <span style={{ color: '#7CA3C4' }}>
              Call placed — <strong style={{ color: '#E8F4FF' }}>{lastResult.conversationId}</strong>
              {' · '}waiting for transcript
            </span>
          )}
          {lastResult.briefId && (
            <span style={{ marginLeft: 'auto', color: '#3A5472', fontSize: 11, fontFamily: "'JetBrains Mono', monospace" }}>
              {lastResult.briefId.slice(0, 8)}…
            </span>
          )}
        </div>
      )}

      {/* Scenario grid */}
      {loading && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 16 }}>
          {[1, 2, 3, 4].map(i => (
            <div key={i} style={{
              height: 180,
              borderRadius: 14,
              background: 'linear-gradient(90deg, #0B1628 25%, #101F35 50%, #0B1628 75%)',
              backgroundSize: '800px 100%',
              animation: 'shimmer 1.6s infinite linear',
            }} />
          ))}
        </div>
      )}
      {error && (
        <div style={{ color: '#F87171', fontSize: 13, padding: '16px 20px', background: 'rgba(239,68,68,0.07)', border: '1px solid rgba(239,68,68,0.20)', borderRadius: 12 }}>
          Failed to load scenarios: {error}
        </div>
      )}
      {data && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 16, marginBottom: 36 }}>
          {data.scenarios.map(s => (
            <ScenarioCard key={s.id} scenario={s} onTriggered={setLastResult} />
          ))}
        </div>
      )}

      {/* Pipeline diagram */}
      <div style={{
        background: '#0B1628',
        border: '1px solid #1E3554',
        borderRadius: 14,
        padding: '24px 28px',
      }}>
        <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.08em', color: '#3A5472', textTransform: 'uppercase', marginBottom: 16 }}>
          Pipeline
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
          {PIPELINE_STEPS.map((step, i) => (
            <div key={i} style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
              {/* Step indicator */}
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0 }}>
                <div style={{
                  width: 28,
                  height: 28,
                  borderRadius: '50%',
                  background: '#050E1D',
                  border: '1px solid #2A4566',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 11,
                  fontWeight: 700,
                  color: '#3B82F6',
                  fontVariantNumeric: 'tabular-nums',
                }}>
                  {i + 1}
                </div>
                {i < PIPELINE_STEPS.length - 1 && (
                  <div style={{ width: 1, height: 24, background: '#1E3554', margin: '2px 0' }} />
                )}
              </div>
              {/* Content */}
              <div style={{ paddingBottom: i < PIPELINE_STEPS.length - 1 ? 4 : 0 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: '#C8DDF0', marginTop: 5, marginBottom: 2 }}>
                  {step.label}
                </div>
                <div style={{ fontSize: 12, color: '#3A5472', lineHeight: 1.5 }}>
                  {step.detail}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
