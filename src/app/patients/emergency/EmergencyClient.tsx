'use client'

import { useQuery }  from 'convex/react'
import { useRouter } from 'next/navigation'
import { api }       from '../../../../convex/_generated/api'

const MRI_COLOUR: Record<string, string> = {
  safe:        '#166534',
  conditional: '#b45309',
  unsafe:      '#991b1b',
  unknown:     '#64748b',
}
const MRI_BG: Record<string, string> = {
  safe:        'linear-gradient(135deg,#14532d,#15803d)',
  conditional: 'linear-gradient(135deg,#78350f,#d97706)',
  unsafe:      'linear-gradient(135deg,#7f1d1d,#dc2626)',
  unknown:     'linear-gradient(135deg,#1e293b,#334155)',
}
const MRI_LABEL: Record<string, string> = {
  safe:        'MR Safe',
  conditional: 'MR Conditional',
  unsafe:      'MR Unsafe — Do Not Scan',
  unknown:     'MRI Status Unknown',
}
const MRI_NOTE: Record<string, string> = {
  safe:        'This patient may enter the MRI environment. Device is safe under all standard MRI conditions.',
  conditional: 'Specific conditions apply before scanning. Review device parameters with the radiographer before proceeding.',
  unsafe:      'Do NOT allow this patient into the MRI environment. Risk of serious injury or death.',
  unknown:     'MRI safety status has not been verified. Do not scan until confirmed.',
}

function InfoBlock({ label, value, highlight }: { label: string; value?: string | null; highlight?: boolean }) {
  if (!value) return null
  return (
    <div style={{
      background: highlight ? 'color-mix(in srgb,var(--err) 6%,transparent)' : 'var(--bg2)',
      border: `1px solid ${highlight ? 'color-mix(in srgb,var(--err) 20%,transparent)' : 'var(--border)'}`,
      borderRadius: 12, padding: '14px 18px',
    }}>
      <div style={{ fontFamily: 'var(--ff)', fontSize: 11, fontWeight: 700, letterSpacing: '1.1px', textTransform: 'uppercase', color: highlight ? 'var(--err)' : 'var(--muted2)', marginBottom: 5 }}>
        {label}
      </div>
      <div style={{ fontFamily: 'var(--fb)', fontSize: 15, color: highlight ? 'var(--err)' : 'var(--text)', fontWeight: highlight ? 600 : 400 }}>
        {value}
      </div>
    </div>
  )
}

