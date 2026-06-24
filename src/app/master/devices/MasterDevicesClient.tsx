'use client'
import { useState } from 'react'
import { useQuery, useMutation } from 'convex/react'
import { useRouter } from 'next/navigation'
import { api as apiBase } from '../../../../convex/_generated/api'
import { tint } from '@/lib/tint'
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const api = apiBase as any

const MRI_COLOURS: Record<string, { color: string; label: string }> = {
  safe:        { color: 'var(--ok)',    label: 'MR Safe' },
  conditional: { color: '#b45309',     label: 'MR Conditional' },
  unsafe:      { color: 'var(--err)',  label: 'MR Unsafe' },
  unknown:     { color: 'var(--muted)', label: 'Unknown' },
}

const MRI_ICON: Record<string, string> = {
  safe:        '/mr-safe.svg',
  conditional: '/mr-conditional.svg',
  unsafe:      '/mr-unsafe.svg',
}

export default function MasterDevicesClient() {
  const devices      = useQuery(api.devices.listDevices)
  const trashDevices = useQuery(api.devices.listTrashDevices)
  const restoreDevice      = useMutation(api.devices.restoreDevice)
  const permanentlyDelete  = useMutation(api.devices.permanentlyDeleteDevice)
  const router = useRouter()

  const [view,           setView]           = useState<'catalogue' | 'trash'>('catalogue')
  const [trashAction,    setTrashAction]    = useState<{ id: string; name: string; action: 'restore' | 'delete' } | null>(null)
  const [trashWorking,   setTrashWorking]   = useState(false)
  const [trashError,     setTrashError]     = useState('')

  async function handleTrashAction() {
    if (!trashAction) return
    setTrashWorking(true); setTrashError('')
    try {
      if (trashAction.action === 'restore') {
        await restoreDevice({ id: trashAction.id as never })
      } else {
        await permanentlyDelete({ id: trashAction.id as never })
      }
      setTrashAction(null)
    } catch (e) {
      setTrashError((e as { message?: string })?.message ?? 'Failed — try again')
    } finally {
      setTrashWorking(false)
    }
  }

  const loading = devices === undefined

  return (
    <div className="m-content">
      <div className="m-h">
        <div>
          <h2>All Devices</h2>
          <div className="sub">Full catalogue of implantable medical devices across all manufacturers.</div>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <a href="/master/devices/add" className="btn btn-s">+ Add Device</a>
          <a href="/master/devices/bulk" className="btn">Bulk Upload</a>
        </div>
      </div>

      {/* ── View tabs ── */}
      <div style={{ display:'flex', gap:4, marginBottom:20, borderBottom:'1px solid var(--border)', paddingBottom:0 }}>
        <button
          type="button"
          onClick={() => setView('catalogue')}
          style={{ fontFamily:'var(--ff)', fontSize:13.5, fontWeight:600, color: view === 'catalogue' ? 'var(--accent)' : 'var(--muted)', background:'none', border:0, borderBottom: view === 'catalogue' ? '2px solid var(--accent)' : '2px solid transparent', padding:'10px 16px', cursor:'pointer', transition:'all .15s', marginBottom:-1 }}
        >
          Catalogue
        </button>
        <button
          type="button"
          onClick={() => setView('trash')}
          style={{ fontFamily:'var(--ff)', fontSize:13.5, fontWeight:600, color: view === 'trash' ? 'var(--err)' : 'var(--muted)', background:'none', border:0, borderBottom: view === 'trash' ? '2px solid var(--err)' : '2px solid transparent', padding:'10px 16px', cursor:'pointer', transition:'all .15s', marginBottom:-1, display:'flex', alignItems:'center', gap:6 }}
        >
          Trash
          {trashDevices && trashDevices.length > 0 && (
            <span style={{ fontFamily:'var(--ff)', fontSize:11, fontWeight:700, background:'rgba(var(--err-rgb),0.12)', color:'var(--err)', borderRadius:10, padding:'1px 7px' }}>
              {trashDevices.length}
            </span>
          )}
        </button>
      </div>

      {/* ── Catalogue view ── */}
      {view === 'catalogue' && (
        loading ? (
          <div className="m-tbl-wrap" style={{ padding: '40px 0', textAlign: 'center', color: 'var(--muted)', fontFamily: 'var(--ff)', fontSize: 14 }}>
            Loading…
          </div>
        ) : devices.length === 0 ? (
          <div className="m-tbl-wrap" style={{ padding: '48px 0', textAlign: 'center', color: 'var(--muted)', fontFamily: 'var(--ff)', fontSize: 14 }}>
            No devices in catalogue yet.{' '}
            <a href="/master/devices/add" style={{ color: 'var(--accent)' }}>Add the first device →</a>
          </div>
        ) : (
          <>
            {/* ── Desktop table ── */}
            <div className="m-tbl-wrap m-devices-table">
              <table className="m-tbl">
                <thead>
                  <tr>
                    <th>Manufacturer</th>
                    <th>Model</th>
                    <th>Type</th>
                    <th style={{ minWidth: 160 }}>MRI Status</th>
                    <th>Class.</th>
                  </tr>
                </thead>
                <tbody>
                  {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                  {devices.map((d: any) => {
                    const mri  = MRI_COLOURS[d.mriStatus] ?? MRI_COLOURS.unknown
                    const icon = MRI_ICON[d.mriStatus]
                    return (
                      <tr key={d._id} style={{ cursor: 'pointer' }} onClick={() => router.push(`/master/devices/${d.deviceCode ?? d._id}`)}>
                        <td style={{ fontWeight: 500 }}>{d.manufacturer}</td>
                        <td>{d.model}</td>
                        <td style={{ color: 'var(--muted)', fontSize: 13 }}>{d.deviceType}</td>
                        <td>
                          <span style={{ display:'inline-flex', alignItems:'center', gap:6, fontFamily:'var(--ff)', fontSize:11, fontWeight:600, color:mri.color, padding:'3px 8px 3px 4px', borderRadius:6, background:tint(mri.color, 12), letterSpacing:'.2px', whiteSpace:'nowrap' }}>
                            {icon && (
                              <img src={icon} alt="" aria-hidden="true" style={{ width:24, height:24, display:'block', flexShrink:0 }} />
                            )}
                            {mri.label}
                          </span>
                        </td>
                        <td style={{ color:'var(--muted)', fontSize:13, textTransform:'capitalize' }}>{d.classification}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            {/* ── Mobile cards ── */}
            <div className="m-devices-cards">
              {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
              {devices.map((d: any) => {
                const mri  = MRI_COLOURS[d.mriStatus] ?? MRI_COLOURS.unknown
                const icon = MRI_ICON[d.mriStatus]
                return (
                  <div
                    key={d._id}
                    onClick={() => router.push(`/master/devices/${d.deviceCode ?? d._id}`)}
                    style={{ background:'var(--bg2)', border:'1px solid var(--border)', borderRadius:12, padding:'14px 16px', cursor:'pointer', marginBottom:10, display:'flex', alignItems:'center', gap:14 }}
                  >
                    <div style={{ width:4, alignSelf:'stretch', borderRadius:2, background:mri.color, flexShrink:0 }} />
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ fontFamily:'var(--ff)', fontSize:13, fontWeight:600, color:'var(--text)', marginBottom:2 }}>{d.manufacturer}</div>
                      <div style={{ fontFamily:'var(--fb)', fontSize:14, color:'var(--text)', fontWeight:500, marginBottom:4, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{d.model}</div>
                      <div style={{ fontSize:12, color:'var(--muted)', textTransform:'capitalize' }}>{d.deviceType} · {d.classification}</div>
                    </div>
                    <div style={{ display:'flex', flexDirection:'column', alignItems:'flex-end', gap:6, flexShrink:0 }}>
                      <span style={{ fontFamily:'var(--ff)', display:'inline-flex', alignItems:'center', gap:5, fontSize:11, fontWeight:600, color:mri.color, padding:'3px 8px 3px 4px', borderRadius:6, background:tint(mri.color, 12), whiteSpace:'nowrap' }}>
                        {icon && (
                          <img src={icon} alt="" aria-hidden="true" style={{ width:24, height:24, display:'block', flexShrink:0 }} />
                        )}
                        {mri.label}
                      </span>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--muted2)" strokeWidth="1.7"><polyline points="9 18 15 12 9 6"/></svg>
                    </div>
                  </div>
                )
              })}
            </div>
          </>
        )
      )}

      {/* ── Trash view ── */}
      {view === 'trash' && (
        trashDevices === undefined ? (
          <div style={{ padding: '40px 0', textAlign: 'center', color: 'var(--muted)', fontFamily: 'var(--ff)', fontSize: 14 }}>Loading…</div>
        ) : trashDevices.length === 0 ? (
          <div style={{ padding: '48px 0', textAlign: 'center', color: 'var(--muted)', fontFamily: 'var(--ff)', fontSize: 14 }}>
            Trash is empty.
          </div>
        ) : (
          <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
            {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
            {trashDevices.map((d: any) => (
              <div key={d._id} style={{ background:'var(--bg2)', border:'1px solid var(--border)', borderRadius:12, padding:'14px 16px', display:'flex', alignItems:'center', gap:14, flexWrap:'wrap' }}>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontFamily:'var(--ff)', fontSize:13, fontWeight:600, color:'var(--muted)', marginBottom:2 }}>{d.manufacturer}</div>
                  <div style={{ fontFamily:'var(--fb)', fontSize:14, color:'var(--muted)', fontWeight:500, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{d.model}</div>
                  <div style={{ fontSize:12, color:'var(--muted2)', marginTop:2, textTransform:'capitalize' }}>{d.deviceType} · {d.classification}</div>
                </div>
                <div style={{ display:'flex', gap:8, flexShrink:0 }}>
                  <button
                    type="button"
                    className="btn"
                    onClick={() => setTrashAction({ id: d._id, name: `${d.manufacturer} ${d.model}`, action: 'restore' })}
                  >
                    Restore
                  </button>
                  <button
                    type="button"
                    className="btn btn-danger"
                    onClick={() => setTrashAction({ id: d._id, name: `${d.manufacturer} ${d.model}`, action: 'delete' })}
                  >
                    Delete permanently
                  </button>
                </div>
              </div>
            ))}
          </div>
        )
      )}

      {/* ── Trash action confirmation modal ── */}
      {trashAction && (
        <div className="confirm-back open" onClick={() => !trashWorking && setTrashAction(null)}>
          <div className="confirm-modal" onClick={e => e.stopPropagation()}>
            <div className="confirm-body">
              <div style={{ width:48, height:48, borderRadius:'50%', background:tint(trashAction.action === 'delete' ? 'var(--err)' : 'var(--accent)', 12), display:'grid', placeItems:'center', margin:'0 auto 14px' }}>
                {trashAction.action === 'delete' ? (
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--err)" strokeWidth="1.8" aria-hidden="true">
                    <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
                  </svg>
                ) : (
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="1.8" aria-hidden="true">
                    <polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 .49-4.5"/>
                  </svg>
                )}
              </div>
              <h3>{trashAction.action === 'delete' ? 'Delete permanently?' : 'Restore device?'}</h3>
              <p style={{ color: 'var(--muted)', fontSize: 14 }}>
                <strong style={{ color: 'var(--text)' }}>{trashAction.name}</strong><br/>
                {trashAction.action === 'delete'
                  ? 'This will permanently remove the device and all linked patient records. This cannot be undone.'
                  : 'This will restore the device to the live catalogue.'}
              </p>
              {trashError && <p style={{ color: 'var(--err)', fontSize: 13, marginTop: 8 }}>{trashError}</p>}
            </div>
            <div className="confirm-actions">
              <button className="btn" type="button" onClick={() => setTrashAction(null)} disabled={trashWorking}>Cancel</button>
              <button
                type="button"
                className={trashAction.action === 'delete' ? 'btn btn-danger' : 'btn btn-s'}
                onClick={handleTrashAction}
                disabled={trashWorking}
              >
                {trashWorking
                  ? (trashAction.action === 'delete' ? 'Deleting…' : 'Restoring…')
                  : (trashAction.action === 'delete' ? 'Yes, delete permanently' : 'Yes, restore device')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
