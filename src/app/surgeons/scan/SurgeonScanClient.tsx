'use client'
import { useState, useEffect, useRef } from 'react'
import { useQuery, useMutation }        from 'convex/react'
import { useSearchParams }              from 'next/navigation'
import { api as apiBase }              from '../../../../convex/_generated/api'
import { tint } from '@/lib/tint'
const api = apiBase as any

// ── MRI badge colours ──────────────────────────────────────────────────────────

const MRI_META: Record<string, { label: string; color: string; bg: string }> = {
  safe:        { label: 'MR Safe',        color: 'var(--ok)',    bg: 'rgba(var(--ok-rgb),0.10)'   },
  conditional: { label: 'MR Conditional', color: '#b45309',      bg: 'rgba(245,158,11,0.12)'     },
  unsafe:      { label: 'MR Unsafe',      color: 'var(--err)',   bg: 'rgba(var(--err-rgb),0.10)'  },
  unknown:     { label: 'Unknown',        color: 'var(--muted)', bg: 'rgba(var(--muted-rgb),0.10)' },
}

// ── Parameter row helper ───────────────────────────────────────────────────────

function ParamRow({ label, value }: { label: string; value: string | undefined | null }) {
  if (!value) return null
  return (
    <div style={{ display: 'contents' }}>
      <div style={{ color: 'var(--muted)', fontSize: 12.5, fontFamily: 'var(--ff)', padding: '4px 0' }}>{label}</div>
      <div style={{ color: 'var(--text)',  fontSize: 12.5, fontFamily: 'var(--ff)', padding: '4px 0', fontWeight: 500 }}>{value}</div>
    </div>
  )
}

// ── Main component ─────────────────────────────────────────────────────────────

