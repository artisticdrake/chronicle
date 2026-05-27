import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useApi } from '../hooks/useApi'
import OuraChart from './OuraChart'
import SOAPTranscript from './SOAPTranscript'
import ScoreBreakdown from './ScoreBreakdown'
import ActionPanel from './ActionPanel'
import type { ClinicalBrief, PatientChart, CheckInSummary } from '../types'

const ALERT = {
  urgent:  { fg: '#EF4444', bg: 'rgba(239,68,68,0.08)', border: 'rgba(239,68,68,0.25)', label: 'URGENT' },
  review:  { fg: '#F59E0B', bg: 'rgba(245,158,11,0.08)', border: 'rgba(245,158,11,0.22)', label: 'REVIEW' },
  monitor: { fg: '#64748B', bg: 'rgba(100,116,139,0.06)', border: 'rgba(100,116,139,0.20)', label: 'MONITOR' },
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      fontSize: 11,
      fontWeight: 700,
      letterSpacing: '0.1em',
      color: '#3A5472',
      textTransform: 'uppercase',
      marginBottom: 10,
      display: 'flex',
      alignItems: 'center',
      gap: 8,
    }}>
      <span style={{ flex: 1, height: 1, background: '#1E3554', display: 'block' }} />
      {children}
      <span style={{ flex: 1, height: 1, background: '#1E3554', display: 'block' }} />
    </div>
  )
}

function StatPill({ label, value }: { label: string; value: string }) {
  return (
    <div style={{
      background: '#0B1628',
      border: '1px solid #1E3554',
      borderRadius: 8,
      padding: '6px 14px',
    }}>
      <div style={{ fontSize: 10, color: '#3A5472', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 2 }}>
        {label}
      </div>
      <div style={{ fontSize: 14, color: '#E8F4FF', fontWeight: 600 }}>{value}</div>
    </div>
  )
}

