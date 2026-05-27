'use client'

interface PatientRecord {
  id: string
  patientId: string
  name: string
  dob: string
  gender: string
  registered: string
  verified: 'active' | 'pending'
  clinic: string
  clinicId: string
  email: string
  phone: string
  address: string
  devices: DeviceRecord[]
  notes: string
}

interface DeviceRecord {
  id: string
  name: string
  manufacturer: string
  implantDate: string
  bodyRegion: string
  mriStatus: 'safe' | 'conditional' | 'unsafe'
  model: string
}

const patientData: Record<string, PatientRecord> = {
  'john-smith': {
    id: 'john-smith',
    patientId: 'IID-SMIJO2311XK',
    name: 'John Smith',
    dob: '23 Nov 1972',
    gender: 'Male',
    registered: '12 Mar 2026',
    verified: 'active',
    clinic: 'Manchester Orthopaedic Centre',
    clinicId: 'manchester-orthopaedic',
    email: 'j.smith@email.com',
    phone: '+44 7700 900123',
    address: '14 Maple Street, Manchester, M1 2AB, United Kingdom',
    devices: [
      {
        id: 'acumed-total-hip',
        name: 'Acumed Total Hip System',
        manufacturer: 'Acumed Ltd',
        implantDate: '4 Nov 2024',
        bodyRegion: 'Hip / Pelvis',
        mriStatus: 'conditional',
        model: 'ACU-TH-7742',
      },
      {
        id: 'zimmer-oxford-knee',
        name: 'Zimmer Biomet Oxford Knee',
        manufacturer: 'Zimmer Biomet',
        implantDate: '18 Mar 2025',
        bodyRegion: 'Knee',
        mriStatus: 'safe',
        model: 'ZB-OK-PMU3',
      },
    ],
    notes: 'Patient has two implants. Hip replacement MRI conditional — 1.5T/3T limit. Knee replacement fully MR Safe.',
  },
  'emma-brown': {
    id: 'emma-brown',
    patientId: 'IID-BREMA1404RP',
    name: 'Emma Brown',
    dob: '14 Apr 1985',
    gender: 'Female',
    registered: '3 Apr 2026',
    verified: 'active',
    clinic: 'Boston Spine & Joint',
    clinicId: 'boston-spine',
    email: 'emma.brown@mail.com',
    phone: '+1 617 555 0198',
    address: '88 Beacon Hill Rd, Boston, MA 02108, United States',
    devices: [
      {
        id: 'medtronic-micra',
        name: 'Medtronic Micra AV',
        manufacturer: 'Medtronic plc',
        implantDate: '15 Feb 2026',
        bodyRegion: 'Cardiac',
        mriStatus: 'conditional',
        model: 'MDT-MICRA-AV2',
      },
    ],
    notes: 'Cardiac pacemaker — MR Conditional 1.5T only. SAR limit 2 W/kg WB / 3.2 W/kg head.',
  },
  'sarah-williams': {
    id: 'sarah-williams',
    patientId: 'IID-WILSA0805YT',
    name: 'Sarah Williams',
    dob: '8 May 1991',
    gender: 'Female',
    registered: '8 May 2026',
    verified: 'pending',
    clinic: 'Auckland Joint Replacement',
    clinicId: 'auckland-joint',
    email: 's.williams@kiwi.net',
    phone: '+64 21 555 0123',
    address: '3/22 Queen Street, Auckland 1010, New Zealand',
    devices: [
      {
        id: 'stryker-tritanium',
        name: 'Stryker Tritanium PL Cage',
        manufacturer: 'Stryker Orthopaedics',
        implantDate: '2 May 2026',
        bodyRegion: 'Lumbar Spine',
        mriStatus: 'safe',
        model: 'STR-TT-PL-S',
      },
    ],
    notes: 'Verification pending — awaiting clinic confirmation.',
  },
  'mark-jones': {
    id: 'mark-jones',
    patientId: 'IID-JONMA1509NQ',
    name: 'Mark Jones',
    dob: '15 Sep 1968',
    gender: 'Male',
    registered: '15 May 2026',
    verified: 'active',
    clinic: 'Dublin Spinal Institute',
    clinicId: 'dublin-spinal',
    email: 'mark.jones@example.ie',
    phone: '+353 87 555 0191',
    address: '7 Fitzwilliam Square, Dublin 2, Ireland',
    devices: [
      {
        id: 'cochlear-nucleus',
        name: 'Cochlear Nucleus Profile Plus',
        manufacturer: 'Cochlear Ltd',
        implantDate: '10 Jan 2025',
        bodyRegion: 'Cochlea / Inner Ear',
        mriStatus: 'unsafe',
        model: 'COC-CI-N7-P',
      },
      {
        id: 'zimmer-oxford-knee',
        name: 'Zimmer Biomet Oxford Knee',
        manufacturer: 'Zimmer Biomet',
        implantDate: '5 Jun 2024',
        bodyRegion: 'Knee',
        mriStatus: 'safe',
        model: 'ZB-OK-PMU3',
      },
      {
        id: 'stryker-tritanium',
        name: 'Stryker Tritanium PL Cage',
        manufacturer: 'Stryker Orthopaedics',
        implantDate: '22 Nov 2023',
        bodyRegion: 'Lumbar Spine',
        mriStatus: 'safe',
        model: 'STR-TT-PL-S',
      },
    ],
    notes: 'MRI CONTRAINDICATED — cochlear implant is MR Unsafe. Clinics must be informed before any scan.',
  },
  'eleanor-taylor': {
    id: 'eleanor-taylor',
    patientId: 'IID-TAYEL2202CX',
    name: 'Eleanor Taylor',
    dob: '22 Feb 1979',
    gender: 'Female',
    registered: '22 May 2026',
    verified: 'pending',
    clinic: 'Harley Street Implant Centre',
    clinicId: 'harley-street',
    email: 'eleanor.taylor@london.co.uk',
    phone: '+44 7911 555034',
    address: '22 Harley Street, London, W1G 9PT, United Kingdom',
    devices: [
      {
        id: 'medtronic-micra',
        name: 'Medtronic Micra AV',
        manufacturer: 'Medtronic plc',
        implantDate: '18 May 2026',
        bodyRegion: 'Cardiac',
        mriStatus: 'conditional',
        model: 'MDT-MICRA-AV2',
      },
    ],
    notes: 'Recently registered — pending verification by Harley Street Implant Centre.',
  },
}

