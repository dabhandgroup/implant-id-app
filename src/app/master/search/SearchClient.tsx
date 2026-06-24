'use client'

import { useState, useEffect, useRef } from 'react'
import { useQuery }  from 'convex/react'
import { useRouter, useSearchParams } from 'next/navigation'
import { api as apiBase } from '../../../../convex/_generated/api'
import { tint } from '@/lib/tint'
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const api = apiBase as any

const MRI_COLOUR: Record<string, string> = {
  safe: 'var(--ok)', conditional: '#b45309', unsafe: 'var(--err)', unknown: 'var(--muted)',
}
const MRI_LABEL: Record<string, string> = {
  safe: 'MR Safe', conditional: 'MR Conditional', unsafe: 'MR Unsafe', unknown: 'Unknown',
}
const MRI_ICON: Record<string, string> = {
  safe: '/mr-safe.svg', conditional: '/mr-conditional.svg', unsafe: '/mr-unsafe.svg',
}

const PatientIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/>
    <path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
  </svg>
)
const ClinicIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
    <path d="M3 21h18M3 10h18M5 6l7-3 7 3M4 10v11M20 10v11M8 14v3M12 14v3M16 14v3"/>
  </svg>
)
const DeviceIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
    <path d="M22 12h-4l-3 9L9 3l-3 9H2"/>
  </svg>
)

