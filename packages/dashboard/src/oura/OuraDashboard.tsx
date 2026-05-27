import { useEffect, useState } from 'react'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ReferenceLine, ResponsiveContainer,
} from 'recharts'
import type { OuraDailyRecord, OuraAnomalyResult } from '../types'

interface OuraData {
  baseline: {
    hrv_rmssd: number
    resting_hr: number
    readiness_score: number
    temperature_deviation: number
  }
  last7Days: OuraDailyRecord[]
  anomaly: OuraAnomalyResult
}

const METRICS = [
  {
    key: 'hrv_rmssd' as const,
    label: 'HRV (rMSSD)',
    unit: 'ms',
    color: '#818CF8',
    goodWhenHigh: true,
    description: 'Heart rate variability — higher is healthier autonomic tone',
  },
  {
    key: 'resting_hr' as const,
    label: 'Resting Heart Rate',
    unit: 'bpm',
    color: '#F87171',
    goodWhenHigh: false,
    description: 'Lower resting HR indicates better cardiovascular efficiency',
  },
  {
    key: 'readiness_score' as const,
    label: 'Readiness Score',
    unit: '/ 100',
    color: '#34D399',
    goodWhenHigh: true,
    description: 'Composite recovery and readiness indicator',
  },
  {
    key: 'temperature_deviation' as const,
    label: 'Temp Deviation',
    unit: '°C',
    color: '#FBBF24',
    goodWhenHigh: false,
    description: 'Skin temperature deviation from personal baseline',
  },
]

const SIGNAL_LABELS: Record<string, string> = {
  hrv_rmssd: 'HRV',
  resting_hr: 'Resting HR',
  readiness_score: 'Readiness',
  temperature_deviation: 'Temperature',
}

function pct(val: number, base: number) {
  return ((val - base) / base) * 100
}

function DeltaBadge({ delta, goodWhenPositive }: { delta: number; goodWhenPositive: boolean }) {
  const isGood = goodWhenPositive ? delta >= 0 : delta <= 0
  const color = Math.abs(delta) < 2 ? '#64748B' : isGood ? '#22C55E' : '#EF4444'
  const sign = delta > 0 ? '+' : ''
  return (
    <span style={{
      fontSize: 11,
      fontWeight: 700,
      color,
      background: color + '18',
      border: `1px solid ${color}30`,
      padding: '2px 7px',
      borderRadius: 20,
      fontVariantNumeric: 'tabular-nums',
    }}>
      {sign}{delta.toFixed(1)}
    </span>
  )
}

