'use client'

import { useRouter } from 'next/navigation'

interface Device {
  id: string
  name: string
  manufacturer: string
  category: string
  model: string
  mri: string
  mriStatus: 'safe' | 'conditional' | 'unsafe'
  status: 'active' | 'draft'
}

const devices: Device[] = [
  { id: 'acumed-total-hip',    name: 'Acumed Total Hip System',         manufacturer: 'Acumed Ltd',           category: 'Hip Replacement',    model: 'ACU-TH-7742',    mri: 'MR Conditional', mriStatus: 'conditional', status: 'active' },
  { id: 'zimmer-oxford-knee',  name: 'Zimmer Biomet Oxford Knee',       manufacturer: 'Zimmer Biomet',        category: 'Knee Replacement',   model: 'ZB-OK-PMU3',     mri: 'MR Safe',        mriStatus: 'safe',        status: 'active' },
  { id: 'medtronic-micra',     name: 'Medtronic Micra AV',              manufacturer: 'Medtronic plc',        category: 'Cardiac Pacemaker',  model: 'MDT-MICRA-AV2',  mri: 'MR Conditional', mriStatus: 'conditional', status: 'active' },
  { id: 'stryker-tritanium',   name: 'Stryker Tritanium PL Cage',       manufacturer: 'Stryker Orthopaedics', category: 'Spinal Implant',     model: 'STR-TT-PL-S',    mri: 'MR Safe',        mriStatus: 'safe',        status: 'draft'  },
  { id: 'cochlear-nucleus',    name: 'Cochlear Nucleus Profile Plus',   manufacturer: 'Cochlear Ltd',         category: 'Cochlear Implant',   model: 'COC-CI-N7-P',    mri: 'MR Unsafe',      mriStatus: 'unsafe',      status: 'active' },
]

function mriColour(s: Device['mriStatus']) {
  if (s === 'safe')        return 'var(--ok)'
  if (s === 'conditional') return '#d97706'
  return 'var(--err)'
}

export default function DevicesClient() {
  const router = useRouter()

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

      <div className="m-tbl-toolbar">
        <div className="search">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
            <circle cx="11" cy="11" r="8"/>
            <line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          <input type="text" placeholder="Search devices, manufacturers…" />
        </div>
        <button className="m-act">Filter by category</button>
      </div>

      <div className="m-tbl-wrap">
        <table className="m-tbl">
          <thead>
            <tr>
              <th>Device Name</th>
              <th>Manufacturer</th>
              <th>Category</th>
              <th>Model No.</th>
              <th>MRI Safe</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {devices.map(d => (
              <tr
                key={d.id}
                style={{ cursor: 'pointer' }}
                onClick={() => router.push(`/master/devices/${d.id}`)}
              >
                <td style={{ fontWeight: 500 }}>{d.name}</td>
                <td>{d.manufacturer}</td>
                <td>{d.category}</td>
                <td style={{ fontFamily: 'var(--ff)', fontSize: 12, color: 'var(--muted)' }}>{d.model}</td>
                <td>
                  <span style={{ color: mriColour(d.mriStatus), fontFamily: 'var(--ff)', fontSize: 12.5, fontWeight: 600 }}>{d.mri}</span>
                </td>
                <td>
                  <span className={`m-status ${d.status}`}>
                    {d.status.charAt(0).toUpperCase() + d.status.slice(1)}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
