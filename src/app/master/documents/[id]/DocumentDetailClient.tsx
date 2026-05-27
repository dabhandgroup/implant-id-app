'use client'

import { useState } from 'react'

// ── Contract data — one per document ─────────────────────────────────────────

interface ContractData {
  id: string
  refNumber: string
  submittedDate: string
  fileName: string
  docType: string

  // Device fields
  deviceName: string
  manufacturer: string
  country: string
  regNumber: string
  category: string
  deviceType: string
  modelNumber: string
  bodyRegion: string
  gmdnCode: string
  description: string

  // MRI
  mriStatus: 'safe' | 'conditional' | 'unsafe'
  mriLabel: string
  teslaRatings: string
  sarWb: string
  sarHead: string
  scanDuration: string
  postImplantWait: string
  mriNotes: string

  // Regional approvals
  approvals: Array<{ region: string; flag: string; number: string; date: string }>

  // Certification
  submitterName: string
  submitterTitle: string
  submitterCompany: string
  signatureDate: string

  // External link
  externalLink: string
}

const contracts: Record<string, ContractData> = {
  '1': {
    id: '1',
    refNumber: 'IID-CONTRACT-MDT-MICRA-AV2-20260112',
    submittedDate: '12 January 2026',
    fileName: 'Medtronic_Micra_AV_MRI_Conditions.pdf',
    docType: 'MRI Conditions',
    deviceName: 'Medtronic Micra AV Pacemaker',
    manufacturer: 'Medtronic plc',
    country: 'Ireland',
    regNumber: 'CE-MDT-MICRA-AV2',
    category: 'Active Implant',
    deviceType: 'Cardiac Pacemaker',
    modelNumber: 'MDT-MICRA-AV2',
    bodyRegion: 'Cardiac / Thoracic',
    gmdnCode: '35391',
    description: "The Micra AV is the world's smallest dual-sensor, physiologically responsive pacemaker. Delivered transcatheterly and implanted directly in the right ventricle, it provides AV-synchronous pacing without transvenous leads. The device features proprietary algorithms that sense ventricular contraction and provide appropriately timed atrial pacing.",
    mriStatus: 'conditional',
    mriLabel: 'MR Conditional',
    teslaRatings: '1.5 T only',
    sarWb: '2.0 W/kg',
    sarHead: '3.2 W/kg',
    scanDuration: '30 minutes maximum per session',
    postImplantWait: '6 weeks post-implant before first MRI',
    mriNotes: 'Patient must be in supine position only. Gradient slew rate must not exceed 200 T/m/s. Do not use transmit/receive head coil. Circularly polarised (CP) RF transmit mode only. Device must be in magnet mode prior to scanning — contact Medtronic CareLink before scheduling.',
    approvals: [
      { region: 'European Union', flag: '🇪🇺', number: 'CE-MDT-MICRA-AV2', date: '8 Jan 2026' },
      { region: 'United Kingdom', flag: '🇬🇧', number: 'UKCA-MDT-MICRA-AV2', date: '10 Jan 2026' },
      { region: 'Australia / New Zealand', flag: '🇦🇺', number: 'TGA-AUST-MDT-MICRA', date: '5 Jan 2026' },
    ],
    submitterName: 'James Thornton',
    submitterTitle: 'Regulatory Affairs Manager',
    submitterCompany: 'Medtronic plc',
    signatureDate: '12 January 2026',
    externalLink: 'https://www.medtronic.com/en-us/healthcare-professionals/products/cardiac-rhythm/pacemakers/micra-av.html',
  },
  '2': {
    id: '2',
    refNumber: 'IID-CONTRACT-ZB-OXKNEE-20260116',
    submittedDate: '16 January 2026',
    fileName: 'ZimmerBiomet_Oxford_Knee_IFU.pdf',
    docType: 'Instructions for Use',
    deviceName: 'Zimmer Biomet Oxford Partial Knee',
    manufacturer: 'Zimmer Biomet',
    country: 'United States',
    regNumber: 'FDA-510K-ZB-OK-PMU3',
    category: 'Passive Implant',
    deviceType: 'Knee Replacement',
    modelNumber: 'ZB-OK-PMU3',
    bodyRegion: 'Orthopaedic — Lower Limb',
    gmdnCode: '47128',
    description: 'The Oxford Partial Knee is a minimally invasive unicompartmental knee replacement for patients with medial compartment osteoarthritis. Preserves the cruciate ligaments for more natural knee kinematics. Features a mobile-bearing design that reduces polyethylene wear and stress on the bone-cement interface.',
    mriStatus: 'safe',
    mriLabel: 'MR Safe',
    teslaRatings: 'No restrictions — all field strengths',
    sarWb: 'No restrictions',
    sarHead: 'No restrictions',
    scanDuration: 'No restrictions',
    postImplantWait: 'No waiting period required',
    mriNotes: 'Device is fully MR Safe. No special pre-scan preparation required. Patient may undergo MRI at any field strength, any orientation, without restrictions.',
    approvals: [
      { region: 'United States', flag: '🇺🇸', number: 'FDA-510K-ZB-OK-PMU3', date: '14 Jan 2026' },
      { region: 'European Union', flag: '🇪🇺', number: 'CE-ZB-OXFORD-KNEE-PMU3', date: '12 Jan 2026' },
      { region: 'United Kingdom', flag: '🇬🇧', number: 'UKCA-ZB-OXFORD-KNEE', date: '15 Jan 2026' },
      { region: 'Australia / New Zealand', flag: '🇦🇺', number: 'TGA-AUST-ZB-OXFORD-KNEE', date: '11 Jan 2026' },
    ],
    submitterName: 'Sarah Mitchell',
    submitterTitle: 'Vice President, Regulatory Affairs',
    submitterCompany: 'Zimmer Biomet Holdings, Inc.',
    signatureDate: '16 January 2026',
    externalLink: 'https://www.zimmerbiomet.com/en/products-and-solutions/specialties/knee/oxford-partial-knee.html',
  },
  '3': {
    id: '3',
    refNumber: 'IID-CONTRACT-STR-TRIT-PL-20260222',
    submittedDate: '22 February 2026',
    fileName: 'Stryker_Tritanium_PL_ProductLeaflet.pdf',
    docType: 'Product Leaflet',
    deviceName: 'Stryker Tritanium PL Posterior Lumbar Cage',
    manufacturer: 'Stryker Orthopaedics',
    country: 'United States',
    regNumber: 'FDA-510K-STR-TT-PL',
    category: 'Passive Implant',
    deviceType: 'Spinal Cage / Fusion',
    modelNumber: 'STR-TT-PL-S',
    bodyRegion: 'Spine / Neurovascular',
    gmdnCode: '57956',
    description: 'The Tritanium PL Posterior Lumbar Cage is an interbody fusion device with a highly porous titanium structure designed to mimic cancellous bone. The open architecture promotes bone in-growth and vascularisation. The cage is manufactured using selective laser sintering from commercially pure titanium.',
    mriStatus: 'safe',
    mriLabel: 'MR Safe',
    teslaRatings: 'No restrictions — all field strengths',
    sarWb: 'No restrictions',
    sarHead: 'No restrictions',
    scanDuration: 'No restrictions',
    postImplantWait: 'No waiting period required',
    mriNotes: 'Titanium alloy construction confers full MR Safe classification. No scan restrictions apply.',
    approvals: [
      { region: 'United States', flag: '🇺🇸', number: 'FDA-510K-STR-TT-PL', date: '20 Feb 2026' },
      { region: 'European Union', flag: '🇪🇺', number: 'CE-STR-TRIT-PL-2026', date: '18 Feb 2026' },
    ],
    submitterName: 'David Chen',
    submitterTitle: 'Director, Global Regulatory Strategy',
    submitterCompany: 'Stryker Corporation',
    signatureDate: '22 February 2026',
    externalLink: 'https://www.stryker.com/us/en/spine/products/tritanium-pl.html',
  },
  '4': {
    id: '4',
    refNumber: 'IID-CONTRACT-MDT-LINQ-20260112',
    submittedDate: '12 January 2026',
    fileName: 'Medtronic_RevealLINQ_IFU.pdf',
    docType: 'Instructions for Use',
    deviceName: 'Medtronic Reveal LINQ Insertable Cardiac Monitor',
    manufacturer: 'Medtronic plc',
    country: 'Ireland',
    regNumber: 'CE-MDT-LINQ-ICM-2026',
    category: 'Active Implant',
    deviceType: 'Cardiac Monitor',
    modelNumber: 'LNQ11',
    bodyRegion: 'Cardiac / Thoracic',
    gmdnCode: '63824',
    description: 'The Reveal LINQ is a miniaturised insertable cardiac monitor designed for long-term ambulatory ECG monitoring. It is approximately one-third the size of a AAA battery and is inserted subcutaneously. The device continuously records and wirelessly transmits cardiac data to the Medtronic CareLink network for remote monitoring.',
    mriStatus: 'conditional',
    mriLabel: 'MR Conditional',
    teslaRatings: '1.5 T only',
    sarWb: '2.0 W/kg',
    sarHead: '3.2 W/kg',
    scanDuration: '30 minutes maximum per session',
    postImplantWait: '6 weeks post-implant before first MRI',
    mriNotes: 'Programme device to MRI mode using Medtronic programmer prior to scanning. Confirm device is in MRI mode before entering scanner room. Follow Medtronic MRI technical guide LNQ11 Rev D.',
    approvals: [
      { region: 'European Union', flag: '🇪🇺', number: 'CE-MDT-LINQ-ICM-2026', date: '10 Jan 2026' },
      { region: 'United Kingdom', flag: '🇬🇧', number: 'UKCA-MDT-LINQ-ICM', date: '11 Jan 2026' },
    ],
    submitterName: 'James Thornton',
    submitterTitle: 'Regulatory Affairs Manager',
    submitterCompany: 'Medtronic plc',
    signatureDate: '12 January 2026',
    externalLink: 'https://www.medtronic.com/en-us/healthcare-professionals/products/cardiac-rhythm/cardiac-monitors/reveal-linq-icm.html',
  },
  '5': {
    id: '5',
    refNumber: 'IID-CONTRACT-ZB-PERSONA-20260118',
    submittedDate: '18 January 2026',
    fileName: 'Zimmer_PersonaKnee_MRI_Cert.pdf',
    docType: 'MRI Conditions',
    deviceName: 'Zimmer Biomet Persona Total Knee System',
    manufacturer: 'Zimmer Biomet',
    country: 'United States',
    regNumber: 'FDA-510K-ZB-PK-MRI',
    category: 'Passive Implant',
    deviceType: 'Knee Replacement',
    modelNumber: 'ZB-PK-CR-STD',
    bodyRegion: 'Orthopaedic — Lower Limb',
    gmdnCode: '47128',
    description: 'The Persona Total Knee System is a patient-specific total knee arthroplasty system featuring multiple implant options including cruciate retaining, posterior stabilised, and constrained condylar designs. Manufactured from cobalt-chromium-molybdenum alloy with ultra-high molecular weight polyethylene bearing.',
    mriStatus: 'safe',
    mriLabel: 'MR Safe',
    teslaRatings: 'No restrictions — all field strengths',
    sarWb: 'No restrictions',
    sarHead: 'No restrictions',
    scanDuration: 'No restrictions',
    postImplantWait: 'No waiting period required',
    mriNotes: 'CoCrMo alloy construction confers full MR Safe classification. No scan restrictions apply for any component of the Persona system.',
    approvals: [
      { region: 'United States', flag: '🇺🇸', number: 'FDA-510K-ZB-PK-MRI', date: '16 Jan 2026' },
      { region: 'European Union', flag: '🇪🇺', number: 'CE-ZB-PERSONA-KNEE', date: '14 Jan 2026' },
      { region: 'United Kingdom', flag: '🇬🇧', number: 'UKCA-ZB-PERSONA-KNEE', date: '17 Jan 2026' },
      { region: 'Australia / New Zealand', flag: '🇦🇺', number: 'TGA-AUST-ZB-PERSONA', date: '15 Jan 2026' },
    ],
    submitterName: 'Sarah Mitchell',
    submitterTitle: 'Vice President, Regulatory Affairs',
    submitterCompany: 'Zimmer Biomet Holdings, Inc.',
    signatureDate: '18 January 2026',
    externalLink: 'https://www.zimmerbiomet.com/en/products-and-solutions/specialties/knee/persona-knee-system.html',
  },
  '6': {
    id: '6',
    refNumber: 'IID-CONTRACT-STR-ACD2-20260222',
    submittedDate: '22 February 2026',
    fileName: 'Stryker_Accolade2_DeviceContract.pdf',
    docType: 'Device Contract',
    deviceName: 'Stryker Accolade II Hip Stem',
    manufacturer: 'Stryker Orthopaedics',
    country: 'United States',
    regNumber: 'FDA-510K-STR-ACD2',
    category: 'Passive Implant',
    deviceType: 'Hip Replacement',
    modelNumber: 'STR-ACD2-STD',
    bodyRegion: 'Orthopaedic — Lower Limb',
    gmdnCode: '47133',
    description: 'The Accolade II Hip Stem is a cementless, tapered-wedge femoral stem designed for primary total hip arthroplasty. Features a trapezoidal cross-section and SOMA technology for optimised stem geometry. Available in standard and lateralised offset configurations with a TriLock bone preservation head system.',
    mriStatus: 'safe',
    mriLabel: 'MR Safe',
    teslaRatings: 'No restrictions — all field strengths',
    sarWb: 'No restrictions',
    sarHead: 'No restrictions',
    scanDuration: 'No restrictions',
    postImplantWait: 'No waiting period required',
    mriNotes: 'Titanium alloy stem and cobalt-chromium head are fully MR Safe. No special pre-scan preparation required.',
    approvals: [
      { region: 'United States', flag: '🇺🇸', number: 'FDA-510K-STR-ACD2', date: '20 Feb 2026' },
      { region: 'European Union', flag: '🇪🇺', number: 'CE-STR-ACCOLADE2-2026', date: '18 Feb 2026' },
      { region: 'United Kingdom', flag: '🇬🇧', number: 'UKCA-STR-ACCOLADE2', date: '21 Feb 2026' },
    ],
    submitterName: 'David Chen',
    submitterTitle: 'Director, Global Regulatory Strategy',
    submitterCompany: 'Stryker Corporation',
    signatureDate: '22 February 2026',
    externalLink: 'https://www.stryker.com/us/en/joint-replacement/products/accolade-ii.html',
  },
}

