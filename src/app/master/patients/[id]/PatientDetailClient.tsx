'use client'
import { useState }    from 'react'
import { useQuery, useMutation } from 'convex/react'
import { useRouter }   from 'next/navigation'
import { api }         from '../../../../../convex/_generated/api'
import { Id }          from '../../../../../convex/_generated/dataModel'

const MRI_COLOUR: Record<string,string> = {
  safe: 'var(--ok)', conditional: '#b45309', unsafe: 'var(--err)', unknown: 'var(--muted)',
}
const MRI_LABEL: Record<string,string> = {
  safe: 'MR Safe', conditional: 'MR Conditional', unsafe: 'MR Unsafe', unknown: 'Unknown',
}

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
  // ── All hooks unconditionally at top ──────────────────────────────────────
  const [verifying,      setVerifying]      = useState(false)
  const [verified,       setVerified]       = useState(false)
  const [error,          setError]          = useState('')
  const [addDeviceOpen,  setAddDeviceOpen]  = useState(false)
  const [deviceSearch,   setDeviceSearch]   = useState('')
  const [addSerial,      setAddSerial]      = useState('')
  const [addDate,        setAddDate]        = useState('')
  const [addNotes,       setAddNotes]       = useState('')
  const [addingDevice,   setAddingDevice]   = useState(false)
  const [addDeviceError, setAddDeviceError] = useState('')

  const patient          = useQuery(api.patients.getPatientById, { patientId: id as Id<'patients'> })
  const allDevices       = useQuery(api.devices.listDevices)
  const verifyPatient    = useMutation(api.patients.verifyPatient)
  const linkDevice       = useMutation(api.patients.linkDeviceToPatient)
  const removeDevice     = useMutation(api.patients.removePatientDevice)
  const router           = useRouter()

  // Filter devices for search
  const filteredDevices  = allDevices?.filter(d =>
    !deviceSearch.trim() ||
    d.manufacturer.toLowerCase().includes(deviceSearch.toLowerCase()) ||
    d.model.toLowerCase().includes(deviceSearch.toLowerCase())
  ).slice(0, 12) ?? []

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
    if (!window.confirm(`Verify record for ${fullName}? This will mark them as verified and trigger an email notification.`)) return
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

      {/* Verified implants section */}
      <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 14, overflow: 'hidden', marginBottom: 20 }}>
        <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--border)', background: 'color-mix(in srgb,var(--text) 2%,transparent)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ fontFamily: 'var(--ff)', fontSize: 13, fontWeight: 600, letterSpacing: '.5px', textTransform: 'uppercase', color: 'var(--muted2)' }}>
            Verified implants
          </div>
          <button className="btn" style={{ fontSize: 12, padding: '5px 12px' }} onClick={() => { setAddDeviceOpen(true); setAddDeviceError(''); setDeviceSearch(''); setAddSerial(''); setAddDate(''); setAddNotes('') }}>
            + Add implant
          </button>
        </div>
        <div style={{ padding: 16 }}>
          {(!patient.devices || patient.devices.length === 0) ? (
            <p style={{ fontFamily: 'var(--ff)', fontSize: 13.5, color: 'var(--muted)', margin: 0 }}>
              No verified implants linked yet. Use "Add implant" to link a device from the catalogue.
            </p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {patient.devices.map((d: any) => d && (
                <div key={d._id} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '12px 16px', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 10 }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontFamily: 'var(--ff)', fontSize: 14, fontWeight: 600, color: 'var(--text)', marginBottom: 2 }}>
                      {d.manufacturer} {d.deviceName}
                    </div>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                      {d.mriStatus && (
                        <span style={{ fontFamily: 'var(--ff)', fontSize: 11.5, fontWeight: 600, padding: '2px 8px', borderRadius: 5, color: MRI_COLOUR[d.mriStatus] ?? 'var(--muted)', background: `color-mix(in srgb,${MRI_COLOUR[d.mriStatus] ?? 'transparent'} 10%,transparent)`, border: `1px solid color-mix(in srgb,${MRI_COLOUR[d.mriStatus] ?? 'transparent'} 25%,transparent)` }}>
                          {MRI_LABEL[d.mriStatus] ?? d.mriStatus}
                        </span>
                      )}
                      {d.deviceType && <span style={{ fontSize: 12, color: 'var(--muted)' }}>{d.deviceType}</span>}
                      {d.serialNumber && <span style={{ fontSize: 12, color: 'var(--muted)' }}>S/N: {d.serialNumber}</span>}
                    </div>
                  </div>
                  <button
                    className="btn btn-danger"
                    style={{ fontSize: 12, padding: '5px 12px', flexShrink: 0 }}
                    onClick={async () => {
                      if (!window.confirm('Remove this implant from the patient record?')) return
                      try { await removeDevice({ patientDeviceId: d._id as Id<'patientDevices'> }) }
                      catch (e) { alert((e as any)?.message ?? 'Failed to remove') }
                    }}
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
          )}
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

      {/* Add implant modal */}
      {addDeviceOpen && (
        <div className="logout-back open" onClick={() => setAddDeviceOpen(false)}>
          <div className="logout-modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 520, width: '95vw' }}>
            <div className="logout-body">
              <h3>Add verified implant</h3>
              <p style={{ color: 'var(--muted)', fontSize: 13.5, marginBottom: 16 }}>
                Search the device catalogue and link an implant to this patient's record.
              </p>
              <div className="field" style={{ marginBottom: 12 }}>
                <label>Search device catalogue</label>
                <input className="input" type="text" placeholder="e.g. Medtronic Azure" value={deviceSearch} onChange={e => setDeviceSearch(e.target.value)} autoFocus />
              </div>
              {filteredDevices.length > 0 && (
                <div style={{ border: '1px solid var(--border)', borderRadius: 10, marginBottom: 14, maxHeight: 200, overflowY: 'auto' }}>
                  {filteredDevices.map(d => (
                    <button key={d._id} type="button"
                      onClick={() => setDeviceSearch(`${d.manufacturer} ${d.model}`)}
                      style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', padding: '10px 14px', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left', borderBottom: '1px solid var(--border)' }}
                    >
                      <div>
                        <div style={{ fontFamily: 'var(--ff)', fontSize: 13, fontWeight: 500, color: 'var(--text)' }}>{d.manufacturer} {d.model}</div>
                        <div style={{ fontSize: 11.5, color: 'var(--muted)' }}>{d.deviceType}</div>
                      </div>
                      <span style={{ fontSize: 11.5, fontWeight: 600, color: MRI_COLOUR[d.mriStatus] ?? 'var(--muted)', flexShrink: 0, marginLeft: 10 }}>
                        {MRI_LABEL[d.mriStatus] ?? d.mriStatus}
                      </span>
                    </button>
                  ))}
                </div>
              )}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
                <div className="field">
                  <label>Serial number <span style={{ color: 'var(--muted)', fontWeight: 400 }}>(optional)</span></label>
                  <input className="input" type="text" placeholder="e.g. 12345678" value={addSerial} onChange={e => setAddSerial(e.target.value)} />
                </div>
                <div className="field">
                  <label>Implant date <span style={{ color: 'var(--muted)', fontWeight: 400 }}>(optional)</span></label>
                  <input className="input" type="date" value={addDate} onChange={e => setAddDate(e.target.value)} />
                </div>
              </div>
              <div className="field">
                <label>Clinical notes <span style={{ color: 'var(--muted)', fontWeight: 400 }}>(optional)</span></label>
                <textarea className="input" rows={2} placeholder="Any relevant notes…" value={addNotes} onChange={e => setAddNotes(e.target.value)} style={{ resize: 'vertical' }} />
              </div>
              {addDeviceError && <div style={{ color: 'var(--err)', fontSize: 13, marginTop: 8 }}>{addDeviceError}</div>}
            </div>
            <div className="logout-actions">
              <button className="btn" onClick={() => setAddDeviceOpen(false)} disabled={addingDevice}>Cancel</button>
              <button className="btn btn-s" disabled={addingDevice || !deviceSearch.trim()}
                onClick={async () => {
                  const match = allDevices?.find(d => `${d.manufacturer} ${d.model}` === deviceSearch.trim() || d.model.toLowerCase().includes(deviceSearch.toLowerCase()))
                  if (!match) { setAddDeviceError('Select a device from the list above'); return }
                  setAddingDevice(true); setAddDeviceError('')
                  try {
                    await linkDevice({ patientId: id as Id<'patients'>, deviceId: match._id, serialNumber: addSerial || undefined, implantDate: addDate || undefined, clinicNotes: addNotes || undefined })
                    setAddDeviceOpen(false)
                  } catch (e) { setAddDeviceError((e as any)?.message ?? 'Failed to add') }
                  finally { setAddingDevice(false) }
                }}
              >
                {addingDevice ? 'Adding…' : 'Add to record'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