function mriColour(s: 'safe' | 'conditional' | 'unsafe') {
  if (s === 'safe') return 'var(--ok)'
  if (s === 'conditional') return '#d97706'
  return 'var(--err)'
}

function mriLabel(s: 'safe' | 'conditional' | 'unsafe') {
  if (s === 'safe') return 'MR Safe'
  if (s === 'conditional') return 'MR Conditional'
  return 'MR Unsafe'
}

export default function PatientDetailClient({ id }: { id: string }) {
  const patient = patientData[id]

  if (!patient) {
    return (
      <div className="m-content">
        <a href="/master/patients" className="m-back">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="15 18 9 12 15 6" />
          </svg>
          Back to Patients
        </a>
        <div className="m-h">
          <div>
            <h2>Patient Record</h2>
            <div className="sub">ID: {id}</div>
          </div>
        </div>
        <p style={{ color: 'var(--muted)', fontFamily: 'var(--fb)', fontSize: 14 }}>
          Patient not found.
        </p>
      </div>
    )
  }

  // Highest-risk MRI status across all devices
  const hasMriUnsafe = patient.devices.some(d => d.mriStatus === 'unsafe')
  const hasMriConditional = patient.devices.some(d => d.mriStatus === 'conditional')
  const overallMri = hasMriUnsafe ? 'unsafe' : hasMriConditional ? 'conditional' : 'safe'

  return (
    <div className="m-content">
      <a href="/master/patients" className="m-back">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <polyline points="15 18 9 12 15 6" />
        </svg>
        Back to Patients
      </a>

      {/* ── Header card ── */}
      <div
        style={{
          background: 'var(--bg2)',
          border: '1px solid var(--border)',
          borderRadius: 16,
          padding: '24px 28px',
          marginBottom: 16,
          display: 'flex',
          alignItems: 'flex-start',
          gap: 18,
        }}
      >
        {/* Avatar */}
        <div
          style={{
            width: 56,
            height: 56,
            borderRadius: '50%',
            background: 'linear-gradient(140deg,var(--accent),var(--accent2))',
            display: 'grid',
            placeItems: 'center',
            color: '#fff',
            fontFamily: 'var(--ff)',
            fontSize: 18,
            fontWeight: 700,
            flexShrink: 0,
          }}
        >
          {patient.name.split(' ').map(n => n[0]).join('')}
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <h2 style={{ marginBottom: 6 }}>{patient.name}</h2>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <span
              style={{
                fontFamily: 'var(--ff)',
                fontSize: 12,
                fontWeight: 600,
                letterSpacing: '.06em',
                color: 'var(--accent)',
                background: 'color-mix(in srgb,var(--accent) 10%,transparent)',
                borderRadius: 6,
                padding: '3px 8px',
              }}
            >
              {patient.patientId}
            </span>
            <span className={`m-status ${patient.verified}`}>
              {patient.verified === 'active' ? 'Verified' : 'Pending'}
            </span>
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                fontFamily: 'var(--ff)',
                fontSize: 12,
                fontWeight: 600,
                color: mriColour(overallMri),
                background: `color-mix(in srgb,${mriColour(overallMri)} 10%,transparent)`,
                border: `1px solid color-mix(in srgb,${mriColour(overallMri)} 25%,transparent)`,
                borderRadius: 8,
                padding: '3px 10px',
              }}
            >
              <img src={`/mr-${overallMri}.svg`} width="16" height="16" alt="" style={{ flexShrink: 0 }} />
              {mriLabel(overallMri)}
            </span>
          </div>
        </div>
      </div>

      {/* ── Alert for MRI unsafe ── */}
      {overallMri === 'unsafe' && (
        <div
          style={{
            background: 'color-mix(in srgb,var(--err) 8%,transparent)',
            border: '1px solid color-mix(in srgb,var(--err) 25%,transparent)',
            borderRadius: 12,
            padding: '14px 18px',
            marginBottom: 16,
            display: 'flex',
            gap: 12,
            alignItems: 'flex-start',
          }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--err)" strokeWidth="1.7" style={{ flexShrink: 0, marginTop: 2 }}>
            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
            <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
          </svg>
          <div>
            <div style={{ fontFamily: 'var(--ff)', fontSize: 13.5, fontWeight: 600, color: 'var(--err)', marginBottom: 3 }}>
              MRI Contraindicated
            </div>
            <div style={{ fontFamily: 'var(--fb)', fontSize: 13, color: 'var(--text)' }}>
              This patient has an MR Unsafe device. Any clinical team requesting an MRI must be notified before scheduling.
            </div>
          </div>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: 16, alignItems: 'start' }}>
        {/* Left column */}
        <div>
          {/* Implanted devices */}
          <div
            style={{
              background: 'var(--bg2)',
              border: '1px solid var(--border)',
              borderRadius: 14,
              marginBottom: 16,
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                padding: '14px 20px',
                borderBottom: '1px solid var(--border)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <div style={{ fontFamily: 'var(--ff)', fontSize: 14, fontWeight: 600, color: 'var(--text)' }}>
                Implanted Devices
              </div>
              <span
                style={{
                  fontFamily: 'var(--ff)',
                  fontSize: 11,
                  fontWeight: 600,
                  background: 'color-mix(in srgb,var(--accent) 10%,transparent)',
                  color: 'var(--accent)',
                  borderRadius: 5,
                  padding: '2px 8px',
                }}
              >
                {patient.devices.length}
              </span>
            </div>
            <div>
              {patient.devices.map((d, i) => (
                <div
                  key={d.id}
                  style={{
                    padding: '16px 20px',
                    borderBottom: i < patient.devices.length - 1 ? '1px solid var(--border)' : 'none',
                    display: 'flex',
                    gap: 14,
                    alignItems: 'flex-start',
                  }}
                >
                  <div
                    style={{
                      width: 38,
                      height: 38,
                      borderRadius: 10,
                      background: `color-mix(in srgb,${mriColour(d.mriStatus)} 8%,transparent)`,
                      border: `1px solid color-mix(in srgb,${mriColour(d.mriStatus)} 18%,transparent)`,
                      display: 'grid',
                      placeItems: 'center',
                      flexShrink: 0,
                    }}
                  >
                    <img src={`/mr-${d.mriStatus}.svg`} width="26" height="26" alt={`MR ${d.mriStatus}`} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3, flexWrap: 'wrap' }}>
                      <span style={{ fontFamily: 'var(--ff)', fontSize: 14, fontWeight: 600, color: 'var(--text)' }}>
                        {d.name}
                      </span>
                      <span
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 5,
                          fontFamily: 'var(--ff)',
                          fontSize: 11,
                          fontWeight: 600,
                          color: mriColour(d.mriStatus),
                          background: `color-mix(in srgb,${mriColour(d.mriStatus)} 10%,transparent)`,
                          borderRadius: 6,
                          padding: '2px 7px',
                        }}
                      >
                        {mriLabel(d.mriStatus)}
                      </span>
                    </div>
                    <div style={{ fontFamily: 'var(--fb)', fontSize: 12.5, color: 'var(--muted)', display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                      <span>{d.manufacturer}</span>
                      <span>·</span>
                      <span>Model: {d.model}</span>
                      <span>·</span>
                      <span>{d.bodyRegion}</span>
                      <span>·</span>
                      <span>Implanted {d.implantDate}</span>
                    </div>
                  </div>
                  <a
                    href={`/master/devices/${d.id}`}
                    className="m-act"
                    style={{ textDecoration: 'none', flexShrink: 0 }}
                    onClick={e => e.stopPropagation()}
                  >
                    View →
                  </a>
                </div>
              ))}
            </div>
          </div>

          {/* Clinical notes */}
          {patient.notes && (
            <div
              style={{
                background: 'var(--bg2)',
                border: '1px solid var(--border)',
                borderRadius: 14,
                overflow: 'hidden',
              }}
            >
              <div
                style={{
                  padding: '14px 20px',
                  borderBottom: '1px solid var(--border)',
                  fontFamily: 'var(--ff)',
                  fontSize: 14,
                  fontWeight: 600,
                  color: 'var(--text)',
                }}
              >
                Clinical Notes
              </div>
              <p
                style={{
                  padding: '16px 20px',
                  fontFamily: 'var(--fb)',
                  fontSize: 13.5,
                  color: 'var(--text)',
                  lineHeight: 1.65,
                  margin: 0,
                }}
              >
                {patient.notes}
              </p>
            </div>
          )}
        </div>

        {/* Right column — patient info */}
        <div
          style={{
            background: 'var(--bg2)',
            border: '1px solid var(--border)',
            borderRadius: 13,
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              padding: '12px 16px',
              borderBottom: '1px solid var(--border)',
              fontFamily: 'var(--ff)',
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: '1.1px',
              textTransform: 'uppercase',
              color: 'var(--muted2)',
            }}
          >
            Patient Information
          </div>
          <div style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 12 }}>
            {[
              { k: 'Patient ID', v: patient.patientId, mono: true },
              { k: 'Date of Birth', v: patient.dob },
              { k: 'Gender', v: patient.gender },
              { k: 'Registered', v: patient.registered },
              { k: 'Clinic', v: patient.clinic },
              { k: 'Email', v: patient.email },
              { k: 'Phone', v: patient.phone },
              { k: 'Address', v: patient.address },
            ].map(row => (
              <div key={row.k}>
                <div
                  style={{ fontFamily: 'var(--ff)', fontSize: 10.5, color: 'var(--muted2)', marginBottom: 2 }}
                >
                  {row.k}
                </div>
                <div
                  style={{
                    fontFamily: row.mono ? 'var(--ff)' : 'var(--fb)',
                    fontSize: row.mono ? 12.5 : 13.5,
                    color: row.mono ? 'var(--accent)' : 'var(--text)',
                    letterSpacing: row.mono ? '.04em' : undefined,
                  }}
                >
                  {row.v}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
