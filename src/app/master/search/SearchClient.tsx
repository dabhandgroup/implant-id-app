'use client'

import { useState, ReactElement } from 'react'
import { useRouter } from 'next/navigation'

type ResultType = 'patient' | 'device' | 'clinic' | 'manufacturer' | 'document'

interface SearchResult {
  id: string
  type: ResultType
  title: string
  subtitle: string
  href: string
  badge?: string
  badgeColour?: string
}

const allResults: SearchResult[] = [
  { id: '1', type: 'patient',      title: 'John Smith',                    subtitle: 'IID-SMIJO2311XK · Manchester Orthopaedic Centre',   href: '/master/patients/john-smith',          badge: 'Verified',    badgeColour: 'var(--ok)' },
  { id: '2', type: 'patient',      title: 'Emma Brown',                    subtitle: 'IID-BREMA1404RP · Boston Spine & Joint',            href: '/master/patients/emma-brown',          badge: 'Verified',    badgeColour: 'var(--ok)' },
  { id: '3', type: 'patient',      title: 'Sarah Williams',                subtitle: 'IID-WILSA0805YT · Auckland Joint Replacement',      href: '/master/patients/sarah-williams',       badge: 'Pending',     badgeColour: 'var(--warn)' },
  { id: '4', type: 'patient',      title: 'Mark Jones',                    subtitle: 'IID-JONMA1509NQ · Dublin Spinal Institute',         href: '/master/patients/mark-jones',          badge: 'Verified',    badgeColour: 'var(--ok)' },
  { id: '5', type: 'patient',      title: 'Eleanor Taylor',                subtitle: 'IID-TAYEL2202CX · Harley Street Implant Centre',    href: '/master/patients/eleanor-taylor',      badge: 'Pending',     badgeColour: 'var(--warn)' },
  { id: '6', type: 'device',       title: 'Medtronic Micra AV',            subtitle: 'Cardiac Pacemaker · MDT-MICRA-AV2 · MR Conditional', href: '/master/devices/medtronic-micra',     badge: 'Active',      badgeColour: 'var(--ok)' },
  { id: '7', type: 'device',       title: 'Zimmer Biomet Oxford Knee',     subtitle: 'Knee Replacement · ZB-OK-PMU3 · MR Safe',           href: '/master/devices/zimmer-oxford-knee',  badge: 'Active',      badgeColour: 'var(--ok)' },
  { id: '8', type: 'device',       title: 'Stryker Tritanium PL Cage',     subtitle: 'Spinal Implant · STR-TT-PL-S · MR Safe',            href: '/master/devices/stryker-tritanium',   badge: 'Draft',       badgeColour: 'var(--muted)' },
  { id: '9', type: 'device',       title: 'Cochlear Nucleus Profile Plus', subtitle: 'Cochlear Implant · COC-CI-N7-P · MR Unsafe',        href: '/master/devices/cochlear-nucleus',    badge: 'Active',      badgeColour: 'var(--ok)' },
  { id:'10', type: 'clinic',       title: 'Manchester Orthopaedic Centre', subtitle: 'United Kingdom · 38 patients · 4 staff',            href: '/master/clinics/manchester-orthopaedic', badge: 'Active',   badgeColour: 'var(--ok)' },
  { id:'11', type: 'clinic',       title: 'Boston Spine & Joint',          subtitle: 'United States · 61 patients · 7 staff',             href: '/master/clinics/boston-spine',        badge: 'Active',      badgeColour: 'var(--ok)' },
  { id:'12', type: 'clinic',       title: 'Harley Street Implant Centre',  subtitle: 'United Kingdom · Application pending',              href: '/master/clinics/harley-street',       badge: 'Pending',     badgeColour: 'var(--warn)' },
  { id:'13', type: 'manufacturer', title: 'Medtronic plc',                 subtitle: 'Ireland · 312 devices',                             href: '/master/manufacturers/medtronic',     badge: 'Active',      badgeColour: 'var(--ok)' },
  { id:'14', type: 'manufacturer', title: 'Zimmer Biomet',                 subtitle: 'United States · 487 devices',                       href: '/master/manufacturers/zimmer-biomet', badge: 'Active',      badgeColour: 'var(--ok)' },
  { id:'15', type: 'manufacturer', title: 'Cochlear Ltd',                  subtitle: 'Australia · 0 devices · Pending approval',         href: '/master/manufacturers/cochlear',      badge: 'Pending',     badgeColour: 'var(--warn)' },
  { id:'16', type: 'document',     title: 'Medtronic_Micra_AV_MRI_Conditions.pdf', subtitle: 'MRI Conditions · Medtronic plc',           href: '/master/documents/1' },
  { id:'17', type: 'document',     title: 'ZimmerBiomet_Oxford_Knee_IFU.pdf',       subtitle: 'Instructions for Use · Zimmer Biomet',    href: '/master/documents/2' },
]

