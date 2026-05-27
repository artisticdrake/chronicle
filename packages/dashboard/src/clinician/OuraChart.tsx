import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer,
} from 'recharts'
import type { OuraDailyRecord, OuraAnomalyResult } from '../types'

interface Props {
  ouraData: OuraDailyRecord[]
  oura?: OuraAnomalyResult
}

function CustomTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{ color: string; name: string; value: number }>; label?: string }) {
  if (!active || !payload?.length) return null
  return (
    <div style={{
      background: '#050E1D',
      border: '1px solid #1E3554',
      borderRadius: 10,
      padding: '10px 14px',
      fontSize: 12,
      boxShadow: '0 8px 32px rgba(0,0,0,0.6)',
    }}>
      <div style={{ color: '#7CA3C4', marginBottom: 8, fontWeight: 600 }}>{label}</div>
      {payload.map(p => (
        <div key={p.name} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: p.color, display: 'inline-block' }} />
          <span style={{ color: '#7CA3C4' }}>{p.name}:</span>
          <span style={{ color: '#E8F4FF', fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>{p.value}</span>
        </div>
      ))}
    </div>
  )
}

export default function OuraChart({ ouraData, oura }: Props) {
  if (ouraData.length === 0) {
    return (
      <div style={{ background: '#0B1628', border: '1px solid #1E3554', borderRadius: 12, padding: 24, textAlign: 'center', color: '#3A5472', fontSize: 13 }}>
        No wearable data available
      </div>
    )
  }

  const formatted = ouraData.map(d => ({
    ...d,
    date: d.date.slice(5),
  }))

  return (
    <div style={{
      background: '#0B1628',
      border: '1px solid #1E3554',
      borderRadius: 12,
      padding: '20px 12px 12px',
    }}>
      {/* Legend pills */}
      <div style={{ display: 'flex', gap: 16, paddingLeft: 8, marginBottom: 16 }}>
        {[
          { color: '#818CF8', label: 'HRV (rMSSD)', unit: 'ms' },
          { color: '#F87171', label: 'Resting HR', unit: 'bpm' },
          { color: '#34D399', label: 'Readiness', unit: '/100' },
        ].map(({ color, label, unit }) => (
          <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ width: 24, height: 2, background: color, display: 'inline-block', borderRadius: 1 }} />
            <span style={{ fontSize: 12, color: '#7CA3C4' }}>{label}</span>
            <span style={{ fontSize: 11, color: '#3A5472' }}>{unit}</span>
          </div>
        ))}
        {oura && (
          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{
              width: 7, height: 7, borderRadius: '50%', background: '#EF4444',
              display: 'inline-block', animation: 'pulse-dot 2s ease-in-out infinite',
            }} />
            <span style={{ fontSize: 12, color: '#EF4444' }}>
              {oura.consecutiveNights} anomalous nights
            </span>
          </div>
        )}
      </div>

      <ResponsiveContainer width="100%" height={220}>
        <LineChart data={formatted} margin={{ left: 0, right: 16, top: 4, bottom: 0 }}>
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
          <Tooltip content={<CustomTooltip />} />
          <Line type="monotone" dataKey="hrv_rmssd" stroke="#818CF8" strokeWidth={2} dot={{ fill: '#818CF8', r: 3, strokeWidth: 0 }} activeDot={{ r: 5, fill: '#818CF8' }} name="HRV" />
          <Line type="monotone" dataKey="resting_hr" stroke="#F87171" strokeWidth={2} dot={{ fill: '#F87171', r: 3, strokeWidth: 0 }} activeDot={{ r: 5, fill: '#F87171' }} name="HR" />
          <Line type="monotone" dataKey="readiness_score" stroke="#34D399" strokeWidth={2} dot={{ fill: '#34D399', r: 3, strokeWidth: 0 }} activeDot={{ r: 5, fill: '#34D399' }} name="Readiness" />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
