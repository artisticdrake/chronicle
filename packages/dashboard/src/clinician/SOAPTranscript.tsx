import { useState } from 'react'
import type { ParsedSOAPTranscript } from '../types'

interface Props { soap: ParsedSOAPTranscript }

const FIELDS: Array<{ key: keyof ParsedSOAPTranscript; label: string; section: string }> = [
  { key: 'S2_dyspnea',      label: 'Shortness of breath',       section: 'S' },
  { key: 'S2a_at_rest',     label: '— at rest',                  section: 'S' },
  { key: 'S3_orthopnea',    label: 'Orthopnea',                  section: 'S' },
  { key: 'S4_edema',        label: 'Peripheral edema',           section: 'S' },
  { key: 'S4a_constant',    label: '— constant',                  section: 'S' },
  { key: 'S5_fatigue_worse', label: 'Fatigue worsening',         section: 'S' },
  { key: 'S6_cough',        label: 'New or changed cough',       section: 'S' },
  { key: 'O3_missed_meds',  label: 'Missed diuretics',           section: 'O' },
  { key: 'O4_weight_gain',  label: 'Weight gain ≥ 2 lbs',        section: 'O' },
  { key: 'O4_pounds',       label: 'Pounds gained',              section: 'O' },
]

function ValueBadge({ v }: { v: boolean | number | string | undefined }) {
  if (v === true) return (
    <span style={{ background: 'rgba(239,68,68,0.12)', color: '#F87171', border: '1px solid rgba(239,68,68,0.25)', fontSize: 11, fontWeight: 700, padding: '2px 10px', borderRadius: 20 }}>
      Yes
    </span>
  )
  if (v === false) return (
    <span style={{ background: 'rgba(34,197,94,0.10)', color: '#4ADE80', border: '1px solid rgba(34,197,94,0.20)', fontSize: 11, fontWeight: 700, padding: '2px 10px', borderRadius: 20 }}>
      No
    </span>
  )
  if (typeof v === 'number') return (
    <span style={{ background: 'rgba(251,191,36,0.10)', color: '#FBBF24', border: '1px solid rgba(251,191,36,0.20)', fontSize: 11, fontWeight: 700, padding: '2px 10px', borderRadius: 20 }}>
      {v} lbs
    </span>
  )
  return <span style={{ color: '#3A5472', fontSize: 12 }}>—</span>
}

export default function SOAPTranscript({ soap }: Props) {
  const [showRaw, setShowRaw] = useState(false)

  return (
    <div style={{
      background: '#0B1628',
      border: '1px solid #1E3554',
      borderRadius: 12,
      overflow: 'hidden',
    }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
        <tbody>
          {FIELDS.map(({ key, label, section }) => {
            const val = soap[key]
            if (val === undefined) return null
            return (
              <tr key={key} style={{ borderBottom: '1px solid #111E30' }}>
                <td style={{ padding: '9px 16px', color: '#7CA3C4', width: '60%' }}>
                  <span style={{
                    display: 'inline-block',
                    width: 16,
                    fontSize: 10,
                    fontWeight: 700,
                    color: section === 'S' ? '#818CF8' : '#FBBF24',
                    marginRight: 6,
                  }}>
                    {section}
                  </span>
                  {label}
                </td>
                <td style={{ padding: '9px 16px', textAlign: 'right' }}>
                  <ValueBadge v={val as boolean | number | undefined} />
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>

      {soap.S1_general && (
        <div style={{
          margin: '0 16px 12px',
          padding: '10px 12px',
          background: '#05101D',
          borderRadius: 8,
          border: '1px solid #1A2E47',
        }}>
          <div style={{ fontSize: 10, color: '#3A5472', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 4 }}>
            Opening response
          </div>
          <div style={{ color: '#7CA3C4', fontSize: 12, fontStyle: 'italic', lineHeight: 1.6 }}>
            "{soap.S1_general.slice(0, 140)}{soap.S1_general.length > 140 ? '…' : ''}"
          </div>
        </div>
      )}

      <button
        onClick={() => setShowRaw(!showRaw)}
        style={{
          display: 'block',
          width: '100%',
          background: 'transparent',
          border: 'none',
          borderTop: '1px solid #111E30',
          color: '#3A5472',
          fontSize: 11,
          padding: '8px 16px',
          cursor: 'pointer',
          textAlign: 'left',
          fontFamily: 'inherit',
          letterSpacing: '0.06em',
        }}
      >
        {showRaw ? '▲' : '▼'} Raw transcript
      </button>
      {showRaw && (
        <pre style={{
          margin: 0,
          padding: '12px 16px',
          fontSize: 11,
          color: '#3A5472',
          whiteSpace: 'pre-wrap',
          wordBreak: 'break-word',
          fontFamily: "'JetBrains Mono', ui-monospace, monospace",
          borderTop: '1px solid #111E30',
          lineHeight: 1.7,
        }}>
          {soap.raw}
        </pre>
      )}
    </div>
  )
}