const typeIcon: Record<ResultType, ReactElement> = {
  patient: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/>
      <path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
    </svg>
  ),
  device: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
      <path d="M22 12h-4l-3 9L9 3l-3 9H2"/>
    </svg>
  ),
  clinic: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
      <path d="M3 21h18M3 10h18M5 6l7-3 7 3M4 10v11M20 10v11M8 14v3M12 14v3M16 14v3"/>
    </svg>
  ),
  manufacturer: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
      <path d="M2 20h20M4 20V10l8-6 8 6v10"/><rect x="9" y="14" width="6" height="6"/>
    </svg>
  ),
  document: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
      <polyline points="14 2 14 8 20 8"/>
    </svg>
  ),
}

const typeLabel: Record<ResultType, string> = {
  patient: 'Patient',
  device: 'Device',
  clinic: 'Clinic',
  manufacturer: 'Manufacturer',
  document: 'Document',
}

const typeColour: Record<ResultType, string> = {
  patient: 'var(--accent)',
  device: '#7c3aed',
  clinic: '#0284c7',
  manufacturer: '#d97706',
  document: 'var(--err)',
}

const filterTypes: Array<ResultType | 'all'> = ['all', 'patient', 'device', 'clinic', 'manufacturer', 'document']

export default function SearchClient() {
  const router = useRouter()
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState<ResultType | 'all'>('all')

  const filtered = allResults.filter(r => {
    const matchesType = filter === 'all' || r.type === filter
    if (!query.trim()) return matchesType
    const q = query.toLowerCase()
    return matchesType && (r.title.toLowerCase().includes(q) || r.subtitle.toLowerCase().includes(q))
  })

  const grouped = filtered.reduce<Partial<Record<ResultType, SearchResult[]>>>((acc, r) => {
    if (!acc[r.type]) acc[r.type] = []
    acc[r.type]!.push(r)
    return acc
  }, {})

  return (
    <div className="m-content">
      <div className="m-h">
        <div>
          <h2>Search Everything</h2>
          <div className="sub">Search patients, devices, clinics, manufacturers, and documents across the platform.</div>
        </div>
      </div>

      {/* Search input */}
      <div
        style={{
          position: 'relative',
          marginBottom: 16,
        }}
      >
        <svg
          style={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)', width: 18, height: 18, color: 'var(--muted2)', pointerEvents: 'none' }}
          viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"
        >
          <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
        </svg>
        <input
          className="input"
          type="text"
          placeholder="Search patients, devices, clinics…"
          value={query}
          onChange={e => setQuery(e.target.value)}
          autoFocus
          style={{ paddingLeft: 46, fontSize: 15 }}
        />
        {query && (
          <button
            onClick={() => setQuery('')}
            style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--muted2)', cursor: 'pointer', fontSize: 16, lineHeight: 1, padding: '2px 4px' }}
            aria-label="Clear search"
          >
            ✕
          </button>
        )}
      </div>

      {/* Type filter pills */}
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 22 }}>
        {filterTypes.map(t => (
          <button
            key={t}
            onClick={() => setFilter(t)}
            style={{
              padding: '6px 14px',
              borderRadius: 8,
              border: '1px solid',
              borderColor: filter === t ? 'var(--accent)' : 'var(--border)',
              background: filter === t ? 'color-mix(in srgb,var(--accent) 10%,transparent)' : 'transparent',
              color: filter === t ? 'var(--accent)' : 'var(--muted)',
              fontFamily: 'var(--ff)',
              fontSize: 12.5,
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all .15s',
            }}
          >
            {t === 'all' ? `All (${allResults.length})` : `${typeLabel[t]}s (${allResults.filter(r => r.type === t).length})`}
          </button>
        ))}
      </div>

      {/* Results */}
      {filtered.length === 0 ? (
        <div
          style={{
            background: 'var(--bg2)',
            border: '1px solid var(--border)',
            borderRadius: 14,
            padding: '48px 24px',
            textAlign: 'center',
          }}
        >
          <div style={{ fontFamily: 'var(--ff)', fontSize: 15, fontWeight: 500, color: 'var(--text)', marginBottom: 6 }}>
            No results found
          </div>
          <div style={{ fontFamily: 'var(--fb)', fontSize: 13.5, color: 'var(--muted)' }}>
            Try a different search term or remove filters
          </div>
        </div>
      ) : (
        (Object.entries(grouped) as Array<[ResultType, SearchResult[]]>).map(([type, results]) => (
          <div key={type} style={{ marginBottom: 22 }}>
            <div
              style={{
                fontFamily: 'var(--ff)',
                fontSize: 11,
                fontWeight: 700,
                letterSpacing: '1.2px',
                textTransform: 'uppercase',
                color: 'var(--muted2)',
                marginBottom: 8,
                display: 'flex',
                alignItems: 'center',
                gap: 8,
              }}
            >
              <span style={{ color: typeColour[type] }}>{typeIcon[type]}</span>
              {typeLabel[type]}s
              <span style={{ fontFamily: 'var(--ff)', fontSize: 10.5, background: 'color-mix(in srgb,var(--text) 6%,transparent)', borderRadius: 4, padding: '1px 6px', color: 'var(--muted)' }}>
                {results.length}
              </span>
            </div>

            <div className="m-tbl-wrap">
              <table className="m-tbl">
                <tbody>
                  {results.map(r => (
                    <tr
                      key={r.id}
                      onClick={() => router.push(r.href)}
                      style={{ cursor: 'pointer' }}
                    >
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <div
                            style={{
                              width: 30,
                              height: 30,
                              borderRadius: 8,
                              background: `color-mix(in srgb,${typeColour[type]} 10%,transparent)`,
                              display: 'grid',
                              placeItems: 'center',
                              flexShrink: 0,
                              color: typeColour[type],
                            }}
                          >
                            {typeIcon[type]}
                          </div>
                          <div>
                            <div style={{ fontFamily: 'var(--ff)', fontSize: 13.5, fontWeight: 600, color: 'var(--text)' }}>
                              {r.title}
                            </div>
                            <div style={{ fontFamily: 'var(--fb)', fontSize: 12, color: 'var(--muted)', marginTop: 1 }}>
                              {r.subtitle}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td style={{ width: 90, textAlign: 'right' }}>
                        {r.badge && (
                          <span
                            style={{
                              fontFamily: 'var(--ff)',
                              fontSize: 11,
                              fontWeight: 600,
                              color: r.badgeColour ?? 'var(--muted)',
                              background: `color-mix(in srgb,${r.badgeColour ?? 'var(--muted)'} 10%,transparent)`,
                              borderRadius: 5,
                              padding: '2px 8px',
                            }}
                          >
                            {r.badge}
                          </span>
                        )}
                      </td>
                      <td style={{ width: 60, textAlign: 'right', color: 'var(--muted)', fontFamily: 'var(--ff)', fontSize: 12 }}>
                        →
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ))
      )}
    </div>
  )
}
