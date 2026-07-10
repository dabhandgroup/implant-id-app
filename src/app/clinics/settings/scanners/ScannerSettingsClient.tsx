'use client'

import { useState } from 'react'
import { useQuery, useMutation } from 'convex/react'
import { api as apiBase } from '../../../../../convex/_generated/api'
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const api = apiBase as any

type Scanner = {
  _id:              string
  manufacturer:     string
  model:            string
  fieldStrength:    string
  scannerType:      string
  boreDiameter?:    number
  tableLimitKg?:    number
  fieldOrientation?: string
}

const FS_OPTIONS = ['All', '0.55T', '1.5T', '3T', '7T']

export default function ScannerSettingsClient() {
  const allScanners    = useQuery(api.scanners.listApprovedScanners) as Scanner[] | undefined
  const myScanners     = useQuery(api.scanners.getMyClinicScanners)  as Scanner[] | undefined
  const addScanner     = useMutation(api.scanners.addScannerToClinic)
  const removeScanner  = useMutation(api.scanners.removeScannerFromClinic)

  const [fsFilter, setFsFilter] = useState('All')
  const [search,   setSearch]   = useState('')
  const [working,  setWorking]  = useState<string | null>(null)
  const [errors,   setErrors]   = useState<Record<string, string>>({})

  const myIds = new Set((myScanners ?? []).map(s => s._id))

  const filtered = (allScanners ?? []).filter(s => {
    if (fsFilter !== 'All' && s.fieldStrength !== fsFilter) return false
    if (search.trim()) {
      const q = search.toLowerCase()
      if (!`${s.manufacturer} ${s.model}`.toLowerCase().includes(q)) return false
    }
    return true
  })

  const sorted = [...filtered].sort((a, b) => {
    const aAt = myIds.has(a._id) ? 0 : 1
    const bAt = myIds.has(b._id) ? 0 : 1
    if (aAt !== bAt) return aAt - bAt
    const m = a.manufacturer.localeCompare(b.manufacturer)
    return m !== 0 ? m : a.model.localeCompare(b.model)
  })

  async function handleToggle(s: Scanner) {
    const linked = myIds.has(s._id)
    setWorking(s._id)
    setErrors(e => { const n = { ...e }; delete n[s._id]; return n })
    try {
      if (linked) {
        await removeScanner({ scannerId: s._id as never })
      } else {
        await addScanner({ scannerId: s._id as never })
      }
    } catch (e) {
      setErrors(prev => ({ ...prev, [s._id]: (e as { message?: string })?.message ?? 'Failed' }))
    } finally {
      setWorking(null)
    }
  }

  if (allScanners === undefined || myScanners === undefined) {
    return <div style={{ padding: '32px 0', textAlign: 'center', fontFamily: 'var(--ff)', fontSize: 13, color: 'var(--muted)' }}>Loading…</div>
  }

  const linkedCount = myScanners.length

  return (
    <div className="m-content">
      <div className="m-h" style={{ marginBottom: 24 }}>
        <div>
          <h2>MRI Scanners</h2>
          <p className="sub">
            Browse the verified scanner library and add scanners installed at your site.
            Scanner models are maintained by platform administrators.
          </p>
        </div>
        {linkedCount > 0 && (
          <div style={{ fontFamily: 'var(--ff)', textAlign: 'right', flexShrink: 0 }}>
            <span style={{ fontSize: 22, fontWeight: 700, color: 'var(--text)', lineHeight: 1 }}>{linkedCount}</span>
            <br />
            <span style={{ fontSize: 12, color: 'var(--muted)' }}>at this site</span>
          </div>
        )}
      </div>

      <div style={{ background: 'rgba(var(--accent-rgb),0.06)', border: '1px solid rgba(var(--accent-rgb),0.18)', borderRadius: 10, padding: '12px 16px', marginBottom: 20, fontFamily: 'var(--ff)', fontSize: 13, color: 'var(--accent-deep)', lineHeight: 1.6 }}>
        Scanner specifications are verified by Implant ID administrators. If a scanner model is missing, contact{' '}
        <a href="mailto:support@implantid.io" style={{ color: 'inherit', fontWeight: 600 }}>support@implantid.io</a>.
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center', marginBottom: 18 }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {FS_OPTIONS.map(fs => (
            <button
              key={fs}
              type="button"
              onClick={() => setFsFilter(fs)}
              aria-pressed={fsFilter === fs}
              style={{
                fontFamily: 'var(--ff)', fontSize: 12.5, fontWeight: 500,
                padding: '5px 12px', borderRadius: 8, cursor: 'pointer', transition: 'all .12s',
                border: fsFilter === fs ? '1.5px solid var(--accent)' : '1px solid var(--border)',
                background: fsFilter === fs ? 'rgba(var(--accent-rgb),0.10)' : 'var(--bg)',
                color: fsFilter === fs ? 'var(--accent-deep)' : 'var(--muted)',
              }}
            >{fs}</button>
          ))}
        </div>
        <input
          className="input"
          style={{ flex: 1, minWidth: 160, maxWidth: 300 }}
          placeholder="Search manufacturer or model…"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      <div style={{ fontFamily: 'var(--ff)', fontSize: 11, fontWeight: 700, letterSpacing: '1px', textTransform: 'uppercase', color: 'var(--muted2)', marginBottom: 10 }}>
        {sorted.length} scanner{sorted.length !== 1 ? 's' : ''}{fsFilter !== 'All' || search.trim() ? ' matching' : ' in library'}
      </div>

      {allScanners.length === 0 ? (
        <div style={{ padding: '40px 0', textAlign: 'center', fontFamily: 'var(--ff)', fontSize: 13.5, color: 'var(--muted)' }}>
          No scanners in the library yet. Contact support to add your scanner models.
        </div>
      ) : sorted.length === 0 ? (
        <div style={{ padding: '32px 0', textAlign: 'center', fontFamily: 'var(--ff)', fontSize: 13.5, color: 'var(--muted)' }}>
          No scanners match the current filters.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {sorted.map(s => {
            const linked = myIds.has(s._id)
            const busy   = working === s._id
            return (
              <div
                key={s._id}
                style={{
                  background: 'var(--bg2)',
                  border: `1.5px solid ${linked ? 'rgba(var(--accent-rgb),0.28)' : 'var(--border)'}`,
                  borderRadius: 12, padding: '14px 18px',
                  display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap',
                  opacity: busy ? 0.65 : 1, transition: 'opacity .15s',
                }}
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 4 }}>
                    <span style={{ fontFamily: 'var(--ff)', fontSize: 14, fontWeight: 600, color: 'var(--text)' }}>
                      {s.manufacturer} {s.model}
                    </span>
                    {linked && (
                      <span style={{ fontFamily: 'var(--ff)', fontSize: 11, fontWeight: 600, padding: '2px 7px', borderRadius: 5, background: 'rgba(var(--ok-rgb),0.12)', color: 'var(--ok)' }}>
                        At this site
                      </span>
                    )}
                  </div>
                  <div style={{ fontFamily: 'var(--ff)', fontSize: 12, color: 'var(--muted)', display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
                    <span style={{ fontWeight: 600, color: 'var(--accent-deep)', background: 'rgba(var(--accent-rgb),0.10)', padding: '1px 6px', borderRadius: 5 }}>
                      {s.fieldStrength}
                    </span>
                    <span>{s.scannerType}</span>
                    {s.boreDiameter  && <span>Bore {s.boreDiameter} cm</span>}
                    {s.tableLimitKg  && <span>Table limit {s.tableLimitKg} kg</span>}
                    {s.fieldOrientation && s.fieldOrientation !== 'Not Stated' && <span>{s.fieldOrientation}</span>}
                  </div>
                  {errors[s._id] && (
                    <div style={{ fontFamily: 'var(--ff)', fontSize: 12, color: 'var(--err)', marginTop: 4 }}>{errors[s._id]}</div>
                  )}
                </div>
                <button
                  onClick={() => handleToggle(s)}
                  disabled={busy}
                  aria-label={linked ? `Remove ${s.manufacturer} ${s.model} from site` : `Add ${s.manufacturer} ${s.model} to site`}
                  className={linked ? 'btn' : 'btn btn-s'}
                  style={{
                    fontSize: 12.5, padding: '6px 14px', flexShrink: 0,
                    ...(linked ? { color: 'var(--err)', borderColor: 'rgba(var(--err-rgb),0.35)' } : {}),
                  }}
                >
                  {busy ? '…' : linked ? 'Remove' : 'Add to site'}
                </button>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
