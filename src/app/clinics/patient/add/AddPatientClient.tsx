'use client'
import React, { useState, useRef, useEffect } from 'react'
import { useMutation } from 'convex/react'
import { api }         from '../../../../../convex/_generated/api'
import { useRouter }   from 'next/navigation'
import { ALL_DEVICES, MANUFACTURERS } from '@/data/devices'

// ── Types ─────────────────────────────────────────────────────────────────────

type Step = 'details' | 'implant' | 'review'
const STEPS: Step[] = ['details', 'implant', 'review']

interface SelectedDevice {
  device_id:    string
  device_name:  string
  manufacturer: string
  model_number: string
  device_type:  string
}

interface ImplantEntry {
  id:           number
  device:       SelectedDevice | null
  hospital:     string
  surgeon:      string
  surgeryMonth: string
  surgeryYear:  string
}

interface Opt { value: string; label: string; icon?: string }

// ── Static data ───────────────────────────────────────────────────────────────

const PHONE_COUNTRIES = [
  { flag: '🇬🇧', dial: '+44',  placeholder: '7700 900123',    name: 'United Kingdom' },
  { flag: '🇦🇺', dial: '+61',  placeholder: '412 345 678',    name: 'Australia' },
  { flag: '🇺🇸', dial: '+1',   placeholder: '(201) 555-0123', name: 'United States' },
  { flag: '🇨🇦', dial: '+1',   placeholder: '(204) 555-0123', name: 'Canada' },
  { flag: '🇮🇪', dial: '+353', placeholder: '85 012 3456',    name: 'Ireland' },
  { flag: '🇳🇿', dial: '+64',  placeholder: '21 123 4567',    name: 'New Zealand' },
  { flag: '🇩🇪', dial: '+49',  placeholder: '151 12345678',   name: 'Germany' },
  { flag: '🇫🇷', dial: '+33',  placeholder: '6 12 34 56 78',  name: 'France' },
  { flag: '🇮🇳', dial: '+91',  placeholder: '98765 43210',    name: 'India' },
  { flag: '🇸🇬', dial: '+65',  placeholder: '9123 4567',      name: 'Singapore' },
  { flag: '🇦🇪', dial: '+971', placeholder: '50 123 4567',    name: 'UAE' },
  { flag: '🇿🇦', dial: '+27',  placeholder: '71 123 4567',    name: 'South Africa' },
]

const BIRTH_COUNTRIES = [
  { flag: '🇬🇧', name: 'United Kingdom' },
  { flag: '🇦🇺', name: 'Australia' },
  { flag: '🇺🇸', name: 'United States' },
  { flag: '🇨🇦', name: 'Canada' },
  { flag: '🇮🇪', name: 'Ireland' },
  { flag: '🇳🇿', name: 'New Zealand' },
  { flag: '🇮🇳', name: 'India' },
  { flag: '🇩🇪', name: 'Germany' },
  { flag: '🇫🇷', name: 'France' },
  { flag: '🇮🇹', name: 'Italy' },
  { flag: '🇪🇸', name: 'Spain' },
  { flag: '🇳🇱', name: 'Netherlands' },
  { flag: '🇧🇷', name: 'Brazil' },
  { flag: '🇿🇦', name: 'South Africa' },
  { flag: '🇯🇵', name: 'Japan' },
  { flag: '🇰🇷', name: 'South Korea' },
  { flag: '🇸🇬', name: 'Singapore' },
  { flag: '🇦🇪', name: 'UAE' },
  { flag: '🇵🇰', name: 'Pakistan' },
]

const MONTHS: Opt[] = [
  { value: '01', label: 'January' },  { value: '02', label: 'February' },
  { value: '03', label: 'March' },    { value: '04', label: 'April' },
  { value: '05', label: 'May' },      { value: '06', label: 'June' },
  { value: '07', label: 'July' },     { value: '08', label: 'August' },
  { value: '09', label: 'September' },{ value: '10', label: 'October' },
  { value: '11', label: 'November' }, { value: '12', label: 'December' },
]

function getMfrName(id: string) {
  return MANUFACTURERS.find(m => m.manufacturer_id === id)?.common_name ?? id
}

