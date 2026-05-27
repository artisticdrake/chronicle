import { useState } from 'react'
import { Routes, Route, Navigate, NavLink, useLocation } from 'react-router-dom'
import ClinicianDashboard from './clinician/ClinicianDashboard'
import BriefView from './clinician/BriefView'
import PatientDashboard from './patient/PatientDashboard'
import DevDashboard from './dev/DevDashboard'

const T = {
  bg: '#020617',
  nav: '#05101F',
  surface1: '#0B1628',
  border: '#1E3554',
  text: '#E8F4FF',
  textSub: '#7CA3C4',
  textMuted: '#3A5472',
  blue: '#3B82F6',
  teal: '#14B8A6',
}

function HeartIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={T.blue} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
    </svg>
  )
}

export default function App() {
  const location = useLocation()
  const isBriefView = location.pathname.startsWith('/clinician/brief/')
  const [hoveredTab, setHoveredTab] = useState<string | null>(null)

  const tabs = [
    { to: '/clinician', label: 'Clinician', match: '/clinician' },
    { to: '/patient/demo-patient-001', label: 'Patient', match: '/patient' },
    { to: '/dev', label: 'Developer', match: '/dev' },
  ]

  return (
    <div style={{ minHeight: '100vh', background: T.bg }}>
      <nav style={{
        position: 'sticky',
        top: 0,
        zIndex: 100,
        height: 58,
        background: T.nav,
        borderBottom: `1px solid ${T.border}`,
        display: 'flex',
        alignItems: 'center',
        padding: '0 28px',
        gap: 0,
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
      }}>
        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginRight: 36, userSelect: 'none' }}>
          <HeartIcon />
          <span style={{
            color: T.text,
            fontWeight: 700,
            fontSize: 16,
            letterSpacing: '-0.4px',
          }}>
            Chronicle
          </span>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', alignItems: 'center', height: '100%', gap: 2 }}>
          {tabs.map(tab => (
            <NavLink
              key={tab.to}
              to={tab.to}
              onMouseEnter={() => setHoveredTab(tab.to)}
              onMouseLeave={() => setHoveredTab(null)}
              style={({ isActive }) => {
                const active = isActive || (isBriefView && tab.match === '/clinician')
                const hovered = hoveredTab === tab.to
                return {
                  textDecoration: 'none',
                  display: 'flex',
                  alignItems: 'center',
                  height: 58,
                  padding: '0 16px',
                  fontSize: 13.5,
                  fontWeight: active ? 600 : 500,
                  color: active ? T.text : hovered ? '#A8C8E8' : T.textSub,
                  borderBottom: `2px solid ${active ? T.blue : 'transparent'}`,
                  transition: 'color 0.15s, border-color 0.15s',
                  cursor: 'pointer',
                  position: 'relative',
                }
              }}
            >
              {tab.label}
            </NavLink>
          ))}
        </div>

        {/* Right: status */}
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 12, color: T.textMuted, fontVariantNumeric: 'tabular-nums' }}>
            CHF Monitor v0.1
          </span>
        </div>
      </nav>

      <main style={{
        padding: '36px 40px',
        maxWidth: 1100,
        margin: '0 auto',
        animation: 'fade-in 0.2s ease-out',
      }}>
        <Routes>
          <Route path="/clinician" element={<ClinicianDashboard />} />
          <Route path="/clinician/brief/:id" element={<BriefView />} />
          <Route path="/patient/:id" element={<PatientDashboard />} />
          <Route path="/dev" element={<DevDashboard />} />
          <Route path="/" element={<Navigate to="/clinician" replace />} />
        </Routes>
      </main>
    </div>
  )
}
