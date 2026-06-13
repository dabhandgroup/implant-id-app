'use client'

import { useState, useEffect, useRef } from 'react'
import { useQuery, useMutation }        from 'convex/react'
import { useSearchParams }              from 'next/navigation'
import { api as apiBase }              from '../../../../convex/_generated/api'
const api = apiBase as any

function ParamRow({ label, value }: { label: string; value: string | undefined | null }) {
  if (!value) return null
  return (
    <>
      <div className="rf-label">{label}</div>
      <div className="rf-val">{value}</div>
    </>
  )
}

export default function ScanPatientClient() {
  const searchParams  = useSearchParams()

  // ── All hooks at top ──────────────────────────────────────────────────────
  const [inputCode,        setInputCode]        = useState(searchParams?.get('code') ?? '')
  const [searchCode,       setSearchCode]       = useState(searchParams?.get('code') ?? '')
  const [expandedDeviceId, setExpandedDeviceId] = useState<string | null>(null)
  const [toast,            setToast]            = useState('')
  const [toastVisible,     setToastVisible]     = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const result       = useQuery(api.patients.getPatientByCode,      searchCode ? { code: searchCode } : 'skip')
  const deviceLinks  = useQuery(api.patients.getPatientDeviceLinks, result?._id ? { patientId: result._id } : 'skip')
  const deviceDetail = useQuery(api.devices.getDeviceById,          expandedDeviceId ? { id: expandedDeviceId } : 'skip')
  const recordLookup = useMutation(api.patients.recordPatientLookup)

  useEffect(() => {
    if (result?._id && searchCode) {
      recordLookup({ patientId: result._id, clinicName: undefined }).catch(() => {})
    }
  }, [result?._id]) // eslint-disable-line react-hooks/exhaustive-deps

  function handleSearch() {
    const cleaned = inputCode.trim().toUpperCase()
    if (!cleaned) return
    setSearchCode(cleaned)
    setExpandedDeviceId(null)
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter') handleSearch()
  }

  function handleClear() {
    setInputCode('')
    setSearchCode('')
    setExpandedDeviceId(null)
    inputRef.current?.focus()
  }

  function showToast(msg: string) {
    setToast(msg)
    setToastVisible(true)
    setTimeout(() => setToastVisible(false), 2500)
  }

  const isLoading = !!(searchCode && result === undefined)
  const notFound  = !!(searchCode && result === null)
  const found     = result !== null && result !== undefined

  const MRI_BADGE: Record<string, { cls: string; label: string }> = {
    safe:        { cls: 'mri-safe',        label: 'MR Safe'        },
    conditional: { cls: 'mri-conditional', label: 'MR Conditional' },
    unsafe:      { cls: 'mri-unsafe',      label: 'MR Unsafe'      },
  }
  const mriKey  = found ? (result.mriStatus ?? (result.verificationStatus === 'active' ? 'conditional' : null)) : null
  const mriBadge = mriKey ? MRI_BADGE[mriKey] : null

  return (
    <div className="m-content scan-page">

      {/* ── Tier badge ── */}
      <div className="scan-tier-badge">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true">
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
        </svg>
        Tier 1 lookup — MRI safety only, no consent required
      </div>

      <div className="scan-layout">

        {/* ── Left: lookup input ── */}
        <div className="scan-panel">
          <div className="scan-panel-title">Look up patient record</div>
          <div className="scan-panel-sub">
            Enter the Implant ID code from the patient&apos;s card, e-mail, or Apple Wallet pass.
          </div>

          {/* Viewfinder placeholder — visual affordance for future camera */}
          <div className="viewfinder" style={{ marginBottom: 20 }}>
            <div className="vf-idle">
              <svg className="vf-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.3" aria-hidden="true">
                <rect x="3" y="5" width="18" height="14" rx="2" />
                <path d="M3 10h18M8 15h2" />
              </svg>
              <p>Camera scanning coming soon — enter the code below</p>
            </div>
          </div>

          <div className="manual-lookup">
            <div className="lookup-input-row">
              <input
                ref={inputRef}
                type="text"
                className="input lookup-input"
                placeholder="e.g. IID-SMIJO2311XK"
                value={inputCode}
                onChange={e => setInputCode(e.target.value)}
                onKeyDown={handleKeyDown}
                autoComplete="off"
                autoCapitalize="characters"
                spellCheck={false}
                style={{ fontFamily: 'SF Mono,Monaco,monospace', letterSpacing: '.04em' }}
                aria-label="Patient Implant ID code"
              />
              <button
                className="btn btn-s lookup-btn"
                onClick={handleSearch}
                disabled={!inputCode.trim()}
              >
                Look up
              </button>
            </div>
            {inputCode && (
              <button
                onClick={handleClear}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)', fontFamily: 'var(--ff)', fontSize: 12.5, padding: 0, marginTop: 6 }}
              >
                Clear
              </button>
            )}
            <div className="lookup-hint" style={{ marginTop: 8 }}>
              Accepts the full IID-XXXXXXXX format. Not case-sensitive.
            </div>
          </div>

          <div className="scan-or">or search by patient</div>

          <a href="/clinics/all-patients" className="btn btn-block" style={{ textDecoration: 'none', textAlign: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 4 }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true">
              <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/>
              <path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/>
            </svg>
            Browse all patients
          </a>
        </div>

        {/* ── Right: results ── */}
        <div className="scan-panel">
          <div className="scan-panel-title">MRI safety record</div>
          <div className="scan-panel-sub">
            Results appear here after a successful lookup.
          </div>

          {/* Empty state */}
          {!isLoading && !notFound && !found && (
            <div className="lookup-empty">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" aria-hidden="true">
                <circle cx="12" cy="7" r="4"/>
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
              </svg>
              <span>Enter a patient Implant ID to view their MRI safety record.</span>
            </div>
          )}

          {/* Loading */}
          {isLoading && (
            <div style={{ color: 'var(--muted)', fontSize: 14, fontFamily: 'var(--ff)', padding: '8px 0' }}>
              Looking up record…
            </div>
          )}

          {/* Not found */}
          {notFound && (
            <div style={{
              display: 'flex', alignItems: 'flex-start', gap: 14,
              background: 'color-mix(in srgb,var(--err) 6%,transparent)',
              border: '1px solid color-mix(in srgb,var(--err) 18%,transparent)',
              borderRadius: 12, padding: '16px 18px',
            }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--err)" strokeWidth="1.7" style={{ flexShrink: 0, marginTop: 1 }} aria-hidden="true">
                <circle cx="12" cy="12" r="9"/><path d="M12 8v4M12 16h.01"/>
              </svg>
              <div>
                <div style={{ fontFamily: 'var(--ff)', fontSize: 14, fontWeight: 600, color: 'var(--err)', marginBottom: 4 }}>
                  No record found
                </div>
                <div style={{ fontSize: 13.5, color: 'var(--muted)' }}>
                  No patient found for code <strong style={{ fontFamily: 'SF Mono,Monaco,monospace' }}>{searchCode}</strong>.
                </div>
              </div>
            </div>
          )}

          {/* Found */}
          {found && (
            <div className="lookup-result">

              <div className="result-found-badge">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden="true">
                  <path d="m9 12 2 2 4-4"/><circle cx="12" cy="12" r="9"/>
                </svg>
                Patient record found
              </div>

              {mriBadge && (
                <div className={`result-mri-badge ${mriBadge.cls}`}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true">
                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                    {mriKey !== 'unsafe' ? <path d="m9 12 2 2 4-4"/> : <path d="M18 6 6 18M6 6l12 12"/>}
                  </svg>
                  {mriBadge.label}
                </div>
              )}

              <div className="result-fields">
                <div className="result-field">
                  <div className="rf-label">Implant ID</div>
                  <div className="rf-val" style={{ fontFamily: 'SF Mono,Monaco,monospace', fontWeight: 700, color: 'var(--accent)', fontSize: 13 }}>
                    {result.implantIdCode}
                  </div>
                </div>
                <div className="result-field">
                  <div className="rf-label">Name</div>
                  <div className="rf-val" style={{ fontWeight: 500 }}>{result.firstName} {result.lastName}</div>
                </div>
                {result.selfReportedDevice && (
                  <div className="result-field">
                    <div className="rf-label">Device</div>
                    <div className="rf-val">{result.selfReportedDevice}</div>
                  </div>
                )}
                {result.selfReportedManufacturer && (
                  <div className="result-field">
                    <div className="rf-label">Manufacturer</div>
                    <div className="rf-val">{result.selfReportedManufacturer}</div>
                  </div>
                )}
                <div className="result-field">
                  <div className="rf-label">Status</div>
                  <div className="rf-val">
                    <span style={{
                      fontFamily: 'var(--ff)', fontSize: 11.5, fontWeight: 600,
                      padding: '2px 8px', borderRadius: 5,
                      background: result.verificationStatus === 'active'
                        ? 'color-mix(in srgb,var(--ok) 10%,transparent)'
                        : 'color-mix(in srgb,#f59e0b 10%,transparent)',
                      color: result.verificationStatus === 'active' ? 'var(--ok)' : '#92400e',
                    }}>
                      {result.verificationStatus === 'active' ? 'Verified' : 'Pending'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Expandable devices */}
              {deviceLinks && deviceLinks.length > 0 && (
                <div>
                  <div style={{ fontFamily: 'var(--ff)', fontSize: 11.5, fontWeight: 600, color: 'var(--muted)', letterSpacing: '.3px', textTransform: 'uppercase', marginBottom: 10 }}>
                    Verified devices
                  </div>
                  {deviceLinks.map((d: any) => {
                    const isExp = expandedDeviceId === d.deviceId
                    return (
                      <div key={d._id} style={{ border: '1px solid var(--border)', borderRadius: 10, overflow: 'hidden', marginBottom: 8 }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', background: 'var(--bg)' }}>
                          <div>
                            <div style={{ fontFamily: 'var(--ff)', fontSize: 13.5, fontWeight: 500 }}>{d.deviceName ?? d.deviceType ?? 'Device'}</div>
                            {d.serialNumber && <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>S/N: {d.serialNumber}</div>}
                          </div>
                          <button
                            onClick={() => setExpandedDeviceId(isExp ? null : d.deviceId)}
                            aria-expanded={isExp}
                            style={{ background: 'transparent', border: '1px solid var(--border)', borderRadius: 6, cursor: 'pointer', color: 'var(--muted)', fontFamily: 'var(--ff)', fontSize: 11.5, fontWeight: 500, padding: '4px 10px' }}
                          >
                            {isExp ? 'Hide' : 'Parameters'}
                          </button>
                        </div>
                        {isExp && (
                          <div style={{ borderTop: '1px solid var(--border)', padding: 16, background: 'var(--bg2)' }}>
                            {deviceDetail === undefined ? (
                              <div style={{ color: 'var(--muted)', fontSize: 13, fontFamily: 'var(--ff)' }}>Loading…</div>
                            ) : deviceDetail === null ? (
                              <div style={{ color: 'var(--muted)', fontSize: 13, fontFamily: 'var(--ff)' }}>Not available.</div>
                            ) : (
                              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px 20px' }}>
                                <ParamRow label="Field strengths" value={deviceDetail.fieldStrengths} />
                                <ParamRow label="SAR limit"       value={deviceDetail.sarLimit} />
                                <ParamRow label="B1+rms limit"    value={deviceDetail.b1RmsLimit} />
                                <ParamRow label="Slew rate"       value={deviceDetail.slewRateLimit} />
                                <ParamRow label="Max scan time"   value={deviceDetail.maxScanTime} />
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}

              <div className="result-actions">
                <a href={`/clinics/patient-view?code=${result.implantIdCode}`} className="btn btn-s" style={{ textDecoration: 'none', textAlign: 'center' }}>
                  Full record →
                </a>
                <button className="btn" onClick={() => { navigator.clipboard?.writeText(result.implantIdCode); showToast('Copied') }}>
                  Copy ID
                </button>
              </div>

              <div className="tier1-note">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true">
                  <circle cx="12" cy="12" r="9"/><path d="M12 8v4M12 16h.01"/>
                </svg>
                Tier 1 — MRI safety only. Tap &ldquo;Full record&rdquo; to access the complete patient record.
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Toast */}
      <div className={`scan-toast${toastVisible ? ' show' : ''}`} role="status" aria-live="polite">
        {toast}
      </div>
    </div>
  )
}