export default function BriefView() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [backHover, setBackHover] = useState(false)
  const { data, loading } = useApi<{ brief: ClinicalBrief; patient: PatientChart }>(
    id ? `/api/clinician/brief/${id}` : null
  )
  const patientId = data?.brief?.patientId
  const { data: checkinsData } = useApi<{ checkins: CheckInSummary[] }>(
    patientId ? `/api/patient/${patientId}/checkins` : null
  )

  if (loading || !data) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16, maxWidth: 900 }}>
        {[1, 2, 3].map(i => (
          <div key={i} style={{
            height: i === 1 ? 80 : 160,
            borderRadius: 12,
            background: 'linear-gradient(90deg, #0B1628 25%, #101F35 50%, #0B1628 75%)',
            backgroundSize: '800px 100%',
            animation: 'shimmer 1.6s infinite linear',
          }} />
        ))}
      </div>
    )
  }

  const { brief, patient } = data
  const cfg = ALERT[brief.alertLevel] ?? ALERT.monitor
  const pct = Math.min((brief.score.total / 175) * 100, 100)

  return (
    <div style={{ maxWidth: 900, animation: 'fade-in 0.2s ease-out' }}>
      {/* Breadcrumb */}
      <button
        onClick={() => navigate('/clinician')}
        onMouseEnter={() => setBackHover(true)}
        onMouseLeave={() => setBackHover(false)}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 6,
          background: 'transparent',
          border: 'none',
          color: backHover ? '#7CA3C4' : '#3A5472',
          cursor: 'pointer',
          fontSize: 13,
          padding: '0 0 24px',
          transition: 'color 0.15s',
          fontFamily: 'inherit',
        }}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="15 18 9 12 15 6"/>
        </svg>
        Pending Reviews
      </button>

      {/* Patient Header Card */}
      <div style={{
        background: cfg.bg,
        border: `1px solid ${cfg.border}`,
        borderRadius: 16,
        padding: '24px 28px',
        marginBottom: 28,
        display: 'flex',
        alignItems: 'flex-start',
        gap: 20,
      }}>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
            <span style={{
              background: cfg.fg + '20',
              color: cfg.fg,
              fontSize: 10,
              fontWeight: 700,
              padding: '4px 12px',
              borderRadius: 20,
              letterSpacing: '0.1em',
              border: `1px solid ${cfg.fg}35`,
            }}>
              {cfg.label}
            </span>
            <span style={{ fontSize: 12, color: '#3A5472' }}>
              {new Date(brief.createdAt).toLocaleString(undefined, { weekday: 'short', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>
          <h1 style={{ margin: '0 0 12px', fontSize: 24, fontWeight: 700, color: '#E8F4FF', letterSpacing: '-0.4px' }}>
            {brief.patientName}
          </h1>
          {patient && (
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              <StatPill label="Age" value={`${patient.age} yrs`} />
              <StatPill label="EF" value={`${patient.ejectionFraction}%`} />
              <StatPill label="NYHA" value={`Class ${patient.nyhaClass}`} />
              <StatPill label="Last episode" value={patient.lastDecompensationDate} />
            </div>
          )}
        </div>

        {/* Score gauge */}
        <div style={{ textAlign: 'center', minWidth: 96 }}>
          <div style={{ fontSize: 11, color: '#3A5472', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 6 }}>Score</div>
          <div style={{ position: 'relative', width: 80, height: 80, margin: '0 auto' }}>
            <svg width="80" height="80" viewBox="0 0 80 80">
              <circle cx="40" cy="40" r="32" fill="none" stroke="#1E3554" strokeWidth="7"/>
              <circle
                cx="40" cy="40" r="32" fill="none"
                stroke={cfg.fg}
                strokeWidth="7"
                strokeLinecap="round"
                strokeDasharray={`${2 * Math.PI * 32}`}
                strokeDashoffset={`${2 * Math.PI * 32 * (1 - pct / 100)}`}
                transform="rotate(-90 40 40)"
                style={{ transition: 'stroke-dashoffset 0.6s ease' }}
              />
            </svg>
            <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
              <span style={{ fontSize: 20, fontWeight: 700, color: '#E8F4FF', lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>{brief.score.total}</span>
              <span style={{ fontSize: 10, color: '#3A5472' }}>/ 175</span>
            </div>
          </div>
        </div>
      </div>

      {/* Clinical Brief */}
      <div style={{ marginBottom: 28 }}>
        <SectionLabel>Chronicle Brief</SectionLabel>
        <div style={{
          background: '#0B1628',
          border: '1px solid #1E3554',
          borderRadius: 12,
          padding: '20px 24px',
        }}>
          <pre style={{
            margin: 0,
            fontSize: 13,
            lineHeight: 1.85,
            color: '#C8DDF0',
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-word',
            fontFamily: "'JetBrains Mono', 'Fira Code', ui-monospace, monospace",
          }}>
            {brief.briefText}
          </pre>
        </div>
      </div>

      {/* Oura Chart */}
      <div style={{ marginBottom: 28 }}>
        <SectionLabel>Wearable Trends — 7 Days</SectionLabel>
        <OuraChart ouraData={brief.oura.last_7_days ?? []} oura={brief.oura} />
      </div>

      {/* Score + SOAP */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 28 }}>
        <div>
          <SectionLabel>Score Breakdown</SectionLabel>
          <ScoreBreakdown breakdown={brief.score.breakdown} />
        </div>
        <div>
          <SectionLabel>SOAP Interview</SectionLabel>
          <SOAPTranscript soap={brief.soap} />
        </div>
      </div>

      {/* Action */}
      <div style={{ marginBottom: 28 }}>
        <SectionLabel>Clinician Action</SectionLabel>
        <ActionPanel briefId={id!} />
      </div>

      {/* Check-in History */}
      {checkinsData?.checkins && checkinsData.checkins.length > 0 && (
        <div>
          <SectionLabel>Patient Check-In History</SectionLabel>
          <div style={{ background: '#0B1628', border: '1px solid #1E3554', borderRadius: 12, padding: '16px 20px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {checkinsData.checkins.map((c, i) => {
                const OUTCOME_COLORS = { approve: '#0EA5E9', reject: '#22C55E', urgent: '#EF4444' }
                const OUTCOME_LABELS = { approve: 'Follow-up booked', reject: 'No changes needed', urgent: 'Urgent action taken' }
                const ALERT_COLORS: Record<string, string> = { urgent: '#EF4444', review: '#F59E0B', monitor: '#64748B' }
                const alertColor = ALERT_COLORS[c.alertLevel] ?? '#64748B'
                const outcomeColor = c.clinicianAction ? OUTCOME_COLORS[c.clinicianAction] : null
                const isCurrentBrief = c.id === id
                return (
                  <div key={c.id} style={{
                    background: isCurrentBrief ? '#0A1E38' : '#050E1D',
                    border: `1px solid ${isCurrentBrief ? '#2A4566' : '#1A2E47'}`,
                    borderRadius: 8,
                    padding: '10px 14px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    opacity: i === 0 ? 1 : Math.max(0.65, 1 - i * 0.08),
                  }}>
                    <div style={{ width: 6, height: 6, borderRadius: '50%', background: outcomeColor ?? '#1E3554', flexShrink: 0 }} />
                    <span style={{ fontSize: 12, color: '#5A7A94', minWidth: 90, fontVariantNumeric: 'tabular-nums' }}>
                      {new Date(c.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                    </span>
                    <span style={{ flex: 1, fontSize: 12, color: outcomeColor ?? '#3A5472' }}>
                      {c.clinicianAction ? OUTCOME_LABELS[c.clinicianAction] : 'Pending review'}
                    </span>
                    <span style={{
                      fontSize: 10, fontWeight: 700, color: alertColor,
                      background: alertColor + '15', border: `1px solid ${alertColor}30`,
                      padding: '2px 7px', borderRadius: 20, letterSpacing: '0.05em', textTransform: 'uppercase',
                    }}>
                      {c.alertLevel}
                    </span>
                    <span style={{ fontSize: 12, color: '#E8F4FF', fontWeight: 600, fontVariantNumeric: 'tabular-nums', minWidth: 40, textAlign: 'right' }}>
                      {c.scoreTotal}<span style={{ fontSize: 10, color: '#3A5472', fontWeight: 400 }}>/175</span>
                    </span>
                    {isCurrentBrief && (
                      <span style={{ fontSize: 10, color: '#3B82F6', background: '#3B82F615', border: '1px solid #3B82F630', padding: '2px 7px', borderRadius: 20 }}>
                        current
                      </span>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