export default function SearchClient() {
  const searchParams = useSearchParams()
  const router       = useRouter()
  const inputRef     = useRef<HTMLInputElement>(null)

  const [query,     setQuery]     = useState(searchParams.get('q') ?? '')
  const [debounced, setDebounced] = useState(query)

  // 300ms debounce
  useEffect(() => {
    const t = setTimeout(() => setDebounced(query), 300)
    return () => clearTimeout(t)
  }, [query])

  const results  = useQuery(api.search.masterSearch, { query: debounced })
  const loading  = results === undefined && debounced.length >= 2
  const total    = (results?.patients?.length ?? 0) + (results?.clinics?.length ?? 0) + (results?.devices?.length ?? 0)

  function SectionHeader({ title, icon, colour, count }: { title: string; icon: React.ReactNode; colour: string; count: number }) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, fontFamily: 'var(--ff)', fontSize: 11, fontWeight: 700, letterSpacing: '1.2px', textTransform: 'uppercase', color: 'var(--muted2)' }}>
        <span style={{ color: colour, display: 'flex' }}>{icon}</span>
        {title}
        <span style={{ fontFamily: 'var(--ff)', fontSize: 10.5, background: 'rgba(var(--text-rgb),0.06)', borderRadius: 4, padding: '1px 6px', color: 'var(--muted)', fontWeight: 500, textTransform: 'none', letterSpacing: 0 }}>{count}</span>
      </div>
    )
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function Row({ item, colour, icon, title, sub, badge, badgeColour, badgeNode, href }: { item: any; colour: string; icon: React.ReactNode; title: string; sub: string; badge?: string; badgeColour?: string; badgeNode?: React.ReactNode; href: string }) {
    return (
      <tr onClick={() => router.push(href)} style={{ cursor: 'pointer' }}>
        <td>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 32, height: 32, borderRadius: 8, background: tint(colour, 10), display: 'grid', placeItems: 'center', flexShrink: 0, color: colour }}>{icon}</div>
            <div>
              <div style={{ fontFamily: 'var(--ff)', fontSize: 13.5, fontWeight: 600, color: 'var(--text)' }}>{title}</div>
              <div style={{ fontFamily: 'var(--fb)', fontSize: 12, color: 'var(--muted)', marginTop: 1 }}>{sub}</div>
            </div>
          </div>
        </td>
        <td style={{ width: 150, textAlign: 'right' }}>
          {badgeNode ?? (badge && <span style={{ fontFamily: 'var(--ff)', fontSize: 11, fontWeight: 600, color: badgeColour ?? 'var(--muted)', background: tint(badgeColour ?? 'var(--muted)', 10), borderRadius: 5, padding: '2px 8px', whiteSpace: 'nowrap' }}>{badge}</span>)}
        </td>
        <td style={{ width: 32, textAlign: 'right', color: 'var(--muted)', fontFamily: 'var(--ff)', fontSize: 13 }}>→</td>
      </tr>
    )
  }

  return (
    <div className="m-content">
      <div className="m-h">
        <div><h2>Search</h2><div className="sub">Search patients, clinics and devices across the platform.</div></div>
      </div>

      {/* Search input */}
      <div style={{ position: 'relative', marginBottom: 20 }}>
        <svg style={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)', width: 18, height: 18, color: 'var(--muted2)', pointerEvents: 'none' }}
          viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
          <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
        </svg>
        <input ref={inputRef} className="input" type="text"
          placeholder="Search by name, Implant ID, device model, clinic…"
          value={query} onChange={e => setQuery(e.target.value)} autoFocus
          style={{ paddingLeft: 46, fontSize: 15, height: 48 }}
        />
        {query && (
          <button onClick={() => { setQuery(''); inputRef.current?.focus() }}
            style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--muted2)', cursor: 'pointer', fontSize: 16, padding: '2px 4px' }}
            aria-label="Clear search">✕</button>
        )}
      </div>

      {/* States */}
      {loading && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 8 }}>
          {[1,2,3].map(i => (
            <div key={i} style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 12, padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 14 }}>
              <div style={{ width: 32, height: 32, borderRadius: 8, background: 'var(--border)', animation: 'pulse 1.5s ease-in-out infinite', flexShrink: 0 }} />
              <div style={{ flex: 1 }}>
                <div style={{ height: 13, borderRadius: 4, background: 'var(--border)', marginBottom: 7, width: `${55 + i * 10}%`, animation: 'pulse 1.5s ease-in-out infinite' }} />
                <div style={{ height: 11, borderRadius: 4, background: 'var(--border)', width: '40%', animation: 'pulse 1.5s ease-in-out infinite' }} />
              </div>
            </div>
          ))}
        </div>
      )}

      {!loading && debounced.length < 2 && (
        <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 14, padding: '48px 24px', textAlign: 'center' }}>
          <div style={{ fontFamily: 'var(--ff)', fontSize: 15, fontWeight: 500, color: 'var(--text)', marginBottom: 6 }}>Start typing to search</div>
          <div style={{ fontFamily: 'var(--fb)', fontSize: 13.5, color: 'var(--muted)' }}>Find patients by name or Implant ID, clinics, or devices</div>
        </div>
      )}

      {!loading && debounced.length >= 2 && total === 0 && (
        <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 14, padding: '48px 24px', textAlign: 'center' }}>
          <div style={{ fontFamily: 'var(--ff)', fontSize: 15, fontWeight: 500, color: 'var(--text)', marginBottom: 6 }}>No results for &ldquo;{debounced}&rdquo;</div>
          <div style={{ fontFamily: 'var(--fb)', fontSize: 13.5, color: 'var(--muted)' }}>Try a different search term</div>
        </div>
      )}

      {/* Patients */}
      {results && results.patients.length > 0 && (
        <div style={{ marginBottom: 24 }}>
          <SectionHeader title="Patients" icon={<PatientIcon />} colour="var(--accent)" count={results.patients.length} />
          <div className="m-tbl-wrap"><table className="m-tbl"><tbody>
            {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
            {results.patients.map((p: any) => (
              <Row key={p._id} item={p} colour="var(--accent)" icon={<PatientIcon />}
                title={p.name} sub={`${p.implantIdCode}${p.device ? ` · ${p.device}` : ''}`}
                badge={p.verificationStatus === 'active' ? 'Verified' : 'Pending'}
                badgeColour={p.verificationStatus === 'active' ? 'var(--ok)' : '#b45309'}
                href={`/master/patients/${p._id}`}
              />
            ))}
          </tbody></table></div>
        </div>
      )}

      {/* Clinics */}
      {results && results.clinics.length > 0 && (
        <div style={{ marginBottom: 24 }}>
          <SectionHeader title="Clinics" icon={<ClinicIcon />} colour="#0284c7" count={results.clinics.length} />
          <div className="m-tbl-wrap"><table className="m-tbl"><tbody>
            {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
            {results.clinics.map((c: any) => (
              <Row key={c._id} item={c} colour="#0284c7" icon={<ClinicIcon />}
                title={c.name} sub={c.email ?? '—'}
                badge={c.status === 'active' ? 'Active' : 'Pending'}
                badgeColour={c.status === 'active' ? 'var(--ok)' : '#b45309'}
                href={c.isApplication ? `/master/clinics/${c._id}` : `/master/clinics`}
              />
            ))}
          </tbody></table></div>
        </div>
      )}

      {/* Devices */}
      {results && results.devices.length > 0 && (
        <div style={{ marginBottom: 24 }}>
          <SectionHeader title="Devices" icon={<DeviceIcon />} colour="#7c3aed" count={results.devices.length} />
          <div className="m-tbl-wrap"><table className="m-tbl"><tbody>
            {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
            {results.devices.map((d: any) => {
              const mriColour = MRI_COLOUR[d.mriStatus] ?? 'var(--muted)'
              const mriIcon   = MRI_ICON[d.mriStatus]
              return (
              <Row key={d._id} item={d} colour="#7c3aed" icon={<DeviceIcon />}
                title={`${d.manufacturer} ${d.model}`} sub={d.deviceType}
                badgeNode={
                  mriIcon
                    ? <img src={mriIcon} alt={MRI_LABEL[d.mriStatus] ?? d.mriStatus} style={{ width:32, height:32, display:'block', flexShrink:0, marginLeft:'auto' }} />
                    : <span style={{ fontFamily:'var(--ff)', fontSize:11, fontWeight:600, color:mriColour, padding:'2px 8px', borderRadius:5, background:tint(mriColour, 12), whiteSpace:'nowrap' }}>{MRI_LABEL[d.mriStatus] ?? d.mriStatus}</span>
                }
                href={`/master/devices/${d.deviceCode ?? d._id}`}
              />
              )
            })}
          </tbody></table></div>
        </div>
      )}
    </div>
  )
}

