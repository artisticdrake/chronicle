interface Props {
  breakdown: Record<string, number>
}

const SIGNAL_META: Record<string, { label: string; max: number; category: 'oura' | 'symptom' | 'objective' }> = {
  oura_multisignal:  { label: 'Oura multi-signal',  max: 20, category: 'oura' },
  dyspnea_exertion:  { label: 'Dyspnea on exertion', max: 30, category: 'symptom' },
  dyspnea_rest:      { label: 'Dyspnea at rest',     max: 15, category: 'symptom' },
  orthopnea:         { label: 'Orthopnea',           max: 25, category: 'symptom' },
  edema:             { label: 'Peripheral edema',    max: 15, category: 'symptom' },
  edema_constant:    { label: 'Edema (constant)',    max: 5,  category: 'symptom' },
  fatigue:           { label: 'Fatigue worsening',   max: 10, category: 'symptom' },
  cough:             { label: 'New cough',           max: 10, category: 'symptom' },
  missed_diuretics:  { label: 'Missed diuretics',   max: 20, category: 'objective' },
  weight_gain:       { label: 'Weight gain ≥2 lbs', max: 25, category: 'objective' },
}

const CATEGORY_COLORS = {
  oura:      '#818CF8',
  symptom:   '#F87171',
  objective: '#FBBF24',
}

export default function ScoreBreakdown({ breakdown }: Props) {
  const entries = Object.entries(breakdown).filter(([, v]) => v > 0)

  if (entries.length === 0) {
    return (
      <div style={{ background: '#0B1628', border: '1px solid #1E3554', borderRadius: 12, padding: 20, color: '#3A5472', fontSize: 13 }}>
        No scoring signals detected
      </div>
    )
  }

  return (
    <div style={{
      background: '#0B1628',
      border: '1px solid #1E3554',
      borderRadius: 12,
      padding: '16px 20px',
      display: 'flex',
      flexDirection: 'column',
      gap: 12,
    }}>
      {entries.map(([key, points]) => {
        const meta = SIGNAL_META[key] ?? { label: key, max: 30, category: 'symptom' as const }
        const color = CATEGORY_COLORS[meta.category]
        const pct = Math.min((points / meta.max) * 100, 100)
        return (
          <div key={key}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 5 }}>
              <span style={{ fontSize: 12, color: '#7CA3C4' }}>{meta.label}</span>
              <span style={{ fontSize: 12, fontWeight: 700, color, fontVariantNumeric: 'tabular-nums' }}>
                +{points}
              </span>
            </div>
            <div style={{ height: 4, background: '#1E3554', borderRadius: 2, overflow: 'hidden' }}>
              <div style={{
                height: '100%',
                width: `${pct}%`,
                background: color,
                borderRadius: 2,
                boxShadow: `0 0 6px ${color}60`,
                transition: 'width 0.4s ease',
              }} />
            </div>
          </div>
        )
      })}

      {/* Total */}
      <div style={{
        marginTop: 4,
        paddingTop: 12,
        borderTop: '1px solid #1E3554',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
      }}>
        <span style={{ fontSize: 12, fontWeight: 600, color: '#7CA3C4' }}>Total</span>
        <span style={{ fontSize: 16, fontWeight: 700, color: '#E8F4FF', fontVariantNumeric: 'tabular-nums' }}>
          {Object.values(breakdown).reduce((a, b) => a + b, 0)}<span style={{ fontSize: 12, color: '#3A5472', marginLeft: 2 }}>/175</span>
        </span>
      </div>
    </div>
  )
}
