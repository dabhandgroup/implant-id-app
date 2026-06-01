'use client'
import { useState }    from 'react'
import { useQuery, useMutation } from 'convex/react'
import { useRouter }   from 'next/navigation'
import { api }         from '../../../../../convex/_generated/api'
import { Id }          from '../../../../../convex/_generated/dataModel'

interface Props { id: string }

function InfoCard({ label, value }: { label: string; value?: string | number | boolean | null }) {
  const display = value === undefined || value === null || value === ''
    ? <span style={{ color: 'var(--muted2)' }}>—</span>
    : String(value)
  return (
    <div style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 10, padding: '14px 18px' }}>
      <div style={{ fontFamily: 'var(--ff)', fontSize: 11, fontWeight: 600, letterSpacing: '1.2px', textTransform: 'uppercase', color: 'var(--muted2)', marginBottom: 6 }}>
        {label}
      </div>
      <div style={{ fontFamily: 'var(--fb)', fontSize: 14, color: 'var(--text)' }}>{display}</div>
    </div>
  )
}

export default function PatientDetailClient({ id }: Props) {
  const [verifying, setVerifying] = useState(false)
  const [verified,  setVerified]  = useState(false)
  const [error,     setError]     = useState('')

  const patient       = useQuery(api.patients.getPatientById, { patientId: id as Id<'patients'> })
  const verifyPatient = useMutation(api.patients.verifyPatient)
  const router        = useRouter()

  // Guards after all hooks
  if (patient === undefined) {
    return (
      <div className="m-content">
        <div style={{ padding: '48px 0', textAlign: 'center', color: 'var(--muted)', fontFamily: 'var(--ff)', fontSize: 14 }}>
          Loading…
        </div>
      </div>
    )
  }

  if (patient === null) {
    return (
      <div className="m-content">
        <a href="/master/patients" className="m-back" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: 'var(--muted)', fontFamily: 'var(--ff)', fontSize: 13.5, textDecoration: 'none', marginBottom: 24 }}>
          ← All patients
        </a>
        <div style={{ padding: '48px 0', textAlign: 'center', color: 'var(--muted)', fontFamily: 'var(--ff)', fontSize: 14 }}>
          Patient record not found.
        </div>
      </div>
    )
  }

  const isActive  = patient.verificationStatus === 'active' || verified
  const fullName  = `${patient.firstName} ${patient.lastName}`

  async function handleVerify() {
    if (!window.confirm(`Verify record for ${fullName}? This will mark them as active and trigger an email notification.`)) return
    setVerifying(true)
    setError('')
    try {
      await verifyPatient({ patientId: id as Id<'patients'> })
      setVerified(true)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Verification failed — try again.')
    } finally {
      setVerifying(false)
    }
  }

  return (
    <div className="m-content">
      {/* Back link */}
      <button
        className="m-back"
        onClick={() => router.push('/master/patients')}
        style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: 'var(--muted)', fontFamily: 'var(--ff)', fontSize: 13.5, background: 'transparent', border: 0, cursor: 'pointer', padding: 0, marginBottom: 24 }}
        aria-label="Back to all patients"
      >
        ← All patients
      </button>

      <div className="m-h">
        <div>
          <h2 style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            {fullName}
            {isActive && (
              <span style={{ background: 'color-mix(in srgb,var(--ok) 12%,transparent)', color: 'var(--ok)', fontSize: 12, fontWeight: 600, letterSpacing: '.5px', textTransform: 'uppercase', padding: '3px 9px', borderRadius: 4, fontFamily: 'var(--ff)' }}>
                ✓ Verified
              </span>
            )}
          </h2>
          <div className="sub" style={{ fontFamily: 'SF Mono,Monaco,monospace', letterSpacing: '.04em', color: 'var(--accent)' }}>
            {patient.implantIdCode}
          </div>
        </div>

        {!isActive && (
          <button
            className="btn btn-s"
            onClick={handleVerify}
            disabled={verifying}
            aria-label="Verify patient record"
          >
            {verifying ? 'Verifying…' : 'Verify record ✓'}
          </button>
        )}
      </div>

      {/* Success banner */}
      {verified && (
        <div style={{ background: 'color-mix(in srgb,var(--ok) 10%,transparent)', border: '1px solid color-mix(in srgb,var(--ok) 25%,transparent)', borderRadius: 10, padding: '12px 18px', marginBottom: 24, display: 'flex', alignItems: 'center', gap: 10 }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--ok)" strokeWidth="1.7"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
          <span style={{ fontFamily: 'var(--ff)', fontSize: 13.5, color: 'var(--ok)', fontWeight: 500 }}>
            Patient verified — email notification sent.
          </span>
        </div>
      )}

      {/* Error banner */}
      {error && (
        <div style={{ background: 'color-mix(in srgb,var(--err) 8%,transparent)', border: '1px solid color-mix(in srgb,var(--err) 20%,transparent)', borderRadius: 10, padding: '12px 18px', marginBottom: 24, fontFamily: 'var(--ff)', fontSize: 13.5, color: 'var(--err)' }}>
          {error}
        </div>
      )}

      {/* Info cards grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(220px,1fr))', gap: 12, marginBottom: 24 }}>
        <InfoCard label="Date of birth"         value={patient.dob} />
        <InfoCard label="Phone"                 value={patient.phone} />
        <InfoCard label="Country of birth"      value={patient.countryOfBirth} />
        <InfoCard label="Height"                value={patient.heightCm ? `${patient.heightCm} cm` : null} />
        <InfoCard label="Weight"                value={patient.weightKg ? `${patient.weightKg} kg` : null} />
        <InfoCard label="Contrast allergy"      value={patient.contrastAllergy ? 'Yes' : patient.contrastAllergy === false ? 'No' : null} />
        <InfoCard label="Allergy notes"         value={patient.contrastAllergyNote} />
      </div>

      {/* Self-reported device section */}
      <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 14, overflow: 'hidden', marginBottom: 20 }}>
        <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--border)', background: 'color-mix(in srgb,var(--text) 2%,transparent)' }}>
          <div style={{ fontFamily: 'var(--ff)', fontSize: 13, fontWeight: 600, letterSpacing: '.5px', textTransform: 'uppercase', color: 'var(--muted2)' }}>
            Self-reported implant
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(220px,1fr))', gap: 12, padding: 16 }}>
          <InfoCard label="Device"        value={patient.selfReportedDevice} />
          <InfoCard label="Manufacturer"  value={patient.selfReportedManufacturer} />
          <InfoCard label="Model number"  value={patient.selfReportedModelNumber} />
          <InfoCard label="Device type"   value={patient.selfReportedDeviceType} />
          <InfoCard label="Implant date"  value={patient.selfReportedImplantMonth && patient.selfReportedImplantYear ? `${patient.selfReportedImplantMonth}/${patient.selfReportedImplantYear}` : null} />
          <InfoCard label="Hospital"      value={patient.selfReportedHospital} />
          <InfoCard label="Surgeon"       value={patient.selfReportedSurgeon} />
        </div>
      </div>

      {/* Emergency contact section */}
      <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 14, overflow: 'hidden' }}>
        <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--border)', background: 'color-mix(in srgb,var(--text) 2%,transparent)' }}>
          <div style={{ fontFamily: 'var(--ff)', fontSize: 13, fontWeight: 600, letterSpacing: '.5px', textTransform: 'uppercase', color: 'var(--muted2)' }}>
            Emergency contact
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(220px,1fr))', gap: 12, padding: 16 }}>
          <InfoCard label="Name"         value={patient.emergencyContactName} />
          <InfoCard label="Phone"        value={patient.emergencyContactPhone} />
          <InfoCard label="Relationship" value={patient.emergencyContactRelation} />
        </div>
      </div>
    </div>
  )
}
