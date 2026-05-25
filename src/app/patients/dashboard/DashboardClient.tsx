'use client'
import { useState, useEffect, useRef } from 'react'
import { useUser, useClerk }           from '@clerk/nextjs'
import { useQuery }                    from 'convex/react'
import { api }                         from '../../../../convex/_generated/api'
import { useRouter }                   from 'next/navigation'

// ── Confetti burst — explosion from screen centre ─────────────────────────────
const CONFETTI_COLORS = ['#29869f','#29a8cc','#2f9e72','#d97d2c','#8b5cf6','#ec4899','#f59e0b','#fff']
function ConfettiBurst({ onDone }: { onDone: () => void }) {
  useEffect(() => {
    const t = setTimeout(onDone, 3800)
    return () => clearTimeout(t)
  }, [onDone])
  const pieces = Array.from({ length: 110 }, (_, i) => {
    const angle  = Math.random() * 360               // degrees
    const dist   = 28 + Math.random() * 46           // % of viewport
    const rad    = (angle * Math.PI) / 180
    const tx     = Math.cos(rad) * dist              // vw
    const ty     = Math.sin(rad) * dist              // vh — positive = down
    return {
      id: i,
      color: CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)],
      size:  5 + Math.random() * 8,
      dur:   0.9 + Math.random() * 1.4,
      del:   Math.random() * 0.25,
      rot:   Math.random() * 900 - 450,
      tx, ty,
      round: Math.random() > 0.45,
    }
  })
  return (
    <>
      <style>{`
        @keyframes cf-burst {
          0%   { transform: translate(0,0) rotate(0deg) scale(1); opacity:1; }
          60%  { opacity: 1; }
          100% { transform: translate(var(--ctx),var(--cty)) rotate(var(--cfr)) scale(0.4); opacity:0; }
        }
      `}</style>
      <div style={{ position:'fixed', inset:0, pointerEvents:'none', zIndex:9999, overflow:'hidden' }}>
        {pieces.map(p => (
          <div key={p.id} style={{
            position: 'absolute',
            left: '50vw', top: '45vh',
            width: p.size, height: p.size,
            background: p.color,
            borderRadius: p.round ? '50%' : '2px',
            ['--ctx' as string]: `${p.tx}vw`,
            ['--cty' as string]: `${p.ty}vh`,
            ['--cfr' as string]: `${p.rot}deg`,
            animation: `cf-burst ${p.dur}s ${p.del}s cubic-bezier(.2,.8,.4,1) forwards`,
          }} />
        ))}
      </div>
    </>
  )
}