function MetricCard({ metric, last7Days, baseline, anomalousSignals }: {
  metric: typeof METRICS[0]
  last7Days: OuraDailyRecord[]
  baseline: OuraData['baseline']
  anomalousSignals: string[]
}) {
  const latest = last7Days[last7Days.length - 1]
  const currentVal = latest[metric.key]
  const baseVal = baseline[metric.key]
  const delta = currentVal - baseVal
  const isAnomalous = anomalousSignals.includes(metric.key)

  const chartData = last7Days.map(d => ({
    date: d.date.slice(5),
    value: d[metric.key],
  }))

  return (
    <div style={{
      background: '#0B1628',
      border: `1px solid ${isAnomalous ? metric.color + '50' : '#1E3554'}`,
      borderRadius: 14,
      padding: '20px 20px 16px',
      position: 'relative',
      overflow: 'hidden',
    }}>
      {isAnomalous && (
        <div style={{
          position: 'absolute',
          top: 0, left: 0, right: 0,
          height: 2,
          background: `linear-gradient(90deg, ${metric.color}00, ${metric.color}, ${metric.color}00)`,
        }} />
      )}

      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 12 }}>
        <div>
          <div style={{ fontSize: 11, color: '#3A5472', fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 4 }}>
            {metric.label}
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
            <span style={{ fontSize: 28, fontWeight: 700, color: '#E8F4FF', fontVariantNumeric: 'tabular-nums' }}>
              {metric.key === 'hrv_rmssd' ? currentVal.toFixed(1) : String(currentVal)}
            </span>
            <span style={{ fontSize: 12, color: '#3A5472' }}>{metric.unit}</span>
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
          {isAnomalous && (
            <span style={{
              fontSize: 10,
              fontWeight: 700,
              color: metric.color,
              background: metric.color + '15',
              border: `1px solid ${metric.color}30`,
              padding: '2px 8px',
              borderRadius: 20,
              letterSpacing: '0.06em',
              textTransform: 'uppercase',
            }}>
              Anomalous
            </span>
          )}
          <DeltaBadge delta={delta} goodWhenPositive={metric.goodWhenHigh} />
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 12 }}>
        <div style={{ fontSize: 12, color: '#3A5472' }}>
          Baseline: <span style={{ color: '#7CA3C4', fontVariantNumeric: 'tabular-nums' }}>
            {metric.key === 'hrv_rmssd' ? baseVal.toFixed(1) : String(baseVal)} {metric.unit}
          </span>
        </div>
        <div style={{ fontSize: 12, color: '#3A5472' }}>
          Δ {Math.abs(pct(currentVal, baseVal)).toFixed(1)}%
        </div>
      </div>

      <ResponsiveContainer width="100%" height={80}>
        <LineChart data={chartData} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
          <CartesianGrid strokeDasharray="2 4" stroke="#1A2E47" vertical={false} />
          <XAxis dataKey="date" hide />
          <YAxis hide domain={['auto', 'auto']} />
          <ReferenceLine y={baseVal} stroke={metric.color + '30'} strokeDasharray="4 3" />
          <Tooltip
            contentStyle={{
              background: '#050E1D',
              border: '1px solid #1E3554',
              borderRadius: 8,
              fontSize: 11,
              padding: '6px 10px',
            }}
            labelStyle={{ color: '#7CA3C4', marginBottom: 2 }}
            itemStyle={{ color: '#E8F4FF', fontWeight: 600 }}
            formatter={(v: number) => [metric.key === 'hrv_rmssd' ? v.toFixed(1) : v, metric.label]}
          />
          <Line
            type="monotone"
            dataKey="value"
            stroke={metric.color}
            strokeWidth={2}
            dot={{ fill: metric.color, r: 2, strokeWidth: 0 }}
            activeDot={{ r: 4, fill: metric.color }}
          />
        </LineChart>
      </ResponsiveContainer>

      <div style={{ fontSize: 11, color: '#3A5472', marginTop: 8, lineHeight: 1.4 }}>
        {metric.description}
      </div>
    </div>
  )
}

