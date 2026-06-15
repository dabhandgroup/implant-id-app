'use client'
import { useState } from 'react'
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

  const [role,     setRole]     = useState<ViewRole>('admin')
  const [auditFired, setAuditFired] = useState(false)

  const patient      = useQuery(api.patients.getFullPatientByCode, code ? { code } : 'skip')
  const auditEntries = useQuery(
    api.clinics.getPatientAuditEntries,
    patient?._id ? { patientId: patient._id } : 'skip',
  )
  const recordLookup = useMutation(api.patients.recordPatientLookup)

  if (patient?._id && !auditFired) {
    setAuditFired(true)
    recordLookup({ patientId: patient._id, clinicName: undefined }).catch(() => {})
  }

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

  return (
    <div className="m-content">

      {/* ── Topbar extras ── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
        <a href="/clinics/all-patients" className="btn" style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden="true"><path d="M19 12H5M12 5l-7 7 7 7"/></svg>
          Back to patients
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
          <button type="button" className="btn btn-s" style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6M12 18v-6M9 15l3 3 3-3"/></svg>
            Export PDF
          </button>
          <button type="button" className="btn" style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><path d="M16 6l-4-4-4 4M12 2v13"/></svg>
            Share wallet pass
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

    </div>
  )
}
