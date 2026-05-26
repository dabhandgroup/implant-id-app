'use client'

import { useState } from 'react'

interface DeviceData {
  name: string
  manufacturer: string
  category: string
  model: string
  mri: string
  mriStatus: 'safe' | 'conditional' | 'unsafe'
  status: 'active' | 'draft'
  published: string
  description: string
  teslaRating: string
  sarLimit: string
  bodyRegion: string
  regNumber: string
  docName: string
}

const deviceData: Record<string, DeviceData> = {
  'acumed-total-hip': {
    name: 'Acumed Total Hip System',
    manufacturer: 'Acumed Ltd',
    category: 'Hip Replacement',
    model: 'ACU-TH-7742',
    mri: 'MR Conditional',
    mriStatus: 'conditional',
    status: 'active',
    published: '12 Feb 2026',
    description: 'The Acumed Total Hip System is a cementless hip replacement designed for patients with severe hip arthritis. Features a titanium alloy stem with hydroxyapatite coating for enhanced osseointegration.',
    teslaRating: '1.5T, 3T',
    sarLimit: '2 W/kg whole-body',
    bodyRegion: 'Hip / Pelvis',
    regNumber: 'MHRA-CA-ACU-7742',
    docName: 'Acumed_TotalHip_MRI_Conditions.pdf',
  },
  'zimmer-oxford-knee': {
    name: 'Zimmer Biomet Oxford Knee',
    manufacturer: 'Zimmer Biomet',
    category: 'Knee Replacement',
    model: 'ZB-OK-PMU3',
    mri: 'MR Safe',
    mriStatus: 'safe',
    status: 'active',
    published: '16 Jan 2026',
    description: 'The Oxford Partial Knee is a minimally invasive unicompartmental knee replacement for patients with medial compartment osteoarthritis. Preserves the cruciate ligaments for more natural knee kinematics.',
    teslaRating: 'No restrictions',
    sarLimit: 'No restrictions',
    bodyRegion: 'Knee',
    regNumber: 'FDA-510K-ZB-OK-PMU3',
    docName: 'Zimmer_OxfordKnee_IFU.pdf',
  },
  'medtronic-micra': {
    name: 'Medtronic Micra AV',
    manufacturer: 'Medtronic plc',
    category: 'Cardiac Pacemaker',
    model: 'MDT-MICRA-AV2',
    mri: 'MR Conditional',
    mriStatus: 'conditional',
    status: 'active',
    published: '12 Jan 2026',
    description: 'The Micra AV is the world\'s smallest dual-sensor, physiologically responsive pacemaker. Delivered transcatheterly and implanted directly in the right ventricle, it provides AV-synchronous pacing without transvenous leads.',
    teslaRating: '1.5T only',
    sarLimit: '2 W/kg whole-body, 3.2 W/kg head',
    bodyRegion: 'Cardiac',
    regNumber: 'CE-MDT-MICRA-AV2',
    docName: 'Medtronic_MicraAV_MRI_Conditions.pdf',
  },
  'stryker-tritanium': {
    name: 'Stryker Tritanium PL Cage',
    manufacturer: 'Stryker Orthopaedics',
    category: 'Spinal Implant',
    model: 'STR-TT-PL-S',
    mri: 'MR Safe',
    mriStatus: 'safe',
    status: 'draft',
    published: '—',
    description: 'The Tritanium PL Posterior Lumbar Cage is an interbody fusion device with a highly porous titanium structure designed to mimic cancellous bone. The open architecture promotes bone in-growth and vascularisation.',
    teslaRating: 'No restrictions',
    sarLimit: 'No restrictions',
    bodyRegion: 'Lumbar Spine',
    regNumber: 'FDA-510K-STR-TT-PL',
    docName: 'Stryker_Tritanium_ProductLeaflet.pdf',
  },
  'cochlear-nucleus': {
    name: 'Cochlear Nucleus Profile Plus',
    manufacturer: 'Cochlear Ltd',
    category: 'Cochlear Implant',
    model: 'COC-CI-N7-P',
    mri: 'MR Unsafe',
    mriStatus: 'unsafe',
    status: 'active',
    published: '5 Mar 2026',
    description: 'The Nucleus Profile Plus cochlear implant features the Slim Modiolar electrode array for precise placement within the cochlea. The off-stylet design allows for a softer, more traumatic insertion technique.',
    teslaRating: 'Not MRI compatible',
    sarLimit: 'Not applicable',
    bodyRegion: 'Cochlea / Inner Ear',
    regNumber: 'TGA-AUST-COC-N7P',
    docName: 'Cochlear_Nucleus7_IFU.pdf',
  },
}