// ── Colour helpers ────────────────────────────────────────────────────────────

function mriColour(s: 'safe' | 'conditional' | 'unsafe') {
  if (s === 'safe') return 'var(--ok)'
  if (s === 'conditional') return '#d97706'
  return 'var(--err)'
}

function typeColour(type: string) {
  if (type === 'MRI Conditions') return { bg: 'color-mix(in srgb,#3b82f6 10%,transparent)', border: 'color-mix(in srgb,#3b82f6 25%,transparent)', text: '#3b82f6' }
  if (type === 'Instructions for Use') return { bg: 'color-mix(in srgb,var(--ok) 10%,transparent)', border: 'color-mix(in srgb,var(--ok) 25%,transparent)', text: 'var(--ok)' }
  if (type === 'Device Contract') return { bg: 'color-mix(in srgb,var(--accent) 10%,transparent)', border: 'color-mix(in srgb,var(--accent) 25%,transparent)', text: 'var(--accent)' }
  return { bg: 'color-mix(in srgb,var(--muted) 10%,transparent)', border: 'color-mix(in srgb,var(--muted) 25%,transparent)', text: 'var(--muted)' }
}

// ── Component ─────────────────────────────────────────────────────────────────

interface Comment {
  id: number
  author: string
  initials: string
  role: string
  time: string
  text: string
}

