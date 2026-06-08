'use client'

import { useState, useMemo } from 'react'

// ── Serialised device type passed from server ─────────────────────────────

export interface LibDevice {
  device_id: string
  device_name: string
  model_number: string
  device_type: string
  component_role?: string
  mri_classification: 'MR Conditional' | 'MR Safe' | 'MR Unsafe'
  field_strength_1t5: boolean
  field_strength_3t: boolean
  manufacturer_id: string
  manufacturer_name: string
  _category: 'active' | 'passive' | 'legacy'
}

interface Props {
  devices: LibDevice[]
  userName: string
  userInitials: string
}

// ── Filter definitions ────────────────────────────────────────────────────

const TYPE_FILTERS: { key: string; label: string }[] = [
  { key: 'all',       label: 'All devices' },
  { key: 'pacemaker', label: 'Pacemakers & Leads' },
  { key: 'cochlear',  label: 'Cochlear Implants' },
  { key: 'neuro',     label: 'Neurostimulators' },
  { key: 'icd',       label: 'ICDs / S-ICDs' },
  { key: 'stent',     label: 'Stents' },
  { key: 'legacy',    label: 'Legacy / MR Unsafe' },
]

function typeMatch(d: LibDevice, key: string): boolean {
  if (key === 'all') return true
  if (key === 'pacemaker') return d.device_type === 'Pacemaker'
  if (key === 'cochlear')  return d.device_type === 'Cochlear Implant'
  if (key === 'neuro')     return d.device_type === 'Deep Brain Stimulator' || d.device_type === 'Neurostimulator (SCS)'
  if (key === 'icd')       return d.device_type === 'Subcutaneous ICD (S-ICD)'
  if (key === 'stent')     return d.device_type === 'Vascular Stent' || d.device_type === 'Biliary Stent'
  if (key === 'legacy')    return d.device_type === 'Pre-MRI Era Device'
  return true
}

function getMriInfo(d: LibDevice): { label: string; shortLabel: string; cls: 'ok' | 'warn' | 'err' } {
  if (d.mri_classification === 'MR Unsafe')           return { label: 'MR Unsafe',             shortLabel: 'MR Unsafe',   cls: 'err'  }
  if (d.field_strength_1t5 && d.field_strength_3t)    return { label: 'MR Conditional 1.5T / 3T', shortLabel: '1.5T / 3T', cls: 'ok'   }
  if (d.field_strength_1t5)                           return { label: 'MR Conditional 1.5T',    shortLabel: '1.5T only',   cls: 'warn' }
  return { label: 'MR Conditional', shortLabel: 'Conditional', cls: 'ok' }
}

function deviceSlug(model_number: string): string {
  return model_number.split(';')[0].trim()
}

// ── Card illustration SVGs ────────────────────────────────────────────────

