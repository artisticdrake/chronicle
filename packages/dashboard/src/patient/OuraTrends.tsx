import type { OuraDailyRecord } from '../types'

interface Props { trends: OuraDailyRecord[] }

function trendSentence(trends: OuraDailyRecord[]): string {
  if (trends.length < 2) return 'Your wearable data will appear here after your first check-in.'
  const first = trends[0]
  const last = trends[trends.length - 1]
  const hrvChange = last.hrv_rmssd - first.hrv_rmssd
  const hrChange = last.resting_hr - first.resting_hr
  const readinessChange = last.readiness_score - first.readiness_score
  const parts: string[] = []
  if (hrvChange < -2) parts.push('your heart rate variability has been lower than usual')
  else if (hrvChange > 2) parts.push('your heart rate variability has been improving')
  if (hrChange > 3) parts.push('your resting heart rate has been slightly elevated')
  if (readinessChange < -10) parts.push('your overall readiness has dropped')
  else if (readinessChange > 5) parts.push('your readiness has been improving')
  if (parts.length === 0) return 'Your wearable signals look stable over the past week. Good job!'
  return `Over the past week, ${parts.join(', and ')}.`
}

function TrendDot({ direction }: { direction: 'up' | 'down' | 'stable' }) {
  const color = direction === 'stable' ? '#22C55E' : direction === 'up' ? '#F59E0B' : '#F87171'
  const arrow = direction === 'stable' ? '→' : direction === 'up' ? '↑' : '↓'
  return <span style={{ fontSize: 12, color, fontWeight: 700 }}>{arrow}</span>
}

export default function OuraTrends({ trends }: Props) {
  const latest = trends.length > 0 ? trends[trends.length - 1] : null
  const prev = trends.length > 1 ? trends[trends.length - 2] : null

  const metrics = latest ? [
    {
      label: 'Heart Rate Variability',
      value: latest.hrv_rmssd.toFixed(1),
      unit: 'ms',
      direction: (prev ? (latest.hrv_rmssd > prev.hrv_rmssd ? 'up' : latest.hrv_rmssd < prev.hrv_rmssd ? 'down' : 'stable') : 'stable') as 'up' | 'down' | 'stable',
      goodWhenUp: true,
    },
    {
      label: 'Resting Heart Rate',
      value: String(latest.resting_hr),
      unit: 'bpm',
      direction: (prev ? (latest.resting_hr > prev.resting_hr ? 'up' : latest.resting_hr < prev.resting_hr ? 'down' : 'stable') : 'stable') as 'up' | 'down' | 'stable',
      goodWhenUp: false,
    },
    {
      label: 'Readiness Score',
      value: String(latest.readiness_score),
      unit: '/ 100',
      direction: (prev ? (latest.readiness_score > prev.readiness_score ? 'up' : latest.readiness_score < prev.readiness_score ? 'down' : 'stable') : 'stable') as 'up' | 'down' | 'stable',
      goodWhenUp: true,
    },
  ] : []

  return (
    <div style={{ background: '#0B1628', border: '1px solid #1E3554', borderRadius: 14, padding: '20px 24px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#818CF8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
        </svg>
        <h2 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: '#E8F4FF' }}>
          Your Recent Trends
        </h2>
        {trends.length > 0 && (
          <span style={{ fontSize: 11, color: '#3A5472', marginLeft: 'auto' }}>Last 7 nights</span>
        )}
      </div>

      <p style={{ margin: '0 0 20px', color: '#7CA3C4', fontSize: 14, lineHeight: 1.65 }}>
        {trendSentence(trends)}
      </p>

      {metrics.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
          {metrics.map(({ label, value, unit, direction, goodWhenUp }) => {
            const isGood = (direction === 'up' && goodWhenUp) || (direction === 'down' && !goodWhenUp) || direction === 'stable'
            const tileColor = isGood ? '#22C55E' : '#F87171'
            return (
              <div key={label} style={{
                background: '#050E1D',
                border: '1px solid #1A2E47',
                borderRadius: 10,
                padding: '14px 16px',
              }}>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 4, marginBottom: 4 }}>
                  <span style={{ color: '#E8F4FF', fontWeight: 700, fontSize: 24, fontVariantNumeric: 'tabular-nums' }}>
                    {value}
                  </span>
                  <span style={{ color: '#3A5472', fontSize: 12 }}>{unit}</span>
                  <span style={{ marginLeft: 'auto' }}>
                    <TrendDot direction={direction} />
                  </span>
                </div>
                <div style={{ color: '#3A5472', fontSize: 11, lineHeight: 1.4 }}>{label}</div>
                <div style={{ marginTop: 8, height: 2, background: '#1A2E47', borderRadius: 1 }}>
                  <div style={{ height: '100%', width: `${Math.min((Number(value) / (label.includes('Readiness') ? 100 : label.includes('HRV') ? 50 : 100)) * 100, 100)}%`, background: tileColor + '80', borderRadius: 1 }} />
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
