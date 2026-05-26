'use client'

import { useState, useEffect } from 'react'
import { useClerk } from '@clerk/nextjs'

interface MasterShellProps {
  pathname: string
  children: React.ReactNode
}

function pageTitleFromPathname(pathname: string): string {
  if (pathname.startsWith('/master/applications'))  return 'Pending Approvals'
  if (pathname.startsWith('/master/clinics'))        return 'Clinics'
  if (pathname.startsWith('/master/devices/add'))    return 'Add Device'
  if (pathname.startsWith('/master/devices/bulk'))   return 'Bulk Upload'
  if (pathname.startsWith('/master/devices'))        return 'Devices'
  if (pathname.startsWith('/master/patients'))       return 'Patients'
  if (pathname.startsWith('/master/manufacturers'))  return 'Manufacturers'
  if (pathname.startsWith('/master/settings'))       return 'Settings'
  if (pathname.startsWith('/master/audit'))          return 'Audit Log'
  return 'Dashboard'
}

export default function MasterShell({ pathname, children }: MasterShellProps) {
  const { signOut } = useClerk()
  const [collapsed, setCollapsed] = useState(false)
  const [notifOpen, setNotifOpen]   = useState(false)
  const [profileOpen, setProfileOpen] = useState(false)

  // Close profile menu on any outside click
  useEffect(() => {
    function handleOutside() { setProfileOpen(false) }
    document.addEventListener('click', handleOutside)
    return () => document.removeEventListener('click', handleOutside)
  }, [])

  function isActive(href: string) {
    if (href === '/master/dashboard') return pathname === '/master/dashboard'
    return pathname.startsWith(href)
  }

  function isDevicesRoot() {
    return pathname === '/master/devices'
  }

  const pageTitle = pageTitleFromPathname(pathname)

  async function handleSignOut() {
    await signOut({ redirectUrl: '/master/login' })
  }

  return (
    <div className={`app${collapsed ? ' collapsed' : ''}`}>

      {/* ── Notifications backdrop ── */}
      <div
        className={`notif-back${notifOpen ? ' open' : ''}`}
        onClick={() => setNotifOpen(false)}
      />

      {/* ── Sidebar ── */}
      <aside className="sidebar">

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
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="15 18 9 12 15 6"/>
            </svg>
          </button>
        </div>

        {/* Overview */}
        <a
          href="/master/dashboard"
          className={`sb-link${isActive('/master/dashboard') ? ' active' : ''}`}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
            <rect x="3" y="3" width="7" height="7" rx="1"/>
            <rect x="14" y="3" width="7" height="7" rx="1"/>
            <rect x="3" y="14" width="7" height="7" rx="1"/>
            <rect x="14" y="14" width="7" height="7" rx="1"/>
          </svg>
          <span>Overview</span>
        </a>

        {/* ── Users ── */}
        <span className="sb-section">Users</span>

        <a
          href="/master/patients"
          className={`sb-link${isActive('/master/patients') ? ' active' : ''}`}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
            <circle cx="9" cy="7" r="4"/>
            <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
            <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
          </svg>
          <span>Patients</span>
        </a>

        <a
          href="/master/clinics"
          className={`sb-link${isActive('/master/clinics') || isActive('/master/applications') ? ' active' : ''}`}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
            <path d="M3 21h18M3 10h18M5 6l7-3 7 3M4 10v11M20 10v11M8 14v3M12 14v3M16 14v3"/>
          </svg>
          <span>Clinics</span>
          <span className="pill">3</span>
        </a>

        <a
          href="/master/manufacturers"
          className={`sb-link${isActive('/master/manufacturers') ? ' active' : ''}`}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
            <path d="M2 20h20M4 20V10l8-6 8 6v10"/>
            <rect x="9" y="14" width="6" height="6"/>
          </svg>
          <span>Manufacturers</span>
        </a>

        {/* ── Devices ── */}
        <span className="sb-section">Devices</span>

        <a
          href="/master/devices"
          className={`sb-link${isDevicesRoot() ? ' active' : ''}`}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
            <circle cx="11" cy="11" r="7"/>
            <path d="m21 21-4.3-4.3"/>
          </svg>
          <span>All Devices</span>
        </a>

        <a
          href="/master/devices/add"
          className={`sb-link${isActive('/master/devices/add') ? ' active' : ''}`}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
            <circle cx="12" cy="12" r="9"/>
            <path d="M12 8v8M8 12h8"/>
          </svg>
          <span>Add Device</span>
        </a>

        <a
          href="/master/devices/bulk"
          className={`sb-link${isActive('/master/devices/bulk') ? ' active' : ''}`}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
            <path d="M17 8l-5-5-5 5M12 3v12"/>
          </svg>
          <span>Bulk Upload</span>
        </a>

        {/* ── Admin ── */}
        <span className="sb-section">Admin</span>

        <a
          href="/master/audit"
          className={`sb-link${isActive('/master/audit') ? ' active' : ''}`}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
            <circle cx="12" cy="12" r="9"/>
            <path d="M12 7v5l3 2"/>
          </svg>
          <span>Audit Log</span>
        </a>

        {/* Notifications */}
        <button
          className="sb-link"
          onClick={(e) => { e.stopPropagation(); setNotifOpen(true) }}
          aria-label="Notifications"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
            <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
          </svg>
          <span>Notifications</span>
          <span className="pill">2</span>
        </button>

        {/* Settings */}
        <a
          href="/master/settings"
          className={`sb-link${isActive('/master/settings') ? ' active' : ''}`}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
            <circle cx="12" cy="12" r="3"/>
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
          </svg>
          <span>Settings</span>
        </a>

        {/* ── User profile ── */}
        <div
          className="sb-bot"
          onClick={(e) => { e.stopPropagation(); setProfileOpen(p => !p) }}
        >
          <div className="av">MA</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="name">Master Admin</div>
            <div className="role">Implant ID</div>
          </div>
          <span className="chev">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="18 15 12 9 6 15"/>
            </svg>
          </span>
        </div>

        {/* Profile popup */}
        <div className={`profile-menu${profileOpen ? ' open' : ''}`}>
          <a href="/master/settings">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
              <circle cx="12" cy="7" r="4"/>
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
            </svg>
            Account settings
          </a>
          <hr />
          <button className="danger" onClick={handleSignOut}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
              <polyline points="16 17 21 12 16 7"/>
              <line x1="21" y1="12" x2="9" y2="12"/>
            </svg>
            Sign out
          </button>
        </div>

      </aside>

      {/* ── Main area ── */}
      <div className="app-main">

        {/* Topbar */}
        <header className="app-top">
          <h1>
            {pageTitle}
            <span className="m-badge">Master</span>
          </h1>
          <div className="app-top-r">
            {/* Notifications bell */}
            <button
              className="ibtn notif-btn"
              aria-label="Notifications"
              onClick={(e) => { e.stopPropagation(); setNotifOpen(true) }}
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
                <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
              </svg>
            </button>
            {/* Sign out */}
            <button className="btn" onClick={handleSignOut} style={{ fontSize: 13 }}>
              Sign out
            </button>
          </div>
        </header>

        {/* Page content */}
        <main style={{ flex: 1 }}>
          {children}
        </main>

      </div>

      {/* ── Notifications drawer ── */}
      <aside className={`notif-drawer${notifOpen ? ' open' : ''}`} aria-label="Notifications">
        <div className="notif-h">
          <h3>Notifications</h3>
          <button className="x" onClick={() => setNotifOpen(false)}>✕</button>
        </div>
        <div className="notif-list">
          <div className="notif-item unread">
            <div className="notif-ic warn">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
                <circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>
              </svg>
            </div>
            <div>
              <b>New clinic application · Harley Street</b>
              <p>Submitted 24 May 2026. Awaiting your review.</p>
              <div className="t">Just now · Applications</div>
            </div>
          </div>
          <div className="notif-item unread">
            <div className="notif-ic warn">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
                <circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>
              </svg>
            </div>
            <div>
              <b>Device pending review · Nucleus 7</b>
              <p>Submitted 18 May 2026. Awaiting sign-off.</p>
              <div className="t">2 hours ago · Devices</div>
            </div>
          </div>
          <div className="notif-item">
            <div className="notif-ic ok">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                <path d="m9 12 2 2 4-4"/>
              </svg>
            </div>
            <div>
              <b>Manchester Orthopaedics approved</b>
              <p>Clinic is now active on the platform.</p>
              <div className="t">2 hours ago · Clinics</div>
            </div>
          </div>
        </div>
        <div className="notif-foot">
          <a href="#">Mark all as read</a>
          <a href="/master/settings">Settings</a>
        </div>
      </aside>

    </div>
  )
}