function mriColour(s: DeviceData['mriStatus']) {
  if (s === 'safe') return 'var(--ok)'
  if (s === 'conditional') return '#d97706'
  return 'var(--err)'
}

function mriBg(s: DeviceData['mriStatus']) {
  if (s === 'safe') return 'color-mix(in srgb,var(--ok) 10%,transparent)'
  if (s === 'conditional') return 'color-mix(in srgb,#d97706 10%,transparent)'
  return 'color-mix(in srgb,var(--err) 10%,transparent)'
}

export default function DeviceDetailClient({ id }: { id: string }) {
  const [confirmUnpublish, setConfirmUnpublish] = useState(false)
  const [confirming, setConfirming] = useState(false)
  const [confirmed, setConfirmed] = useState(false)

  function openUnpublish() {
    setConfirmUnpublish(true)
    setConfirming(false)
    setConfirmed(false)
  }

  function closeUnpublish() {
    setConfirmUnpublish(false)
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

  const device = deviceData[id]

  if (!device) {
    return (
      <div className="m-content">
        <a href="/master/devices" className="m-back">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="15 18 9 12 15 6"/>
          </svg>
          Back to Devices
        </a>
        <div className="m-h">
          <div>
            <h2>Device Detail</h2>
            <div className="sub">ID: {id}</div>
          </div>
        </div>
        <p style={{ color: 'var(--muted)', fontFamily: 'var(--fb)', fontSize: 14 }}>
          Device not found.
        </p>
      </div>
    )
  }

  return (
    <div className="m-content">
      <a href="/master/devices" className="m-back">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <polyline points="15 18 9 12 15 6"/>
        </svg>
        Back to Devices
      </a>

      {/* ── Header ── */}
      <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 16, padding: '28px 32px', marginBottom: 20, display: 'flex', alignItems: 'flex-start', gap: 22 }}>
        <div style={{ width: 56, height: 56, borderRadius: 14, background: 'color-mix(in srgb,var(--accent) 12%,transparent)', border: '1.5px solid color-mix(in srgb,var(--accent) 25%,transparent)', display: 'grid', placeItems: 'center', flexShrink: 0 }}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="1.7">
            <path d="M22 12h-4l-3 9L9 3l-3 9H2"/>
          </svg>
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <h2 style={{ marginBottom: 6 }}>{device.name}</h2>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <span className={`m-status ${device.status}`}>{device.status.charAt(0).toUpperCase() + device.status.slice(1)}</span>
            <span style={{ fontFamily: 'var(--ff)', fontSize: 12, fontWeight: 600, background: mriBg(device.mriStatus), color: mriColour(device.mriStatus), border: `1px solid color-mix(in srgb,${mriColour(device.mriStatus)} 25%,transparent)`, borderRadius: 8, padding: '3px 10px' }}>
              {device.mri}
            </span>
            <span style={{ fontFamily: 'var(--fb)', fontSize: 13, color: 'var(--muted)' }}>{device.manufacturer}</span>
            <span style={{ fontFamily: 'var(--ff)', fontSize: 12, color: 'var(--muted2)' }}>{device.model}</span>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
          <a href={`/master/devices/${id}/edit`} className="btn">Edit</a>
          {device.status === 'active' ? (
            <button className="btn btn-danger" onClick={openUnpublish}>Unpublish</button>
          ) : (
            <button className="btn btn-s">Publish</button>
          )}
        </div>
      </div>

      {/* ── Description ── */}
      {device.description && (
        <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 14, padding: '20px 22px', marginBottom: 16 }}>
          <div style={{ fontFamily: 'var(--ff)', fontSize: 11, fontWeight: 700, letterSpacing: '1px', textTransform: 'uppercase', color: 'var(--muted2)', marginBottom: 10 }}>Description</div>
          <p style={{ fontFamily: 'var(--fb)', fontSize: 14, color: 'var(--text)', lineHeight: 1.65, margin: 0 }}>{device.description}</p>
        </div>
      )}

      {/* ── Two-column details ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>

        {/* Identity */}
        <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 14, padding: '20px 22px' }}>
          <div style={{ fontFamily: 'var(--ff)', fontSize: 11, fontWeight: 700, letterSpacing: '1px', textTransform: 'uppercase', color: 'var(--muted2)', marginBottom: 14 }}>Device Identity</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div>
              <div style={{ fontFamily: 'var(--ff)', fontSize: 11, color: 'var(--muted2)', marginBottom: 2 }}>Category</div>
              <div style={{ fontFamily: 'var(--fb)', fontSize: 14, color: 'var(--text)' }}>{device.category}</div>
            </div>
            <div>
              <div style={{ fontFamily: 'var(--ff)', fontSize: 11, color: 'var(--muted2)', marginBottom: 2 }}>Model Number</div>
              <div style={{ fontFamily: 'var(--ff)', fontSize: 13.5, color: 'var(--text)', fontWeight: 500 }}>{device.model}</div>
            </div>
            <div>
              <div style={{ fontFamily: 'var(--ff)', fontSize: 11, color: 'var(--muted2)', marginBottom: 2 }}>Body Region</div>
              <div style={{ fontFamily: 'var(--fb)', fontSize: 14, color: 'var(--text)' }}>{device.bodyRegion}</div>
            </div>
            <div>
              <div style={{ fontFamily: 'var(--ff)', fontSize: 11, color: 'var(--muted2)', marginBottom: 2 }}>Regulatory Number</div>
              <div style={{ fontFamily: 'var(--ff)', fontSize: 13, color: 'var(--text)' }}>{device.regNumber}</div>
            </div>
            <div>
              <div style={{ fontFamily: 'var(--ff)', fontSize: 11, color: 'var(--muted2)', marginBottom: 2 }}>Published</div>
              <div style={{ fontFamily: 'var(--fb)', fontSize: 14, color: device.published === '—' ? 'var(--muted)' : 'var(--text)' }}>{device.published}</div>
            </div>
          </div>
        </div>

        {/* MRI */}
        <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 14, padding: '20px 22px' }}>
          <div style={{ fontFamily: 'var(--ff)', fontSize: 11, fontWeight: 700, letterSpacing: '1px', textTransform: 'uppercase', color: 'var(--muted2)', marginBottom: 14 }}>MRI Compatibility</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div>
              <div style={{ fontFamily: 'var(--ff)', fontSize: 11, color: 'var(--muted2)', marginBottom: 2 }}>MRI Status</div>
              <div style={{ fontFamily: 'var(--ff)', fontSize: 14, fontWeight: 600, color: mriColour(device.mriStatus) }}>{device.mri}</div>
            </div>
            <div>
              <div style={{ fontFamily: 'var(--ff)', fontSize: 11, color: 'var(--muted2)', marginBottom: 2 }}>Tesla Rating</div>
              <div style={{ fontFamily: 'var(--fb)', fontSize: 14, color: 'var(--text)' }}>{device.teslaRating}</div>
            </div>
            <div>
              <div style={{ fontFamily: 'var(--ff)', fontSize: 11, color: 'var(--muted2)', marginBottom: 2 }}>SAR Limit</div>
              <div style={{ fontFamily: 'var(--fb)', fontSize: 14, color: 'var(--text)' }}>{device.sarLimit}</div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Supporting document ── */}
      <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 14, padding: '20px 22px', marginBottom: 24 }}>
        <div style={{ fontFamily: 'var(--ff)', fontSize: 11, fontWeight: 700, letterSpacing: '1px', textTransform: 'uppercase', color: 'var(--muted2)', marginBottom: 14 }}>Supporting Document</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 10, padding: '14px 16px' }}>
          <div style={{ width: 38, height: 38, borderRadius: 9, background: 'color-mix(in srgb,var(--err) 10%,transparent)', border: '1px solid color-mix(in srgb,var(--err) 22%,transparent)', display: 'grid', placeItems: 'center', flexShrink: 0 }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--err)" strokeWidth="1.7">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
              <polyline points="14 2 14 8 20 8"/>
            </svg>
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontFamily: 'var(--ff)', fontSize: 13.5, fontWeight: 600, color: 'var(--text)', marginBottom: 2 }}>{device.docName}</div>
            <div style={{ fontFamily: 'var(--fb)', fontSize: 12, color: 'var(--muted)' }}>PDF · Uploaded by {device.manufacturer}</div>
          </div>
          <button className="btn" style={{ flexShrink: 0, display: 'flex', alignItems: 'center', gap: 6, fontSize: 13 }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
              <polyline points="7 10 12 15 17 10"/>
              <line x1="12" y1="15" x2="12" y2="3"/>
            </svg>
            Download
          </button>
        </div>
      </div>

      {/* ── Unpublish modal ── */}
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
              <p><strong>{device.name}</strong></p>
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
