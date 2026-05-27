import { useState } from 'react'
import { useParams } from 'react-router-dom'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ReferenceLine, ResponsiveContainer,
} from 'recharts'
import { useApi } from '../hooks/useApi'
import CheckInHistory from './CheckInHistory'
import NextSteps from './NextSteps'
import type { OuraDailyRecord, OuraAnomalyResult, CheckInSummary } from '../types'

interface TrendsResponse {
  trends: OuraDailyRecord[]
  baseline: { hrv_rmssd: number; resting_hr: number; readiness_score: number; temperature_deviation: number } | null
  anomaly: OuraAnomalyResult
}

// ─── Feeling Unwell Button ───────────────────────────────────────────────────

function FeelUnwellButton({ patientId }: { patientId: string }) {
  const [state, setState] = useState<'idle' | 'confirm' | 'loading' | 'done' | 'error'>('idle')

  async function trigger() {
    setState('loading')
    try {
      const res = await fetch(`/api/call/trigger?patientId=${patientId}`, { method: 'POST' })
      if (!res.ok) throw new Error('Request failed')
      setState('done')
    } catch {
      setState('error')
    }
  }

  if (state === 'done') {
    return (
      <div style={{
        background: 'rgba(34,197,94,0.07)',
        border: '1px solid rgba(34,197,94,0.22)',
        borderRadius: 14,
        padding: '16px 20px',
        display: 'flex',
        alignItems: 'center',
        gap: 14,
      }}>
        <div style={{
          width: 36, height: 36,
          background: 'rgba(34,197,94,0.12)',
          border: '1px solid rgba(34,197,94,0.25)',
          borderRadius: 10,
          display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
        }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#22C55E" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>
          </svg>
        </div>
        <div>
          <div style={{ fontWeight: 700, color: '#E8F4FF', fontSize: 14 }}>Check-in received</div>
          <div style={{ fontSize: 13, color: '#7CA3C4', marginTop: 2 }}>Your care team has been notified and will follow up with you shortly.</div>
        </div>
      </div>
    )
  }

  if (state === 'confirm') {
    return (
      <div style={{
        background: 'rgba(239,68,68,0.07)',
        border: '1px solid rgba(239,68,68,0.22)',
        borderRadius: 14,
        padding: '16px 20px',
        display: 'flex',
        alignItems: 'center',
        gap: 16,
        flexWrap: 'wrap',
      }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 700, color: '#E8F4FF', fontSize: 14, marginBottom: 3 }}>Start a check-in?</div>
          <div style={{ fontSize: 13, color: '#7CA3C4' }}>This will notify your care team that you are experiencing symptoms and create an urgent check-in record.</div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            onClick={() => setState('idle')}
            style={{
              padding: '8px 18px', borderRadius: 8, border: '1px solid #1E3554',
              background: 'transparent', color: '#7CA3C4', fontSize: 13, cursor: 'pointer', fontFamily: 'inherit',
            }}
          >
            Cancel
          </button>
          <button
            onClick={trigger}
            style={{
              padding: '8px 18px', borderRadius: 8, border: 'none',
              background: '#EF4444', color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
            }}
          >
            Yes, notify my care team
          </button>
        </div>
      </div>
    )
  }

  return (
    <button
      onClick={() => setState('confirm')}
      disabled={state === 'loading'}
      style={{
        width: '100%',
        padding: '14px 20px',
        borderRadius: 14,
        border: '1px solid rgba(239,68,68,0.30)',
        background: 'rgba(239,68,68,0.08)',
        color: state === 'loading' ? '#7CA3C4' : '#F87171',
        fontSize: 14,
        fontWeight: 600,
        cursor: state === 'loading' ? 'wait' : 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 10,
        fontFamily: 'inherit',
        transition: 'background 0.15s, border-color 0.15s',
      }}
    >
      {state === 'loading' ? (
        <>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ animation: 'spin 1s linear infinite' }}>
            <line x1="12" y1="2" x2="12" y2="6"/><line x1="12" y1="18" x2="12" y2="22"/><line x1="4.93" y1="4.93" x2="7.76" y2="7.76"/><line x1="16.24" y1="16.24" x2="19.07" y2="19.07"/><line x1="2" y1="12" x2="6" y2="12"/><line x1="18" y1="12" x2="22" y2="12"/>
          </svg>
          Notifying care team…
        </>
      ) : state === 'error' ? (
        'Failed — try again'
      ) : (
        <>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polygon points="7.86 2 16.14 2 22 7.86 22 16.14 16.14 22 7.86 22 2 16.14 2 7.86 7.86 2"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
          </svg>
          I am not feeling well — notify my care team
        </>
      )}
    </button>
  )
}