const initialComments: Comment[] = [
  {
    id: 1,
    author: 'Eleanor Fawcett',
    initials: 'EF',
    role: 'Compliance Lead',
    time: '2 days ago',
    text: 'Device data cross-referenced against manufacturer\'s published labelling. All fields verified. MRI parameters confirmed within acceptable clinical range.',
  },
  {
    id: 2,
    author: 'Marcus Webb',
    initials: 'MW',
    role: 'Master Admin',
    time: '1 day ago',
    text: 'Contract PDF generated and archived. Regulatory numbers validated against TGA/CE/FDA databases. Approved for platform publication.',
  },
]

export default function DocumentDetailClient({ id }: { id: string }) {
  const [comments, setComments] = useState<Comment[]>(initialComments)
  const [newComment, setNewComment] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const contract = contracts[id]

  if (!contract) {
    return (
      <div className="m-content">
        <a href="/master/documents" className="m-back">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="15 18 9 12 15 6" />
          </svg>
          Back to Documents
        </a>
        <div className="m-h">
          <div>
            <h2>Document</h2>
            <div className="sub">ID: {id}</div>
          </div>
        </div>
        <p style={{ color: 'var(--muted)', fontFamily: 'var(--fb)', fontSize: 14 }}>
          Document not found.
        </p>
      </div>
    )
  }

  const tc = typeColour(contract.docType)

  async function handleAddComment() {
    if (!newComment.trim()) return
    setSubmitting(true)
    await new Promise(r => setTimeout(r, 600))
    const next: Comment = {
      id: Date.now(),
      author: 'Master Admin',
      initials: 'MA',
      role: 'Master Admin',
      time: 'Just now',
      text: newComment.trim(),
    }
    setComments(prev => [...prev, next])
    setNewComment('')
    setSubmitting(false)
  }

  return (
    <div className="m-content">
      <a href="/master/documents" className="m-back">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <polyline points="15 18 9 12 15 6" />
        </svg>
        Back to Documents
      </a>

      {/* ── Page header ── */}
      <div className="m-h" style={{ marginBottom: 20 }}>
        <div>
          <h2 style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            {contract.deviceName}
            <span style={{ fontFamily: 'var(--ff)', fontSize: 12, fontWeight: 600, background: tc.bg, border: `1px solid ${tc.border}`, color: tc.text, borderRadius: 7, padding: '3px 9px' }}>
              {contract.docType}
            </span>
          </h2>
          <div className="sub">{contract.refNumber}</div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {contract.externalLink && (
            <a
              href={contract.externalLink}
              target="_blank"
              rel="noopener noreferrer"
              className="btn"
              style={{ display: 'inline-flex', alignItems: 'center', gap: 6, textDecoration: 'none', fontSize: 13 }}
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>
                <polyline points="15 3 21 3 21 9"/>
                <line x1="10" y1="14" x2="21" y2="3"/>
              </svg>
              Manufacturer site
            </a>
          )}
        </div>
      </div>

      {/* ── Two-column layout ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: 16, alignItems: 'start' }}>

        {/* LEFT: the contract document */}
        <div>
          {/* ── Contract document ── */}
          <div
            style={{
              background: '#fff',
              border: '1px solid var(--border)',
              borderRadius: 14,
              overflow: 'hidden',
              marginBottom: 16,
              boxShadow: '0 2px 16px rgba(0,0,0,.06)',
            }}
          >
            {/* Contract toolbar */}
            <div style={{ padding: '10px 18px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'color-mix(in srgb,var(--text) 2%,transparent)' }}>
              <div style={{ fontFamily: 'var(--ff)', fontSize: 11.5, color: 'var(--muted)', display: 'flex', alignItems: 'center', gap: 8 }}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="var(--err)" strokeWidth="1.7">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                  <polyline points="14 2 14 8 20 8"/>
                </svg>
                {contract.fileName}
              </div>
              <span style={{ fontFamily: 'var(--ff)', fontSize: 11, color: 'var(--muted2)' }}>
                Signed · {contract.submittedDate}
              </span>
            </div>

            {/* Contract body */}
            <div style={{ padding: '40px 48px', color: '#111' }}>

              {/* ── Contract header ── */}
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 32, paddingBottom: 24, borderBottom: '2px solid #e5e7eb' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ width: 36, height: 36, borderRadius: 9, background: 'color-mix(in srgb,var(--accent) 15%,transparent)', display: 'grid', placeItems: 'center' }}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="1.7">
                      <path d="M22 12h-4l-3 9L9 3l-3 9H2"/>
                    </svg>
                  </div>
                  <div>
                    <div style={{ fontFamily: 'var(--ff)', fontSize: 15, fontWeight: 700, color: 'var(--accent)', letterSpacing: '-.01em' }}>ImplantID</div>
                    <div style={{ fontFamily: 'var(--ff)', fontSize: 10, color: '#6b7280', letterSpacing: '.04em', textTransform: 'uppercase' }}>Device Submission Contract</div>
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontFamily: 'monospace', fontSize: 10, color: '#6b7280', marginBottom: 2 }}>{contract.refNumber}</div>
                  <div style={{ fontFamily: 'var(--ff)', fontSize: 11, color: '#111', fontWeight: 600 }}>Submitted {contract.submittedDate}</div>
                </div>
              </div>

              {/* ── Section 1: Device Identification ── */}
              <ContractSection num={1} title="Device Identification">
                <TwoCol>
                  <Field label="Device Name" value={contract.deviceName} bold />
                  <Field label="Manufacturer" value={contract.manufacturer} />
                  <Field label="Device Category" value={contract.category} />
                  <Field label="Device Type" value={contract.deviceType} />
                  <Field label="Model / Part Number" value={contract.modelNumber} mono />
                  <Field label="GMDN Code" value={contract.gmdnCode} mono />
                  <Field label="Primary Implant Region" value={contract.bodyRegion} />
                  <Field label="Country of Registration" value={contract.country} />
                </TwoCol>
              </ContractSection>

              {/* ── Section 2: Clinical Description ── */}
              <ContractSection num={2} title="Clinical Description">
                <p style={{ fontFamily: 'Georgia, serif', fontSize: 13.5, lineHeight: 1.75, color: '#374151', margin: 0 }}>
                  {contract.description}
                </p>
              </ContractSection>

              {/* ── Section 3: MRI Safety Classification ── */}
              <ContractSection num={3} title="MRI Safety Classification">
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 18 }}>
                  <div
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 7,
                      padding: '6px 14px',
                      borderRadius: 8,
                      border: `1.5px solid color-mix(in srgb,${mriColour(contract.mriStatus)} 35%,transparent)`,
                      background: `color-mix(in srgb,${mriColour(contract.mriStatus)} 10%,transparent)`,
                      fontFamily: 'var(--ff)',
                      fontSize: 13,
                      fontWeight: 700,
                      color: mriColour(contract.mriStatus),
                    }}
                  >
                    {contract.mriStatus === 'safe' && '✓'}
                    {contract.mriStatus === 'conditional' && '⚠'}
                    {contract.mriStatus === 'unsafe' && '✕'}
                    {contract.mriLabel}
                  </div>
                  <span style={{ fontFamily: 'var(--ff)', fontSize: 11, color: '#9ca3af' }}>Per ASTM F2503</span>
                </div>
                <TwoCol>
                  <Field label="Approved Field Strengths" value={contract.teslaRatings} />
                  <Field label="Whole-body SAR Limit" value={contract.sarWb} />
                  <Field label="Head SAR Limit" value={contract.sarHead} />
                  <Field label="Maximum Scan Duration" value={contract.scanDuration} />
                  <Field label="Post-implant Wait Period" value={contract.postImplantWait} />
                </TwoCol>
                {contract.mriNotes && (
                  <div style={{ marginTop: 14, padding: '12px 16px', background: `color-mix(in srgb,${mriColour(contract.mriStatus)} 6%,transparent)`, borderLeft: `3px solid ${mriColour(contract.mriStatus)}`, borderRadius: '0 6px 6px 0' }}>
                    <div style={{ fontFamily: 'var(--ff)', fontSize: 10, fontWeight: 700, letterSpacing: '1px', textTransform: 'uppercase', color: mriColour(contract.mriStatus), marginBottom: 5 }}>
                      Scan Conditions &amp; Restrictions
                    </div>
                    <p style={{ fontFamily: 'Georgia, serif', fontSize: 12.5, lineHeight: 1.7, color: '#374151', margin: 0 }}>
                      {contract.mriNotes}
                    </p>
                  </div>
                )}
              </ContractSection>

              {/* ── Section 4: Regional Regulatory Approvals ── */}
              <ContractSection num={4} title="Regional Regulatory Approvals">
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr>
                      {['Region', 'Registration Number', 'Approval Date'].map(h => (
                        <th key={h} style={{ textAlign: 'left', fontFamily: 'var(--ff)', fontSize: 10, letterSpacing: '1px', textTransform: 'uppercase', color: '#9ca3af', fontWeight: 600, padding: '0 12px 8px 0', borderBottom: '1px solid #e5e7eb' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {contract.approvals.map(a => (
                      <tr key={a.region}>
                        <td style={{ padding: '10px 12px 10px 0', fontFamily: 'var(--fb)', fontSize: 13, color: '#111', borderBottom: '1px solid #f3f4f6' }}>
                          <span style={{ marginRight: 7 }}>{a.flag}</span>{a.region}
                        </td>
                        <td style={{ padding: '10px 12px 10px 0', fontFamily: 'monospace', fontSize: 12, color: '#374151', borderBottom: '1px solid #f3f4f6' }}>{a.number}</td>
                        <td style={{ padding: '10px 0', fontFamily: 'var(--fb)', fontSize: 13, color: '#374151', borderBottom: '1px solid #f3f4f6' }}>{a.date}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </ContractSection>

              {/* ── Section 5: Manufacturer Certification ── */}
              <ContractSection num={5} title="Manufacturer Certification">
                {[
                  'I confirm that all device information submitted is accurate, complete, and up to date to the best of my knowledge.',
                  'I confirm I have read and agree to the Implant ID submission guidelines and platform terms of use.',
                  'I confirm I have the authority and permission to submit this device on behalf of the manufacturer.',
                ].map((text, i) => (
                  <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'flex-start', marginBottom: 10 }}>
                    <div style={{ width: 18, height: 18, borderRadius: 4, background: 'color-mix(in srgb,var(--ok) 15%,transparent)', border: `1.5px solid color-mix(in srgb,var(--ok) 35%,transparent)`, display: 'grid', placeItems: 'center', flexShrink: 0, marginTop: 1 }}>
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="var(--ok)" strokeWidth="3">
                        <path d="M20 6L9 17l-5-5"/>
                      </svg>
                    </div>
                    <p style={{ fontFamily: 'Georgia, serif', fontSize: 12.5, lineHeight: 1.65, color: '#374151', margin: 0 }}>{text}</p>
                  </div>
                ))}
              </ContractSection>

              {/* ── Section 6: Electronic Signature ── */}
              <ContractSection num={6} title="Electronic Signature" last>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
                  <div>
                    <div style={{ fontFamily: 'var(--ff)', fontSize: 10, letterSpacing: '1px', textTransform: 'uppercase', color: '#9ca3af', marginBottom: 6 }}>Authorised Signatory</div>
                    <div style={{ fontFamily: 'Georgia, serif', fontSize: 32, color: '#111', fontStyle: 'italic', opacity: .85, marginBottom: 6, paddingBottom: 10, borderBottom: '1.5px solid #e5e7eb' }}>
                      {contract.submitterName}
                    </div>
                    <div style={{ fontFamily: 'var(--ff)', fontSize: 12.5, color: '#111', fontWeight: 600 }}>{contract.submitterName}</div>
                    <div style={{ fontFamily: 'var(--fb)', fontSize: 12, color: '#6b7280' }}>{contract.submitterTitle}</div>
                    <div style={{ fontFamily: 'var(--fb)', fontSize: 12, color: '#6b7280' }}>{contract.submitterCompany}</div>
                  </div>
                  <div>
                    <div style={{ fontFamily: 'var(--ff)', fontSize: 10, letterSpacing: '1px', textTransform: 'uppercase', color: '#9ca3af', marginBottom: 6 }}>Signature Date</div>
                    <div style={{ fontFamily: 'var(--ff)', fontSize: 14, fontWeight: 600, color: '#111', marginBottom: 14 }}>{contract.signatureDate}</div>
                    <div style={{ fontFamily: 'var(--ff)', fontSize: 10, letterSpacing: '1px', textTransform: 'uppercase', color: '#9ca3af', marginBottom: 6 }}>Document Reference</div>
                    <div style={{ fontFamily: 'monospace', fontSize: 11, color: '#374151' }}>{contract.refNumber}</div>
                  </div>
                </div>
              </ContractSection>

              {/* Contract footer */}
              <div style={{ marginTop: 32, paddingTop: 20, borderTop: '1px solid #e5e7eb', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 24 }}>
                <p style={{ fontFamily: 'Georgia, serif', fontSize: 10.5, lineHeight: 1.7, color: '#9ca3af', margin: 0, maxWidth: 520 }}>
                  This document is an automatically generated submission contract produced by the Implant ID platform. The device information contained herein was submitted by the manufacturer and has been archived for audit purposes. Implant ID does not independently verify the accuracy of manufacturer-submitted data. Clinicians should cross-reference against the manufacturer&apos;s current labelling before clinical use.
                </p>
                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  <div style={{ fontFamily: 'var(--ff)', fontSize: 11, fontWeight: 700, color: 'var(--accent)' }}>ImplantID</div>
                  <div style={{ fontFamily: 'var(--ff)', fontSize: 9, color: '#9ca3af' }}>portal.implantid.io</div>
                </div>
              </div>
            </div>
          </div>

          {/* ── Review comments ── */}
          <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 14, overflow: 'hidden' }}>
            <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ fontFamily: 'var(--ff)', fontSize: 14, fontWeight: 600, color: 'var(--text)' }}>Review Comments</div>
              <span style={{ fontFamily: 'var(--ff)', fontSize: 11, fontWeight: 600, background: 'color-mix(in srgb,var(--accent) 10%,transparent)', color: 'var(--accent)', borderRadius: 5, padding: '2px 8px' }}>
                {comments.length}
              </span>
            </div>

            {comments.map(c => (
              <div key={c.id} style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                <div style={{ width: 34, height: 34, borderRadius: '50%', background: 'linear-gradient(140deg,var(--accent),var(--accent2))', display: 'grid', placeItems: 'center', color: '#fff', fontFamily: 'var(--ff)', fontSize: 11, fontWeight: 700, flexShrink: 0 }}>
                  {c.initials}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                    <span style={{ fontFamily: 'var(--ff)', fontSize: 13.5, fontWeight: 600, color: 'var(--text)' }}>{c.author}</span>
                    <span style={{ fontFamily: 'var(--ff)', fontSize: 10.5, fontWeight: 600, background: 'color-mix(in srgb,var(--text) 5%,transparent)', color: 'var(--muted)', borderRadius: 4, padding: '1px 6px' }}>{c.role}</span>
                    <span style={{ fontFamily: 'var(--fb)', fontSize: 12, color: 'var(--muted2)', marginLeft: 'auto' }}>{c.time}</span>
                  </div>
                  <p style={{ fontFamily: 'var(--fb)', fontSize: 13.5, color: 'var(--text)', lineHeight: 1.6, margin: 0 }}>{c.text}</p>
                </div>
              </div>
            ))}

            <div style={{ padding: '16px 20px', display: 'flex', gap: 12, alignItems: 'flex-start' }}>
              <div style={{ width: 34, height: 34, borderRadius: '50%', background: 'linear-gradient(140deg,var(--accent),var(--accent2))', display: 'grid', placeItems: 'center', color: '#fff', fontFamily: 'var(--ff)', fontSize: 11, fontWeight: 700, flexShrink: 0 }}>
                MA
              </div>
              <div style={{ flex: 1 }}>
                <textarea className="input" placeholder="Add a review comment…" value={newComment} onChange={e => setNewComment(e.target.value)} rows={3} style={{ resize: 'vertical', marginBottom: 8 }} />
                <button className="btn btn-s" onClick={handleAddComment} disabled={!newComment.trim() || submitting}>
                  {submitting ? 'Adding…' : 'Add Comment'}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT: metadata sidebar */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 13, overflow: 'hidden' }}>
            <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)', fontFamily: 'var(--ff)', fontSize: 11, fontWeight: 700, letterSpacing: '1.1px', textTransform: 'uppercase', color: 'var(--muted2)' }}>
              Document Info
            </div>
            <div style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 12 }}>
              {[
                { k: 'Reference', v: contract.refNumber, mono: true },
                { k: 'Type', v: contract.docType },
                { k: 'Manufacturer', v: contract.manufacturer },
                { k: 'Device', v: contract.deviceName },
                { k: 'Submitted', v: contract.submittedDate },
                { k: 'Submitted By', v: contract.submitterName },
                { k: 'Role', v: contract.submitterTitle },
              ].map(row => (
                <div key={row.k}>
                  <div style={{ fontFamily: 'var(--ff)', fontSize: 10.5, color: 'var(--muted2)', marginBottom: 2 }}>{row.k}</div>
                  <div style={{ fontFamily: row.mono ? 'monospace' : 'var(--fb)', fontSize: row.mono ? 11 : 13.5, color: 'var(--text)', wordBreak: 'break-all' }}>{row.v}</div>
                </div>
              ))}
            </div>
          </div>

          {/* MRI badge */}
          <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 13, padding: '14px 16px' }}>
            <div style={{ fontFamily: 'var(--ff)', fontSize: 10, fontWeight: 700, letterSpacing: '1px', textTransform: 'uppercase', color: 'var(--muted2)', marginBottom: 10 }}>MRI Status</div>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 7, padding: '8px 14px', borderRadius: 9, border: `1.5px solid color-mix(in srgb,${mriColour(contract.mriStatus)} 30%,transparent)`, background: `color-mix(in srgb,${mriColour(contract.mriStatus)} 10%,transparent)`, fontFamily: 'var(--ff)', fontSize: 13, fontWeight: 700, color: mriColour(contract.mriStatus) }}>
              {contract.mriStatus === 'safe' && '✓'}
              {contract.mriStatus === 'conditional' && '⚠'}
              {contract.mriStatus === 'unsafe' && '✕'}
              {contract.mriLabel}
            </div>
          </div>

          {/* External link */}
          {contract.externalLink && (
            <a
              href={contract.externalLink}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                background: 'var(--bg2)',
                border: '1px solid var(--border)',
                borderRadius: 13,
                padding: '14px 16px',
                textDecoration: 'none',
                transition: 'border-color .15s',
              }}
              onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--accent)')}
              onMouseLeave={e => (e.currentTarget.style.borderColor = '')}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2" style={{ flexShrink: 0 }}>
                <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>
                <polyline points="15 3 21 3 21 9"/>
                <line x1="10" y1="14" x2="21" y2="3"/>
              </svg>
              <div>
                <div style={{ fontFamily: 'var(--ff)', fontSize: 12.5, fontWeight: 600, color: 'var(--accent)' }}>Manufacturer site</div>
                <div style={{ fontFamily: 'var(--fb)', fontSize: 11.5, color: 'var(--muted)', marginTop: 1, wordBreak: 'break-all' }}>
                  {contract.externalLink.replace('https://', '').split('/')[0]}
                </div>
              </div>
            </a>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Sub-components ────────────────────────────────────────────────────────────

