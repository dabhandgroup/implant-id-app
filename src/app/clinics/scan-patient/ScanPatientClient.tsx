'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { useQuery, useMutation }   from 'convex/react'
import { useSearchParams }         from 'next/navigation'
import { api as apiBase }          from '../../../../convex/_generated/api'
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const api = apiBase as any

function extractIidCode(raw: string): string | null {
  const match = raw.match(/IID-[A-Z0-9]{6,}/i)
  return match ? match[0].toUpperCase() : null
}

function timeAgo(ts: number): string {
  const diff  = Date.now() - ts
  const mins  = Math.floor(diff / 60_000)
  const hours = Math.floor(diff / 3_600_000)
  const days  = Math.floor(diff / 86_400_000)
  if (mins  < 1)  return 'just now'
  if (mins  < 60) return `${mins}m ago`
  if (hours < 24) return `${hours}h ago`
  if (days  < 7)  return `${days}d ago`
  return new Date(ts).toLocaleDateString('en-GB', { day:'2-digit', month:'short' })
}

export default function ScanPatientClient() {
  const searchParams = useSearchParams()

  // ── All hooks at top ──────────────────────────────────────────────────────
  const [inputCode,        setInputCode]        = useState(searchParams?.get('code') ?? '')
  const [searchCode,       setSearchCode]       = useState(searchParams?.get('code') ?? '')
  const [toast,            setToast]            = useState('')
  const [toastVisible,     setToastVisible]     = useState(false)
  const [cameraActive,     setCameraActive]     = useState(false)
  const [cameraError,      setCameraError]      = useState('')
  const [captureError,     setCaptureError]     = useState('')
  const [isCapturing,      setIsCapturing]      = useState(false)
  const [videoMirrored,    setVideoMirrored]    = useState(false)
  const [accessRequested,  setAccessRequested]  = useState(false)
  const [requestingAccess, setRequestingAccess] = useState(false)

  const inputRef  = useRef<HTMLInputElement>(null)
  const videoRef  = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const rafRef    = useRef<number>(0)

  const result          = useQuery(api.patients.getPatientByCode, searchCode ? { code: searchCode } : 'skip')
  const recordLookup    = useMutation(api.patients.recordPatientLookup)
  const requestAccess   = useMutation(api.patients.requestClinicAccess)

  // Dashboard section queries
  const stats           = useQuery(api.clinics.getClinicStats)
  const recentLookups   = useQuery(api.clinics.getRecentLookups)
  const todayCount      = useQuery(api.clinics.getTodayLookupCount)
  const deviceCount     = useQuery(api.devices.getDeviceCount)
  const clinicPatients  = useQuery(api.clinics.listClinicPatients)

  const flagged = (clinicPatients ?? []).filter((p: any) => p.verificationStatus !== 'active').slice(0, 5)

  useEffect(() => {
    if (result?._id && searchCode) {
      recordLookup({ patientId: result._id, clinicName: undefined }).catch(() => {})
    }
  }, [result?._id]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { setAccessRequested(false) }, [result?._id])
  useEffect(() => () => { stopCamera() }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Camera ────────────────────────────────────────────────────────────────

  function stopCamera() {
    cancelAnimationFrame(rafRef.current)
    if (streamRef.current) { streamRef.current.getTracks().forEach(t => t.stop()); streamRef.current = null }
    if (videoRef.current) videoRef.current.srcObject = null
    setCameraActive(false)
    setVideoMirrored(false)
    setCaptureError('')
  }

  const scanFrame = useCallback(() => {
    const video  = videoRef.current
    const canvas = canvasRef.current
    if (!video || !canvas || video.readyState < 2) { rafRef.current = requestAnimationFrame(scanFrame); return }
    const ctx = canvas.getContext('2d')
    if (!ctx) { rafRef.current = requestAnimationFrame(scanFrame); return }
    canvas.width = video.videoWidth; canvas.height = video.videoHeight
    ctx.drawImage(video, 0, 0)
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
    import('jsqr').then(({ default: jsQR }) => {
      const code = jsQR(imageData.data, imageData.width, imageData.height, { inversionAttempts: 'dontInvert' })
      if (code?.data) {
        const iid = extractIidCode(code.data)
        if (iid) { stopCamera(); setSearchCode(iid); setInputCode(iid); showToast('QR code detected'); return }
      }
      rafRef.current = requestAnimationFrame(scanFrame)
    }).catch(() => { rafRef.current = requestAnimationFrame(scanFrame) })
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  async function captureFrame() {
    const video  = videoRef.current
    const canvas = canvasRef.current
    if (!video || !canvas) return
    setIsCapturing(true)
    setCaptureError('')
    canvas.width = video.videoWidth; canvas.height = video.videoHeight
    const ctx = canvas.getContext('2d')
    if (!ctx) { setIsCapturing(false); return }
    ctx.drawImage(video, 0, 0)
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
    try {
      const { default: jsQR } = await import('jsqr')
      const code = jsQR(imageData.data, imageData.width, imageData.height, { inversionAttempts: 'dontInvert' })
      if (code?.data) {
        const iid = extractIidCode(code.data)
        if (iid) { stopCamera(); setSearchCode(iid); setInputCode(iid); showToast('QR code detected'); return }
      }
      setCaptureError('No QR code found — ensure the code is fully in frame and try again')
    } catch {
      setCaptureError('Could not process image — try again')
    } finally {
      setIsCapturing(false)
    }
  }

  async function startCamera() {
    setCameraError('')
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 }, height: { ideal: 720 } },
      })
      streamRef.current = stream
      if (videoRef.current) { videoRef.current.srcObject = stream; await videoRef.current.play() }
      const facingMode = stream.getVideoTracks()[0]?.getSettings?.()?.facingMode
      setVideoMirrored(facingMode === 'user' || facingMode === undefined)
      setCameraActive(true)
      rafRef.current = requestAnimationFrame(scanFrame)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : ''
      if (msg.includes('Permission') || msg.includes('NotAllowed')) {
        setCameraError('Camera access denied. Please allow camera access and try again.')
      } else if (msg.includes('NotFound') || msg.includes('NotReadable')) {
        setCameraError('No camera found on this device.')
      } else {
        setCameraError('Could not start camera. Use manual entry on the right.')
      }
    }
  }

  // ── Handlers ──────────────────────────────────────────────────────────────

  function handleSearch() {
    const c = inputCode.trim().toUpperCase()
    if (c) setSearchCode(c)
  }

  function handleKeyDown(e: React.KeyboardEvent) { if (e.key === 'Enter') handleSearch() }

  function handleClear() {
    setInputCode(''); setSearchCode(''); setAccessRequested(false)
    inputRef.current?.focus()
  }

  function showToast(msg: string) {
    setToast(msg); setToastVisible(true)
    setTimeout(() => setToastVisible(false), 2500)
  }

  async function handleRequestAccess() {
    if (!result?._id || requestingAccess) return
    setRequestingAccess(true)
    try {
      await requestAccess({ patientId: result._id, reason: 'Access requested via scan card' })
      setAccessRequested(true); showToast('Access request sent')
    } catch { showToast('Could not send request — try again') }
    finally { setRequestingAccess(false) }
  }

  // ── Derived ───────────────────────────────────────────────────────────────

  const isLoading      = !!(searchCode && result === undefined)
  const notFound       = !!(searchCode && result === null)
  const found          = result !== null && result !== undefined
  const sharingEnabled = found ? result.clinicSharingEnabled !== false : true

  const MRI_BADGE: Record<string, { cls: string; label: string }> = {
    safe:        { cls: 'mri-safe',        label: 'MR Safe'        },
    conditional: { cls: 'mri-conditional', label: 'MR Conditional' },
    unsafe:      { cls: 'mri-unsafe',      label: 'MR Unsafe'      },
  }
  const mriKey   = found ? (result.mriStatus ?? (result.verificationStatus === 'active' ? 'conditional' : null)) : null
  const mriBadge = mriKey ? MRI_BADGE[mriKey] : null

  // ── Result card ───────────────────────────────────────────────────────────

  function ResultCard() {
    if (!found) return null
    return (
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
            <div className="rf-val" style={{ fontFamily: 'SF Mono,Monaco,monospace', fontWeight: 700, color: 'var(--accent)', fontSize: 13 }}>{result.implantIdCode}</div>
          </div>
          <div className="result-field">
            <div className="rf-label">Name</div>
            <div className="rf-val" style={{ fontWeight: 500 }}>{result.firstName} {result.lastName}</div>
          </div>
          {result.dob && (
            <div className="result-field">
              <div className="rf-label">Date of birth</div>
              <div className="rf-val">{result.dob}</div>
            </div>
          )}
          {sharingEnabled && result.selfReportedDevice && (
            <div className="result-field">
              <div className="rf-label">Device</div>
              <div className="rf-val">{result.selfReportedDevice}</div>
            </div>
          )}
          <div className="result-field">
            <div className="rf-label">Status</div>
            <div className="rf-val">
              <span style={{
                fontFamily: 'var(--ff)', fontSize: 11.5, fontWeight: 600, padding: '2px 8px', borderRadius: 5,
                background: result.verificationStatus === 'active' ? 'color-mix(in srgb,var(--ok) 10%,transparent)' : 'color-mix(in srgb,#f59e0b 10%,transparent)',
                color: result.verificationStatus === 'active' ? 'var(--ok)' : '#92400e',
              }}>
                {result.verificationStatus === 'active' ? 'Verified' : 'Pending'}
              </span>
            </div>
          </div>
        </div>

        {sharingEnabled ? (
          <div className="result-actions">
            <a href={`/clinics/patient-view?code=${result.implantIdCode}`} className="btn btn-s" style={{ textDecoration: 'none', textAlign: 'center' }}>
              Full record →
            </a>
            <button className="btn" onClick={() => { navigator.clipboard?.writeText(result.implantIdCode); showToast('Copied') }}>
              Copy ID
            </button>
          </div>
        ) : (
          <div className="result-actions">
            {accessRequested ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', background: 'color-mix(in srgb,var(--ok) 10%,transparent)', border: '1px solid color-mix(in srgb,var(--ok) 22%,transparent)', borderRadius: 10, flex: 1, fontFamily: 'var(--ff)', fontSize: 13.5, color: 'var(--ok)', fontWeight: 500 }}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden="true">
                  <path d="m9 12 2 2 4-4"/><circle cx="12" cy="12" r="9"/>
                </svg>
                Access request sent — patient will be notified
              </div>
            ) : (
              <button className="btn btn-s" style={{ flex: 1, justifyContent: 'center' }} onClick={handleRequestAccess} disabled={requestingAccess}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true">
                  <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/>
                </svg>
                {requestingAccess ? 'Requesting…' : 'Request access'}
              </button>
            )}
            <button className="btn" onClick={() => { navigator.clipboard?.writeText(result.implantIdCode); showToast('Copied') }}>
              Copy ID
            </button>
          </div>
        )}

        {!sharingEnabled && !accessRequested && (
          <div className="tier1-note">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
            </svg>
            This patient has restricted access to their full record. Click &ldquo;Request access&rdquo; to email them for permission.
          </div>
        )}

        {sharingEnabled && (
          <div className="tier1-note">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true">
              <circle cx="12" cy="12" r="9"/><path d="M12 8v4M12 16h.01"/>
            </svg>
            Tier 1 — MRI safety only. Tap &ldquo;Full record&rdquo; to access the complete patient record.
          </div>
        )}
      </div>
    )
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="scan-page">

      {/* ── Unified card ── */}
      <div className="scan-card">
        <div className="scan-layout">

          {/* ── Left column: camera ── */}
          <div className="scan-col">

            <div className="scan-col-hd">
              <div className="scan-col-hd-badge accent">
                {/* QR code icon */}
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
                  <rect x="2" y="2" width="8" height="8" rx="1.5"/>
                  <rect x="2.5" y="2.5" width="3" height="3" rx=".3" fill="currentColor" stroke="none"/>
                  <rect x="14" y="2" width="8" height="8" rx="1.5"/>
                  <rect x="14.5" y="2.5" width="3" height="3" rx=".3" fill="currentColor" stroke="none"/>
                  <rect x="2" y="14" width="8" height="8" rx="1.5"/>
                  <rect x="2.5" y="14.5" width="3" height="3" rx=".3" fill="currentColor" stroke="none"/>
                  <rect x="14" y="14" width="2.5" height="2.5" rx=".3" fill="currentColor" stroke="none"/>
                  <rect x="18" y="14" width="2.5" height="2.5" rx=".3" fill="currentColor" stroke="none"/>
                  <rect x="14" y="18" width="2.5" height="2.5" rx=".3" fill="currentColor" stroke="none"/>
                  <rect x="16.5" y="16.5" width="2" height="2" rx=".3" fill="currentColor" stroke="none"/>
                </svg>
              </div>
              <div>
                <p className="scan-col-hd-title">Scan QR code</p>
                <p className="scan-col-hd-sub">Hold the patient&rsquo;s card up to the camera</p>
              </div>
            </div>

            <div className={`viewfinder${cameraActive ? ' scanning' : ''}`}>
              <span className="vf-corner vf-corner-tl" />
              <span className="vf-corner vf-corner-tr" />
              <span className="vf-corner vf-corner-bl" />
              <span className="vf-corner vf-corner-br" />

              <video
                ref={videoRef}
                playsInline
                muted
                style={{
                  position: 'absolute', inset: 0, width: '100%', height: '100%',
                  objectFit: 'cover', borderRadius: 13,
                  display: cameraActive ? 'block' : 'none',
                  transform: videoMirrored ? 'scaleX(-1)' : 'none',
                  zIndex: 1,
                }}
              />
              <canvas ref={canvasRef} style={{ display: 'none' }} />

              {cameraActive && <div className="vf-vignette" />}
              {cameraActive && (
                <div className="vf-target">
                  <div className="vf-target-line" />
                </div>
              )}

              {!cameraActive && <div className="vf-scan-line" />}
              {!cameraActive && (
                <div className="vf-idle">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.35" className="vf-icon" aria-hidden="true">
                    <rect x="2" y="2" width="8" height="8" rx="1.5"/>
                    <rect x="3" y="3" width="4" height="4" rx=".5" fill="currentColor" stroke="none" opacity=".55"/>
                    <rect x="14" y="2" width="8" height="8" rx="1.5"/>
                    <rect x="15" y="3" width="4" height="4" rx=".5" fill="currentColor" stroke="none" opacity=".55"/>
                    <rect x="2" y="14" width="8" height="8" rx="1.5"/>
                    <rect x="3" y="15" width="4" height="4" rx=".5" fill="currentColor" stroke="none" opacity=".55"/>
                    <rect x="14" y="14" width="3" height="3" rx=".5" fill="currentColor" stroke="none" opacity=".4"/>
                    <rect x="19" y="14" width="3" height="3" rx=".5" fill="currentColor" stroke="none" opacity=".4"/>
                    <rect x="14" y="19" width="3" height="3" rx=".5" fill="currentColor" stroke="none" opacity=".4"/>
                    <rect x="17" y="17" width="2.5" height="2.5" rx=".4" fill="currentColor" stroke="none" opacity=".28"/>
                  </svg>
                  <p>Position the QR code inside the frame</p>
                </div>
              )}
            </div>

            {cameraError && (
              <div className="cam-error">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--err)" strokeWidth="1.7" aria-hidden="true">
                  <circle cx="12" cy="12" r="9"/><path d="M12 8v4M12 16h.01"/>
                </svg>
                {cameraError}
              </div>
            )}

            <div className="scan-ctas">
              {cameraActive ? (
                <>
                  <button className="btn btn-s btn-lg" onClick={captureFrame} disabled={isCapturing}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                      <circle cx="12" cy="12" r="3"/>
                      <path d="M8.5 3H6a2 2 0 0 0-2 2v1M15.5 3H18a2 2 0 0 1 2 2v1M21 15.5V18a2 2 0 0 1-2 2h-1M3 15.5V18a2 2 0 0 0 2 2h1"/>
                    </svg>
                    {isCapturing ? 'Scanning…' : 'Capture'}
                  </button>
                  {captureError && <div className="scan-capture-err">{captureError}</div>}
                  <button className="scan-ctas-cancel" onClick={stopCamera}>Cancel</button>
                </>
              ) : (
                <button className="btn btn-s btn-lg" onClick={startCamera}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden="true">
                    <path d="M23 7 16 12 23 17V7z"/><rect x="1" y="5" width="15" height="14" rx="2"/>
                  </svg>
                  Start camera
                </button>
              )}
            </div>
          </div>

          {/* ── Divider ── */}
          <div className="scan-divider">
            <span className="scan-divider-pill">or</span>
          </div>

          {/* ── Right column: manual entry ── */}
          <div className="scan-col">

            <div className="scan-col-hd">
              <div className="scan-col-hd-badge neutral">
                {/* ID badge icon */}
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
                  <rect x="2" y="5" width="20" height="14" rx="2"/>
                  <circle cx="8.5" cy="11" r="2"/>
                  <path d="M14 9h4M14 13h2"/>
                  <path d="M5.5 17c0-1.38 1.34-2.5 3-2.5s3 1.12 3 2.5"/>
                </svg>
              </div>
              <div>
                <p className="scan-col-hd-title">Enter Implant ID</p>
                <p className="scan-col-hd-sub">From card, Apple Wallet, or email</p>
              </div>
            </div>

            {/* Info panel */}
            <div className="lookup-info">
              <p className="lookup-info-desc">
                The Implant ID code appears on the patient&rsquo;s physical card, their Apple Wallet pass, or in their registration confirmation email.
              </p>
              <div className="lookup-info-eyebrow">Example</div>
              <div className="lookup-info-code">IID-SMIJO2311XK</div>
            </div>

            {/* Input */}
            <div className="lookup-input-wrap">
              <svg className="lookup-input-icon" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
                <circle cx="11" cy="11" r="7"/><path d="m21 21-4-4"/>
              </svg>
              <input
                ref={inputRef}
                type="text"
                className="lookup-input"
                placeholder="IID-XXXXXXXX"
                value={inputCode}
                onChange={e => setInputCode(e.target.value)}
                onKeyDown={handleKeyDown}
                autoComplete="off"
                autoCapitalize="characters"
                spellCheck={false}
                aria-label="Patient Implant ID code"
              />
            </div>

            <button
              className="btn btn-s btn-lg lookup-btn-full"
              onClick={handleSearch}
              disabled={!inputCode.trim()}
            >
              Look up patient
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden="true">
                <path d="m9 18 6-6-6-6"/>
              </svg>
            </button>

            <div className="lookup-foot">
              <span className="lookup-hint">Not case-sensitive</span>
              {inputCode && (
                <button onClick={handleClear} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)', fontFamily: 'var(--ff)', fontSize: 12.5, padding: 0 }}>
                  Clear
                </button>
              )}
            </div>
          </div>

        </div>
      </div>{/* end scan-card */}

      {/* ── Results ── */}
      {isLoading && (
        <div style={{ color: 'var(--muted)', fontFamily: 'var(--ff)', fontSize: 14, padding: '16px 0' }}>
          Looking up record…
        </div>
      )}
      {notFound && (
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14, background: 'color-mix(in srgb,var(--err) 6%,transparent)', border: '1px solid color-mix(in srgb,var(--err) 18%,transparent)', borderRadius: 12, padding: '14px 18px', marginTop: 16 }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--err)" strokeWidth="1.7" style={{ flexShrink: 0, marginTop: 1 }} aria-hidden="true">
            <circle cx="12" cy="12" r="9"/><path d="M12 8v4M12 16h.01"/>
          </svg>
          <div>
            <div style={{ fontFamily: 'var(--ff)', fontSize: 14, fontWeight: 600, color: 'var(--err)', marginBottom: 3 }}>No record found</div>
            <div style={{ fontSize: 13.5, color: 'var(--muted)' }}>
              No patient found for <strong style={{ fontFamily: 'SF Mono,Monaco,monospace' }}>{searchCode}</strong>.
            </div>
          </div>
        </div>
      )}
      {found && <ResultCard />}

      {/* ── Toast ── */}
      <div className={`scan-toast${toastVisible ? ' show' : ''}`} role="status" aria-live="polite">
        {toast}
      </div>

      {/* ── Stat row ─────────────────────────────────────────────────────────── */}
      <div className="stat-row" style={{ marginTop: 32 }}>
        <div className="stat-card">
          <div className="k">Library size</div>
          <div className="v">{deviceCount === undefined ? '…' : (deviceCount ?? 0).toLocaleString()}</div>
          <div className="d">Indexed devices</div>
        </div>
        <div className="stat-card">
          <div className="k">Lookups today</div>
          <div className="v">{todayCount === undefined ? '…' : todayCount ?? 0}</div>
          <div className="d">Across your clinic</div>
        </div>
        <div className="stat-card">
          <div className="k">Patients linked</div>
          <div className="v">{stats === undefined ? '…' : stats?.total ?? 0}</div>
          <div className="d">{stats?.verified ?? 0} verified</div>
        </div>
        <div className="stat-card">
          <div className="k">Flags needing review</div>
          <div className="v" style={{ color: (stats?.pending ?? 0) > 0 ? 'var(--warn)' : undefined }}>
            {stats === undefined ? '…' : stats?.pending ?? 0}
          </div>
          <div className="d">{(stats?.pending ?? 0) > 0 ? 'Action required' : 'All clear'}</div>
        </div>
      </div>

      {/* ── Grid: recent lookups + quick actions + flagged ───────────────────── */}
      <div className="grid-2">

        {/* Recent patient lookups */}
        <div className="table">
          <div className="table-h">
            <h3>Recent patient lookups</h3>
            <a href="/clinics/all-patients" style={{ fontFamily:'var(--ff)', fontSize:13, color:'var(--accent)', fontWeight:600 }}>View all</a>
          </div>

          {recentLookups === undefined ? (
            <div style={{ padding:'40px 22px', color:'var(--muted)', fontSize:13 }}>Loading…</div>
          ) : recentLookups.length === 0 ? (
            <div style={{ padding:'48px 22px', textAlign:'center', color:'var(--muted)', fontSize:13 }}>
              No lookups yet. Scan a patient card above to get started.
            </div>
          ) : (
            <>
              <div className="impl-row impl-thead">
                <div></div>
                <div>Patient</div>
                <div>ID</div>
                <div>Action</div>
                <div>Time</div>
              </div>
              {(recentLookups as any[]).slice(0, 8).map((row: any) => (
                <a
                  key={row._id}
                  href={`/clinics/patient-view?code=${encodeURIComponent(row.implantIdCode || '')}`}
                  className="impl-row"
                  style={{ textDecoration:'none' }}
                >
                  <div className="impl-ic">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/></svg>
                  </div>
                  <div>
                    <div className="impl-nm">{row.patientName}</div>
                    {row.deviceName && <div className="impl-mfr">{row.deviceName}</div>}
                  </div>
                  <div style={{ fontFamily:'var(--ff)', fontSize:12, color:'var(--muted2)' }}>{row.implantIdCode || '—'}</div>
                  <div>
                    <span style={{ fontFamily:'var(--ff)', fontSize:11.5, fontWeight:600, letterSpacing:'.4px', padding:'3px 8px', borderRadius:5, background:'color-mix(in srgb,var(--accent) 8%,transparent)', color:'var(--accent)' }}>
                      {row.action}
                    </span>
                  </div>
                  <div style={{ fontFamily:'var(--ff)', fontSize:12, color:'var(--muted2)' }}>{timeAgo(row.createdAt)}</div>
                </a>
              ))}
            </>
          )}
        </div>

        {/* Quick actions + flagged */}
        <div>
          <div className="quick-actions" style={{ marginBottom:16 }}>
            <h3 style={{ fontFamily:'var(--ff)', fontSize:13, fontWeight:600, letterSpacing:'.8px', textTransform:'uppercase', color:'var(--muted)' }}>Quick actions</h3>
            <div className="qa-grid">
              <a href="/clinics/all-patients" className="qa-btn">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/></svg>
                All patients
              </a>
              <a href="/clinics/add-patient" className="qa-btn">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"><circle cx="9" cy="7" r="4"/><path d="M3 21v-2a4 4 0 0 1 4-4h4M19 8v6M16 11h6"/></svg>
                Add patient
              </a>
              <a href="/clinics/devices" className="qa-btn">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20M4 19.5A2.5 2.5 0 0 0 6.5 22H20V2H6.5A2.5 2.5 0 0 0 4 4.5v15z"/></svg>
                Device library
              </a>
              <a href="/clinics/manufacturers" className="qa-btn">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
                Manufacturers
              </a>
              <a href="/clinics/staff" className="qa-btn">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>
                Invite staff
              </a>
              <a href="/clinics/audit" className="qa-btn">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/></svg>
                Audit log
              </a>
            </div>
          </div>

          {/* Flagged for review */}
          <div className="table">
            <div className="table-h">
              <h3>Flagged for review</h3>
              {flagged.length > 0 && (
                <span style={{ background:'color-mix(in srgb,var(--warn) 12%,transparent)', color:'var(--warn)', fontSize:11, fontWeight:700, padding:'3px 8px', borderRadius:5 }}>
                  {flagged.length}
                </span>
              )}
            </div>

            {clinicPatients === undefined ? (
              <div style={{ padding:'24px 22px', color:'var(--muted)', fontSize:13 }}>Loading…</div>
            ) : flagged.length === 0 ? (
              <div style={{ padding:'32px 22px', textAlign:'center', color:'var(--muted)', fontSize:14 }}>
                <div style={{ fontSize:24, marginBottom:6 }}>✓</div>
                All patients verified
              </div>
            ) : (
              flagged.map((p: any) => (
                <a
                  key={p._id}
                  href={`/clinics/patient-view?code=${encodeURIComponent(p.implantIdCode || '')}`}
                  className="impl-row"
                  style={{ gridTemplateColumns:'auto 1fr auto', textDecoration:'none' }}
                >
                  <div className="impl-ic">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/></svg>
                  </div>
                  <div>
                    <div className="impl-nm">{[p.firstName, p.lastName].filter(Boolean).join(' ') || 'Unknown'}</div>
                    <div className="impl-mfr">{p.implantIdCode || 'No ID'}</div>
                  </div>
                  <span style={{ fontSize:11, fontWeight:600, padding:'3px 8px', borderRadius:5, background:'color-mix(in srgb,var(--warn) 10%,transparent)', color:'var(--warn)', flexShrink:0 }}>
                    Pending
                  </span>
                </a>
              ))
            )}
          </div>
        </div>
      </div>

    </div>
  )
}
