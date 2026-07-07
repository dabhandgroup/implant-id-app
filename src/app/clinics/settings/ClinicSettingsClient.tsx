'use client'

import { useState, useEffect, useRef, useMemo } from 'react'
import { useQuery, useMutation } from 'convex/react'
import { useClerk, useAuth } from '@clerk/nextjs'
import { api } from '../../../../convex/_generated/api'
import { PlanPicker } from '@/components/ui/BillingGate'
import { CustomSelect } from '@/components/ui/CustomSelect'

type Tab = 'info' | 'notifications' | 'security' | 'billing'

interface ScDoc { _id: string; manufacturer: string; model: string; fieldStrength: string; scannerType: string }
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const apiAny = api as any
const FIELD_STRENGTHS = ['0.5T', '1.0T', '1.5T', '3T', '7T', 'Other']
const SCANNER_TYPES   = ['Closed-bore', 'Open-bore', 'Standing / upright', 'Other']

function ScannerManager() {
  const myClinicScanners  = useQuery(apiAny.scanners.getMyClinicScanners) as ScDoc[] | undefined
  const allScanners       = useQuery(apiAny.scanners.listApprovedScanners) as ScDoc[] | undefined
  const addToClinic       = useMutation(apiAny.scanners.addScannerToClinic)
  const removeFromClinic  = useMutation(apiAny.scanners.removeScannerFromClinic)
  const submitNew         = useMutation(apiAny.scanners.submitScanner)

  const [search,        setSearch]        = useState('')
  const [open,          setOpen]          = useState(false)
  const [addingId,      setAddingId]      = useState<string | null>(null)
  const [removingId,    setRemovingId]    = useState<string | null>(null)
  const [showSubmit,    setShowSubmit]    = useState(false)
  const [manufacturer,  setManufacturer]  = useState('')
  const [model,         setModel]         = useState('')
  const [fieldStrength, setFieldStrength] = useState('')
  const [scannerType,   setScannerType]   = useState('')
  const [submitLoading, setSubmitLoading] = useState(false)
  const [submitError,   setSubmitError]   = useState('')
  const [submitDone,    setSubmitDone]    = useState(false)
  const searchRef = useRef<HTMLDivElement>(null)

  const results = useMemo(() => {
    if (!allScanners || !search.trim()) return []
    const q = search.toLowerCase()
    const linked = new Set((myClinicScanners ?? []).map(s => s._id))
    return allScanners
      .filter(s => !linked.has(s._id))
      .filter(s =>
        s.manufacturer.toLowerCase().includes(q) ||
        s.model.toLowerCase().includes(q) ||
        s.fieldStrength.toLowerCase().includes(q)
      )
      .slice(0, 8)
  }, [allScanners, search, myClinicScanners])

  useEffect(() => {
    function h(e: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [])

  async function handleAdd(s: ScDoc) {
    setAddingId(s._id)
    try { await addToClinic({ scannerId: s._id as never }) }
    finally { setAddingId(null); setSearch(''); setOpen(false) }
  }

  async function handleRemove(id: string) {
    setRemovingId(id)
    try { await removeFromClinic({ scannerId: id as never }) }
    finally { setRemovingId(null) }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!manufacturer.trim()) return setSubmitError('Enter the manufacturer name')
    if (!model.trim())        return setSubmitError('Enter the model name')
    if (!fieldStrength)       return setSubmitError('Select a field strength')
    if (!scannerType)         return setSubmitError('Select a scanner type')
    setSubmitError(''); setSubmitLoading(true)
    try {
      await submitNew({ manufacturer: manufacturer.trim(), model: model.trim(), fieldStrength, scannerType })
      setSubmitDone(true)
      setManufacturer(''); setModel(''); setFieldStrength(''); setScannerType('')
    } catch (e: unknown) {
      setSubmitError(e instanceof Error ? e.message : 'Submission failed — please try again')
    } finally {
      setSubmitLoading(false)
    }
  }

  return (
    <div className="card" style={{ marginBottom: 20 }}>
      <div className="ey" style={{ marginBottom: 6 }}>Site scanners</div>
      <p style={{ fontSize: 13.5, color: 'var(--muted)', marginBottom: 16, lineHeight: 1.6 }}>
        Link the MRI scanner(s) at your site. This helps match patients to compatible equipment
        and populates the scanner field on compatibility checks.
      </p>

      {/* Linked scanners */}
      {myClinicScanners === undefined && (
        <div style={{ fontSize: 13, color: 'var(--muted2)', marginBottom: 16 }}>Loading…</div>
      )}
      {myClinicScanners?.length === 0 && (
        <div style={{ fontSize: 13, color: 'var(--muted2)', marginBottom: 16 }}>
          No scanners linked yet — search below to add yours.
        </div>
      )}
      {(myClinicScanners ?? []).length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
          {(myClinicScanners ?? []).map(s => (
            <span key={s._id} style={{
              display: 'inline-flex', alignItems: 'center', gap: 7,
              background: 'rgba(var(--accent-rgb),0.10)', border: '1px solid rgba(var(--accent-rgb),0.25)',
              borderRadius: 8, padding: '5px 10px', fontFamily: 'var(--ff)', fontSize: 13, color: 'var(--accent-deep)',
            }}>
              <span style={{ fontWeight: 600 }}>{s.fieldStrength}</span>
              {s.manufacturer} {s.model}
              <button
                type="button"
                onClick={() => handleRemove(s._id)}
                disabled={removingId === s._id}
                aria-label={`Remove ${s.manufacturer} ${s.model}`}
                style={{
                  background: 'transparent', border: 'none', cursor: 'pointer',
                  color: 'var(--accent)', padding: 0, lineHeight: 1, display: 'flex',
                  opacity: removingId === s._id ? 0.5 : 1,
                }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            </span>
          ))}
        </div>
      )}

      {/* Search to add */}
      <div ref={searchRef} style={{ position: 'relative', marginBottom: 14 }}>
        <input
          className="input"
          placeholder="Search scanner to add (e.g. Siemens 3T, Philips Ingenia…)"
          value={search}
          onChange={e => { setSearch(e.target.value); setOpen(true) }}
          onFocus={() => setOpen(true)}
          aria-label="Search and add MRI scanner"
          aria-autocomplete="list"
        />
        {open && results.length > 0 && (
          <div style={{
            position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0, zIndex: 99,
            background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 10,
            boxShadow: '0 8px 24px rgba(0,0,0,.12)', maxHeight: 240, overflowY: 'auto',
          }}>
            {results.map(s => (
              <button
                key={s._id}
                type="button"
                onMouseDown={e => { e.preventDefault(); void handleAdd(s) }}
                disabled={addingId === s._id}
                style={{
                  display: 'flex', alignItems: 'center', gap: 10, width: '100%', textAlign: 'left',
                  padding: '10px 14px', background: 'transparent', border: 'none', cursor: 'pointer',
                  borderBottom: '1px solid var(--border)', fontFamily: 'var(--ff)',
                  opacity: addingId === s._id ? 0.6 : 1,
                }}
              >
                <span style={{ background: 'rgba(var(--accent-rgb),0.10)', color: 'var(--accent-deep)', borderRadius: 5, padding: '2px 7px', fontSize: 11, fontWeight: 700 }}>{s.fieldStrength}</span>
                <span style={{ fontWeight: 600, fontSize: 13.5, color: 'var(--text)' }}>{s.manufacturer} {s.model}</span>
                <span style={{ fontSize: 12, color: 'var(--muted)', marginLeft: 'auto' }}>{s.scannerType}</span>
                <span style={{ fontSize: 12, color: 'var(--accent)', fontWeight: 600, flexShrink: 0 }}>
                  {addingId === s._id ? 'Adding…' : '+ Add'}
                </span>
              </button>
            ))}
          </div>
        )}
        {open && search.trim() && results.length === 0 && allScanners !== undefined && (
          <div style={{
            position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0, zIndex: 99,
            background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 10,
            padding: '14px 16px', fontFamily: 'var(--ff)', fontSize: 13.5, color: 'var(--muted)',
          }}>
            No scanner found.{' '}
            <button type="button" className="link-btn" style={{ fontSize: 13.5 }}
              onClick={() => { setOpen(false); setShowSubmit(true) }}>
              Submit yours for approval →
            </button>
          </div>
        )}
      </div>

      {/* Submit new scanner */}
      {!showSubmit && !submitDone && (
        <button type="button" className="btn" style={{ fontSize: 13 }}
          onClick={() => setShowSubmit(true)}>
          + Submit new scanner for approval
        </button>
      )}

      {submitDone && (
        <div style={{ fontSize: 13.5, color: 'var(--ok)', fontFamily: 'var(--ff)' }}>
          ✓ Scanner submitted — we&apos;ll notify you once approved.
          <button type="button" className="link-btn" style={{ marginLeft: 12, fontSize: 13 }}
            onClick={() => setSubmitDone(false)}>
            Submit another
          </button>
        </div>
      )}

      {showSubmit && !submitDone && (
        <div style={{
          marginTop: 4, padding: '18px 20px',
          background: 'rgba(var(--accent-rgb),0.05)', border: '1px solid rgba(var(--accent-rgb),0.18)',
          borderRadius: 12,
        }}>
          <div style={{ fontFamily: 'var(--ff)', fontSize: 14, fontWeight: 600, marginBottom: 14 }}>
            Submit scanner for approval
          </div>
          <form onSubmit={e => void handleSubmit(e)} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div className="field">
                <label>Manufacturer <span style={{ color: 'var(--err)', marginLeft: 3 }}>*</span></label>
                <input className="input" placeholder="e.g. Siemens" value={manufacturer}
                  onChange={e => setManufacturer(e.target.value)} />
              </div>
              <div className="field">
                <label>Model <span style={{ color: 'var(--err)', marginLeft: 3 }}>*</span></label>
                <input className="input" placeholder="e.g. MAGNETOM Vida" value={model}
                  onChange={e => setModel(e.target.value)} />
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <CustomSelect label="Field strength" required value={fieldStrength} onChange={setFieldStrength}
                options={FIELD_STRENGTHS} placeholder="Select" />
              <CustomSelect label="Scanner type" required value={scannerType} onChange={setScannerType}
                options={SCANNER_TYPES} placeholder="Select" />
            </div>
            {submitError && (
              <div style={{ padding: '8px 12px', background: 'rgba(var(--err-rgb),0.08)', border: '1px solid rgba(var(--err-rgb),0.20)', borderRadius: 8, fontSize: 13, color: 'var(--err)' }}>
                {submitError}
              </div>
            )}
            <div style={{ display: 'flex', gap: 10 }}>
              <button type="submit" className="btn btn-s" style={{ fontSize: 13 }} disabled={submitLoading}>
                {submitLoading ? 'Submitting…' : 'Submit for approval'}
              </button>
              <button type="button" className="btn" style={{ fontSize: 13 }}
                onClick={() => { setShowSubmit(false); setSubmitError('') }}>
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  )
}

const NOTIF_KEY = 'clinic-notif-prefs'

const CAPABILITY_OPTIONS = [
  { value: 'Pacemaker / ICD',  label: 'Pacemaker / ICD' },
  { value: 'Cochlear',         label: 'Cochlear' },
  { value: 'DBS / Neurostim',  label: 'DBS / Neurostim' },
  { value: 'Spinal Cord',      label: 'Spinal Cord' },
  { value: 'MRI Centre',       label: 'MRI Centre' },
  { value: 'Orthopaedic',      label: 'Orthopaedic' },
]

function loadNotifPrefs() {
  if (typeof window === 'undefined') return null
  try { return JSON.parse(localStorage.getItem(NOTIF_KEY) ?? 'null') } catch { return null }
}

export default function ClinicSettingsClient() {
  // ── All hooks at top ──────────────────────────────────────────────────────
  const clerk            = useClerk()
  const { getToken }        = useAuth()
  const clinic              = useQuery(api.clinics.getMyClinic)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const billing             = useQuery((api.clinics as any).getBillingStatus)
  const updateVisibility    = useMutation(api.clinics.updateClinicVisibility)
  const updateInfo          = useMutation(api.clinics.updateClinicInfo)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const updateCapabilities  = useMutation((api.clinics as any).updateClinicCapabilities)
  const genUploadUrl        = useMutation(api.clinics.generateUploadUrl)
  const saveLogoUrl         = useMutation(api.clinics.saveClinicLogoUrl)

  const [tab,            setTab]            = useState<Tab>('info')
  const [showToPatients, setShowToPatients] = useState<boolean | null>(null)
  const [saving,         setSaving]         = useState(false)
  const [saved,          setSaved]          = useState(false)
  const [infoSaved,      setInfoSaved]      = useState(false)
  const [infoSaving,     setInfoSaving]     = useState(false)
  const [infoError,      setInfoError]      = useState('')
  const [notifSaved,     setNotifSaved]     = useState(false)
  const [logoUploading,  setLogoUploading]  = useState(false)
  const [logoErr,        setLogoErr]        = useState('')

  // Controlled info fields
  const [infoName,    setInfoName]    = useState('')
  const [infoEmail,   setInfoEmail]   = useState('')
  const [infoPhone,   setInfoPhone]   = useState('')
  const [infoAddress, setInfoAddress] = useState('')
  const [infoInit,    setInfoInit]    = useState(false)

  const [caps,       setCaps]       = useState<string[]>([])
  const [capsSaving, setCapsSaving] = useState(false)
  const [capsSaved,  setCapsSaved]  = useState(false)
  const [capsError,  setCapsError]  = useState('')

  const [recalls,    setRecalls]    = useState(true)
  const [expiry,     setExpiry]     = useState(true)
  const [accessResp, setAccessResp] = useState(true)
  const [digest,     setDigest]     = useState(false)

  const logoInputRef = useRef<HTMLInputElement>(null)

  // Billing state
  const [billLoading,   setBillLoading]   = useState<'portal' | null>(null)
  const [billErr,       setBillErr]       = useState('')
  const [showUpgrade,   setShowUpgrade]   = useState(false)

  function openPortal() {
    window.location.href = 'https://buy.stripe.com/eVqdR80wae9xbHSeS293y0s'
  }

  useEffect(() => {
    if (clinic && showToPatients === null) {
      setShowToPatients(clinic.showToPatients !== false)
    }
  }, [clinic, showToPatients])

  // Initialise controlled info fields from Convex once
  useEffect(() => {
    if (clinic && !infoInit) {
      setInfoName(clinic.name ?? '')
      setInfoEmail(clinic.email ?? '')
      setInfoPhone(clinic.phone ?? '')
      setInfoAddress(clinic.address ?? '')
      setCaps(clinic.capabilities ?? [])
      setInfoInit(true)
    }
  }, [clinic, infoInit])

  // Load notification prefs from localStorage on mount
  useEffect(() => {
    const prefs = loadNotifPrefs()
    if (prefs) {
      if (typeof prefs.recalls    === 'boolean') setRecalls(prefs.recalls)
      if (typeof prefs.expiry     === 'boolean') setExpiry(prefs.expiry)
      if (typeof prefs.accessResp === 'boolean') setAccessResp(prefs.accessResp)
      if (typeof prefs.digest     === 'boolean') setDigest(prefs.digest)
    }
  }, [])

  async function handleVisibilityToggle() {
    const newVal = !showToPatients
    setShowToPatients(newVal)
    setSaving(true); setSaved(false)
    try {
      await updateVisibility({ showToPatients: newVal })
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } finally {
      setSaving(false)
    }
  }

  async function handleLogoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setLogoErr('')
    setLogoUploading(true)
    try {
      const uploadUrl = await genUploadUrl()
      const res = await fetch(uploadUrl, { method: 'POST', headers: { 'Content-Type': file.type }, body: file })
      if (!res.ok) throw new Error('Upload failed')
      const { storageId } = await res.json()
      await saveLogoUrl({ storageId })
    } catch (err: unknown) {
      setLogoErr((err as { message?: string })?.message ?? 'Upload failed — please try again.')
    } finally {
      setLogoUploading(false)
      if (logoInputRef.current) logoInputRef.current.value = ''
    }
  }

  async function handleInfoSave() {
    if (!infoName.trim()) { setInfoError('Clinic name is required.'); return }
    setInfoError('')
    setInfoSaving(true)
    try {
      await updateInfo({
        name:    infoName.trim(),
        email:   infoEmail.trim() || undefined,
        phone:   infoPhone.trim() || undefined,
        address: infoAddress.trim(),
      })
      setInfoSaved(true)
      setTimeout(() => setInfoSaved(false), 3000)
    } catch (e: unknown) {
      setInfoError(e instanceof Error ? e.message : 'Save failed.')
    } finally {
      setInfoSaving(false)
    }
  }

  async function handleCapsSave() {
    setCapsError('')
    setCapsSaving(true)
    try {
      await updateCapabilities({ capabilities: caps })
      setCapsSaved(true)
      setTimeout(() => setCapsSaved(false), 3000)
    } catch (e: unknown) {
      setCapsError(e instanceof Error ? e.message : 'Save failed.')
    } finally {
      setCapsSaving(false)
    }
  }

  function handleNotifSave() {
    localStorage.setItem(NOTIF_KEY, JSON.stringify({ recalls, expiry, accessResp, digest }))
    setNotifSaved(true)
    setTimeout(() => setNotifSaved(false), 3000)
  }


  function Toggle({ checked, onChange, disabled }: { checked: boolean; onChange: () => void; disabled?: boolean }) {
    return (
      <input
        type="checkbox"
        className="toggle-chk"
        checked={checked}
        onChange={onChange}
        disabled={disabled}
        aria-label="Toggle"
      />
    )
  }

  return (
    <div className="m-content">
      <div className="m-h" style={{ marginBottom: 22 }}>
        <div>
          <div className="ey">Clinic settings</div>
          <h2 style={{ fontSize: 'clamp(20px,2vw,26px)', letterSpacing: '-.025em', marginTop: 6 }}>
            {clinic?.name ?? 'Your clinic'}
          </h2>
        </div>
      </div>

      {/* Tab bar */}
      <div className="stab-bar">
        {([
          ['info',          'Clinic information'],
          ['notifications', 'Notifications'],
          ['security',      'Security'],
          ['billing',       'Plan & billing'],
        ] as [Tab, string][]).map(([key, label]) => (
          <button
            key={key}
            className={`stab-btn${tab === key ? ' active' : ''}`}
            onClick={() => setTab(key)}
            aria-selected={tab === key}
          >
            {key === 'info' && <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true"><path d="M3 21V8l9-5 9 5v13"/><path d="M9 9h6M9 13h6M9 17h6"/></svg>}
            {key === 'notifications' && <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>}
            {key === 'security' && <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="m9 12 2 2 4-4"/></svg>}
            {key === 'billing' && <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true"><rect x="1" y="4" width="22" height="16" rx="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg>}
            {label}
          </button>
        ))}
      </div>

      {/* ── Clinic information ──────────────────────────────────────────────── */}
      {tab === 'info' && (
        <div>
          <div className="card" style={{ marginBottom: 20 }}>
            <div className="ey" style={{ marginBottom: 14 }}>Clinic logo</div>
            <input
              ref={logoInputRef}
              type="file"
              accept="image/jpeg,image/png,image/svg+xml,image/webp"
              style={{ display: 'none' }}
              onChange={handleLogoUpload}
            />
            <div style={{ display: 'flex', alignItems: 'center', gap: 20, flexWrap: 'wrap' }}>
              <div
                onClick={() => logoInputRef.current?.click()}
                title="Click to upload logo"
                style={{
                  width: 80, height: 80, borderRadius: 14, flexShrink: 0, cursor: 'pointer',
                  background: 'rgba(var(--accent-rgb),0.10)',
                  border: '1.5px dashed rgba(var(--accent-rgb),0.30)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden',
                }}
              >
                {clinic?.logoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={clinic.logoUrl} alt={clinic.name ?? 'Clinic logo'} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                ) : (
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ width: 30, height: 30, color: 'var(--muted2)' }} aria-hidden="true">
                    <rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/>
                  </svg>
                )}
              </div>
              <div style={{ flex: 1, minWidth: 180 }}>
                <div style={{ fontFamily: 'var(--ff)', fontSize: 14, fontWeight: 500, color: 'var(--text)', marginBottom: 4 }}>
                  {clinic?.name ?? 'Your clinic'}
                </div>
                <div style={{ fontSize: 12.5, color: 'var(--muted)', lineHeight: 1.5, marginBottom: 12 }}>
                  Recommended: 400×400px, PNG or SVG. Appears in reports and your clinic profile.
                </div>
                {logoErr && <div style={{ fontSize: 12.5, color: 'var(--err)', marginBottom: 8 }}>{logoErr}</div>}
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  <button
                    className="btn btn-s"
                    style={{ fontSize: 13 }}
                    onClick={() => logoInputRef.current?.click()}
                    disabled={logoUploading}
                  >
                    {logoUploading ? 'Uploading…' : 'Upload logo'}
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div className="card" style={{ marginBottom: 20 }}>
            <div className="ey" style={{ marginBottom: 14 }}>Clinic information</div>
            <div className="info-grid">
              <div className="field">
                <label>Clinic name <span style={{ color: 'var(--err)', marginLeft: 3 }}>*</span></label>
                <input
                  className="input"
                  value={infoName}
                  onChange={e => setInfoName(e.target.value)}
                  placeholder="e.g. St. Mary's Radiology"
                />
              </div>
              <div className="field">
                <label>Clinic type</label>
                <input className="input" defaultValue="" placeholder="e.g. Radiology & MRI" readOnly />
              </div>
              <div className="field">
                <label>Primary contact email</label>
                <input
                  className="input"
                  type="email"
                  value={infoEmail}
                  onChange={e => setInfoEmail(e.target.value)}
                  placeholder="clinic@example.com"
                />
              </div>
              <div className="field">
                <label>Phone</label>
                <input
                  className="input"
                  value={infoPhone}
                  onChange={e => setInfoPhone(e.target.value)}
                  placeholder="+44 20 xxxx xxxx"
                />
              </div>
              <div className="field info-grid-full">
                <label>Address</label>
                <input
                  className="input"
                  value={infoAddress}
                  onChange={e => setInfoAddress(e.target.value)}
                  placeholder="123 Hospital Road, London"
                />
              </div>
            </div>
            {infoError && (
              <div style={{ marginTop: 12, padding: '10px 14px', background: 'rgba(var(--err-rgb),0.08)', border: '1px solid rgba(var(--err-rgb),0.20)', borderRadius: 10, fontSize: 13, color: 'var(--err)' }}>
                {infoError}
              </div>
            )}
            <div style={{ marginTop: 18 }}>
              <button
                className="btn btn-s"
                onClick={handleInfoSave}
                disabled={infoSaving}
                aria-label="Save clinic information"
              >
                {infoSaving ? 'Saving…' : infoSaved ? 'Saved ✓' : 'Save changes'}
              </button>
            </div>
          </div>

          {/* Services & specialisms */}
          <div className="card" style={{ marginBottom: 20 }}>
            <div className="ey" style={{ marginBottom: 14 }}>Services &amp; specialisms</div>
            <p style={{ fontSize: 13.5, color: 'var(--muted)', marginBottom: 16, lineHeight: 1.6 }}>
              Select the implant types and services your clinic handles. These appear as filters on the patient-facing &ldquo;Find a clinic&rdquo; page.
            </p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginBottom: 18 }}>
              {CAPABILITY_OPTIONS.map(opt => {
                const isOn = caps.includes(opt.value)
                return (
                  <button
                    key={opt.value}
                    type="button"
                    className={`cap-chip${isOn ? ' on' : ''}`}
                    onClick={() => setCaps(prev => isOn ? prev.filter(c => c !== opt.value) : [...prev, opt.value])}
                    aria-pressed={isOn}
                  >
                    {opt.label}
                  </button>
                )
              })}
            </div>
            {capsError && (
              <div style={{ marginBottom: 12, padding: '10px 14px', background: 'rgba(var(--err-rgb),0.08)', border: '1px solid rgba(var(--err-rgb),0.20)', borderRadius: 10, fontSize: 13, color: 'var(--err)' }}>
                {capsError}
              </div>
            )}
            <button
              className="btn btn-s"
              onClick={handleCapsSave}
              disabled={capsSaving}
              aria-label="Save capabilities"
            >
              {capsSaving ? 'Saving…' : capsSaved ? 'Saved ✓' : 'Save capabilities'}
            </button>
          </div>

          {/* Site scanners */}
          <ScannerManager />

          {/* Patient discovery toggle */}
          <div className="card" style={{ marginBottom: 20 }}>
            <div className="ey" style={{ marginBottom: 16 }}>Patient discovery</div>
            <div className="set-row">
              <div>
                <div className="set-row-label">Show my clinic to patients</div>
                <div className="set-row-desc">
                  When enabled, your clinic appears on the patient&apos;s &ldquo;Find a clinic&rdquo; page so they can search for you and share their record before their appointment.
                </div>
              </div>
              <Toggle
                checked={showToPatients ?? true}
                onChange={handleVisibilityToggle}
                disabled={saving || showToPatients === null}
              />
            </div>
            {saved && (
              <div style={{ marginTop: 12, fontFamily: 'var(--ff)', fontSize: 13, color: 'var(--ok)' }}>✓ Saved</div>
            )}
          </div>

          <p style={{ fontFamily: 'var(--fb)', fontSize: 13, color: 'var(--muted)', lineHeight: 1.6 }}>
            To update billing or compliance information, contact{' '}
            <a href="mailto:support@implantid.io" style={{ color: 'var(--accent)' }}>support@implantid.io</a>.
          </p>
        </div>
      )}

      {/* ── Notifications ───────────────────────────────────────────────────── */}
      {tab === 'notifications' && (
        <div>
          <div className="card">
            <div className="ey" style={{ marginBottom: 16 }}>Notification preferences</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
              <label className="set-row" style={{ cursor: 'pointer' }}>
                <div>
                  <div className="set-row-label">FDA &amp; MHRA recall alerts</div>
                  <div className="set-row-desc">Instant notification when a recall affects a device in your clinic&apos;s lookup history</div>
                </div>
                <Toggle checked={recalls} onChange={() => setRecalls(v => !v)} />
              </label>
              <label className="set-row" style={{ cursor: 'pointer' }}>
                <div>
                  <div className="set-row-label">Safety data expiry warnings</div>
                  <div className="set-row-desc">14-day advance notice when a device&apos;s verified safety data is due for renewal</div>
                </div>
                <Toggle checked={expiry} onChange={() => setExpiry(v => !v)} />
              </label>
              <label className="set-row" style={{ cursor: 'pointer' }}>
                <div>
                  <div className="set-row-label">Patient access request responses</div>
                  <div className="set-row-desc">Email when a patient approves or declines an access request from your clinic</div>
                </div>
                <Toggle checked={accessResp} onChange={() => setAccessResp(v => !v)} />
              </label>
              <label className="set-row" style={{ cursor: 'pointer' }}>
                <div>
                  <div className="set-row-label">Weekly activity digest</div>
                  <div className="set-row-desc">Summary of key events, time saved, and any flags requiring review</div>
                </div>
                <Toggle checked={digest} onChange={() => setDigest(v => !v)} />
              </label>
            </div>
            <div style={{ marginTop: 20 }}>
              <button
                className="btn btn-s"
                onClick={handleNotifSave}
                aria-label="Save notification preferences"
              >
                {notifSaved ? 'Saved ✓' : 'Save preferences'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Security ────────────────────────────────────────────────────────── */}
      {tab === 'security' && (
        <div>
          <div className="card">
            <div className="ey" style={{ marginBottom: 16 }}>Security settings</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
              <div className="set-row">
                <div>
                  <div className="set-row-label">Two-factor authentication</div>
                  <div className="set-row-desc">Required for all staff accounts on this clinic</div>
                </div>
                <span className="pill pill-ok" style={{ fontSize: 12, padding: '4px 12px', flexShrink: 0 }}>Enabled</span>
              </div>
              <div className="set-row">
                <div>
                  <div className="set-row-label">Session timeout</div>
                  <div className="set-row-desc">Automatically sign out after inactivity</div>
                </div>
                <span style={{ fontFamily: 'var(--ff)', fontSize: 13, color: 'var(--text)', fontWeight: 500, flexShrink: 0 }}>1 hour</span>
              </div>
              <div className="set-row" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: 12 }}>
                <div>
                  <div className="set-row-label">Audit log retention</div>
                  <div className="set-row-desc">How long staff access logs are kept on file</div>
                </div>
                <span style={{ fontFamily: 'var(--ff)', fontSize: 13, color: 'var(--text)', fontWeight: 500 }}>7 years (regulatory minimum)</span>
              </div>
              <div className="set-row">
                <div>
                  <div className="set-row-label">Active sessions</div>
                  <div className="set-row-desc">View and revoke sessions for all staff members</div>
                </div>
                <button
                  className="btn"
                  style={{ fontSize: 13, flexShrink: 0 }}
                  onClick={() => clerk.openUserProfile()}
                  aria-label="View active sessions in account settings"
                >
                  View sessions
                </button>
              </div>
            </div>
          </div>

          <div style={{ marginTop: 20 }}>
            <div style={{
              background: 'rgba(var(--err-rgb),0.05)',
              border: '1px solid rgba(var(--err-rgb),0.18)',
              borderRadius: 14, padding: '20px 24px',
            }}>
              <div style={{ fontFamily: 'var(--ff)', fontSize: 14, fontWeight: 600, color: 'var(--err)', marginBottom: 6 }}>Danger zone</div>
              <p style={{ fontSize: 13.5, color: 'var(--muted)', lineHeight: 1.5, marginBottom: 16 }}>
                These actions are irreversible. Please contact support before proceeding.
              </p>
              <button className="btn btn-danger" style={{ fontSize: 13 }}>Delete clinic account</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Plan & billing ──────────────────────────────────────────────────── */}
      {tab === 'billing' && (
        <div>
          {showUpgrade ? (
            <div>
              <button className="btn" style={{ marginBottom: 20, fontSize: 13 }} onClick={() => setShowUpgrade(false)}>← Back</button>
              <PlanPicker reason="trial_expired" onSkip={() => setShowUpgrade(false)} />
            </div>
          ) : billing?.foreverFree ? (
            <div className="card">
              <div className="ey" style={{ marginBottom: 14 }}>Current plan</div>
              <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--text)', marginBottom: 6 }}>Complimentary access</div>
              <div style={{ fontSize: 13.5, color: 'var(--muted)' }}>This account has been granted free access by Implant ID. No payment required.</div>
            </div>
          ) : (
            <>
              {/* Current plan card */}
              <div className="card" style={{ marginBottom: 20 }}>
                <div className="ey" style={{ marginBottom: 14 }}>Current plan</div>
                {billing === undefined ? (
                  <div style={{ color: 'var(--muted)', fontSize: 13 }}>Loading…</div>
                ) : (
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 20, flexWrap: 'wrap' }}>
                    <div>
                      <div style={{ fontFamily: 'var(--ff)', fontSize: 22, fontWeight: 600, letterSpacing: '-.02em', color: 'var(--text)', marginBottom: 4 }}>
                        {billing?.billingPlan === 'per_user' ? 'Per User'
                          : billing?.billingPlan === 'clinics' ? 'Clinics'
                          : billing?.billingPlan === 'large_team' ? 'Large Team'
                          : billing?.billingStatus === 'trialing' ? 'Free Trial'
                          : 'No active plan'}
                      </div>
                      <div style={{ fontSize: 13.5, color: 'var(--muted)', lineHeight: 1.5 }}>
                        {billing?.billingPlan === 'per_user' ? 'Single user · Full platform access'
                          : billing?.billingPlan === 'clinics' ? 'Up to 10 users · Role-based access · Priority support'
                          : billing?.billingPlan === 'large_team' ? 'Unlimited users · Multi-site · Dedicated account manager'
                          : billing?.billingStatus === 'trialing' && billing.trialEndsAt
                          ? `Trial ends ${new Date(billing.trialEndsAt).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })}`
                          : 'Subscribe to access all features'}
                      </div>
                    </div>
                    {billing?.billingStatus === 'past_due' && (
                      <span className="pill" style={{ background: 'rgba(220,53,69,.1)', color: 'var(--err)', fontSize: 12, padding: '4px 10px' }}>Payment overdue</span>
                    )}
                    {billing?.billingStatus === 'trialing' && (
                      <span className="pill pill-ok" style={{ fontSize: 12, padding: '4px 10px' }}>Trial active</span>
                    )}
                    {billing?.billingStatus === 'active' && (
                      <span className="pill pill-ok" style={{ fontSize: 12, padding: '4px 10px' }}>Active</span>
                    )}
                  </div>
                )}

                {billErr && <div style={{ marginTop: 12, padding: '8px 12px', background: 'rgba(220,53,69,.08)', border: '1px solid var(--err)', borderRadius: 8, color: 'var(--err)', fontSize: 13 }}>{billErr}</div>}

                <div style={{ marginTop: 18, display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                  {/* Upgrade: show when on per_user plan, or trialing with no plan */}
                  {(billing?.billingPlan === 'per_user' || (!billing?.billingPlan && billing?.billingStatus === 'trialing')) && (
                    <button className="btn btn-s" style={{ fontSize: 13 }} onClick={() => setShowUpgrade(true)}>
                      Upgrade plan
                    </button>
                  )}
                  {/* Manage subscription via Stripe portal */}
                  {billing?.stripeSubscriptionId && (
                    <button className="btn" style={{ fontSize: 13 }} onClick={openPortal} disabled={!!billLoading}>
                      {billLoading === 'portal' ? 'Opening…' : 'Manage subscription & invoices →'}
                    </button>
                  )}
                  {/* No subscription yet — take them to checkout */}
                  {!billing?.stripeSubscriptionId && billing?.billingStatus !== 'trialing' && (
                    <button className="btn btn-s" style={{ fontSize: 13 }} onClick={() => setShowUpgrade(true)}>
                      Choose a plan
                    </button>
                  )}
                  {/* Downgrade (subtle) — only on clinics plan */}
                  {billing?.billingPlan === 'clinics' && billing.stripeSubscriptionId && (
                    <button className="btn" style={{ fontSize: 12, color: 'var(--muted)' }} onClick={openPortal} disabled={!!billLoading}>
                      Downgrade plan
                    </button>
                  )}
                </div>
              </div>

              {/* Invoice history — only if they have a Stripe customer */}
              {billing?.stripeCustomerId ? (
                <div className="card">
                  <div className="ey" style={{ marginBottom: 14 }}>Invoice history</div>
                  <div style={{ fontSize: 13.5, color: 'var(--muted)' }}>
                    View and download all invoices in the{' '}
                    <button className="link-btn" style={{ fontSize: 13.5 }} onClick={openPortal} disabled={!!billLoading}>
                      billing portal →
                    </button>
                  </div>
                </div>
              ) : (
                <div className="card">
                  <div className="ey" style={{ marginBottom: 14 }}>Invoice history</div>
                  <div style={{ fontSize: 13.5, color: 'var(--muted2)' }}>No invoices yet — invoices will appear here after your first payment.</div>
                </div>
              )}
            </>
          )}
        </div>
      )}

    </div>
  )
}
