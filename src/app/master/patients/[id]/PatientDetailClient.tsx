'use client'
import { useState }    from 'react'
import { useQuery, useMutation } from 'convex/react'
import { useRouter }   from 'next/navigation'
import { api as apiBase } from '../../../../../convex/_generated/api'
import { Id }             from '../../../../../convex/_generated/dataModel'
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const api = apiBase as any

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
  const [verifying,       setVerifying]       = useState(false)
  const [verified,        setVerified]        = useState(false)
  const [error,           setError]           = useState('')
  const [verifyModalOpen, setVerifyModalOpen] = useState(false)
  const [removeConfirmId, setRemoveConfirmId] = useState<string | null>(null)
  const [addDeviceOpen,   setAddDeviceOpen]   = useState(false)
  const [deviceSearch,    setDeviceSearch]    = useState('')
  const [addSerial,       setAddSerial]       = useState('')
  const [addDate,         setAddDate]         = useState('')
  const [addNotes,        setAddNotes]        = useState('')
  const [addingDevice,    setAddingDevice]    = useState(false)
  const [addDeviceError,  setAddDeviceError]  = useState('')
  const [statusSaving,    setStatusSaving]    = useState(false)
  const [statusMsg,       setStatusMsg]       = useState('')
  const [editEmail,       setEditEmail]       = useState(false)
  const [emailDraft,      setEmailDraft]      = useState('')
  const [emailSaving,     setEmailSaving]     = useState(false)
  const [emailError,      setEmailError]      = useState('')

  const patient                 = useQuery(api.patients.getPatientById, { patientId: id as Id<'patients'> })
  const allDevices              = useQuery(api.devices.listDevices)
  const verifyPatient           = useMutation(api.patients.verifyPatient)
  const linkDevice              = useMutation(api.patients.linkDeviceToPatient)
  const removeDevice            = useMutation(api.patients.removePatientDevice)
  const adminSetStatus          = useMutation(api.patients.adminSetPatientStatus)
  const adminUpdatePatientEmail = useMutation(api.patients.adminUpdatePatientEmail)
  const router                  = useRouter()

  // Filter devices for search
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const filteredDevices  = (allDevices as any[])?.filter((d: any) =>
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
    setVerifyModalOpen(true)
  }

  async function confirmVerify() {
    setVerifying(true); setError('')
    setVerifyModalOpen(false)
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

      {/* ── Admin Status Override ── */}
      <div style={{ background: 'color-mix(in srgb,var(--accent) 4%,transparent)', border: '1px solid color-mix(in srgb,var(--accent) 20%,transparent)', borderRadius: 12, padding: '18px 20px', marginBottom: 24 }}>
        <div style={{ fontFamily: 'var(--ff)', fontSize: 12, fontWeight: 700, letterSpacing: '1px', textTransform: 'uppercase', color: 'var(--accent)', marginBottom: 14 }}>Admin: Status Override (for testing)</div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'flex-end' }}>
          <div>
            <div style={{ fontFamily: 'var(--ff)', fontSize: 12, color: 'var(--muted)', marginBottom: 4 }}>Verification</div>
            <div style={{ display: 'flex', gap: 6 }}>
              {(['pending', 'active'] as const).map(s => (
                <button key={s} className={`btn${patient.verificationStatus === s ? ' btn-s' : ''}`}
                  style={{ fontSize: 12, padding: '6px 14px' }}
                  onClick={async () => {
                    setStatusSaving(true); setStatusMsg('')
                    try { await adminSetStatus({ patientId: id as Id<'patients'>, verificationStatus: s }); setStatusMsg('Saved') }
                    catch { setStatusMsg('Error') } finally { setStatusSaving(false); setTimeout(() => setStatusMsg(''), 2000) }
                  }}
                  disabled={statusSaving}
                >
                  {s === 'pending' ? '⏳ Pending' : '✓ Verified'}
                </button>
              ))}
            </div>
          </div>
          <div>
            <div style={{ fontFamily: 'var(--ff)', fontSize: 12, color: 'var(--muted)', marginBottom: 4 }}>MRI Status Override</div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {([
                { val: 'none',        label: 'Auto (from devices)', color: 'var(--muted)' },
                { val: 'safe',        label: 'MR Safe',             color: 'var(--ok)' },
                { val: 'conditional', label: 'MR Conditional',      color: '#b45309' },
                { val: 'unsafe',      label: 'MR Unsafe',           color: 'var(--err)' },
                { val: 'unknown',     label: 'Unknown',             color: 'var(--muted)' },
              ] as const).map(opt => {
                const current = (patient as Record<string, unknown>).mriStatusOverride as string | null
                const isActive = opt.val === 'none' ? !current : current === opt.val
                return (
                  <button key={opt.val} className={`btn${isActive ? ' btn-s' : ''}`}
                    style={{ fontSize: 11, padding: '5px 10px', color: isActive ? undefined : opt.color, borderColor: isActive ? undefined : opt.color }}
                    onClick={async () => {
                      setStatusSaving(true); setStatusMsg('')
                      try {
                        await adminSetStatus({
                          patientId: id as Id<'patients'>,
                          verificationStatus: patient.verificationStatus ?? 'pending',
                          mriOverride: opt.val,
                        })
                        setStatusMsg('Saved')
                      } catch { setStatusMsg('Error') } finally { setStatusSaving(false); setTimeout(() => setStatusMsg(''), 2000) }
                    }}
                    disabled={statusSaving}
                  >
                    {opt.label}
                  </button>
                )
              })}
            </div>
          </div>
          {statusMsg && <span style={{ fontFamily: 'var(--ff)', fontSize: 12, color: statusMsg === 'Saved' ? 'var(--ok)' : 'var(--err)', fontWeight: 600 }}>{statusMsg}</span>}
        </div>
      </div>

      {/* Info cards grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(220px,1fr))', gap: 12, marginBottom: 24 }}>
        {/* Editable email card */}
        {editEmail ? (
          <div style={{ background: 'var(--bg)', border: '1px solid var(--accent)', borderRadius: 10, padding: '14px 18px' }}>
            <div style={{ fontFamily: 'var(--ff)', fontSize: 11, fontWeight: 600, letterSpacing: '1.2px', textTransform: 'uppercase', color: 'var(--muted2)', marginBottom: 8 }}>
              Email
            </div>
            <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
              <input
                type="email"
                className="input"
                value={emailDraft}
                onChange={e => { setEmailDraft(e.target.value); setEmailError('') }}
                style={{ flex: 1, padding: '7px 10px', fontSize: 13.5 }}
                autoFocus
              />
              <button
                className="btn btn-s"
                style={{ fontSize: 12, padding: '6px 12px', flexShrink: 0 }}
                disabled={emailSaving}
                onClick={async () => {
                  const trimmed = emailDraft.trim().toLowerCase()
                  if (!trimmed || !trimmed.includes('@')) { setEmailError('Enter a valid email'); return }
                  setEmailSaving(true); setEmailError('')
                  try {
                    await adminUpdatePatientEmail({ patientId: id as Id<'patients'>, email: trimmed })
                    setEditEmail(false)
                  } catch (e) {
                    setEmailError((e as any)?.message ?? 'Failed to save')
                  } finally {
                    setEmailSaving(false)
                  }
                }}
              >
                {emailSaving ? 'Saving…' : 'Save'}
              </button>
              <button
                className="btn"
                style={{ fontSize: 12, padding: '6px 12px', flexShrink: 0 }}
                onClick={() => { setEditEmail(false); setEmailError('') }}
              >
                Cancel
              </button>
            </div>
            {emailError && <div style={{ fontSize: 12, color: 'var(--err)', marginTop: 6 }}>{emailError}</div>}
          </div>
        ) : (
          <div style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 10, padding: '14px 18px' }}>
            <div style={{ fontFamily: 'var(--ff)', fontSize: 11, fontWeight: 600, letterSpacing: '1.2px', textTransform: 'uppercase', color: 'var(--muted2)', marginBottom: 6 }}>
              Email
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ fontFamily: 'var(--fb)', fontSize: 14, color: 'var(--text)', flex: 1, wordBreak: 'break-all' }}>
                {(patient as any).email
                  ? String((patient as any).email)
                  : <span style={{ color: 'var(--muted2)' }}>—</span>}
              </div>
              <button
                className="btn"
                style={{ fontSize: 11, padding: '4px 10px', flexShrink: 0 }}
                onClick={() => { setEmailDraft((patient as any).email ?? ''); setEditEmail(true); setEmailError('') }}
                aria-label="Edit email address"
              >
                Edit
              </button>
            </div>
          </div>
        )}
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
                    onClick={() => setRemoveConfirmId(d._id)}
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

      {/* Verify patient modal */}
      {verifyModalOpen && (
        <div className="logout-back open" onClick={() => setVerifyModalOpen(false)}>
          <div className="logout-modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 460 }}>
            <div className="logout-body">
              <div style={{ width: 48, height: 48, borderRadius: '50%', background: 'color-mix(in srgb,var(--ok) 12%,transparent)', display: 'grid', placeItems: 'center', margin: '0 auto 16px' }}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--ok)" strokeWidth="2">
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>
                </svg>
              </div>
              <h3>Verify patient record?</h3>
              <p style={{ marginBottom: 16 }}><strong>{fullName}</strong> — {patient.implantIdCode}</p>
              <div style={{ background: 'color-mix(in srgb,#f59e0b 8%,transparent)', border: '1px solid color-mix(in srgb,#f59e0b 20%,transparent)', borderRadius: 10, padding: '12px 16px', fontFamily: 'var(--ff)', fontSize: 13, color: '#92400e', lineHeight: 1.6, marginBottom: 8 }}>
                <strong>⚠ Clinical responsibility notice</strong><br/>
                Only verify this record if you are a qualified clinician or have been instructed to do so by the patient's clinical team. Verification confirms the implant details are correct and activates the patient's wallet pass. Incorrect verification could lead to patient harm.
              </div>
            </div>
            <div className="logout-actions">
              <button className="btn" onClick={() => setVerifyModalOpen(false)}>Cancel</button>
              <button className="btn btn-s" onClick={confirmVerify} disabled={verifying}>
                {verifying ? 'Verifying…' : 'Confirm verification'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Remove implant confirmation modal */}
      {removeConfirmId && (
        <div className="logout-back open" onClick={() => setRemoveConfirmId(null)}>
          <div className="logout-modal" onClick={e => e.stopPropagation()}>
            <div className="logout-body">
              <h3>Remove implant?</h3>
              <p>This will mark the device as explanted and remove it from the active record.</p>
            </div>
            <div className="logout-actions">
              <button className="btn" onClick={() => setRemoveConfirmId(null)}>Cancel</button>
              <button className="btn btn-danger" onClick={async () => {
                const id_to_remove = removeConfirmId
                setRemoveConfirmId(null)
                try { await removeDevice({ patientDeviceId: id_to_remove as any }) }
                catch (e) { alert((e as any)?.message ?? 'Failed to remove') }
              }}>Remove</button>
            </div>
          </div>
        </div>
      )}

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
                  {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                  {filteredDevices.map((d: any) => (
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
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  const match = (allDevices as any[])?.find((d: any) => `${d.manufacturer} ${d.model}` === deviceSearch.trim() || d.model.toLowerCase().includes(deviceSearch.toLowerCase()))
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
