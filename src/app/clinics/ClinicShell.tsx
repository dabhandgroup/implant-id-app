'use client'

import { useState, useEffect } from 'react'
import { useClerk, useUser }         from '@clerk/nextjs'
import { usePathname, useRouter }    from 'next/navigation'
import { useQuery, useMutation }     from 'convex/react'
import { api as apiBase }            from '../../../convex/_generated/api'
import Link                          from 'next/link'
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const api = apiBase as any

// ── Page title ───────────────────────────────────────────────────────────────

function pageTitleFromPathname(pathname: string): string {
  if (pathname.startsWith('/clinics/all-patients'))  return 'Patients'
  if (pathname.startsWith('/clinics/pending'))        return 'Pending Access'
  if (pathname.startsWith('/clinics/scan-patient'))   return 'Scan Patient'
  if (pathname.startsWith('/clinics/add-patient'))    return 'Add Patient'
  if (pathname.startsWith('/clinics/patient-view'))   return 'Patient Record'
  if (pathname.startsWith('/clinics/patient/'))       return 'Patient Record'
  if (pathname.startsWith('/clinics/library'))        return 'Device Library'
  if (pathname.startsWith('/clinics/manufacturers'))  return 'Manufacturers'
  if (pathname.startsWith('/clinics/staff'))          return 'Team'
  if (pathname.startsWith('/clinics/settings'))       return 'Settings'
  if (pathname.startsWith('/clinics/audit'))          return 'Audit Log'
  return 'Dashboard'
}

function initials(name: string): string {
  return name.trim().split(/\s+/).slice(0, 2).map(w => w[0]?.toUpperCase() ?? '').join('')
}

function timeAgo(ts: number): string {
  const diff  = Date.now() - ts
  const mins  = Math.floor(diff / 60_000)
  const hours = Math.floor(diff / 3_600_000)
  const days  = Math.floor(diff / 86_400_000)
  if (mins  < 1)  return 'just now'
  if (mins  < 60) return `${mins}m ago`
  if (hours < 24) return `${hours}h ago`
  if (days  < 7)  return `${days}d ago`
  return new Date(ts).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })
}

// ── Icons ─────────────────────────────────────────────────────────────────────

const IconOverview  = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>
const IconPatients  = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/></svg>
const IconScan      = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"><rect x="2" y="2" width="7" height="7" rx="1"/><rect x="15" y="2" width="7" height="7" rx="1"/><rect x="2" y="15" width="7" height="7" rx="1"/><path d="M15 15h2M15 19h2M19 15h2M19 19h2"/></svg>
const IconAdd       = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"><circle cx="12" cy="12" r="9"/><path d="M12 8v8M8 12h8"/></svg>
const IconClock     = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>
const IconLibrary   = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>
const IconMfr       = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"><path d="M2 20h20M4 20V10l8-6 8 6v10"/><rect x="9" y="14" width="6" height="6"/></svg>
const IconTeam      = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/></svg>
const IconGear      = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
const IconBell      = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
const IconOut       = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
const IconChevL     = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15 18 9 12 15 6"/></svg>
const IconChevU     = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="18 15 12 9 6 15"/></svg>
const IconUser      = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"><circle cx="12" cy="7" r="4"/><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/></svg>
const IconHelp      = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"><circle cx="12" cy="12" r="9"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3M12 17h.01"/></svg>
const IconHamburg   = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
const IconPending   = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>

// ── Pending / Rejected gates ──────────────────────────────────────────────────