export default function DashboardClient() {
  const { user, isLoaded }  = useUser()
  const { signOut }         = useClerk()
  const router              = useRouter()
  const patient             = useQuery(api.patients.getMyPatient)

  // ── UI state ──────────────────────────────────────────────────────────────
  const [sbCollapsed,   setSbCollapsed]   = useState(false)
  const [sbOpen,        setSbOpen]        = useState(false)
  const [profileOpen,   setProfileOpen]   = useState(false)
  const [mobProfileOpen,setMobProfileOpen]= useState(false)
  const [notifOpen,     setNotifOpen]     = useState(false)
  const [logoutOpen,    setLogoutOpen]    = useState(false)
  const [wallOpen,      setWallOpen]      = useState(false)
  const [wallMode,      setWallMode]      = useState<'wallet' | 'email'>('wallet')
  const [emailSent,     setEmailSent]     = useState(false)
  const [linkCopied,    setLinkCopied]    = useState(false)
  const [clinicEmail,   setClinicEmail]   = useState('')
  const [showConfetti,  setShowConfetti]  = useState(false)

  const sbBotRef        = useRef<HTMLDivElement>(null)
  const mobProfileRef   = useRef<HTMLDivElement>(null)

  // Close dropdowns when clicking outside
  useEffect(() => {
    function handle(e: MouseEvent) {
      const t = e.target as HTMLElement
      if (sbBotRef.current && !sbBotRef.current.contains(t)) setProfileOpen(false)
      if (mobProfileRef.current && !mobProfileRef.current.contains(t)) setMobProfileOpen(false)
    }
    document.addEventListener('mousedown', handle)
    return () => document.removeEventListener('mousedown', handle)
  }, [])

  // Escape key closes modals/drawers
  useEffect(() => {
    function handle(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        setLogoutOpen(false); setWallOpen(false); setNotifOpen(false)
      }
    }
    document.addEventListener('keydown', handle)
    return () => document.removeEventListener('keydown', handle)
  }, [])

  // Redirect to registration if no patient record
  useEffect(() => {
    if (patient === null) router.replace('/patients/register')
  }, [patient, router])

  // Confetti on first visit after registration
  useEffect(() => {
    if (patient && typeof sessionStorage !== 'undefined') {
      const flag = sessionStorage.getItem('iid_just_registered')
      if (flag) {
        sessionStorage.removeItem('iid_just_registered')
        setShowConfetti(true)
      }
    }
  }, [patient])

  // ── Loading / redirect states ─────────────────────────────────────────────
  if (!isLoaded || patient === undefined) {
    return <div style={{ minHeight: '100vh', background: 'var(--bg)' }} />
  }
  if (patient === null) return null // redirecting

  // ── Derived data ──────────────────────────────────────────────────────────
  const firstName   = patient.firstName
  const lastName    = patient.lastName
  const fullName    = `${firstName} ${lastName}`
  const initials    = `${firstName[0] ?? ''}${lastName[0] ?? ''}`.toUpperCase()
  const iidCode     = patient.implantIdCode
  const isPending   = !patient.verificationStatus || patient.verificationStatus === 'pending'
  const passUrl     = `${typeof window !== 'undefined' ? window.location.origin : 'https://implantid.io'}/pass/${iidCode}`

  function doSignOut() {
    setLogoutOpen(false)
    signOut({ redirectUrl: '/login' })
  }

  function copyLink() {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(passUrl)
    }
    setLinkCopied(true)
    setTimeout(() => setLinkCopied(false), 1800)
  }

  const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']

  return (
    <>
      {showConfetti && <ConfettiBurst onDone={() => setShowConfetti(false)} />}

      {/* ── Pending verification banner ───────────────────────────────────── */}
      {isPending && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, zIndex: 200,
          background: 'linear-gradient(90deg,#b45309,#d97706)',
          color: '#fff',
          padding: '10px 20px',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
          fontFamily: 'var(--ff)', fontSize: 13.5, fontWeight: 500, lineHeight: 1.4,
          boxShadow: '0 2px 12px rgba(180,83,9,.35)',
        }}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ flexShrink: 0 }}>
            <circle cx="12" cy="12" r="10"/><path d="M12 8v4M12 16h.01"/>
          </svg>
          Your implant record is currently pending. A clinician will confirm your records before you can use your Implant ID.
        </div>
      )}

      {/* Mobile sidebar overlay */}
      <div
        className={`sb-back${sbOpen ? ' open' : ''}`}
        onClick={() => setSbOpen(false)}
      />

      <div className={`app${sbCollapsed ? ' collapsed' : ''}`} style={isPending ? { paddingTop: 42 } : undefined}>

        {/* ── Sidebar ──────────────────────────────────────────────────────── */}
        <aside className={`sidebar${sbOpen ? ' open' : ''}`}>

          {/* Logo + collapse toggle */}
          <div className="sb-logo">
            <a href="/" className="logo">
              <img src="/icon.svg" alt="" />
              <span className="logo-text"><b>Implant</b><span>ID</span></span>
            </a>
            <button
              className="sb-toggle"
              aria-label="Collapse sidebar"
              onClick={() => setSbCollapsed(v => !v)}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="15 18 9 12 15 6"/>
              </svg>
            </button>
          </div>

          {/* Nav */}
          <span className="sb-section">My record</span>
          <a className="sb-link active" href="/patients/dashboard" title="My record">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
              <rect x="3" y="3" width="7" height="9" rx="1.5"/>
              <rect x="14" y="3" width="7" height="5" rx="1.5"/>
              <rect x="14" y="12" width="7" height="9" rx="1.5"/>
              <rect x="3" y="16" width="7" height="5" rx="1.5"/>
            </svg>
            <span>My record</span>
          </a>
          <a className="sb-link" href="/patients/share" title="Share with clinic">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
              <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/>
              <path d="M16 6l-4-4-4 4M12 2v13"/>
            </svg>
            <span>Share with clinic</span>
          </a>
          <a className="sb-link" href="#" title="Documents &amp; manuals">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
              <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20M4 19.5A2.5 2.5 0 0 0 6.5 22H20V2H6.5A2.5 2.5 0 0 0 4 4.5v15z"/>
            </svg>
            <span>Documents &amp; manuals</span>
          </a>

          <span className="sb-section">Find care</span>
          <a className="sb-link" href="/patients/find-care" title="Find a clinic">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
              <circle cx="12" cy="10" r="3"/>
            </svg>
            <span>Find a clinic</span>
          </a>

          <span className="sb-section">Account</span>
          <a className="sb-link" href="/patients/account" title="Account settings">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
              <circle cx="12" cy="12" r="3"/>
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33h0a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51h0a1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82v0a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
            </svg>
            <span>Account settings</span>
          </a>

          {/* Notifications button */}
          <button
            className="sb-notif"
            aria-label="Notifications"
            title="Notifications"
            onClick={(e) => { e.stopPropagation(); setNotifOpen(true) }}
          >
            <span className="sb-notif-ic">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
                <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
              </svg>
              <span className="dot" />
            </span>
            <span className="label">Notifications</span>
            <span className="count">2</span>
          </button>

          {/* Profile bottom */}
          <div
            ref={sbBotRef}
            className="sb-bot"
            onClick={() => setProfileOpen(v => !v)}
          >
            <div className="av" style={{ background: 'var(--accent)', color: '#fff', fontFamily: 'var(--ff)', fontSize: 13, fontWeight: 600 }}>
              {initials}
            </div>
            <div>
              <div className="name">{fullName}</div>
              <div className="role">Patient</div>
            </div>
            <span className="chev">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="18 15 12 9 6 15"/>
              </svg>
            </span>
          </div>

          {/* Profile dropdown */}
          <div className={`profile-menu${profileOpen ? ' open' : ''}`}>
            <a href="/patients/account">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
                <circle cx="12" cy="7" r="4"/>
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
              </svg>
              My account
            </a>
            <a href="#">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
                <circle cx="12" cy="12" r="9"/>
                <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3M12 17h.01"/>
              </svg>
              Help &amp; docs
            </a>
            <hr />
            <button className="danger" onClick={() => { setProfileOpen(false); setLogoutOpen(true) }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
                <polyline points="16 17 21 12 16 7"/>
                <line x1="21" y1="12" x2="9" y2="12"/>
              </svg>
              Sign out
            </button>
          </div>

        </aside>{/* /sidebar */}

        {/* ── App main ─────────────────────────────────────────────────────── */}
        <div className="app-main">

          {/* Mobile top header */}
          <div className="mob-header">
            <a href="/patients/dashboard" className="mob-header-logo">
              <img src="/icon.svg" alt="" />
              <span className="logo-text"><b>Implant</b><span>ID</span></span>
            </a>
            <div ref={mobProfileRef} className="mob-hdr-profile">
              <button
                className="mob-hdr-av"
                aria-label="Profile menu"
                onClick={() => setMobProfileOpen(v => !v)}
              >
                {initials}
              </button>
              <div className={`mob-hdr-menu${mobProfileOpen ? ' open' : ''}`}>
                <div className="mob-hdr-info">
                  <strong>{fullName}</strong>
                  <span>Patient · {iidCode}</span>
                </div>
                <hr />
                <a href="/patients/account">My account</a>
                <a href="#">Help &amp; docs</a>
                <button className="danger" onClick={() => { setMobProfileOpen(false); setLogoutOpen(true) }}>
                  Sign out
                </button>
              </div>
            </div>
          </div>

          {/* ── Page content ─────────────────────────────────────────────── */}
          <div className="pt-wrap">

            {/* Patient header */}
            <div className="pt-header">
              <div className="pt-av" style={{
                background: 'var(--accent)',
                color: '#fff',
                display: 'grid',
                placeItems: 'center',
                fontFamily: 'var(--ff)',
                fontSize: 28,
                fontWeight: 600,
              }}>
                {initials}
              </div>
              <div>
                <div className="ey">Your implant record</div>
                <h1 style={{ marginTop: 8 }}>Hi {firstName}</h1>
                <p className="sub">Everything about your implant, in one place. Share it at any clinic with one tap.</p>
              </div>
            </div>

            {/* ── Implant pass card ─────────────────────────────────────── */}
            <div
              className="pass-big"
              style={isPending ? { filter: 'grayscale(0.55) brightness(0.82)', position: 'relative' } : undefined}
            >
              <div className="pb-top">
                <div className="pb-brand">
                  <img src="/icon.svg" alt="" />
                  Implant ID
                </div>
                <div style={{ fontFamily:'var(--ff)', fontSize:11, letterSpacing:'1.6px', textTransform:'uppercase', opacity:.75 }}>
                  Medical · Implant Record
                </div>
              </div>

              {/* Pending badge with tooltip */}
              {isPending && (
                <div style={{ position: 'relative', display: 'inline-block', marginBottom: 14 }} className="pending-badge-wrap">
                  <div style={{
                    display: 'inline-flex', alignItems: 'center', gap: 6,
                    background: 'rgba(255,255,255,.15)', border: '1px solid rgba(255,255,255,.3)',
                    borderRadius: 999, padding: '5px 12px',
                    fontFamily: 'var(--ff)', fontSize: 11.5, fontWeight: 600,
                    letterSpacing: '.5px', color: '#fff', position: 'relative', zIndex: 2,
                    cursor: 'default',
                  }}>
                    <span style={{
                      width: 7, height: 7, borderRadius: '50%', background: '#fbbf24',
                      boxShadow: '0 0 8px #fbbf24', flexShrink: 0,
                      animation: 'pending-pulse 2s ease-in-out infinite',
                    }}/>
                    Pending verification
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ opacity:.7 }}>
                      <circle cx="12" cy="12" r="10"/><path d="M12 8v4M12 16h.01"/>
                    </svg>
                  </div>
                  <div className="pending-tooltip">
                    Your implant details are being verified by your clinical team.
                    Once confirmed, your wallet pass and sharing features will be unlocked.
                  </div>
                </div>
              )}

              {/* Self-reported device or placeholder */}
              <div className={`pb-status${isPending ? ' pb-status--pending' : ''}`} style={{ opacity: isPending ? .75 : 1 }}>
                {patient.selfReportedDeviceType ?? 'No device type recorded'}
              </div>
              <div className="pb-name" style={{ fontSize: patient.selfReportedDevice ? 26 : 20, opacity: isPending ? .85 : 1 }}>
                {patient.selfReportedDevice ?? 'Awaiting verification'}
              </div>
              {isPending && (
                <p style={{ fontFamily:'var(--ff)', fontSize:12.5, opacity:.75, marginBottom:18, position:'relative', zIndex:2, lineHeight:1.5 }}>
                  Your clinical team will verify these details with your hospital. Once confirmed, your wallet pass will be activated.
                </p>
              )}

              <div className="pb-grid" style={{ gridTemplateColumns: 'repeat(3,1fr)' }}>
                <div>
                  <div className="k">Your Implant ID</div>
                  <div className="v">{iidCode}</div>
                </div>
                <div>
                  <div className="k">Name</div>
                  <div className="v">{fullName}</div>
                </div>
                {patient.selfReportedImplantYear && (
                  <div>
                    <div className="k">Implanted</div>
                    <div className="v">
                      {patient.selfReportedImplantMonth
                        ? `${MONTHS[parseInt(patient.selfReportedImplantMonth)-1]?.slice(0,3)} ${patient.selfReportedImplantYear}`
                        : patient.selfReportedImplantYear}
                    </div>
                  </div>
                )}
              </div>

              {/* Actions — hidden when pending */}
              {!isPending && (
                <div className="pb-actions" style={{ marginTop: 20 }}>
                  <button
                    className="btn btn-s"
                    onClick={() => setWallOpen(true)}
                  >
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                      <rect x="3" y="6" width="18" height="14" rx="2"/><path d="M3 10h18M7 15h3"/>
                    </svg>
                    Add to Wallet
                  </button>
                  <button
                    className="btn"
                    onClick={() => setWallOpen(true)}
                  >
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                      <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/>
                      <path d="M16 6l-4-4-4 4M12 2v13"/>
                    </svg>
                    Share with clinic
                  </button>
                </div>
              )}
            </div>

            {/* Quick access */}
            <div className="sec">
              <h2>Quick access</h2>
              <div className="q-grid">
                <a href="/patients/find-care" className="q">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
                    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
                    <circle cx="12" cy="10" r="3"/>
                  </svg>
                  <b>Find a clinic</b>
                  <p>Search the Implant ID network for clinics near you.</p>
                </a>
                <a href="#" className="q">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
                    <path d="M22 16.9A16 16 0 0 1 5.1 2 2 2 0 0 1 7.1 0h3a2 2 0 0 1 2 1.7c.1.9.3 1.8.6 2.7a2 2 0 0 1-.5 2L11 7.6a16 16 0 0 0 6 6l1.2-1.2a2 2 0 0 1 2-.5c.9.3 1.8.5 2.7.6A2 2 0 0 1 22 16.9z"/>
                  </svg>
                  <b>Emergency info</b>
                  <p>A one-tap view of everything a paramedic needs to know.</p>
                </a>
                <a href="#" className="q">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
                    <rect x="3" y="4" width="18" height="16" rx="2"/>
                    <path d="M8 2v4M16 2v4M3 10h18"/>
                  </svg>
                  <b>Upcoming appointments</b>
                  <p>Appointments your clinic has scheduled for you.</p>
                </a>
              </div>
            </div>

            {/* Documents placeholder */}
            <div className="sec">
              <h2>Your manuals &amp; safety sheets</h2>
              <p className="sub">Documents will appear here once your clinical team adds your implant details.</p>
              <div style={{
                background: 'var(--bg2)',
                border: '1px dashed var(--border2)',
                borderRadius: 14,
                padding: '32px 24px',
                textAlign: 'center',
                color: 'var(--muted2)',
                fontFamily: 'var(--ff)',
                fontSize: 14,
              }}>
                <svg style={{ width: 32, height: 32, margin: '0 auto 12px', opacity: .4 }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                  <path d="M14 2v6h6"/>
                </svg>
                No documents yet
              </div>
            </div>

            {/* History placeholder */}
            <div className="sec">
              <h2>Your history</h2>
              <div className="card" style={{ padding: '24px', textAlign: 'center', color: 'var(--muted2)', fontFamily: 'var(--ff)', fontSize: 14 }}>
                <svg style={{ width: 28, height: 28, margin: '0 auto 10px', opacity: .4 }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <circle cx="12" cy="12" r="10"/>
                  <polyline points="12 6 12 12 16 14"/>
                </svg>
                Events will appear here as your record builds up.
              </div>
            </div>

          </div>{/* /pt-wrap */}

          {/* Mobile bottom navigation */}
          <nav className="mob-nav" aria-label="Mobile navigation">
            <div className="mob-nav-tabs">
              <a href="/patients/dashboard" className="mob-nav-tab active" aria-label="My record">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
                  <rect x="3" y="3" width="7" height="9" rx="1.5"/>
                  <rect x="14" y="3" width="7" height="5" rx="1.5"/>
                  <rect x="14" y="12" width="7" height="9" rx="1.5"/>
                  <rect x="3" y="16" width="7" height="5" rx="1.5"/>
                </svg>
                <span className="t">Record</span>
              </a>
              <a href="/patients/share" className="mob-nav-tab" aria-label="Share with clinic">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
                  <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/>
                  <path d="M16 6l-4-4-4 4M12 2v13"/>
                </svg>
                <span className="t">Share</span>
              </a>
              <a href="/patients/find-care" className="mob-nav-tab" aria-label="Find a clinic">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
                  <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
                  <circle cx="12" cy="10" r="3"/>
                </svg>
                <span className="t">Find</span>
              </a>
              <a href="/patients/account" className="mob-nav-tab" aria-label="Account">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
                  <circle cx="12" cy="7" r="4"/>
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                </svg>
                <span className="t">Account</span>
              </a>
              <button
                className="mob-nav-tab mob-nav-menu-btn"
                aria-label="Toggle menu"
                onClick={() => setSbOpen(v => !v)}
              >
                <div className="ham-ic">
                  <span/><span/><span/>
                </div>
                <span className="t">Menu</span>
              </button>
            </div>
          </nav>

        </div>{/* /app-main */}
      </div>{/* /app */}

      {/* ── Wallet / share modal ───────────────────────────────────────────── */}
      <div
        className={`wall-back${wallOpen ? ' open' : ''}`}
        onClick={e => { if (e.target === e.currentTarget) setWallOpen(false) }}
      >
        <div className="wall-modal">
          <div className="wall-h">
            <h3>{wallMode === 'email' ? 'Email your record to the clinic' : 'Share your implant record'}</h3>
            <button onClick={() => setWallOpen(false)}>✕</button>
          </div>
          <div className="wall-body">
            {/* Mode switcher */}
            <div style={{
              display: 'flex', gap: 4,
              background: 'var(--bg)', border: '1px solid var(--border)',
              borderRadius: 999, padding: 4, margin: '0 auto 20px', width: 'fit-content',
            }}>
              <button
                className={`wtab${wallMode === 'wallet' ? ' active' : ''}`}
                onClick={() => setWallMode('wallet')}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" style={{ verticalAlign: -2, marginRight: 4 }}>
                  <rect x="5" y="2" width="14" height="20" rx="2"/>
                  <circle cx="12" cy="18" r="1"/>
                </svg>
                Apple Wallet
              </button>
              <button
                className={`wtab${wallMode === 'email' ? ' active' : ''}`}
                onClick={() => setWallMode('email')}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" style={{ verticalAlign: -2, marginRight: 4 }}>
                  <path d="M4 4h16a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z"/>
                  <path d="m22 6-10 7L2 6"/>
                </svg>
                Email the clinic
              </button>
            </div>

            {wallMode === 'wallet' && (
              <>
                <p>Scan this QR code with your phone camera to add the pass to <b>Apple Wallet</b> or <b>Google Wallet</b>.</p>
                <div className="wall-qr">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    alt="QR code for your Implant ID pass"
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=400x400&margin=10&data=${encodeURIComponent(passUrl)}`}
                    width={200} height={200}
                    style={{ display: 'block', width: '100%', height: '100%', imageRendering: 'pixelated' }}
                  />
                </div>
                <div className="wall-opts">
                  <a
                    href={`${passUrl}.pkpass`}
                    className="btn btn-s btn-lg"
                  >
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M17.05 12.04c-.02-1.92 1.57-2.85 1.64-2.9-.9-1.3-2.29-1.49-2.78-1.5-1.17-.12-2.3.7-2.9.7-.6 0-1.53-.68-2.52-.66-1.28.02-2.47.75-3.14 1.9-1.36 2.34-.34 5.8.97 7.7.65.94 1.41 1.98 2.4 1.94.97-.04 1.33-.62 2.5-.62s1.5.62 2.53.6c1.04-.02 1.7-.94 2.34-1.88.74-1.08 1.04-2.13 1.05-2.18-.02-.01-2.02-.77-2.05-3.07zM15.1 5.43c.53-.64.88-1.54.78-2.43-.76.03-1.68.5-2.23 1.14-.49.56-.92 1.48-.8 2.35.85.07 1.72-.43 2.25-1.06z"/>
                    </svg>
                    Apple Wallet
                  </a>
                  <a href="#" className="btn btn-lg">
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
                      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.15-4.53H2.18v2.84A10.99 10.99 0 0 0 12 23z"/>
                      <path fill="#FBBC05" d="M5.85 14.1A6.61 6.61 0 0 1 5.5 12c0-.73.13-1.44.35-2.1V7.07H2.18a11 11 0 0 0 0 9.86l3.67-2.83z"/>
                      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.2 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1A10.99 10.99 0 0 0 2.18 7.07l3.67 2.83C6.71 7.31 9.14 5.38 12 5.38z"/>
                    </svg>
                    Google Wallet
                  </a>
                </div>
                <button className="btn btn-lg" style={{ marginTop: 10 }} onClick={copyLink}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                    <rect x="9" y="9" width="13" height="13" rx="2"/>
                    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
                  </svg>
                  {linkCopied ? '✓ Link copied' : 'Copy share link'}
                </button>
              </>
            )}

            {wallMode === 'email' && !emailSent && (
              <form onSubmit={e => { e.preventDefault(); setEmailSent(true) }}>
                <p>Send a copy of your implant record to any clinic. They'll receive it securely.</p>
                <div className="field">
                  <label>Clinic email</label>
                  <input className="input" type="email" placeholder="records@clinic.com" required
                    value={clinicEmail} onChange={e => setClinicEmail(e.target.value)} />
                </div>
                <div style={{ display: 'flex', gap: 10 }}>
                  <button type="submit" className="btn btn-s btn-lg" style={{ flex: 1 }}>
                    Send to clinic
                  </button>
                  <button type="button" className="btn btn-lg" onClick={() => setWallOpen(false)}>Cancel</button>
                </div>
              </form>
            )}

            {wallMode === 'email' && emailSent && (
              <div style={{ textAlign: 'center', padding: '20px 0' }}>
                <div style={{
                  width: 52, height: 52, borderRadius: '50%',
                  background: 'color-mix(in srgb,var(--ok) 12%,transparent)',
                  color: 'var(--ok)', display: 'grid', placeItems: 'center', margin: '0 auto 14px',
                }}>
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M20 6 9 17l-5-5"/>
                  </svg>
                </div>
                <h3 style={{ fontFamily: 'var(--ff)', fontSize: 18, marginBottom: 8 }}>Sent!</h3>
                <p style={{ color: 'var(--muted)', fontSize: 14, marginBottom: 20 }}>
                  Your implant record has been sent to {clinicEmail}.
                </p>
                <button className="btn btn-lg" onClick={() => { setWallOpen(false); setEmailSent(false); setClinicEmail('') }}>Done</button>
              </div>
            )}
          </div>
          <div className="wall-foot">Encrypted · Signed · Safe to share with any clinic</div>
        </div>
      </div>

      {/* ── Notification drawer ────────────────────────────────────────────── */}
      <div className={`notif-back${notifOpen ? ' open' : ''}`} onClick={() => setNotifOpen(false)} />
      <aside className={`notif-drawer${notifOpen ? ' open' : ''}`} aria-label="Notifications">
        <div className="notif-h">
          <h3>Updates</h3>
          <button className="x" onClick={() => setNotifOpen(false)}>✕</button>
        </div>
        <div className="notif-list">
          <div className="notif-item unread">
            <div className="notif-ic ok">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                <path d="m9 12 2 2 4-4"/>
              </svg>
            </div>
            <div>
              <b>Welcome to Implant ID</b>
              <p>Your patient record is set up and your unique ID is ready. Add your implant details when your clinical team is ready.</p>
              <div className="t">Just now · Implant ID</div>
            </div>
          </div>
          <div className="notif-item unread">
            <div className="notif-ic">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
                <rect x="3" y="6" width="18" height="14" rx="2"/>
                <path d="M3 10h18M7 15h3"/>
              </svg>
            </div>
            <div>
              <b>Tip: share before appointments</b>
              <p>Sharing your Implant ID with a clinic before you arrive means they can prepare your safety profile in advance.</p>
              <div className="t">Today · Implant ID</div>
            </div>
          </div>
        </div>
        <div className="notif-foot">
          <a href="#">Mark all as read</a>
          <a href="#">Settings</a>
        </div>
      </aside>

      {/* ── Logout modal ───────────────────────────────────────────────────── */}
      <div
        className={`logout-back${logoutOpen ? ' open' : ''}`}
        onClick={e => { if (e.target === e.currentTarget) setLogoutOpen(false) }}
      >
        <div className="logout-modal">
          <div className="logout-body">
            <div className="logout-ic">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
                <polyline points="16 17 21 12 16 7"/>
                <line x1="21" y1="12" x2="9" y2="12"/>
              </svg>
            </div>
            <h3>Log out of Implant ID?</h3>
            <p>You'll need to sign back in to access your implant record and wallet pass. Your data stays safe either way.</p>
          </div>
          <div className="logout-actions">
            <button className="btn btn-lg" onClick={() => setLogoutOpen(false)}>← Back</button>
            <button className="btn btn-danger btn-lg" onClick={doSignOut}>Yes, log out</button>
          </div>
        </div>
      </div>

      <style>{`
        .wtab{background:transparent;border:0;font-family:var(--ff);font-size:12.5px;font-weight:500;color:var(--muted);padding:8px 14px;border-radius:999px;cursor:pointer;transition:all .15s}
        .wtab.active{background:var(--text);color:var(--bg)}
        @keyframes pending-pulse{0%,100%{opacity:1;box-shadow:0 0 8px #fbbf24}50%{opacity:.5;box-shadow:0 0 2px #fbbf24}}
        /* Hide green status dot when pending */
        .pb-status--pending::before{display:none !important}
        /* Pending tooltip */
        .pending-badge-wrap{position:relative}
        .pending-tooltip{
          display:none;position:absolute;bottom:calc(100% + 8px);left:50%;transform:translateX(-50%);
          background:rgba(0,0,0,.85);color:#fff;font-family:var(--ff);font-size:12px;line-height:1.5;
          padding:8px 12px;border-radius:8px;width:230px;text-align:center;
          white-space:normal;pointer-events:none;z-index:100;
          box-shadow:0 4px 16px rgba(0,0,0,.25);
        }
        .pending-tooltip::after{
          content:"";position:absolute;top:100%;left:50%;transform:translateX(-50%);
          border:6px solid transparent;border-top-color:rgba(0,0,0,.85);
        }
        .pending-badge-wrap:hover .pending-tooltip{display:block}
      `}</style>
    </>
  )
}