function DeviceCardSvg({ type }: { type: string }) {
  if (type === 'Pacemaker') return (
    <svg viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="40" y="65" width="120" height="75" rx="37" fill="#e8f1f5" stroke="#a8c2cd" strokeWidth="1.5"/>
      <rect x="55" y="78" width="90" height="49" rx="24" fill="#f4f9fb"/>
      <path d="M56 64 C54 42 34 40 34 26" stroke="#8aa6b0" strokeWidth="2" fill="none" strokeLinecap="round"/>
      <path d="M144 64 C146 42 166 40 166 26" stroke="#8aa6b0" strokeWidth="2" fill="none" strokeLinecap="round"/>
      <path d="M70 103 l12-14 10 20 10-14 8 8" stroke="#29869f" strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  )
  if (type === 'Cochlear Implant') return (
    <svg viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="88" cy="80" r="40" fill="#e8f1f5" stroke="#a8c2cd" strokeWidth="1.5"/>
      <circle cx="88" cy="80" r="26" fill="#f4f9fb"/>
      <circle cx="88" cy="80" r="13" fill="#e8f1f5"/>
      <circle cx="88" cy="80" r="5" fill="#29869f" opacity=".4"/>
      <path d="M128 80 Q140 76 140 90 Q140 108 124 112" stroke="#a8c2cd" strokeWidth="2" fill="none" strokeLinecap="round"/>
      <path d="M124 112 l20 28" stroke="#a8c2cd" strokeWidth="2" strokeLinecap="round"/>
      <path d="M130 118 l20 28" stroke="#a8c2cd" strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
  )
  if (type === 'Deep Brain Stimulator') return (
    <svg viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg">
      <ellipse cx="100" cy="60" rx="46" ry="40" fill="#e8f1f5" stroke="#a8c2cd" strokeWidth="1.5"/>
      <ellipse cx="100" cy="60" rx="30" ry="26" fill="#f4f9fb"/>
      <line x1="84" y1="98" x2="78" y2="142" stroke="#a8c2cd" strokeWidth="2" strokeLinecap="round"/>
      <line x1="116" y1="98" x2="122" y2="142" stroke="#a8c2cd" strokeWidth="2" strokeLinecap="round"/>
      <circle cx="78" cy="146" r="5" fill="#e8f1f5" stroke="#a8c2cd" strokeWidth="1.2"/>
      <circle cx="122" cy="146" r="5" fill="#e8f1f5" stroke="#a8c2cd" strokeWidth="1.2"/>
      <rect x="72" y="154" width="56" height="28" rx="10" fill="#e8f1f5" stroke="#a8c2cd" strokeWidth="1.5"/>
    </svg>
  )
  if (type === 'Neurostimulator (SCS)') return (
    <svg viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="72" y="142" width="56" height="38" rx="10" fill="#e8f1f5" stroke="#a8c2cd" strokeWidth="1.5"/>
      <line x1="88" y1="142" x2="88" y2="30" stroke="#a8c2cd" strokeWidth="2.5" strokeLinecap="round"/>
      <line x1="100" y1="142" x2="100" y2="30" stroke="#a8c2cd" strokeWidth="2.5" strokeLinecap="round"/>
      <line x1="112" y1="142" x2="112" y2="30" stroke="#a8c2cd" strokeWidth="2.5" strokeLinecap="round"/>
      <rect x="80" y="22" width="40" height="12" rx="5" fill="#e8f1f5" stroke="#a8c2cd" strokeWidth="1.5"/>
    </svg>
  )
  if (type === 'Subcutaneous ICD (S-ICD)') return (
    <svg viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="26" y="62" width="148" height="78" rx="22" fill="#e8f1f5" stroke="#a8c2cd" strokeWidth="1.5"/>
      <rect x="40" y="76" width="120" height="50" rx="14" fill="#f4f9fb"/>
      <path d="M100 62 L100 32" stroke="#8aa6b0" strokeWidth="2.5" strokeLinecap="round"/>
      <path d="M100 32 L150 16" stroke="#8aa6b0" strokeWidth="2" strokeLinecap="round"/>
      <path d="M60 102 l10-14 12 22 10-14 12 18 12-12" stroke="#c84a3a" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" opacity=".7"/>
    </svg>
  )
  if (type === 'Vascular Stent' || type === 'Biliary Stent') return (
    <svg viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg">
      <ellipse cx="100" cy="50" rx="42" ry="13" fill="#f4f9fb" stroke="#a8c2cd" strokeWidth="1.5"/>
      <ellipse cx="100" cy="150" rx="42" ry="13" fill="#f4f9fb" stroke="#a8c2cd" strokeWidth="1.5"/>
      <line x1="58" y1="50" x2="58" y2="150" stroke="#a8c2cd" strokeWidth="1.5"/>
      <line x1="142" y1="50" x2="142" y2="150" stroke="#a8c2cd" strokeWidth="1.5"/>
      <line x1="72" y1="47" x2="72" y2="153" stroke="#a8c2cd" strokeWidth="1"/>
      <line x1="86" y1="46" x2="86" y2="154" stroke="#a8c2cd" strokeWidth="1"/>
      <line x1="100" y1="46" x2="100" y2="154" stroke="#a8c2cd" strokeWidth="1"/>
      <line x1="114" y1="46" x2="114" y2="154" stroke="#a8c2cd" strokeWidth="1"/>
      <line x1="128" y1="47" x2="128" y2="153" stroke="#a8c2cd" strokeWidth="1"/>
      <path d="M58 80 Q80 74 100 80 Q120 86 142 80" stroke="#a8c2cd" strokeWidth="1" fill="none"/>
      <path d="M58 110 Q80 104 100 110 Q120 116 142 110" stroke="#a8c2cd" strokeWidth="1" fill="none"/>
    </svg>
  )
  if (type === 'Pre-MRI Era Device') return (
    <svg viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M100 160 C100 160 44 126 44 86 C44 66 58 52 78 52 C88 52 96 56 100 62 C104 56 112 52 122 52 C142 52 156 66 156 86 C156 126 100 160 100 160Z" fill="#f4f9fb" stroke="#a8c2cd" strokeWidth="1.5"/>
      <circle cx="100" cy="98" r="24" fill="#fff0ee" stroke="#c84a3a" strokeWidth="1.5" opacity=".85"/>
      <line x1="86" y1="84" x2="114" y2="112" stroke="#c84a3a" strokeWidth="3" strokeLinecap="round"/>
      <line x1="114" y1="84" x2="86" y2="112" stroke="#c84a3a" strokeWidth="3" strokeLinecap="round"/>
    </svg>
  )
  // Pacing lead (default)
  return (
    <svg viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M100 20 C100 20 80 60 80 100 C80 140 100 170 100 170" stroke="#a8c2cd" strokeWidth="8" fill="none" strokeLinecap="round"/>
      <path d="M100 20 C100 20 120 60 120 100 C120 140 100 170 100 170" stroke="#c5dde5" strokeWidth="4" fill="none" strokeLinecap="round"/>
      <circle cx="100" cy="170" r="10" fill="#e8f1f5" stroke="#a8c2cd" strokeWidth="1.5"/>
      <circle cx="100" cy="170" r="5" fill="#29869f" opacity=".5"/>
      <rect x="82" y="14" width="36" height="14" rx="6" fill="#e8f1f5" stroke="#a8c2cd" strokeWidth="1.5"/>
    </svg>
  )
}

