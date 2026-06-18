'use client'

import { useState }          from 'react'
import { useClerk, useUser } from '@clerk/nextjs'
import { usePathname }       from 'next/navigation'
import LegalFooter from '@/components/LegalFooter'
import { useQuery }          from 'convex/react'
import { api as apiBase }    from '../../../convex/_generated/api'
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const api = apiBase as any

export default function ManufacturerShell({ children }: { children: React.ReactNode }) {
  const { signOut }  = useClerk()
  const { user }     = useUser()
  const pathname     = usePathname()
  const mfr          = useQuery(api.manufacturers.getMyManufacturer)

  const [collapsed,    setCollapsed]    = useState(false)
  const [mobOpen,      setMobOpen]      = useState(false)
  const [logoutOpen,   setLogoutOpen]   = useState(false)
  const [profileOpen,  setProfileOpen]  = useState(false)

  const initials = user ? `${user.firstName?.[0] ?? ''}${user.lastName?.[0] ?? ''}`.toUpperCase() || 'M' : 'M'
  const name     = user?.fullName ?? mfr?.companyName ?? 'Manufacturer'

  function isActive(path: string) { return pathname.startsWith(path) }

  return (
    <>
      <div className={`sb-back${mobOpen ? ' open' : ''}`} onClick={() => setMobOpen(false)} />
      <div className={`app${collapsed ? ' collapsed' : ''}`}>
        <aside className={`sidebar${mobOpen ? ' open' : ''}`}>
          <div className="sb-logo">
            <a href="/manufacturer/dashboard" className="logo">
              <img src="/icon.svg" alt="" />
              <span className="logo-text"><b>Implant</b><span>ID</span></span>
            </a>
            <button className="sb-toggle" onClick={() => setCollapsed(v => !v)} aria-label="Collapse sidebar">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15 18 9 12 15 6"/></svg>
            </button>
          </div>

          {mfr && (
            <div style={{ padding: '10px 16px 6px', margin: '0 8px 8px', background: 'color-mix(in srgb,var(--accent) 8%,transparent)', borderRadius: 10 }}>
              <div style={{ fontFamily: 'var(--ff)', fontSize: 11, fontWeight: 700, letterSpacing: '.8px', textTransform: 'uppercase', color: 'var(--accent)', marginBottom: 2 }}>
                {mfr.status === 'approved' ? '✓ Verified' : '⏳ Pending'}
              </div>
              <div style={{ fontFamily: 'var(--ff)', fontSize: 12.5, fontWeight: 500, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {mfr.companyName}
              </div>
            </div>
          )}

          <span className="sb-section">Catalogue</span>
          <a className={`sb-link${isActive('/manufacturer/dashboard') ? ' active' : ''}`} href="/manufacturer/dashboard" title="Dashboard">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"><rect x="3" y="3" width="7" height="9" rx="1.5"/><rect x="14" y="3" width="7" height="5" rx="1.5"/><rect x="14" y="12" width="7" height="9" rx="1.5"/><rect x="3" y="16" width="7" height="5" rx="1.5"/></svg>
            <span>Dashboard</span>
          </a>
          <a className={`sb-link${isActive('/manufacturer/devices') && !isActive('/manufacturer/devices/bulk') ? ' active' : ''}`} href="/manufacturer/devices" title="My Devices">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"><path d="M9 3H5a2 2 0 0 0-2 2v4m6-6h10a2 2 0 0 1 2 2v4M9 3v18m0 0h10a2 2 0 0 0 2-2V9M9 21H5a2 2 0 0 1-2-2V9m0 0h18"/></svg>
            <span>My Devices</span>
          </a>
          <a className={`sb-link${isActive('/manufacturer/devices/bulk') ? ' active' : ''}`} href="/manufacturer/devices/bulk" title="Bulk Upload">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
            <span>Bulk Upload</span>
          </a>

          <span className="sb-section">Account</span>
          <a className={`sb-link${isActive('/manufacturer/settings') ? ' active' : ''}`} href="/manufacturer/settings" title="Settings">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33h0a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51h0a1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82v0a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
            <span>Settings</span>
          </a>

          {/* Profile */}
          <div className="sb-bot" onClick={() => setProfileOpen(v => !v)}>
            <div className="av" style={{ background: 'var(--accent)', color: '#fff', fontFamily: 'var(--ff)', fontSize: 13, fontWeight: 600 }}>{initials}</div>
            <div>
              <div className="name">{name}</div>
              <div className="role">Manufacturer</div>
            </div>
          </div>
          {profileOpen && (
            <div className="profile-menu open">
              <a href="/manufacturer/settings"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"><circle cx="12" cy="7" r="4"/><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/></svg>Account</a>
              <hr />
              <button className="danger" onClick={() => { setProfileOpen(false); setLogoutOpen(true) }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
                Sign out
              </button>
            </div>
          )}
        </aside>

        <div className="app-main">
          {/* Mobile header */}
          <div className="mob-header">
            <a href="/manufacturer/dashboard" className="mob-header-logo">
              <img src="/icon.svg" alt="" /><span className="logo-text"><b>Implant</b><span>ID</span></span>
            </a>
          </div>

          {children}

          <LegalFooter />

        </div>
      </div>

      {/* Mobile bottom nav */}
      <nav className="mob-nav" aria-label="Mobile navigation">
        <div className="mob-nav-tabs">
          <a href="/manufacturer/dashboard" className={`mob-nav-tab${isActive('/manufacturer/dashboard') ? ' active' : ''}`}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>
            <span className="t">Overview</span>
          </a>
          <a href="/manufacturer/devices" className={`mob-nav-tab${isActive('/manufacturer/devices') ? ' active' : ''}`}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"><circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/></svg>
            <span className="t">Devices</span>
          </a>
          <a href="/manufacturer/devices/bulk" className={`mob-nav-tab${isActive('/manufacturer/devices/bulk') ? ' active' : ''}`}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
            <span className="t">Upload</span>
          </a>
          <a href="/manufacturer/settings" className={`mob-nav-tab${isActive('/manufacturer/settings') ? ' active' : ''}`}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"><circle cx="12" cy="7" r="4"/><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/></svg>
            <span className="t">Account</span>
          </a>
          <button className="mob-nav-tab mob-nav-menu-btn" onClick={() => setMobOpen(v => !v)} aria-label="Toggle menu">
            <div className={`ham-ic${mobOpen ? ' open' : ''}`}><span /><span /><span /></div>
            <span className="t">Menu</span>
          </button>
        </div>
      </nav>

      {/* Logout modal */}
      {logoutOpen && (
        <div className="logout-back open" onClick={() => setLogoutOpen(false)}>
          <div className="logout-modal" onClick={e => e.stopPropagation()}>
            <div className="logout-body">
              <h3>Sign out?</h3>
              <p>You&apos;ll need to sign back in to access your manufacturer account.</p>
            </div>
            <div className="logout-actions">
              <button className="btn" onClick={() => setLogoutOpen(false)}>← Back</button>
              <button className="btn btn-danger" onClick={() => signOut({ redirectUrl: '/login' })}>Yes, sign out</button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
