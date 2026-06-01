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

  const [searchQuery,  setSearchQuery]  = useState('')
  const [activeFilter, setActiveFilter] = useState('all')
  const [sbCollapsed,  setSbCollapsed]  = useState(false)
  const [profileOpen,  setProfileOpen]  = useState(false)
  const [logoutOpen,   setLogoutOpen]   = useState(false)

  const clinics = useQuery(api.clinics.listClinicsForPatients,
    searchQuery.trim().length >= 2 ? { query: searchQuery } : {},
  )

  const initials = user
    ? `${user.firstName?.[0] ?? ''}${user.lastName?.[0] ?? ''}`.toUpperCase() || 'P'
    : 'P'
  const fullName = user?.fullName ?? 'Patient'

  // ── Capability filter ─────────────────────────────────────────────────────
  const FILTERS = [
    { key: 'all',        label: 'All' },
    { key: 'pacemaker',  label: 'Pacemaker / ICD' },
    { key: 'cochlear',   label: 'Cochlear' },
    { key: 'dbs',        label: 'DBS / Neurostim' },
    { key: 'mri',        label: 'MRI centre' },
    { key: 'orthopaedic',label: 'Orthopaedic' },
  ]

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const filtered = (clinics ?? []).filter((c: any) => {
    if (activeFilter === 'all') return true
    return c.capabilities.some((cap: string) =>
      cap.toLowerCase().includes(activeFilter.toLowerCase())
    )
  })

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
          <a className="sb-link" href="#" title="Documents">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20M4 19.5A2.5 2.5 0 0 0 6.5 22H20V2H6.5A2.5 2.5 0 0 0 4 4.5v15z"/></svg>
            <span>Documents</span>
          </a>

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
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"><path d="M22 16.9A16 16 0 0 1 5.1 2 2 2 0 0 1 7.1 0h3a2 2 0 0 1 2 1.7c.1.9.3 1.8.6 2.7a2 2 0 0 1-.5 2L11 7.6a16 16 0 0 0 6 6l1.2-1.2a2 2 0 0 1 2-.5c.9.3 1.8.5 2.7.6A2 2 0 0 1 22 16.9z"/></svg>
            <span>Emergency info</span>
          </a>

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
          <div style={{ padding: '32px 40px', maxWidth: 860 }}>
            <div style={{ marginBottom: 28 }}>
              <h1 style={{ fontFamily: 'var(--ff)', fontSize: 26, fontWeight: 700, color: 'var(--text)', margin: '0 0 6px' }}>Find a clinic</h1>
              <p style={{ fontFamily: 'var(--fb)', fontSize: 15, color: 'var(--muted)', margin: 0 }}>
                Clinics on the Implant ID network can access your verified record instantly.
              </p>
            </div>

            {/* Search */}
            <div style={{ position: 'relative', marginBottom: 16 }}>
              <svg style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', width: 16, height: 16, color: 'var(--muted2)', pointerEvents: 'none' }}
                viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
                <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
              </svg>
              <input
                className="input"
                type="text"
                placeholder="Search by clinic name, city, or speciality…"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                style={{ paddingLeft: 44, fontSize: 15, height: 46 }}
              />
            </div>

            {/* Filters */}
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 20 }}>
              {FILTERS.map(f => (
                <button key={f.key} type="button"
                  onClick={() => setActiveFilter(f.key)}
                  style={{
                    padding: '6px 14px', borderRadius: 999, cursor: 'pointer', fontFamily: 'var(--ff)', fontSize: 13, fontWeight: 500, transition: 'all .15s',
                    border: `1.5px solid ${activeFilter === f.key ? 'var(--accent)' : 'var(--border)'}`,
                    background: activeFilter === f.key ? 'color-mix(in srgb,var(--accent) 10%,transparent)' : 'transparent',
                    color: activeFilter === f.key ? 'var(--accent-deep)' : 'var(--muted)',
                  }}
                >
                  {f.label}
                </button>
              ))}
            </div>

            {/* Count */}
            {clinics !== undefined && (
              <div style={{ fontFamily: 'var(--ff)', fontSize: 13, color: 'var(--muted)', marginBottom: 16 }}>
                Showing {filtered.length} clinic{filtered.length !== 1 ? 's' : ''}
                {searchQuery.trim() ? ` matching "${searchQuery}"` : ' on the Implant ID network'}
              </div>
            )}

            {/* Results */}
            {clinics === undefined && (
              <div style={{ color: 'var(--muted)', fontSize: 14, padding: '32px 0' }}>Loading clinics…</div>
            )}

            {clinics !== undefined && filtered.length === 0 && (
              <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 14, padding: '48px 24px', textAlign: 'center' }}>
                <div style={{ fontFamily: 'var(--ff)', fontSize: 15, fontWeight: 500, color: 'var(--text)', marginBottom: 6 }}>
                  {searchQuery ? `No clinics found for "${searchQuery}"` : 'No clinics listed yet'}
                </div>
                <p style={{ fontFamily: 'var(--fb)', fontSize: 13.5, color: 'var(--muted)', margin: 0 }}>
                  {searchQuery ? 'Try a different search term or remove the filter.' : 'Clinics will appear here once they join the Implant ID network.'}
                </p>
              </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
              {filtered.map((c: any) => (
                <div key={c._id} style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 14, padding: '18px 22px', display: 'flex', gap: 16 }}>
                  {/* Pin icon */}
                  <div style={{ width: 40, height: 40, borderRadius: 10, background: 'color-mix(in srgb,var(--accent) 10%,transparent)', display: 'grid', placeItems: 'center', flexShrink: 0, marginTop: 2 }}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="1.8">
                      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>
                    </svg>
                  </div>

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontFamily: 'var(--ff)', fontSize: 16, fontWeight: 700, color: 'var(--text)', marginBottom: 3 }}>{c.name}</div>
                    <div style={{ fontFamily: 'var(--fb)', fontSize: 13.5, color: 'var(--muted)', marginBottom: 8 }}>
                      {c.address}{c.city && c.city !== c.address ? `, ${c.city}` : ''}{c.country ? ` · ${c.country}` : ''}
                    </div>

                    {/* Capabilities */}
                    {c.capabilities.length > 0 && (
                      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: c.phone || c.website ? 10 : 0 }}>
                        {c.capabilities.map((cap: string) => (
                          <span key={cap} style={{ fontFamily: 'var(--ff)', fontSize: 11.5, fontWeight: 500, padding: '3px 9px', borderRadius: 6, background: 'var(--bg)', border: '1px solid var(--border)', color: 'var(--text)' }}>
                            {cap}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Contact */}
                    <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', marginTop: 4 }}>
                      {c.phone && (
                        <a href={`tel:${c.phone}`} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontFamily: 'var(--ff)', fontSize: 13, color: 'var(--accent)', textDecoration: 'none' }}>
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M22 16.9A16 16 0 0 1 5.1 2 2 2 0 0 1 7.1 0h3a2 2 0 0 1 2 1.7c.1.9.3 1.8.6 2.7a2 2 0 0 1-.5 2L11 7.6a16 16 0 0 0 6 6l1.2-1.2a2 2 0 0 1 2-.5c.9.3 1.8.5 2.7.6A2 2 0 0 1 22 16.9z"/></svg>
                          {c.phone}
                        </a>
                      )}
                      {c.website && (
                        <a href={c.website} target="_blank" rel="noopener noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontFamily: 'var(--ff)', fontSize: 13, color: 'var(--accent)', textDecoration: 'none' }}>
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="12" cy="12" r="10"/><path d="M2 12h20M12 2a15 15 0 0 1 0 20M12 2a15 15 0 0 0 0 20"/></svg>
                          Website
                        </a>
                      )}
                    </div>
                  </div>

                  {/* Verified badge */}
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', justifyContent: 'flex-start', gap: 8, flexShrink: 0 }}>
                    <span style={{ fontFamily: 'var(--ff)', fontSize: 11, fontWeight: 600, padding: '3px 9px', borderRadius: 6, background: 'color-mix(in srgb,var(--ok) 10%,transparent)', color: 'var(--ok)', border: '1px solid color-mix(in srgb,var(--ok) 25%,transparent)' }}>
                      ✓ Verified
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

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
