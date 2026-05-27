import { useState } from 'react'
import { Link } from 'react-router-dom'
import type { ClinicalBrief } from '../types'

interface Props { brief: ClinicalBrief }

const ALERT = {
  urgent:  { label: 'URGENT',  fg: '#EF4444', bg: 'rgba(239,68,68,0.07)',  border: 'rgba(239,68,68,0.22)',  accent: '#EF4444' },
  review:  { label: 'REVIEW',  fg: '#F59E0B', bg: 'rgba(245,158,11,0.06)', border: 'rgba(245,158,11,0.20)', accent: '#F59E0B' },
  monitor: { label: 'MONITOR', fg: '#64748B', bg: 'rgba(100,116,139,0.05)', border: 'rgba(100,116,139,0.18)', accent: '#64748B' },
}

function ChevronRightIcon({ color }: { color: string }) {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="9 18 15 12 9 6"/>
    </svg>
  )
}

export default function BriefCard({ brief }: Props) {
  const cfg = ALERT[brief.alertLevel] ?? ALERT.monitor
  const [hovered, setHovered] = useState(false)

  const totalMax = 175
  const pct = Math.min((brief.score.total / totalMax) * 100, 100)

  return (
    <Link to={`/clinician/brief/${brief.id}`} style={{ textDecoration: 'none' }}>
      <div
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        style={{
          background: hovered ? '#0F1E35' : cfg.bg,
          border: `1px solid ${hovered ? cfg.accent + '55' : cfg.border}`,
          borderLeft: `3px solid ${cfg.accent}`,
          borderRadius: 12,
          padding: '16px 20px',
          display: 'flex',
          alignItems: 'center',
          gap: 16,
          cursor: 'pointer',
          transition: 'background 0.15s, border-color 0.15s, box-shadow 0.15s',
          boxShadow: hovered ? `0 4px 20px rgba(0,0,0,0.3)` : 'none',
        }}
      >
        {/* Alert badge */}
        <span style={{
          background: cfg.fg + '18',
          color: cfg.fg,
          fontSize: 10,
          fontWeight: 700,
          padding: '4px 10px',
          borderRadius: 20,
          letterSpacing: '0.08em',
          whiteSpace: 'nowrap',
          border: `1px solid ${cfg.fg}30`,
        }}>
          {cfg.label}
        </span>

        {/* Patient info */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 600, color: '#E8F4FF', fontSize: 15, marginBottom: 3 }}>
            {brief.patientName}
          </div>
          <div style={{ color: '#3A5472', fontSize: 12 }}>
            {new Date(brief.createdAt).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
          </div>
        </div>

        {/* Score with mini progress */}
        <div style={{ textAlign: 'right', minWidth: 72 }}>
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'flex-end', gap: 2 }}>
            <span style={{ color: '#E8F4FF', fontWeight: 700, fontSize: 20, fontVariantNumeric: 'tabular-nums' }}>
              {brief.score.total}
            </span>
            <span style={{ color: '#3A5472', fontSize: 12 }}>/175</span>
          </div>
          <div style={{ marginTop: 4, height: 3, width: 64, background: '#1E3554', borderRadius: 2, overflow: 'hidden', marginLeft: 'auto' }}>
            <div style={{
              height: '100%',
              width: `${pct}%`,
              background: cfg.fg,
              borderRadius: 2,
              transition: 'width 0.3s ease',
            }} />
          </div>
        </div>

        <ChevronRightIcon color={hovered ? cfg.fg : '#2A4566'} />
      </div>
    </Link>
  )
}
