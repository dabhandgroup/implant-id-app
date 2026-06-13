'use client'

import { useState, useRef }  from 'react'
import { useRouter }          from 'next/navigation'
import { useUser }            from '@clerk/nextjs'
import { useQuery }           from 'convex/react'
import { api as apiBase }     from '../../../../convex/_generated/api'
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const api = apiBase as any

function timeAgo(ts: number): string {
  const diff  = Date.now() - ts
  const mins  = Math.floor(diff / 60_000)
  const hours = Math.floor(diff / 3_600_000)
  const days  = Math.floor(diff / 86_400_000)
  if (mins  < 1)  return 'just now'
  if (mins  < 60) return `${mins}m ago`
  if (hours < 24) return `${hours}h ago`
  if (days  < 7)  return `${days}d ago`
  return new Date(ts).toLocaleDateString('en-GB', { day:'2-digit', month:'short' })
}

export default function ClinicDashboardClient() {
  const router = useRouter()
  const { user } = useUser()

  const stats           = useQuery(api.clinics.getClinicStats)
  const recentLookups   = useQuery(api.clinics.getRecentLookups)
  const todayCount      = useQuery(api.clinics.getTodayLookupCount)
  const deviceCount     = useQuery(api.devices.getDeviceCount)
  const clinicPatients  = useQuery(api.clinics.listClinicPatients)

  const [query, setQuery] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  const firstName = user?.firstName ?? user?.fullName?.split(' ')[0] ?? 'there'
  const flagged   = (clinicPatients ?? []).filter((p: any) => p.verificationStatus !== 'active').slice(0, 5)

  function handleSearch(e: React.FormEvent) {
    e.preventDefault()
    const q = query.trim()
    if (q) router.push(`/clinics/all-patients?q=${encodeURIComponent(q)}`)
  }

  return (
    <div className="m-content">

      {/* ── Hero lookup ─────────────────────────────────────────────── */}
      <div className="hero-lookup">
        <h1>Look up an implant.</h1>
        <p>Scan the card, search a model number, or find by patient. Full MRI safety profile and manuals in two seconds.</p>

        <div className="app-big-search-wrap" style={{ position:'relative', maxWidth:680 }}>
          <div className="app-big-search">
            <form onSubmit={handleSearch} style={{ display:'contents' }}>
              <div className="app-big-search-input">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/></svg>
                <input
                  ref={inputRef}
                  id="live-q"
                  placeholder="Search implants, model numbers, or patients"
                  autoComplete="off"
                  value={query}
                  onChange={e => setQuery(e.target.value)}
                />
              </div>
              <button type="submit" className="go-btn">
                Search
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
              </button>
            </form>
            <div className="app-big-search-or"><span>or</span></div>
            <a href="/clinics/scan-patient" className="scan-btn">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>
              Scan a patient card
            </a>
          </div>
          <div style={{ color:'rgba(255,255,255,.82)', fontFamily:'var(--ff)', fontSize:13, textAlign:'center', marginTop:14, letterSpacing:'.2px' }}>
            Browse <a href="/clinics/library" style={{ color:'#fff', fontWeight:600, textDecoration:'underline', textUnderlineOffset:3 }}>
              {deviceCount !== undefined ? `${deviceCount} devices` : 'our device library'}
            </a> · more added weekly
          </div>
        </div>

        <div className="cat-tiles" style={{ maxWidth:720, marginTop:26 }}>
          <a href="/clinics/scan-patient" className="cat-tile">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 10h18M8 15h2"/></svg>
            <b>Scan card</b><span>Apple Wallet or ID</span>
          </a>
          <a href="/clinics/library?f=pacemaker" className="cat-tile">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M12 2v20M2 12h20"/></svg>
            <b>Pacemakers</b><span>Indexed devices</span>
          </a>
          <a href="/clinics/library?f=crtd" className="cat-tile">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M13 2 3 14h9l-1 8 10-12h-9z"/></svg>
            <b>CRT-Ds</b><span>Indexed devices</span>
          </a>
          <a href="/clinics/library?f=icd" className="cat-tile">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>
            <b>ICDs</b><span>Indexed devices</span>
          </a>
        </div>
      </div>

      {/* ── Stat row ────────────────────────────────────────────────── */}
      <div className="stat-row" style={{ marginBottom:22 }}>
        <div className="stat-card">
          <div className="k">Library size</div>
          <div className="v">{deviceCount === undefined ? '…' : (deviceCount ?? 0).toLocaleString()}</div>
          <div className="d">Indexed devices</div>
        </div>
        <div className="stat-card">
          <div className="k">Lookups today</div>
          <div className="v">{todayCount === undefined ? '…' : todayCount ?? 0}</div>
          <div className="d">Across your clinic</div>
        </div>
        <div className="stat-card">
          <div className="k">Patients linked</div>
          <div className="v">{stats === undefined ? '…' : stats?.total ?? 0}</div>
          <div className="d">{stats?.verified ?? 0} verified</div>
        </div>
        <div className="stat-card">
          <div className="k">Flags needing review</div>
          <div className="v" style={{ color: (stats?.pending ?? 0) > 0 ? 'var(--warn)' : undefined }}>
            {stats === undefined ? '…' : stats?.pending ?? 0}
          </div>
          <div className="d">{(stats?.pending ?? 0) > 0 ? 'Action required' : 'All clear'}</div>
        </div>
      </div>

      {/* ── Grid-2 ──────────────────────────────────────────────────── */}
      <div className="grid-2">

        {/* Recent patient lookups table */}
        <div className="table">
          <div className="table-h">
            <h3>Recent patient lookups</h3>
            <a href="/clinics/all-patients" style={{ fontFamily:'var(--ff)', fontSize:13, color:'var(--accent)', fontWeight:600 }}>View all</a>
          </div>

          {recentLookups === undefined ? (
            <div style={{ padding:'40px 22px', color:'var(--muted)', fontSize:13 }}>Loading…</div>
          ) : recentLookups.length === 0 ? (
            <div style={{ padding:'48px 22px', textAlign:'center', color:'var(--muted)', fontSize:13 }}>
              No lookups yet. Search for a patient above to get started.
            </div>
          ) : (
            <>
              <div className="impl-row impl-thead">
                <div></div>
                <div>Patient</div>
                <div>ID</div>
                <div>Action</div>
                <div>Time</div>
              </div>
              {recentLookups.slice(0, 8).map((row: any) => (
                <a
                  key={row._id}
                  href={`/clinics/all-patients?q=${encodeURIComponent(row.implantIdCode || row.patientName)}`}
                  className="impl-row"
                  style={{ textDecoration:'none' }}
                >
                  <div className="impl-ic">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/></svg>
                  </div>
                  <div>
                    <div className="impl-nm">{row.patientName}</div>
                    {row.deviceName && <div className="impl-mfr">{row.deviceName}</div>}
                  </div>
                  <div style={{ fontFamily:'var(--ff)', fontSize:12, color:'var(--muted2)' }}>{row.implantIdCode || '—'}</div>
                  <div>
                    <span style={{ fontFamily:'var(--ff)', fontSize:11.5, fontWeight:600, letterSpacing:'.4px', padding:'3px 8px', borderRadius:5, background:'color-mix(in srgb,var(--accent) 8%,transparent)', color:'var(--accent)' }}>
                      {row.action}
                    </span>
                  </div>
                  <div style={{ fontFamily:'var(--ff)', fontSize:12, color:'var(--muted2)' }}>{timeAgo(row.createdAt)}</div>
                </a>
              ))}
            </>
          )}
        </div>

        {/* Quick actions + flagged */}
        <div>
          <div className="quick-actions" style={{ marginBottom:16 }}>
            <h3 style={{ fontFamily:'var(--ff)', fontSize:13, fontWeight:600, letterSpacing:'.8px', textTransform:'uppercase', color:'var(--muted)' }}>Quick actions</h3>
            <div className="qa-grid">
              <a href="/clinics/scan-patient" className="qa-btn">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 10h18M8 15h2"/></svg>
                Scan card
              </a>
              <a href="/clinics/all-patients" className="qa-btn">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/></svg>
                All patients
              </a>
              <a href="/clinics/add-patient" className="qa-btn">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"><circle cx="9" cy="7" r="4"/><path d="M3 21v-2a4 4 0 0 1 4-4h4M19 8v6M16 11h6"/></svg>
                Add patient
              </a>
              <a href="/clinics/library" className="qa-btn">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20M4 19.5A2.5 2.5 0 0 0 6.5 22H20V2H6.5A2.5 2.5 0 0 0 4 4.5v15z"/></svg>
                Library
              </a>
              <a href="/clinics/staff" className="qa-btn">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>
                Invite staff
              </a>
              <a href="/clinics/audit" className="qa-btn">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/></svg>
                Audit log
              </a>
            </div>
          </div>

          {/* Flagged for review */}
          <div className="table">
            <div className="table-h">
              <h3>Flagged for review</h3>
              {flagged.length > 0 && (
                <span style={{ background:'color-mix(in srgb,var(--warn) 12%,transparent)', color:'var(--warn)', fontSize:11, fontWeight:700, padding:'3px 8px', borderRadius:5 }}>
                  {flagged.length}
                </span>
              )}
            </div>

            {clinicPatients === undefined ? (
              <div style={{ padding:'24px 22px', color:'var(--muted)', fontSize:13 }}>Loading…</div>
            ) : flagged.length === 0 ? (
              <div style={{ padding:'32px 22px', textAlign:'center', color:'var(--muted)', fontSize:14 }}>
                <div style={{ fontSize:24, marginBottom:6 }}>✓</div>
                All patients verified
              </div>
            ) : (
              flagged.map((p: any) => (
                <a
                  key={p._id}
                  href={`/clinics/all-patients?q=${encodeURIComponent(p.implantIdCode || '')}`}
                  className="impl-row"
                  style={{ gridTemplateColumns:'auto 1fr auto', textDecoration:'none' }}
                >
                  <div className="impl-ic">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/></svg>
                  </div>
                  <div>
                    <div className="impl-nm">{[p.firstName, p.lastName].filter(Boolean).join(' ') || 'Unknown'}</div>
                    <div className="impl-mfr">{p.implantIdCode || 'No ID'}</div>
                  </div>
                  <span style={{ fontSize:11, fontWeight:600, padding:'3px 8px', borderRadius:5, background:'color-mix(in srgb,var(--warn) 10%,transparent)', color:'var(--warn)', flexShrink:0 }}>
                    Pending
                  </span>
                </a>
              ))
            )}
          </div>
        </div>
      </div>

    </div>
  )
}
