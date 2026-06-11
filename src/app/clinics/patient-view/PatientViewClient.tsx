'use client'
import { useState } from 'react'
import { useQuery, useMutation } from 'convex/react'
import { useSearchParams }       from 'next/navigation'
import { api as apiBase }        from '../../../../convex/_generated/api'

const api = apiBase as any

// ── MRI badge meta ────────────────────────────────────────────────────────────

const MRI_META: Record<string, { label: string; color: string; bg: string }> = {
  safe:        { label: 'MR Safe',        color: 'var(--ok)',    bg: 'color-mix(in srgb,var(--ok) 10%,transparent)'   },
  conditional: { label: 'MR Conditional', color: '#b45309',      bg: 'color-mix(in srgb,#f59e0b 12%,transparent)'     },
  unsafe:      { label: 'MR Unsafe',      color: 'var(--err)',   bg: 'color-mix(in srgb,var(--err) 10%,transparent)'  },
  unknown:     { label: 'Unknown',         color: 'var(--muted)', bg: 'color-mix(in srgb,var(--muted) 10%,transparent)' },
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function Row({ label, value }: { label: string; value?: string | number | null }) {
  if (value === undefined || value === null || value === '') return null
  return (
    <div style={{ display: 'contents' }}>
      <div style={{ color: 'var(--muted)', fontSize: 13, fontFamily: 'var(--ff)', padding: '6px 0', borderBottom: '1px solid var(--border)' }}>{label}</div>
      <div style={{ color: 'var(--text)',  fontSize: 13, fontFamily: 'var(--ff)', padding: '6px 0', fontWeight: 500, borderBottom: '1px solid var(--border)' }}>{String(value)}</div>
    </div>
  )
}

// ── Main component ─────────────────────────────────────────────────────────────

export default function PatientViewClient() {
  const searchParams = useSearchParams()
  const code         = (searchParams?.get('code') ?? '').trim().toUpperCase()
  const [expanded, setExpanded] = useState<string | null>(null)

  // All hooks unconditionally at top
  const patient      = useQuery(api.patients.lookupByImplantId, code ? { code } : 'skip')
  const deviceDetail = useQuery(
    api.devices.getDeviceById,
    expanded ? { id: expanded } : 'skip',
  )
  const recordLookup = useMutation(api.patients.recordPatientLookup)

  // Record the lookup once we have the patient _id — best effort, don't block UI
  // lookupByImplantId doesn't return _id, so we use getPatientByCode for audit
  const patientById = useQuery(api.patients.getPatientByCode, code ? { code } : 'skip')
  // Fire audit once (effect-like pattern via derived state)
  const [auditFired, setAuditFired] = useState(false)
  if (patientById?._id && !auditFired) {
    setAuditFired(true)
    recordLookup({ patientId: patientById._id, clinicName: undefined }).catch(() => {})
  }

  // ── States ────────────────────────────────────────────────────────────────

  if (!code) {
    return (
      <div className="m-content">
        <div className="m-h" style={{ marginBottom: 24 }}>
          <div>
            <h2>Patient view</h2>
            <div className="sub">No patient code provided.</div>
          </div>
          <a href="/clinics/scan-patient" className="btn" style={{ textDecoration: 'none' }}>
            ← Scan patient
          </a>
        </div>
        <div style={{
          background: 'color-mix(in srgb,var(--err) 6%,transparent)',
          border: '1px solid color-mix(in srgb,var(--err) 18%,transparent)',
          borderRadius: 12, padding: '20px 24px', maxWidth: 520,
          fontFamily: 'var(--ff)', fontSize: 14, color: 'var(--err)',
        }}>
          No Implant ID code was supplied. Use the scan page to look up a patient by code.
        </div>
      </div>
    )
  }

  if (patient === undefined) {
    return (
      <div className="m-content">
        <div className="m-h" style={{ marginBottom: 24 }}>
          <div><h2>Patient view</h2></div>
          <a href="/clinics/scan-patient" className="btn" style={{ textDecoration: 'none' }}>← Back</a>
        </div>
        <div style={{ color: 'var(--muted)', fontSize: 14, fontFamily: 'var(--ff)' }}>Loading record…</div>
      </div>
    )
  }

  if (patient === null) {
    return (
      <div className="m-content">
        <div className="m-h" style={{ marginBottom: 24 }}>
          <div><h2>Patient not found</h2></div>
          <a href="/clinics/scan-patient" className="btn" style={{ textDecoration: 'none' }}>← Scan patient</a>
        </div>
        <div style={{
          background: 'color-mix(in srgb,var(--err) 6%,transparent)',
          border: '1px solid color-mix(in srgb,var(--err) 18%,transparent)',
          borderRadius: 12, padding: '20px 24px', maxWidth: 520, display: 'flex',
          alignItems: 'flex-start', gap: 14,
        }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--err)" strokeWidth="1.7" style={{ flexShrink: 0, marginTop: 2 }} aria-hidden="true">
            <circle cx="12" cy="12" r="9"/><path d="M12 8v4M12 16h.01"/>
          </svg>
          <div>
            <div style={{ fontFamily: 'var(--ff)', fontSize: 14, fontWeight: 600, color: 'var(--err)', marginBottom: 4 }}>No record found</div>
            <div style={{ fontSize: 13.5, color: 'var(--muted)' }}>
              No patient found with code <strong style={{ fontFamily: 'SF Mono,Monaco,monospace' }}>{code}</strong>.
              Check the code and try again.
            </div>
          </div>
        </div>
      </div>
    )
  }

  // ── Derived ───────────────────────────────────────────────────────────────

  const mriMeta  = MRI_META[patient.mriStatus ?? 'unknown'] ?? MRI_META.unknown
  const isPending = patient.verificationStatus !== 'active'
  const MONTHS   = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
  const dob      = patient.dob
    ? new Date(patient.dob).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
    : undefined

  return (
    <div className="m-content">

      {/* Header */}
      <div className="m-h" style={{ marginBottom: 24 }}>
        <div>
          <h2>{patient.firstName} {patient.lastName}</h2>
          <div className="sub" style={{ fontFamily: 'SF Mono,Monaco,monospace', letterSpacing: '.04em', fontSize: 13 }}>
            {patient.implantIdCode}
          </div>
        </div>
        <a href="/clinics/scan-patient" className="btn" style={{ textDecoration: 'none' }}>
          ← Scan another
        </a>
      </div>

      {/* Pending warning */}
      {isPending && (
        <div style={{
          display: 'flex', alignItems: 'flex-start', gap: 12,
          background: 'color-mix(in srgb,#f59e0b 8%,transparent)',
          border: '1px solid color-mix(in srgb,#f59e0b 22%,transparent)',
          borderRadius: 12, padding: '14px 18px',
          marginBottom: 24, maxWidth: 680,
        }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#b45309" strokeWidth="1.7" style={{ flexShrink: 0, marginTop: 1 }} aria-hidden="true">
            <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0zM12 9v4M12 17h.01"/>
          </svg>
          <div style={{ fontFamily: 'var(--ff)', fontSize: 13.5, color: '#92400e', lineHeight: 1.5 }}>
            <strong>Record pending verification.</strong> This patient&apos;s implant details have not yet been clinically confirmed.
            Treat device and MRI information as self-reported only.
          </div>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, maxWidth: 880 }}>

        {/* ── Left column ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

          {/* MRI status card */}
          <div style={{
            background: 'var(--bg2)', border: '1px solid var(--border)',
            borderRadius: 14, overflow: 'hidden',
          }}>
            <div style={{
              padding: '14px 18px', borderBottom: '1px solid var(--border)',
              fontFamily: 'var(--ff)', fontSize: 12, fontWeight: 600,
              letterSpacing: '.3px', textTransform: 'uppercase', color: 'var(--muted)',
            }}>
              MRI Safety Status
            </div>
            <div style={{ padding: '18px' }}>
              <div style={{
                display: 'inline-flex', alignItems: 'center', gap: 10,
                background: mriMeta.bg,
                border: `1px solid color-mix(in srgb,${mriMeta.color} 22%,transparent)`,
                borderRadius: 10, padding: '10px 16px', marginBottom: 12,
              }}>
                {(patient.mriStatus === 'safe' || patient.mriStatus === 'conditional' || patient.mriStatus === 'unsafe')
                  ? <img src={`/mr-${patient.mriStatus}.svg`} alt="" aria-hidden="true" style={{ width:28, height:28, display:'block', flexShrink:0 }} />
                  : <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={mriMeta.color} strokeWidth="1.7" aria-hidden="true"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
                }
                <span style={{ fontFamily: 'var(--ff)', fontSize: 14, fontWeight: 700, color: mriMeta.color }}>
                  {mriMeta.label}
                </span>
              </div>
              {isPending && (
                <p style={{ fontFamily: 'var(--ff)', fontSize: 12.5, color: 'var(--muted)', margin: 0, lineHeight: 1.5 }}>
                  MRI status is based on the patient&apos;s self-reported device and has not been clinically verified.
                </p>
              )}
            </div>
          </div>

          {/* Patient details */}
          <div style={{
            background: 'var(--bg2)', border: '1px solid var(--border)',
            borderRadius: 14, overflow: 'hidden',
          }}>
            <div style={{
              padding: '14px 18px', borderBottom: '1px solid var(--border)',
              fontFamily: 'var(--ff)', fontSize: 12, fontWeight: 600,
              letterSpacing: '.3px', textTransform: 'uppercase', color: 'var(--muted)',
            }}>
              Patient Details
            </div>
            <div style={{ padding: '14px 18px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '140px 1fr', rowGap: 0 }}>
                <Row label="Full name"  value={`${patient.firstName} ${patient.lastName}`} />
                <Row label="Date of birth" value={dob} />
                <Row label="Height"     value={patient.heightCm ? `${patient.heightCm} cm` : null} />
                <Row label="Weight"     value={patient.weightKg ? `${patient.weightKg} kg` : null} />
                <Row label="Contrast allergy"
                  value={patient.contrastAllergy === true
                    ? `Yes${patient.contrastAllergyNote ? ` — ${patient.contrastAllergyNote}` : ''}`
                    : patient.contrastAllergy === false ? 'No' : undefined}
                />
                <Row label="Verification"
                  value={patient.verificationStatus === 'active' ? 'Verified' : 'Pending verification'}
                />
              </div>
            </div>
          </div>

        </div>

        {/* ── Right column ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

          {/* Devices */}
          <div style={{
            background: 'var(--bg2)', border: '1px solid var(--border)',
            borderRadius: 14, overflow: 'hidden',
          }}>
            <div style={{
              padding: '14px 18px', borderBottom: '1px solid var(--border)',
              fontFamily: 'var(--ff)', fontSize: 12, fontWeight: 600,
              letterSpacing: '.3px', textTransform: 'uppercase', color: 'var(--muted)',
            }}>
              Implanted Devices
            </div>

            {(!patient.devices || patient.devices.length === 0) ? (
              <div style={{ padding: '18px', color: 'var(--muted)', fontSize: 13.5, fontFamily: 'var(--ff)' }}>
                {patient.selfReportedDevice
                  ? (
                    <>
                      <div style={{ fontFamily: 'var(--ff)', fontWeight: 500, fontSize: 14, color: 'var(--text)', marginBottom: 4 }}>
                        {patient.selfReportedDevice}
                      </div>
                      <div style={{ fontSize: 12, color: 'var(--muted)' }}>Self-reported — pending verification</div>
                    </>
                  )
                  : 'No devices recorded.'}
              </div>
            ) : (
              <div>
                {(patient.devices as any[]).map((d: any, i: number) => {
                  const devKey = (d.deviceId as string | undefined) ?? `dev-${i}`
                  const isExp  = expanded === devKey
                  const dKey   = ((d as any)._id as string | undefined) ?? devKey
                  const statusMeta = MRI_META[(d.mriStatus as string) ?? 'unknown'] ?? MRI_META.unknown
                  return (
                    <div key={dKey} style={{ borderBottom: i < patient.devices.length - 1 ? '1px solid var(--border)' : 'none' }}>
                      <div style={{ padding: '14px 18px', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
                        <div style={{ flex: 1 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                            <span style={{
                              display:'inline-flex', alignItems:'center', gap:5,
                              fontFamily: 'var(--ff)', fontSize: 11, fontWeight: 600,
                              padding: (d.mriStatus==='safe'||d.mriStatus==='conditional'||d.mriStatus==='unsafe') ? '2px 8px 2px 3px' : '2px 7px',
                              borderRadius: 5,
                              background: statusMeta.bg,
                              color: statusMeta.color,
                              border: `1px solid color-mix(in srgb,${statusMeta.color} 22%,transparent)`,
                              flexShrink: 0, whiteSpace: 'nowrap',
                            }}>
                              {(d.mriStatus==='safe'||d.mriStatus==='conditional'||d.mriStatus==='unsafe') && (
                                <img src={`/mr-${d.mriStatus}.svg`} alt="" aria-hidden="true" style={{ width:16, height:16, display:'block', flexShrink:0 }} />
                              )}
                              {statusMeta.label}
                            </span>
                            {d.status === 'active' ? (
                              <span style={{ fontFamily: 'var(--ff)', fontSize: 11, fontWeight: 600, color: 'var(--ok)', background: 'color-mix(in srgb,var(--ok) 10%,transparent)', border: '1px solid color-mix(in srgb,var(--ok) 22%,transparent)', borderRadius: 5, padding: '2px 7px' }}>Active</span>
                            ) : d.status === 'explanted' ? (
                              <span style={{ fontFamily: 'var(--ff)', fontSize: 11, fontWeight: 600, color: 'var(--muted)', background: 'color-mix(in srgb,var(--muted) 8%,transparent)', border: '1px solid var(--border)', borderRadius: 5, padding: '2px 7px' }}>Explanted</span>
                            ) : null}
                          </div>
                          <div style={{ fontFamily: 'var(--ff)', fontWeight: 600, fontSize: 14, color: 'var(--text)', marginBottom: 2 }}>
                            {d.manufacturer} {d.model}
                          </div>
                          <div style={{ fontSize: 12, color: 'var(--muted)', display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                            {d.deviceType && <span>{d.deviceType}</span>}
                            {d.serialNumber && <span>S/N: {d.serialNumber}</span>}
                            {d.implantDate && <span>Implanted: {d.implantDate}</span>}
                          </div>
                        </div>
                        {d.deviceId && (
                          <button
                            type="button"
                            onClick={() => setExpanded(isExp ? null : devKey)}
                            aria-expanded={isExp}
                            style={{
                              flexShrink: 0, background: 'transparent',
                              border: '1px solid var(--border)', borderRadius: 6,
                              cursor: 'pointer', color: 'var(--muted)',
                              fontFamily: 'var(--ff)', fontSize: 11.5, fontWeight: 500,
                              padding: '4px 10px', whiteSpace: 'nowrap',
                            }}
                          >
                            {isExp ? 'Hide' : 'MRI params'}
                          </button>
                        )}
                      </div>

                      {/* MRI parameters panel */}
                      {isExp && (
                        <div style={{ borderTop: '1px solid var(--border)', padding: '14px 18px', background: 'var(--bg)' }}>
                          {deviceDetail === undefined ? (
                            <div style={{ color: 'var(--muted)', fontSize: 13 }}>Loading…</div>
                          ) : deviceDetail === null ? (
                            <div style={{ color: 'var(--muted)', fontSize: 13 }}>Parameters not available.</div>
                          ) : (
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px 16px' }}>
                              {[
                                ['Field strengths', (deviceDetail as any).fieldStrengths],
                                ['SAR limit',       (deviceDetail as any).sarLimit],
                                ['B1+rms limit',    (deviceDetail as any).b1RmsLimit],
                                ['Slew rate',       (deviceDetail as any).slewRateLimit],
                                ['Gradient limit',  (deviceDetail as any).gradientLimit],
                                ['Max scan time',   (deviceDetail as any).maxScanTime],
                              ].filter(([,v]) => v).map(([label, val]) => (
                                <div key={label as string} style={{ display: 'contents' }}>
                                  <div style={{ fontSize: 12, color: 'var(--muted)', padding: '3px 0' }}>{label as string}</div>
                                  <div style={{ fontSize: 12, color: 'var(--text)', fontWeight: 500, padding: '3px 0' }}>{val as string}</div>
                                </div>
                              ))}
                              {(deviceDetail as any).contraindications && (
                                <div style={{ gridColumn: '1/-1', marginTop: 8 }}>
                                  <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 2 }}>Contraindications</div>
                                  <div style={{ fontSize: 12, color: 'var(--text)', lineHeight: 1.5 }}>{(deviceDetail as any).contraindications}</div>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* Tier note */}
          <div style={{
            display: 'flex', alignItems: 'flex-start', gap: 10,
            background: 'color-mix(in srgb,var(--muted) 5%,transparent)',
            border: '1px solid var(--border)', borderRadius: 12, padding: '12px 16px',
          }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--muted)" strokeWidth="1.7" style={{ flexShrink: 0, marginTop: 1 }} aria-hidden="true">
              <circle cx="12" cy="12" r="9"/><path d="M12 8v4M12 16h.01"/>
            </svg>
            <span style={{ fontFamily: 'var(--ff)', fontSize: 12.5, color: 'var(--muted)', lineHeight: 1.5 }}>
              This record has been shared by the patient. Always consult the device IFU and your clinical protocols —
              information shown here is for reference only.
            </span>
          </div>

        </div>
      </div>

      {/* Mobile: stack columns */}
      <style>{`
        @media(max-width:700px){
          .pv-grid{grid-template-columns:1fr !important}
        }
      `}</style>

    </div>
  )
}
