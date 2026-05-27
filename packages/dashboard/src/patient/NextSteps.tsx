interface Props {
  clinicianAction: 'approve' | 'reject' | 'urgent' | null | undefined
}

const STATUS = {
  approve: {
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#0EA5E9" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
      </svg>
    ),
    title: 'Follow-up appointment needed',
    body: 'Your care team reviewed your check-in and will call you to schedule a follow-up appointment. Keep taking your medications as prescribed.',
    color: '#0EA5E9',
    bg: 'rgba(14,165,233,0.06)',
    border: 'rgba(14,165,233,0.20)',
  },
  reject: {
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#22C55E" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>
      </svg>
    ),
    title: 'Everything looks okay',
    body: 'Your care team reviewed your check-in. No immediate changes are needed. Continue your current medications and check in again if symptoms worsen.',
    color: '#22C55E',
    bg: 'rgba(34,197,94,0.06)',
    border: 'rgba(34,197,94,0.20)',
  },
  urgent: {
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#EF4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polygon points="7.86 2 16.14 2 22 7.86 22 16.14 16.14 22 7.86 22 2 16.14 2 7.86 7.86 2"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
      </svg>
    ),
    title: 'Please contact your care team',
    body: 'Your care team has reviewed your check-in and would like you to contact them or seek medical attention. If you feel unwell, please call 911 immediately.',
    color: '#EF4444',
    bg: 'rgba(239,68,68,0.07)',
    border: 'rgba(239,68,68,0.22)',
  },
  pending: {
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#7CA3C4" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
      </svg>
    ),
    title: 'Check-in under review',
    body: 'Your care team is reviewing your latest check-in and will follow up with you soon. No action needed on your end right now.',
    color: '#7CA3C4',
    bg: 'rgba(124,163,196,0.06)',
    border: 'rgba(124,163,196,0.18)',
  },
}

export default function NextSteps({ clinicianAction }: Props) {
  const cfg = STATUS[clinicianAction ?? 'pending'] ?? STATUS.pending

  return (
    <div style={{
      background: cfg.bg,
      border: `1px solid ${cfg.border}`,
      borderRadius: 14,
      padding: '20px 24px',
      display: 'flex',
      gap: 18,
      alignItems: 'flex-start',
    }}>
      <div style={{
        width: 44,
        height: 44,
        background: cfg.color + '14',
        border: `1px solid ${cfg.color}25`,
        borderRadius: 12,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
      }}>
        {cfg.icon}
      </div>
      <div>
        <div style={{ fontWeight: 700, color: '#E8F4FF', fontSize: 16, marginBottom: 6 }}>
          {cfg.title}
        </div>
        <div style={{ color: '#7CA3C4', fontSize: 14, lineHeight: 1.65 }}>
          {cfg.body}
        </div>
      </div>
    </div>
  )
}
