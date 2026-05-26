'use client'

import { useState } from 'react'
import { CustomSelect } from '@/components/ui/CustomSelect'

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
    description:
      'The Acumed Total Hip System is a cementless hip replacement designed for patients with severe hip arthritis. Features a titanium alloy stem with hydroxyapatite coating for enhanced osseointegration.',
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
    description:
      'The Oxford Partial Knee is a minimally invasive unicompartmental knee replacement for patients with medial compartment osteoarthritis. Preserves the cruciate ligaments for more natural knee kinematics.',
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
    description:
      "The Micra AV is the world's smallest dual-sensor, physiologically responsive pacemaker. Delivered transcatheterly and implanted directly in the right ventricle, it provides AV-synchronous pacing without transvenous leads.",
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
    description:
      'The Tritanium PL Posterior Lumbar Cage is an interbody fusion device with a highly porous titanium structure designed to mimic cancellous bone. The open architecture promotes bone in-growth and vascularisation.',
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
    description:
      'The Nucleus Profile Plus cochlear implant features the Slim Modiolar electrode array for precise placement within the cochlea. The off-stylet design allows for a softer, more traumatic insertion technique.',
    teslaRating: 'Not MRI compatible',
    sarLimit: 'Not applicable',
    bodyRegion: 'Cochlea / Inner Ear',
    regNumber: 'TGA-AUST-COC-N7P',
    docName: 'Cochlear_Nucleus7_IFU.pdf',
  },
}

const categoryOptions = [
  'Hip Replacement',
  'Knee Replacement',
  'Shoulder Implant',
  'Spinal Implant',
  'Cardiac Pacemaker',
  'ICD / Defibrillator',
  'Cochlear Implant',
  'Spinal Cord Stimulator',
  'Deep Brain Stimulator',
  'Drug Delivery Pump',
  'Vascular Stent',
  'Dental Implant',
  'Intraocular Lens',
  'Other',
]

const regionOptions = [
  'Cardiac / Thoracic',
  'Orthopaedic — Lower Limb',
  'Orthopaedic — Upper Limb',
  'Spine / Neurovascular',
  'Cranial / Skull',
  'Head & Neck',
  'Abdominal',
  'Cochlea / Inner Ear',
  'Urological / Pelvic',
  'Multi-region',
]