// ─── LLM Interpretation ──────────────────────────────────────────────────────

function OuraInterpretation({ patientId }: { patientId: string }) {
  const { data, loading, error } = useApi<{ interpretation: string }>(
    `/api/oura/interpret/${patientId}`
  )

  if (loading) {
    return (
      <div style={{
        background: '#0B1628',
        border: '1px solid #1E3554',
        borderRadius: 14,
        padding: '20px 24px',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
          <div style={{ width: 120, height: 12, background: '#1E3554', borderRadius: 6, animation: 'shimmer 1.5s infinite' }} />
        </div>
        {[1, 2, 3].map(i => (
          <div key={i} style={{ height: 12, background: '#1A2E47', borderRadius: 6, marginBottom: 8, width: i === 3 ? '60%' : '100%', animation: 'shimmer 1.5s infinite' }} />
        ))}
      </div>
    )
  }

  if (error || !data) return null

  return (
    <div style={{
      background: 'rgba(129,140,248,0.04)',
      border: '1px solid rgba(129,140,248,0.18)',
      borderRadius: 14,
      padding: '20px 24px',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#818CF8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/>
        </svg>
        <h2 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: '#818CF8' }}>What your ring data means</h2>
        <span style={{
          marginLeft: 'auto',
          fontSize: 10, color: '#818CF8',
          background: 'rgba(129,140,248,0.12)',
          border: '1px solid rgba(129,140,248,0.22)',
          padding: '2px 8px', borderRadius: 20, fontWeight: 600,
        }}>
          AI
        </span>
      </div>
      <div style={{ fontSize: 14, color: '#C8DDF0', lineHeight: 1.75, whiteSpace: 'pre-line' }}>
        {data.interpretation}
      </div>
    </div>
  )
}

// ─── Oura Ring Section ───────────────────────────────────────────────────────

const METRIC_DEFS = [
  { key: 'hrv_rmssd' as const, label: 'HRV', unit: 'ms', color: '#818CF8', goodWhenHigh: true },
  { key: 'resting_hr' as const, label: 'Resting HR', unit: 'bpm', color: '#F87171', goodWhenHigh: false },
  { key: 'readiness_score' as const, label: 'Readiness', unit: '/ 100', color: '#34D399', goodWhenHigh: true },
  { key: 'temperature_deviation' as const, label: 'Temp Δ', unit: '°C', color: '#FBBF24', goodWhenHigh: false },
]

const SIGNAL_LABELS: Record<string, string> = {
  hrv_rmssd: 'HRV', resting_hr: 'Resting HR',
  readiness_score: 'Readiness', temperature_deviation: 'Temperature',
}

function MetricMini({ def, trends, baseline, anomalousSignals }: {
  def: typeof METRIC_DEFS[0]
  trends: OuraDailyRecord[]
  baseline: TrendsResponse['baseline']
  anomalousSignals: string[]
}) {
  if (!trends.length) return null
  const latest = trends[trends.length - 1]
  const prev = trends[trends.length - 2]
  const current = latest[def.key]
  const baseVal = baseline?.[def.key]
  const delta = prev ? current - prev[def.key] : 0
  const isAnomalous = anomalousSignals.includes(def.key)
  const dirGood = def.goodWhenHigh ? delta >= 0 : delta <= 0
  const trendColor = Math.abs(delta) < 0.5 ? '#64748B' : dirGood ? '#22C55E' : '#F87171'

  return (
    <div style={{
      background: '#050E1D',
      border: `1px solid ${isAnomalous ? def.color + '40' : '#1A2E47'}`,
      borderRadius: 10,
      padding: '12px 14px',
    }}>
      <div style={{ fontSize: 10, color: '#3A5472', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>
        {def.label}
      </div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
        <span style={{ fontSize: 20, fontWeight: 700, color: isAnomalous ? def.color : '#E8F4FF', fontVariantNumeric: 'tabular-nums' }}>
          {def.key === 'hrv_rmssd' ? current.toFixed(1) : current}
        </span>
        <span style={{ fontSize: 11, color: '#3A5472' }}>{def.unit}</span>
        <span style={{ marginLeft: 'auto', fontSize: 11, fontWeight: 700, color: trendColor }}>
          {delta > 0.1 ? '↑' : delta < -0.1 ? '↓' : '→'}
        </span>
      </div>
      {baseVal !== undefined && (
        <div style={{ fontSize: 10, color: '#3A5472', marginTop: 3 }}>
          baseline: <span style={{ color: '#5A7A94' }}>
            {def.key === 'hrv_rmssd' ? baseVal.toFixed(1) : baseVal}
          </span>
        </div>
      )}
    </div>
  )
}

function OuraRingSection({ trends, baseline, anomaly }: {
  trends: OuraDailyRecord[]
  baseline: TrendsResponse['baseline']
  anomaly: OuraAnomalyResult
}) {
  const [expanded, setExpanded] = useState(false)

  const chartData = trends.map(d => ({
    date: d.date.slice(5),
    hrv: d.hrv_rmssd,
    hr: d.resting_hr,
    readiness: d.readiness_score,
  }))

  return (
    <div style={{ background: '#0B1628', border: '1px solid #1E3554', borderRadius: 14, overflow: 'hidden' }}>
      {/* Header — always visible */}
      <button
        onClick={() => setExpanded(e => !e)}
        style={{
          width: '100%',
          padding: '16px 20px',
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          background: 'transparent',
          border: 'none',
          cursor: 'pointer',
          fontFamily: 'inherit',
          textAlign: 'left',
        }}
      >
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#818CF8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10"/><path d="M8.56 2.75c4.37 6.03 6.02 9.42 8.03 17.72m2.54-15.38c-3.72 4.35-8.94 5.66-16.88 5.85m19.5 1.9c-3.5-.93-6.63-.82-8.94 0-2.58.92-5.01 2.86-7.44 6.32"/>
        </svg>
        <span style={{ fontSize: 14, fontWeight: 700, color: '#E8F4FF', flex: 1 }}>Oura Ring — 7 Nights</span>
        {anomaly.anomalyDetected && (
          <span style={{
            fontSize: 10, fontWeight: 700, color: '#EF4444',
            background: '#EF444415', border: '1px solid #EF444430',
            padding: '2px 8px', borderRadius: 20, letterSpacing: '0.06em', textTransform: 'uppercase', marginRight: 6,
          }}>
            Anomaly
          </span>
        )}
        <svg
          width="14" height="14" viewBox="0 0 24 24" fill="none"
          stroke="#3A5472" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
          style={{ transform: expanded ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}
        >
          <polyline points="6 9 12 15 18 9"/>
        </svg>
      </button>

      {/* Metric mini-cards — always visible */}
      {trends.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, padding: '0 20px 16px' }}>
          {METRIC_DEFS.map(def => (
            <MetricMini
              key={def.key}
              def={def}
              trends={trends}
              baseline={baseline}
              anomalousSignals={anomaly.anomalousSignals}
            />
          ))}
        </div>
      )}

      {/* Expanded detail */}
      {expanded && (
        <div style={{ borderTop: '1px solid #1E3554', padding: '20px 20px 16px' }}>
          {/* Anomaly notice */}
          {anomaly.anomalyDetected ? (
            <div style={{
              background: 'rgba(239,68,68,0.06)',
              border: '1px solid rgba(239,68,68,0.18)',
              borderRadius: 10,
              padding: '12px 16px',
              marginBottom: 16,
              fontSize: 13,
              color: '#F87171',
              lineHeight: 1.55,
            }}>
              Signals flagged for {anomaly.consecutiveNights} consecutive night{anomaly.consecutiveNights !== 1 ? 's' : ''}:{' '}
              {anomaly.anomalousSignals.map(s => SIGNAL_LABELS[s]).join(', ')}.
            </div>
          ) : (
            <div style={{
              background: 'rgba(34,197,94,0.05)',
              border: '1px solid rgba(34,197,94,0.15)',
              borderRadius: 10,
              padding: '12px 16px',
              marginBottom: 16,
              fontSize: 13,
              color: '#86EFAC',
            }}>
              All signals within your normal range. No anomalies detected.
            </div>
          )}

          {/* 7-day chart */}
          {chartData.length > 0 && (
            <div style={{ marginBottom: 16 }}>
              <div style={{ display: 'flex', gap: 14, marginBottom: 10 }}>
                {[{ color: '#818CF8', label: 'HRV ms' }, { color: '#F87171', label: 'Resting HR bpm' }, { color: '#34D399', label: 'Readiness /100' }].map(l => (
                  <div key={l.label} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                    <span style={{ width: 16, height: 2, background: l.color, display: 'inline-block', borderRadius: 1 }} />
                    <span style={{ fontSize: 10, color: '#3A5472' }}>{l.label}</span>
                  </div>
                ))}
              </div>
              <ResponsiveContainer width="100%" height={160}>
                <LineChart data={chartData} margin={{ left: 0, right: 8, top: 4, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="2 4" stroke="#1A2E47" vertical={false} />
                  <XAxis dataKey="date" tick={{ fill: '#3A5472', fontSize: 10, fontFamily: 'Inter, sans-serif' }} axisLine={{ stroke: '#1E3554' }} tickLine={false} />
                  <YAxis tick={{ fill: '#3A5472', fontSize: 10 }} axisLine={false} tickLine={false} width={28} />
                  {baseline && <ReferenceLine y={baseline.hrv_rmssd} stroke="#818CF820" strokeDasharray="3 3" />}
                  {baseline && <ReferenceLine y={baseline.resting_hr} stroke="#F8717120" strokeDasharray="3 3" />}
                  <Tooltip
                    contentStyle={{ background: '#050E1D', border: '1px solid #1E3554', borderRadius: 8, fontSize: 11, padding: '8px 12px' }}
                    labelStyle={{ color: '#7CA3C4', fontWeight: 600 }}
                    itemStyle={{ color: '#E8F4FF' }}
                  />
                  <Line type="monotone" dataKey="hrv" stroke="#818CF8" strokeWidth={2} dot={{ fill: '#818CF8', r: 2.5, strokeWidth: 0 }} activeDot={{ r: 4 }} name="HRV" />
                  <Line type="monotone" dataKey="hr" stroke="#F87171" strokeWidth={2} dot={{ fill: '#F87171', r: 2.5, strokeWidth: 0 }} activeDot={{ r: 4 }} name="HR" />
                  <Line type="monotone" dataKey="readiness" stroke="#34D399" strokeWidth={2} dot={{ fill: '#34D399', r: 2.5, strokeWidth: 0 }} activeDot={{ r: 4 }} name="Readiness" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Nightly list */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {[...trends].reverse().map((night, i) => {
              const flagged: string[] = []
              if (baseline) {
                if (((night.hrv_rmssd - baseline.hrv_rmssd) / baseline.hrv_rmssd) * 100 < -15) flagged.push('hrv_rmssd')
                if (night.resting_hr - baseline.resting_hr > 8) flagged.push('resting_hr')
                if (Math.abs(night.temperature_deviation - baseline.temperature_deviation) > 0.5) flagged.push('temperature_deviation')
                if (((night.readiness_score - baseline.readiness_score) / baseline.readiness_score) * 100 < -20) flagged.push('readiness_score')
              }
              const isAnom = flagged.length >= 2
              return (
                <div key={night.date} style={{
                  background: '#050E1D',
                  border: `1px solid ${isAnom ? '#EF444420' : '#1A2E47'}`,
                  borderRadius: 8,
                  padding: '9px 14px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  opacity: i === 0 ? 1 : Math.max(0.6, 1 - i * 0.06),
                }}>
                  <div style={{ width: 6, height: 6, borderRadius: '50%', background: isAnom ? '#EF4444' : '#22C55E', flexShrink: 0 }} />
                  <span style={{ fontSize: 12, color: '#5A7A94', minWidth: 52, fontVariantNumeric: 'tabular-nums' }}>
                    {new Date(night.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                  </span>
                  <span style={{ fontSize: 12, color: flagged.includes('hrv_rmssd') ? '#F87171' : '#7CA3C4', fontVariantNumeric: 'tabular-nums' }}>
                    HRV {night.hrv_rmssd.toFixed(1)}
                  </span>
                  <span style={{ fontSize: 12, color: flagged.includes('resting_hr') ? '#F87171' : '#7CA3C4', fontVariantNumeric: 'tabular-nums' }}>
                    HR {night.resting_hr}
                  </span>
                  <span style={{ fontSize: 12, color: flagged.includes('readiness_score') ? '#F87171' : '#7CA3C4', fontVariantNumeric: 'tabular-nums' }}>
                    R {night.readiness_score}
                  </span>
                  <div style={{ marginLeft: 'auto', display: 'flex', gap: 4 }}>
                    {flagged.length === 0
                      ? <span style={{ fontSize: 10, color: '#22C55E' }}>Normal</span>
                      : flagged.map(sig => (
                        <span key={sig} style={{ fontSize: 10, fontWeight: 600, color: '#F87171', background: '#EF444412', border: '1px solid #EF444428', padding: '1px 6px', borderRadius: 20 }}>
                          {SIGNAL_LABELS[sig]}
                        </span>
                      ))
                    }
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Shimmer ─────────────────────────────────────────────────────────────────

function Shimmer({ height }: { height: number }) {
  return (
    <div style={{
      height,
      borderRadius: 14,
      background: 'linear-gradient(90deg, #0B1628 25%, #101F35 50%, #0B1628 75%)',
      backgroundSize: '800px 100%',
      animation: 'shimmer 1.6s infinite linear',
    }} />
  )
}

// ─── PatientDashboard ────────────────────────────────────────────────────────

export default function PatientDashboard() {
  const { id } = useParams<{ id: string }>()

  const { data: trendsData, loading: trendsLoading } = useApi<TrendsResponse>(
    id ? `/api/patient/${id}/trends` : null,
    15000
  )
  const { data: checkinsData } = useApi<{ checkins: CheckInSummary[] }>(
    id ? `/api/patient/${id}/checkins` : null,
    10000
  )

  const latestAction = checkinsData?.checkins?.[0]?.clinicianAction ?? null

  return (
    <div style={{ maxWidth: 720 }}>
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <p style={{ margin: '0 0 4px', fontSize: 12, fontWeight: 600, letterSpacing: '0.08em', color: '#3A5472', textTransform: 'uppercase' }}>
          Patient Portal
        </p>
        <h1 style={{ margin: '0 0 4px', fontSize: 26, fontWeight: 700, color: '#E8F4FF', letterSpacing: '-0.5px' }}>
          Your Health Dashboard
        </h1>
        <p style={{ margin: 0, color: '#7CA3C4', fontSize: 14 }}>
          Hi James — here's your latest health information from Chronicle.
        </p>
      </div>

      {/* I'm not feeling well */}
      <div style={{ marginBottom: 20 }}>
        {id && <FeelUnwellButton patientId={id} />}
      </div>

      {/* Next steps */}
      <div style={{ marginBottom: 20 }}>
        <NextSteps clinicianAction={latestAction} />
      </div>

      {/* LLM interpretation */}
      <div style={{ marginBottom: 20 }}>
        {id && <OuraInterpretation patientId={id} />}
      </div>

      {/* Oura Ring section */}
      <div style={{ marginBottom: 20 }}>
        {trendsLoading && !trendsData ? (
          <Shimmer height={180} />
        ) : trendsData ? (
          <OuraRingSection
            trends={trendsData.trends}
            baseline={trendsData.baseline}
            anomaly={trendsData.anomaly}
          />
        ) : null}
      </div>

      {/* Check-in history */}
      <CheckInHistory checkins={checkinsData?.checkins ?? []} />
    </div>
  )
}
