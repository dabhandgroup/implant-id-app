'use client'
import { useQuery } from 'convex/react'
import { useRouter } from 'next/navigation'
import { api as apiBase } from '../../../../convex/_generated/api'
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
  const devices = useQuery(api.devices.listDevices)
  const router  = useRouter()

  if (devices === undefined) {
    return (
      <div className="m-content">
        <div className="m-h">
          <div>
            <h2>All Devices</h2>
            <div className="sub">Full catalogue of implantable medical devices.</div>
          </div>
        </div>
        <div className="m-tbl-wrap" style={{ padding: '40px 0', textAlign: 'center', color: 'var(--muted)', fontFamily: 'var(--ff)', fontSize: 14 }}>
          Loading…
        </div>
      </div>
    )
  }

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

      {devices.length === 0 ? (
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
                        {/* whiteSpace:nowrap stops 'MR Conditional' wrapping inside the badge */}
                        <span style={{ display:'inline-flex', alignItems:'center', gap:6, fontFamily:'var(--ff)', fontSize:11, fontWeight:600, color:mri.color, padding:'3px 8px 3px 4px', borderRadius:6, background:`color-mix(in srgb,${mri.color} 12%,transparent)`, letterSpacing:'.2px', whiteSpace:'nowrap' }}>
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
                  {/* MRI colour bar */}
                  <div style={{ width:4, alignSelf:'stretch', borderRadius:2, background:mri.color, flexShrink:0 }} />

                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ fontFamily:'var(--ff)', fontSize:13, fontWeight:600, color:'var(--text)', marginBottom:2 }}>{d.manufacturer}</div>
                    <div style={{ fontFamily:'var(--fb)', fontSize:14, color:'var(--text)', fontWeight:500, marginBottom:4, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{d.model}</div>
                    <div style={{ fontSize:12, color:'var(--muted)', textTransform:'capitalize' }}>{d.deviceType} · {d.classification}</div>
                  </div>

                  <div style={{ display:'flex', flexDirection:'column', alignItems:'flex-end', gap:6, flexShrink:0 }}>
                    <span style={{ fontFamily:'var(--ff)', display:'inline-flex', alignItems:'center', gap:5, fontSize:11, fontWeight:600, color:mri.color, padding:'3px 8px 3px 4px', borderRadius:6, background:`color-mix(in srgb,${mri.color} 12%,transparent)`, whiteSpace:'nowrap' }}>
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
      )}
    </div>
  )
}
