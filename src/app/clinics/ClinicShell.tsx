'use client'

import { useState, useEffect, useRef } from 'react'
import { useClerk, useUser }         from '@clerk/nextjs'
import { usePathname }               from 'next/navigation'
import LegalFooter from '@/components/LegalFooter'
import { useQuery, useMutation }     from 'convex/react'
import { api as apiBase }            from '../../../convex/_generated/api'
import Link                          from 'next/link'
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const api = apiBase as any

// ── Page title ────────────────────────────────────────────────────────────────

function pageTitleFromPathname(pathname: string): string {
  if (pathname.startsWith('/clinics/devices'))        return 'Devices'
  if (pathname.startsWith('/clinics/scan-patient'))   return 'Scan patient card'
  if (pathname.startsWith('/clinics/manufacturers'))  return 'Manufacturers'
  if (pathname.startsWith('/clinics/all-patients'))   return 'All patients'
  if (pathname.startsWith('/clinics/add-patient'))    return 'Add patient'
  if (pathname.startsWith('/clinics/patient-view'))   return 'Patient record'
  if (pathname.startsWith('/clinics/patient/'))       return 'Patient record'
  if (pathname.startsWith('/clinics/staff'))          return 'Staff'
  if (pathname.startsWith('/clinics/audit'))          return 'Audit log'
  if (pathname.startsWith('/clinics/settings'))       return 'Settings'
  if (pathname.startsWith('/clinics/pending'))        return 'Pending access'
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

// ── Pending / Rejected screens ────────────────────────────────────────────────

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
              {([['Facility', app.facilityName], ['Contact', app.contactEmail], ['Submitted', new Date(app.submittedAt).toLocaleDateString('en-GB',{day:'2-digit',month:'short',year:'numeric'})], ['Status', 'Under review']] as [string,string][]).map(([l,v]) => (
                <div key={l}><div style={{ fontSize:11, fontWeight:600, letterSpacing:'1px', textTransform:'uppercase', color:'var(--muted2)', marginBottom:4 }}>{l}</div><div style={{ fontSize:14, color:'var(--text)' }}>{v}</div></div>
              ))}
            </div>
          </div>
          <div style={{ color:'var(--muted)', fontSize:14, marginBottom:12 }}>While you wait, you can browse our device library.</div>
          <Link href="/clinics/devices" className="btn btn-s">Browse Device Library</Link>
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

// ── Main shell ────────────────────────────────────────────────────────────────

export default function ClinicShell({ children }: { children: React.ReactNode }) {
  const { signOut }  = useClerk()
  const { user }     = useUser()
  const pathname     = usePathname()

  const myApplication = useQuery(api.clinics.getMyApplication) as Application | null | undefined
  const myClinic      = useQuery(api.clinics.getMyClinic)
  const notifications = useQuery(api.patients.getMyNotifications)
  const markRead      = useMutation(api.patients.markAllNotificationsRead)

  const [mobOpen,        setMobOpen]        = useState(false)
  const [sbCollapsed,    setSbCollapsed]    = useState(false)
  const [notifOpen,      setNotifOpen]      = useState(false)
  const [signOutConfirm, setSignOutConfirm] = useState(false)
  const [signingOut,     setSigningOut]     = useState(false)
  const unreadCount  = notifications?.filter((n: any) => !n.read).length ?? 0
  const userName     = user?.fullName ?? user?.firstName ?? 'Clinic User'
  const userInitials = initials(userName)
  const clinicName   = myClinic?.facilityName ?? 'Clinic Portal'
  const pageTitle    = pageTitleFromPathname(pathname)

  useEffect(() => { setMobOpen(false) }, [pathname])

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
  }

  function cancelSignOut() {
    setSignOutConfirm(false)
    setSigningOut(false)
  }

  async function handleMarkAllRead() {
    try { await markRead({}) } catch { /* silent */ }
  }

  if (myApplication === undefined) return <LoadingScreen />
  if (myApplication?.status === 'pending')  return <PendingScreen  app={myApplication} onSignOut={() => signOut({ redirectUrl: '/' })} />
  if (myApplication?.status === 'rejected') return <RejectedScreen app={myApplication} onSignOut={() => signOut({ redirectUrl: '/' })} />

  return (
    <>
      <div className="sb-back" id="sb-back" onClick={() => setMobOpen(false)} />

      <div className={`app${sbCollapsed ? ' collapsed' : ''}`} id="app">

        {/* ── Sidebar ── */}
        <aside className={`sidebar${mobOpen ? ' open' : ''}`}>

          <div className="sb-logo">
            <a href="/clinics/scan-patient" className="logo">
              <img src="/icon.svg" alt="" />
              <span className="logo-text"><b>Implant</b><span>ID</span></span>
            </a>
            <button className="sb-toggle" aria-label="Collapse sidebar" onClick={() => setSbCollapsed(c => !c)}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15 18 9 12 15 6"/></svg>
            </button>
          </div>

          <div className="sb-scroll">

          {/* ── Lookup ── */}
          <div className="sb-section">Lookup</div>
          <a className={`sb-link${isActive('/clinics/scan-patient') ? ' active' : ''}`} href="/clinics/scan-patient" title="Scan patient card">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="5" y="5" width="3" height="3"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="16" y="5" width="3" height="3"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="5" y="16" width="3" height="3"/><rect x="14" y="14" width="2.5" height="2.5" rx=".5"/><rect x="18" y="14" width="3" height="3" rx=".5"/><rect x="14" y="18" width="3" height="3" rx=".5"/><rect x="19" y="19" width="2" height="2" rx=".5"/></svg>
            <span>Scan card</span>
          </a>
          <a className={`sb-link${isActive('/clinics/devices') ? ' active' : ''}`} href="/clinics/devices" title="Devices">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20M4 19.5A2.5 2.5 0 0 0 6.5 22H20V2H6.5A2.5 2.5 0 0 0 4 4.5v15z"/></svg>
            <span>Devices</span>
          </a>
          <a className={`sb-link${isActive('/clinics/manufacturers') ? ' active' : ''}`} href="/clinics/manufacturers" title="Manufacturers">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"><path d="M3 21V8l9-5 9 5v13"/><path d="M9 9h6M9 13h6M9 17h6"/></svg>
            <span>Manufacturers</span>
          </a>

          {/* ── Patients ── */}
          <div className="sb-section">Patients</div>
          <a className={`sb-link${isActive('/clinics/all-patients') || isActive('/clinics/patient-view') || isActive('/clinics/patient/') ? ' active' : ''}`} href="/clinics/all-patients" title="All patients">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
            <span>All patients</span>
          </a>
          <a className={`sb-link${isActive('/clinics/add-patient') ? ' active' : ''}`} href="/clinics/add-patient" title="Add patient">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"><circle cx="9" cy="7" r="4"/><path d="M3 21v-2a4 4 0 0 1 4-4h4M19 8v6M16 11h6"/></svg>
            <span>Add patient</span>
          </a>

          {/* ── Clinic ── */}
          <div className="sb-section">Clinic</div>
          <a className={`sb-link${isActive('/clinics/staff') ? ' active' : ''}`} href="/clinics/staff" title="Staff">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/></svg>
            <span>Staff</span>
          </a>
          <a className={`sb-link${isActive('/clinics/audit') ? ' active' : ''}`} href="/clinics/audit" title="Audit log">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/></svg>
            <span>Audit log</span>
          </a>
          <a className={`sb-link${isActive('/clinics/settings') ? ' active' : ''}`} href="/clinics/settings" title="Settings">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33h0a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51h0a1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82v0a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
            <span>Settings</span>
          </a>

          {/* Notifications */}
          <button
            className="sb-notif"
            onClick={(e) => { e.stopPropagation(); e.nativeEvent.stopImmediatePropagation(); setNotifOpen(true) }}
            title="Notifications"
            aria-label="Notifications"
          >
            <span className="sb-notif-ic">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
              <span className="dot" style={{ display: unreadCount > 0 ? '' : 'none' }} />
            </span>
            <span className="label">Notifications</span>
            <span className="count">{unreadCount}</span>
          </button>

          <div className="sb-divider" />
          <div className="sb-identity">
            <div className="av">{userInitials}</div>
            <div>
              <div className="name">{userName}</div>
              <div className="role">{clinicName}</div>
            </div>
          </div>
          <a href="/clinics/settings" className="sb-link">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"><circle cx="12" cy="7" r="4"/><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/></svg>
            <span>My account</span>
          </a>
          <a href="/clinics/settings" className="sb-link">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51"/></svg>
            <span>Settings</span>
          </a>
          <a href="/clinics/staff" className="sb-link">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>
            <span>Invite a colleague</span>
          </a>
          <a href="mailto:hello@implantid.io" className="sb-link">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"><circle cx="12" cy="12" r="9"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3M12 17h.01"/></svg>
            <span>Help &amp; docs</span>
          </a>
          <span className="sb-section">Legal</span>
          <a href="https://implantid.io/legal/privacy" target="_blank" rel="noopener noreferrer" className="sb-link">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
            <span>Privacy Policy</span>
          </a>
          <a href="https://implantid.io/legal/terms" target="_blank" rel="noopener noreferrer" className="sb-link">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>
            <span>Terms of Service</span>
          </a>
          <a href="https://implantid.io/legal/gdpr" target="_blank" rel="noopener noreferrer" className="sb-link">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><polyline points="9 12 11 14 15 10"/></svg>
            <span>GDPR</span>
          </a>
          <button className="sb-link sb-signout" onClick={requestSignOut}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
            <span>Sign out</span>
          </button>

          </div>

        </aside>

        {/* ── Main area ── */}
        <main className="app-main">

          {/* Mobile top header */}
          <div className="mob-header">
            <a href="/clinics/scan-patient" className="mob-header-logo">
              <img src="/icon.svg" alt="" />
              <span className="logo-text"><b>Implant</b><span>ID</span></span>
            </a>
            <div className="mob-hdr-profile">
              <button
                className="mob-hdr-av"
                onClick={() => setMobOpen(v => !v)}
                aria-label="Open navigation"
              >
                {userInitials}
              </button>
            </div>
          </div>

          {/* Desktop topbar */}
          <header className="app-top">
            <div className="app-top-l">
              <h1 style={{ fontSize:'clamp(18px,2vw,24px)', letterSpacing:'-.02em' }}>{pageTitle}</h1>
            </div>
            <div className="app-top-r">
              <button
                className="ibtn notif-btn"
                onClick={(e) => { e.stopPropagation(); e.nativeEvent.stopImmediatePropagation(); setNotifOpen(true) }}
                aria-label="Notifications"
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
              </button>
            </div>
          </header>

          {/* Page content */}
          <section className="app-content">
            {children}
          </section>

          <LegalFooter />

        </main>
      </div>

      {/* Mobile bottom nav */}
      <nav className="mob-nav" aria-label="Mobile navigation">
        <div className="mob-nav-tabs">
          <a href="/clinics/scan-patient" className={`mob-nav-tab${isActive('/clinics/scan-patient') ? ' active' : ''}`} aria-label="Scan card">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="5" y="5" width="3" height="3"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="16" y="5" width="3" height="3"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="5" y="16" width="3" height="3"/><rect x="14" y="14" width="2.5" height="2.5" rx=".5"/><rect x="18" y="14" width="3" height="3" rx=".5"/><rect x="14" y="18" width="3" height="3" rx=".5"/><rect x="19" y="19" width="2" height="2" rx=".5"/></svg>
            <span className="t">Scan</span>
          </a>
          <a href="/clinics/all-patients" className={`mob-nav-tab${isActive('/clinics/all-patients') ? ' active' : ''}`} aria-label="Patients">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/></svg>
            <span className="t">Patients</span>
          </a>
          <a href="/clinics/devices" className={`mob-nav-tab${isActive('/clinics/devices') ? ' active' : ''}`} aria-label="Library">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20M4 19.5A2.5 2.5 0 0 0 6.5 22H20V2H6.5A2.5 2.5 0 0 0 4 4.5v15z"/></svg>
            <span className="t">Library</span>
          </a>
          <button
            className="mob-nav-tab mob-nav-menu-btn"
            onClick={() => setMobOpen(o => !o)}
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
              <div className="logout-ic">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
              </div>
              <h3>Log out of Implant ID?</h3>
              <p>You&apos;ll need to sign back in to access patient records and the implant library. Your data stays safe either way.</p>
            </div>
            <div className="logout-actions">
              <button className="btn btn-lg" onClick={cancelSignOut} disabled={signingOut}>← Back</button>
              <button className="btn btn-danger btn-lg" onClick={handleSignOut} disabled={signingOut}>
                {signingOut ? 'Signing out…' : 'Yes, log out'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Notifications drawer */}
      <div className={`notif-back${notifOpen ? ' open' : ''}`} onClick={() => setNotifOpen(false)} />
      <aside className={`notif-drawer${notifOpen ? ' open' : ''}`} aria-label="Notifications">
        <div className="notif-h">
          <h3>Notifications</h3>
          <button className="x" onClick={() => setNotifOpen(false)}>✕</button>
        </div>
        <div className="notif-list">
          {notifications === undefined && (
            <div style={{ padding:'40px 16px', textAlign:'center', color:'var(--muted)', fontSize:13 }}>Loading…</div>
          )}
          {notifications?.length === 0 && (
            <div style={{ padding:'48px 16px', textAlign:'center', color:'var(--muted)', fontSize:13 }}>No notifications yet — all clear!</div>
          )}
          {notifications?.map((n: any) => (
            <div
              key={n._id}
              style={{ display:'flex', gap:14, padding:'16px 20px', borderBottom:'1px solid var(--border)', background:n.read ? 'transparent' : 'color-mix(in srgb,var(--accent) 4%,transparent)' }}
            >
              <div className={`notif-ic ${n.type === 'device_recall' ? 'err' : n.type === 'expiry' ? 'warn' : 'ok'}`}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" width="16" height="16"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
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
          <button type="button" onClick={handleMarkAllRead} style={{ background:'none', border:'none', cursor:'pointer', fontFamily:'var(--ff)', fontSize:13, color:'var(--accent)', fontWeight:500, padding:0 }}>
            Mark all as read
          </button>
          <a href="/clinics/settings">Settings</a>
        </div>
      </aside>

    </>
  )
}