// ── List row icon (smaller stroke icon per type) ──────────────────────────

function DeviceRowIcon({ type }: { type: string }) {
  if (type === 'Pacemaker') return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
      <rect x="2" y="7" width="20" height="13" rx="4"/>
      <path d="M7 7V5M17 7V5"/>
      <path d="M7 14l2-3 3 5 2-4 3 2"/>
    </svg>
  )
  if (type === 'Cochlear Implant') return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
      <path d="M18 12a6 6 0 1 0-12 0"/>
      <path d="M15 12a3 3 0 1 0-6 0"/>
      <circle cx="12" cy="12" r=".8" fill="currentColor"/>
      <path d="M18 12h3"/>
    </svg>
  )
  if (type === 'Deep Brain Stimulator') return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
      <circle cx="12" cy="8" r="4"/>
      <line x1="10" y1="12" x2="9" y2="19"/>
      <line x1="14" y1="12" x2="15" y2="19"/>
      <rect x="7" y="19" width="10" height="3" rx="1.5"/>
    </svg>
  )
  if (type === 'Neurostimulator (SCS)') return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
      <rect x="8" y="16" width="8" height="6" rx="2"/>
      <line x1="10" y1="16" x2="10" y2="4"/>
      <line x1="12" y1="16" x2="12" y2="4"/>
      <line x1="14" y1="16" x2="14" y2="4"/>
    </svg>
  )
  if (type === 'Subcutaneous ICD (S-ICD)') return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
      <rect x="2" y="8" width="20" height="10" rx="3"/>
      <path d="M12 8V5l5 2"/>
      <path d="M6 13l2-3 2 5 2-3 2 1"/>
    </svg>
  )
  if (type === 'Vascular Stent' || type === 'Biliary Stent') return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
      <ellipse cx="12" cy="5" rx="7" ry="2"/>
      <ellipse cx="12" cy="19" rx="7" ry="2"/>
      <line x1="5" y1="5" x2="5" y2="19"/>
      <line x1="19" y1="5" x2="19" y2="19"/>
    </svg>
  )
  if (type === 'Pre-MRI Era Device') return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
      <line x1="12" y1="9" x2="12" y2="13"/>
      <line x1="12" y1="17" x2="12.01" y2="17"/>
    </svg>
  )
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
      <rect x="2" y="7" width="20" height="13" rx="4"/>
      <path d="M7 13l2-3 3 5 2-4 3 2"/>
    </svg>
  )
}

