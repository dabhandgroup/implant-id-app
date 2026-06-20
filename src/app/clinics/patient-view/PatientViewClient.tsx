'use client'
import { useState, useEffect, useRef } from 'react'
import { useQuery, useMutation } from 'convex/react'
import { useSearchParams }       from 'next/navigation'
import { api as apiBase }        from '../../../../convex/_generated/api'

const api = apiBase as any

type ViewRole = 'admin' | 'radiographer' | 'surgeon'

const MRI_META: Record<string, { label: string; color: string; bg: string }> = {
  safe:        { label: 'MR Safe',        color: 'var(--ok)',    bg: 'color-mix(in srgb,var(--ok) 10%,transparent)'    },
  conditional: { label: 'MR Conditional', color: '#b45309',      bg: 'color-mix(in srgb,#f59e0b 12%,transparent)'      },
  unsafe:      { label: 'MR Unsafe',      color: 'var(--err)',   bg: 'color-mix(in srgb,var(--err) 10%,transparent)'   },
  unknown:     { label: 'Unknown',         color: 'var(--muted)', bg: 'color-mix(in srgb,var(--muted) 10%,transparent)' },
}

function fmtDate(ts: number) {
  return new Date(ts).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

function timeAgo(ts: number) {
  const diff  = Date.now() - ts
  const mins  = Math.floor(diff / 60_000)
  const hours = Math.floor(diff / 3_600_000)
  const days  = Math.floor(diff / 86_400_000)
  if (mins  < 2)  return 'just now'
  if (mins  < 60) return `${mins}m ago`
  if (hours < 24) return `${hours}h ago`
  if (days  < 7)  return `${days}d ago`
  return fmtDate(ts)
}

export default function PatientViewClient() {
  const searchParams = useSearchParams()
  const code         = (searchParams?.get('code') ?? '').trim().toUpperCase()

  const [role,          setRole]          = useState<ViewRole>('admin')
  const auditFiredRef = useRef(false)
  const [verifyLoading, setVerifyLoading] = useState(false)
  const [verifyErr,     setVerifyErr]     = useState('')
  const [verifySaved,   setVerifySaved]   = useState(false)
  const [verifyNotes,   setVerifyNotes]   = useState('')
  // Save patient flow
  const [saveLoading,   setSaveLoading]   = useState(false)
  const [justSaved,     setJustSaved]     = useState(false)
  const [saveErr,       setSaveErr]       = useState('')
  const [unsaveOpen,    setUnsaveOpen]    = useState(false)
  const [unsaveLoading, setUnsaveLoading] = useState(false)
  // Add device flow
  const [addDevOpen,    setAddDevOpen]    = useState(false)
  const [devSearch,     setDevSearch]     = useState('')
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [selDevice,     setSelDevice]     = useState<any | null>(null)
  const [addSerial,     setAddSerial]     = useState('')
  const [addDate,       setAddDate]       = useState('')
  const [addNotes,      setAddNotes]      = useState('')
  const [addHospital,   setAddHospital]   = useState('')
  const [addSurgeonTxt, setAddSurgeonTxt] = useState('')
  const [surgSearch,    setSurgSearch]    = useState('')
  const [addLoading,    setAddLoading]    = useState(false)
  const [addErr,        setAddErr]        = useState('')
  const [addSaved,      setAddSaved]      = useState(false)

  const patient      = useQuery(api.patients.getFullPatientByCode, code ? { code } : 'skip')
  const auditEntries = useQuery(
    api.clinics.getPatientAuditEntries,
    patient?._id ? { patientId: patient._id } : 'skip',
  )
  const isSaved        = useQuery(api.clinics.isPatientSaved, patient?._id ? { patientId: patient._id } : 'skip')
  const allDevices     = useQuery(api.devices.listDevices, {})
  const clinicalNotes  = useQuery((api as any).clinicalNotes.getPatientClinicalNotes, patient?._id ? { patientId: patient._id } : 'skip')
  const myClinic       = useQuery(api.clinics.getMyClinicInfo)
  const surgeonResults = useQuery(
    api.clinics.searchPlatformSurgeons,
    addDevOpen && surgSearch.trim().length >= 2 ? { query: surgSearch } : 'skip',
  )
  const recordLookup   = useMutation(api.clinics.logClinicPatientScan)
  const verifyPatient  = useMutation(api.patients.verifyPatient)
  const linkDevice     = useMutation(api.patients.linkDeviceToPatient)
  const savePatient    = useMutation(api.clinics.savePatientToClinic)
  const unsavePatient  = useMutation(api.clinics.unsavePatientFromClinic)
  const addNote        = useMutation((api as any).clinicalNotes.addClinicalNote)
  const deleteNote     = useMutation((api as any).clinicalNotes.deleteClinicalNote)
  const toggleNoteVis  = useMutation((api as any).clinicalNotes.toggleNoteVisibility)

  useEffect(() => {
    if (patient?._id && !auditFiredRef.current) {
      auditFiredRef.current = true
      recordLookup({ patientId: patient._id }).catch(() => {})
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [patient?._id])

  // Clinical notes
  const [noteContent,   setNoteContent]   = useState('')
  const [noteVisible,   setNoteVisible]   = useState(false)
  const [noteLoading,   setNoteLoading]   = useState(false)
  const [noteErr,       setNoteErr]       = useState('')
  const [noteSent,      setNoteSent]      = useState(false)
  const [noteFilterTab, setNoteFilterTab] = useState<'all' | 'internal' | 'patient'>('all')

  // ── No-code state ──────────────────────────────────────────────────────────

  if (!code) {
    return (
      <div className="m-content">
        <div className="m-h" style={{ marginBottom: 24 }}>
          <h2>Patient view</h2>
          <a href="/clinics/scan-patient" className="btn" style={{ textDecoration: 'none' }}>← Scan patient</a>
        </div>
        <div style={{
          background: 'color-mix(in srgb,var(--err) 6%,transparent)',
          border: '1px solid color-mix(in srgb,var(--err) 18%,transparent)',
          borderRadius: 12, padding: '20px 24px', maxWidth: 520,
          fontFamily: 'var(--ff)', fontSize: 14, color: 'var(--err)',
        }}>
          No Implant ID code supplied. Use the scan page to look up a patient.
        </div>
      </div>
    )
  }

  if (patient === undefined) {
    return (
      <div className="m-content">
        <div className="m-h"><h2>Patient view</h2></div>
        <div style={{ color: 'var(--muted)', fontSize: 14, fontFamily: 'var(--ff)' }}>Loading record…</div>
      </div>
    )
  }

  if (patient === null) {
    return (
      <div className="m-content">
        <div className="m-h">
          <h2>Patient not found</h2>
          <a href="/clinics/scan-patient" className="btn" style={{ textDecoration: 'none' }}>← Scan patient</a>
        </div>
        <div style={{
          background: 'color-mix(in srgb,var(--err) 6%,transparent)',
          border: '1px solid color-mix(in srgb,var(--err) 18%,transparent)',
          borderRadius: 12, padding: '20px 24px', maxWidth: 520,
          fontFamily: 'var(--ff)', fontSize: 14, color: 'var(--err)',
        }}>
          No patient found with code <strong style={{ fontFamily: 'SF Mono,Monaco,monospace' }}>{code}</strong>.
        </div>
      </div>
    )
  }

  // ── Derived ────────────────────────────────────────────────────────────────

  const mriMeta   = MRI_META[patient.mriStatus ?? 'unknown'] ?? MRI_META.unknown
  const isPending = patient.verificationStatus !== 'active'
  const dob       = patient.dob
    ? new Date(patient.dob).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
    : undefined
  const initials  = `${patient.firstName?.[0] ?? ''}${patient.lastName?.[0] ?? ''}`.toUpperCase()

  const primaryDevice = (patient.devices as any[])?.[0]

  const timeline: { t: string; label: string; sub: string }[] = []
  if (auditEntries) {
    for (const e of auditEntries) {
      timeline.push({ t: timeAgo(e.createdAt), label: e.action, sub: 'Accessed by clinic' })
    }
  }
  if (primaryDevice?.implantDate) {
    timeline.push({ t: primaryDevice.implantDate, label: 'Implant fitted', sub: primaryDevice.hospital ?? primaryDevice.implantingSurgeon ?? '' })
  }
  if (patient.createdAt) {
    timeline.push({ t: fmtDate(patient.createdAt), label: 'Enrolled on Implant ID', sub: 'Wallet pass issued' })
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const devResults: any[] = devSearch.trim().length >= 2 && allDevices
    ? allDevices.filter((d: any) => {
        const q = devSearch.toLowerCase()
        return d.manufacturer?.toLowerCase().includes(q) ||
               d.model?.toLowerCase().includes(q) ||
               d.deviceType?.toLowerCase().includes(q)
      }).slice(0, 8)
    : []

  async function doAddNote() {
    if (!noteContent.trim()) return
    setNoteLoading(true)
    setNoteErr('')
    try {
      await addNote({ patientId: patient._id, content: noteContent, visibleToPatient: noteVisible })
      setNoteContent('')
      setNoteVisible(false)
      setNoteSent(true)
      setTimeout(() => setNoteSent(false), 3000)
    } catch (err: unknown) {
      setNoteErr(err instanceof Error ? err.message : 'Failed to add note')
    } finally {
      setNoteLoading(false)
    }
  }

  async function doAddDevice() {
    if (!selDevice) return
    setAddLoading(true)
    setAddErr('')
    try {
      await linkDevice({
        patientId:         patient._id,
        deviceId:          selDevice._id,
        serialNumber:      addSerial.trim() || undefined,
        implantDate:       addDate || undefined,
        clinicNotes:       addNotes.trim() || undefined,
        hospital:          addHospital.trim() || undefined,
        implantingSurgeon: addSurgeonTxt.trim() || undefined,
      })
      setAddSaved(true)
      setAddDevOpen(false)
      setSelDevice(null)
      setDevSearch('')
      setAddSerial('')
      setAddDate('')
      setAddNotes('')
      setAddHospital('')
      setAddSurgeonTxt('')
      setSurgSearch('')
    } catch (err: unknown) {
      setAddErr(err instanceof Error ? err.message : 'Failed to link device')
    } finally {
      setAddLoading(false)
    }
  }

  async function doSavePatient() {
    setSaveLoading(true)
    setSaveErr('')
    try {
      await savePatient({ patientId: patient._id })
      setJustSaved(true)
    } catch (err: unknown) {
      setSaveErr(err instanceof Error ? err.message : 'Could not save patient')
    } finally {
      setSaveLoading(false)
    }
  }

  async function doUnsavePatient() {
    setUnsaveLoading(true)
    try {
      await unsavePatient({ patientId: patient._id })
      setJustSaved(false)
      setUnsaveOpen(false)
    } finally {
      setUnsaveLoading(false)
    }
  }

  async function doVerify() {
    setVerifyLoading(true)
    setVerifyErr('')
    try {
      await verifyPatient({
        patientId:   patient._id,
        clinicNotes: verifyNotes.trim() || undefined,
      })
      setVerifySaved(true)
    } catch (err: unknown) {
      setVerifyErr(err instanceof Error ? err.message : 'Failed to verify record')
    } finally {
      setVerifyLoading(false)
    }
  }

  // ── Clinical notes (live Convex data) ────────────────────────────────────
  const allNotes: any[] = clinicalNotes ?? []
  const filteredNotes = noteFilterTab === 'all'      ? allNotes
    : noteFilterTab === 'internal' ? allNotes.filter((n: any) => !n.visibleToPatient)
    : allNotes.filter((n: any) => n.visibleToPatient)

  // ── Full-screen: Link device ─────────────────────────────────────────────────
  if (addDevOpen) {
    const surgResults: any[] = surgSearch.trim().length >= 2 && surgeonResults ? surgeonResults : []
    return (
      <div className="m-content">
        <button
          type="button"
          onClick={() => { setAddDevOpen(false); setSelDevice(null); setDevSearch(''); setAddErr('') }}
          style={{ display: 'inline-flex', alignItems: 'center', gap: 7, marginBottom: 22, background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'var(--ff)', fontSize: 13.5, color: 'var(--muted)', padding: 0 }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden="true"><path d="M19 12H5M12 5l-7 7 7 7"/></svg>
          Back to patient
        </button>

        <div style={{ marginBottom: 28 }}>
          <div className="ey">Link device from catalogue</div>
          <h2 style={{ fontSize: 'clamp(18px,2vw,22px)', fontWeight: 600, letterSpacing: '-.02em', marginTop: 6 }}>
            {patient.firstName} {patient.lastName}
            <span style={{ fontFamily: 'SF Mono,Monaco,monospace', fontSize: 14, fontWeight: 400, color: 'var(--muted)', marginLeft: 10, letterSpacing: '.04em' }}>{patient.implantIdCode}</span>
          </h2>
        </div>

        <div style={{ maxWidth: 680 }}>
          {/* Device search */}
          <div className="card" style={{ marginBottom: 16 }}>
            <div className="ey" style={{ marginBottom: 12 }}>Select device</div>
            <div style={{ position: 'relative' }}>
              <input
                className="input"
                type="text"
                placeholder="Search by manufacturer, model, or type…"
                value={devSearch}
                onChange={e => { setDevSearch(e.target.value); setSelDevice(null) }}
                autoFocus
              />
              {devResults.length > 0 && !selDevice && (
                <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 50, background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 10, boxShadow: '0 8px 24px rgba(0,0,0,.18)', marginTop: 4, maxHeight: 260, overflowY: 'auto' }}>
                  {devResults.map((d: any) => (
                    <button
                      key={d._id}
                      type="button"
                      onClick={() => { setSelDevice(d); setDevSearch(`${d.manufacturer} ${d.model}`) }}
                      style={{ width: '100%', textAlign: 'left', background: 'none', border: 'none', padding: '12px 16px', cursor: 'pointer', borderBottom: '1px solid var(--border)', fontFamily: 'var(--ff)' }}
                      onMouseEnter={e => (e.currentTarget.style.background = 'color-mix(in srgb,var(--accent) 6%,transparent)')}
                      onMouseLeave={e => (e.currentTarget.style.background = 'none')}
                    >
                      <div style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--text)' }}>{d.manufacturer} {d.model}</div>
                      <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>{d.deviceType} · {d.mriStatus === 'safe' ? 'MR Safe' : d.mriStatus === 'conditional' ? 'MR Conditional' : d.mriStatus === 'unsafe' ? 'MR Unsafe' : 'MRI unknown'}</div>
                    </button>
                  ))}
                </div>
              )}
            </div>
            {selDevice && (
              <div style={{ marginTop: 12, background: 'color-mix(in srgb,var(--accent) 6%,transparent)', border: '1px solid color-mix(in srgb,var(--accent) 20%,transparent)', borderRadius: 10, padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                <div>
                  <div style={{ fontFamily: 'var(--ff)', fontSize: 14, fontWeight: 600, color: 'var(--text)' }}>{selDevice.manufacturer} {selDevice.model}</div>
                  <div style={{ fontSize: 12.5, color: 'var(--muted)', marginTop: 2 }}>{selDevice.deviceType}</div>
                </div>
                <button type="button" style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)', padding: 4 }} onClick={() => { setSelDevice(null); setDevSearch('') }} aria-label="Clear selected device">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                </button>
              </div>
            )}
          </div>

          {/* Implant details */}
          <div className="card" style={{ marginBottom: 16 }}>
            <div className="ey" style={{ marginBottom: 16 }}>Implant details</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
              <div className="field">
                <label style={{ fontFamily: 'var(--ff)', fontSize: 12, fontWeight: 500, color: 'var(--muted)', display: 'block', marginBottom: 6 }}>Serial number</label>
                <input className="input" type="text" placeholder="Optional" value={addSerial} onChange={e => setAddSerial(e.target.value)} />
              </div>
              <div className="field">
                <label style={{ fontFamily: 'var(--ff)', fontSize: 12, fontWeight: 500, color: 'var(--muted)', display: 'block', marginBottom: 6 }}>Implant date</label>
                <input className="input" type="date" value={addDate} onChange={e => setAddDate(e.target.value)} />
              </div>
            </div>

            {/* Clinic / Hospital */}
            <div className="field" style={{ marginBottom: 14 }}>
              <label style={{ fontFamily: 'var(--ff)', fontSize: 12, fontWeight: 500, color: 'var(--muted)', display: 'block', marginBottom: 6 }}>Implanting clinic / hospital</label>
              <input
                className="input"
                type="text"
                placeholder="e.g. Royal Victoria Hospital"
                value={addHospital}
                onChange={e => setAddHospital(e.target.value)}
              />
            </div>

            {/* Surgeon search */}
            <div className="field" style={{ marginBottom: 14 }}>
              <label style={{ fontFamily: 'var(--ff)', fontSize: 12, fontWeight: 500, color: 'var(--muted)', display: 'block', marginBottom: 6 }}>Implanting surgeon</label>
              <div style={{ position: 'relative' }}>
                <input
                  className="input"
                  type="text"
                  placeholder="Search by name or email, or type manually…"
                  value={addSurgeonTxt}
                  onChange={e => { setAddSurgeonTxt(e.target.value); setSurgSearch(e.target.value) }}
                />
                {surgResults.length > 0 && (
                  <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 50, background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 10, boxShadow: '0 8px 24px rgba(0,0,0,.18)', marginTop: 4, maxHeight: 200, overflowY: 'auto' }}>
                    {surgResults.map((r: any) => (
                      <button
                        key={r.userId}
                        type="button"
                        onClick={() => { setAddSurgeonTxt(r.name); setSurgSearch('') }}
                        style={{ width: '100%', textAlign: 'left', background: 'none', border: 'none', padding: '11px 16px', cursor: 'pointer', borderBottom: '1px solid var(--border)', fontFamily: 'var(--ff)' }}
                        onMouseEnter={e => (e.currentTarget.style.background = 'color-mix(in srgb,var(--accent) 6%,transparent)')}
                        onMouseLeave={e => (e.currentTarget.style.background = 'none')}
                      >
                        <div style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--text)' }}>{r.name}</div>
                        <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 1 }}>{r.email}</div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Clinical notes */}
            <div className="field">
              <label style={{ fontFamily: 'var(--ff)', fontSize: 12, fontWeight: 500, color: 'var(--muted)', display: 'block', marginBottom: 6 }}>Clinical notes</label>
              <textarea className="input" rows={3} placeholder="Optional notes…" value={addNotes} onChange={e => setAddNotes(e.target.value)} style={{ resize: 'vertical', fontFamily: 'var(--ff)' }} />
            </div>
          </div>

          {addErr && (
            <div style={{ background: 'color-mix(in srgb,var(--err) 8%,transparent)', border: '1px solid color-mix(in srgb,var(--err) 20%,transparent)', borderRadius: 10, padding: '10px 14px', color: 'var(--err)', fontSize: 13, marginBottom: 14 }}>
              {addErr}
            </div>
          )}

          <div style={{ display: 'flex', gap: 10 }}>
            <button
              type="button"
              className="btn"
              style={{ flex: 1, justifyContent: 'center' }}
              onClick={() => { setAddDevOpen(false); setSelDevice(null); setDevSearch(''); setAddErr('') }}
            >
              Cancel
            </button>
            <button
              type="button"
              className="btn btn-s"
              style={{ flex: 1, justifyContent: 'center', display: 'flex', alignItems: 'center', gap: 5 }}
              onClick={doAddDevice}
              disabled={!selDevice || addLoading}
            >
              {addLoading ? 'Saving…' : (
                <>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="M20 6L9 17l-5-5"/></svg>
                  Link device
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="m-content">

      {/* ── Topbar extras ── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
        <a href="/clinics/scan-patient" className="btn" style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden="true"><path d="M19 12H5M12 5l-7 7 7 7"/></svg>
          Back to scan
        </a>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 8, padding: 4, fontSize: 11.5 }}>
          <span style={{ color: 'var(--muted)', fontSize: 11, padding: '0 4px', whiteSpace: 'nowrap' }}>View as</span>
          {(['admin', 'radiographer', 'surgeon'] as const).map(r => (
            <button
              key={r}
              type="button"
              className={`rs-btn${role === r ? ' active' : ''}`}
              onClick={() => setRole(r)}
              aria-pressed={role === r}
            >
              {r.charAt(0).toUpperCase() + r.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* ── Patient implant card ────────────────────────────────────────────── */}
      <div
        className="pv-pass"
        style={
          isPending ? {
            background: 'linear-gradient(155deg,#e8edf2 0%,#d4dce6 55%,#eef1f5 100%)',
            color: '#1e293b',
          }
          : patient.mriStatus === 'unsafe' ? {
            background: 'linear-gradient(155deg,#991b1b 0%,#b91c1c 55%,#dc2626 100%)',
          }
          : patient.mriStatus === 'conditional' ? {
            background: 'linear-gradient(155deg,#c2410c 0%,#ea580c 55%,#f97316 100%)',
          }
          : patient.mriStatus === 'safe' ? {
            background: 'linear-gradient(155deg,#166534 0%,#15803d 55%,#16a34a 100%)',
          }
          : undefined
        }
      >
        <div className="pv-pass-top">
          <div className="pv-pass-brand">
            <img src="/icon.svg" alt="" style={isPending ? { filter: 'brightness(0) opacity(0.35)' } : undefined} />
            <span style={isPending ? { color: '#475569' } : undefined}>Implant ID</span>
          </div>
          {!isPending && patient.mriStatus && patient.mriStatus !== 'unknown' && (
            <div className="pv-pass-mri">
              <span style={{ fontFamily:'var(--ff)', fontSize:11, fontWeight:700, color:'rgba(255,255,255,0.92)', letterSpacing:'.3px', whiteSpace:'nowrap' }}>
                {mriMeta.label}
              </span>
              <img
                src={patient.mriStatus === 'safe' ? '/mr-safe.svg' : patient.mriStatus === 'conditional' ? '/mr-conditional.svg' : '/mr-unsafe.svg'}
                alt={mriMeta.label}
                style={{ width: 40, height: 40, display: 'block', flexShrink: 0 }}
              />
            </div>
          )}
        </div>

        {isPending && (
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 7,
            background: 'rgba(251,191,36,0.14)', border: '1.5px solid rgba(251,191,36,0.55)',
            borderRadius: 999, padding: '6px 14px', marginBottom: 14,
            fontFamily: 'var(--ff)', fontSize: 12, fontWeight: 700,
            letterSpacing: '.4px', color: '#92400e',
          }}>
            <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#f59e0b', flexShrink: 0 }}/>
            Pending verification
          </div>
        )}

        <div className="pv-pass-type" style={{ color: isPending ? '#64748b' : undefined }}>
          {primaryDevice?.deviceType ?? (patient as any).selfReportedDeviceType ?? ''}
        </div>

        <div className="pv-pass-name" style={{ color: isPending ? '#334155' : undefined }}>
          {primaryDevice
            ? `${primaryDevice.manufacturer ?? ''} ${primaryDevice.model ?? ''}`.trim()
            : ((patient as any).selfReportedDevice ?? 'Awaiting verification')}
        </div>

        <div className="pv-pass-grid">
          <div>
            <div className="k" style={{ color: isPending ? '#94a3b8' : undefined }}>Patient</div>
            <div className="v" style={{ color: isPending ? '#334155' : undefined }}>{patient.firstName} {patient.lastName}</div>
          </div>
          {dob && (
            <div>
              <div className="k" style={{ color: isPending ? '#94a3b8' : undefined }}>Date of birth</div>
              <div className="v" style={{ color: isPending ? '#334155' : undefined }}>{dob}</div>
            </div>
          )}
          <div>
            <div className="k" style={{ color: isPending ? '#94a3b8' : undefined }}>Implant ID</div>
            <div className="v" style={{ color: isPending ? '#334155' : undefined, fontFamily: 'SF Mono,Monaco,monospace', letterSpacing: '.04em', fontSize: 13 }}>{patient.implantIdCode}</div>
          </div>
        </div>
      </div>

      {/* ── pt-hero ─────────────────────────────────────────────────────────── */}
      <div className="pt-hero">
        <div className="pt-photo" style={{ display: 'grid', placeItems: 'center', color: '#fff', fontFamily: 'var(--ff)', fontSize: 28, fontWeight: 700 }}>
          {initials || '?'}
        </div>
        <div className="pt-info">
          <h1>{patient.firstName} {patient.lastName}</h1>
          <div className="meta">
            <div>ID · <b style={{ fontFamily: 'SF Mono,Monaco,monospace', letterSpacing: '.04em' }}>{patient.implantIdCode}</b></div>
            {dob && <div>DOB · <b>{dob}</b></div>}
            <span className={`pill ${isPending ? 'pill-warn' : ''}`} style={!isPending ? {
              color: mriMeta.color,
              background: mriMeta.bg,
              border: `1px solid color-mix(in srgb,${mriMeta.color} 28%,transparent)`,
            } : undefined}>
              {isPending ? 'Pending verification' : mriMeta.label}
            </span>
          </div>
        </div>
        <div className="pt-acts">
          {/* Save patient — only shown to clinic staff (isSaved is null for non-staff, undefined while loading) */}
          {isSaved !== null && isSaved !== undefined && (
            <>
              {(isSaved || justSaved) ? (
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontFamily: 'var(--ff)', fontSize: 13, fontWeight: 600, color: 'var(--ok)' }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden="true"><path d="M20 6L9 17l-5-5"/></svg>
                    Saved
                  </span>
                  <button
                    type="button"
                    className="btn"
                    style={{ fontSize: 12.5, padding: '5px 12px', color: 'var(--err)', borderColor: 'color-mix(in srgb,var(--err) 30%,transparent)' }}
                    onClick={() => setUnsaveOpen(true)}
                    aria-label="Remove patient from your saved list"
                  >
                    Remove
                  </button>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 4 }}>
                  <button
                    type="button"
                    className="btn btn-s"
                    style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
                    onClick={doSavePatient}
                    disabled={saveLoading || isSaved === undefined}
                    aria-label="Save patient to your clinic's patient list"
                  >
                    {saveLoading ? 'Saving…' : (
                      <>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg>
                        Save patient
                      </>
                    )}
                  </button>
                  {saveErr && <span style={{ fontFamily: 'var(--ff)', fontSize: 12, color: 'var(--err)' }}>{saveErr}</span>}
                </div>
              )}
            </>
          )}
          <button
            type="button"
            className="btn"
            style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
            onClick={() => window.print()}
            aria-label="Export patient record as PDF"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6M12 18v-6M9 15l3 3 3-3"/></svg>
            Export PDF
          </button>
        </div>
      </div>

      {/* ── Pending banner ────────────────────────────────────────────────── */}
      {isPending && (
        <div style={{
          display: 'flex', alignItems: 'flex-start', gap: 12,
          background: 'color-mix(in srgb,#f59e0b 8%,transparent)',
          border: '1px solid color-mix(in srgb,#f59e0b 22%,transparent)',
          borderRadius: 12, padding: '14px 18px', marginBottom: 24,
        }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#b45309" strokeWidth="1.7" style={{ flexShrink: 0, marginTop: 1 }} aria-hidden="true">
            <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0zM12 9v4M12 17h.01"/>
          </svg>
          <div style={{ fontFamily: 'var(--ff)', fontSize: 13.5, color: '#92400e', lineHeight: 1.5 }}>
            <strong>Record pending verification.</strong> Device and MRI information is self-reported only. Treat with appropriate clinical caution.
          </div>
        </div>
      )}

      {/* ── Clinical notes — full-width 2-col ──────────────────────────── */}
      <div className="cn2">
        <div className="cn2-head">
          <div className="cn2-hl">
            <div className="ey cn2-title" style={{ margin: 0 }}>Clinical notes</div>
            <span className="cn2-count">{allNotes.length}</span>
          </div>
          <div className="cn2-tabs">
            {(['all', 'internal', 'patient'] as const).map(tab => (
              <button
                key={tab}
                type="button"
                className={`cn2-tab${noteFilterTab === tab ? ' active' : ''}`}
                onClick={() => setNoteFilterTab(tab)}
              >
                {tab === 'all' ? 'All notes' : tab === 'internal' ? 'Internal' : 'Patient visible'}
              </button>
            ))}
          </div>
        </div>

        <div className="cn2-body">
          {/* ── Stream ── */}
          <div className="cn2-stream">
            {clinicalNotes === undefined ? (
              <div className="cn2-empty">
                <div className="cn2-empty-ic">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 8v4M12 16h.01"/></svg>
                </div>
                <p>Loading notes…</p>
              </div>
            ) : filteredNotes.length === 0 ? (
              <div className="cn2-empty">
                <div className="cn2-empty-ic">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                  </svg>
                </div>
                <p>No {noteFilterTab === 'internal' ? 'internal' : noteFilterTab === 'patient' ? 'patient-visible' : ''} notes on this record yet.</p>
              </div>
            ) : filteredNotes.map((note: any) => {
              const av = `${note.authorName?.split(' ')[0]?.[0] ?? ''}${note.authorName?.split(' ')[1]?.[0] ?? ''}`.toUpperCase()
              const roleLabel = note.authorRole === 'surgeon' ? 'Surgeon'
                : note.authorRole === 'radiographer' ? 'Radiographer'
                : note.authorRole === 'admin' ? 'Admin'
                : 'Clinic staff'
              return (
                <div key={note._id} className="cn2-item">
                  <div className="cn2-irow">
                    <div className={`cn2-av ${note.authorRole}`}>{av}</div>
                    <div className="cn2-imeta">
                      <div className="cn2-imeta-top">
                        <span className="cn2-iname">{note.authorName}</span>
                        <span className={`cn2-irole ${note.authorRole}`}>{roleLabel}</span>
                      </div>
                      {note.clinicName && <div className="cn2-iorg">{note.clinicName}</div>}
                    </div>
                    <span className="cn2-itime">{timeAgo(note.createdAt)}</span>
                  </div>
                  <div className="cn2-itext">{note.content}</div>
                  <div className="cn2-ifoot">
                    <button
                      type="button"
                      className={`cn2-ivis ${note.visibleToPatient ? 'patient' : 'internal'}`}
                      onClick={() => toggleNoteVis({ noteId: note._id, visibleToPatient: !note.visibleToPatient }).catch(() => {})}
                      title={note.visibleToPatient ? 'Visible to patient — click to make internal' : 'Internal only — click to share with patient'}
                    >
                      {note.visibleToPatient ? (
                        <>
                          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden="true"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                          Visible to patient
                        </>
                      ) : (
                        <>
                          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden="true"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
                          Internal only
                        </>
                      )}
                    </button>
                    <button
                      type="button"
                      className="cn2-idel"
                      onClick={() => deleteNote({ noteId: note._id }).catch(() => {})}
                      aria-label="Delete note"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              )
            })}
          </div>

          {/* ── Compose panel ── */}
          <div className="cn2-compose">
            <div className="cn2-ch">Add a note</div>
            <div className="cn2-csub">Surgeons, radiographers, and clinic staff can leave notes and updates on this patient&apos;s record.</div>
            <textarea
              className="input"
              rows={6}
              value={noteContent}
              onChange={e => setNoteContent(e.target.value)}
              placeholder="Add a clinical note, post-op update, scan observation…"
              style={{ resize: 'vertical', fontFamily: 'var(--fb)', fontSize: 13.5 }}
              disabled={noteLoading}
            />
            <label className="cn2-vtog">
              <input
                type="checkbox"
                checked={noteVisible}
                onChange={e => setNoteVisible(e.target.checked)}
                disabled={noteLoading}
              />
              <div className="cn2-vtog-lbl">
                <b>Visible to patient</b>
                <span>{noteVisible
                  ? 'Patient will see this note on their emergency info page.'
                  : 'Internal only — patient cannot see this note.'
                }</span>
              </div>
            </label>
            {noteErr && (
              <div style={{ background: 'color-mix(in srgb,var(--err) 8%,transparent)', border: '1px solid color-mix(in srgb,var(--err) 20%,transparent)', borderRadius: 10, padding: '10px 14px', color: 'var(--err)', fontSize: 13, fontFamily: 'var(--ff)' }}>
                {noteErr}
              </div>
            )}
            {noteSent && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '10px 14px', background: 'color-mix(in srgb,var(--ok) 8%,transparent)', border: '1px solid color-mix(in srgb,var(--ok) 22%,transparent)', borderRadius: 10, fontFamily: 'var(--ff)', fontSize: 13, color: 'var(--ok)' }}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden="true"><path d="M20 6L9 17l-5-5"/></svg>
                Note added
              </div>
            )}
            <button
              type="button"
              className="btn btn-s"
              onClick={doAddNote}
              disabled={noteLoading || !noteContent.trim()}
              style={{ width: '100%', justifyContent: 'center', display: 'flex', alignItems: 'center', gap: 6 }}
            >
              {noteLoading ? 'Adding…' : (
                <>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                  Add note
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* ── 2-col grid ───────────────────────────────────────────────────── */}
      <div className="pv-grid">

        {/* ── LEFT COLUMN ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

          {/* Implant details */}
          {(patient.devices as any[])?.length > 0 ? (
            (patient.devices as any[]).map((d: any, i: number) => (
              <div key={d.deviceId ?? i} className="card">
                <div className="ey" style={{ marginBottom: 8 }}>Implant details</div>
                <h3 style={{ fontSize: 20, marginBottom: 22 }}>{d.manufacturer} {d.model}</h3>
                <div className="kv">
                  {d.manufacturer  && <div><div className="k">Manufacturer</div><div className="v">{d.manufacturer}</div></div>}
                  {d.deviceType    && <div><div className="k">Device type</div><div className="v">{d.deviceType}</div></div>}
                  {d.model         && <div><div className="k">Model number</div><div className="v">{d.model}</div></div>}
                  {d.serialNumber  && <div><div className="k">Serial number</div><div className="v">{d.serialNumber}</div></div>}
                  {d.implantDate   && <div><div className="k">Implanted</div><div className="v">{d.implantDate}{d.hospital ? ` · ${d.hospital}` : ''}</div></div>}
                  {d.implantingSurgeon && <div><div className="k">Implanting surgeon</div><div className="v">{d.implantingSurgeon}</div></div>}
                  {d.status && <div><div className="k">Status</div><div className="v" style={{ textTransform: 'capitalize' }}>{d.status}</div></div>}
                </div>
              </div>
            ))
          ) : patient.selfReportedDevice ? (
            <div className="card">
              <div className="ey" style={{ marginBottom: 8 }}>Implant details</div>
              <h3 style={{ fontSize: 20, marginBottom: 22 }}>{patient.selfReportedDevice}</h3>
              <div className="kv">
                {patient.selfReportedManufacturer && <div><div className="k">Manufacturer</div><div className="v">{patient.selfReportedManufacturer}</div></div>}
                {patient.selfReportedModelNumber  && <div><div className="k">Model number</div><div className="v">{patient.selfReportedModelNumber}</div></div>}
                {patient.selfReportedSurgeon      && <div><div className="k">Implanting surgeon</div><div className="v">{patient.selfReportedSurgeon}</div></div>}
                {patient.selfReportedHospital     && <div><div className="k">Hospital</div><div className="v">{patient.selfReportedHospital}</div></div>}
              </div>
              <div style={{ marginTop: 14, fontFamily: 'var(--ff)', fontSize: 12, color: 'var(--muted)' }}>Self-reported — pending clinical verification</div>
            </div>
          ) : (
            <div className="card">
              <div className="ey" style={{ marginBottom: 8 }}>Implant details</div>
              <div style={{ color: 'var(--muted)', fontSize: 14 }}>No device recorded.</div>
            </div>
          )}

          {/* MRI safety conditions */}
          {primaryDevice && (
            <div className="card">
              <div className="ey" style={{ marginBottom: 8 }}>MRI safety conditions</div>
              <h3 style={{ fontSize: 20, marginBottom: 8 }}>
                {primaryDevice.mriStatus === 'safe' ? 'MR Safe' :
                 primaryDevice.mriStatus === 'conditional' ? `Conditional at ${primaryDevice.fieldStrengths ?? '—'}` :
                 primaryDevice.mriStatus === 'unsafe' ? 'MR Unsafe' : 'Status unknown'}
              </h3>
              {primaryDevice.mriStatus === 'conditional' && (
                <p style={{ color: 'var(--muted)', fontSize: 14, lineHeight: 1.6, marginBottom: 12 }}>
                  This device is MR Conditional. The following scanning parameters must be observed.
                </p>
              )}
              {(primaryDevice.fieldStrengths || primaryDevice.sarLimit || primaryDevice.b1RmsLimit ||
                primaryDevice.slewRateLimit || primaryDevice.gradientLimit || primaryDevice.maxScanTime) && (
                <div className="safety">
                  {primaryDevice.fieldStrengths && <div className="sv"><div className="k">Max field strength</div><div className="v">{primaryDevice.fieldStrengths}</div></div>}
                  {primaryDevice.sarLimit       && <div className="sv"><div className="k">Max SAR</div><div className="v">{primaryDevice.sarLimit}</div></div>}
                  {primaryDevice.b1RmsLimit     && <div className="sv"><div className="k">B1+rms</div><div className="v">{primaryDevice.b1RmsLimit}</div></div>}
                  {primaryDevice.slewRateLimit  && <div className="sv"><div className="k">Slew rate</div><div className="v">{primaryDevice.slewRateLimit}</div></div>}
                  {primaryDevice.gradientLimit  && <div className="sv"><div className="k">Gradient limit</div><div className="v">{primaryDevice.gradientLimit}</div></div>}
                  {primaryDevice.maxScanTime    && <div className="sv"><div className="k">Max scan time</div><div className="v">{primaryDevice.maxScanTime}</div></div>}
                </div>
              )}
              {primaryDevice.contraindications && (
                <div style={{ marginTop: 14, background: 'color-mix(in srgb,var(--err) 5%,transparent)', border: '1px solid color-mix(in srgb,var(--err) 18%,transparent)', borderRadius: 10, padding: '12px 14px' }}>
                  <div style={{ fontFamily: 'var(--ff)', fontSize: 10.5, fontWeight: 600, letterSpacing: 1.3, textTransform: 'uppercase', color: 'var(--err)', marginBottom: 4 }}>Contraindications</div>
                  <div style={{ fontSize: 13.5, color: 'var(--text)', lineHeight: 1.5 }}>{primaryDevice.contraindications}</div>
                </div>
              )}
            </div>
          )}

          {/* Manufacturer documents */}
          <div className="card">
            <div className="ey" style={{ marginBottom: 8 }}>Manufacturer documents</div>
            <h3 style={{ fontSize: 20, marginBottom: 16 }}>Manuals &amp; safety sheets</h3>
            {primaryDevice ? (
              <a
                href={`/clinics/devices?q=${encodeURIComponent(`${primaryDevice.manufacturer} ${primaryDevice.model}`)}`}
                className="doc"
                style={{ textDecoration: 'none' }}
              >
                <div className="doc-ic">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6M9 13h6M9 17h6"/></svg>
                </div>
                <div style={{ flex: 1 }}>
                  <div className="nm">{primaryDevice.manufacturer} {primaryDevice.model} — MRI Safety Information</div>
                  <div className="mt">View in implant library</div>
                </div>
                <div style={{ marginLeft: 'auto', display: 'inline-flex', alignItems: 'center', gap: 6, color: 'var(--accent)', fontFamily: 'var(--ff)', fontSize: 12.5, fontWeight: 600 }}>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden="true"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
                  View
                </div>
              </a>
            ) : (
              <div style={{ color: 'var(--muted)', fontSize: 14 }}>No linked device — documents unavailable.</div>
            )}
          </div>

          {/* Link device from catalogue — admin and surgeon */}
          {(role === 'admin' || role === 'surgeon') && (
            <div className="card">
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                <div className="ey">Link device from catalogue</div>
                {!addSaved && (
                  <button
                    type="button"
                    className="btn btn-s"
                    style={{ fontSize: 12.5, padding: '5px 12px', display: 'inline-flex', alignItems: 'center', gap: 5 }}
                    onClick={() => {
                      setAddDevOpen(true)
                      setAddHospital(myClinic?.name ?? '')
                      setAddSurgeonTxt(patient.selfReportedSurgeon ?? '')
                      setDevSearch('')
                      setSelDevice(null)
                      setAddSerial('')
                      setAddDate('')
                      setAddNotes('')
                      setSurgSearch('')
                      setAddErr('')
                    }}
                    aria-label="Link a device from the catalogue to this patient"
                  >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" aria-hidden="true"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                    Add device
                  </button>
                )}
              </div>
              {addSaved ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', background: 'color-mix(in srgb,var(--ok) 8%,transparent)', border: '1px solid color-mix(in srgb,var(--ok) 22%,transparent)', borderRadius: 10, fontFamily: 'var(--ff)', fontSize: 13.5, color: 'var(--ok)' }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden="true"><path d="M20 6L9 17l-5-5"/></svg>
                  Device linked — record updated.
                </div>
              ) : (
                <div style={{ color: 'var(--muted)', fontSize: 13.5 }}>
                  Link a verified device from the Implant ID catalogue to this patient&apos;s record.
                </div>
              )}
            </div>
          )}

        </div>

        {/* ── RIGHT COLUMN ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

          {/* Emergency contact */}
          <div className="card">
            <div className="ey" style={{ marginBottom: 8 }}>Emergency contact</div>
            <div className="kv" style={{ gridTemplateColumns: '1fr' }}>
              {patient.emergencyContactName && (
                <div>
                  <div className="k">Next of kin</div>
                  <div className="v">
                    {patient.emergencyContactName}
                    {patient.emergencyContactRelation ? ` (${patient.emergencyContactRelation})` : ''}
                  </div>
                </div>
              )}
              {patient.emergencyContactPhone && (
                <div><div className="k">Phone</div><div className="v">{patient.emergencyContactPhone}</div></div>
              )}
              {patient.contrastAllergy !== undefined && patient.contrastAllergy !== null && (
                <div>
                  <div className="k">Contrast allergy</div>
                  <div className="v">
                    {patient.contrastAllergy
                      ? `Yes${patient.contrastAllergyNote ? ` — ${patient.contrastAllergyNote}` : ''}`
                      : 'No'}
                  </div>
                </div>
              )}
              {!patient.emergencyContactName && !patient.emergencyContactPhone && (
                <div style={{ color: 'var(--muted)', fontSize: 14 }}>No emergency contact recorded.</div>
              )}
            </div>
          </div>

          {/* Care team */}
          <div className="card">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
              <div className="ey">Care team</div>
            </div>
            <div className="kv" style={{ gridTemplateColumns: '1fr' }}>
              {(primaryDevice?.implantingSurgeon || patient.selfReportedSurgeon) && (
                <div>
                  <div className="k">Implanting surgeon</div>
                  <div className="v">{primaryDevice?.implantingSurgeon ?? patient.selfReportedSurgeon}{(primaryDevice?.hospital ?? patient.selfReportedHospital) ? ` · ${primaryDevice?.hospital ?? patient.selfReportedHospital}` : ''}</div>
                </div>
              )}
              {patient.heightCm && (
                <div><div className="k">Height</div><div className="v">{patient.heightCm} cm</div></div>
              )}
              {patient.weightKg && (
                <div><div className="k">Weight</div><div className="v">{patient.weightKg} kg</div></div>
              )}
              {patient.additionalNotes && (
                <div style={{ gridColumn: '1/-1' }}>
                  <div className="k">Notes</div>
                  <div className="v" style={{ fontSize: 13.5, lineHeight: 1.5 }}>{patient.additionalNotes}</div>
                </div>
              )}
              {!primaryDevice?.implantingSurgeon && !patient.selfReportedSurgeon && !patient.heightCm && !patient.weightKg && (
                <div style={{ color: 'var(--muted)', fontSize: 14 }}>No care team information recorded.</div>
              )}
            </div>
          </div>

          {/* Record timeline */}
          <div className="card">
            <div className="ey" style={{ marginBottom: 14 }}>Record timeline</div>
            {timeline.length === 0 ? (
              <div style={{ color: 'var(--muted)', fontSize: 14 }}>No activity recorded yet.</div>
            ) : (
              <div className="timeline">
                {timeline.map((item, i) => (
                  <div key={i} className="tl-item">
                    <div className="t">{item.t}</div>
                    <div className="body">
                      <b>{item.label}</b>
                      {item.sub && <span className="by">{item.sub}</span>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Verify this record — shown to admin/surgeon while pending */}
          {isPending && (role === 'admin' || role === 'surgeon') && (
            <div className="card">
              <div className="ey" style={{ marginBottom: 8 }}>Verify this record</div>
              {verifySaved ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '12px 14px', background: 'color-mix(in srgb,var(--ok) 8%,transparent)', border: '1px solid color-mix(in srgb,var(--ok) 22%,transparent)', borderRadius: 10, fontFamily: 'var(--ff)', fontSize: 13.5, color: 'var(--ok)' }}>
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden="true"><path d="M20 6L9 17l-5-5"/></svg>
                  Record verified — patient now has an active status.
                </div>
              ) : (
                <>
                  <p style={{ fontFamily: 'var(--ff)', fontSize: 13.5, color: 'var(--muted)', lineHeight: 1.55, marginBottom: 14 }}>
                    Confirm the patient&apos;s self-reported implant details and mark this record as clinically verified.
                  </p>
                  <div className="field" style={{ marginBottom: 14 }}>
                    <label style={{ fontFamily: 'var(--ff)', fontSize: 12, fontWeight: 500, color: 'var(--muted)', display: 'block', marginBottom: 6 }}>
                      Clinical notes <span style={{ fontWeight: 400 }}>(optional)</span>
                    </label>
                    <textarea
                      className="input"
                      rows={3}
                      value={verifyNotes}
                      onChange={e => setVerifyNotes(e.target.value)}
                      placeholder="Any notes about this verification…"
                      style={{ resize: 'vertical', fontFamily: 'var(--ff)' }}
                    />
                  </div>
                  {verifyErr && (
                    <div style={{ background: 'color-mix(in srgb,var(--err) 8%,transparent)', border: '1px solid color-mix(in srgb,var(--err) 20%,transparent)', borderRadius: 10, padding: '10px 14px', color: 'var(--err)', fontSize: 13, marginBottom: 14 }}>
                      {verifyErr}
                    </div>
                  )}
                  <button
                    type="button"
                    className="btn btn-s"
                    style={{ width: '100%', justifyContent: 'center', display: 'flex', alignItems: 'center', gap: 6 }}
                    onClick={doVerify}
                    disabled={verifyLoading}
                    aria-label="Confirm and verify this patient record"
                  >
                    {verifyLoading ? 'Verifying…' : (
                      <>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="M20 6L9 17l-5-5"/></svg>
                        Confirm &amp; verify record
                      </>
                    )}
                  </button>
                </>
              )}
            </div>
          )}

          {/* Reference note */}
          <div style={{
            display: 'flex', alignItems: 'flex-start', gap: 10,
            background: 'color-mix(in srgb,var(--muted) 5%,transparent)',
            border: '1px solid var(--border)', borderRadius: 12, padding: '12px 16px',
          }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--muted)" strokeWidth="1.7" style={{ flexShrink: 0, marginTop: 1 }} aria-hidden="true">
              <circle cx="12" cy="12" r="9"/><path d="M12 8v4M12 16h.01"/>
            </svg>
            <span style={{ fontFamily: 'var(--ff)', fontSize: 12.5, color: 'var(--muted)', lineHeight: 1.5 }}>
              Always consult the device IFU and your clinical protocols. Information shown is for reference only.
            </span>
          </div>

        </div>
      </div>

      {/* ── Print area — hidden on screen, visible on print/PDF export ─── */}
      <div className="print-area">
        <div className="pa-head">
          <div>
            <div style={{ fontWeight: 700, fontSize: 18 }}>Implant ID — Clinical Patient Record</div>
            <div style={{ color: '#666', fontSize: 12, marginTop: 3 }}>Printed {new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}</div>
          </div>
          <div style={{ textAlign: 'right', fontSize: 13 }}>
            <div style={{ fontWeight: 600 }}>{patient.firstName} {patient.lastName}</div>
            <div style={{ fontFamily: 'SF Mono,Monaco,monospace', letterSpacing: '.04em', color: '#555', marginTop: 2 }}>{patient.implantIdCode}</div>
          </div>
        </div>

        <div className="pa-section">
          <div className="pa-title">Patient details</div>
          <div className="pa-row"><span>Name</span><span>{patient.firstName} {patient.lastName}</span></div>
          {dob && <div className="pa-row"><span>Date of birth</span><span>{dob}</span></div>}
          <div className="pa-row"><span>Implant ID</span><span style={{ fontFamily: 'SF Mono,Monaco,monospace' }}>{patient.implantIdCode}</span></div>
          <div className="pa-row"><span>MRI status</span><span>{isPending ? 'Pending verification' : mriMeta.label}</span></div>
          <div className="pa-row"><span>Record status</span><span>{isPending ? 'Pending — not clinically verified' : 'Clinically verified'}</span></div>
        </div>

        {primaryDevice ? (
          <div className="pa-section">
            <div className="pa-title">Implant device</div>
            <div className="pa-row"><span>Device</span><span>{primaryDevice.manufacturer} {primaryDevice.model}</span></div>
            {primaryDevice.deviceType    && <div className="pa-row"><span>Type</span><span>{primaryDevice.deviceType}</span></div>}
            {primaryDevice.serialNumber  && <div className="pa-row"><span>Serial number</span><span style={{ fontFamily: 'SF Mono,Monaco,monospace' }}>{primaryDevice.serialNumber}</span></div>}
            {primaryDevice.implantDate   && <div className="pa-row"><span>Implanted</span><span>{primaryDevice.implantDate}{primaryDevice.hospital ? ` · ${primaryDevice.hospital}` : ''}</span></div>}
            {primaryDevice.implantingSurgeon && <div className="pa-row"><span>Surgeon</span><span>{primaryDevice.implantingSurgeon}</span></div>}
          </div>
        ) : patient.selfReportedDevice ? (
          <div className="pa-section">
            <div className="pa-title">Implant device (self-reported — not verified)</div>
            <div className="pa-row"><span>Device</span><span>{patient.selfReportedDevice}</span></div>
            {(patient as any).selfReportedManufacturer && <div className="pa-row"><span>Manufacturer</span><span>{(patient as any).selfReportedManufacturer}</span></div>}
            {(patient as any).selfReportedSurgeon      && <div className="pa-row"><span>Surgeon</span><span>{(patient as any).selfReportedSurgeon}</span></div>}
            {(patient as any).selfReportedHospital     && <div className="pa-row"><span>Hospital</span><span>{(patient as any).selfReportedHospital}</span></div>}
          </div>
        ) : null}

        {primaryDevice && (primaryDevice.fieldStrengths || primaryDevice.sarLimit || primaryDevice.b1RmsLimit) && (
          <div className="pa-section">
            <div className="pa-title">MRI safety conditions</div>
            {primaryDevice.fieldStrengths && <div className="pa-row"><span>Approved field strengths</span><span>{primaryDevice.fieldStrengths}</span></div>}
            {primaryDevice.sarLimit       && <div className="pa-row"><span>Max whole-body SAR</span><span>{primaryDevice.sarLimit}</span></div>}
            {primaryDevice.b1RmsLimit     && <div className="pa-row"><span>B1+rms limit</span><span>{primaryDevice.b1RmsLimit}</span></div>}
            {primaryDevice.slewRateLimit  && <div className="pa-row"><span>Slew rate limit</span><span>{primaryDevice.slewRateLimit}</span></div>}
            {primaryDevice.gradientLimit  && <div className="pa-row"><span>Gradient limit</span><span>{primaryDevice.gradientLimit}</span></div>}
            {primaryDevice.maxScanTime    && <div className="pa-row"><span>Max scan time</span><span>{primaryDevice.maxScanTime}</span></div>}
            {primaryDevice.contraindications && (
              <div className="pa-row pa-warn"><span>Contraindications</span><span>{primaryDevice.contraindications}</span></div>
            )}
          </div>
        )}

        {(patient.emergencyContactName || patient.emergencyContactPhone || patient.contrastAllergy !== undefined) && (
          <div className="pa-section">
            <div className="pa-title">Emergency contact &amp; medical alerts</div>
            {patient.emergencyContactName  && <div className="pa-row"><span>Next of kin</span><span>{patient.emergencyContactName}{patient.emergencyContactRelation ? ` (${patient.emergencyContactRelation})` : ''}</span></div>}
            {patient.emergencyContactPhone && <div className="pa-row"><span>Phone</span><span>{patient.emergencyContactPhone}</span></div>}
            {patient.contrastAllergy !== undefined && patient.contrastAllergy !== null && (
              <div className="pa-row"><span>Contrast allergy</span><span>{patient.contrastAllergy ? `Yes${patient.contrastAllergyNote ? ` — ${patient.contrastAllergyNote}` : ''}` : 'No'}</span></div>
            )}
          </div>
        )}

        <div style={{ marginTop: 32, paddingTop: 14, borderTop: '1px solid #ccc', fontSize: 11, color: '#777', lineHeight: 1.6 }}>
          This document is for clinical reference only. Always consult the device IFU and your clinical protocols before performing any procedure.
          Record generated by Implant ID — portal.implantid.io
        </div>
      </div>

      {/* ── Unsave confirmation modal ─────────────────────────────────────── */}
      {unsaveOpen && (
        <div
          style={{ position: 'fixed', inset: 0, zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, background: 'rgba(0,0,0,0.45)' }}
          onClick={() => !unsaveLoading && setUnsaveOpen(false)}
        >
          <div
            style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 16, padding: '28px 28px 24px', maxWidth: 400, width: '100%', boxShadow: '0 20px 60px rgba(0,0,0,0.25)' }}
            onClick={e => e.stopPropagation()}
          >
            <h3 style={{ fontFamily: 'var(--ff)', fontSize: 17, fontWeight: 700, color: 'var(--text)', marginBottom: 10 }}>Remove patient?</h3>
            <p style={{ fontFamily: 'var(--ff)', fontSize: 14, color: 'var(--muted)', lineHeight: 1.55, marginBottom: 24 }}>
              <strong style={{ color: 'var(--text)' }}>{patient.firstName} {patient.lastName}</strong> will be removed from your clinic&apos;s patient list. You can re-add them at any time by scanning their card.
            </p>
            <div style={{ display: 'flex', gap: 10 }}>
              <button
                type="button"
                className="btn"
                style={{ flex: 1, justifyContent: 'center' }}
                onClick={() => setUnsaveOpen(false)}
                disabled={unsaveLoading}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-danger"
                style={{ flex: 1, justifyContent: 'center', display: 'flex', alignItems: 'center', gap: 6 }}
                onClick={doUnsavePatient}
                disabled={unsaveLoading}
              >
                {unsaveLoading ? 'Removing…' : 'Remove patient'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}
