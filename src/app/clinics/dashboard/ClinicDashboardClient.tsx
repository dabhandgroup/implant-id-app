'use client'

import { useState, useRef } from 'react'
import { useRouter }         from 'next/navigation'
import { useUser }           from '@clerk/nextjs'
import { useQuery }          from 'convex/react'
import { api as apiBase }    from '../../../../convex/_generated/api'
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
  return new Date(ts).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })
}

export default function ClinicDashboardClient() {
  const router = useRouter()
  const { user } = useUser()

  const stats            = useQuery(api.clinics.getClinicStats)
  const recentLookups    = useQuery(api.clinics.getRecentLookups)
  const todayCount       = useQuery(api.clinics.getTodayLookupCount)
  const deviceCount      = useQuery(api.devices.getDeviceCount)
  const pendingPatients  = useQuery(api.clinics.listClinicPatients)

  const [query, setQuery] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  const firstName = user?.firstName ?? user?.fullName?.split(' ')[0] ?? 'there'

  function handleSearch(e: React.FormEvent) {
    e.preventDefault()
    const q = query.trim()
    if (q) router.push(`/clinics/all-patients?q=${encodeURIComponent(q)}`)
  }

  const flagged = (pendingPatients ?? []).filter((p: any) => p.verificationStatus !== 'active').slice(0, 5)

  return (
    <div className="m-content">

      {/* ── Hero lookup ─────────────────────────────────────────────────── */}
      <div className="hero-lookup">
        <div className="hero-lookup-copy">
          <h2>Good to see you, {firstName}</h2>
          <p>Search for a patient, scan their card, or browse the implant library.</p>
        </div>
        <div className="app-big-search">
          <form onSubmit={handleSearch} style={{ display:'flex', gap:8, alignItems:'stretch' }}>
            <input
              ref={inputRef}
              className="app-big-search-input"
              type="search"
              placeholder="Search by name, Patient ID, or implant type…"
              value={query}
              onChange={e => setQuery(e.target.value)}
              autoComplete="off"
            />
            <button type="submit" className="go-btn">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
            </button>
          </form>
          <div className="app-big-search-or"><span>or</span></div>
          <a href="/clinics/scan-patient" className="scan-btn">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 10h18M8 15h2"/></svg>
            Scan patient card
          </a>
        </div>

        {/* Category tiles */}
        <div className="cat-tiles">
          <a className="cat-tile" href="/clinics/library?category=cardiac">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>
            <span>Cardiac</span>
          </a>
          <a className="cat-tile" href="/clinics/library?category=orthopaedic">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><path d="M18 2v20M6 2v20M6 12h12"/></svg>
            <span>Orthopaedic</span>
          </a>
          <a className="cat-tile" href="/clinics/library?category=neural">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><ellipse cx="12" cy="12" rx="7" ry="7"/><path d="M12 8v8M8 12h8"/></svg>
            <span>Neural</span>
          </a>
          <a className="cat-tile" href="/clinics/library?category=vascular">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><path d="M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2z"/><path d="M12 8v8M9 11l3 3 3-3"/></svg>
            <span>Vascular</span>
          </a>
        </div>
      </div>

      {/* ── Stat row ────────────────────────────────────────────────────── */}
      <div className="stat-row" style={{ marginBottom:22 }}>
        <div className="stat-card-lite">
          <div className="scl-icon" style={{ background:'color-mix(in srgb,var(--accent) 10%,transparent)' }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="1.7"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20M4 19.5A2.5 2.5 0 0 0 6.5 22H20V2H6.5A2.5 2.5 0 0 0 4 4.5v15z"/></svg>
          </div>
          <div>
            <div className="scl-k">Library size</div>
            <div className="scl-v">{deviceCount === undefined ? '…' : (deviceCount ?? 0).toLocaleString()}</div>
          </div>
        </div>
        <div className="stat-card-lite">
          <div className="scl-icon" style={{ background:'color-mix(in srgb,var(--accent2) 10%,transparent)' }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--accent2)" strokeWidth="1.7"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          </div>
          <div>
            <div className="scl-k">Lookups today</div>
            <div className="scl-v">{todayCount === undefined ? '…' : (todayCount ?? 0)}</div>
          </div>
        </div>
        <div className="stat-card-lite">
          <div className="scl-icon" style={{ background:'color-mix(in srgb,#6366f1 10%,transparent)' }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#6366f1" strokeWidth="1.7"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
          </div>
          <div>
            <div className="scl-k">Avg. time saved</div>
            <div className="scl-v">4.2<span style={{ fontSize:12, fontWeight:500, color:'var(--muted)', marginLeft:2 }}>min</span></div>
          </div>
        </div>
        <div className="stat-card-lite">
          <div className="scl-icon" style={{ background:'color-mix(in srgb,#f59e0b 10%,transparent)' }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="1.7"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
          </div>
          <div>
            <div className="scl-k">Flagged for review</div>
            <div className="scl-v">{stats === undefined ? '…' : (stats?.pending ?? 0)}</div>
          </div>
        </div>
      </div>

      {/* ── Grid-2: lookups + quick actions ─────────────────────────────── */}
      <div className="dash-grid">

        {/* Recent lookups */}
        <div className="qa-panel">
          <div className="qa-panel-hd" style={{ justifyContent:'space-between' }}>
            <span className="qa-panel-title">Recent patient lookups</span>
            <a href="/clinics/all-patients" style={{ fontFamily:'var(--ff)', fontSize:12, color:'var(--accent)', textDecoration:'none', fontWeight:600 }}>View all</a>
          </div>

          {recentLookups === undefined ? (
            <div style={{ padding:'40px 22px', color:'var(--muted)', fontSize:13 }}>Loading…</div>
          ) : recentLookups.length === 0 ? (
            <div style={{ padding:'48px 22px', textAlign:'center', color:'var(--muted)', fontSize:13 }}>
              No lookups yet. Search for a patient above to get started.
            </div>
          ) : (
            <>
              <div className="impl-row impl-thead" style={{ padding:'10px 22px', borderBottom:'1px solid var(--border)' }}>
                <div style={{ gridColumn:'span 1' }}></div>
                <div>Patient</div>
                <div>ID</div>
                <div>Action</div>
                <div>Time</div>
              </div>
              {recentLookups.slice(0, 8).map((row: any) => (
                <a key={row._id} href={`/clinics/all-patients?q=${encodeURIComponent(row.implantIdCode || row.patientName)}`} className="impl-row" style={{ textDecoration:'none', display:'grid' }}>
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

        {/* Right column */}
        <div className="qa-sidebar">

          {/* Quick actions */}
          <div className="qa-panel" style={{ marginBottom:16 }}>
            <div className="qa-panel-hd">
              <span className="qa-panel-title">Quick actions</span>
            </div>
            <a href="/clinics/scan-patient" className="qa-action-btn">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 10h18M8 15h2"/></svg>
              Scan patient card
            </a>
            <a href="/clinics/all-patients" className="qa-action-btn">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/></svg>
              View all patients
            </a>
            <a href="/clinics/add-patient" className="qa-action-btn">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"><circle cx="9" cy="7" r="4"/><path d="M3 21v-2a4 4 0 0 1 4-4h4M19 8v6M16 11h6"/></svg>
              Add new patient
            </a>
            <a href="/clinics/library" className="qa-action-btn">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20M4 19.5A2.5 2.5 0 0 0 6.5 22H20V2H6.5A2.5 2.5 0 0 0 4 4.5v15z"/></svg>
              Browse implant library
            </a>
            <a href="/clinics/staff" className="qa-action-link">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/></svg>
              Invite a colleague
            </a>
          </div>

          {/* Flagged for review */}
          <div className="qa-panel">
            <div className="qa-panel-hd" style={{ justifyContent:'space-between' }}>
              <span className="qa-panel-title">Flagged for review</span>
              {flagged.length > 0 && (
                <span style={{ background:'color-mix(in srgb,#f59e0b 12%,transparent)', color:'#b45309', fontSize:11, fontWeight:700, padding:'2px 7px', borderRadius:5 }}>
                  {flagged.length}
                </span>
              )}
            </div>

            {pendingPatients === undefined ? (
              <div style={{ padding:'28px 16px', color:'var(--muted)', fontSize:13 }}>Loading…</div>
            ) : flagged.length === 0 ? (
              <div style={{ padding:'28px 16px', textAlign:'center', color:'var(--muted)', fontSize:13 }}>
                <div style={{ fontSize:22, marginBottom:6 }}>✓</div>
                All patients verified
              </div>
            ) : (
              <div className="pending-cards">
                {flagged.map((p: any) => (
                  <a
                    key={p._id}
                    href={`/clinics/all-patients?q=${encodeURIComponent(p.implantIdCode || '')}`}
                    className="pending-card"
                    style={{ textDecoration:'none' }}
                  >
                    <div className="pc-info">
                      <div className="pc-nm-link">
                        {[p.firstName, p.lastName].filter(Boolean).join(' ') || 'Unknown patient'}
                      </div>
                      <div className="impl-mfr">{p.implantIdCode || 'No ID'}</div>
                    </div>
                    <span style={{ fontSize:11, fontWeight:600, padding:'3px 7px', borderRadius:5, background:'color-mix(in srgb,#f59e0b 10%,transparent)', color:'#b45309', flexShrink:0 }}>
                      Pending
                    </span>
                  </a>
                ))}
              </div>
            )}
          </div>

        </div>
      </div>

    </div>
  )
}
