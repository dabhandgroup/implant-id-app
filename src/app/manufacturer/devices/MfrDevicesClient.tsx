'use client'

import { useState }       from 'react'
import { useQuery }       from 'convex/react'
import { useRouter }      from 'next/navigation'
import { api as apiBase } from '../../../../convex/_generated/api'
import { tint } from '@/lib/tint'
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const api = apiBase as any

const MRI_COLOUR: Record<string, string> = {
  safe: 'var(--ok)', conditional: '#d97706', unsafe: 'var(--err)', unknown: 'var(--muted)',
}
const MRI_ICON: Record<string, string> = {
  safe: '/mr-safe.svg', conditional: '/mr-conditional.svg', unsafe: '/mr-unsafe.svg',
}
const STATUS_STYLE: Record<string, { bg: string; color: string; label: string }> = {
  live:           { bg: 'rgba(var(--ok-rgb),0.10)',   color: 'var(--ok)',  label: 'Live' },
  pending_review: { bg: 'rgba(var(--warn-rgb),0.10)', color: '#d97706',    label: 'Pending review' },
  draft:          { bg: 'var(--bg)',                                       color: 'var(--muted)', label: 'Draft' },
  recalled:       { bg: 'rgba(var(--err-rgb),0.10)',  color: 'var(--err)', label: 'Recalled' },
}

type Filter = 'all' | 'live' | 'pending_review' | 'recalled'

function formatDate(ts: number) {
  return new Date(ts).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

export default function MfrDevicesClient() {
  const router   = useRouter()
  const mfr      = useQuery(api.manufacturers.getMyManufacturer)
  const devices  = useQuery(
    api.devices.listMyDevices,
    mfr?.companyName ? { manufacturerName: mfr.companyName } : 'skip',
  )
  const [filter, setFilter] = useState<Filter>('all')
  const [search, setSearch] = useState('')

  if (mfr === undefined || devices === undefined) {
    return <div style={{ padding: '60px 40px', color: 'var(--muted)', fontFamily: 'var(--ff)' }}>Loading…</div>
  }

  const filtered = (devices ?? []).filter((d: any) => {
    if (filter !== 'all' && d.status !== filter) return false
    if (search.trim()) {
      const q = search.toLowerCase()
      return d.manufacturer?.toLowerCase().includes(q) || d.model?.toLowerCase().includes(q) || d.deviceType?.toLowerCase().includes(q)
    }
    return true
  })

  return (
    <div style={{ padding: '36px 40px', maxWidth: 1100, margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontFamily: 'var(--ff)', fontSize: 24, fontWeight: 600, margin: 0 }}>My Devices</h1>
          <p style={{ color: 'var(--muted)', fontSize: 13.5, marginTop: 4 }}>{(devices ?? []).length} devices in your catalogue</p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <a href="/manufacturer/devices/bulk" className="btn" style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="13" height="13"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
            Bulk upload
          </a>
          <a href="/manufacturer/devices/add" className="btn btn-s" style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="13" height="13"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            Add device
          </a>
        </div>
      </div>

      {/* Search + filters */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 20 }}>
        <input className="input" placeholder="Search by device name, model, type…" value={search}
          onChange={e => setSearch(e.target.value)} style={{ maxWidth: 340 }} />
        <div style={{ display: 'flex', gap: 6 }}>
          {(['all', 'live', 'pending_review', 'recalled'] as Filter[]).map(f => (
            <button key={f} className={`btn${filter === f ? ' btn-s' : ''}`}
              style={{ fontSize: 12, padding: '6px 14px' }}
              onClick={() => setFilter(f)}>
              {f === 'all' ? 'All' : f === 'pending_review' ? 'Pending' : f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 14, padding: '48px', textAlign: 'center', color: 'var(--muted)', fontFamily: 'var(--ff)' }}>
          {search ? 'No devices match your search.' : 'No devices yet.'}
          {!search && <div style={{ marginTop: 12 }}><a href="/manufacturer/devices/add" style={{ color: 'var(--accent)' }}>Add your first device</a> or <a href="/manufacturer/devices/bulk" style={{ color: 'var(--accent)' }}>bulk upload</a>.</div>}
        </div>
      ) : (
        <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 14, overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: 'var(--ff)', fontSize: 13.5 }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)', background: 'rgba(var(--text-rgb),0.02)' }}>
                {['Device', 'Type', 'MRI Status', 'Field Strengths', 'Status', 'Added', ''].map(h => (
                  <th key={h} style={{ padding: '12px 16px', textAlign: 'left', fontFamily: 'var(--ff)', fontSize: 11, fontWeight: 600, letterSpacing: '.8px', textTransform: 'uppercase', color: 'var(--muted2)' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {(filtered as any[]).map((d, i) => {
                const st = STATUS_STYLE[d.status ?? 'draft'] ?? STATUS_STYLE.draft
                return (
                  <tr key={d._id} style={{ borderBottom: i < filtered.length - 1 ? '1px solid var(--border)' : 'none', cursor: 'pointer' }}
                    onClick={() => router.push(`/manufacturer/devices/${d._id}`)}>
                    <td style={{ padding: '14px 16px' }}>
                      <div style={{ fontWeight: 600, color: 'var(--text)', marginBottom: 2 }}>{d.deviceType}</div>
                      <div style={{ fontSize: 12, color: 'var(--muted)' }}>{d.model}</div>
                    </td>
                    <td style={{ padding: '14px 16px', color: 'var(--muted)' }}>{d.deviceType || '—'}</td>
                    <td style={{ padding: '14px 16px' }}>
                      <span style={{ display:'inline-flex', alignItems:'center', gap:5, fontFamily:'var(--ff)', fontSize:11, fontWeight:600, color:MRI_COLOUR[d.mriStatus??'unknown'], padding: MRI_ICON[d.mriStatus] ? '3px 8px 3px 4px' : '3px 8px', borderRadius:6, background:tint(MRI_COLOUR[d.mriStatus??'unknown'], 12), whiteSpace:'nowrap' }}>
                        {MRI_ICON[d.mriStatus] && <img src={MRI_ICON[d.mriStatus]} alt="" aria-hidden="true" style={{ width:18, height:18, display:'block', flexShrink:0 }} />}
                        {d.mriStatus === 'safe' ? 'MR Safe' : d.mriStatus === 'conditional' ? 'MR Conditional' : d.mriStatus === 'unsafe' ? 'MR Unsafe' : 'Unknown'}
                      </span>
                    </td>
                    <td style={{ padding: '14px 16px', color: 'var(--muted)', fontFamily: 'monospace', fontSize: 12 }}>{d.fieldStrengths || '—'}</td>
                    <td style={{ padding: '14px 16px' }}>
                      <span style={{ display: 'inline-block', background: st.bg, color: st.color, fontFamily: 'var(--ff)', fontSize: 11.5, fontWeight: 600, padding: '3px 10px', borderRadius: 6 }}>
                        {st.label}
                      </span>
                    </td>
                    <td style={{ padding: '14px 16px', color: 'var(--muted)', fontSize: 12.5 }}>{formatDate(d.publishedAt)}</td>
                    <td style={{ padding: '14px 16px' }} onClick={e => e.stopPropagation()}>
                      <a href={`/manufacturer/devices/${d._id}`} style={{ color: 'var(--accent)', fontSize: 12.5, textDecoration: 'none' }}>Edit</a>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
