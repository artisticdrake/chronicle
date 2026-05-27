import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

interface Props { briefId: string }

const ACTIONS = [
  {
    id: 'approve' as const,
    label: 'Schedule Follow-up',
    sublabel: 'Notify patient to expect an appointment',
    color: '#22C55E',
    bg: 'rgba(34,197,94,0.08)',
    border: 'rgba(34,197,94,0.22)',
    hoverBg: 'rgba(34,197,94,0.14)',
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
      </svg>
    ),
  },
  {
    id: 'reject' as const,
    label: 'No Action Needed',
    sublabel: 'Reassure patient, continue monitoring',
    color: '#7CA3C4',
    bg: 'rgba(124,163,196,0.06)',
    border: 'rgba(124,163,196,0.18)',
    hoverBg: 'rgba(124,163,196,0.12)',
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>
      </svg>
    ),
  },
  {
    id: 'urgent' as const,
    label: 'Urgent — ER Referral',
    sublabel: 'Instruct patient to call 911 or go to ER',
    color: '#EF4444',
    bg: 'rgba(239,68,68,0.07)',
    border: 'rgba(239,68,68,0.22)',
    hoverBg: 'rgba(239,68,68,0.14)',
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <polygon points="7.86 2 16.14 2 22 7.86 22 16.14 16.14 22 7.86 22 2 16.14 2 7.86 7.86 2"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
      </svg>
    ),
  },
]

export default function ActionPanel({ briefId }: Props) {
  const [notes, setNotes] = useState('')
  const [loading, setLoading] = useState(false)
  const [hovered, setHovered] = useState<string | null>(null)
  const [focused, setFocused] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const navigate = useNavigate()

  async function handleAction(action: 'approve' | 'reject' | 'urgent') {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/clinician/brief/${briefId}/action`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, notes }),
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      navigate('/clinician')
    } catch (e) {
      setError(String(e))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{
      background: '#0B1628',
      border: '1px solid #1E3554',
      borderRadius: 12,
      padding: '20px',
    }}>
      <textarea
        value={notes}
        onChange={e => setNotes(e.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        placeholder="Add clinician notes (optional — saved to patient record)"
        rows={3}
        disabled={loading}
        style={{
          width: '100%',
          background: '#050E1D',
          border: `1px solid ${focused ? '#2A4566' : '#1A2E47'}`,
          borderRadius: 8,
          color: '#C8DDF0',
          padding: '10px 14px',
          fontSize: 13,
          resize: 'vertical',
          boxSizing: 'border-box',
          marginBottom: 16,
          outline: 'none',
          transition: 'border-color 0.15s',
          fontFamily: 'Inter, sans-serif',
          lineHeight: 1.6,
        }}
      />

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
        {ACTIONS.map(a => (
          <button
            key={a.id}
            onClick={() => !loading && handleAction(a.id)}
            onMouseEnter={() => setHovered(a.id)}
            onMouseLeave={() => setHovered(null)}
            disabled={loading}
            style={{
              background: hovered === a.id && !loading ? a.hoverBg : a.bg,
              border: `1px solid ${a.border}`,
              borderRadius: 10,
              padding: '12px 14px',
              color: loading ? '#3A5472' : a.color,
              cursor: loading ? 'not-allowed' : 'pointer',
              transition: 'background 0.15s, border-color 0.15s',
              textAlign: 'left',
              fontFamily: 'inherit',
              display: 'flex',
              flexDirection: 'column',
              gap: 6,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
              {a.icon}
              <span style={{ fontSize: 13, fontWeight: 600 }}>{a.label}</span>
            </div>
            <span style={{ fontSize: 11, color: loading ? '#3A5472' : a.color + 'AA', lineHeight: 1.4 }}>
              {a.sublabel}
            </span>
          </button>
        ))}
      </div>

      {error && (
        <div style={{
          marginTop: 12,
          padding: '8px 12px',
          background: 'rgba(239,68,68,0.08)',
          border: '1px solid rgba(239,68,68,0.22)',
          borderRadius: 8,
          color: '#F87171',
          fontSize: 12,
        }}>
          {error}
        </div>
      )}
    </div>
  )
}
