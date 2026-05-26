'use client'

import { useState } from 'react'

type DeviceTab = 'active' | 'pending' | 'draft'

interface ManufacturerData {
  name: string
  initials: string
  contactName: string
  contact: string
  phone: string
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
    initials: 'MP',
    contactName: 'Sarah Thompson',
    contact: 'uk@medtronic.com',
    phone: '+44 1923 212213',
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
    initials: 'ZB',
    contactName: 'James Holloway',
    contact: 'data@zimmerbiomet.com',
    phone: '+1 574 267 6131',
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
    initials: 'SO',
    contactName: 'Claire Donovan',
    contact: 'catalogue@stryker.com',
    phone: '+1 269 385 2600',
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
    initials: 'CL',
    contactName: 'Toby Russell',
    contact: 'implantid@cochlear.com',
    phone: '+61 2 9428 6555',
    country: 'Australia',
    status: 'pending',
    devices: 0,
    joined: '18 May 2026',
    address: '1 University Ave, Macquarie University NSW 2109, Australia',
    website: 'cochlear.com',
    regNumber: 'TGA-AUST-R-089723',
  },
  'acumed': {
    name: 'Acumed Ltd',
    initials: 'AL',
    contactName: 'Margaret Firth',
    contact: 'accounts@acumed.net',
    phone: '+44 1423 706888',
    country: 'United Kingdom',
    status: 'pending',
    devices: 0,
    joined: '21 May 2026',
    address: 'Nidderdale House, Harrogate HG3 1RE, UK',
    website: 'acumed.net',
    regNumber: 'MHRA-CA-2024-0912',
  },
}

const sampleDevices: Record<string, Device[]> = {
  'medtronic': [
    { model: 'Micra AV Pacemaker',              category: 'Cardiac',      mri: 'MR Conditional', published: '12 Jan 2026', status: 'active'  },
    { model: 'Reveal LINQ ICM',                  category: 'Cardiac',      mri: 'MR Conditional', published: '12 Jan 2026', status: 'active'  },
    { model: 'SynchroMed II',                    category: 'Drug Delivery', mri: 'MR Conditional', published: '16 Jan 2026', status: 'active'  },
    { model: 'Intrepid TMVR',                    category: 'Cardiac Valve', mri: 'MR Unsafe',      published: '—',           status: 'pending' },
    { model: 'Intellis Spinal Cord Stimulator',  category: 'Neuro',        mri: 'MR Conditional', published: '—',           status: 'draft'   },
  ],
  'zimmer-biomet': [
    { model: 'Oxford Knee System',   category: 'Knee', mri: 'MR Safe',        published: '16 Jan 2026', status: 'active'  },
    { model: 'NexGen Complete Knee', category: 'Knee', mri: 'MR Safe',        published: '16 Jan 2026', status: 'active'  },
    { model: 'Trilogy Acetabular',   category: 'Hip',  mri: 'MR Safe',        published: '17 Jan 2026', status: 'active'  },
    { model: 'Zimmer M/L Taper Hip', category: 'Hip',  mri: 'MR Safe',        published: '—',           status: 'pending' },
    { model: 'Persona Knee System',  category: 'Knee', mri: 'MR Conditional', published: '—',           status: 'draft'   },
  ],
  'stryker': [
    { model: 'Tritanium PL Cage',      category: 'Spinal', mri: 'MR Safe',        published: '22 Feb 2026', status: 'active'  },
    { model: 'Accolade II Hip Stem',   category: 'Hip',    mri: 'MR Safe',        published: '22 Feb 2026', status: 'active'  },
    { model: 'MAKO Robotic Partial',   category: 'Knee',   mri: 'MR Safe',        published: '24 Feb 2026', status: 'active'  },
    { model: 'Triathlon Knee',         category: 'Knee',   mri: 'MR Conditional', published: '—',           status: 'pending' },
    { model: 'Rejuvenate Hip',         category: 'Hip',    mri: 'MR Conditional', published: '—',           status: 'draft'   },
  ],
}

function mriColour(mri: string) {
  if (mri === 'MR Safe')        return 'var(--ok)'
  if (mri === 'MR Conditional') return '#d97706'
  return 'var(--err)'
}

