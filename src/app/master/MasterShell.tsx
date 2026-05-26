'use client'

interface MasterShellProps {
  pathname: string
  children: React.ReactNode
}

interface NavItem {
  label: string
  href: string
  icon: React.ReactNode
  badge?: string
}

interface NavSection {
  title: string
  items: NavItem[]
}

function pageTitleFromPathname(pathname: string): string {
  if (pathname.startsWith('/master/applications'))  return 'Pending Approvals'
  if (pathname.startsWith('/master/clinics'))       return 'Clinics'
  if (pathname.startsWith('/master/devices/add'))   return 'Add Device'
  if (pathname.startsWith('/master/devices/bulk'))  return 'Bulk Upload'
  if (pathname.startsWith('/master/devices'))       return 'Devices'
  if (pathname.startsWith('/master/patients'))      return 'Patients'
  if (pathname.startsWith('/master/manufacturers')) return 'Manufacturers'
  if (pathname.startsWith('/master/settings'))      return 'Settings'
  return 'Dashboard'
}

export default function MasterShell({ pathname, children }: MasterShellProps) {
  const topLinks: NavItem[] = [
    {
      label: 'Overview',
      href: '/master/dashboard',
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
          <rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/>
          <rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>
        </svg>
      ),
    },
  ]

  const sections: NavSection[] = [
    {
      title: 'Clinics',
      items: [
        {
          label: 'All Clinics',
          href: '/master/clinics',
          icon: (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
              <path d="M3 21h18M3 10h18M5 6l7-3 7 3M4 10v11M20 10v11M8 14v3M12 14v3M16 14v3"/>
            </svg>
          ),
        },
        {
          label: 'Pending Approvals',
          href: '/master/applications',
          badge: '3',
          icon: (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
              <path d="M9 12l2 2 4-4"/>
              <path d="M21 12c0 4.97-4.03 9-9 9s-9-4.03-9-9 4.03-9 9-9c1.27 0 2.48.26 3.58.73"/>
              <path d="M16 5l3 3-3 3"/>
            </svg>
          ),
        },
      ],
    },
    {
      title: 'Devices',
      items: [
        {
          label: 'All Devices',
          href: '/master/devices',
          icon: (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
              <rect x="2" y="7" width="20" height="14" rx="2"/>
              <path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/>
              <line x1="12" y1="12" x2="12" y2="16"/>
              <line x1="10" y1="14" x2="14" y2="14"/>
            </svg>
          ),
        },
        {
          label: 'Add Device',
          href: '/master/devices/add',
          icon: (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
              <circle cx="12" cy="12" r="10"/>
              <line x1="12" y1="8" x2="12" y2="16"/>
              <line x1="8" y1="12" x2="16" y2="12"/>
            </svg>
          ),
        },
        {
          label: 'Bulk Upload',
          href: '/master/devices/bulk',
          icon: (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
              <polyline points="16 16 12 12 8 16"/>
              <line x1="12" y1="12" x2="12" y2="21"/>
              <path d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3"/>
            </svg>
          ),
        },
      ],
    },
    {
      title: 'Users',
      items: [
        {
          label: 'All Patients',
          href: '/master/patients',
          icon: (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
              <circle cx="9" cy="7" r="4"/>
              <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
              <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
            </svg>
          ),
        },
        {
          label: 'Manufacturers',
          href: '/master/manufacturers',
          icon: (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
              <path d="M2 20h20M4 20V10l8-6 8 6v10"/>
              <rect x="9" y="14" width="6" height="6"/>
            </svg>
          ),
        },
      ],
    },
  ]

  const pageTitle = pageTitleFromPathname(pathname)

  function isActive(href: string) {
    if (href === '/master/dashboard') return pathname === '/master/dashboard'
    return pathname.startsWith(href)
  }

  return (
    <div className="app">
      <aside className="sidebar">
        {/* Logo */}
        <div className="sb-logo">
          <a href="/master/dashboard" className="logo" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 10 }}>
            <img src="/icon.svg" alt="Implant ID" />
            <span className="logo-text" style={{ fontFamily: 'var(--ff)', fontWeight: 700, fontSize: 17, color: 'var(--text)' }}>
              <b>Implant</b>ID
            </span>
          </a>
        </div>

        {/* Top-level links */}
        {topLinks.map(item => (
          <a
            key={item.href}
            href={item.href}
            className={`sb-link${isActive(item.href) ? ' active' : ''}`}
            aria-current={isActive(item.href) ? 'page' : undefined}
          >
            {item.icon}
            <span>{item.label}</span>
          </a>
        ))}

        {/* Nav sections */}
        {sections.map(section => (
          <div key={section.title}>
            <span className="sb-section">{section.title}</span>
            {section.items.map(item => (
              <a
                key={item.href}
                href={item.href}
                className={`sb-link${isActive(item.href) ? ' active' : ''}`}
                aria-current={isActive(item.href) ? 'page' : undefined}
              >
                {item.icon}
                <span>{item.label}</span>
                {item.badge && <span className="pill">{item.badge}</span>}
              </a>
            ))}
          </div>
        ))}

        {/* Settings link */}
        <a href="/master/settings"
          className={`sb-link${pathname.startsWith('/master/settings') ? ' active' : ''}`}
          style={{ marginTop: 'auto' }}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
            <circle cx="12" cy="12" r="3"/>
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
          </svg>
          <span>Settings</span>
        </a>

        {/* Bottom user section */}
        <div className="sb-bot">
          <div className="av">MA</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="name">Master Admin</div>
            <div className="role">Implant ID</div>
          </div>
        </div>
      </aside>

      {/* Main area — sidebar is fixed at 236px so we add margin */}
      <div style={{ marginLeft: 236, minHeight: '100vh', display: 'flex', flexDirection: 'column', flex: 1 }}>
        {/* Topbar */}
        <div className="m-top">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span className="m-top-title">{pageTitle}</span>
            <span className="m-badge">Master</span>
          </div>
          <div className="m-top-r">
            {/* Bell */}
            <button className="m-icon-btn" aria-label="Notifications">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
                <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
              </svg>
            </button>
            {/* Gear */}
            <button className="m-icon-btn" aria-label="Settings">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
                <circle cx="12" cy="12" r="3"/>
                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
              </svg>
            </button>
            {/* Sign out */}
            <a href="/master/login" className="m-signout" aria-label="Sign out">Sign out</a>
          </div>
        </div>

        {/* Page content */}
        <main style={{ flex: 1 }}>
          {children}
        </main>
      </div>
    </div>
  )
}