export default function SurgeonScanClient() {
  const searchParams  = useSearchParams()
  const [inputCode,   setInputCode]   = useState(searchParams?.get('code') ?? '')
  const [searchCode,  setSearchCode]  = useState(searchParams?.get('code') ?? '')
  const [expandedDeviceId, setExpandedDeviceId] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // ── Queries & mutations ───────────────────────────────────────────────────────

  const result        = useQuery(api.patients.getPatientByCode, searchCode ? { code: searchCode } : 'skip')
  const deviceLinks   = useQuery(
    api.patients.getPatientDeviceLinks,
    result?._id ? { patientId: result._id } : 'skip'
  )
  const deviceDetail  = useQuery(
    api.devices.getDeviceById,
    expandedDeviceId ? { id: expandedDeviceId } : 'skip'
  )
  const recordLookup  = useMutation(api.patients.recordPatientLookup)

  // ── Record lookup audit when result first appears ─────────────────────────────

  useEffect(() => {
    if (result && result._id && searchCode) {
      recordLookup({ patientId: result._id, clinicName: undefined }).catch(() => {})
    }
  }, [result?._id]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Handlers ──────────────────────────────────────────────────────────────────

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

  // ── Derived state ─────────────────────────────────────────────────────────────

  const isLoading = searchCode && result === undefined
  const notFound  = searchCode && result === null
  const found     = result !== null && result !== undefined
  const mriMeta   = found
    ? (MRI_META[result.verificationStatus === 'active' ? 'conditional' : 'unknown'] ?? MRI_META.unknown)
    : null

  // ── Render ────────────────────────────────────────────────────────────────────

  return (
    <div className="m-content">
      {/* ── Header ── */}
      <div className="m-h" style={{ marginBottom: 24 }}>
        <div>
          <h2>Look up patient</h2>
          <div className="sub">Enter an Implant ID code to retrieve MRI safety information.</div>
        </div>
        <a href="/surgeons/dashboard" className="btn" style={{ textDecoration: 'none' }}>
          &larr; Dashboard
        </a>
      </div>

      {/* ── Tier badge ── */}
      <div style={{
        display: 'inline-flex', alignItems: 'center', gap: 8,
        background: 'rgba(var(--accent-rgb),0.08)',
        border: '1px solid rgba(var(--accent-rgb),0.20)',
        borderRadius: 8, padding: '6px 14px',
        fontFamily: 'var(--ff)', fontSize: 12.5, fontWeight: 500,
        color: 'var(--accent)', marginBottom: 24,
      }}>
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true">
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
        </svg>
        Tier 1 lookup — MRI safety only, no consent required
      </div>

      {/* ── Search ── */}
      <div style={{
        background: 'var(--bg2)',
        border: '1px solid var(--border)',
        borderRadius: 14,
        padding: '24px',
        marginBottom: 24,
        maxWidth: 560,
      }}>
        <label
          htmlFor="patient-code"
          style={{ display: 'block', fontFamily: 'var(--ff)', fontSize: 12.5, fontWeight: 500, color: 'var(--muted)', marginBottom: 8, letterSpacing: '.2px' }}
        >
          Patient Implant ID or scan code
        </label>
        <div style={{ display: 'flex', gap: 10 }}>
          <div style={{ position: 'relative', flex: 1 }}>
            <input
              ref={inputRef}
              id="patient-code"
              type="text"
              className="input"
              placeholder="e.g. IID-SMIJO2311XK"
              value={inputCode}
              onChange={(e) => setInputCode(e.target.value)}
              onKeyDown={handleKeyDown}
              autoComplete="off"
              autoCapitalize="characters"
              spellCheck={false}
              style={{ width: '100%', boxSizing: 'border-box', fontFamily: 'SF Mono,Monaco,monospace', letterSpacing: '.04em' }}
              aria-label="Patient Implant ID code"
            />
            {inputCode && (
              <button
                type="button"
                onClick={handleClear}
                aria-label="Clear"
                style={{
                  position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
                  background: 'none', border: 'none', cursor: 'pointer',
                  color: 'var(--muted2)', padding: 0, lineHeight: 1,
                }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                  <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            )}
          </div>
          <button
            type="button"
            className="btn btn-s"
            onClick={handleSearch}
            disabled={!inputCode.trim()}
            aria-label="Look up patient"
          >
            Look up
          </button>
        </div>
        <p style={{ margin: '8px 0 0', fontSize: 12.5, color: 'var(--muted2)', fontFamily: 'var(--ff)' }}>
          Enter the code from the patient&rsquo;s card, e-mail, or Apple Wallet pass.
        </p>
      </div>

      {/* ── Loading ── */}
      {isLoading && (
        <div style={{ color: 'var(--muted)', fontSize: 14, fontFamily: 'var(--ff)', padding: '8px 0' }}>
          Looking up record&hellip;
        </div>
      )}

      {/* ── Not found ── */}
      {notFound && (
        <div style={{
          background: 'rgba(var(--err-rgb),0.06)',
          border: '1px solid rgba(var(--err-rgb),0.18)',
          borderRadius: 12,
          padding: '20px 24px',
          maxWidth: 560,
          display: 'flex', alignItems: 'flex-start', gap: 14,
        }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--err)" strokeWidth="1.7" style={{ flexShrink: 0, marginTop: 1 }} aria-hidden="true">
            <circle cx="12" cy="12" r="9"/><path d="M12 8v4M12 16h.01"/>
          </svg>
          <div>
            <div style={{ fontFamily: 'var(--ff)', fontSize: 14, fontWeight: 600, color: 'var(--err)', marginBottom: 4 }}>
              No record found
            </div>
            <div style={{ fontSize: 13.5, color: 'var(--muted)' }}>
              No patient was found with code <strong style={{ fontFamily: 'SF Mono,Monaco,monospace' }}>{searchCode}</strong>.
              Check the code and try again.
            </div>
          </div>
        </div>
      )}

      {/* ── Result card ── */}
      {found && mriMeta && (
        <div style={{
          background: 'var(--bg2)',
          border: '1px solid var(--border)',
          borderRadius: 16,
          padding: '28px',
          maxWidth: 560,
        }}>
          {/* Found badge */}
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            background: 'rgba(var(--ok-rgb),0.10)',
            border: '1px solid rgba(var(--ok-rgb),0.22)',
            borderRadius: 8, padding: '5px 12px',
            fontFamily: 'var(--ff)', fontSize: 12.5, fontWeight: 600,
            color: 'var(--ok)', marginBottom: 20,
          }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden="true">
              <path d="m9 12 2 2 4-4"/><circle cx="12" cy="12" r="9"/>
            </svg>
            Patient record found
          </div>

          {/* MRI status */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: 10,
            background: mriMeta.bg,
            border: `1px solid ${tint(mriMeta.color, 22)}`,
            borderRadius: 10, padding: '10px 16px',
            marginBottom: 24,
          }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={mriMeta.color} strokeWidth="1.7" aria-hidden="true">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
            </svg>
            <span style={{ fontFamily: 'var(--ff)', fontSize: 14, fontWeight: 700, color: mriMeta.color }}>
              {mriMeta.label}
            </span>
          </div>

          {/* Patient fields */}
          <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '10px 24px', marginBottom: 24 }}>
            <div style={{ color: 'var(--muted)', fontSize: 12.5, fontFamily: 'var(--ff)' }}>Implant ID</div>
            <div style={{ fontFamily: 'SF Mono,Monaco,monospace', fontSize: 13, fontWeight: 600, color: 'var(--accent)' }}>
              {result.implantIdCode}
            </div>

            <div style={{ color: 'var(--muted)', fontSize: 12.5, fontFamily: 'var(--ff)' }}>Name</div>
            <div style={{ fontFamily: 'var(--ff)', fontSize: 13.5, fontWeight: 500, color: 'var(--text)' }}>
              {result.firstName} {result.lastName}
            </div>

            {result.selfReportedDevice && (
              <>
                <div style={{ color: 'var(--muted)', fontSize: 12.5, fontFamily: 'var(--ff)' }}>Device</div>
                <div style={{ fontSize: 13.5, color: 'var(--text)' }}>{result.selfReportedDevice}</div>
              </>
            )}

            {result.selfReportedManufacturer && (
              <>
                <div style={{ color: 'var(--muted)', fontSize: 12.5, fontFamily: 'var(--ff)' }}>Manufacturer</div>
                <div style={{ fontSize: 13.5, color: 'var(--text)' }}>{result.selfReportedManufacturer}</div>
              </>
            )}

            {result.selfReportedModelNumber && (
              <>
                <div style={{ color: 'var(--muted)', fontSize: 12.5, fontFamily: 'var(--ff)' }}>Model</div>
                <div style={{ fontSize: 13.5, color: 'var(--text)' }}>{result.selfReportedModelNumber}</div>
              </>
            )}

            <div style={{ color: 'var(--muted)', fontSize: 12.5, fontFamily: 'var(--ff)' }}>Record status</div>
            <div>
              <span style={{
                fontFamily: 'var(--ff)', fontSize: 11.5, fontWeight: 600,
                padding: '2px 8px', borderRadius: 5,
                background: result.verificationStatus === 'active'
                  ? 'rgba(var(--ok-rgb),0.10)'
                  : 'rgba(245,158,11,0.10)',
                color: result.verificationStatus === 'active' ? 'var(--ok)' : '#92400e',
                border: result.verificationStatus === 'active'
                  ? '1px solid rgba(var(--ok-rgb),0.25)'
                  : '1px solid rgba(245,158,11,0.25)',
              }}>
                {result.verificationStatus === 'active' ? 'Verified' : 'Pending verification'}
              </span>
            </div>
          </div>

          {/* Verified device records with expandable parameters */}
          {deviceLinks && deviceLinks.length > 0 && (
            <div style={{ marginBottom: 24 }}>
              <div style={{ fontFamily: 'var(--ff)', fontSize: 12, fontWeight: 600, color: 'var(--muted)', letterSpacing: '.3px', textTransform: 'uppercase', marginBottom: 10 }}>
                Verified devices
              </div>
              {deviceLinks.map((d: any) => {
                const isExpanded = expandedDeviceId === d.deviceId
                return (
                  <div
                    key={d._id}
                    style={{ border: '1px solid var(--border)', borderRadius: 10, overflow: 'hidden', marginBottom: 8 }}
                  >
                    {/* Device header row */}
                    <div style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      padding: '12px 16px',
                      background: 'var(--bg)',
                    }}>
                      <div>
                        <div style={{ fontFamily: 'var(--ff)', fontSize: 13.5, fontWeight: 500, color: 'var(--text)' }}>
                          {d.deviceName ?? d.deviceType ?? 'Device'}
                        </div>
                        {d.serialNumber && (
                          <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>
                            S/N: {d.serialNumber}
                          </div>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => setExpandedDeviceId(isExpanded ? null : d.deviceId)}
                        aria-expanded={isExpanded}
                        style={{
                          background: 'transparent',
                          border: '1px solid var(--border)',
                          borderRadius: 6,
                          cursor: 'pointer',
                          color: 'var(--muted)',
                          fontFamily: 'var(--ff)',
                          fontSize: 11.5,
                          fontWeight: 500,
                          padding: '4px 10px',
                          transition: 'all .12s',
                        }}
                      >
                        {isExpanded ? 'Hide parameters' : 'View parameters'}
                      </button>
                    </div>

                    {/* Expandable parameters panel */}
                    {isExpanded && (
                      <div style={{ borderTop: '1px solid var(--border)', padding: '16px', background: 'var(--bg2)' }}>
                        {deviceDetail === undefined ? (
                          <div style={{ color: 'var(--muted)', fontSize: 13, fontFamily: 'var(--ff)' }}>Loading parameters&hellip;</div>
                        ) : deviceDetail === null ? (
                          <div style={{ color: 'var(--muted)', fontSize: 13, fontFamily: 'var(--ff)' }}>Parameters not available.</div>
                        ) : (
                          <>
                            {deviceDetail.mriStatus === 'conditional' && (
                              <div style={{
                                display: 'flex', alignItems: 'flex-start', gap: 10,
                                background: 'rgba(245,158,11,0.08)',
                                border: '1px solid rgba(245,158,11,0.22)',
                                borderRadius: 8, padding: '10px 14px', marginBottom: 14,
                              }}>
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#b45309" strokeWidth="1.7" style={{ flexShrink: 0, marginTop: 1 }} aria-hidden="true">
                                  <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0zM12 9v4M12 17h.01"/>
                                </svg>
                                <span style={{ fontFamily: 'var(--ff)', fontSize: 12.5, color: '#92400e', fontWeight: 500 }}>
                                  MR Conditional — all scan conditions below MUST be met before scanning.
                                </span>
                              </div>
                            )}

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px 20px', marginBottom: 14 }}>
                              <ParamRow label="Field strengths"  value={deviceDetail.fieldStrengths} />
                              <ParamRow label="SAR limit"        value={deviceDetail.sarLimit} />
                              <ParamRow label="B1+rms limit"     value={deviceDetail.b1RmsLimit} />
                              <ParamRow label="Slew rate limit"  value={deviceDetail.slewRateLimit} />
                              <ParamRow label="Gradient limit"   value={deviceDetail.gradientLimit} />
                              <ParamRow label="Max scan time"    value={deviceDetail.maxScanTime} />
                            </div>

                            {deviceDetail.contraindications && (
                              <div style={{ marginBottom: 12 }}>
                                <div style={{ fontFamily: 'var(--ff)', fontSize: 12, fontWeight: 600, color: 'var(--muted)', marginBottom: 4 }}>
                                  Contraindications
                                </div>
                                <div style={{ fontSize: 12.5, color: 'var(--text)', lineHeight: 1.5 }}>
                                  {deviceDetail.contraindications}
                                </div>
                              </div>
                            )}

                            <div style={{
                              display: 'flex', alignItems: 'center', gap: 8,
                              background: 'rgba(var(--muted-rgb),0.06)',
                              borderRadius: 8, padding: '8px 12px',
                            }}>
                              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--muted)" strokeWidth="1.7" aria-hidden="true">
                                <circle cx="12" cy="12" r="9"/><path d="M12 8v4M12 16h.01"/>
                              </svg>
                              <span style={{ fontFamily: 'var(--ff)', fontSize: 11.5, color: 'var(--muted)' }}>
                                Always consult the device IFU — these parameters are for reference only.
                              </span>
                            </div>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}

          {/* Tier 1 note */}
          <div style={{
            display: 'flex', alignItems: 'flex-start', gap: 10,
            background: 'rgba(var(--muted-rgb),0.05)',
            borderRadius: 10, padding: '12px 16px',
          }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--muted)" strokeWidth="1.7" style={{ flexShrink: 0, marginTop: 1 }} aria-hidden="true">
              <circle cx="12" cy="12" r="9"/><path d="M12 8v4M12 16h.01"/>
            </svg>
            <span style={{ fontFamily: 'var(--ff)', fontSize: 12.5, color: 'var(--muted)', lineHeight: 1.5 }}>
              Tier 1 lookup — MRI safety information only. To view the full patient record, request access.
            </span>
          </div>
        </div>
      )}
    </div>
  )
}
