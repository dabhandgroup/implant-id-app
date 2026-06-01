'use client'
import { useQuery } from 'convex/react'
import { api as apiBase } from '../../../../convex/_generated/api'
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const api = apiBase as any

const MRI_COLOURS: Record<string, { color: string; label: string }> = {
  safe:        { color: 'var(--ok)',    label: 'MR Safe' },
  conditional: { color: '#b45309',     label: 'MR Conditional' },
  unsafe:      { color: 'var(--err)',  label: 'MR Unsafe' },
  unknown:     { color: 'var(--muted)', label: 'Unknown' },
}

export default function MasterDevicesClient() {
  const devices = useQuery(api.devices.listDevices)

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

      <div className="m-tbl-wrap">
        {devices.length === 0 ? (
          <div style={{ padding: '48px 0', textAlign: 'center', color: 'var(--muted)', fontFamily: 'var(--ff)', fontSize: 14 }}>
            No devices in catalogue yet.{' '}
            <a href="/master/devices/add" style={{ color: 'var(--accent)' }}>Add the first device →</a>
          </div>
        ) : (
          <table className="m-tbl">
            <thead>
              <tr>
                <th>Manufacturer</th>
                <th>Model</th>
                <th>Type</th>
                <th>MRI Status</th>
                <th>Classification</th>
              </tr>
            </thead>
            <tbody>
              {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
              {devices.map((d: any) => {
                const mri = MRI_COLOURS[d.mriStatus] ?? MRI_COLOURS.unknown
                return (
                  <tr key={d._id}>
                    <td style={{ fontWeight: 500 }}>{d.manufacturer}</td>
                    <td>{d.model}</td>
                    <td style={{ color: 'var(--muted)', fontSize: 13 }}>{d.deviceType}</td>
                    <td>
                      <span style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 6,
                        fontFamily: 'var(--ff)',
                        fontSize: 12,
                        fontWeight: 600,
                        color: mri.color,
                        padding: '3px 8px',
                        borderRadius: 4,
                        background: `color-mix(in srgb,${mri.color} 12%,transparent)`,
                        letterSpacing: '.3px',
                      }}>
                        {mri.label}
                      </span>
                    </td>
                    <td style={{ color: 'var(--muted)', fontSize: 13, textTransform: 'capitalize' }}>{d.classification}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
