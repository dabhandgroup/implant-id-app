'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { useQuery, useMutation }         from 'convex/react'
import { useSearchParams, useRouter }    from 'next/navigation'
import { api as apiBase }               from '../../../../convex/_generated/api'
const api = apiBase as any

type Tab = 'scan' | 'model' | 'browse'

const MODEL_CHIPS = ['Azure XT DR', 'Micra AV', 'Assurity MRI', 'Accolade 2', 'NucleusCI24RE']

function extractIidCode(raw: string): string | null {
  const match = raw.match(/IID-[A-Z0-9]{6,}/i)
  return match ? match[0].toUpperCase() : null
}

export default function ScanPatientClient() {
  const searchParams = useSearchParams()
  const router       = useRouter()

  // ── All hooks at top ──────────────────────────────────────────────────────
  const [activeTab,      setActiveTab]      = useState<Tab>('scan')
  const [inputCode,      setInputCode]      = useState(searchParams?.get('code') ?? '')
  const [searchCode,     setSearchCode]     = useState(searchParams?.get('code') ?? '')
  const [modelQuery,     setModelQuery]     = useState('')
  const [toast,          setToast]          = useState('')
  const [toastVisible,   setToastVisible]   = useState(false)
  const [cameraActive,   setCameraActive]   = useState(false)
  const [cameraError,    setCameraError]    = useState('')
  const [videoMirrored,  setVideoMirrored]  = useState(false)
  const [accessRequested, setAccessRequested] = useState(false)
  const [requestingAccess, setRequestingAccess] = useState(false)

  const inputRef    = useRef<HTMLInputElement>(null)
  const videoRef    = useRef<HTMLVideoElement>(null)
  const canvasRef   = useRef<HTMLCanvasElement>(null)
  const streamRef   = useRef<MediaStream | null>(null)
  const rafRef      = useRef<number>(0)

  const result          = useQuery(api.patients.getPatientByCode, searchCode ? { code: searchCode } : 'skip')
  const recordLookup    = useMutation(api.patients.recordPatientLookup)
  const requestAccess   = useMutation(api.patients.requestClinicAccess)

  useEffect(() => {
    if (result?._id && searchCode) {
      recordLookup({ patientId: result._id, clinicName: undefined }).catch(() => {})
    }
  }, [result?._id]) // eslint-disable-line react-hooks/exhaustive-deps

  // Reset access request state when patient changes
  useEffect(() => {
    setAccessRequested(false)
  }, [result?._id])

  // Stop camera when switching away from scan tab
  useEffect(() => {
    if (activeTab !== 'scan') stopCamera()
  }, [activeTab]) // eslint-disable-line react-hooks/exhaustive-deps

  // Stop camera on unmount
  useEffect(() => {
    return () => { stopCamera() }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Camera ────────────────────────────────────────────────────────────────

  function stopCamera() {
    cancelAnimationFrame(rafRef.current)
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop())
      streamRef.current = null
    }
    if (videoRef.current) videoRef.current.srcObject = null
    setCameraActive(false)
    setVideoMirrored(false)
  }

  const scanFrame = useCallback(() => {
    const video  = videoRef.current
    const canvas = canvasRef.current
    if (!video || !canvas || video.readyState < 2) {
      rafRef.current = requestAnimationFrame(scanFrame)
      return
    }
    const ctx = canvas.getContext('2d')
    if (!ctx) { rafRef.current = requestAnimationFrame(scanFrame); return }

    canvas.width  = video.videoWidth
    canvas.height = video.videoHeight
    ctx.drawImage(video, 0, 0)
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)

    // Dynamically import jsQR to avoid SSR issues
    import('jsqr').then(({ default: jsQR }) => {
      const code = jsQR(imageData.data, imageData.width, imageData.height, { inversionAttempts: 'dontInvert' })
      if (code?.data) {
        const iid = extractIidCode(code.data)
        if (iid) {
          stopCamera()
          setSearchCode(iid)
          setInputCode(iid)
          showToast('QR code detected')
          return
        }
      }
      rafRef.current = requestAnimationFrame(scanFrame)
    }).catch(() => {
      rafRef.current = requestAnimationFrame(scanFrame)
    })
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  async function startCamera() {
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
      // Mirror video for front-facing cameras (desktop webcams) so users see
      // themselves in a natural reflection. jsQR decodes raw canvas data and
      // handles mirrored QR codes correctly.
      const track = stream.getVideoTracks()[0]
      const facingMode = track?.getSettings?.()?.facingMode
      const isFront = facingMode === 'user' || facingMode === undefined
      setVideoMirrored(isFront)

      setCameraActive(true)
      rafRef.current = requestAnimationFrame(scanFrame)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Unknown error'
      if (msg.includes('Permission') || msg.includes('NotAllowed')) {
        setCameraError('Camera access denied. Please allow camera access and try again.')
      } else if (msg.includes('NotFound') || msg.includes('NotReadable')) {
        setCameraError('No camera found on this device.')
      } else {
        setCameraError('Could not start camera. Use manual entry below.')
      }
    }
  }

  // ── Handlers ──────────────────────────────────────────────────────────────

  function handleSearch() {
    const cleaned = inputCode.trim().toUpperCase()
    if (!cleaned) return
    setSearchCode(cleaned)
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter') handleSearch()
  }

  function handleClear() {
    setInputCode('')
    setSearchCode('')
    setAccessRequested(false)
    inputRef.current?.focus()
  }

  function handleModelSearch() {
    const q = modelQuery.trim()
    if (!q) return
    router.push(`/clinics/library?q=${encodeURIComponent(q)}`)
  }

  function handleModelChip(m: string) {
    router.push(`/clinics/library?q=${encodeURIComponent(m)}`)
  }

  function handleModelKey(e: React.KeyboardEvent) {
    if (e.key === 'Enter') handleModelSearch()
  }

  function showToast(msg: string) {
    setToast(msg)
    setToastVisible(true)
    setTimeout(() => setToastVisible(false), 2500)
  }

  async function handleRequestAccess() {
    if (!result?._id || requestingAccess) return
    setRequestingAccess(true)
    try {
      await requestAccess({ patientId: result._id, reason: 'Access requested via scan card' })
      setAccessRequested(true)
      showToast('Access request sent')
    } catch {
      showToast('Could not send request — try again')
    } finally {
      setRequestingAccess(false)
    }
  }

  const isLoading = !!(searchCode && result === undefined)
  const notFound  = !!(searchCode && result === null)
  const found     = result !== null && result !== undefined

  // sharing is enabled unless patient has explicitly set it to false
  const sharingEnabled = found ? result.clinicSharingEnabled !== false : true

  const MRI_BADGE: Record<string, { cls: string; label: string }> = {
    safe:        { cls: 'mri-safe',        label: 'MR Safe'        },
    conditional: { cls: 'mri-conditional', label: 'MR Conditional' },
    unsafe:      { cls: 'mri-unsafe',      label: 'MR Unsafe'      },
  }
  const mriKey   = found ? (result.mriStatus ?? (result.verificationStatus === 'active' ? 'conditional' : null)) : null
  const mriBadge = mriKey ? MRI_BADGE[mriKey] : null

  // ── Shared result card (used in both scan + browse tabs) ──────────────────

  function ResultCard({ compact = false }: { compact?: boolean }) {
    if (!found) return null
    return (
      <div className="lookup-result" style={{ marginTop: compact ? 8 : 8 }}>
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
              <button
                className="btn btn-s"
                style={{ flex: 1, justifyContent: 'center' }}
                onClick={handleRequestAccess}
                disabled={requestingAccess}
              >
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
    <div className="m-content scan-page">

      {/* ── Hero ── */}
      <div className="scan-hero">
        <div className="ey scan-ey-center">Look up an implant</div>
        <h1 className="scan-hero-h">
          Scan the card, type the model number, or enter the patient ID.
        </h1>
        <p className="scan-hero-sub">
          Three ways to find an implant record. All pull the same full MRI safety profile.
        </p>
      </div>

      {/* ── Tab bar ── */}
      <div className="scan-tabs" role="tablist">
        {([
          {
            key: 'scan' as Tab, label: 'Scan card',
            icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 10h18M8 15h2"/></svg>,
          },
          {
            key: 'model' as Tab, label: 'By model #',
            icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"><circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/></svg>,
          },
          {
            key: 'browse' as Tab, label: 'Patients',
            icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/></svg>,
          },
        ]).map(t => (
          <button
            key={t.key}
            role="tab"
            aria-selected={activeTab === t.key}
            className={`scan-tab${activeTab === t.key ? ' active' : ''}`}
            onClick={() => setActiveTab(t.key)}
          >
            {t.icon}{t.label}
          </button>
        ))}
      </div>

      {/* ──────────────────────────────────────────────────────────────────────
          Tab 1 — Scan card
      ─────────────────────────────────────────────────────────────────────── */}
      {activeTab === 'scan' && (
        <div className="scan-stage">

          {/* Camera eyebrow */}
          <div className="scan-cam-ey">{cameraActive ? 'Camera active — scanning' : 'Camera'}</div>

          {/* Viewfinder */}
          <div className={`viewfinder${cameraActive ? ' scanning' : ''}`}>
            {/* Hidden video + canvas for QR decoding */}
            <video
              ref={videoRef}
              playsInline
              muted
              style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', borderRadius: 14, display: cameraActive ? 'block' : 'none', transform: videoMirrored ? 'scaleX(-1)' : 'none' }}
            />
            <canvas ref={canvasRef} style={{ display: 'none' }} />

            {cameraActive && <div className="vf-scan-line" />}

            {!cameraActive && (
              <div className="vf-idle">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.3" className="vf-icon" aria-hidden="true">
                  <rect x="3" y="5" width="18" height="14" rx="2"/>
                  <path d="M3 10h18M8 15h2"/>
                </svg>
                <p>Point the camera at a patient&apos;s Implant ID card or QR code</p>
              </div>
            )}
          </div>

          {/* Error */}
          {cameraError && (
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, background: 'color-mix(in srgb,var(--err) 6%,transparent)', border: '1px solid color-mix(in srgb,var(--err) 18%,transparent)', borderRadius: 10, padding: '12px 14px', marginTop: 12, fontFamily: 'var(--ff)', fontSize: 13, color: 'var(--muted)' }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--err)" strokeWidth="1.7" style={{ flexShrink: 0, marginTop: 1 }} aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 8v4M12 16h.01"/></svg>
              {cameraError}
            </div>
          )}

          {/* CTA buttons */}
          <div className="scan-ctas" style={{ marginTop: cameraError ? 12 : 20 }}>
            {cameraActive ? (
              <button className="btn btn-lg" onClick={stopCamera}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="2"/></svg>
                Stop camera
              </button>
            ) : (
              <button className="btn btn-s btn-lg" onClick={startCamera}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden="true"><path d="M23 7 16 12 23 17V7z"/><rect x="1" y="5" width="15" height="14" rx="2"/></svg>
                Start camera
              </button>
            )}
            <button className="btn btn-lg" onClick={() => { setActiveTab('browse'); setTimeout(() => inputRef.current?.focus(), 50) }}>
              No card? Enter manually
            </button>
          </div>
          <p style={{ color: 'var(--muted2)', fontSize: 12.5, fontFamily: 'var(--ff)', textAlign: 'center', lineHeight: 1.6 }}>
            Works with Apple Wallet passes, physical ID cards, and QR codes.
          </p>

          {/* Divider */}
          <div className="scan-or" style={{ marginTop: 28 }}>or enter the Implant ID code</div>

          {/* IID code input */}
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
            <div className="lookup-hint">Accepts the full IID-XXXXXXXX format. Not case-sensitive.</div>
          </div>

          {/* Result */}
          {isLoading && (
            <div style={{ color: 'var(--muted)', fontFamily: 'var(--ff)', fontSize: 14, padding: '10px 0' }}>
              Looking up record…
            </div>
          )}
          {notFound && (
            <div style={{
              display: 'flex', alignItems: 'flex-start', gap: 14,
              background: 'color-mix(in srgb,var(--err) 6%,transparent)',
              border: '1px solid color-mix(in srgb,var(--err) 18%,transparent)',
              borderRadius: 12, padding: '14px 18px', marginTop: 4,
            }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--err)" strokeWidth="1.7" style={{ flexShrink: 0, marginTop: 1 }} aria-hidden="true">
                <circle cx="12" cy="12" r="9"/><path d="M12 8v4M12 16h.01"/>
              </svg>
              <div>
                <div style={{ fontFamily: 'var(--ff)', fontSize: 14, fontWeight: 600, color: 'var(--err)', marginBottom: 3 }}>No record found</div>
                <div style={{ fontSize: 13.5, color: 'var(--muted)' }}>
                  No patient found for code <strong style={{ fontFamily: 'SF Mono,Monaco,monospace' }}>{searchCode}</strong>.
                </div>
              </div>
            </div>
          )}
          {found && <ResultCard />}
        </div>
      )}

      {/* ──────────────────────────────────────────────────────────────────────
          Tab 2 — By model #
      ─────────────────────────────────────────────────────────────────────── */}
      {activeTab === 'model' && (
        <div className="ms-card">
          <div style={{ fontFamily: 'var(--ff)', fontSize: 16, fontWeight: 500, marginBottom: 5 }}>Search by model number</div>
          <div style={{ color: 'var(--muted)', fontSize: 13.5, lineHeight: 1.5, marginBottom: 22 }}>
            Enter the model number printed on the implant unit or its packaging to pull the full MRI safety profile.
          </div>
          <div className="ms-input-wrap">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/>
            </svg>
            <input
              type="text"
              placeholder="Enter model number (e.g. W3DR01)"
              value={modelQuery}
              onChange={e => setModelQuery(e.target.value)}
              onKeyDown={handleModelKey}
              autoFocus
              aria-label="Model number search"
            />
            <button className="btn btn-s" onClick={handleModelSearch} disabled={!modelQuery.trim()} style={{ padding: '7px 16px', flexShrink: 0 }}>
              Search
            </button>
          </div>
          <p className="ms-hint">On mobile? Use the camera to scan the number printed on the implant unit.</p>
          <div className="ms-chips">
            {MODEL_CHIPS.map(m => (
              <button key={m} type="button" className="ms-chip" onClick={() => handleModelChip(m)}>
                {m}
              </button>
            ))}
          </div>
          <div style={{ marginTop: 24, paddingTop: 20, borderTop: '1px solid var(--border)' }}>
            <a href="/clinics/library" className="btn" style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 8 }}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true">
                <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20M4 19.5A2.5 2.5 0 0 0 6.5 22H20V2H6.5A2.5 2.5 0 0 0 4 4.5v15z"/>
              </svg>
              Browse full implant library
            </a>
          </div>
        </div>
      )}

      {/* ──────────────────────────────────────────────────────────────────────
          Tab 3 — Browse patients / manual entry
      ─────────────────────────────────────────────────────────────────────── */}
      {activeTab === 'browse' && (
        <div className="ms-card">
          <div style={{ fontFamily: 'var(--ff)', fontSize: 16, fontWeight: 500, marginBottom: 5 }}>Look up a patient</div>
          <div style={{ color: 'var(--muted)', fontSize: 13.5, lineHeight: 1.5, marginBottom: 22 }}>
            Enter the patient&apos;s Implant ID code from their card, email, or Apple Wallet pass — or browse all registered patients.
          </div>

          <div className="lookup-input-row">
            <input
              ref={inputRef}
              type="text"
              className="input lookup-input"
              placeholder="e.g. IID-SMIJO2311XK"
              value={inputCode}
              onChange={e => setInputCode(e.target.value)}
              onKeyDown={handleKeyDown}
              autoFocus
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
          <div className="lookup-hint" style={{ marginBottom: 20 }}>Not case-sensitive. Accepts the full IID-XXXXXXXX format.</div>

          {isLoading && <div style={{ color: 'var(--muted)', fontFamily: 'var(--ff)', fontSize: 14, padding: '8px 0' }}>Looking up record…</div>}
          {notFound && (
            <div style={{
              display: 'flex', gap: 12, alignItems: 'flex-start',
              background: 'color-mix(in srgb,var(--err) 6%,transparent)',
              border: '1px solid color-mix(in srgb,var(--err) 18%,transparent)',
              borderRadius: 12, padding: '14px 18px', marginBottom: 16,
            }}>
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
          {found && <ResultCard compact />}

          <div style={{ paddingTop: 20, borderTop: '1px solid var(--border)', display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: found ? 0 : 0 }}>
            <a href="/clinics/all-patients" className="btn" style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 8 }}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true">
                <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/>
                <path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/>
              </svg>
              Browse all patients
            </a>
            <a href="/clinics/add-patient" className="btn" style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 8 }}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true">
                <circle cx="9" cy="7" r="4"/><path d="M3 21v-2a4 4 0 0 1 4-4h4M19 8v6M16 11h6"/>
              </svg>
              Add new patient
            </a>
          </div>
        </div>
      )}

      {/* Toast */}
      <div className={`scan-toast${toastVisible ? ' show' : ''}`} role="status" aria-live="polite">
        {toast}
      </div>
    </div>
  )
}
