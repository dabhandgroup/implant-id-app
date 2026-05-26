'use client'

import { useState } from 'react'

type DeviceTab = 'active' | 'pending' | 'draft'

interface ManufacturerData {
  name: string
  contact: string
  country: string
  status: string
  devices: number
  joined: string
  address: string
  website: string
  regNumber: string
}

interface Device {
  model: string
  category: string
  mri: string
  published: string
  status: 'active' | 'pending' | 'draft'
}

const manufacturerData: Record<string, ManufacturerData> = {
  'medtronic': {
    name: 'Medtronic plc',
    contact: 'uk@medtronic.com',
    country: 'Ireland',
    status: 'active',
    devices: 312,
    joined: '10 Jan 2026',
    address: 'Brinkley Place, Cork T12 Y5XR, Ireland',
    website: 'medtronic.com',
    regNumber: 'IE-MED-0044312',
  },
  'zimmer-biomet': {
    name: 'Zimmer Biomet',
    contact: 'data@zimmerbiomet.com',
    country: 'United States',
    status: 'active',
    devices: 487,
    joined: '14 Jan 2026',
    address: '345 E Main St, Warsaw, IN 46580, USA',
    website: 'zimmerbiomet.com',
    regNumber: 'FDA-510K-2024-ZB',
  },
  'stryker': {
    name: 'Stryker Orthopaedics',
    contact: 'catalogue@stryker.com',
    country: 'United States',
    status: 'active',
    devices: 214,
    joined: '20 Feb 2026',
    address: '2825 Airview Blvd, Kalamazoo, MI 49002, USA',
    website: 'stryker.com',
    regNumber: 'FDA-510K-2024-ST',
  },
  'cochlear': {
    name: 'Cochlear Ltd',
    contact: 'implantid@cochlear.com',
    country: 'Australia',
    status: 'pending',
    devices: 0,
    joined: '18 May 2026',
    address: '1 University Ave, Macquarie University NSW 2109',
    website: 'cochlear.com',
    regNumber: 'TGA-AUST-R-089723',
  },
  'acumed': {
    name: 'Acumed Ltd',
    contact: 'accounts@acumed.net',
    country: 'United Kingdom',
    status: 'pending',
    devices: 0,
    joined: '21 May 2026',
    address: 'Nidderdale House, Harrogate HG3 1RE',
    website: 'acumed.net',
    regNumber: 'MHRA-CA-2024-0912',
  },
}

const sampleDevices: Record<string, Device[]> = {
  'medtronic': [
    { model: 'Micra AV Pacemaker', category: 'Cardiac', mri: 'MR Conditional', published: '12 Jan 2026', status: 'active' },
    { model: 'Reveal LINQ ICM', category: 'Cardiac', mri: 'MR Conditional', published: '12 Jan 2026', status: 'active' },
    { model: 'SynchroMed II', category: 'Drug Delivery', mri: 'MR Conditional', published: '16 Jan 2026', status: 'active' },
    { model: 'Intrepid TMVR', category: 'Cardiac Valve', mri: 'MR Unsafe', published: '—', status: 'pending' },
    { model: 'Intellis Spinal Cord Stimulator', category: 'Neuro', mri: 'MR Conditional', published: '—', status: 'draft' },
  ],
  'zimmer-biomet': [
    { model: 'Oxford Knee System', category: 'Knee', mri: 'MR Safe', published: '16 Jan 2026', status: 'active' },
    { model: 'NexGen Complete Knee', category: 'Knee', mri: 'MR Safe', published: '16 Jan 2026', status: 'active' },
    { model: 'Trilogy Acetabular System', category: 'Hip', mri: 'MR Safe', published: '17 Jan 2026', status: 'active' },
    { model: 'Zimmer M/L Taper Hip', category: 'Hip', mri: 'MR Safe', published: '—', status: 'pending' },
    { model: 'Persona Knee System', category: 'Knee', mri: 'MR Conditional', published: '—', status: 'draft' },
  ],
  'stryker': [
    { model: 'Tritanium PL Cage', category: 'Spinal', mri: 'MR Safe', published: '22 Feb 2026', status: 'active' },
    { model: 'Accolade II Hip Stem', category: 'Hip', mri: 'MR Safe', published: '22 Feb 2026', status: 'active' },
    { model: 'MAKO Robotic Partial Knee', category: 'Knee', mri: 'MR Safe', published: '24 Feb 2026', status: 'active' },
    { model: 'Triathlon Knee', category: 'Knee', mri: 'MR Conditional', published: '—', status: 'pending' },
    { model: 'Rejuvenate Hip', category: 'Hip', mri: 'MR Conditional', published: '—', status: 'draft' },
  ],
}

