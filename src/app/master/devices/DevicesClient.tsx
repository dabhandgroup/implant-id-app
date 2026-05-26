'use client'

import { useState } from 'react'

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
  { id: 'acumed-total-hip', name: 'Acumed Total Hip System', manufacturer: 'Acumed Ltd', category: 'Hip Replacement', model: 'ACU-TH-7742', mri: 'MR Conditional', mriStatus: 'conditional', status: 'active' },
  { id: 'zimmer-oxford-knee', name: 'Zimmer Biomet Oxford Knee', manufacturer: 'Zimmer Biomet', category: 'Knee Replacement', model: 'ZB-OK-PMU3', mri: 'MR Safe', mriStatus: 'safe', status: 'active' },
  { id: 'medtronic-micra', name: 'Medtronic Micra AV', manufacturer: 'Medtronic plc', category: 'Cardiac Pacemaker', model: 'MDT-MICRA-AV2', mri: 'MR Conditional', mriStatus: 'conditional', status: 'active' },
  { id: 'stryker-tritanium', name: 'Stryker Tritanium PL Cage', manufacturer: 'Stryker Orthopaedics', category: 'Spinal Implant', model: 'STR-TT-PL-S', mri: 'MR Safe', mriStatus: 'safe', status: 'draft' },
  { id: 'cochlear-nucleus', name: 'Cochlear Nucleus Profile Plus', manufacturer: 'Cochlear Ltd', category: 'Cochlear Implant', model: 'COC-CI-N7-P', mri: 'MR Unsafe', mriStatus: 'unsafe', status: 'active' },
]

function mriColour(s: Device['mriStatus']) {
  if (s === 'safe') return 'var(--ok)'
  if (s === 'conditional') return '#d97706'
  return 'var(--err)'
}

export default function DevicesClient() {
  const [confirmUnpublish, setConfirmUnpublish] = useState<string | null>(null)
  const [confirming, setConfirming] = useState(false)
  const [confirmed, setConfirmed] = useState(false)

  function openUnpublish(name: string) {
    setConfirmUnpublish(name)
    setConfirming(false)
    setConfirmed(false)
  }

  function closeUnpublish() {
    setConfirmUnpublish(null)
    setConfirming(false)
    setConfirmed(false)
  }

  async function handleConfirm() {
    setConfirming(true)
    await new Promise(r => setTimeout(r, 800))
    setConfirmed(true)
    await new Promise(r => setTimeout(r, 900))
    closeUnpublish()
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
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {devices.map(d => (
              <tr key={d.id}>
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
                <td style={{ display: 'flex', gap: 6 }}>
                  <a href={`/master/devices/${d.id}`} className="m-act">View</a>
                  <button className="m-act">Edit</button>
                  {d.status === 'active' ? (
                    <button className="m-act danger" onClick={() => openUnpublish(d.name)}>Unpublish</button>
                  ) : (
                    <button className="m-act">Publish</button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* ── Unpublish confirmation modal ── */}
      {confirmUnpublish && (
        <div className="logout-back open" onClick={closeUnpublish}>
          <div className="logout-modal" onClick={e => e.stopPropagation()}>
            <div className="logout-body">
              <div style={{ width: 44, height: 44, borderRadius: '50%', background: 'color-mix(in srgb,var(--err) 12%,transparent)', display: 'grid', placeItems: 'center', margin: '0 auto 14px' }}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--err)" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18"/>
                  <line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </div>
              <h3>Unpublish device?</h3>
              <p><strong>{confirmUnpublish}</strong></p>
              <p>This device will no longer be visible to patients or clinics.</p>
            </div>
            <div className="logout-actions">
              <button className="btn" onClick={closeUnpublish} disabled={confirming}>Cancel</button>
              <button className="btn btn-danger" onClick={handleConfirm} disabled={confirming}>
                {confirmed ? 'Unpublished' : confirming ? 'Unpublishing…' : 'Unpublish'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
