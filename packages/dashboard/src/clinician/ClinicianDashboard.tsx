import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useApi } from '../hooks/useApi'
import BriefCard from './BriefCard'
import type { ClinicalBrief } from '../types'

function RefreshIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/>
      <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/>
    </svg>
  )
}

function CheckCircleIcon() {
  return (
    <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#1E3554" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
      <polyline points="22 4 12 14.01 9 11.01"/>
    </svg>
  )
}

export default function ClinicianDashboard() {
  const { data, loading } = useApi<{ briefs: ClinicalBrief[] }>('/api/clinician/dashboard', 5000)
  const [hoverRefresh, setHoverRefresh] = useState(false)

  const briefs = data?.briefs ?? []
  const urgentCount = briefs.filter(b => b.alertLevel === 'urgent').length
  const reviewCount = briefs.filter(b => b.alertLevel === 'review').length

  return (
    <div style={{ maxWidth: 760 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 28 }}>
        <div>
          <p style={{ margin: '0 0 4px', fontSize: 12, fontWeight: 600, letterSpacing: '0.08em', color: '#3A5472', textTransform: 'uppercase' }}>
            Clinician Dashboard
          </p>
          <h1 style={{ margin: 0, fontSize: 26, fontWeight: 700, color: '#E8F4FF', letterSpacing: '-0.5px' }}>
            Pending Reviews
          </h1>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {briefs.length > 0 && (
            <div style={{ display: 'flex', gap: 8 }}>
              {urgentCount > 0 && (
                <span style={{ background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.30)', color: '#EF4444', fontSize: 12, fontWeight: 600, padding: '3px 10px', borderRadius: 20 }}>
                  {urgentCount} Urgent
                </span>
              )}
              {reviewCount > 0 && (
                <span style={{ background: 'rgba(245,158,11,0.10)', border: '1px solid rgba(245,158,11,0.25)', color: '#F59E0B', fontSize: 12, fontWeight: 600, padding: '3px 10px', borderRadius: 20 }}>
                  {reviewCount} Review
                </span>
              )}
            </div>
          )}
          <button
            onMouseEnter={() => setHoverRefresh(true)}
            onMouseLeave={() => setHoverRefresh(false)}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              background: hoverRefresh ? '#0B1628' : 'transparent',
              border: '1px solid #1E3554',
              borderRadius: 8,
              color: '#7CA3C4',
              padding: '6px 12px',
              fontSize: 12,
              cursor: 'default',
              transition: 'background 0.15s',
            }}
          >
            <RefreshIcon />
            Live · 5s
          </button>
        </div>
      </div>

      {/* Loading skeleton */}
      {loading && !data && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {[1, 2].map(i => (
            <div key={i} style={{
              height: 76,
              borderRadius: 12,
              background: 'linear-gradient(90deg, #0B1628 25%, #101F35 50%, #0B1628 75%)',
              backgroundSize: '800px 100%',
              animation: 'shimmer 1.6s infinite linear',
            }} />
          ))}
        </div>
      )}

      {/* Empty state */}
      {data && briefs.length === 0 && (
        <div style={{
          background: '#0B1628',
          border: '1px solid #1E3554',
          borderRadius: 16,
          padding: '52px 32px',
          textAlign: 'center',
        }}>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 16 }}>
            <CheckCircleIcon />
          </div>
          <div style={{ fontWeight: 600, color: '#7CA3C4', fontSize: 16, marginBottom: 6 }}>
            All clear — no pending reviews
          </div>
          <div style={{ fontSize: 13, color: '#3A5472', lineHeight: 1.6, maxWidth: 320, margin: '0 auto' }}>
            Go to the{' '}
            <Link to="/dev" style={{ color: '#3B82F6', textDecoration: 'none', fontWeight: 500 }}>
              Developer tab
            </Link>
            {' '}to trigger a clinical scenario.
          </div>
        </div>
      )}

      {/* Brief list */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {briefs.map(brief => (
          <BriefCard key={brief.id} brief={brief} />
        ))}
      </div>
    </div>
  )
}