function LoadingScreen() {
  return (
    <div style={{ minHeight:'100vh', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', background:'var(--bg)', fontFamily:'var(--ff)' }}>
      <Link href="/" style={{ textDecoration:'none', marginBottom:32 }}>
        <div style={{ display:'flex', alignItems:'center', gap:10, color:'var(--text)', fontSize:18, fontWeight:600, letterSpacing:'-.02em' }}>
          <div style={{ width:32, height:32, borderRadius:8, background:'var(--accent)', display:'flex', alignItems:'center', justifyContent:'center' }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>
          </div>
          Implant ID
        </div>
      </Link>
      <div style={{ color:'var(--muted)', fontSize:14 }}>Loading your account…</div>
    </div>
  )
}

function SimpleBar({ onSignOut }: { onSignOut: () => void }) {
  return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'14px 32px', background:'var(--bg2)', borderBottom:'1px solid var(--border)' }}>
      <Link href="/" style={{ textDecoration:'none', display:'flex', alignItems:'center', gap:10 }}>
        <div style={{ width:28, height:28, borderRadius:7, background:'var(--accent)', display:'flex', alignItems:'center', justifyContent:'center' }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>
        </div>
        <span style={{ fontWeight:600, color:'var(--text)', fontSize:16, letterSpacing:'-.02em' }}>Implant ID</span>
      </Link>
      <button onClick={onSignOut} style={{ background:'transparent', border:0, color:'var(--muted)', fontFamily:'var(--ff)', fontSize:13, cursor:'pointer', padding:'4px 8px' }}>
        Sign out
      </button>
    </div>
  )
}

type Application = { _id: string; facilityName: string; contactEmail: string; status: 'pending' | 'approved' | 'rejected'; submittedAt: number; reviewNotes?: string }

function PendingScreen({ app, onSignOut }: { app: Application; onSignOut: () => void }) {
  return (
    <div style={{ minHeight:'100vh', background:'var(--bg)', fontFamily:'var(--ff)', display:'flex', flexDirection:'column' }}>
      <SimpleBar onSignOut={onSignOut} />
      <div style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', padding:'48px 24px' }}>
        <div style={{ maxWidth:520, width:'100%' }}>
          <div style={{ display:'inline-flex', alignItems:'center', gap:6, background:'color-mix(in srgb,var(--warn) 12%,transparent)', color:'var(--warn)', fontSize:11, fontWeight:700, letterSpacing:'1.2px', textTransform:'uppercase', padding:'4px 10px', borderRadius:6, marginBottom:20 }}>
            <span style={{ width:6, height:6, borderRadius:'50%', background:'var(--warn)', display:'inline-block' }} />
            Awaiting Review
          </div>
          <h1 style={{ fontFamily:'var(--ff)', fontSize:28, fontWeight:600, letterSpacing:'-.025em', color:'var(--text)', margin:'0 0 12px' }}>
            Your application is being reviewed
          </h1>
          <p style={{ color:'var(--muted)', fontSize:15, lineHeight:1.65, margin:'0 0 28px' }}>
            We&rsquo;ve received your application for <strong style={{ color:'var(--text)', fontWeight:600 }}>{app.facilityName}</strong>. Our team reviews all applications within 2 working days.
          </p>
          <div style={{ background:'var(--bg2)', border:'1px solid var(--border)', borderRadius:14, padding:'20px 22px', marginBottom:28 }}>
            <div style={{ fontSize:11, fontWeight:600, letterSpacing:'1.2px', textTransform:'uppercase', color:'var(--muted2)', marginBottom:14 }}>Application Summary</div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14 }}>
              {[['Facility', app.facilityName], ['Contact', app.contactEmail], ['Submitted', new Date(app.submittedAt).toLocaleDateString('en-GB',{day:'2-digit',month:'short',year:'numeric'})], ['Status', 'Under review']].map(([l,v]) => (
                <div key={l}><div style={{ fontSize:11, fontWeight:600, letterSpacing:'1px', textTransform:'uppercase', color:'var(--muted2)', marginBottom:4 }}>{l}</div><div style={{ fontSize:14, color:'var(--text)' }}>{v}</div></div>
              ))}
            </div>
          </div>
          <div style={{ color:'var(--muted)', fontSize:14, marginBottom:12 }}>While you wait, you can browse our device library.</div>
          <Link href="/clinics/library" className="btn btn-s">Browse Device Library</Link>
        </div>
      </div>
    </div>
  )
}

