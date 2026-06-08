'use client'

import { useState }       from 'react'
import { useQuery }       from 'convex/react'
import { useUser, useClerk } from '@clerk/nextjs'
import { api as apiBase } from '../../../../convex/_generated/api'
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const api = apiBase as any

type Tab = 'dashboard' | 'devices' | 'add' | 'bulk' | 'docs' | 'audit' | 'account'

const MRI_COLOUR: Record<string, string> = {
  safe: 'var(--ok)', conditional: '#d97706', unsafe: 'var(--err)', unknown: 'var(--muted)',
}
function mriLabel(s: string) {
  return s === 'safe' ? 'MR Safe' : s === 'conditional' ? 'MR Conditional' : s === 'unsafe' ? 'MR Unsafe' : 'Unknown'
}
function formatDate(ts: number) {
  return new Date(ts).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

export default function MfrDashboardClient() {
  const { user }  = useUser()
  const { signOut } = useClerk()
  const mfr       = useQuery(api.manufacturers.getMyManufacturer)
  const allDevices = useQuery(
    api.devices.listMyDevices,
    mfr?.companyName ? { manufacturerName: mfr.companyName } : 'skip',
  )

  const [tab,         setTab]         = useState<Tab>('dashboard')
  const [sbCollapsed, setSbCollapsed] = useState(false)
  const [profileOpen, setProfileOpen] = useState(false)
  const [mobOpen,     setMobOpen]     = useState(false)

  const firstName = user?.firstName ?? mfr?.contactName?.split(' ')[0] ?? 'there'
  const initials  = user ? `${user.firstName?.[0] ?? ''}${user.lastName?.[0] ?? ''}`.toUpperCase() || 'M' : 'M'
  const companyName = mfr?.companyName ?? 'Your Company'

  const devices    = allDevices ?? []
  const liveCount  = devices.filter((d: any) => d.status === 'live').length
  const pendingCount = devices.filter((d: any) => d.status === 'pending_review').length
  const recent     = [...devices].sort((a: any, b: any) => b.publishedAt - a.publishedAt).slice(0, 6)

  const SbLink = ({ t, icon, label, pill }: { t: Tab; icon: React.ReactNode; label: string; pill?: number }) => (
    <button className={`sb-link${tab === t ? ' active' : ''}`} onClick={() => { setTab(t); setMobOpen(false) }}>
      {icon} <span>{label}</span>
      {pill ? <span className="pill">{pill}</span> : null}
    </button>
  )

  return (
    <>
      <div className={`sb-back${mobOpen ? ' open' : ''}`} id="sb-back" onClick={() => setMobOpen(false)} />
      <div className={`app${sbCollapsed ? ' collapsed' : ''}`}>

        {/* ── Sidebar ── */}
        <aside className={`sidebar${mobOpen ? ' open' : ''}`}>
          <div className="sb-logo">
            <a href="/" className="logo"><img src="/icon.svg" alt="" /><span className="logo-text"><b>Implant</b><span>ID</span></span></a>
            <button className="sb-toggle" onClick={() => setSbCollapsed(v => !v)} aria-label="Collapse sidebar">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15 18 9 12 15 6"/></svg>
            </button>
          </div>

          <span className="sb-section">Catalogue</span>
          <SbLink t="dashboard" label="Overview" icon={<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>} />
          <SbLink t="devices" label="My devices" pill={devices.length || undefined} icon={<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"><circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/></svg>} />
          <SbLink t="add" label="Add a device" icon={<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"><circle cx="12" cy="12" r="9"/><path d="M12 8v8M8 12h8"/></svg>} />
          <SbLink t="bulk" label="Bulk upload" icon={<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="M17 8l-5-5-5 5M12 3v12"/></svg>} />

          <span className="sb-section">Documents</span>
          <SbLink t="docs" label="IFUs &amp; manuals" icon={<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/></svg>} />
          <SbLink t="audit" label="Audit log" icon={<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>} />

          <span className="sb-section">Account</span>
          <SbLink t="account" label="Settings" icon={<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33h0a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51h0a1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82v0a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>} />

          {/* Profile */}
          <div className="sb-bot" onClick={() => setProfileOpen(v => !v)}>
            <div className="av" style={{ background: 'var(--accent)', color: '#fff', fontFamily: 'var(--ff)', fontSize: 13, fontWeight: 600 }}>{initials}</div>
            <div>
              <div className="name">{companyName}</div>
              <div className="role">{firstName} · Manufacturer</div>
            </div>
            <span className="chev"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="18 15 12 9 6 15"/></svg></span>
          </div>
          {profileOpen && (
            <div className="profile-menu open">
              <button onClick={() => { setTab('account'); setProfileOpen(false) }} style={{ background: 'none', border: 'none', cursor: 'pointer', width: '100%', textAlign: 'left', display: 'flex', alignItems: 'center', gap: 10, padding: '10px 16px', fontFamily: 'var(--fb)', fontSize: 14, color: 'var(--text)' }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" width="16" height="16"><circle cx="12" cy="7" r="4"/><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/></svg>
                Account settings
              </button>
              <hr />
              <button className="danger" onClick={() => signOut({ redirectUrl: '/manufacturer/login' })}
                style={{ background: 'none', border: 'none', cursor: 'pointer', width: '100%', textAlign: 'left', display: 'flex', alignItems: 'center', gap: 10, padding: '10px 16px', fontFamily: 'var(--fb)', fontSize: 14, color: 'var(--err)' }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" width="16" height="16"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
                Sign out
              </button>
            </div>
          )}
        </aside>

        <div className="app-main">

          {/* Mobile header */}
          <div className="mob-header">
            <a href="/manufacturer/dashboard" className="mob-header-logo"><img src="/icon.svg" alt="" /><span className="logo-text"><b>Implant</b><span>ID</span></span></a>
            <div className="mob-hdr-profile">
              <button className="mob-hdr-av" onClick={() => {}} aria-label="Profile">{initials}</button>
            </div>
          </div>

          {/* Top bar */}
          <header className="app-top">
            <button className="sb-burger" onClick={() => setMobOpen(true)} aria-label="Open menu">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
            </button>
            <h1>
              Manufacturer dashboard
              {mfr?.status === 'approved' && (
                <span className="ver-badge">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 6 9 17l-5-5"/></svg>
                  Verified
                </span>
              )}
            </h1>
            <div className="app-top-r">
              <a href="mailto:support@implantid.io" className="btn">Help</a>
              <button className="btn btn-s" onClick={() => setTab('add')}>+ Add device</button>
            </div>
          </header>

          <div className="app-content">

            {/* ── OVERVIEW tab ── */}
            {tab === 'dashboard' && (
              <div>
                <div className="app-h">
                  <div>
                    <h2>Welcome back, {firstName}.</h2>
                    <p className="sub">Here&apos;s how your {companyName} catalogue is performing on Implant ID.</p>
                  </div>
                </div>

                <div className="kpi-row">
                  <div className="kpi">
                    <div className="k">Devices live</div>
                    <div className="v">{liveCount}</div>
                    <div className="delta">Active in catalogue</div>
                  </div>
                  <div className="kpi">
                    <div className="k">Pending review</div>
                    <div className="v">{pendingCount}</div>
                    <div className={`delta${pendingCount > 0 ? ' warn' : ''}`}>{pendingCount > 0 ? 'Awaiting sign-off' : 'All clear'}</div>
                  </div>
                  <div className="kpi">
                    <div className="k">Total submitted</div>
                    <div className="v">{devices.length}</div>
                    <div className="delta">All time</div>
                  </div>
                  <div className="kpi">
                    <div className="k">Clinic lookups (30d)</div>
                    <div className="v">—</div>
                    <div className="delta muted">Tracking in progress</div>
                  </div>
                </div>

                <div className="dev-toolbar">
                  <div><h2 style={{ fontFamily: 'var(--ff)', fontSize: 18, fontWeight: 500, letterSpacing: '-.015em' }}>Recently updated</h2></div>
                  <div className="dev-toolbar-r">
                    <button className="dev-action-btn" onClick={() => setTab('devices')}>View all devices →</button>
                  </div>
                </div>

                {recent.length === 0 ? (
                  <div className="dev-empty">
                    <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="12" y1="12" x2="12" y2="16"/><line x1="10" y1="14" x2="14" y2="14"/></svg>
                    <p>No devices yet</p>
                    <button className="btn btn-s" onClick={() => setTab('add')}>Add your first device</button>
                  </div>
                ) : (
                  <div className="dev-tbl dev-tbl-ov">
                    <table>
                      <thead><tr><th>Device</th><th>Type</th><th>Field strengths</th><th>Status</th><th>Submitted</th><th></th></tr></thead>
                      <tbody>
                        {(recent as any[]).map(d => (
                          <tr key={d._id} style={{ cursor: 'pointer' }} onClick={() => setTab('devices')}>
                            <td>
                              <div className="dev-name">{d.deviceType || d.manufacturer}</div>
                              <div className="dev-models">{d.model} · {d.manufacturer}</div>
                            </td>
                            <td>{d.deviceType || '—'}</td>
                            <td>{d.fieldStrengths || '—'}</td>
                            <td>
                              <span className={`dev-status ${d.status === 'live' ? 'ok' : d.status === 'pending_review' ? 'warn' : 'draft'}`}>
                                {d.status === 'live' && <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M20 6 9 17l-5-5"/></svg>}
                                {d.status === 'pending_review' && <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>}
                                {d.status === 'live' ? 'Live' : d.status === 'pending_review' ? 'Pending 24h' : 'Draft'}
                              </span>
                            </td>
                            <td>{formatDate(d.publishedAt)}</td>
                            <td><button className="dev-action-btn">Edit</button></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* ── MY DEVICES tab ── */}
            {tab === 'devices' && (
              <div>
                <div className="app-h">
                  <div><h2>My devices</h2><p className="sub">Every device you&apos;ve published or have in draft. Click any row to edit safety data, attach manuals, or mark a recall.</p></div>
                  <button className="btn btn-s" onClick={() => setTab('add')}>+ Add a device</button>
                </div>
                <div className="dev-tbl">
                  <table>
                    <thead><tr><th>Device</th><th>Type</th><th>MRI class</th><th>Fields</th><th>Status</th><th>Submitted</th><th></th></tr></thead>
                    <tbody>
                      {devices.length === 0 ? (
                        <tr><td colSpan={7} style={{ textAlign: 'center', color: 'var(--muted)', padding: '32px' }}>No devices yet.</td></tr>
                      ) : (devices as any[]).map(d => (
                        <tr key={d._id}>
                          <td>
                            <div className="dev-name">{d.deviceType || d.manufacturer}</div>
                            <div className="dev-models">{d.model}</div>
                          </td>
                          <td>{d.deviceType || '—'}</td>
                          <td style={{ fontFamily: 'var(--ff)', fontWeight: 600, fontSize: 12.5, color: MRI_COLOUR[d.mriStatus ?? 'unknown'] }}>{mriLabel(d.mriStatus ?? 'unknown')}</td>
                          <td>{d.fieldStrengths || '—'}</td>
                          <td><span className={`dev-status ${d.status === 'live' ? 'ok' : d.status === 'pending_review' ? 'warn' : 'draft'}`}>{d.status === 'live' ? 'Live' : d.status === 'pending_review' ? 'Pending' : 'Draft'}</span></td>
                          <td>{formatDate(d.publishedAt)}</td>
                          <td><button className="dev-action-btn icon" title="Edit"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg></button></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* ── ADD DEVICE tab — links to the real bulk uploader form ── */}
            {tab === 'add' && (
              <div>
                <div className="app-h"><div><h2>Add a new device</h2><p className="sub">Submit a single device safety profile, or use bulk upload for large catalogues.</p></div></div>
                <div style={{ display: 'flex', gap: 16 }}>
                  <a href="/manufacturer/devices/add" className="btn btn-s" style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 7 }}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                    Add single device
                  </a>
                  <a href="/manufacturer/devices/bulk" className="btn" style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 7 }}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
                    Bulk upload (CSV/Excel)
                  </a>
                </div>
              </div>
            )}

            {/* ── BULK UPLOAD tab ── */}
            {tab === 'bulk' && (
              <div>
                <div className="app-h"><div><h2>Bulk upload</h2><p className="sub">Import your full catalogue from a CSV or Excel file.</p></div></div>
                <a href="/manufacturer/devices/bulk" className="btn btn-s" style={{ textDecoration: 'none' }}>Open bulk uploader →</a>
              </div>
            )}

            {/* ── DOCS tab ── */}
            {tab === 'docs' && (
              <div>
                <div className="app-h"><div><h2>IFUs &amp; manuals</h2><p className="sub">Source documents across your device catalogue.</p></div></div>
                <div className="dev-tbl">
                  <table>
                    <thead><tr><th>File</th><th>Device</th><th>Type</th><th>Uploaded</th><th></th></tr></thead>
                    <tbody>
                      <tr><td colSpan={5} style={{ textAlign: 'center', color: 'var(--muted)', padding: '32px', fontSize: 13 }}>Documents are attached to individual devices. Go to My Devices and click Edit to attach a PDF.</td></tr>
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* ── AUDIT tab ── */}
            {tab === 'audit' && (
              <div>
                <div className="app-h"><div><h2>Audit log</h2><p className="sub">Every action on your manufacturer account. Read-only.</p></div></div>
                <div className="dev-tbl">
                  <table>
                    <thead><tr><th>When</th><th>Who</th><th>Action</th><th>Device / file</th></tr></thead>
                    <tbody>
                      <tr><td colSpan={4} style={{ textAlign: 'center', color: 'var(--muted)', padding: '32px', fontSize: 13 }}>Audit logging coming soon.</td></tr>
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* ── ACCOUNT tab ── */}
            {tab === 'account' && (
              <div>
                <div className="app-h"><div><h2>Settings</h2><p className="sub">Company profile and verified-manufacturer status.</p></div></div>
                <div className="form-card">
                  <div className="form-grid">
                    <div className="field"><label>Company name</label><input className="input" defaultValue={mfr?.companyName ?? ''} readOnly /></div>
                    <div className="field"><label>Country</label><input className="input" defaultValue={mfr?.country ?? ''} readOnly /></div>
                    <div className="field"><label>Contact email</label><input className="input" defaultValue={mfr?.contactEmail ?? ''} readOnly /></div>
                    <div className="field"><label>Manufacturer-verified status</label><input className="input" value={mfr?.status === 'approved' ? '✓ Verified' : 'Pending approval'} readOnly style={{ color: mfr?.status === 'approved' ? 'var(--ok)' : '#d97706' }} /></div>
                  </div>
                  <div style={{ marginTop: 20 }}>
                    <button className="btn btn-danger" onClick={() => signOut({ redirectUrl: '/manufacturer/login' })}>Sign out</button>
                  </div>
                </div>
              </div>
            )}

          </div>
        </div>
      </div>

      {/* Mobile nav */}
      <nav className="mob-nav" aria-label="Mobile navigation">
        <div className="mob-nav-tabs">
          {[
            { t: 'dashboard' as Tab, label: 'Overview', icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg> },
            { t: 'devices' as Tab, label: 'Devices', icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"><circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/></svg> },
            { t: 'add' as Tab, label: 'Add', icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"><circle cx="12" cy="12" r="9"/><path d="M12 8v8M8 12h8"/></svg> },
            { t: 'docs' as Tab, label: 'Docs', icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/></svg> },
          ].map(({ t, label, icon }) => (
            <button key={t} className={`mob-nav-tab${tab === t ? ' active' : ''}`} onClick={() => setTab(t)} aria-label={label}>
              {icon}<span className="t">{label}</span>
            </button>
          ))}
          <button className="mob-nav-tab mob-nav-menu-btn" onClick={() => setMobOpen(v => !v)} aria-label="Toggle menu">
            <div className="ham-ic"><span /><span /><span /></div>
            <span className="t">Menu</span>
          </button>
        </div>
      </nav>
    </>
  )
}
