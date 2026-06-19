'use client'

import { useState, useEffect, useRef } from 'react'
import { useClerk, useUser } from '@clerk/nextjs'
import { usePathname } from 'next/navigation'
import LegalFooter from '@/components/LegalFooter'

interface SurgeonShellProps {
  children: React.ReactNode
}

// ── SVG icons ─────────────────────────────────────────────────────────────────

const IconDashboard = () => (
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

const IconScan = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
    <circle cx="11" cy="11" r="7"/>
    <path d="m21 21-4.3-4.3"/>
  </svg>
)

const IconLibrary = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
    <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20M4 19.5A2.5 2.5 0 0 0 6.5 22H20V2H6.5A2.5 2.5 0 0 0 4 4.5v15z"/>
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

const IconHamburg = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
    <line x1="3" y1="6" x2="21" y2="6"/>
    <line x1="3" y1="12" x2="21" y2="12"/>
    <line x1="3" y1="18" x2="21" y2="18"/>
  </svg>
)

const IconUser = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
    <circle cx="12" cy="7" r="4"/>
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
  </svg>
)

// ── Nav items ──────────────────────────────────────────────────────────────────

const NAV_ITEMS = [
  { label: 'Dashboard',        href: '/surgeons/dashboard', Icon: IconDashboard },
  { label: 'My Patients',      href: '/surgeons/patients',  Icon: IconPatients  },
  { label: 'Look Up Patient',  href: '/surgeons/scan',      Icon: IconScan      },
  { label: 'Implant library',  href: '/clinics/devices',    Icon: IconLibrary   },
  { label: 'Settings',         href: '/surgeons/settings',  Icon: IconGear      },
]

// ── Surgeon Shell ──────────────────────────────────────────────────────────────