export default function EditDeviceClient({ id }: { id: string }) {
  const device = deviceData[id]

  // All hooks unconditionally at top
  const [name,        setName]        = useState(device?.name ?? '')
  const [category,    setCategory]    = useState(device?.category ?? '')
  const [model,       setModel]       = useState(device?.model ?? '')
  const [bodyRegion,  setBodyRegion]  = useState(device?.bodyRegion ?? '')
  const [regNumber,   setRegNumber]   = useState(device?.regNumber ?? '')
  const [description, setDescription] = useState(device?.description ?? '')
  const [mriClass,    setMriClass]    = useState<'safe' | 'conditional' | 'unsafe' | ''>(
    device?.mriStatus ?? ''
  )
  const [teslaRating, setTeslaRating] = useState(device?.teslaRating ?? '')
  const [sarLimit,    setSarLimit]    = useState(device?.sarLimit ?? '')
  const [mriNotes,    setMriNotes]    = useState('')
  const [saving,      setSaving]      = useState(false)
  const [saved,       setSaved]       = useState(false)

  if (!device) {
    return (
      <div className="m-content">
        <a href="/master/devices" className="m-back">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="15 18 9 12 15 6" />
          </svg>
          Back to Devices
        </a>
        <div className="m-h">
          <div>
            <h2>Edit Device</h2>
            <div className="sub">ID: {id}</div>
          </div>
        </div>
        <p style={{ color: 'var(--muted)', fontFamily: 'var(--fb)', fontSize: 14 }}>
          Device not found.
        </p>
      </div>
    )
  }

  async function handleSave() {
    setSaving(true)
    await new Promise(r => setTimeout(r, 900))
    setSaving(false)
    setSaved(true)
    await new Promise(r => setTimeout(r, 1200))
    window.location.href = `/master/devices/${id}`
  }

  const canSave = name.trim() && category && mriClass

  return (
    <div className="m-content">
      <a href={`/master/devices/${id}`} className="m-back">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <polyline points="15 18 9 12 15 6" />
        </svg>
        Back to {device.name}
      </a>

      <div className="m-h">
        <div>
          <h2>Edit Device</h2>
          <div className="sub">{device.manufacturer} · {device.model}</div>
        </div>
      </div>

      {/* ── Section 1: Device Identity ── */}
      <div className="form-card">
        <div className="form-section-h">
          <div className="form-num">1</div>
          <h3>Device Identity</h3>
        </div>
        <p className="form-desc">Core identification fields for this device record.</p>

        <div className="form-grid">
          <div className="field field-full">
            <label>
              Device Name <span style={{ color: 'var(--err)', marginLeft: 3 }}>*</span>
            </label>
            <input
              className="input"
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="e.g. Acumed Total Hip System"
            />
          </div>

          <div className="field">
            <label>
              Category <span style={{ color: 'var(--err)', marginLeft: 3 }}>*</span>
            </label>
            <CustomSelect
              options={categoryOptions}
              value={category}
              onChange={setCategory}
              placeholder="Select category"
            />
          </div>

          <div className="field">
            <label>Model / Part Number</label>
            <input
              className="input"
              type="text"
              value={model}
              onChange={e => setModel(e.target.value)}
              placeholder="e.g. ACU-TH-7742"
            />
          </div>

          <div className="field">
            <label>Body Region</label>
            <CustomSelect
              options={regionOptions}
              value={bodyRegion}
              onChange={setBodyRegion}
              placeholder="Select region"
            />
          </div>

          <div className="field">
            <label>Regulatory Number</label>
            <input
              className="input"
              type="text"
              value={regNumber}
              onChange={e => setRegNumber(e.target.value)}
              placeholder="e.g. MHRA-CA-ACU-7742"
            />
          </div>
        </div>
      </div>

      {/* ── Section 2: Description ── */}
      <div className="form-card">
        <div className="form-section-h">
          <div className="form-num">2</div>
          <h3>Description</h3>
        </div>
        <p className="form-desc">Clinician-facing description shown on the device record and patient card.</p>

        <div className="field">
          <label>Device Description</label>
          <textarea
            className="input"
            rows={5}
            value={description}
            onChange={e => setDescription(e.target.value)}
            placeholder="Describe the device, its intended use, and key clinical features…"
            style={{ resize: 'vertical' }}
          />
        </div>
      </div>

      {/* ── Section 3: MRI Classification ── */}
      <div className="form-card">
        <div className="form-section-h">
          <div className="form-num">3</div>
          <h3>MRI Classification</h3>
        </div>
        <p className="form-desc">
          MRI safety classification per ASTM F2503. This determines scan restrictions shown to radiographers.
        </p>

        <label style={{ fontFamily: 'var(--ff)', fontSize: 13, fontWeight: 500, color: 'var(--muted)', display: 'block', marginBottom: 10 }}>
          MRI Status <span style={{ color: 'var(--err)', marginLeft: 3 }}>*</span>
        </label>
        <div className="mri-toggles">
          {(['safe', 'conditional', 'unsafe'] as const).map(cls => (
            <button
              key={cls}
              type="button"
              className={`mri-toggle${mriClass === cls ? ` sel-${cls}` : ''}`}
              onClick={() => setMriClass(cls)}
            >
              {cls === 'safe' && '✓ MR Safe'}
              {cls === 'conditional' && '⚠ MR Conditional'}
              {cls === 'unsafe' && '✕ MR Unsafe'}
            </button>
          ))}
        </div>

        {/* Conditional SAR fields */}
        {mriClass === 'conditional' && (
          <div className="form-grid" style={{ marginTop: 16 }}>
            <div className="field">
              <label>Tesla Rating</label>
              <input
                className="input"
                type="text"
                value={teslaRating}
                onChange={e => setTeslaRating(e.target.value)}
                placeholder="e.g. 1.5T, 3T"
              />
            </div>
            <div className="field">
              <label>SAR Limit</label>
              <input
                className="input"
                type="text"
                value={sarLimit}
                onChange={e => setSarLimit(e.target.value)}
                placeholder="e.g. 2 W/kg whole-body"
              />
            </div>
            <div className="field field-full">
              <label>Additional MRI Notes</label>
              <textarea
                className="input"
                rows={3}
                value={mriNotes}
                onChange={e => setMriNotes(e.target.value)}
                placeholder="Scan orientation restrictions, coil exclusions, post-implant wait times…"
                style={{ resize: 'vertical' }}
              />
            </div>
          </div>
        )}

        {mriClass === 'safe' && (
          <div
            style={{
              marginTop: 14,
              padding: '12px 16px',
              background: 'color-mix(in srgb,var(--ok) 8%,transparent)',
              border: '1px solid color-mix(in srgb,var(--ok) 22%,transparent)',
              borderRadius: 10,
              fontFamily: 'var(--fb)',
              fontSize: 13.5,
              color: 'var(--ok)',
            }}
          >
            MR Safe — no scan restrictions. All field strengths and orientations permitted.
          </div>
        )}

        {mriClass === 'unsafe' && (
          <div
            style={{
              marginTop: 14,
              padding: '12px 16px',
              background: 'color-mix(in srgb,var(--err) 8%,transparent)',
              border: '1px solid color-mix(in srgb,var(--err) 22%,transparent)',
              borderRadius: 10,
              fontFamily: 'var(--fb)',
              fontSize: 13.5,
              color: 'var(--err)',
            }}
          >
            MR Unsafe — this device is contraindicated for MRI. Patients will be flagged accordingly.
          </div>
        )}
      </div>

      {/* ── Footer ── */}
      <div className="form-footer">
        <a href={`/master/devices/${id}`} className="btn">
          Cancel
        </a>
        <button
          className="btn btn-s"
          onClick={handleSave}
          disabled={!canSave || saving}
        >
          {saved ? '✓ Saved' : saving ? 'Saving…' : 'Save Changes'}
        </button>
      </div>
    </div>
  )
}
