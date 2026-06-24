'use client'

import { useState, useEffect, useRef } from 'react'
import { useClerk }                    from '@clerk/nextjs'
import { usePathname, useRouter }      from 'next/navigation'
import LegalFooter from '@/components/LegalFooter'
import { useQuery }                    from 'convex/react'
import { api as apiBase }              from '../../../convex/_generated/api'
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const api = apiBase as any

interface MasterShellProps {
  children: React.ReactNode
}

function pageTitleFromPathname(pathname: string): string {
  if (pathname.startsWith('/master/applications'))  return 'Pending Approvals'
  if (pathname.startsWith('/master/clinics'))        return 'Clinics'
  if (pathname.startsWith('/master/devices/add'))    return 'Add Device'
  if (pathname.startsWith('/master/devices/bulk'))   return 'Bulk Upload'
  if (pathname.startsWith('/master/devices/scrape')) return 'Scrape'
  if (pathname.startsWith('/master/devices/ai'))     return 'AI Assistant'
  if (pathname.startsWith('/master/devices'))        return 'Devices'
  if (pathname.startsWith('/master/patients'))       return 'Patients'
  if (pathname.startsWith('/master/manufacturers'))  return 'Manufacturers'
  if (pathname.startsWith('/master/documents'))      return 'Documents'
  if (pathname.startsWith('/master/settings'))       return 'Settings'
  if (pathname.startsWith('/master/audit'))          return 'Audit Log'
  return 'Dashboard'
}