export default function SurgeonShell({ children }: SurgeonShellProps) {
  const { signOut } = useClerk()
  const { user }    = useUser()
  const pathname    = usePathname()

  const [collapsed,      setCollapsed]      = useState(false)
  const [mobOpen,        setMobOpen]        = useState(false)
  const [profileOpen,    setProfileOpen]    = useState(false)
  const [mobProfileOpen, setMobProfileOpen] = useState(false)
  const sbBotRef = useRef<HTMLDivElement>(null)
  const [signOutConfirm, setSignOutConfirm] = useState(false)
  const [signingOut,     setSigningOut]     = useState(false)

  // Close profile menus when clicking outside
  useEffect(() => {
    function handleOutside() {
      setMobProfileOpen(false)
    }
    document.addEventListener('click', handleOutside)
    return () => document.removeEventListener('click', handleOutside)
  }, [])

  useEffect(() => {
    if (!profileOpen) return
    function onOutside(e: MouseEvent) {
      if (sbBotRef.current && !sbBotRef.current.contains(e.target as Node)) setProfileOpen(false)
    }
    document.addEventListener('mousedown', onOutside)
    return () => document.removeEventListener('mousedown', onOutside)
  }, [profileOpen])

  function isActive(href: string) {
    if (href === '/surgeons/dashboard') return pathname === '/surgeons/dashboard'
    return pathname.startsWith(href)
  }

  function pageTitleFromPathname(p: string): string {
    if (p.startsWith('/surgeons/patients'))  return 'My Patients'
    if (p.startsWith('/surgeons/scan'))      return 'Look Up Patient'
    if (p.startsWith('/surgeons/settings'))  return 'Settings'
    return 'Dashboard'
  }

  async function handleSignOut() {
    setSigningOut(true)
    await signOut({ redirectUrl: '/login' })
  }

  function requestSignOut() {
    setProfileOpen(false)
    setMobProfileOpen(false)
    setSignOutConfirm(true)
  }

  const initials = (user?.fullName ?? user?.firstName ?? 'S')
    .split(/\s+/)
    .slice(0, 2)
    .map((p: string) => p[0]?.toUpperCase() ?? '')
    .join('')

  const pageTitle = pageTitleFromPathname(pathname ?? '')

  return (
    <>
      {/* Mobile sidebar backdrop */}
      <div
        className={`sb-back${mobOpen ? ' open' : ''}`}
        onClick={() => setMobOpen(false)}
      />

      {/* App grid */}
      <div className={`app${collapsed ? ' collapsed' : ''}`}>

        {/* Sidebar */}
        <aside className={`sidebar${mobOpen ? ' open' : ''}`}>

          {/* Logo + collapse toggle */}
          <div className="sb-logo">
            <a href="/surgeons/dashboard" className="logo">
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
          {/* Portal label */}
          <span className="sb-section">Surgeon Portal</span>

          {/* Nav items */}
          {NAV_ITEMS.map(({ label, href, Icon }) => (
            <a
              key={href}
              href={href}
              className={`sb-link${isActive(href) ? ' active' : ''}`}
              aria-current={isActive(href) ? 'page' : undefined}
            >
              <Icon /><span>{label}</span>
            </a>
          ))}

          </div>
          <div className="sb-bot" ref={sbBotRef}>
            <div className={`sb-profile-popup${profileOpen ? ' open' : ''}`} role="menu" aria-hidden={!profileOpen}>
              <div className="sb-pp-head">
                <div className="sb-pp-name">{user?.fullName ?? user?.firstName ?? 'Surgeon'}</div>
                <div className="sb-pp-sub">Surgeon</div>
              </div>
              <a href="/surgeons/settings" className="sb-pp-item" tabIndex={profileOpen ? 0 : -1}>Account settings</a>
              <a href="mailto:hello@implantid.io" className="sb-pp-item" tabIndex={profileOpen ? 0 : -1}>Help &amp; docs</a>
              <div className="sb-pp-divider" />
              <a href="https://implantid.io/legal/privacy" target="_blank" rel="noopener noreferrer" className="sb-pp-item" tabIndex={profileOpen ? 0 : -1}>Privacy Policy</a>
              <a href="https://implantid.io/legal/terms" target="_blank" rel="noopener noreferrer" className="sb-pp-item" tabIndex={profileOpen ? 0 : -1}>Terms of Service</a>
              <a href="https://implantid.io/legal/gdpr" target="_blank" rel="noopener noreferrer" className="sb-pp-item" tabIndex={profileOpen ? 0 : -1}>GDPR</a>
              <div className="sb-pp-divider" />
              <button className="sb-pp-item sb-pp-signout" onClick={requestSignOut} tabIndex={profileOpen ? 0 : -1}>Sign out</button>
            </div>
            <div className={`sb-identity${profileOpen ? ' open' : ''}`} onClick={() => setProfileOpen(p => !p)} role="button" tabIndex={0} aria-expanded={profileOpen}>
              <div className="av">{initials}</div>
              <div>
                <div className="name">{user?.fullName ?? user?.firstName ?? 'Surgeon'}</div>
                <div className="role">Surgeon</div>
              </div>
              <svg className="chev" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14"><polyline points="6 9 12 15 18 9"/></svg>
            </div>
          </div>

        </aside>

        {/* Main area */}
        <div className="app-main">

          {/* Mobile top header (hidden on desktop) */}
          <div className="mob-header">
            <a href="/surgeons/dashboard" className="mob-header-logo">
              <img src="/icon.svg" alt="" />
              <span className="logo-text"><b>Implant</b><span>ID</span></span>
            </a>
            <div className="mob-hdr-profile">
              <button
                className="mob-hdr-av"
                onClick={(e) => { e.stopPropagation(); setMobProfileOpen(p => !p) }}
                aria-label="Profile menu"
              >
                {initials}
              </button>
              <div className={`mob-hdr-menu${mobProfileOpen ? ' open' : ''}`}>
                <div className="mob-hdr-info">
                  <strong>{user?.fullName ?? user?.firstName ?? 'Surgeon'}</strong>
                  <span>Surgeon</span>
                </div>
                <hr />
                <button className="danger" onClick={requestSignOut}>Sign out</button>
              </div>
            </div>
          </div>

          {/* Desktop topbar */}
          <header className="app-top">
            <button className="sb-burger" onClick={() => setMobOpen(true)} aria-label="Open menu">
              <IconHamburg />
            </button>
            <h1>
              {pageTitle}
              <span className="m-badge" style={{ background: 'color-mix(in srgb,var(--accent2) 12%,transparent)', color: 'var(--accent-deep)' }}>
                Surgeon
              </span>
            </h1>
            <div className="app-top-r" />
          </header>

          {/* Page content */}
          <main style={{ flex: 1 }}>
            {children}
          </main>

          <LegalFooter />

        </div>
      </div>

      {/* Mobile bottom nav */}
      <nav className="mob-nav" aria-label="Mobile navigation">
        <div className="mob-nav-tabs">
          {NAV_ITEMS.map(({ label, href, Icon }) => (
            <a
              key={href}
              href={href}
              className={`mob-nav-tab${isActive(href) ? ' active' : ''}`}
              aria-label={label}
            >
              <Icon />
              <span className="t">{label.split(' ')[0]}</span>
            </a>
          ))}
          <button
            className="mob-nav-tab mob-nav-menu-btn"
            onClick={() => setMobOpen(o => !o)}
            aria-label="Toggle menu"
          >
            <div className="ham-ic">
              <span /><span /><span />
            </div>
            <span className="t">Menu</span>
          </button>
        </div>
      </nav>

      {/* Sign-out confirmation modal */}
      {signOutConfirm && (
        <div className="logout-back open" onClick={() => !signingOut && setSignOutConfirm(false)}>
          <div className="logout-modal" onClick={e => e.stopPropagation()}>
            <div className="logout-body">
              <div style={{ width:44, height:44, borderRadius:'50%', background:'color-mix(in srgb,var(--err) 12%,transparent)', display:'grid', placeItems:'center', margin:'0 auto 14px' }}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--err)" strokeWidth="2">
                  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
                  <polyline points="16 17 21 12 16 7"/>
                  <line x1="21" y1="12" x2="9" y2="12"/>
                </svg>
              </div>
              <h3>Sign out?</h3>
              <p>You&apos;ll be returned to the login page.</p>
            </div>
            <div className="logout-actions">
              <button className="btn" onClick={() => setSignOutConfirm(false)} disabled={signingOut}>Cancel</button>
              <button className="btn btn-danger" onClick={handleSignOut} disabled={signingOut}>
                {signingOut ? 'Signing out…' : 'Yes, sign out'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
