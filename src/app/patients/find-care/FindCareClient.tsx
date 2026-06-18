'use client'

import { useState }        from 'react'
import { useQuery }        from 'convex/react'
import { useUser, useClerk } from '@clerk/nextjs'
import { useRouter }       from 'next/navigation'
import { api }             from '../../../../convex/_generated/api'

export default function FindCareClient() {
  // ── All hooks unconditionally at top ─────────────────────────────────────
  const { user }     = useUser()
  const { signOut }  = useClerk()
  const router       = useRouter()

  const [searchQuery,    setSearchQuery]    = useState('')
  const [activeFilter,   setActiveFilter]   = useState('all')
  const [sbCollapsed,    setSbCollapsed]    = useState(false)
  const [profileOpen,    setProfileOpen]    = useState(false)
  const [logoutOpen,     setLogoutOpen]     = useState(false)
  const [notifOpen,      setNotifOpen]      = useState(false)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [selectedClinic, setSelectedClinic] = useState<any | null>(null)

  const clinics = useQuery(api.clinics.listClinicsForPatients,
    searchQuery.trim().length >= 2 ? { query: searchQuery } : {},
  )
  const notifications = useQuery(api.patients.getMyNotifications)

  const initials = user
    ? `${user.firstName?.[0] ?? ''}${user.lastName?.[0] ?? ''}`.toUpperCase() || 'P'
    : 'P'
  const fullName = user?.fullName ?? 'Patient'

  // ── Capability filter ─────────────────────────────────────────────────────
  const FILTERS = [
    { key: 'all',         label: 'All' },
    { key: 'pacemaker',   label: 'Pacemaker / ICD' },
    { key: 'cochlear',    label: 'Cochlear' },
    { key: 'dbs',         label: 'DBS / Neurostim' },
    { key: 'scs',         label: 'Spinal Cord' },
    { key: 'mri',         label: 'MRI Centre' },
    { key: 'orthopaedic', label: 'Orthopaedic' },
  ]

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const filtered = (clinics ?? []).filter((c: any) => {
    if (activeFilter === 'all') return true
    return c.capabilities.some((cap: string) =>
      cap.toLowerCase().includes(activeFilter.toLowerCase())
    )
  })

  // ── Map helpers ───────────────────────────────────────────────────────────
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function mapSrc(clinic: any | null) {
    if (!clinic) {
      // UK overview when nothing is selected
      return `https://maps.google.com/maps?q=United+Kingdom&output=embed&z=5`
    }
    const parts = [clinic.name, clinic.address, clinic.city, clinic.country].filter(Boolean)
    const q = encodeURIComponent(parts.join(', '))
    return `https://maps.google.com/maps?q=${q}&output=embed`
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function directionsUrl(clinic: any) {
    return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(clinic.name + (clinic.address ? ' ' + clinic.address : ''))}`
  }

  return (
    <>
      <div className="sb-back" id="sb-back" />
      <div className={`app${sbCollapsed ? ' collapsed' : ''}`}>

        {/* ── Sidebar ── */}
        <aside className="sidebar">
          <div className="sb-logo">
            <a href="/" className="logo">
              <img src="/icon.svg" alt="" />
              <span className="logo-text"><b>Implant</b><span>ID</span></span>
            </a>
            <button className="sb-toggle" onClick={() => setSbCollapsed(c => !c)} aria-label="Collapse sidebar">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15 18 9 12 15 6"/></svg>
            </button>
          </div>

          <span className="sb-section">My record</span>
          <a className="sb-link" href="/patients/dashboard" title="My record">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"><rect x="3" y="3" width="7" height="9" rx="1.5"/><rect x="14" y="3" width="7" height="5" rx="1.5"/><rect x="14" y="12" width="7" height="9" rx="1.5"/><rect x="3" y="16" width="7" height="5" rx="1.5"/></svg>
            <span>My record</span>
          </a>
          <a className="sb-link" href="/patients/share" title="Share with clinic">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><path d="M16 6l-4-4-4 4M12 2v13"/></svg>
            <span>Share with clinic</span>
          </a>
          <button type="button" className="sb-link" onClick={() => router.push('/patients/dashboard?section=documents')} title="Documents" style={{ background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'none' }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20M4 19.5A2.5 2.5 0 0 0 6.5 22H20V2H6.5A2.5 2.5 0 0 0 4 4.5v15z"/></svg>
            <span>Documents</span>
          </button>

          <span className="sb-section">Find care</span>
          <a className="sb-link active" href="/patients/find-care" title="Find a clinic">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
            <span>Find a clinic</span>
          </a>

          <span className="sb-section">Account</span>
          <a className="sb-link" href="/patients/account" title="Account settings">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33h0a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51h0a1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82v0a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
            <span>Account settings</span>
          </a>
          <a className="sb-link" href="/patients/emergency" title="Emergency info">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.8 19.8 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.8 19.8 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.91.34 1.85.57 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
            <span>Emergency info</span>
          </a>
          <button className="sb-notif" aria-label="Notifications" title="Notifications"
            onClick={e => { e.stopPropagation(); setNotifOpen(true) }}>
            <span className="sb-notif-ic">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
                <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
              </svg>
              <span className="dot" />
            </span>
            <span className="label">Notifications</span>
            <span className="count">{notifications?.filter((n: {read: boolean}) => !n.read).length || 0}</span>
          </button>

          {/* Profile */}
          <div
            className="sb-bot"
            onClick={() => setProfileOpen(v => !v)}
          >
            <div className="av" style={{ background: 'var(--accent)', color: '#fff', fontFamily: 'var(--ff)', fontSize: 13, fontWeight: 600 }}>{initials}</div>
            <div>
              <div className="name">{fullName}</div>
              <div className="role">Patient</div>
            </div>
          </div>
          {profileOpen && (
            <div className="profile-menu open">
              <a href="/patients/account"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"><circle cx="12" cy="7" r="4"/><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/></svg>My account</a>
              <hr />
              <button className="danger" onClick={() => { setProfileOpen(false); setLogoutOpen(true) }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
                Sign out
              </button>
            </div>
          )}
        </aside>

        {/* ── Main content ── */}
        <div className="app-main">
          <nav className="mob-nav" aria-label="Mobile navigation">
            <div className="mob-nav-tabs">
              <a href="/patients/dashboard" className="mob-nav-tab" aria-label="My record">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"><rect x="3" y="3" width="7" height="9" rx="1.5"/><rect x="14" y="3" width="7" height="5" rx="1.5"/><rect x="14" y="12" width="7" height="9" rx="1.5"/><rect x="3" y="16" width="7" height="5" rx="1.5"/></svg>
                <span className="t">Record</span>
              </a>
              <a href="/patients/share" className="mob-nav-tab" aria-label="Share with clinic">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><path d="M16 6l-4-4-4 4M12 2v13"/></svg>
                <span className="t">Share</span>
              </a>
              <a href="/patients/find-care" className="mob-nav-tab active" aria-label="Find a clinic">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
                <span className="t">Find</span>
              </a>
              <a href="/patients/account" className="mob-nav-tab" aria-label="Account">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"><circle cx="12" cy="7" r="4"/><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/></svg>
                <span className="t">Account</span>
              </a>
              <button className="mob-nav-tab mob-nav-menu-btn" aria-label="Toggle menu" onClick={() => setSbCollapsed(v => !v)}>
                <div className="ham-ic"><span /><span /><span /></div>
                <span className="t">Menu</span>
              </button>
            </div>
          </nav>

          <div className="fc-layout">
            {/* Left panel — search and clinic list */}
            <div className="fc-panel">
              <div className="fc-panel-hd">
                <h1>Find a clinic</h1>
                <p>Clinics on the Implant ID network can pull up your record instantly.</p>
              </div>

              <div className="fc-search">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
                  <circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/>
                </svg>
                <input
                  type="text"
                  placeholder="Search by name, city, or postcode"
                  id="fc-q"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                />
              </div>

              <div className="fc-filters">
                {FILTERS.map(f => (
                  <button
                    key={f.key}
                    className={`fc-chip${activeFilter === f.key ? ' on' : ''}`}
                    onClick={() => setActiveFilter(f.key)}
                  >
                    {f.label}
                  </button>
                ))}
              </div>

              <div className="fc-count">
                Showing {filtered.length} clinic{filtered.length !== 1 ? 's' : ''} on the network
              </div>

              <div className="fc-list">
                {clinics === undefined && (
                  <div style={{ padding: '24px', textAlign: 'center', color: 'var(--muted)' }}>
                    Loading clinics…
                  </div>
                )}

                {clinics !== undefined && filtered.length === 0 && (
                  <div style={{ padding: '24px', textAlign: 'center' }}>
                    <div style={{ fontWeight: 500, color: 'var(--text)', marginBottom: 4 }}>
                      {searchQuery ? 'No clinics found' : 'No clinics yet'}
                    </div>
                    <p style={{ color: 'var(--muted)', margin: 0, fontSize: 12 }}>
                      {searchQuery ? 'Try a different search' : 'Coming soon'}
                    </p>
                  </div>
                )}

                {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                {filtered.map((c: any) => (
                  <div
                    key={c._id}
                    className={`fc-item${selectedClinic?._id === c._id ? ' selected' : ''}`}
                    onClick={() => setSelectedClinic(c)}
                  >
                    <div className="fc-pin">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
                        <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>
                      </svg>
                    </div>
                    <div>
                      <h3>{c.name}</h3>
                      <div className="addr">{c.address}{c.city && c.city !== c.address ? `, ${c.city}` : ''}</div>
                      {c.mriBookingsPhone && (
                        <div className="fc-book">
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" width="12" height="12">
                            <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.8 19.8 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.8 19.8 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.91.34 1.85.57 2.81.7A2 2 0 0 1 22 16.92z"/>
                          </svg>
                          MRI Bookings: {c.mriBookingsPhone}
                        </div>
                      )}
                      <div className="tags">
                        {c.capabilities && c.capabilities.some((cap: string) => cap.toLowerCase().includes('mri')) && <span className="fc-tag mri">MRI centre</span>}
                        {c.capabilities && c.capabilities.length > 0 && (
                          <>
                            {c.capabilities.map((cap: string) => {
                              const capKey = cap.toLowerCase().replace(/[\s/-]/g, '')
                              return <span key={cap} className={`fc-tag cap-${capKey}`}>{cap}</span>
                            })}
                          </>
                        )}
                      </div>
                    </div>
                    <div className="dist">0.8 mi</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Right panel — map */}
            <div className="fc-map">
              <iframe
                src={mapSrc(selectedClinic)}
                allowFullScreen
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Notification drawer */}
      <div className={`notif-back${notifOpen ? ' open' : ''}`} onClick={() => setNotifOpen(false)} />
      <aside className={`notif-drawer${notifOpen ? ' open' : ''}`} aria-label="Notifications">
        <div className="notif-h">
          <h3>Updates</h3>
          <button className="x" onClick={() => setNotifOpen(false)}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>
        <div className="notif-list">
          {!notifications || notifications.length === 0 ? (
            <div style={{ padding: '20px 16px', textAlign: 'center', color: 'var(--muted)', fontSize: 13 }}>No notifications</div>
          ) : (notifications as {_id: string, title: string, body: string, read: boolean, createdAt: number}[]).map(n => (
            <div key={n._id} style={{ padding: '14px 16px', borderBottom: '1px solid var(--border)', borderLeft: n.read ? '3px solid transparent' : '3px solid var(--accent)', background: n.read ? 'transparent' : 'color-mix(in srgb,var(--accent) 5%,transparent)', display: 'flex', alignItems: 'flex-start', gap: 10 }}>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
                  <span style={{ fontFamily: 'var(--ff)', fontSize: 13.5, fontWeight: n.read ? 400 : 600, color: 'var(--text)' }}>{n.title}</span>
                  {!n.read && <span style={{ fontFamily: 'var(--ff)', fontSize: 10, fontWeight: 700, letterSpacing: '.4px', textTransform: 'uppercase', color: 'var(--accent)', background: 'color-mix(in srgb,var(--accent) 12%,transparent)', borderRadius: 4, padding: '2px 6px' }}>New</span>}
                </div>
                <div style={{ fontSize: 12.5, color: 'var(--muted)', lineHeight: 1.5 }}>{n.body}</div>
                <div style={{ fontSize: 11.5, color: 'var(--muted2)', marginTop: 4 }}>{new Date(n.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</div>
              </div>
            </div>
          ))}
        </div>
        <div className="notif-foot">
          <a href="/patients/account">Notification settings</a>
        </div>
      </aside>

      {/* Logout modal */}
      {logoutOpen && (
        <div className="logout-back open" onClick={() => setLogoutOpen(false)}>
          <div className="logout-modal" onClick={e => e.stopPropagation()}>
            <div className="logout-body">
              <h3>Log out of Implant ID?</h3>
              <p>You&apos;ll need to sign back in to access your implant record.</p>
            </div>
            <div className="logout-actions">
              <button className="btn" onClick={() => setLogoutOpen(false)}>← Back</button>
              <button className="btn btn-danger" onClick={() => signOut({ redirectUrl: '/login' })}>Yes, log out</button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