function RejectedScreen({ app, onSignOut }: { app: Application; onSignOut: () => void }) {
  return (
    <div style={{ minHeight:'100vh', background:'var(--bg)', fontFamily:'var(--ff)', display:'flex', flexDirection:'column' }}>
      <SimpleBar onSignOut={onSignOut} />
      <div style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', padding:'48px 24px' }}>
        <div style={{ maxWidth:520, width:'100%' }}>
          <div style={{ display:'inline-flex', alignItems:'center', gap:6, background:'color-mix(in srgb,var(--err) 12%,transparent)', color:'var(--err)', fontSize:11, fontWeight:700, letterSpacing:'1.2px', textTransform:'uppercase', padding:'4px 10px', borderRadius:6, marginBottom:20 }}>
            <span style={{ width:6, height:6, borderRadius:'50%', background:'var(--err)', display:'inline-block' }} />
            Not Approved
          </div>
          <h1 style={{ fontFamily:'var(--ff)', fontSize:28, fontWeight:600, letterSpacing:'-.025em', color:'var(--text)', margin:'0 0 12px' }}>
            Application not approved
          </h1>
          <p style={{ color:'var(--muted)', fontSize:15, lineHeight:1.65, margin:'0 0 16px' }}>
            Unfortunately your application for <strong style={{ color:'var(--text)', fontWeight:600 }}>{app.facilityName}</strong> was not approved.
          </p>
          {app.reviewNotes && (
            <div style={{ background:'color-mix(in srgb,var(--err) 6%,transparent)', border:'1px solid color-mix(in srgb,var(--err) 20%,transparent)', borderRadius:10, padding:'14px 18px', marginBottom:16, color:'var(--text)', fontSize:14, lineHeight:1.55 }}>
              {app.reviewNotes}
            </div>
          )}
          <p style={{ color:'var(--muted)', fontSize:14, lineHeight:1.6, margin:'0 0 28px' }}>
            Please contact <a href="mailto:support@implantid.io" style={{ color:'var(--accent)', textDecoration:'none' }}>support@implantid.io</a> if you have any questions.
          </p>
          <button onClick={onSignOut} className="btn">Sign out</button>
        </div>
      </div>
    </div>
  )
}

// ── Main shell ─────────────────────────────────────────────────────────────────