// ── Compact dropdown ──────────────────────────────────────────────────────────

function CompactSelect({ options, value, placeholder, onChange, searchable, style }: {
  options: Opt[]; value: string; placeholder: string
  onChange: (v: string) => void; searchable?: boolean; style?: React.CSSProperties
}) {
  const [open,   setOpen]   = useState(false)
  const [search, setSearch] = useState('')
  const ref     = useRef<HTMLDivElement>(null)
  const listRef = useRef<HTMLDivElement>(null)
  const typeBuf  = useRef('')
  const typeTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const selected = options.find(o => o.value === value)
  const filtered = searchable && search.trim()
    ? options.filter(o => o.label.toLowerCase().includes(search.toLowerCase()) || o.value.includes(search))
    : options

  useEffect(() => {
    if (!open) return
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false) }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [open])

  function handleKeyDown(e: React.KeyboardEvent<HTMLButtonElement>) {
    if (e.key === 'Escape') { setOpen(false); return }
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setOpen(o => !o); return }
    if (e.key.length !== 1) return
    e.preventDefault()
    typeBuf.current += e.key.toLowerCase()
    if (typeTimer.current) clearTimeout(typeTimer.current)
    typeTimer.current = setTimeout(() => { typeBuf.current = '' }, 1500)
    const match = options.find(o => o.label.toLowerCase().startsWith(typeBuf.current))
    if (match) {
      onChange(match.value); setOpen(true)
      setTimeout(() => listRef.current?.querySelector<HTMLElement>(`[data-val="${match.value}"]`)?.scrollIntoView({ block: 'nearest' }), 0)
    }
  }

  return (
    <div className={`custom-select${open ? ' open' : ''}`} ref={ref} style={style}>
      <button type="button" className="custom-select-btn" onClick={() => setOpen(o => !o)} onKeyDown={handleKeyDown}>
        <span className="custom-select-val" style={{ color: value ? 'var(--text)' : 'var(--muted2)' }}>
          {selected?.icon && <span style={{ marginRight: 6 }}>{selected.icon}</span>}
          {selected?.label ?? placeholder}
        </span>
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>
      <div className="custom-select-dd">
        {searchable && (
          <div className="custom-select-search">
            <input placeholder="Search…" value={search} onChange={e => setSearch(e.target.value)} autoFocus />
          </div>
        )}
        <div className="custom-select-list" ref={listRef}>
          {filtered.map(o => (
            <button key={o.value} type="button" data-val={o.value}
              onClick={() => { onChange(o.value); setOpen(false); setSearch('') }}>
              {o.icon && <span style={{ marginRight: 8 }}>{o.icon}</span>}
              {o.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

// ── Date-of-birth picker ──────────────────────────────────────────────────────

function DobPicker({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const parts = value ? value.split('-') : ['', '', '']
  const [yr,  setYr]  = useState(parts[0] || '')
  const [mo,  setMo]  = useState(parts[1] || '')
  const [day, setDay] = useState(parts[2] || '')

  const CURRENT_YEAR = new Date().getFullYear()
  const years: Opt[] = Array.from({ length: 110 }, (_, i) => {
    const y = String(CURRENT_YEAR - 10 - i)
    return { value: y, label: y }
  })

  function daysInMonth(m: string, y: string) {
    if (!m || !y) return 31
    return new Date(parseInt(y), parseInt(m), 0).getDate()
  }

  function dayOptions(m: string, y: string): Opt[] {
    return Array.from({ length: daysInMonth(m, y) }, (_, i) => {
      const d = String(i + 1).padStart(2, '0')
      return { value: d, label: String(i + 1) }
    })
  }

  function commit(d: string, m: string, y: string) {
    if (!d || !m || !y) { onChange(''); return }
    const max     = daysInMonth(m, y)
    const clamped = String(Math.min(parseInt(d), max)).padStart(2, '0')
    onChange(`${y}-${m}-${clamped}`)
  }

  return (
    <div className="dob-row">
      <CompactSelect style={{ flex: 1, minWidth: 0 }} options={dayOptions(mo, yr)} value={day} placeholder="Day"
        onChange={d => { setDay(d); commit(d, mo, yr) }} />
      <CompactSelect style={{ flex: 1, minWidth: 0 }} options={MONTHS} value={mo} placeholder="Month"
        onChange={m => { setMo(m); const max = daysInMonth(m, yr || '2000'); const d2 = day ? String(Math.min(parseInt(day), max)).padStart(2, '0') : ''; setDay(d2); commit(d2 || day, m, yr) }} />
      <CompactSelect style={{ flex: 1, minWidth: 0 }} options={years} value={yr} placeholder="Year"
        onChange={y => { setYr(y); commit(day, mo, y) }} />
    </div>
  )
}

// ── Surgery date picker ───────────────────────────────────────────────────────

function SurgeryDatePicker({ month, year, onMonthChange, onYearChange }: {
  month: string; year: string; onMonthChange: (m: string) => void; onYearChange: (y: string) => void
}) {
  const CURRENT_YEAR = new Date().getFullYear()
  const years: Opt[] = Array.from({ length: 60 }, (_, i) => {
    const y = String(CURRENT_YEAR - i)
    return { value: y, label: y }
  })
  return (
    <div style={{ display: 'flex', gap: 8 }}>
      <CompactSelect style={{ flex: 1 }} options={MONTHS} value={month} placeholder="Month" onChange={onMonthChange} />
      <CompactSelect style={{ flex: '0 0 96px' }} options={years} value={year} placeholder="Year" onChange={onYearChange} />
    </div>
  )
}

// ── Phone picker ──────────────────────────────────────────────────────────────

function PhonePicker({ flag, dial, phoneNum, placeholder, onCountryChange, onPhoneChange }: {
  flag: string; dial: string; phoneNum: string; placeholder: string
  onCountryChange: (c: typeof PHONE_COUNTRIES[0]) => void; onPhoneChange: (v: string) => void
}) {
  const [open,   setOpen]   = useState(false)
  const [search, setSearch] = useState('')
  const ref = useRef<HTMLDivElement>(null)
  const filtered = PHONE_COUNTRIES.filter(c => !search || c.name.toLowerCase().includes(search.toLowerCase()))

  useEffect(() => {
    if (!open) return
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false) }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [open])

  return (
    <div className="phone-row" ref={ref}>
      <button type="button" className="phone-code" onClick={() => setOpen(o => !o)}>
        <span className="flag-circle">{flag}</span>
        <span className="dial">{dial}</span>
        <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>
      <input className="input" type="tel" placeholder={placeholder} value={phoneNum}
        onChange={e => onPhoneChange(e.target.value)}
        onBlur={e => { const s = e.target.value.replace(/^0+/, ''); if (s !== e.target.value) onPhoneChange(s) }}
        style={{ flex: 1 }} />
      {open && (
        <div className="phone-dd open">
          <div className="phone-dd-search">
            <input placeholder="Search countries…" value={search} onChange={e => setSearch(e.target.value)} autoFocus />
          </div>
          <div className="phone-dd-list">
            {filtered.map(c => (
              <button key={c.name} type="button"
                onClick={() => { onCountryChange(c); setOpen(false); setSearch('') }}>
                <span className="flag-circle">{c.flag}</span>
                {c.name}
                <span className="dial-r">{c.dial}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ── Country select ────────────────────────────────────────────────────────────

function CountrySelect({ flag, country, onChange }: {
  flag: string; country: string; onChange: (flag: string, name: string) => void
}) {
  const options: Opt[] = BIRTH_COUNTRIES.map(c => ({ value: c.name, label: c.name, icon: c.flag }))
  return (
    <CompactSelect options={options} value={country} placeholder="Select country"
      onChange={v => { const c = BIRTH_COUNTRIES.find(x => x.name === v); onChange(c?.flag ?? '', v) }}
      searchable />
  )
}

// ── Device search ─────────────────────────────────────────────────────────────

function DeviceSearch({ onSelect }: { onSelect: (d: SelectedDevice | null) => void }) {
  const [query,    setQuery]    = useState('')
  const [open,     setOpen]     = useState(false)
  const [selected, setSelected] = useState<SelectedDevice | null>(null)
  const ref = useRef<HTMLDivElement>(null)

  const results = query.trim().length >= 2
    ? ALL_DEVICES.filter(d => {
        const q = query.toLowerCase()
        return d.device_name.toLowerCase().includes(q) || d.model_number.toLowerCase().includes(q) ||
          getMfrName(d.manufacturer_id).toLowerCase().includes(q)
      }).slice(0, 8)
    : []

  useEffect(() => {
    if (!open) return
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false) }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [open])

  function pick(d: typeof ALL_DEVICES[0]) {
    const sel: SelectedDevice = { device_id: d.device_id, device_name: d.device_name, manufacturer: getMfrName(d.manufacturer_id), model_number: d.model_number, device_type: d.device_type }
    setSelected(sel); setOpen(false); setQuery(''); onSelect(sel)
  }

  function clear() { setSelected(null); onSelect(null) }

  return (
    <div ref={ref}>
      {!selected ? (
        <div className="dev-search-wrap">
          <div className="dev-search">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="7" /><path d="m21 21-4.3-4.3" />
            </svg>
            <input className="input" placeholder="Search by device name or model number"
              autoComplete="off" value={query}
              onChange={e => { setQuery(e.target.value); setOpen(true) }}
              onFocus={() => setOpen(true)}
              style={{ border: 0, padding: '11px 0', boxShadow: 'none' }} />
          </div>
          {open && results.length > 0 && (
            <div className="dev-results on">
              {results.map(d => (
                <a key={d.device_id} href="#" onClick={e => { e.preventDefault(); pick(d) }}>
                  <div>
                    <div className="nm">{d.device_name}</div>
                    <div className="mn">{getMfrName(d.manufacturer_id)} · {d.model_number} · {d.device_type}</div>
                  </div>
                </a>
              ))}
            </div>
          )}
        </div>
      ) : (
        <div className="dev-sel-card">
          <div className="dev-sel-info">
            <div className="nm">{selected.device_name}</div>
            <div className="mn">{selected.manufacturer}{selected.model_number ? ` · ${selected.model_number}` : ''}</div>
          </div>
          <button className="dev-sel-x" type="button" onClick={clear} title="Change device" aria-label="Change device">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}
    </div>
  )
}

// ── Implant block ─────────────────────────────────────────────────────────────

function ImplantBlock({ entry, index, total, onChange, onRemove }: {
  entry: ImplantEntry; index: number; total: number
  onChange: (updated: ImplantEntry) => void; onRemove: () => void
}) {
  return (
    <div className="implant-block" style={{ marginBottom: 12 }}>
      <div className="implant-block-hd" style={{ justifyContent: 'space-between' }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
          </svg>
          {total > 1 ? `Implant ${index + 1}` : 'Implant details'}
        </span>
        {total > 1 && (
          <button type="button" className="dev-sel-x" onClick={onRemove} aria-label="Remove implant">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>
      <div className="field">
        <label>Search for device</label>
        <DeviceSearch onSelect={device => onChange({ ...entry, device })} />
      </div>
      <div className="field">
        <label>Hospital / clinic where implanted</label>
        <input className="input" placeholder="e.g. Royal Melbourne Hospital" value={entry.hospital}
          onChange={e => onChange({ ...entry, hospital: e.target.value })} />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <div className="field">
          <label>Surgeon name</label>
          <input className="input" placeholder="e.g. Dr Sarah Chen" value={entry.surgeon}
            onChange={e => onChange({ ...entry, surgeon: e.target.value })} />
        </div>
        <div className="field">
          <label>Date of surgery</label>
          <SurgeryDatePicker month={entry.surgeryMonth} year={entry.surgeryYear}
            onMonthChange={m => onChange({ ...entry, surgeryMonth: m })}
            onYearChange={y  => onChange({ ...entry, surgeryYear: y  })} />
        </div>
      </div>
    </div>
  )
}

// ── Error banner ──────────────────────────────────────────────────────────────

function ErrorBanner({ msg }: { msg: string }) {
  if (!msg) return null
  return (
    <div style={{
      background: 'color-mix(in srgb,var(--err) 10%,transparent)',
      border: '1px solid color-mix(in srgb,var(--err) 25%,transparent)',
      borderRadius: 10, padding: '10px 14px',
      fontSize: 13.5, color: 'var(--err)', marginBottom: 20,
    }}>{msg}</div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

export default function AddPatientClient() {
  const clinicAddPatient = useMutation(api.patients.clinicAddPatient)
  const router           = useRouter()

  // ── Step ──────────────────────────────────────────────────────────────────
  const [step, setStep] = useState<Step>('details')
  const stepIdx = STEPS.indexOf(step)

  // ── Step 1: patient details ───────────────────────────────────────────────
  const [firstName,   setFirstName]   = useState('')
  const [lastName,    setLastName]    = useState('')
  const [dob,         setDob]         = useState('')
  const [countryFlag, setCountryFlag] = useState('')
  const [countryName, setCountryName] = useState('')
  const [email,       setEmail]       = useState('')
  const [phoneFlag,   setPhoneFlag]   = useState('🇬🇧')
  const [phoneDial,   setPhoneDial]   = useState('+44')
  const [phonePH,     setPhonePH]     = useState('7700 900123')
  const [phoneNum,    setPhoneNum]    = useState('')
  const [heightCm,    setHeightCm]    = useState('')
  const [weightKg,    setWeightKg]    = useState('')

  // ── Step 2: implant details ───────────────────────────────────────────────
  const implantIdCounter = useRef(0)
  const [implants, setImplants] = useState<ImplantEntry[]>([
    { id: 0, device: null, hospital: '', surgeon: '', surgeryMonth: '', surgeryYear: '' },
  ])
  const [contrastAllergy,     setContrastAllergy]     = useState(false)
  const [contrastAllergyNote, setContrastAllergyNote] = useState('')

  // ── Step 3: review ────────────────────────────────────────────────────────
  const [notes, setNotes] = useState('')

  // ── UI ────────────────────────────────────────────────────────────────────
  const [loading,       setLoading]       = useState(false)
  const [error,         setError]         = useState('')
  const [submitConfirm, setSubmitConfirm] = useState(false)

  // ── Helpers ───────────────────────────────────────────────────────────────

  function showErr(msg: string) {
    setError(msg)
    document.querySelector('.clinic-content')?.scrollTo(0, 0)
  }

  function goStep(s: Step) {
    setError('')
    setStep(s)
    document.querySelector('.clinic-content')?.scrollTo(0, 0)
  }

  function dotCls(i: number) {
    const c = ['dot']
    if (i <= stepIdx) c.push('on')
    if (i < stepIdx)  c.push('done')
    return c.join(' ')
  }

  // ── Step 1 → 2 ───────────────────────────────────────────────────────────

  function goToImplant(e: React.FormEvent) {
    e.preventDefault()
    if (!firstName.trim()) return showErr('Please enter the patient\'s first name')
    if (!lastName.trim())  return showErr('Please enter the patient\'s last name')
    if (!dob)              return showErr('Please enter the patient\'s date of birth')
    const dobDate = new Date(dob)
    if (isNaN(dobDate.getTime())) return showErr('Please enter a valid date of birth')
    if (dobDate > new Date())     return showErr('Date of birth cannot be in the future')
    goStep('implant')
  }

  // ── Step 2 → 3 ───────────────────────────────────────────────────────────

  function goToReview(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    goStep('review')
  }

  // ── Submit ────────────────────────────────────────────────────────────────

  async function doSubmit() {
    setError('')
    setLoading(true)
    try {
      const first = implants[0]
      const extra = implants.slice(1).filter(imp =>
        imp.device || imp.hospital || imp.surgeon || imp.surgeryMonth || imp.surgeryYear
      )

      const result = await clinicAddPatient({
        firstName: firstName.trim(),
        lastName:  lastName.trim(),
        dob,
        email:          email.trim() || undefined,
        phone:          phoneNum.trim() ? `${phoneDial} ${phoneNum.trim()}` : undefined,
        countryOfBirth: countryName || undefined,

        selfReportedDevice:       first?.device?.device_name   || undefined,
        selfReportedDeviceId:     first?.device?.device_id     || undefined,
        selfReportedManufacturer: first?.device?.manufacturer  || undefined,
        selfReportedModelNumber:  first?.device?.model_number  || undefined,
        selfReportedDeviceType:   first?.device?.device_type   || undefined,
        selfReportedImplantMonth: first?.surgeryMonth || undefined,
        selfReportedImplantYear:  first?.surgeryYear  || undefined,
        selfReportedHospital:     first?.hospital.trim() || undefined,
        selfReportedSurgeon:      first?.surgeon.trim()  || undefined,

        additionalNotes:     notes.trim() || undefined,
        heightCm:            heightCm ? Number(heightCm) : undefined,
        weightKg:            weightKg ? Number(weightKg) : undefined,
        contrastAllergy,
        contrastAllergyNote: contrastAllergyNote.trim() || undefined,
      })

      router.push(`/clinics/all-patients?added=${result.implantIdCode}`)
    } catch (ex) {
      showErr((ex as { message?: string })?.message ?? 'Something went wrong — please try again')
    } finally {
      setLoading(false)
    }
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="ap-page">

      {/* Page header */}
      <div className="ap-hd">
        <div className="ap-hd-icon">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" />
            <line x1="19" y1="8" x2="19" y2="14" /><line x1="22" y1="11" x2="16" y2="11" />
          </svg>
        </div>
        <div>
          <h1 className="ap-hd-title">Add patient record</h1>
          <p className="ap-hd-sub">Register a new patient in the system on their behalf</p>
        </div>
      </div>

      <div className="ap-card">

        {/* Stepper */}
        <div className="ap-stepper">
          {(['Patient details', 'Implant details', 'Review & submit'] as const).map((label, i) => (
            <div key={i} className={`ap-step${i <= stepIdx ? ' on' : ''}${i < stepIdx ? ' done' : ''}`}>
              <div className="ap-step-num">{i < stepIdx ? '✓' : i + 1}</div>
              <span className="ap-step-label">{label}</span>
              {i < 2 && <div className="ap-step-line" />}
            </div>
          ))}
        </div>

        <ErrorBanner msg={error} />

        {/* ── STEP 1: Patient details ──────────────────────────────────────── */}
        <div className={`step-pane${step === 'details' ? ' on' : ''}`}>
          <form onSubmit={goToImplant}>
            <div className="ap-section-title">Personal information</div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div className="field">
                <label>First name <span style={{ color: 'var(--err)', marginLeft: 3 }}>*</span></label>
                <input className="input" placeholder="First name"
                  value={firstName} onChange={e => setFirstName(e.target.value)} />
              </div>
              <div className="field">
                <label>Last name <span style={{ color: 'var(--err)', marginLeft: 3 }}>*</span></label>
                <input className="input" placeholder="Last name"
                  value={lastName} onChange={e => setLastName(e.target.value)} />
              </div>
            </div>

            <div className="field">
              <label>Date of birth <span style={{ color: 'var(--err)', marginLeft: 3 }}>*</span></label>
              <DobPicker value={dob} onChange={setDob} />
            </div>

            <div className="field">
              <label>Country of birth</label>
              <CountrySelect flag={countryFlag} country={countryName}
                onChange={(f, n) => { setCountryFlag(f); setCountryName(n) }} />
            </div>

            <div className="ap-section-title" style={{ marginTop: 24 }}>Contact information</div>

            <div className="field">
              <label>Email address</label>
              <input className="input" type="email" placeholder="patient@example.com"
                value={email} onChange={e => setEmail(e.target.value)} />
            </div>

            <div className="field">
              <label>Phone number</label>
              <PhonePicker flag={phoneFlag} dial={phoneDial} phoneNum={phoneNum} placeholder={phonePH}
                onCountryChange={c => { setPhoneFlag(c.flag); setPhoneDial(c.dial); setPhonePH(c.placeholder) }}
                onPhoneChange={setPhoneNum} />
            </div>

            <div className="ap-section-title" style={{ marginTop: 24 }}>Physical measurements</div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div className="field">
                <label>Height <span style={{ color: 'var(--muted)', fontWeight: 400 }}>(cm)</span></label>
                <input className="input" type="number" min="50" max="250" placeholder="e.g. 175"
                  value={heightCm} onChange={e => setHeightCm(e.target.value)} />
              </div>
              <div className="field">
                <label>Weight <span style={{ color: 'var(--muted)', fontWeight: 400 }}>(kg)</span></label>
                <input className="input" type="number" min="1" max="500" placeholder="e.g. 72"
                  value={weightKg} onChange={e => setWeightKg(e.target.value)} />
              </div>
            </div>

            <div className="ap-foot">
              <button className="btn btn-s btn-lg" type="submit">
                Continue to implant details →
              </button>
            </div>
          </form>
        </div>

        {/* ── STEP 2: Implant details ──────────────────────────────────────── */}
        <div className={`step-pane${step === 'implant' ? ' on' : ''}`}>
          <form onSubmit={goToReview}>
            <div className="ap-section-title">Implant information</div>
            <p className="ap-section-sub">
              Search the device database and fill in procedure details. Multiple implants can be added.
            </p>

            {implants.map((imp, idx) => (
              <ImplantBlock key={imp.id} entry={imp} index={idx} total={implants.length}
                onChange={updated => setImplants(prev => prev.map(i => i.id === imp.id ? updated : i))}
                onRemove={() => setImplants(prev => prev.filter(i => i.id !== imp.id))} />
            ))}

            <button type="button" className="btn btn-block" style={{ marginBottom: 24 }}
              onClick={() => {
                implantIdCounter.current += 1
                setImplants(prev => [...prev, { id: implantIdCounter.current, device: null, hospital: '', surgeon: '', surgeryMonth: '', surgeryYear: '' }])
              }}>
              + Add another implant
            </button>

            <div className="ap-section-title">Medical notes</div>

            <div className="field">
              <label>Contrast allergy</label>
              <div style={{ display: 'flex', gap: 8, marginBottom: contrastAllergy ? 10 : 0 }}>
                <button type="button" className={contrastAllergy ? 'btn' : 'btn btn-s'} style={{ flex: 1 }}
                  onClick={() => setContrastAllergy(false)}>No known allergy</button>
                <button type="button"
                  className={contrastAllergy ? 'btn btn-s' : 'btn'}
                  style={{ flex: 1, background: contrastAllergy ? '#f59e0b' : undefined, borderColor: contrastAllergy ? '#f59e0b' : undefined }}
                  onClick={() => setContrastAllergy(true)}>Has allergy / reaction</button>
              </div>
              {contrastAllergy && (
                <textarea className="input" rows={2} placeholder="Describe the reaction or contrast agent involved…"
                  value={contrastAllergyNote} onChange={e => setContrastAllergyNote(e.target.value)}
                  style={{ marginTop: 8, resize: 'vertical' }} />
              )}
            </div>

            <div className="ap-foot" style={{ justifyContent: 'space-between' }}>
              <button type="button" className="btn btn-lg" onClick={() => goStep('details')}>← Back</button>
              <button type="submit" className="btn btn-s btn-lg">Review & submit →</button>
            </div>
          </form>
        </div>

        {/* ── STEP 3: Review & submit ──────────────────────────────────────── */}
        <div className={`step-pane${step === 'review' ? ' on' : ''}`}>
          <div className="ap-section-title">Review patient record</div>
          <p className="ap-section-sub">Check all details before creating the record.</p>

          <div className="ap-summary">
            <div className="ap-summary-group">
              <div className="ap-summary-heading">Personal details</div>
              <div className="ap-sr"><span className="ap-sk">Full name</span><span className="ap-sv">{firstName} {lastName}</span></div>
              <div className="ap-sr"><span className="ap-sk">Date of birth</span><span className="ap-sv">
                {dob ? new Date(dob + 'T00:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }) : '—'}
              </span></div>
              {countryName && <div className="ap-sr"><span className="ap-sk">Country of birth</span><span className="ap-sv">{countryFlag} {countryName}</span></div>}
              {email && <div className="ap-sr"><span className="ap-sk">Email</span><span className="ap-sv">{email}</span></div>}
              {phoneNum && <div className="ap-sr"><span className="ap-sk">Phone</span><span className="ap-sv">{phoneDial} {phoneNum}</span></div>}
              {(heightCm || weightKg) && (
                <div className="ap-sr">
                  <span className="ap-sk">Measurements</span>
                  <span className="ap-sv">
                    {heightCm ? `${heightCm} cm` : ''}
                    {heightCm && weightKg ? ' · ' : ''}
                    {weightKg ? `${weightKg} kg` : ''}
                  </span>
                </div>
              )}
            </div>

            {implants.map((imp, idx) => (
              <div key={imp.id} className="ap-summary-group">
                <div className="ap-summary-heading">{implants.length > 1 ? `Implant ${idx + 1}` : 'Implant'}</div>
                <div className="ap-sr"><span className="ap-sk">Device</span><span className="ap-sv">{imp.device?.device_name || 'Not specified'}</span></div>
                {imp.device?.manufacturer && <div className="ap-sr"><span className="ap-sk">Manufacturer</span><span className="ap-sv">{imp.device.manufacturer}</span></div>}
                {imp.hospital && <div className="ap-sr"><span className="ap-sk">Hospital</span><span className="ap-sv">{imp.hospital}</span></div>}
                {imp.surgeon && <div className="ap-sr"><span className="ap-sk">Surgeon</span><span className="ap-sv">{imp.surgeon}</span></div>}
                {(imp.surgeryMonth || imp.surgeryYear) && (
                  <div className="ap-sr">
                    <span className="ap-sk">Surgery date</span>
                    <span className="ap-sv">{imp.surgeryMonth ? MONTHS.find(m => m.value === imp.surgeryMonth)?.label : ''} {imp.surgeryYear}</span>
                  </div>
                )}
              </div>
            ))}

            {contrastAllergy && (
              <div className="ap-summary-group">
                <div className="ap-summary-heading">Medical alerts</div>
                <div className="ap-sr"><span className="ap-sk">Contrast allergy</span><span className="ap-sv" style={{ color: '#f59e0b', fontWeight: 500 }}>⚠ Yes</span></div>
                {contrastAllergyNote && <div className="ap-sr"><span className="ap-sk">Allergy note</span><span className="ap-sv">{contrastAllergyNote}</span></div>}
              </div>
            )}
          </div>

          <div className="field" style={{ marginTop: 20 }}>
            <label>Additional notes <span style={{ color: 'var(--muted2)', fontWeight: 400 }}>(optional)</span></label>
            <textarea className="input" rows={3}
              placeholder="Allergies, previous devices, special instructions…"
              value={notes} onChange={e => setNotes(e.target.value)} />
          </div>

          <div className="dev-warn" style={{ marginBottom: 18 }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /><path d="m9 12 2 2 4-4" />
            </svg>
            <span>
              This record will be created as pending and will require verification before the patient
              can access full portal features.
            </span>
          </div>

          <div className="ap-foot" style={{ justifyContent: 'space-between' }}>
            <button type="button" className="btn btn-lg" onClick={() => goStep('implant')}>← Back</button>
            <button type="button" className="btn btn-s btn-lg" onClick={() => setSubmitConfirm(true)} disabled={loading}>
              Create patient record →
            </button>
          </div>
        </div>

      </div>

      {/* ── Confirm modal ────────────────────────────────────────────────────── */}
      {submitConfirm && (
        <div className="logout-back open" onClick={() => !loading && setSubmitConfirm(false)}>
          <div className="logout-modal" onClick={e => e.stopPropagation()}>
            <div className="logout-body">
              <div style={{ width: 48, height: 48, borderRadius: '50%', background: 'color-mix(in srgb,var(--accent) 12%,transparent)', display: 'grid', placeItems: 'center', margin: '0 auto 16px' }}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2">
                  <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" />
                  <line x1="19" y1="8" x2="19" y2="14" /><line x1="22" y1="11" x2="16" y2="11" />
                </svg>
              </div>
              <h3>Create patient record?</h3>
              <p>
                A new record for <strong>{firstName} {lastName}</strong> will be created with status{' '}
                <strong>pending verification</strong>. They will need to be verified before accessing
                full portal features.
              </p>
            </div>
            <div className="logout-actions">
              <button className="btn" onClick={() => setSubmitConfirm(false)} disabled={loading}>Cancel</button>
              <button className="btn btn-s" onClick={() => { setSubmitConfirm(false); doSubmit() }} disabled={loading}>
                {loading ? 'Creating…' : 'Yes, create record →'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