export default function EmergencyClient() {
  const router        = useRouter()
  const patient       = useQuery(api.patients.getMyPatient)
  const implantSafety = useQuery(api.patients.getMyImplantSafety)

  if (patient === undefined) {
    return (
      <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', background: 'var(--bg)', fontFamily: 'var(--ff)', color: 'var(--muted)', fontSize: 14 }}>
        Loading…
      </div>
    )
  }

  if (patient === null) {
    router.replace('/patients/register')
    return null
  }

  const status      = implantSafety ?? 'unknown'
  const fullName    = `${patient.firstName} ${patient.lastName}`
  const hasAllergy  = !!patient.contrastAllergy

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', fontFamily: 'var(--ff)' }}>

      {/* ── Back + header ── */}
      <div style={{ padding: '16px 20px 0', maxWidth: 600, margin: '0 auto' }}>
        <button
          onClick={() => router.back()}
          style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)', fontSize: 13.5, fontFamily: 'var(--ff)', padding: 0, marginBottom: 16 }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15 18 9 12 15 6"/></svg>
          Back
        </button>
      </div>

      {/* ── MRI status hero — most important for first responders ── */}
      <div style={{ background: MRI_BG[status], padding: '28px 20px', marginBottom: 0 }}>
        <div style={{ maxWidth: 600, margin: '0 auto' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 14 }}>
            <img
              src={
                status === 'safe'        ? '/mr-safe.svg'
                : status === 'conditional' ? '/mr-conditional.svg'
                : status === 'unsafe'     ? '/mr-unsafe.svg'
                : '/mr-conditional.svg'
              }
              alt={MRI_LABEL[status]}
              style={{ width: 56, height: 56, flexShrink: 0 }}
            />
            <div>
              <div style={{ fontFamily: 'var(--ff)', fontSize: 11, fontWeight: 700, letterSpacing: '1.5px', textTransform: 'uppercase', color: 'rgba(255,255,255,0.7)', marginBottom: 4 }}>
                MRI Safety Status
              </div>
              <div style={{ fontFamily: 'var(--ff)', fontSize: 22, fontWeight: 700, color: '#fff' }}>
                {MRI_LABEL[status]}
              </div>
            </div>
          </div>
          <div style={{ background: 'rgba(0,0,0,0.25)', borderRadius: 10, padding: '11px 14px', fontFamily: 'var(--fb)', fontSize: 13.5, color: 'rgba(255,255,255,0.9)', lineHeight: 1.55 }}>
            {MRI_NOTE[status]}
          </div>
        </div>
      </div>

      {/* ── Patient info ── */}
      <div style={{ maxWidth: 600, margin: '0 auto', padding: '20px 20px 40px' }}>

        {/* Contrast allergy — most urgent after MRI status */}
        {hasAllergy && (
          <div style={{ background: 'color-mix(in srgb,var(--err) 8%,transparent)', border: '2px solid color-mix(in srgb,var(--err) 30%,transparent)', borderRadius: 14, padding: '16px 18px', marginBottom: 16 }}>
            <div style={{ fontFamily: 'var(--ff)', fontSize: 12, fontWeight: 700, letterSpacing: '1.2px', textTransform: 'uppercase', color: 'var(--err)', marginBottom: 6 }}>
              ⚠ Contrast Allergy
            </div>
            <div style={{ fontFamily: 'var(--fb)', fontSize: 15, color: 'var(--err)', fontWeight: 600 }}>
              {patient.contrastAllergyNote ?? 'Documented contrast allergy — do not administer contrast without specialist review.'}
            </div>
          </div>
        )}

        {/* Patient identity */}
        <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 14, padding: '18px 20px', marginBottom: 14 }}>
          <div style={{ fontFamily: 'var(--ff)', fontSize: 11, fontWeight: 700, letterSpacing: '1.1px', textTransform: 'uppercase', color: 'var(--muted2)', marginBottom: 10 }}>
            Patient
          </div>
          <div style={{ fontFamily: 'var(--ff)', fontSize: 22, fontWeight: 700, color: 'var(--text)', marginBottom: 4 }}>{fullName}</div>
          <div style={{ fontFamily: 'SF Mono,Monaco,monospace', fontSize: 14, color: 'var(--accent)', letterSpacing: '.04em', marginBottom: patient.dob ? 10 : 0 }}>{patient.implantIdCode}</div>
          {patient.dob && (
            <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap' }}>
              <span style={{ fontFamily: 'var(--fb)', fontSize: 13.5, color: 'var(--muted)' }}>DOB: <strong style={{ color: 'var(--text)' }}>{patient.dob}</strong></span>
              {patient.heightCm && <span style={{ fontFamily: 'var(--fb)', fontSize: 13.5, color: 'var(--muted)' }}>Height: <strong style={{ color: 'var(--text)' }}>{patient.heightCm} cm</strong></span>}
              {patient.weightKg && <span style={{ fontFamily: 'var(--fb)', fontSize: 13.5, color: 'var(--muted)' }}>Weight: <strong style={{ color: 'var(--text)' }}>{patient.weightKg} kg</strong></span>}
            </div>
          )}
        </div>

        {/* Implant */}
        {(patient.selfReportedDevice || patient.selfReportedDeviceType) && (
          <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 14, padding: '18px 20px', marginBottom: 14 }}>
            <div style={{ fontFamily: 'var(--ff)', fontSize: 11, fontWeight: 700, letterSpacing: '1.1px', textTransform: 'uppercase', color: 'var(--muted2)', marginBottom: 10 }}>
              Implanted Device
            </div>
            {patient.selfReportedDeviceType && (
              <div style={{ fontFamily: 'var(--ff)', fontSize: 12.5, color: 'var(--muted)', marginBottom: 4 }}>{patient.selfReportedDeviceType}</div>
            )}
            {patient.selfReportedDevice && (
              <div style={{ fontFamily: 'var(--ff)', fontSize: 18, fontWeight: 700, color: 'var(--text)', marginBottom: 4 }}>{patient.selfReportedDevice}</div>
            )}
            {patient.selfReportedManufacturer && (
              <div style={{ fontFamily: 'var(--fb)', fontSize: 13.5, color: 'var(--muted)' }}>{patient.selfReportedManufacturer}</div>
            )}
            {patient.selfReportedImplantYear && (
              <div style={{ fontFamily: 'var(--fb)', fontSize: 13, color: 'var(--muted)', marginTop: 4 }}>
                Implanted: {patient.selfReportedImplantMonth ? `${patient.selfReportedImplantMonth}/${patient.selfReportedImplantYear}` : patient.selfReportedImplantYear}
                {patient.selfReportedHospital && ` · ${patient.selfReportedHospital}`}
              </div>
            )}
          </div>
        )}

        {/* Clinical notes — allergies, additional */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 10, marginBottom: 14 }}>
          <InfoBlock
            label="Additional clinical notes"
            value={patient.additionalNotes}
          />
        </div>

        {/* Emergency contact */}
        {patient.emergencyContactName && (
          <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 14, padding: '18px 20px', marginBottom: 14 }}>
            <div style={{ fontFamily: 'var(--ff)', fontSize: 11, fontWeight: 700, letterSpacing: '1.1px', textTransform: 'uppercase', color: 'var(--muted2)', marginBottom: 10 }}>
              Emergency Contact
            </div>
            <div style={{ fontFamily: 'var(--ff)', fontSize: 16, fontWeight: 600, color: 'var(--text)', marginBottom: 4 }}>{patient.emergencyContactName}</div>
            {patient.emergencyContactRelation && (
              <div style={{ fontFamily: 'var(--fb)', fontSize: 13, color: 'var(--muted)', marginBottom: 6 }}>{patient.emergencyContactRelation}</div>
            )}
            {patient.emergencyContactPhone && (
              <a href={`tel:${patient.emergencyContactPhone}`} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontFamily: 'var(--ff)', fontSize: 16, fontWeight: 700, color: 'var(--accent)', textDecoration: 'none' }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                  <path d="M22 16.9A16 16 0 0 1 5.1 2 2 2 0 0 1 7.1 0h3a2 2 0 0 1 2 1.7c.1.9.3 1.8.6 2.7a2 2 0 0 1-.5 2L11 7.6a16 16 0 0 0 6 6l1.2-1.2a2 2 0 0 1 2-.5c.9.3 1.8.5 2.7.6A2 2 0 0 1 22 16.9z"/>
                </svg>
                {patient.emergencyContactPhone}
              </a>
            )}
          </div>
        )}

        {/* Verification disclaimer */}
        <div style={{ background: 'color-mix(in srgb,#f59e0b 6%,transparent)', border: '1px solid color-mix(in srgb,#f59e0b 20%,transparent)', borderRadius: 10, padding: '12px 16px' }}>
          <div style={{ fontFamily: 'var(--fb)', fontSize: 12.5, color: '#92400e', lineHeight: 1.6 }}>
            {patient.verificationStatus === 'active'
              ? '✓ This record has been verified by the patient\'s clinical team on Implant ID. For full technical MRI parameters, scan the QR code on the patient\'s card or contact the treating clinic.'
              : '⚠ This record has not yet been verified by a clinical team. Information is self-reported by the patient. Treat with caution and verify with the treating institution.'}
          </div>
        </div>

      </div>
    </div>
  )
}