export default function ClinicShell({ children }: { children: React.ReactNode }) {
  const { signOut }  = useClerk()
  const { user }     = useUser()
  const pathname     = usePathname()
  const router       = useRouter()

  // Gate queries
  const myApplication = useQuery(api.clinics.getMyApplication) as Application | null | undefined
  const myClinic      = useQuery(api.clinics.getMyClinic)

  // Notification queries
  const notifications = useQuery(api.patients.getMyNotifications)
  const markRead      = useMutation(api.patients.markAllNotificationsRead)

  // UI state
  const [collapsed,      setCollapsed]      = useState(false)
  const [mobOpen,        setMobOpen]        = useState(false)
  const [notifOpen,      setNotifOpen]      = useState(false)
  const [profileOpen,    setProfileOpen]    = useState(false)
  const [mobProfileOpen, setMobProfileOpen] = useState(false)
  const [signOutConfirm, setSignOutConfirm] = useState(false)
  const [signingOut,     setSigningOut]     = useState(false)

  const unreadCount = notifications?.filter((n: any) => !n.read).length ?? 0
  const userName    = user?.fullName ?? user?.firstName ?? 'Clinic User'
  const userInitials = initials(userName)
  const clinicName  = myClinic?.facilityName ?? 'Clinic Portal'
  const pageTitle   = pageTitleFromPathname(pathname)

  // Close profile menus on outside click
  useEffect(() => {
    function handleOutside() {
      setProfileOpen(false)
      setMobProfileOpen(false)
    }
    document.addEventListener('click', handleOutside)
    return () => document.removeEventListener('click', handleOutside)
  }, [])

  // Close mobile sidebar on route change
  useEffect(() => { setMobOpen(false) }, [pathname])

  // Close notif drawer on Escape
  useEffect(() => {
    if (!notifOpen) return
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') setNotifOpen(false) }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [notifOpen])

  function isActive(href: string) {
    if (href === '/clinics/dashboard') return pathname === '/clinics/dashboard'
    return pathname.startsWith(href)
  }

  async function handleSignOut() {
    setSigningOut(true)
    await signOut({ redirectUrl: '/login' })
  }

  function requestSignOut() {
    setSignOutConfirm(true)
    setProfileOpen(false)
    setMobProfileOpen(false)
  }

  function cancelSignOut() {
    setSignOutConfirm(false)
    setSigningOut(false)
  }

  async function handleMarkAllRead() {
    try { await markRead({}) } catch { /* silent */ }
  }

  // ── Gate: still loading ───────────────────────────────────────────────────
  if (myApplication === undefined || myClinic === undefined) {
    return <LoadingScreen />
  }

  // ── Gate: no application → redirect via useEffect in ClinicGate is no longer
  //    needed; show loading while the redirect fires via the server layout
  if (myApplication === null) {
    return <LoadingScreen />
  }

  // ── Gate: pending ─────────────────────────────────────────────────────────
  if (myApplication.status === 'pending') {
    return <PendingScreen app={myApplication} onSignOut={() => signOut({ redirectUrl: '/' })} />
  }

  // ── Gate: rejected ────────────────────────────────────────────────────────
  if (myApplication.status === 'rejected') {
    return <RejectedScreen app={myApplication} onSignOut={() => signOut({ redirectUrl: '/' })} />
  }

  // ── Approved: full shell ──────────────────────────────────────────────────
  return (
    <>
      {/* Mobile sidebar backdrop */}
      <div className={`sb-back${mobOpen ? ' open' : ''}`} onClick={() => setMobOpen(false)} />

      {/* App grid */}
      <div className={`app${collapsed ? ' collapsed' : ''}`}>

        {/* Sidebar */}
        <aside className={`sidebar${mobOpen ? ' open' : ''}`}>

          {/* Logo + collapse toggle */}
          <div className="sb-logo">
            <a href="/clinics/dashboard" className="logo">
              <img src="/icon.svg" alt="Implant ID" />
              <span className="logo-text"><b>Implant</b><span>ID</span></span>
            </a>
            <button className="sb-toggle" onClick={() => setCollapsed(c => !c)} aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}>
              <IconChevL />
            </button>
          </div>

          {/* Overview */}
          <a href="/clinics/dashboard" className={`sb-link${isActive('/clinics/dashboard') ? ' active' : ''}`}>
            <IconOverview /><span>Overview</span>
          </a>

          {/* ── PATIENTS ── */}
          <span className="sb-section">Patients</span>

          <a href="/clinics/all-patients" className={`sb-link${isActive('/clinics/all-patients') || isActive('/clinics/patient-view') || isActive('/clinics/patient/') ? ' active' : ''}`}>
            <IconPatients /><span>All Patients</span>
          </a>
          <a href="/clinics/pending" className={`sb-link${isActive('/clinics/pending') ? ' active' : ''}`}>
            <IconPending /><span>Pending Access</span>
          </a>
          <a href="/clinics/scan-patient" className={`sb-link${isActive('/clinics/scan-patient') ? ' active' : ''}`}>
            <IconScan /><span>Scan Patient</span>
          </a>
          <a href="/clinics/add-patient" className={`sb-link${isActive('/clinics/add-patient') ? ' active' : ''}`}>
            <IconAdd /><span>Add Patient</span>
          </a>

          {/* ── RESOURCES ── */}
          <span className="sb-section">Resources</span>

          <a href="/clinics/library" className={`sb-link${isActive('/clinics/library') ? ' active' : ''}`}>
            <IconLibrary /><span>Device Library</span>
          </a>
          <a href="/clinics/manufacturers" className={`sb-link${isActive('/clinics/manufacturers') ? ' active' : ''}`}>
            <IconMfr /><span>Manufacturers</span>
          </a>

          {/* ── ADMIN ── */}
          <span className="sb-section">Admin</span>

          <a href="/clinics/staff" className={`sb-link${isActive('/clinics/staff') ? ' active' : ''}`}>
            <IconTeam /><span>Team</span>
          </a>
          <a href="/clinics/audit" className={`sb-link${isActive('/clinics/audit') ? ' active' : ''}`}>
            <IconClock /><span>Audit Log</span>
          </a>

          {/* Notifications */}
          <button
            className="sb-notif"
            onClick={(e) => { e.stopPropagation(); e.nativeEvent.stopImmediatePropagation(); setNotifOpen(true) }}
            aria-label="Notifications"
          >
            <span className="sb-notif-ic">
              <IconBell />
              <span className="dot" style={{ display: unreadCount > 0 ? '' : 'none' }} />
            </span>
            <span className="label">Notifications</span>
            <span className="count">{unreadCount}</span>
          </button>

          {/* Settings */}
          <a href="/clinics/settings" className={`sb-link${isActive('/clinics/settings') ? ' active' : ''}`}>
            <IconGear /><span>Settings</span>
          </a>

          {/* Profile */}
          <div className="sb-profile-wrap">
            <div className={`profile-menu${profileOpen ? ' open' : ''}`}>
              <a href="/clinics/settings"><IconUser />Account settings</a>
              <a href="mailto:hello@implantid.io"><IconHelp />Help &amp; support</a>
              <hr />
              <button className="danger" onClick={requestSignOut}><IconOut />Sign out</button>
            </div>
            <div
              className="sb-bot"
              onClick={(e) => { e.stopPropagation(); e.nativeEvent.stopImmediatePropagation(); setProfileOpen(p => !p) }}
            >
              <div className="av">{userInitials}</div>
              <div style={{ flex:1, minWidth:0 }}>
                <div className="name">{userName}</div>
                <div className="role">{clinicName}</div>
              </div>
              <span className="chev"><IconChevU /></span>
            </div>
          </div>

        </aside>

        {/* Main area */}
        <div className="app-main">

          {/* Mobile top header */}
          <div className="mob-header">
            <a href="/clinics/dashboard" className="mob-header-logo">
              <img src="/icon.svg" alt="" />
              <span className="logo-text"><b>Implant</b><span>ID</span></span>
            </a>
            <div style={{ display:'flex', alignItems:'center', gap:8 }}>
              <button
                className="ibtn notif-btn"
                aria-label="Notifications"
                onClick={(e) => { e.stopPropagation(); e.nativeEvent.stopImmediatePropagation(); setNotifOpen(true) }}
                style={{ width:38, height:38 }}
              >
                <IconBell />
              </button>
              <div className="mob-hdr-profile">
                <button
                  className="mob-hdr-av"
                  onClick={(e) => { e.stopPropagation(); e.nativeEvent.stopImmediatePropagation(); setMobProfileOpen(p => !p) }}
                  aria-label="Profile menu"
                >
                  {userInitials}
                </button>
                <div className={`mob-hdr-menu${mobProfileOpen ? ' open' : ''}`}>
                  <div className="mob-hdr-info">
                    <strong>{userName}</strong>
                    <span>{clinicName}</span>
                  </div>
                  <hr />
                  <a href="/clinics/settings">Account settings</a>
                  <button className="danger" onClick={requestSignOut}>Sign out</button>
                </div>
              </div>
            </div>
          </div>

          {/* Desktop topbar */}
          <header className="app-top">
            <button className="sb-burger" onClick={() => setMobOpen(true)} aria-label="Open menu">
              <IconHamburg />
            </button>
            <h1 style={{ flexShrink:0 }}>
              {pageTitle}
              <span className="m-badge clinic-badge">Clinic</span>
            </h1>
            <div className="app-top-r" style={{ marginLeft:'auto', display:'flex', alignItems:'center', gap:8 }}>
              <button
                className="btn btn-s"
                onClick={() => router.push('/clinics/scan-patient')}
                aria-label="Scan patient"
              >
                Scan patient
              </button>
            </div>
          </header>

          {/* Page content */}
          <main style={{ flex:1 }}>
            {children}
          </main>

        </div>
      </div>

      {/* Mobile bottom nav */}
      <nav className="mob-nav" aria-label="Mobile navigation">
        <div className="mob-nav-tabs">
          <a href="/clinics/dashboard" className={`mob-nav-tab${pathname === '/clinics/dashboard' ? ' active' : ''}`} aria-label="Overview">
            <IconOverview /><span className="t">Overview</span>
          </a>
          <a href="/clinics/all-patients" className={`mob-nav-tab${isActive('/clinics/all-patients') ? ' active' : ''}`} aria-label="Patients">
            <IconPatients /><span className="t">Patients</span>
          </a>
          <a href="/clinics/scan-patient" className={`mob-nav-tab${isActive('/clinics/scan-patient') ? ' active' : ''}`} aria-label="Scan">
            <IconScan /><span className="t">Scan</span>
          </a>
          <a href="/clinics/library" className={`mob-nav-tab${isActive('/clinics/library') ? ' active' : ''}`} aria-label="Library">
            <IconLibrary /><span className="t">Library</span>
          </a>
          <button
            className="mob-nav-tab mob-nav-menu-btn"
            onClick={mobOpen ? () => setMobOpen(false) : () => setMobOpen(true)}
            aria-label="Toggle menu"
          >
            <div className={`ham-ic${mobOpen ? ' open' : ''}`}><span /><span /><span /></div>
            <span className="t">Menu</span>
          </button>
        </div>
      </nav>

      {/* Sign-out confirmation */}
      {signOutConfirm && (
        <div className="logout-back open" onClick={cancelSignOut}>
          <div className="logout-modal" onClick={e => e.stopPropagation()}>
            <div className="logout-body">
              <div style={{ width:44, height:44, borderRadius:'50%', background:'color-mix(in srgb,var(--err) 12%,transparent)', display:'grid', placeItems:'center', margin:'0 auto 14px' }}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--err)" strokeWidth="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
              </div>
              <h3>Sign out?</h3>
              <p>You&apos;ll be returned to the login screen.</p>
            </div>
            <div className="logout-actions">
              <button className="btn" onClick={cancelSignOut} disabled={signingOut}>Cancel</button>
              <button className="btn btn-danger" onClick={handleSignOut} disabled={signingOut}>
                {signingOut ? 'Signing out…' : 'Sign out'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Notifications drawer */}
      <div className={`notif-back${notifOpen ? ' open' : ''}`} onClick={() => setNotifOpen(false)} />
      <aside className={`notif-drawer${notifOpen ? ' open' : ''}`} aria-label="Notifications">
        <div className="notif-h">
          <h3>Notifications {unreadCount > 0 && <span style={{ display:'inline-flex', alignItems:'center', justifyContent:'center', width:20, height:20, borderRadius:'50%', background:'var(--accent)', color:'#fff', fontSize:11, fontWeight:700, marginLeft:8 }}>{unreadCount}</span>}</h3>
          <button className="x" onClick={() => setNotifOpen(false)}>✕</button>
        </div>
        <div className="notif-list">
          {notifications === undefined && (
            <div style={{ padding:'40px 16px', textAlign:'center', color:'var(--muted)', fontSize:13 }}>Loading…</div>
          )}
          {notifications?.length === 0 && (
            <div style={{ padding:'48px 16px', textAlign:'center', color:'var(--muted)', fontSize:13 }}>
              No notifications yet — all clear!
            </div>
          )}
          {notifications?.map((n: any) => (
            <div
              key={n._id}
              style={{ display:'flex', gap:14, padding:'16px 20px', borderBottom:'1px solid var(--border)', background:n.read ? 'transparent' : 'color-mix(in srgb,var(--accent) 4%,transparent)' }}
            >
              <div style={{ width:34, height:34, borderRadius:9, flexShrink:0, display:'flex', alignItems:'center', justifyContent:'center', background:'color-mix(in srgb,var(--accent) 12%,transparent)', color:'var(--accent)' }}>
                <IconBell />
              </div>
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ fontFamily:'var(--ff)', fontSize:13.5, fontWeight:600, color:'var(--text)', marginBottom:3 }}>{n.title}</div>
                <div style={{ fontSize:12.5, color:'var(--muted)', lineHeight:1.45, marginBottom:5 }}>{n.body}</div>
                <div style={{ fontSize:11.5, color:'var(--muted2)' }}>{timeAgo(n.createdAt)}</div>
              </div>
            </div>
          ))}
        </div>
        <div className="notif-foot">
          <button
            type="button"
            onClick={handleMarkAllRead}
            style={{ background:'none', border:'none', cursor:'pointer', fontFamily:'var(--ff)', fontSize:13, color:'var(--accent)', fontWeight:500, padding:0 }}
          >
            Mark all as read
          </button>
          <a href="/clinics/settings">Settings</a>
        </div>
      </aside>
    </>
  )
}