// ── Main component ────────────────────────────────────────────────────────

export default function LibraryClient({ devices, userName, userInitials }: Props) {
  const [query,      setQuery]      = useState('')
  const [typeFilter, setTypeFilter] = useState('all')
  const [mfrFilter,  setMfrFilter]  = useState('all')
  const [view,       setView]       = useState<'grid' | 'list'>('grid')

  const manufacturers = useMemo(() => {
    const seen = new Set<string>()
    return devices
      .filter(d => { if (seen.has(d.manufacturer_id)) return false; seen.add(d.manufacturer_id); return true })
      .map(d => ({ id: d.manufacturer_id, name: d.manufacturer_name }))
      .sort((a, b) => a.name.localeCompare(b.name))
  }, [devices])

  const filtered = useMemo(() => {
    const q = query.toLowerCase().trim()
    return devices.filter(d => {
      if (!typeMatch(d, typeFilter)) return false
      if (mfrFilter !== 'all' && d.manufacturer_id !== mfrFilter) return false
      if (!q) return true
      return (
        d.device_name.toLowerCase().includes(q) ||
        d.model_number.toLowerCase().includes(q) ||
        d.manufacturer_name.toLowerCase().includes(q) ||
        d.device_type.toLowerCase().includes(q)
      )
    })
  }, [devices, query, typeFilter, mfrFilter])

  function clearFilters() {
    setQuery('')
    setTypeFilter('all')
    setMfrFilter('all')
  }

  return (
    <>
      {/* Mobile header */}
      <div className="mob-header">
        <a href="/clinics/dashboard" className="mob-header-logo">
          <img src="/icon.svg" alt="" />
          <span className="logo-text"><b>Implant</b><span>ID</span></span>
        </a>
        <div className="mob-hdr-profile">
          <button className="mob-hdr-av" aria-label="Profile menu">{userInitials}</button>
          <div className="mob-hdr-menu">
            <div className="mob-hdr-info">
              <strong>{userName}</strong>
              <span>Clinic staff</span>
            </div>
            <hr />
            <a href="/clinics/settings">My account</a>
            <button className="danger">Sign out</button>
          </div>
        </div>
      </div>

      {/* Top bar */}
      <header className="app-top">
        <div className="app-top-l">
          <h1 style={{ fontSize: 'clamp(18px,2vw,24px)', letterSpacing: '-.02em' }}>
            Implant library
          </h1>
        </div>
        <div className="app-top-r">
          <button className="ibtn notif-btn" aria-label="Notifications">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
              <path d="M13.73 21a2 2 0 0 1-3.46 0" />
            </svg>
          </button>
        </div>
      </header>

      {/* Search hero */}
      <div className="lib-hero">
        <h1>
          Search the device library
          <span className="count">
            {filtered.length === devices.length
              ? `— ${devices.length} verified devices`
              : `— ${filtered.length} of ${devices.length}`}
          </span>
        </h1>
        <div className="lib-search-wrap">
          <div className="lib-search">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="7" />
              <path d="m21 21-4.3-4.3" />
            </svg>
            <input
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Search Medtronic, Abbott, W3DR01, pacemaker, 1.5T…"
              aria-label="Search devices"
              autoComplete="off"
            />
            {query && (
              <button
                onClick={() => setQuery('')}
                aria-label="Clear search"
                style={{
                  background: 'transparent', border: 'none',
                  color: 'rgba(255,255,255,.75)', cursor: 'pointer',
                  fontSize: 20, lineHeight: 1, padding: '4px 10px',
                }}
              >
                ×
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Filter + results layout */}
      <div className="lib-content">
        <div className="lib-layout">

          {/* Filter sidebar */}
          <aside className="lib-side" aria-label="Device filters">
            <div className="lib-side-grp">
              <h4>Type</h4>
              <div className="lib-filt">
                {TYPE_FILTERS.map(f => (
                  <button
                    key={f.key}
                    className={typeFilter === f.key ? 'on' : ''}
                    onClick={() => setTypeFilter(f.key)}
                    aria-pressed={typeFilter === f.key}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="lib-side-grp">
              <h4>Manufacturer</h4>
              <div className="lib-mfr" style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <button
                  className={mfrFilter === 'all' ? 'on' : ''}
                  onClick={() => setMfrFilter('all')}
                  aria-pressed={mfrFilter === 'all'}
                >
                  All manufacturers
                </button>
                {manufacturers.map(m => (
                  <button
                    key={m.id}
                    className={mfrFilter === m.id ? 'on' : ''}
                    onClick={() => setMfrFilter(m.id)}
                    aria-pressed={mfrFilter === m.id}
                  >
                    {m.name}
                  </button>
                ))}
              </div>
            </div>
          </aside>

          {/* Results */}
          <div className="lib-main">
            <div className="res-hd">
              <h2>
                {filtered.length === 0
                  ? 'No devices found'
                  : `${filtered.length} device${filtered.length !== 1 ? 's' : ''}`}
              </h2>
              <div className="res-hd-r">
                <div
                  className="view-toggle"
                  role="group"
                  aria-label="View mode"
                >
                  <button
                    className={view === 'grid' ? 'on' : ''}
                    onClick={() => setView('grid')}
                    title="Grid view"
                    aria-pressed={view === 'grid'}
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                      <rect x="3" y="3" width="7" height="7" rx="1" />
                      <rect x="14" y="3" width="7" height="7" rx="1" />
                      <rect x="3" y="14" width="7" height="7" rx="1" />
                      <rect x="14" y="14" width="7" height="7" rx="1" />
                    </svg>
                  </button>
                  <button
                    className={view === 'list' ? 'on' : ''}
                    onClick={() => setView('list')}
                    title="List view"
                    aria-pressed={view === 'list'}
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                      <line x1="3" y1="6" x2="21" y2="6" />
                      <line x1="3" y1="12" x2="21" y2="12" />
                      <line x1="3" y1="18" x2="21" y2="18" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>

            {/* Empty state */}
            {filtered.length === 0 && (
              <div style={{ padding: '56px 24px', textAlign: 'center' }}>
                <svg width="38" height="38" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" style={{ marginBottom: 14, color: 'var(--muted2)' }}>
                  <circle cx="11" cy="11" r="7" />
                  <path d="m21 21-4.3-4.3" />
                </svg>
                <p style={{ fontFamily: 'var(--ff)', fontSize: 15, fontWeight: 500, color: 'var(--text)', margin: '0 0 6px' }}>
                  No devices found
                </p>
                <p style={{ fontSize: 13, color: 'var(--muted)', margin: '0 0 20px' }}>
                  Try adjusting your search or clearing the filters
                </p>
                <button
                  onClick={clearFilters}
                  style={{ fontSize: 13, color: 'var(--accent)', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'var(--ff)', textDecoration: 'underline' }}
                >
                  Clear all filters
                </button>
              </div>
            )}

            {/* Grid view */}
            {filtered.length > 0 && view === 'grid' && (
              <div className="res-grid">
                {filtered.map(d => {
                  const mri  = getMriInfo(d)
                  const slug = deviceSlug(d.model_number)
                  return (
                    <a
                      key={d.device_id}
                      href={`/device/${slug}`}
                      className="res-card"
                      aria-label={`${d.device_name} — ${mri.label}`}
                    >
                      <div className="res-card-img">
                        <DeviceCardSvg type={d.device_type} />
                        <span className="mfr-tag">{d.manufacturer_name}</span>
                        <span className={`cls-tag${mri.cls === 'err' ? ' err' : mri.cls === 'warn' ? ' warn' : ''}`}>
                          {mri.shortLabel}
                        </span>
                      </div>
                      <div className="res-card-body">
                        <div className="cat">{d.device_type}</div>
                        <div className="nm">{d.device_name}</div>
                        <div className="mn">
                          {d.model_number.split(';').map(m => m.trim()).join(' · ')}
                        </div>
                        <div className={`st${mri.cls === 'err' ? ' err' : mri.cls === 'warn' ? ' warn' : ''}`}>
                          {d.mri_classification === 'MR Unsafe'
                            ? 'MR Unsafe — do not scan'
                            : `MR Conditional · ${mri.shortLabel}`}
                        </div>
                      </div>
                    </a>
                  )
                })}
              </div>
            )}

            {/* List view */}
            {filtered.length > 0 && view === 'list' && (
              <div>
                {filtered.map(d => {
                  const mri  = getMriInfo(d)
                  const slug = deviceSlug(d.model_number)
                  return (
                    <a
                      key={d.device_id}
                      href={`/device/${slug}`}
                      className="res-row"
                      aria-label={`${d.device_name} — ${mri.label}`}
                    >
                      <div className="res-ic">
                        <DeviceRowIcon type={d.device_type} />
                      </div>
                      <div>
                        <div className="nm">{d.device_name}</div>
                        <div className="mfr">{d.manufacturer_name}</div>
                      </div>
                      <div>
                        <div className="k">Model</div>
                        <div className="v">{d.model_number.split(';')[0].trim()}</div>
                      </div>
                      <div>
                        <div className="k">Type</div>
                        <div className="v">{d.device_type}</div>
                      </div>
                      <div>
                        <span className={`cls-tag${mri.cls === 'err' ? ' err' : mri.cls === 'warn' ? ' warn' : ''}`}>
                          {mri.shortLabel}
                        </span>
                      </div>
                      <div>
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                          <polyline points="9 18 15 12 9 6" />
                        </svg>
                      </div>
                    </a>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Mobile bottom nav */}
      <nav className="mob-nav" aria-label="Mobile navigation">
        <div className="mob-nav-tabs">
          <a href="/clinics/dashboard" className="mob-nav-tab" aria-label="Dashboard">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
              <rect x="3" y="3" width="7" height="9" rx="1.5" />
              <rect x="14" y="3" width="7" height="5" rx="1.5" />
              <rect x="14" y="12" width="7" height="9" rx="1.5" />
              <rect x="3" y="16" width="7" height="5" rx="1.5" />
            </svg>
            <span className="t">Home</span>
          </a>
          <a href="/clinics/patient/add" className="mob-nav-tab" aria-label="Scan card">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
              <rect x="3" y="5" width="18" height="14" rx="2" />
              <path d="M3 10h18M8 15h2" />
            </svg>
            <span className="t">Scan</span>
          </a>
          <a href="/clinics/all-patients" className="mob-nav-tab" aria-label="Patients">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
              <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
            </svg>
            <span className="t">Patients</span>
          </a>
          <a href="/clinics/library" className="mob-nav-tab active" aria-label="Library" aria-current="page">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
              <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20M4 19.5A2.5 2.5 0 0 0 6.5 22H20V2H6.5A2.5 2.5 0 0 0 4 4.5v15z" />
            </svg>
            <span className="t">Library</span>
          </a>
          <button className="mob-nav-tab mob-nav-menu-btn" aria-label="Toggle menu">
            <div className="ham-ic"><span /><span /><span /></div>
            <span className="t">Menu</span>
          </button>
        </div>
      </nav>
    </>
  )
}