export default function ManufacturerClient({ id }: { id: string }) {
  const [deviceTab,      setDeviceTab]      = useState<DeviceTab>('active')
  const [confirmUnpublish, setConfirmUnpublish] = useState<string | null>(null)
  const [confirmApprove,   setConfirmApprove]   = useState(false)
  const [confirmReject,    setConfirmReject]    = useState(false)
  const [confirming,       setConfirming]       = useState(false)
  const [confirmed,        setConfirmed]        = useState(false)
  const [rejectReason,     setRejectReason]     = useState('')

  function openUnpublish(model: string)  { setConfirmUnpublish(model); setConfirming(false); setConfirmed(false) }
  function closeUnpublish()              { setConfirmUnpublish(null);  setConfirming(false); setConfirmed(false) }
  function openApprove()                 { setConfirmApprove(true);    setConfirming(false); setConfirmed(false) }
  function closeApprove()                { setConfirmApprove(false);   setConfirming(false); setConfirmed(false) }
  function openReject()                  { setConfirmReject(true);     setConfirming(false); setConfirmed(false); setRejectReason('') }
  function closeReject()                 { setConfirmReject(false);    setConfirming(false); setConfirmed(false); setRejectReason('') }

  async function handleConfirm() {
    setConfirming(true)
    await new Promise(r => setTimeout(r, 800))
    setConfirmed(true)
    await new Promise(r => setTimeout(r, 900))
    setConfirmUnpublish(null); setConfirmApprove(false); setConfirmReject(false)
    setConfirming(false); setConfirmed(false)
  }

  const mfr        = manufacturerData[id]
  const allDevices = sampleDevices[id] ?? []
  const filtered   = allDevices.filter(d => d.status === deviceTab)
  const activeCount  = allDevices.filter(d => d.status === 'active').length
  const pendingCount = allDevices.filter(d => d.status === 'pending').length
  const draftCount   = allDevices.filter(d => d.status === 'draft').length

  if (!mfr) {
    return (
      <div className="m-content">
        <a href="/master/manufacturers" className="m-back">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15 18 9 12 15 6"/></svg>
          All Manufacturers
        </a>
        <p style={{ color: 'var(--muted)', fontFamily: 'var(--fb)', fontSize: 14, marginTop: 24 }}>Manufacturer not found.</p>
      </div>
    )
  }

  return (
    <div className="m-content">
      <a href="/master/manufacturers" className="m-back">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15 18 9 12 15 6"/></svg>
        All Manufacturers
      </a>

      {/* ── Profile header ── */}
      <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 16, padding: '28px 32px', marginBottom: 20, display: 'flex', alignItems: 'flex-start', gap: 22 }}>
        <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'var(--accent)', color: '#fff', display: 'grid', placeItems: 'center', fontSize: 22, fontWeight: 700, fontFamily: 'var(--ff)', flexShrink: 0, letterSpacing: '-.5px' }}>
          {mfr.initials}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 6 }}>
            <h2 style={{ margin: 0 }}>{mfr.name}</h2>
            <span className={`m-status ${mfr.status}`}>{mfr.status.charAt(0).toUpperCase() + mfr.status.slice(1)}</span>
          </div>
          <div style={{ fontFamily: 'var(--fb)', fontSize: 13.5, color: 'var(--muted)', marginBottom: 6 }}>
            Medical Device Manufacturer
          </div>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', fontFamily: 'var(--ff)', fontSize: 12.5, color: 'var(--muted2)' }}>
            <span>{mfr.country}</span>
            <span>·</span>
            <span>Joined {mfr.joined}</span>
            <span>·</span>
            <span>{mfr.devices > 0 ? mfr.devices.toLocaleString() : allDevices.length} devices</span>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
          {mfr.status === 'pending' && (
            <>
              <button className="btn btn-danger" onClick={openReject}>Reject</button>
              <button className="btn btn-s" onClick={openApprove}>Approve</button>
            </>
          )}
          {mfr.status === 'active' && (
            <button className="btn btn-danger">Suspend</button>
          )}
        </div>
      </div>

      {/* ── Info cards ── */}
      <div className="m-info-grid" style={{ marginBottom: 24 }}>
        <div className="m-info-card">
          <div className="k">Contact Name</div>
          <div className="v">{mfr.contactName}</div>
        </div>
        <div className="m-info-card">
          <div className="k">Contact Email</div>
          <div className="v"><a href={`mailto:${mfr.contact}`} style={{ color: 'var(--accent)', textDecoration: 'none' }}>{mfr.contact}</a></div>
        </div>
        <div className="m-info-card">
          <div className="k">Phone</div>
          <div className="v">{mfr.phone}</div>
        </div>
        <div className="m-info-card">
          <div className="k">Website</div>
          <div className="v"><a href={`https://${mfr.website}`} target="_blank" rel="noreferrer" style={{ color: 'var(--accent)', textDecoration: 'none' }}>{mfr.website}</a></div>
        </div>
        <div className="m-info-card">
          <div className="k">Registration Number</div>
          <div className="v" style={{ fontFamily: 'var(--ff)', fontSize: 13 }}>{mfr.regNumber}</div>
        </div>
        <div className="m-info-card">
          <div className="k">Country</div>
          <div className="v">{mfr.country}</div>
        </div>
        <div className="m-info-card" style={{ gridColumn: '1 / -1' }}>
          <div className="k">Registered Address</div>
          <div className="v">{mfr.address}</div>
        </div>
      </div>

      {/* ── Devices section ── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <h3 style={{ fontFamily: 'var(--ff)', fontSize: 15, fontWeight: 600, margin: 0 }}>Devices</h3>
        <a href="/master/devices/add" className="btn btn-s" style={{ fontSize: 12 }}>+ Add Device</a>
      </div>

      {allDevices.length === 0 ? (
        <div className="m-tbl-wrap" style={{ padding: '32px 20px', textAlign: 'center', color: 'var(--muted)', fontFamily: 'var(--fb)', fontSize: 14 }}>
          No devices uploaded yet.
        </div>
      ) : (
        <>
          <div className="m-tabs">
            <button className={`m-tab${deviceTab === 'active' ? ' active' : ''}`} onClick={() => setDeviceTab('active')}>
              Active
              <span style={{ marginLeft: 6, background: 'color-mix(in srgb,var(--ok) 20%,transparent)', color: 'var(--ok)', borderRadius: 10, padding: '1px 7px', fontSize: 11, fontWeight: 700 }}>
                {activeCount}
              </span>
            </button>
            <button className={`m-tab${deviceTab === 'pending' ? ' active' : ''}`} onClick={() => setDeviceTab('pending')}>
              Pending Review
              {pendingCount > 0 && (
                <span style={{ marginLeft: 6, background: 'color-mix(in srgb,#d97706 18%,transparent)', color: '#d97706', borderRadius: 10, padding: '1px 7px', fontSize: 11, fontWeight: 700 }}>
                  {pendingCount}
                </span>
              )}
            </button>
            <button className={`m-tab${deviceTab === 'draft' ? ' active' : ''}`} onClick={() => setDeviceTab('draft')}>
              Draft
              {draftCount > 0 && (
                <span style={{ marginLeft: 6, background: 'color-mix(in srgb,var(--text) 8%,transparent)', color: 'var(--muted)', borderRadius: 10, padding: '1px 7px', fontSize: 11, fontWeight: 700 }}>
                  {draftCount}
                </span>
              )}
            </button>
          </div>

          {filtered.length === 0 ? (
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
                  {filtered.map(d => (
                    <tr key={d.model}>
                      <td style={{ fontWeight: 500 }}>{d.model}</td>
                      <td>{d.category}</td>
                      <td><span style={{ color: mriColour(d.mri), fontFamily: 'var(--ff)', fontSize: 12.5, fontWeight: 600 }}>{d.mri}</span></td>
                      <td style={{ color: d.published === '—' ? 'var(--muted)' : 'var(--text)' }}>{d.published}</td>
                      <td style={{ display: 'flex', gap: 6 }}>
                        <button className="m-act">View</button>
                        {deviceTab === 'active'  && <button className="m-act danger" onClick={() => openUnpublish(d.model)}>Unpublish</button>}
                        {deviceTab === 'pending' && <button className="m-act approve">Approve</button>}
                        {deviceTab === 'draft'   && <button className="m-act">Publish</button>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {/* ── Unpublish modal ── */}
      {confirmUnpublish && (
        <div className="logout-back open" onClick={closeUnpublish}>
          <div className="logout-modal" onClick={e => e.stopPropagation()}>
            <div className="logout-body">
              <div style={{ width: 44, height: 44, borderRadius: '50%', background: 'color-mix(in srgb,var(--err) 12%,transparent)', display: 'grid', placeItems: 'center', margin: '0 auto 14px' }}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--err)" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
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

      {/* ── Approve modal ── */}
      {confirmApprove && (
        <div className="logout-back open" onClick={closeApprove}>
          <div className="logout-modal" onClick={e => e.stopPropagation()}>
            <div className="logout-body">
              <div style={{ width: 44, height: 44, borderRadius: '50%', background: 'color-mix(in srgb,var(--ok) 12%,transparent)', display: 'grid', placeItems: 'center', margin: '0 auto 14px' }}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--ok)" strokeWidth="2"><path d="M20 6L9 17l-5-5"/></svg>
              </div>
              <h3>Approve manufacturer?</h3>
              <p><strong>{mfr.name}</strong></p>
              <p>This will activate their account and allow them to upload devices to the catalogue.</p>
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

      {/* ── Reject modal ── */}
      {confirmReject && (
        <div className="logout-back open" onClick={closeReject}>
          <div className="logout-modal" onClick={e => e.stopPropagation()}>
            <div className="logout-body">
              <div style={{ width: 44, height: 44, borderRadius: '50%', background: 'color-mix(in srgb,var(--err) 12%,transparent)', display: 'grid', placeItems: 'center', margin: '0 auto 14px' }}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--err)" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </div>
              <h3>Reject manufacturer?</h3>
              <p style={{ marginBottom: 14 }}><strong>{mfr.name}</strong></p>
              <p style={{ marginBottom: 14, color: 'var(--muted)', fontSize: 13 }}>Provide a reason — this will be sent to the applicant.</p>
              <textarea
                className="input"
                style={{ resize: 'vertical', minHeight: 80 }}
                placeholder="e.g. Unable to verify regulatory certification…"
                value={rejectReason}
                onChange={e => setRejectReason(e.target.value)}
              />
            </div>
            <div className="logout-actions">
              <button className="btn" onClick={closeReject} disabled={confirming}>Cancel</button>
              <button className="btn btn-danger" onClick={handleConfirm} disabled={confirming || !rejectReason.trim()}>
                {confirmed ? 'Rejected' : confirming ? 'Rejecting…' : 'Reject'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