export default function MasterShell({ children }: MasterShellProps) {
  const { signOut } = useClerk()
  const pathname  = usePathname()
  const router    = useRouter()
  const [collapsed,      setCollapsed]      = useState(false)
  const [mobOpen,        setMobOpen]        = useState(false)
  const [notifOpen,      setNotifOpen]      = useState(false)
  const [profileOpen,    setProfileOpen]    = useState(false)
  const [mobProfileOpen, setMobProfileOpen] = useState(false)
  const sbBotRef = useRef<HTMLDivElement>(null)
  const [signOutConfirm, setSignOutConfirm] = useState(false)
  const [signingOut,     setSigningOut]     = useState(false)

  // ── Real-time admin notification data ───────────────────────────────────────
  const pendingClinics  = useQuery(api.clinics.listApplications,      { status: 'pending' })
  const pendingMfrs     = useQuery(api.manufacturers.listApplications, { status: 'pending' })
  const pendingDevices  = useQuery(api.devices.listPendingDevices)

  type AdminNotif = { id: string; title: string; body: string; href: string; type: 'clinic' | 'manufacturer' | 'device'; time: number }
  const adminNotifs: AdminNotif[] = [
    ...(pendingClinics ?? []).map((c: {_id:string;facilityName:string;submittedAt:number}) => ({
      id: c._id, title: `New clinic application · ${c.facilityName}`,
      body: 'Awaiting your review.',
      href: `/master/clinics/${c._id}`,
      type: 'clinic' as const, time: c.submittedAt,
    })),
    ...(pendingMfrs ?? []).map((m: {_id:string;companyName:string;submittedAt:number}) => ({
      id: m._id, title: `New manufacturer application · ${m.companyName}`,
      body: 'Awaiting your review.',
      href: `/master/manufacturers/${m._id}`,
      type: 'manufacturer' as const, time: m.submittedAt,
    })),
    ...(pendingDevices ?? []).map((d: {_id:string;deviceType:string;manufacturer:string;publishedAt:number}) => ({
      id: d._id, title: `Device pending review · ${d.manufacturer}`,
      body: `${d.deviceType} — awaiting sign-off.`,
      href: '/master/devices',
      type: 'device' as const, time: d.publishedAt,
    })),
  ].sort((a, b) => b.time - a.time).slice(0, 20)

  const unreadCount = adminNotifs.length

  // ⌘K / Ctrl+K → navigate to search page
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        router.push('/master/search')
      }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [router])

  // Close menus when clicking outside
  useEffect(() => {
    function handleOutside() {
      setMobProfileOpen(false)
    }
    document.addEventListener('click', handleOutside)
    return () => document.removeEventListener('click', handleOutside)
  }, [])

  // Close mobile sidebar whenever the route changes
  useEffect(() => {
    setMobOpen(false)
  }, [pathname])

  useEffect(() => {
    if (!profileOpen) return
    function onOutside(e: MouseEvent) {
      if (sbBotRef.current && !sbBotRef.current.contains(e.target as Node)) setProfileOpen(false)
    }
    document.addEventListener('mousedown', onOutside)
    return () => document.removeEventListener('mousedown', onOutside)
  }, [profileOpen])

  function isActive(href: string) {
    if (href === '/master/dashboard') return pathname === '/master/dashboard'
    return pathname.startsWith(href)
  }

  const pageTitle = pageTitleFromPathname(pathname)

  async function handleSignOut() {
    setSigningOut(true)
    await signOut({ redirectUrl: '/master/login' })
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

  function openMob() { setMobOpen(true) }
  function closeMob() { setMobOpen(false) }

  // ─────────────────────────────────────────────────────────
  // SVG helpers (kept inline to avoid import overhead)
  // ─────────────────────────────────────────────────────────
  const IconOverview = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
      <rect x="3" y="3" width="7" height="7" rx="1"/>
      <rect x="14" y="3" width="7" height="7" rx="1"/>
      <rect x="3" y="14" width="7" height="7" rx="1"/>
      <rect x="14" y="14" width="7" height="7" rx="1"/>
    </svg>
  )
  const IconPatients = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
      <circle cx="9" cy="7" r="4"/>
      <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
      <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
    </svg>
  )
  const IconClinics = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
      <path d="M3 21h18M3 10h18M5 6l7-3 7 3M4 10v11M20 10v11M8 14v3M12 14v3M16 14v3"/>
    </svg>
  )
  const IconMfr = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
      <path d="M2 20h20M4 20V10l8-6 8 6v10"/>
      <rect x="9" y="14" width="6" height="6"/>
    </svg>
  )
  const IconSearch = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
      <circle cx="11" cy="11" r="7"/>
      <path d="m21 21-4.3-4.3"/>
    </svg>
  )
  const IconAdd = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
      <circle cx="12" cy="12" r="9"/>
      <path d="M12 8v8M8 12h8"/>
    </svg>
  )
  const IconUpload = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
      <path d="M17 8l-5-5-5 5M12 3v12"/>
    </svg>
  )
  const IconClock = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
      <circle cx="12" cy="12" r="9"/>
      <path d="M12 7v5l3 2"/>
    </svg>
  )
  const IconBell = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
      <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
    </svg>
  )
  const IconGear = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
      <circle cx="12" cy="12" r="3"/>
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
    </svg>
  )
  const IconOut = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
      <polyline points="16 17 21 12 16 7"/>
      <line x1="21" y1="12" x2="9" y2="12"/>
    </svg>
  )
  const IconChevL = () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <polyline points="15 18 9 12 15 6"/>
    </svg>
  )
  const IconChevU = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <polyline points="18 15 12 9 6 15"/>
    </svg>
  )
  const IconUser = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
      <circle cx="12" cy="7" r="4"/>
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
    </svg>
  )
  const IconHelp = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
      <circle cx="12" cy="12" r="9"/>
      <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3M12 17h.01"/>
    </svg>
  )
  const IconShield = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
      <path d="m9 12 2 2 4-4"/>
    </svg>
  )
  const IconDoc = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
      <polyline points="14 2 14 8 20 8"/>
      <line x1="16" y1="13" x2="8" y2="13"/>
      <line x1="16" y1="17" x2="8" y2="17"/>
      <polyline points="10 9 9 9 8 9"/>
    </svg>
  )
  const IconHamburg = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <line x1="3" y1="6" x2="21" y2="6"/>
      <line x1="3" y1="12" x2="21" y2="12"/>
      <line x1="3" y1="18" x2="21" y2="18"/>
    </svg>
  )

  return (
    <>
      {/* ── Mobile sidebar backdrop (OUTSIDE .app so it doesn't affect grid) ── */}
      <div
        className={`sb-back${mobOpen ? ' open' : ''}`}
        onClick={closeMob}
      />

      {/* ── App grid ── */}
      <div className={`app${collapsed ? ' collapsed' : ''}`}>

        {/* ── Sidebar ── */}
        <aside className={`sidebar${mobOpen ? ' open' : ''}`}>

          {/* Logo + collapse toggle */}
          <div className="sb-logo">
            <a href="/master/dashboard" className="logo">
              <img src="/icon.svg" alt="Implant ID" />
              <span className="logo-text"><b>Implant</b><span>ID</span></span>
            </a>
            <button
              className="sb-toggle"
              onClick={() => setCollapsed(c => !c)}
              aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            >
              <IconChevL />
            </button>
          </div>

          <div className="sb-scroll">
          {/* Overview */}
          <a href="/master/dashboard" className={`sb-link${isActive('/master/dashboard') ? ' active' : ''}`}>
            <IconOverview /><span>Overview</span>
          </a>

          {/* ── USERS ── */}
          <span className="sb-section">Users</span>

          <a href="/master/patients" className={`sb-link${isActive('/master/patients') ? ' active' : ''}`}>
            <IconPatients /><span>Patients</span>
          </a>
          <a
            href="/master/clinics"
            className={`sb-link${isActive('/master/clinics') || isActive('/master/applications') ? ' active' : ''}`}
          >
            <IconClinics /><span>Clinics</span>
            {(pendingClinics?.length ?? 0) > 0 && (
              <span className="pill">{pendingClinics!.length}</span>
            )}
          </a>
          <a href="/master/manufacturers" className={`sb-link${isActive('/master/manufacturers') ? ' active' : ''}`}>
            <IconMfr /><span>Manufacturers</span>
          </a>

          {/* ── DEVICES ── */}
          <span className="sb-section">Devices</span>

          <a
            href="/master/devices"
            className={`sb-link${pathname === '/master/devices' ? ' active' : ''}`}
          >
            <IconSearch /><span>All Devices</span>
          </a>

          <a href="/master/devices/bulk" className={`sb-link${isActive('/master/devices/bulk') ? ' active' : ''}`}>
            <IconUpload /><span>Bulk Upload</span>
          </a>
          <a href="/master/devices/scrape" className={`sb-link${isActive('/master/devices/scrape') ? ' active' : ''}`}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/><line x1="11" y1="8" x2="11" y2="14"/><line x1="8" y1="11" x2="14" y2="11"/></svg>
            <span>Scrape</span>
          </a>
          <a href="/master/devices/ai" className={`sb-link${isActive('/master/devices/ai') ? ' active' : ''}`}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"><path d="m12 3-1.9 5.8a2 2 0 0 1-1.3 1.3L3 12l5.8 1.9a2 2 0 0 1 1.3 1.3L12 21l1.9-5.8a2 2 0 0 1 1.3-1.3L21 12l-5.8-1.9a2 2 0 0 1-1.3-1.3z"/></svg>
            <span>AI</span>
          </a>

          {/* ── ADMIN ── */}
          <span className="sb-section">Admin</span>

          <a href="/master/documents" className={`sb-link${isActive('/master/documents') ? ' active' : ''}`}>
            <IconDoc /><span>Documents</span>
          </a>

          <a href="/master/audit" className={`sb-link${isActive('/master/audit') ? ' active' : ''}`}>
            <IconClock /><span>Audit Log</span>
          </a>

          {/* Notifications — uses .sb-notif for proper collapse behaviour */}
          <button
            className="sb-notif"
            onClick={(e) => { e.stopPropagation(); e.nativeEvent.stopImmediatePropagation(); setNotifOpen(true) }}
            aria-label="Notifications"
          >
            <span className="sb-notif-ic">
              <IconBell />
              <span className="dot" />
            </span>
            <span className="label">Notifications</span>
            <span className="count">{unreadCount}</span>
          </button>

          {/* Settings */}
          <a href="/master/settings" className={`sb-link${isActive('/master/settings') ? ' active' : ''}`}>
            <IconGear /><span>Settings</span>
          </a>

          </div>
          <div className="sb-bot" ref={sbBotRef}>
            <div className={`sb-profile-popup${profileOpen ? ' open' : ''}`} role="menu" aria-hidden={!profileOpen}>
              <div className="sb-pp-head">
                <div className="sb-pp-name">Master Admin</div>
                <div className="sb-pp-sub">Implant ID</div>
              </div>
              <a href="/master/settings" className="sb-pp-item" tabIndex={profileOpen ? 0 : -1}>Account settings</a>
              <a href="mailto:hello@implantid.io" className="sb-pp-item" tabIndex={profileOpen ? 0 : -1}>Help &amp; support</a>
              <div className="sb-pp-divider" />
              <a href="https://implantid.io/legal/privacy" target="_blank" rel="noopener noreferrer" className="sb-pp-item" tabIndex={profileOpen ? 0 : -1}>Privacy Policy</a>
              <a href="https://implantid.io/legal/terms" target="_blank" rel="noopener noreferrer" className="sb-pp-item" tabIndex={profileOpen ? 0 : -1}>Terms of Service</a>
              <a href="https://implantid.io/legal/gdpr" target="_blank" rel="noopener noreferrer" className="sb-pp-item" tabIndex={profileOpen ? 0 : -1}>GDPR</a>
              <div className="sb-pp-divider" />
              <button className="sb-pp-item sb-pp-signout" onClick={requestSignOut} tabIndex={profileOpen ? 0 : -1}>Sign out</button>
            </div>
            <div className={`sb-identity${profileOpen ? ' open' : ''}`} onClick={() => setProfileOpen(p => !p)} role="button" tabIndex={0} aria-expanded={profileOpen}>
              <div className="av">MA</div>
              <div>
                <div className="name">Master Admin</div>
                <div className="role">Implant ID</div>
              </div>
              <svg className="chev" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14"><polyline points="6 9 12 15 18 9"/></svg>
            </div>
          </div>

        </aside>

        {/* ── Main area ── */}
        <div className="app-main">

          {/* Mobile top header (hidden on desktop) */}
          <div className="mob-header">
            <a href="/master/dashboard" className="mob-header-logo">
              <img src="/icon.svg" alt="" />
              <span className="logo-text"><b>Implant</b><span>ID</span></span>
            </a>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <button
              className="ibtn notif-btn"
              aria-label="Notifications"
              onClick={(e) => { e.stopPropagation(); e.nativeEvent.stopImmediatePropagation(); setNotifOpen(true) }}
              style={{ width: 38, height: 38 }}
            >
              <IconBell />
            </button>
            <div className="mob-hdr-profile">
              <button
                className="mob-hdr-av"
                onClick={(e) => { e.stopPropagation(); e.nativeEvent.stopImmediatePropagation(); setMobProfileOpen(p => !p) }}
                aria-label="Open profile menu"
              >
                MA
              </button>
            </div>
          </div>
          </div>

          {/* Desktop topbar */}
          <header className="app-top">
            <button className="sb-burger" onClick={openMob} aria-label="Open menu">
              <IconHamburg />
            </button>
            <h1 style={{ flexShrink: 0 }}>
              {pageTitle}
              <span className="m-badge">Master</span>
            </h1>

            <div className="app-top-r app-top-btn-add" style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8 }}>
              {/* Search icon — navigates to full search page */}
              <button
                className="btn"
                onClick={() => router.push('/master/search')}
                aria-label="Search"
                title="Search (⌘K)"
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 42, height: 42, padding: 0, flexShrink: 0 }}
              >
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                  <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
                </svg>
              </button>
              <button className="btn btn-s" onClick={() => window.location.href = '/master/devices/add'}>
                + Add device
              </button>
            </div>
          </header>

          {/* Page content */}
          <main style={{ flex: 1 }}>
            {children}
          </main>

          {!isActive('/master/devices/ai') && <LegalFooter />}

        </div>
      </div>

      {/* ── Mobile bottom nav (OUTSIDE .app) ── */}
      <nav className="mob-nav" aria-label="Mobile navigation">
        <div className="mob-nav-tabs">
          <a
            href="/master/dashboard"
            className={`mob-nav-tab${pathname === '/master/dashboard' ? ' active' : ''}`}
            aria-label="Overview"
          >
            <IconOverview />
            <span className="t">Overview</span>
          </a>
          <a
            href="/master/patients"
            className={`mob-nav-tab${isActive('/master/patients') ? ' active' : ''}`}
            aria-label="Patients"
          >
            <IconPatients />
            <span className="t">Patients</span>
          </a>
          <a
            href="/master/search"
            className={`mob-nav-tab${isActive('/master/search') ? ' active' : ''}`}
            aria-label="Search"
          >
            <IconSearch />
            <span className="t">Search</span>
          </a>
          <a
            href="/master/clinics"
            className={`mob-nav-tab${isActive('/master/clinics') ? ' active' : ''}`}
            aria-label="Clinics"
          >
            <IconClinics />
            <span className="t">Clinics</span>
          </a>
          <button
            className="mob-nav-tab mob-nav-menu-btn"
            onClick={mobOpen ? closeMob : openMob}
            aria-label="Toggle menu"
          >
            <div className={`ham-ic${mobOpen ? ' open' : ''}`}>
              <span />
              <span />
              <span />
            </div>
            <span className="t">Menu</span>
          </button>
        </div>
      </nav>


      {/* ── Sign-out confirmation modal ── */}
      {signOutConfirm && (
        <div className="logout-back open" onClick={cancelSignOut}>
          <div className="logout-modal" onClick={e => e.stopPropagation()}>
            <div className="logout-body">
              <div style={{ width: 44, height: 44, borderRadius: '50%', background: 'rgba(var(--err-rgb),0.12)', display: 'grid', placeItems: 'center', margin: '0 auto 14px' }}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--err)" strokeWidth="2">
                  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
                  <polyline points="16 17 21 12 16 7"/>
                  <line x1="21" y1="12" x2="9" y2="12"/>
                </svg>
              </div>
              <h3>Sign out?</h3>
              <p>You&apos;ll be returned to the Master Admin login screen.</p>
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

      <div className={`mob-sheet-backdrop${mobProfileOpen ? ' open' : ''}`} onClick={() => setMobProfileOpen(false)} aria-hidden="true" />
      <div className={`mob-sheet${mobProfileOpen ? ' open' : ''}`} role="dialog" aria-modal={mobProfileOpen} aria-label="Profile menu">
        <div className="mob-sheet-handle" aria-hidden="true" />
        <div className="mob-sheet-info">
          <strong>Master Admin</strong>
          <span>Implant ID</span>
        </div>
        <a href="/master/settings" className="mob-sheet-item">
          <IconUser />
          Account settings
        </a>
        <a href="mailto:hello@implantid.io" className="mob-sheet-item">
          <IconHelp />
          Help &amp; support
        </a>
        <div className="mob-sheet-divider" />
        <span className="mob-sheet-section">Legal</span>
        <a href="https://implantid.io/legal/privacy" target="_blank" rel="noopener noreferrer" className="mob-sheet-item">
          <IconShield />
          Privacy Policy
        </a>
        <a href="https://implantid.io/legal/terms" target="_blank" rel="noopener noreferrer" className="mob-sheet-item">
          <IconDoc />
          Terms of Service
        </a>
        <a href="https://implantid.io/legal/gdpr" target="_blank" rel="noopener noreferrer" className="mob-sheet-item">
          <IconShield />
          GDPR
        </a>
        <div className="mob-sheet-divider" />
        <button className="mob-sheet-item mob-sheet-danger" onClick={requestSignOut}>
          <IconOut />
          Sign out
        </button>
      </div>

      {/* ── Notifications backdrop + drawer (OUTSIDE .app) ── */}
      <div
        className={`notif-back${notifOpen ? ' open' : ''}`}
        onClick={() => setNotifOpen(false)}
      />
      <aside className={`notif-drawer${notifOpen ? ' open' : ''}`} aria-label="Notifications">
        <div className="notif-h">
          <h3>Notifications</h3>
          <button className="x" onClick={() => setNotifOpen(false)}>✕</button>
        </div>
        <div className="notif-list">
          {adminNotifs.length === 0 ? (
            <div style={{ padding: '24px 16px', textAlign: 'center', color: 'var(--muted)', fontSize: 13 }}>
              No pending items — all clear!
            </div>
          ) : adminNotifs.map(n => (
            <a
              key={n.id}
              href={n.href}
              className="notif-item unread"
              style={{ textDecoration: 'none', color: 'inherit', display: 'flex', alignItems: 'flex-start', gap: 10 }}
              onClick={() => setNotifOpen(false)}
            >
              <div className={`notif-ic ${n.type === 'manufacturer' ? 'warn' : n.type === 'device' ? 'warn' : 'warn'}`}>
                {n.type === 'clinic'        && <IconClock />}
                {n.type === 'manufacturer' && <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" width="16" height="16"><path d="M2 20h20M4 20V10l8-6 8 6v10M9 20v-6h6v6"/></svg>}
                {n.type === 'device'        && <IconClock />}
              </div>
              <div>
                <b>{n.title}</b>
                <p>{n.body}</p>
                <div className="t">{new Date(n.time).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })} · {n.type === 'clinic' ? 'Clinics' : n.type === 'manufacturer' ? 'Manufacturers' : 'Devices'}</div>
              </div>
            </a>
          ))}
        </div>
        <div className="notif-foot">
          <span style={{ color: 'var(--muted2)', fontSize: 12 }}>{unreadCount} pending</span>
          <a href="/master/settings">Settings</a>
        </div>
      </aside>
    </>
  )
}
