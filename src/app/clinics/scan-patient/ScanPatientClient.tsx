'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useQuery, useMutation }                     from 'convex/react'
import { useSearchParams }                           from 'next/navigation'
import { api as apiBase }                           from '../../../../convex/_generated/api'
const api = apiBase as any

type Tab = 'scan' | 'model' | 'manual'

const MRI_META: Record<string, { label: string; cls: string }> = {
  safe:        { label: 'MR Safe',        cls: 'mri-safe'        },
  conditional: { label: 'MR Conditional', cls: 'mri-conditional' },
  unsafe:      { label: 'MR Unsafe',      cls: 'mri-unsafe'      },
}

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
  const searchParams = useSearchParams()

  // ── All hooks at top ──────────────────────────────────────────────────────
  const [tab,              setTab]              = useState<Tab>('scan')
  const [inputCode,        setInputCode]        = useState(searchParams?.get('code') ?? '')
  const [searchCode,       setSearchCode]       = useState(searchParams?.get('code') ?? '')
  const [modelQuery,       setModelQuery]       = useState('')
  const [expandedDeviceId, setExpandedDeviceId] = useState<string | null>(null)
  const [cameraActive,     setCameraActive]     = useState(false)
  const [cameraError,      setCameraError]      = useState('')
  const [toast,            setToast]            = useState('')
  const [toastVisible,     setToastVisible]     = useState(false)

  const videoRef  = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const inputRef  = useRef<HTMLInputElement>(null)

  const result       = useQuery(api.patients.getPatientByCode,   searchCode ? { code: searchCode } : 'skip')
  const deviceLinks  = useQuery(api.patients.getPatientDeviceLinks, result?._id ? { patientId: result._id } : 'skip')
  const deviceDetail = useQuery(api.devices.getDeviceById,       expandedDeviceId ? { id: expandedDeviceId } : 'skip')
  const recordLookup = useMutation(api.patients.recordPatientLookup)

  useEffect(() => {
    if (result?._id && searchCode) {
      recordLookup({ patientId: result._id, clinicName: undefined }).catch(() => {})
    }
  }, [result?._id]) // eslint-disable-line react-hooks/exhaustive-deps

  // Stop camera when switching away from scan tab
  useEffect(() => {
    if (tab !== 'scan') stopCamera()
  }, [tab])

  // Cleanup camera on unmount
  useEffect(() => () => stopCamera(), [])

  const startCamera = useCallback(async () => {
    setCameraError('')
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 }, height: { ideal: 720 } },
      })
      streamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        await videoRef.current.play()
      }
      setCameraActive(true)
    } catch {
      setCameraError('Camera permission denied. Use "Manual entry" or "By model #" instead.')
    }
  }, [])

  function stopCamera() {
    streamRef.current?.getTracks().forEach(t => t.stop())
    streamRef.current = null
    setCameraActive(false)
    if (videoRef.current) videoRef.current.srcObject = null
  }

  function showToast(msg: string) {
    setToast(msg)
    setToastVisible(true)
    setTimeout(() => setToastVisible(false), 2500)
  }

  function handleManualSearch() {
    const cleaned = inputCode.trim().toUpperCase()
    if (!cleaned) return
    setSearchCode(cleaned)
    setExpandedDeviceId(null)
    setTab('manual')
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter') handleManualSearch()
  }

  function handleClear() {
    setInputCode('')
    setSearchCode('')
    setExpandedDeviceId(null)
    inputRef.current?.focus()
  }

  // If page loaded with ?code=, jump straight to manual tab and search
  useEffect(() => {
    if (searchParams?.get('code')) setTab('manual')
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const isLoading = !!(searchCode && result === undefined)
  const notFound  = !!(searchCode && result === null)
  const found     = result !== null && result !== undefined
  const mriKey    = found ? (result.mriStatus ?? (result.verificationStatus === 'active' ? 'conditional' : 'unknown')) : null
  const mriMeta   = mriKey && MRI_META[mriKey] ? MRI_META[mriKey] : null

  const TABS: { key: Tab; label: string; icon: React.ReactNode }[] = [
    {
      key: 'scan',
      label: 'Scan card',
      icon: (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true">
          <rect x="3" y="5" width="18" height="14" rx="2" /><path d="M3 10h18M8 15h2" />
        </svg>
      ),
    },
    {
      key: 'model',
      label: 'By model #',
      icon: (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true">
          <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
        </svg>
      ),
    },
    {
      key: 'manual',
      label: 'Manual entry',
      icon: (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true">
          <path d="M12 20h9M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
        </svg>
      ),
    },
  ]

  return (
    <div className="m-content scan-page">

      {/* ── Eyebrow + heading ── */}
      <div className="ey" style={{ marginBottom: 10 }}>Look up an implant</div>
      <h2 style={{ fontSize: 'clamp(20px,2vw,26px)', letterSpacing: '-.025em', maxWidth: 580, lineHeight: 1.2 }}>
        Scan the card, type the model number,<br />or point the camera at the unit.
      </h2>
      <p style={{ color: 'var(--muted)', fontSize: 14, marginTop: 8, marginBottom: 28, lineHeight: 1.5 }}>
        Three ways to find an implant in the library. All pull the same full MRI safety profile and manufacturer manual.
      </p>

      {/* ── Tab bar ── */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 24, background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 12, padding: 4, width: 'fit-content' }}>
        {TABS.map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            aria-selected={tab === t.key}
            style={{
              display: 'flex', alignItems: 'center', gap: 7,
              background: tab === t.key ? 'var(--text)' : 'transparent',
              color: tab === t.key ? 'var(--bg)' : 'var(--muted)',
              border: 'none', borderRadius: 8, padding: '8px 16px',
              fontFamily: 'var(--ff)', fontSize: 13, fontWeight: 500,
              cursor: 'pointer', transition: 'all .15s', whiteSpace: 'nowrap',
            }}
          >
            {t.icon}{t.label}
          </button>
        ))}
      </div>

      <div className="scan-layout">

        {/* ── Left panel: camera / model search / manual ── */}
        <div className="scan-panel">

          {/* SCAN TAB */}
          {tab === 'scan' && (
            <>
              <div className="scan-panel-title">Scan patient card</div>
              <div className="scan-panel-sub">
                Point the camera at the QR code or barcode on the patient&apos;s implant card or wallet pass.
              </div>

              {/* Viewfinder */}
              <div className={`viewfinder${cameraActive ? ' scanning' : ''}`}>
                {cameraActive ? (
                  <>
                    <video ref={videoRef} style={{ width: '100%', height: '100%', objectFit: 'cover' }} muted playsInline aria-label="Camera feed" />
                    <div className="vf-scan-line" aria-hidden="true" />
                  </>
                ) : (
                  <div className="vf-idle">
                    <svg className="vf-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.3" aria-hidden="true">
                      <rect x="3" y="5" width="18" height="14" rx="2" />
                      <path d="M3 10h18M8 15h2" />
                    </svg>
                    <p>Tap &ldquo;Start camera&rdquo; to scan the card</p>
                  </div>
                )}
              </div>

              {cameraError && (
                <div style={{ marginBottom: 14, padding: '10px 14px', background: 'color-mix(in srgb,var(--err) 8%,transparent)', border: '1px solid color-mix(in srgb,var(--err) 20%,transparent)', borderRadius: 10, fontFamily: 'var(--ff)', fontSize: 13, color: 'var(--err)' }}>
                  {cameraError}
                </div>
              )}

              {!cameraActive ? (
                <button className="btn btn-s btn-block scan-start-btn" onClick={startCamera}>
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true">
                    <circle cx="12" cy="12" r="9" /><circle cx="12" cy="12" r="3" />
                  </svg>
                  Start camera
                </button>
              ) : (
                <button className="btn btn-block scan-start-btn" onClick={stopCamera}>
                  Stop camera
                </button>
              )}

              <div className="scan-or">or enter manually below</div>
              <div className="manual-lookup">
                <div className="lookup-input-row">
                  <input
                    type="text"
                    className="input lookup-input"
                    placeholder="e.g. IID-SMIJO2311XK"
                    value={inputCode}
                    onChange={e => setInputCode(e.target.value)}
                    onKeyDown={handleKeyDown}
                    autoCapitalize="characters"
                    spellCheck={false}
                    aria-label="Implant ID code"
                  />
                  <button className="btn btn-s lookup-btn" onClick={handleManualSearch} disabled={!inputCode.trim()}>
                    Look up
                  </button>
                </div>
                <div className="lookup-hint">Enter the code from the patient&rsquo;s card, e-mail, or Apple Wallet pass.</div>
              </div>
            </>
          )}

          {/* MODEL # TAB */}
          {tab === 'model' && (
            <>
              <div className="scan-panel-title">Search by model number</div>
              <div className="scan-panel-sub">
                Type the device model number to find MRI safety information directly from the implant library.
              </div>
              <div className="manual-lookup">
                <div className="lookup-input-row">
                  <input
                    type="text"
                    className="input lookup-input"
                    placeholder="e.g. W1DR01, 5086MRI…"
                    value={modelQuery}
                    onChange={e => setModelQuery(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter' && modelQuery.trim()) window.location.href = `/clinics/library?q=${encodeURIComponent(modelQuery.trim())}` }}
                    aria-label="Device model number"
                    autoFocus
                  />
                  <button
                    className="btn btn-s lookup-btn"
                    disabled={!modelQuery.trim()}
                    onClick={() => { if (modelQuery.trim()) window.location.href = `/clinics/library?q=${encodeURIComponent(modelQuery.trim())}` }}
                  >
                    Search
                  </button>
                </div>
                <div className="lookup-hint">Searches device names, model numbers, and manufacturers in the library.</div>
              </div>
              <div style={{ marginTop: 24 }}>
                <div style={{ fontFamily: 'var(--ff)', fontSize: 11, fontWeight: 600, letterSpacing: 1.2, textTransform: 'uppercase', color: 'var(--muted2)', marginBottom: 12 }}>Quick access</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {['Pacemaker', 'ICD', 'Cochlear Implant', 'Neurostimulator', 'Stent'].map(t => (
                    <a
                      key={t}
                      href={`/clinics/library?q=${encodeURIComponent(t)}`}
                      className="btn"
                      style={{ fontSize: 12.5, textDecoration: 'none' }}
                    >
                      {t}
                    </a>
                  ))}
                </div>
              </div>
            </>
          )}

          {/* MANUAL TAB */}
          {tab === 'manual' && (
            <>
              <div className="scan-panel-title">Look up patient record</div>
              <div className="scan-panel-sub">
                Enter the patient&apos;s Implant ID code to retrieve their MRI safety information.
              </div>

              {/* Tier badge */}
              <div className="scan-tier-badge" style={{ marginBottom: 20 }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                </svg>
                Tier 1 lookup — MRI safety only, no consent required
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
                  <button className="btn btn-s lookup-btn" onClick={handleManualSearch} disabled={!inputCode.trim()}>
                    Look up
                  </button>
                </div>
                {inputCode && (
                  <button onClick={handleClear} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)', fontFamily: 'var(--ff)', fontSize: 12.5, padding: 0, marginTop: 4 }}>
                    Clear
                  </button>
                )}
                <div className="lookup-hint" style={{ marginTop: 8 }}>Enter the code from the patient&rsquo;s card, e-mail, or Apple Wallet pass.</div>
              </div>
            </>
          )}
        </div>

        {/* ── Right panel: result ── */}
        <div className="scan-panel">
          <div className="scan-panel-title">Patient record</div>
          <div className="scan-panel-sub">
            MRI safety information will appear here after a successful lookup.
          </div>

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
                <circle cx="12" cy="12" r="9" /><path d="M12 8v4M12 16h.01" />
              </svg>
              <div>
                <div style={{ fontFamily: 'var(--ff)', fontSize: 14, fontWeight: 600, color: 'var(--err)', marginBottom: 4 }}>
                  No record found
                </div>
                <div style={{ fontSize: 13.5, color: 'var(--muted)' }}>
                  No patient found for code <strong style={{ fontFamily: 'SF Mono,Monaco,monospace' }}>{searchCode}</strong>. Check the code and try again.
                </div>
              </div>
            </div>
          )}

          {/* Empty state */}
          {!isLoading && !notFound && !found && (
            <div className="lookup-empty">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.3" aria-hidden="true">
                <circle cx="12" cy="7" r="4" />
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
              </svg>
              <span>Scan or enter a patient code to view their MRI safety information.</span>
            </div>
          )}

          {/* Result */}
          {found && (
            <div className="lookup-result">

              {/* Found badge */}
              <div className="result-found-badge">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden="true">
                  <path d="m9 12 2 2 4-4" /><circle cx="12" cy="12" r="9" />
                </svg>
                Patient record found
              </div>

              {/* MRI status */}
              {mriMeta && (
                <div className={`result-mri-badge ${mriMeta.cls}`}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true">
                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                    {mriKey !== 'unsafe' && <path d="m9 12 2 2 4-4" />}
                    {mriKey === 'unsafe' && <path d="M18 6 6 18M6 6l12 12" />}
                  </svg>
                  {mriMeta.label}
                </div>
              )}

              {/* Fields */}
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

              {/* Verified devices */}
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
                            <div style={{ fontFamily: 'var(--ff)', fontSize: 13.5, fontWeight: 500, color: 'var(--text)' }}>{d.deviceName ?? d.deviceType ?? 'Device'}</div>
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
                              <div style={{ color: 'var(--muted)', fontSize: 13, fontFamily: 'var(--ff)' }}>Parameters not available.</div>
                            ) : (
                              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px 20px' }}>
                                <ParamRow label="Field strengths"  value={deviceDetail.fieldStrengths} />
                                <ParamRow label="SAR limit"        value={deviceDetail.sarLimit} />
                                <ParamRow label="B1+rms limit"     value={deviceDetail.b1RmsLimit} />
                                <ParamRow label="Slew rate limit"  value={deviceDetail.slewRateLimit} />
                                <ParamRow label="Max scan time"    value={deviceDetail.maxScanTime} />
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}

              {/* Actions */}
              <div className="result-actions">
                <a href={`/clinics/patient-view?code=${result.implantIdCode}`} className="btn btn-s" style={{ textDecoration: 'none', textAlign: 'center' }}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>
                  </svg>
                  Full record
                </a>
                <button className="btn" onClick={() => { showToast('Copied to clipboard'); navigator.clipboard?.writeText(result.implantIdCode) }}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true">
                    <rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
                  </svg>
                  Copy ID
                </button>
              </div>

              <div className="tier1-note">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true">
                  <circle cx="12" cy="12" r="9"/><path d="M12 8v4M12 16h.01"/>
                </svg>
                Tier 1 lookup — MRI safety only. To view full patient record, tap &ldquo;Full record&rdquo; above.
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