function mriColour(mri: string) {
  if (mri === 'MR Safe') return 'var(--ok)'
  if (mri === 'MR Conditional') return '#d97706'
  return 'var(--err)'
}

export default function ManufacturerClient({ id }: { id: string }) {
  const [deviceTab, setDeviceTab] = useState<DeviceTab>('active')
  const [confirmUnpublish, setConfirmUnpublish] = useState<string | null>(null)
  const [confirmApprove, setConfirmApprove] = useState(false)
  const [confirming, setConfirming] = useState(false)
  const [confirmed, setConfirmed] = useState(false)

  function openUnpublish(model: string) {
    setConfirmUnpublish(model)
    setConfirming(false)
    setConfirmed(false)
  }

  function closeUnpublish() {
    setConfirmUnpublish(null)
    setConfirming(false)
    setConfirmed(false)
  }

  function openApprove() {
    setConfirmApprove(true)
    setConfirming(false)
    setConfirmed(false)
  }

  function closeApprove() {
    setConfirmApprove(false)
    setConfirming(false)
    setConfirmed(false)
  }

  async function handleConfirm() {
    setConfirming(true)
    await new Promise(r => setTimeout(r, 800))
    setConfirmed(true)
    await new Promise(r => setTimeout(r, 900))
    setConfirmUnpublish(null)
    setConfirmApprove(false)
    setConfirming(false)
    setConfirmed(false)
  }

  const mfr = manufacturerData[id]
  const allDevices = sampleDevices[id] ?? []
  const filteredDevices = allDevices.filter(d => d.status === deviceTab)

  const activeCount  = allDevices.filter(d => d.status === 'active').length
  const pendingCount = allDevices.filter(d => d.status === 'pending').length
  const draftCount   = allDevices.filter(d => d.status === 'draft').length

  if (!mfr) {
    return (
      <div className="m-content">
        <a href="/master/manufacturers" className="m-back">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="15 18 9 12 15 6"/>
          </svg>
          Back to Manufacturers
        </a>
        <div className="m-h">
          <div>
            <h2>Manufacturer Detail</h2>
            <div className="sub">ID: {id}</div>
          </div>
        </div>
        <p style={{ color: 'var(--muted)', fontFamily: 'var(--fb)', fontSize: 14 }}>
          Manufacturer not found.
        </p>
      </div>
    )
  }

  return (
    <div className="m-content">
      <a href="/master/manufacturers" className="m-back">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <polyline points="15 18 9 12 15 6"/>
        </svg>
        Back to Manufacturers
      </a>

      <div className="m-h">
        <div>
          <h2>{mfr.name}</h2>
          <div className="sub" style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 6 }}>
            <span className={`m-status ${mfr.status}`}>{mfr.status.charAt(0).toUpperCase() + mfr.status.slice(1)}</span>
            <span>Joined {mfr.joined}</span>
          </div>
        </div>
        {mfr.status === 'pending' && (
          <button className="btn btn-s" onClick={openApprove}>Approve</button>
        )}
      </div>

      <div className="m-info-grid">
        <div className="m-info-card">
          <div className="k">Registration Number</div>
          <div className="v">{mfr.regNumber}</div>
        </div>
        <div className="m-info-card">
          <div className="k">Website</div>
          <div className="v">{mfr.website}</div>
        </div>
        <div className="m-info-card">
          <div className="k">Country</div>
          <div className="v">{mfr.country}</div>
        </div>
        <div className="m-info-card">
          <div className="k">Joined</div>
          <div className="v">{mfr.joined}</div>
        </div>
        <div className="m-info-card">
          <div className="k">Contact Email</div>
          <div className="v">{mfr.contact}</div>
        </div>
        <div className="m-info-card">
          <div className="k">Total Devices</div>
          <div className="v">{mfr.devices > 0 ? mfr.devices : allDevices.length}</div>
        </div>
        <div className="m-info-card" style={{ gridColumn: '1 / -1' }}>
          <div className="k">Address</div>
          <div className="v">{mfr.address}</div>
        </div>
      </div>

      {/* ── Devices section ── */}
      <div style={{ marginBottom: 12, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <h3 style={{ fontFamily: 'var(--ff)', fontSize: 15, fontWeight: 600, color: 'var(--text)', margin: 0 }}>
          Devices
        </h3>
      </div>

      {allDevices.length === 0 ? (
        <div className="m-tbl-wrap" style={{ padding: '32px 20px', textAlign: 'center', color: 'var(--muted)', fontFamily: 'var(--fb)', fontSize: 14 }}>
          No devices uploaded yet.
        </div>
      ) : (
        <>
          <div className="m-tabs">
            <button
              className={`m-tab${deviceTab === 'active' ? ' active' : ''}`}
              onClick={() => setDeviceTab('active')}
            >
              Active
              <span style={{ marginLeft: 6, background: activeCount > 0 ? 'var(--ok)' : 'var(--muted2)', color: '#fff', borderRadius: 10, padding: '1px 7px', fontSize: 11, fontWeight: 700 }}>
                {activeCount}
              </span>
            </button>
            <button
              className={`m-tab${deviceTab === 'pending' ? ' active' : ''}`}
              onClick={() => setDeviceTab('pending')}
            >
              Pending Review
              {pendingCount > 0 && (
                <span style={{ marginLeft: 6, background: '#d97706', color: '#fff', borderRadius: 10, padding: '1px 7px', fontSize: 11, fontWeight: 700 }}>
                  {pendingCount}
                </span>
              )}
            </button>
            <button
              className={`m-tab${deviceTab === 'draft' ? ' active' : ''}`}
              onClick={() => setDeviceTab('draft')}
            >
              Draft
              {draftCount > 0 && (
                <span style={{ marginLeft: 6, background: 'var(--muted2)', color: '#fff', borderRadius: 10, padding: '1px 7px', fontSize: 11, fontWeight: 700 }}>
                  {draftCount}
                </span>
              )}
            </button>
          </div>

          {filteredDevices.length === 0 ? (
            <div className="m-tbl-wrap" style={{ padding: '28px 20px', textAlign: 'center', color: 'var(--muted)', fontFamily: 'var(--fb)', fontSize: 14 }}>
              No {deviceTab} devices.
            </div>
          ) : (
            <div className="m-tbl-wrap">
              <table className="m-tbl">
                <thead>
                  <tr>
                    <th>Model</th>
                    <th>Category</th>
                    <th>MRI Status</th>
                    <th>{deviceTab === 'active' ? 'Published' : 'Submitted'}</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredDevices.map(d => (
                    <tr key={d.model}>
                      <td style={{ fontWeight: 500 }}>{d.model}</td>
                      <td>{d.category}</td>
                      <td>
                        <span style={{ color: mriColour(d.mri), fontFamily: 'var(--ff)', fontSize: 12.5, fontWeight: 600 }}>{d.mri}</span>
                      </td>
                      <td style={{ color: d.published === '—' ? 'var(--muted)' : 'var(--text)' }}>{d.published}</td>
                      <td style={{ display: 'flex', gap: 6 }}>
                        <button className="m-act">View</button>
                        {deviceTab === 'active' && (
                          <button className="m-act danger" onClick={() => openUnpublish(d.model)}>Unpublish</button>
                        )}
                        {deviceTab === 'pending' && (
                          <button className="m-act approve">Approve</button>
                        )}
                        {deviceTab === 'draft' && (
                          <button className="m-act">Publish</button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

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

      {/* ── Approve manufacturer modal ── */}
      {confirmApprove && (
        <div className="logout-back open" onClick={closeApprove}>
          <div className="logout-modal" onClick={e => e.stopPropagation()}>
            <div className="logout-body">
              <div style={{ width: 44, height: 44, borderRadius: '50%', background: 'color-mix(in srgb,var(--ok) 12%,transparent)', display: 'grid', placeItems: 'center', margin: '0 auto 14px' }}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--ok)" strokeWidth="2">
                  <path d="M20 6L9 17l-5-5"/>
                </svg>
              </div>
              <h3>Approve manufacturer?</h3>
              <p><strong>{mfr.name}</strong></p>
              <p>This will activate their account and allow them to upload devices.</p>
            </div>
            <div className="logout-actions">
              <button className="btn" onClick={closeApprove} disabled={confirming}>Cancel</button>
              <button className="btn btn-s" onClick={handleConfirm} disabled={confirming}>
                {confirmed ? 'Approved!' : confirming ? 'Approving…' : 'Approve'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