function NightlyBreakdown({ last7Days, baseline }: {
  last7Days: OuraDailyRecord[]
  baseline: OuraData['baseline']
}) {
  const nights = [...last7Days].reverse()

  return (
    <div style={{ background: '#0B1628', border: '1px solid #1E3554', borderRadius: 14, padding: '20px 24px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#7CA3C4" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
        </svg>
        <h2 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: '#E8F4FF' }}>Nightly Breakdown</h2>
        <span style={{ marginLeft: 'auto', fontSize: 11, color: '#3A5472' }}>Most recent first</span>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {nights.map((night, i) => {
          const flagged: string[] = []
          if (((night.hrv_rmssd - baseline.hrv_rmssd) / baseline.hrv_rmssd) * 100 < -15) flagged.push('hrv_rmssd')
          if (night.resting_hr - baseline.resting_hr > 8) flagged.push('resting_hr')
          if (Math.abs(night.temperature_deviation - baseline.temperature_deviation) > 0.5) flagged.push('temperature_deviation')
          if (((night.readiness_score - baseline.readiness_score) / baseline.readiness_score) * 100 < -20) flagged.push('readiness_score')

          const isAnomalous = flagged.length >= 2

          return (
            <div key={night.date} style={{
              background: '#050E1D',
              border: `1px solid ${isAnomalous ? '#EF444425' : '#1A2E47'}`,
              borderRadius: 10,
              padding: '12px 16px',
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              opacity: i === 0 ? 1 : Math.max(0.6, 1 - i * 0.06),
            }}>
              <div style={{
                width: 8,
                height: 8,
                borderRadius: '50%',
                background: isAnomalous ? '#EF4444' : '#22C55E',
                flexShrink: 0,
                boxShadow: isAnomalous ? '0 0 6px #EF444480' : 'none',
              }} />

              <div style={{ fontSize: 13, color: '#7CA3C4', fontVariantNumeric: 'tabular-nums', minWidth: 60 }}>
                {new Date(night.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
              </div>

              <div style={{ display: 'flex', gap: 16, flex: 1 }}>
                {([
                  { label: 'HRV', val: night.hrv_rmssd.toFixed(1), unit: 'ms', key: 'hrv_rmssd' },
                  { label: 'HR', val: String(night.resting_hr), unit: 'bpm', key: 'resting_hr' },
                  { label: 'Readiness', val: String(night.readiness_score), unit: '', key: 'readiness_score' },
                  { label: 'Temp Δ', val: `+${night.temperature_deviation.toFixed(1)}`, unit: '°C', key: 'temperature_deviation' },
                ] as { label: string; val: string; unit: string; key: string }[]).map(m => (
                  <div key={m.key} style={{ minWidth: 64 }}>
                    <div style={{ fontSize: 10, color: '#3A5472', marginBottom: 2 }}>{m.label}</div>
                    <div style={{
                      fontSize: 13,
                      fontWeight: 600,
                      fontVariantNumeric: 'tabular-nums',
                      color: flagged.includes(m.key) ? '#F87171' : '#E8F4FF',
                    }}>
                      {m.val}<span style={{ fontSize: 10, color: '#3A5472', fontWeight: 400 }}> {m.unit}</span>
                    </div>
                  </div>
                ))}
              </div>

              <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', justifyContent: 'flex-end', maxWidth: 200 }}>
                {flagged.length === 0 ? (
                  <span style={{ fontSize: 11, color: '#22C55E' }}>Normal</span>
                ) : flagged.map(sig => (
                  <span key={sig} style={{
                    fontSize: 10,
                    fontWeight: 600,
                    color: '#F87171',
                    background: '#EF444415',
                    border: '1px solid #EF444430',
                    padding: '2px 7px',
                    borderRadius: 20,
                  }}>
                    {SIGNAL_LABELS[sig]}
                  </span>
                ))}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function AnomalyBanner({ anomaly }: { anomaly: OuraAnomalyResult }) {
  if (!anomaly.anomalyDetected) {
    return (
      <div style={{
        background: 'rgba(34,197,94,0.06)',
        border: '1px solid rgba(34,197,94,0.20)',
        borderRadius: 14,
        padding: '16px 20px',
        display: 'flex',
        alignItems: 'center',
        gap: 14,
      }}>
        <div style={{
          width: 40, height: 40,
          background: 'rgba(34,197,94,0.12)',
          border: '1px solid rgba(34,197,94,0.25)',
          borderRadius: 10,
          display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
        }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#22C55E" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>
          </svg>
        </div>
        <div>
          <div style={{ fontWeight: 700, color: '#E8F4FF', fontSize: 14 }}>No anomaly detected</div>
          <div style={{ fontSize: 13, color: '#7CA3C4', marginTop: 3 }}>All biometric signals within normal range for this patient.</div>
        </div>
      </div>
    )
  }

  return (
    <div style={{
      background: 'rgba(239,68,68,0.07)',
      border: '1px solid rgba(239,68,68,0.22)',
      borderRadius: 14,
      padding: '16px 20px',
      display: 'flex',
      alignItems: 'flex-start',
      gap: 14,
    }}>
      <div style={{
        width: 40, height: 40,
        background: 'rgba(239,68,68,0.12)',
        border: '1px solid rgba(239,68,68,0.25)',
        borderRadius: 10,
        display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
        marginTop: 2,
      }}>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#EF4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polygon points="7.86 2 16.14 2 22 7.86 22 16.14 16.14 22 7.86 22 2 16.14 2 7.86 7.86 2"/>
          <line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
        </svg>
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
          <span style={{ fontWeight: 700, color: '#E8F4FF', fontSize: 14 }}>Anomaly detected</span>
          <span style={{
            fontSize: 10, fontWeight: 700, color: '#EF4444',
            background: '#EF444415', border: '1px solid #EF444430',
            padding: '2px 8px', borderRadius: 20, letterSpacing: '0.06em', textTransform: 'uppercase',
          }}>
            {anomaly.consecutiveNights} consecutive night{anomaly.consecutiveNights !== 1 ? 's' : ''}
          </span>
        </div>
        <div style={{ fontSize: 13, color: '#7CA3C4', marginBottom: 10, lineHeight: 1.5 }}>
          Multiple biometric signals have deviated from the 30-day baseline for {anomaly.consecutiveNights} nights in a row. This pattern may indicate early decompensation.
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {anomaly.anomalousSignals.map(sig => (
            <span key={sig} style={{
              fontSize: 11, fontWeight: 600, color: '#FBBF24',
              background: '#F59E0B15', border: '1px solid #F59E0B30',
              padding: '3px 10px', borderRadius: 20,
            }}>
              {SIGNAL_LABELS[sig]}
            </span>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 24, marginTop: 12 }}>
          <div style={{ fontSize: 12, color: '#3A5472' }}>
            HRV delta: <span style={{ color: '#F87171', fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>
              {anomaly.hrvDelta.toFixed(1)}%
            </span>
          </div>
          <div style={{ fontSize: 12, color: '#3A5472' }}>
            HR delta: <span style={{ color: '#F87171', fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>
              +{anomaly.hrDelta} bpm
            </span>
          </div>
          <div style={{ fontSize: 12, color: '#3A5472' }}>
            Readiness: <span style={{ color: '#F87171', fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>
              {anomaly.readinessScore} / 100
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}

function OverviewChart({ last7Days, baseline }: { last7Days: OuraDailyRecord[]; baseline: OuraData['baseline']; }) {
  const data = last7Days.map(d => ({
    date: d.date.slice(5),
    hrv: d.hrv_rmssd,
    hr: d.resting_hr,
    readiness: d.readiness_score,
    temp: d.temperature_deviation,
  }))

  return (
    <div style={{ background: '#0B1628', border: '1px solid #1E3554', borderRadius: 14, padding: '20px 16px 12px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16, paddingLeft: 4 }}>
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#818CF8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
        </svg>
        <h2 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: '#E8F4FF' }}>7-Day Overview</h2>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 16 }}>
          {([
            { color: '#818CF8', label: 'HRV', unit: 'ms' },
            { color: '#F87171', label: 'Resting HR', unit: 'bpm' },
            { color: '#34D399', label: 'Readiness', unit: '/100' },
            { color: '#FBBF24', label: 'Temp Δ', unit: '°C' },
          ]).map(({ color, label, unit }) => (
            <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <span style={{ width: 20, height: 2, background: color, display: 'inline-block', borderRadius: 1 }} />
              <span style={{ fontSize: 11, color: '#7CA3C4' }}>{label}</span>
              <span style={{ fontSize: 10, color: '#3A5472' }}>{unit}</span>
            </div>
          ))}
        </div>
      </div>
      <ResponsiveContainer width="100%" height={200}>
        <LineChart data={data} margin={{ left: 0, right: 16, top: 4, bottom: 0 }}>
          <CartesianGrid strokeDasharray="2 4" stroke="#1A2E47" vertical={false} />
          <XAxis
            dataKey="date"
            tick={{ fill: '#3A5472', fontSize: 11, fontFamily: 'Inter, sans-serif' }}
            axisLine={{ stroke: '#1E3554' }}
            tickLine={false}
          />
          <YAxis
            tick={{ fill: '#3A5472', fontSize: 11, fontFamily: 'Inter, sans-serif' }}
            axisLine={false}
            tickLine={false}
            width={32}
          />
          <Tooltip
            contentStyle={{
              background: '#050E1D',
              border: '1px solid #1E3554',
              borderRadius: 10,
              fontSize: 12,
              padding: '10px 14px',
              boxShadow: '0 8px 32px rgba(0,0,0,0.6)',
            }}
            labelStyle={{ color: '#7CA3C4', fontWeight: 600, marginBottom: 6 }}
            itemStyle={{ color: '#E8F4FF' }}
          />
          <ReferenceLine y={baseline.hrv_rmssd} stroke="#818CF830" strokeDasharray="4 3" />
          <ReferenceLine y={baseline.resting_hr} stroke="#F8717130" strokeDasharray="4 3" />
          <Line type="monotone" dataKey="hrv" stroke="#818CF8" strokeWidth={2} dot={{ fill: '#818CF8', r: 3, strokeWidth: 0 }} activeDot={{ r: 5, fill: '#818CF8' }} name="HRV" />
          <Line type="monotone" dataKey="hr" stroke="#F87171" strokeWidth={2} dot={{ fill: '#F87171', r: 3, strokeWidth: 0 }} activeDot={{ r: 5, fill: '#F87171' }} name="Resting HR" />
          <Line type="monotone" dataKey="readiness" stroke="#34D399" strokeWidth={2} dot={{ fill: '#34D399', r: 3, strokeWidth: 0 }} activeDot={{ r: 5, fill: '#34D399' }} name="Readiness" />
          <Line type="monotone" dataKey="temp" stroke="#FBBF24" strokeWidth={2} dot={{ fill: '#FBBF24', r: 3, strokeWidth: 0 }} activeDot={{ r: 5, fill: '#FBBF24' }} name="Temp Δ" />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}

function Shimmer() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {[220, 160, 400].map((h, i) => (
        <div key={i} style={{
          height: h,
          background: '#0B1628',
          border: '1px solid #1E3554',
          borderRadius: 14,
          overflow: 'hidden',
          position: 'relative',
        }}>
          <div style={{ position: 'absolute', inset: 0, animation: 'shimmer 1.5s infinite', background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.03), transparent)', backgroundSize: '200% 100%' }} />
        </div>
      ))}
    </div>
  )
}

export default function OuraDashboard() {
  const [data, setData] = useState<OuraData | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/oura/data')
      .then(r => r.json())
      .then(setData)
      .catch(e => setError(String(e)))
  }, [])

  if (error) {
    return (
      <div style={{ background: '#0B1628', border: '1px solid #EF444430', borderRadius: 14, padding: 24, color: '#F87171', fontSize: 13 }}>
        Failed to load Oura data: {error}
      </div>
    )
  }

  if (!data) return <Shimmer />

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{
          width: 38, height: 38,
          background: 'rgba(129,140,248,0.12)',
          border: '1px solid rgba(129,140,248,0.25)',
          borderRadius: 10,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#818CF8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10"/><path d="M8.56 2.75c4.37 6.03 6.02 9.42 8.03 17.72m2.54-15.38c-3.72 4.35-8.94 5.66-16.88 5.85m19.5 1.9c-3.5-.93-6.63-.82-8.94 0-2.58.92-5.01 2.86-7.44 6.32"/>
          </svg>
        </div>
        <div>
          <h1 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: '#E8F4FF' }}>Oura Ring Simulation</h1>
          <div style={{ fontSize: 13, color: '#3A5472', marginTop: 2 }}>Demo patient — 7-day biometric data</div>
        </div>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
          <span style={{
            fontSize: 11, fontWeight: 600, color: '#3A5472',
            background: '#0B1628', border: '1px solid #1E3554',
            padding: '5px 12px', borderRadius: 20,
          }}>
            Baseline: 30-day avg
          </span>
        </div>
      </div>

      {/* Anomaly Banner */}
      <AnomalyBanner anomaly={data.anomaly} />

      {/* 7-day overview chart */}
      <OverviewChart last7Days={data.last7Days} baseline={data.baseline} />

      {/* 4 metric cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 16 }}>
        {METRICS.map(metric => (
          <MetricCard
            key={metric.key}
            metric={metric}
            last7Days={data.last7Days}
            baseline={data.baseline}
            anomalousSignals={data.anomaly.anomalousSignals}
          />
        ))}
      </div>

      {/* Nightly breakdown */}
      <NightlyBreakdown
        last7Days={data.last7Days}
        baseline={data.baseline}
      />
    </div>
  )
}
