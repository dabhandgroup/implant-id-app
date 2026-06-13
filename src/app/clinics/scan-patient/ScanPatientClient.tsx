'use client'

import { useState, useRef, useEffect } from 'react'
import { useQuery, useMutation }         from 'convex/react'
import { useSearchParams, useRouter }    from 'next/navigation'
import { api as apiBase }               from '../../../../convex/_generated/api'
const api = apiBase as any

type Tab = 'scan' | 'model' | 'browse'

const MODEL_CHIPS = ['Azure XT DR', 'Micra AV', 'Assurity MRI', 'Accolade 2', 'NucleusCI24RE']

export default function ScanPatientClient() {
  const searchParams = useSearchParams()
  const router       = useRouter()

  // ── All hooks at top ──────────────────────────────────────────────────────
  const [activeTab,    setActiveTab]    = useState<Tab>('scan')
  const [inputCode,    setInputCode]    = useState(searchParams?.get('code') ?? '')
  const [searchCode,   setSearchCode]   = useState(searchParams?.get('code') ?? '')
  const [modelQuery,   setModelQuery]   = useState('')
  const [toast,        setToast]        = useState('')
  const [toastVisible, setToastVisible] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const result       = useQuery(api.patients.getPatientByCode, searchCode ? { code: searchCode } : 'skip')
  const recordLookup = useMutation(api.patients.recordPatientLookup)

  useEffect(() => {
    if (result?._id && searchCode) {
      recordLookup({ patientId: result._id, clinicName: undefined }).catch(() => {})
    }
  }, [result?._id]) // eslint-disable-line react-hooks/exhaustive-deps

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

  const isLoading = !!(searchCode && result === undefined)
  const notFound  = !!(searchCode && result === null)
  const found     = result !== null && result !== undefined

  const MRI_BADGE: Record<string, { cls: string; label: string }> = {
    safe:        { cls: 'mri-safe',        label: 'MR Safe'        },
    conditional: { cls: 'mri-conditional', label: 'MR Conditional' },
    unsafe:      { cls: 'mri-unsafe',      label: 'MR Unsafe'      },
  }
  const mriKey   = found ? (result.mriStatus ?? (result.verificationStatus === 'active' ? 'conditional' : null)) : null
  const mriBadge = mriKey ? MRI_BADGE[mriKey] : null

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
          <div className="scan-cam-ey">Camera active</div>

          {/* Viewfinder */}
          <div className="viewfinder scanning">
            <div className="vf-scan-line" />
            <div className="vf-scanning">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" style={{ width: 52, height: 52, color: 'color-mix(in srgb,var(--accent) 45%,white)', marginBottom: 10 }} aria-hidden="true">
                <rect x="3" y="5" width="18" height="14" rx="2"/>
                <path d="M3 10h18M8 15h2"/>
              </svg>
              <p>Align the patient card inside the frame</p>
            </div>
          </div>

          {/* CTA buttons */}
          <div className="scan-ctas">
            <a href="/clinics/patient-view?code=IID-DEMO0101XK" className="btn btn-s btn-lg">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden="true"><path d="m9 12 2 2 4-4"/><circle cx="12" cy="12" r="9"/></svg>
              Simulate successful scan
            </a>
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

          {found && (
            <div className="lookup-result" style={{ marginTop: 8 }}>
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
                {result.selfReportedDevice && (
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

          {found && (
            <div className="lookup-result" style={{ marginBottom: 16 }}>
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
              </div>
              <div className="result-actions">
                <a href={`/clinics/patient-view?code=${result.implantIdCode}`} className="btn btn-s" style={{ textDecoration: 'none', textAlign: 'center' }}>
                  Full record →
                </a>
                <button className="btn" onClick={() => { navigator.clipboard?.writeText(result.implantIdCode); showToast('Copied') }}>
                  Copy ID
                </button>
              </div>
            </div>
          )}

          <div style={{ paddingTop: 20, borderTop: '1px solid var(--border)', display: 'flex', gap: 10, flexWrap: 'wrap' }}>
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
