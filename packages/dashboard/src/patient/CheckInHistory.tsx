import type { CheckInSummary } from '../types'

interface Props { checkins: CheckInSummary[] }

const OUTCOME = {
  approve: { label: 'Care team will call to book follow-up', color: '#0EA5E9', dot: '#0EA5E9' },
  reject:  { label: 'No changes needed',     color: '#22C55E', dot: '#22C55E' },
  urgent:  { label: 'Urgent action taken',   color: '#EF4444', dot: '#EF4444' },
}
const ALERT_COLORS = {
  urgent:  '#EF4444',
  review:  '#F59E0B',
  monitor: '#64748B',
}

export default function CheckInHistory({ checkins }: Props) {
  return (
    <div style={{ background: '#0B1628', border: '1px solid #1E3554', borderRadius: 14, padding: '20px 24px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#7CA3C4" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/>
        </svg>
        <h2 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: '#E8F4FF' }}>Check-In History</h2>
        {checkins.length > 0 && (
          <span style={{ marginLeft: 'auto', fontSize: 12, color: '#3A5472' }}>
            {checkins.length} total
          </span>
        )}
      </div>

      {checkins.length === 0 ? (
        <p style={{ color: '#3A5472', fontSize: 14, margin: 0, textAlign: 'center', padding: '24px 0' }}>
          No check-ins recorded yet.
        </p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {checkins.map((c, i) => {
            const outcome = c.clinicianAction ? OUTCOME[c.clinicianAction] : null
            const alertColor = ALERT_COLORS[c.alertLevel] ?? '#64748B'
            return (
              <div key={c.id} style={{
                background: '#050E1D',
                border: '1px solid #1A2E47',
                borderRadius: 10,
                padding: '12px 16px',
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                opacity: i === 0 ? 1 : 0.85,
              }}>
                {/* Timeline dot */}
                <div style={{
                  width: 8,
                  height: 8,
                  borderRadius: '50%',
                  background: outcome ? outcome.dot : '#1E3554',
                  border: outcome ? 'none' : '1px solid #2A4566',
                  flexShrink: 0,
                }} />

                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, color: '#7CA3C4', marginBottom: 2 }}>
                    {new Date(c.createdAt).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}
                  </div>
                  <div style={{ fontSize: 13, color: outcome ? outcome.color : '#3A5472', fontWeight: outcome ? 500 : 400 }}>
                    {outcome ? outcome.label : 'Pending review'}
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{
                    fontSize: 10,
                    fontWeight: 700,
                    color: alertColor,
                    background: alertColor + '15',
                    border: `1px solid ${alertColor}30`,
                    padding: '2px 8px',
                    borderRadius: 20,
                    letterSpacing: '0.06em',
                    textTransform: 'uppercase',
                  }}>
                    {c.alertLevel}
                  </span>
                  <span style={{ fontSize: 13, color: '#E8F4FF', fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>
                    {c.scoreTotal}
                    <span style={{ fontSize: 11, color: '#3A5472', fontWeight: 400 }}>/175</span>
                  </span>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