function ContractSection({ num, title, children, last }: {
  num: number
  title: string
  children: React.ReactNode
  last?: boolean
}) {
  return (
    <div style={{ marginBottom: last ? 0 : 28 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
        <div style={{ width: 22, height: 22, borderRadius: '50%', background: 'var(--accent)', display: 'grid', placeItems: 'center', fontFamily: 'var(--ff)', fontSize: 10.5, fontWeight: 700, color: '#fff', flexShrink: 0 }}>
          {num}
        </div>
        <div style={{ fontFamily: 'var(--ff)', fontSize: 13, fontWeight: 700, color: '#111', letterSpacing: '-.01em' }}>{title}</div>
      </div>
      {children}
    </div>
  )
}

function TwoCol({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px 24px' }}>
      {children}
    </div>
  )
}

function Field({ label, value, bold, mono }: { label: string; value: string; bold?: boolean; mono?: boolean }) {
  return (
    <div>
      <div style={{ fontFamily: 'var(--ff)', fontSize: 9.5, letterSpacing: '1px', textTransform: 'uppercase', color: '#9ca3af', fontWeight: 600, marginBottom: 2 }}>{label}</div>
      <div style={{ fontFamily: mono ? 'monospace' : 'var(--fb)', fontSize: mono ? 12 : 13, color: '#111', fontWeight: bold ? 600 : 400 }}>{value}</div>
    </div>
  )
}
