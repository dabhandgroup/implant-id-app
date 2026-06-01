'use client'
import React, { useState, useEffect, useRef } from 'react'
import { useUser, useSignUp, useClerk } from '@clerk/nextjs'
import { useMutation, useQuery }        from 'convex/react'
import { api }                          from '../../../../convex/_generated/api'
import { useRouter }                    from 'next/navigation'
import { ALL_DEVICES, MANUFACTURERS }   from '@/data/devices'
import { setUserRoleIfNew }             from '../../actions/setUserRole'

// ── Types ─────────────────────────────────────────────────────────────────────

type Step = 'details' | 'verifyPhone' | 'implant' | 'summary'
const STEPS: Step[] = ['details', 'verifyPhone', 'implant', 'summary']

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

interface SelectOption { value: string; label: string; icon?: string }

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

const MONTHS: SelectOption[] = [
  { value: '01', label: 'January' },  { value: '02', label: 'February' },
  { value: '03', label: 'March' },    { value: '04', label: 'April' },
  { value: '05', label: 'May' },      { value: '06', label: 'June' },
  { value: '07', label: 'July' },     { value: '08', label: 'August' },
  { value: '09', label: 'September' },{ value: '10', label: 'October' },
  { value: '11', label: 'November' }, { value: '12', label: 'December' },
]

// ── Helpers ───────────────────────────────────────────────────────────────────

function getMfrName(mfrId: string) {
  return MANUFACTURERS.find(m => m.manufacturer_id === mfrId)?.common_name ?? mfrId
}

function clerkErr(e: unknown): string {
  const errs = (e as { errors?: { longMessage?: string; message?: string }[] })?.errors
  if (errs?.[0]) return errs[0].longMessage || errs[0].message || 'Something went wrong'
  return e instanceof Error ? e.message : 'Something went wrong — please try again'
}

// ── Generic custom dropdown ───────────────────────────────────────────────────

function CompactSelect({
  options, value, placeholder, onChange, searchable, style,
}: {
  options:     SelectOption[]
  value:       string
  placeholder: string
  onChange:    (v: string) => void
  searchable?: boolean
  style?:      React.CSSProperties
}) {
  const [open,   setOpen]   = useState(false)
  const [search, setSearch] = useState('')
  const ref      = useRef<HTMLDivElement>(null)
  const listRef  = useRef<HTMLDivElement>(null)
  const typeBuf  = useRef('')
  const typeTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const selected = options.find(o => o.value === value)
  const filtered = searchable && search.trim()
    ? options.filter(o =>
        o.label.toLowerCase().includes(search.toLowerCase()) ||
        o.value.includes(search))
    : options

  useEffect(() => {
    if (!open) return
    function h(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
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
    const buf = typeBuf.current
    const match = options.find(o =>
      o.label.toLowerCase().startsWith(buf) || o.value.toLowerCase().startsWith(buf)
    )
    if (match) {
      onChange(match.value)
      setOpen(true)
      setTimeout(() => {
        listRef.current?.querySelector<HTMLElement>(`[data-val="${match.value}"]`)
          ?.scrollIntoView({ block: 'nearest' })
      }, 0)
    }
  }

  return (
    <div className={`custom-select${open ? ' open' : ''}`} ref={ref} style={style}>
      <button type="button" className="custom-select-btn"
        onClick={() => setOpen(o => !o)} onKeyDown={handleKeyDown}>
        <span className="custom-select-val"
          style={{ color: value ? 'var(--text)' : 'var(--muted2)' }}>
          {selected?.icon && <span style={{ marginRight: 6 }}>{selected.icon}</span>}
          {selected?.label ?? placeholder}
        </span>
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none"
          stroke="currentColor" strokeWidth="2.5">
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>
      <div className="custom-select-dd">
        {searchable && (
          <div className="custom-select-search">
            <input
              placeholder="Search…" value={search}
              onChange={e => setSearch(e.target.value)}
              autoFocus
            />
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

// ── Date-of-birth picker (day / month / year) ─────────────────────────────────

function DobPicker({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const parts  = value ? value.split('-') : ['', '', '']
  const [yr,  setYr]  = useState(parts[0] || '')
  const [mo,  setMo]  = useState(parts[1] || '')
  const [day, setDay] = useState(parts[2] || '')

  const CURRENT_YEAR = new Date().getFullYear()
  const years: SelectOption[] = Array.from({ length: 110 }, (_, i) => {
    const y = String(CURRENT_YEAR - 10 - i)
    return { value: y, label: y }
  })

  function daysInMonth(m: string, y: string) {
    if (!m || !y) return 31
    return new Date(parseInt(y), parseInt(m), 0).getDate()
  }

  function dayOptions(m: string, y: string): SelectOption[] {
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
      <CompactSelect
        style={{ flex: 1, minWidth: 0 }}
        options={dayOptions(mo, yr)}
        value={day}
        placeholder="Day"
        onChange={d => { setDay(d); commit(d, mo, yr) }}
      />
      <CompactSelect
        style={{ flex: 1, minWidth: 0 }}
        options={MONTHS}
        value={mo}
        placeholder="Month"
        onChange={m => {
          setMo(m)
          const max = daysInMonth(m, yr || '2000')
          const d2  = day ? String(Math.min(parseInt(day), max)).padStart(2, '0') : ''
          setDay(d2)
          commit(d2 || day, m, yr)
        }}
      />
      <CompactSelect
        style={{ flex: 1, minWidth: 0 }}
        options={years}
        value={yr}
        placeholder="Year"
        onChange={y => { setYr(y); commit(day, mo, y) }}
      />
    </div>
  )
}

// ── Surgery date picker (month + year only) ───────────────────────────────────

function SurgeryDatePicker({ month, year, onMonthChange, onYearChange }: {
  month: string; year: string
  onMonthChange: (m: string) => void
  onYearChange:  (y: string) => void
}) {
  const CURRENT_YEAR = new Date().getFullYear()
  const years: SelectOption[] = Array.from({ length: 60 }, (_, i) => {
    const y = String(CURRENT_YEAR - i)
    return { value: y, label: y }
  })

  return (
    <div style={{ display: 'flex', gap: 8 }}>
      <CompactSelect
        style={{ flex: 1 }}
        options={MONTHS}
        value={month}
        placeholder="Month"
        onChange={onMonthChange}
      />
      <CompactSelect
        style={{ flex: '0 0 96px' }}
        options={years}
        value={year}
        placeholder="Year"
        onChange={onYearChange}
      />
    </div>
  )
}

// ── Phone country picker ──────────────────────────────────────────────────────

function PhonePicker({
  flag, dial, phoneNum, placeholder,
  onCountryChange, onPhoneChange,
}: {
  flag: string; dial: string; phoneNum: string; placeholder: string
  onCountryChange: (c: typeof PHONE_COUNTRIES[0]) => void
  onPhoneChange:   (v: string) => void
}) {
  const [open,   setOpen]   = useState(false)
  const [search, setSearch] = useState('')
  const ref = useRef<HTMLDivElement>(null)

  const filtered = PHONE_COUNTRIES.filter(c =>
    !search || c.name.toLowerCase().includes(search.toLowerCase())
  )

  useEffect(() => {
    if (!open) return
    function h(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [open])

  return (
    <div className="phone-row" ref={ref}>
      <button type="button" className="phone-code" onClick={() => setOpen(o => !o)}>
        <span className="flag-circle">{flag}</span>
        <span className="dial">{dial}</span>
        <svg width="8" height="8" viewBox="0 0 24 24" fill="none"
          stroke="currentColor" strokeWidth="3">
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>
      <input
        className="input" type="tel" placeholder={placeholder}
        value={phoneNum}
        onChange={e => onPhoneChange(e.target.value)}
        onBlur={e => {
          const stripped = e.target.value.replace(/^0+/, '')
          if (stripped !== e.target.value) onPhoneChange(stripped)
        }}
        style={{ flex: 1 }}
      />
      {open && (
        <div className="phone-dd open">
          <div className="phone-dd-search">
            <input
              placeholder="Search countries…" value={search}
              onChange={e => setSearch(e.target.value)} autoFocus
            />
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

// ── Country of birth select ───────────────────────────────────────────────────

function CountrySelect({
  flag, country, onChange,
}: {
  flag: string; country: string
  onChange: (flag: string, name: string) => void
}) {
  const options: SelectOption[] = BIRTH_COUNTRIES.map(c => ({
    value: c.name,
    label: c.name,
    icon:  c.flag,
  }))

  return (
    <CompactSelect
      options={options}
      value={country}
      placeholder="Select country"
      onChange={v => {
        const c = BIRTH_COUNTRIES.find(x => x.name === v)
        onChange(c?.flag ?? '', v)
      }}
      searchable
    />
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
        return d.device_name.toLowerCase().includes(q) ||
          d.model_number.toLowerCase().includes(q) ||
          getMfrName(d.manufacturer_id).toLowerCase().includes(q)
      }).slice(0, 8)
    : []

  useEffect(() => {
    if (!open) return
    function h(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [open])

  function pick(d: typeof ALL_DEVICES[0]) {
    const sel: SelectedDevice = {
      device_id:    d.device_id,
      device_name:  d.device_name,
      manufacturer: getMfrName(d.manufacturer_id),
      model_number: d.model_number,
      device_type:  d.device_type,
    }
    setSelected(sel); setOpen(false); setQuery('')
    onSelect(sel)
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
            <input
              className="input"
              placeholder="Search by device name or model number"
              autoComplete="off"
              value={query}
              onChange={e => { setQuery(e.target.value); setOpen(true) }}
              onFocus={() => setOpen(true)}
              style={{ border: 0, padding: '11px 0', boxShadow: 'none' }}
            />
          </div>
          {open && results.length > 0 && (
            <div className="dev-results on">
              {results.map(d => (
                <a key={d.device_id} href="#"
                  onClick={e => { e.preventDefault(); pick(d) }}>
                  <div>
                    <div className="nm">{d.device_name}</div>
                    <div className="mn">
                      {getMfrName(d.manufacturer_id)} · {d.model_number} · {d.device_type}
                    </div>
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
            <div className="mn">
              {selected.manufacturer}
              {selected.model_number ? ` · ${selected.model_number}` : ''}
            </div>
          </div>
          <button className="dev-sel-x" type="button" onClick={clear} title="Change device">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth="2">
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}

      <div className="dev-warn" style={{ marginTop: 10 }}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
          <circle cx="12" cy="12" r="9" /><path d="M12 7v5M12 16h.01" />
        </svg>
        <span>
          Your selection will be verified before your record is confirmed.
          If you're unsure, pick the closest match — your clinic can correct it.
        </span>
      </div>
    </div>
  )
}

// ── Implant block (one per implant) ──────────────────────────────────────────

function ImplantBlock({
  entry, index, total, onChange, onRemove,
}: {
  entry:    ImplantEntry
  index:    number
  total:    number
  onChange: (updated: ImplantEntry) => void
  onRemove: () => void
}) {
  return (
    <div className="implant-block" style={{ marginBottom: 12 }}>
      <div className="implant-block-hd" style={{ justifyContent: 'space-between' }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" strokeWidth="2">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
          </svg>
          {total > 1 ? `Implant ${index + 1}` : 'Implant details'}
        </span>
        {total > 1 && (
          <button type="button" className="dev-sel-x" onClick={onRemove}
            title="Remove this implant" aria-label="Remove implant">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth="2">
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      <div className="field">
        <label>Search for your device</label>
        <DeviceSearch onSelect={device => onChange({ ...entry, device })} />
      </div>

      <div className="field">
        <label>Hospital / clinic where implanted</label>
        <input className="input" placeholder="e.g. Royal Melbourne Hospital"
          value={entry.hospital}
          onChange={e => onChange({ ...entry, hospital: e.target.value })} />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <div className="field">
          <label>Surgeon name (if known)</label>
          <input className="input" placeholder="e.g. Dr Sarah Chen"
            value={entry.surgeon}
            onChange={e => onChange({ ...entry, surgeon: e.target.value })} />
        </div>
        <div className="field">
          <label>Date of surgery</label>
          <SurgeryDatePicker
            month={entry.surgeryMonth} year={entry.surgeryYear}
            onMonthChange={m => onChange({ ...entry, surgeryMonth: m })}
            onYearChange={y  => onChange({ ...entry, surgeryYear: y  })}
          />
        </div>
      </div>
    </div>
  )
}

// ── OTP input row ─────────────────────────────────────────────────────────────

function OtpRow({
  otp, refs, onChange, onKeyDown, onPaste,
}: {
  otp:      string[]
  refs:     React.MutableRefObject<(HTMLInputElement | null)[]>
  onChange: (idx: number, val: string) => void
  onKeyDown:(idx: number, e: React.KeyboardEvent<HTMLInputElement>) => void
  onPaste:  (e: React.ClipboardEvent) => void
}) {
  return (
    <div className="code-row">
      {otp.map((digit, i) => (
        <input
          key={i}
          ref={el => { refs.current[i] = el }}
          type="tel"
          inputMode="numeric"
          autoComplete={i === 0 ? 'one-time-code' : 'off'}
          className="code-input"
          value={digit}
          onChange={e => onChange(i, e.target.value)}
          onKeyDown={e => onKeyDown(i, e)}
          onPaste={onPaste}
          onFocus={e => e.target.select()}
        />
      ))}
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

export default function RegisterClient() {
  const { isLoaded, isSignedIn, user } = useUser()
  const { signUp }    = useSignUp()
  const { setActive } = useClerk()
  const createPatient = useMutation(api.patients.createPatient)
  const router        = useRouter()
  const existingPatient = useQuery(api.patients.getMyPatient)

  // ── Step ──────────────────────────────────────────────────────────────────
  const [step, setStep] = useState<Step>('details')
  const stepIdx = STEPS.indexOf(step)

  // ── Step 1: personal details ──────────────────────────────────────────────
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

  // ── Step 2: phone OTP ─────────────────────────────────────────────────────
  const [phoneOtp,  setPhoneOtp]  = useState(['', '', '', '', '', ''])
  const phoneRefs = useRef<(HTMLInputElement | null)[]>([])

  // ── Step 3: implant details ───────────────────────────────────────────────
  const implantIdCounter = useRef(0)
  const [implants, setImplants] = useState<ImplantEntry[]>([
    { id: 0, device: null, hospital: '', surgeon: '', surgeryMonth: '', surgeryYear: '' },
  ])

  // ── Step 4: summary ───────────────────────────────────────────────────────
  const [notes, setNotes] = useState('')

  // ── Additional health details ──────────────────────────────────────────────
  const [heightCm,            setHeightCm]            = useState('')
  const [weightKg,            setWeightKg]            = useState('')
  const [contrastAllergy,     setContrastAllergy]     = useState(false)
  const [contrastAllergyNote, setContrastAllergyNote] = useState('')

  // ── UI ────────────────────────────────────────────────────────────────────
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState('')

  // If already signed in, jump past auth steps
  useEffect(() => {
    if (isLoaded && isSignedIn && (step === 'details' || step === 'verifyPhone')) {
      setStep('implant')
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoaded, isSignedIn])

  // If already has patient profile, redirect to dashboard
  useEffect(() => {
    if (existingPatient) router.replace('/patients/dashboard')
  }, [existingPatient, router])

  // Pre-fill from existing Clerk session
  useEffect(() => {
    if (user?.firstName && !firstName) setFirstName(user.firstName)
    if (user?.lastName  && !lastName)  setLastName(user.lastName)
    if (user?.primaryEmailAddress?.emailAddress && !email)
      setEmail(user.primaryEmailAddress.emailAddress)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user])

  if (!isLoaded || existingPatient === undefined) return null
  if (existingPatient) return null

  // ── Utilities ─────────────────────────────────────────────────────────────

  function showErr(msg: string) {
    setError(msg)
    document.querySelector('.auth-main')?.scrollTo(0, 0)
  }

  function goStep(s: Step) {
    setError('')
    setStep(s)
    document.querySelector('.auth-main')?.scrollTo(0, 0)
  }

  function dotCls(i: number) {
    const c = ['dot']
    if (i <= stepIdx) c.push('on')
    if (i < stepIdx)  c.push('done')
    return c.join(' ')
  }

  // ── Step 1 → 2: create Clerk account with phone, send SMS OTP ────────────

  async function goToVerifyPhone(e: React.FormEvent) {
    e.preventDefault()
    if (!firstName.trim())  return showErr('Please enter your first name')
    if (!lastName.trim())   return showErr('Please enter your last name')
    if (!dob)               return showErr('Please enter your date of birth')
    const dobDate = new Date(dob)
    if (isNaN(dobDate.getTime())) return showErr('Please enter a valid date of birth')
    if (dobDate > new Date())     return showErr('Date of birth cannot be in the future')
    if (!countryName)       return showErr('Please select your country of birth')
    if (!email.trim() || !email.includes('@'))
      return showErr('Please enter a valid email address')
    if (!phoneNum.trim())   return showErr('Please enter your phone number')

    setLoading(true)
    try {
      const digits = phoneNum.replace(/\D/g, '').replace(/^0+/, '')
      const e164 = `${phoneDial}${digits}`
      const { error: createErr } = await signUp!.create({
        firstName:    firstName.trim(),
        lastName:     lastName.trim(),
        emailAddress: email.trim().toLowerCase(),
        phoneNumber:  e164,
      })
      if (createErr) return showErr(createErr.longMessage || createErr.message)

      const { error: sendErr } = await signUp!.verifications.sendPhoneCode()
      if (sendErr) return showErr(sendErr.longMessage || sendErr.message)

      setPhoneOtp(['', '', '', '', '', ''])
      goStep('verifyPhone')
    } catch (ex) {
      showErr(clerkErr(ex))
    } finally {
      setLoading(false)
    }
  }

  // ── Step 2 → 3: verify phone OTP → finalize → set role ───────────────────

  async function verifyPhone(code?: string) {
    const c = code ?? phoneOtp.join('')
    if (c.length < 6) return showErr('Enter the full 6-digit code')
    setLoading(true)
    try {
      const { error: verErr } = await signUp!.verifications.verifyPhoneCode({ code: c })
      if (verErr) return showErr(verErr.longMessage || verErr.message)

      if (signUp!.status === 'complete') {
        // Clerk auto-created the session — just activate it
        if (signUp!.createdSessionId) {
          await setActive({ session: signUp!.createdSessionId })
        } else {
          const { error: finErr } = await signUp!.finalize()
          if (finErr) return showErr(finErr.longMessage || finErr.message)
        }
      } else {
        // Still missing requirements — show what's needed
        const missing = (signUp!.missingFields as string[]).join(', ')
        return showErr(
          `Sign-up could not be completed — missing: ${missing}. Please contact support@implantid.io`
        )
      }

      try { await setUserRoleIfNew('patient') } catch {}
      goStep('implant')
    } catch (ex) {
      showErr(clerkErr(ex))
    } finally {
      setLoading(false)
    }
  }

  // ── Step 3 → 4: move to summary ──────────────────────────────────────────

  function goToSummary(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    goStep('summary')
  }

  // ── Step 5: submit → create patient → redirect ────────────────────────────

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const first = implants[0]
      const extra = implants.slice(1).filter(imp =>
        imp.device || imp.hospital || imp.surgeon || imp.surgeryMonth || imp.surgeryYear
      )
      const result = await createPatient({
        firstName: firstName.trim(),
        lastName:  lastName.trim(),
        dob,
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
        selfReportedImplants: extra.length > 0
          ? JSON.stringify(extra.map(imp => ({
              device:       imp.device?.device_name   || null,
              deviceId:     imp.device?.device_id     || null,
              manufacturer: imp.device?.manufacturer  || null,
              modelNumber:  imp.device?.model_number  || null,
              deviceType:   imp.device?.device_type   || null,
              month:        imp.surgeryMonth || null,
              year:         imp.surgeryYear  || null,
              hospital:     imp.hospital || null,
              surgeon:      imp.surgeon  || null,
            })))
          : undefined,
        additionalNotes: notes.trim() || undefined,
        heightCm:            heightCm ? Number(heightCm) : undefined,
        weightKg:            weightKg ? Number(weightKg) : undefined,
        contrastAllergy:     contrastAllergy,
        contrastAllergyNote: contrastAllergyNote.trim() || undefined,
      })

      void result
      router.replace('/patients/dashboard')
    } catch (ex) {
      showErr((ex as { message?: string })?.message ?? 'Something went wrong — please try again')
    } finally {
      setLoading(false)
    }
  }

  // ── OTP helpers ───────────────────────────────────────────────────────────

  function makeOtpHandlers(
    otp: string[],
    setOtp: React.Dispatch<React.SetStateAction<string[]>>,
    refs:   React.MutableRefObject<(HTMLInputElement | null)[]>,
    verify: (code: string) => void,
  ) {
    function onKeyDown(idx: number, e: React.KeyboardEvent<HTMLInputElement>) {
      if (/^\d$/.test(e.key)) {
        e.preventDefault()
        const next = [...otp]; next[idx] = e.key; setOtp(next)
        if (idx < 5) refs.current[idx + 1]?.focus()
        if (next.every(d => d)) verify(next.join(''))
      } else if (e.key === 'Backspace') {
        e.preventDefault()
        if (otp[idx]) {
          const next = [...otp]; next[idx] = ''; setOtp(next)
        } else if (idx > 0) {
          const next = [...otp]; next[idx - 1] = ''; setOtp(next)
          refs.current[idx - 1]?.focus()
        }
      } else if (e.key === 'ArrowLeft' && idx > 0) {
        e.preventDefault(); refs.current[idx - 1]?.focus()
      } else if (e.key === 'ArrowRight' && idx < 5) {
        e.preventDefault(); refs.current[idx + 1]?.focus()
      }
    }
    function onChange(idx: number, val: string) {
      // Only fires for iOS SMS autofill / autocomplete — multi-char fill
      const raw = val.replace(/\D/g, '')
      if (raw.length > 1) {
        const next = ['', '', '', '', '', '']
        raw.slice(0, 6).split('').forEach((c, i) => { next[i] = c })
        setOtp(next)
        refs.current[Math.min(raw.length - 1, 5)]?.focus()
        if (next.every(d => d)) verify(next.join(''))
      }
    }
    function onPaste(e: React.ClipboardEvent) {
      const text = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6)
      if (!text) return
      e.preventDefault()
      const next = ['', '', '', '', '', '']
      text.split('').forEach((d, i) => { next[i] = d })
      setOtp(next)
      refs.current[Math.min(text.length - 1, 5)]?.focus()
      if (text.length === 6) verify(text)
    }
    return { onChange, onKeyDown, onPaste }
  }

  const phoneOtpHandlers = makeOtpHandlers(phoneOtp, setPhoneOtp, phoneRefs, verifyPhone)

  // ── Render ────────────────────────────────────────────────────────────────

  const phoneDisplay = phoneNum ? `${phoneDial} ${phoneNum}` : '—'

  return (
    <main className="auth">

      {/* ── Left panel ────────────────────────────────────────────────────── */}
      <aside className="auth-side">
        <a href="/" className="logo">
          <img src="/icon.svg" alt="" />
          <span className="logo-text"><b>Implant</b><span>ID</span></span>
        </a>
        <div>
          <h2>Be prepared for<br />your next appointment.</h2>
          <p>
            Get your implant record on your phone in under 60 seconds.
            Free forever — always synced with the manufacturer so your
            clinician has what they need.
          </p>
          <ul className="list">
            <li>Apple Wallet + Google Wallet pass</li>
            <li>MRI safety status, always up to date</li>
            <li>Manufacturer manuals in one tap</li>
            <li>Share with any clinic in seconds</li>
          </ul>
        </div>
        <div className="quote">
          <p>"I used to carry a folder to every appointment. Now I just tap my phone."</p>
          <cite>R. Tan · Pacemaker patient since 2021</cite>
        </div>
      </aside>

      {/* ── Right panel ───────────────────────────────────────────────────── */}
      <section className="auth-main">
        <div className="auth-box" style={{ maxWidth: 520 }}>

          <div className="ey" style={{ marginBottom: 14 }}>Register as a patient</div>
          <h1>Create your record</h1>
          <p className="sub">Free forever. Takes about 60 seconds.</p>

          {/* Stepper */}
          <div className="stepper">
            {STEPS.map((_, i) => <div key={i} className={dotCls(i)} />)}
          </div>

          {/* Error banner */}
          {error && (
            <div style={{
              background: 'color-mix(in srgb,var(--err) 10%,transparent)',
              border: '1px solid color-mix(in srgb,var(--err) 25%,transparent)',
              borderRadius: 10, padding: '10px 14px',
              fontSize: 13.5, color: 'var(--err)', marginBottom: 20,
            }}>
              {error}
            </div>
          )}

          {/* ─────────────────────────────────────────────────────────────── */}
          {/* STEP 1: Your details                                            */}
          {/* ─────────────────────────────────────────────────────────────── */}
          <div className={`step-pane${step === 'details' ? ' on' : ''}`}>
            <h3 className="step-title">Your details</h3>
            <form onSubmit={goToVerifyPhone}>

              {/* Name row */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div className="field">
                  <label>First name <span className="req">*</span></label>
                  <input className="input" placeholder="First name" required
                    value={firstName} onChange={e => setFirstName(e.target.value)} />
                </div>
                <div className="field">
                  <label>Last name <span className="req">*</span></label>
                  <input className="input" placeholder="Last name" required
                    value={lastName} onChange={e => setLastName(e.target.value)} />
                </div>
              </div>

              {/* DOB */}
              <div className="field">
                <label>Date of birth <span className="req">*</span></label>
                <DobPicker value={dob} onChange={setDob} />
              </div>

              {/* Country of birth */}
              <div className="field">
                <label>Country of birth <span className="req">*</span></label>
                <CountrySelect flag={countryFlag} country={countryName}
                  onChange={(f, n) => { setCountryFlag(f); setCountryName(n) }} />
              </div>

              {/* Email */}
              <div className="field">
                <label>Email <span className="req">*</span></label>
                <input className="input" type="email" placeholder="you@example.com" required
                  value={email} onChange={e => setEmail(e.target.value)} />
              </div>

              {/* Phone */}
              <div className="field">
                <label>Phone number <span className="req">*</span></label>
                <PhonePicker
                  flag={phoneFlag} dial={phoneDial} phoneNum={phoneNum} placeholder={phonePH}
                  onCountryChange={c => {
                    setPhoneFlag(c.flag); setPhoneDial(c.dial); setPhonePH(c.placeholder)
                  }}
                  onPhoneChange={setPhoneNum}
                />
                <span className="field-hint">
                  We'll send a verification code to this number.
                </span>
              </div>

              {/* Height / Weight */}
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
                <div className="field">
                  <label>Height <span style={{color:'var(--muted)',fontWeight:400}}>(cm)</span></label>
                  <input className="input" type="number" min="50" max="250" placeholder="e.g. 175"
                    value={heightCm} onChange={e => setHeightCm(e.target.value)} />
                </div>
                <div className="field">
                  <label>Weight <span style={{color:'var(--muted)',fontWeight:400}}>(kg)</span></label>
                  <input className="input" type="number" min="1" max="500" placeholder="e.g. 72"
                    value={weightKg} onChange={e => setWeightKg(e.target.value)} />
                </div>
              </div>

              <button className="btn btn-s btn-lg btn-block" type="submit"
                disabled={loading}>
                {loading ? 'Sending code…' : 'Continue →'}
              </button>
            </form>
          </div>

          {/* ─────────────────────────────────────────────────────────────── */}
          {/* STEP 2: Verify phone                                            */}
          {/* ─────────────────────────────────────────────────────────────── */}
          <div className={`step-pane${step === 'verifyPhone' ? ' on' : ''}`}>
            <h3 className="step-title">Check your phone</h3>
            <p className="step-sub">
              We've sent a 6-digit code to{' '}
              <strong>{phoneDial} {phoneNum}</strong>.
              Enter it below to verify your number.
            </p>

            <OtpRow
              otp={phoneOtp} refs={phoneRefs}
              onChange={phoneOtpHandlers.onChange}
              onKeyDown={phoneOtpHandlers.onKeyDown}
              onPaste={phoneOtpHandlers.onPaste}
            />

            <p className="resend-row">
              Didn't receive it?{' '}
              <button type="button" disabled={loading} className="link-btn"
                onClick={async () => {
                  setLoading(true)
                  try { await signUp!.verifications.sendPhoneCode() } catch {}
                  setLoading(false)
                }}>
                Resend code
              </button>
            </p>

            <div style={{ display: 'flex', gap: 10, marginTop: 6 }}>
              <button className="btn btn-lg" type="button"
                onClick={() => goStep('details')} style={{ flex: '0 0 auto' }}>
                ← Back
              </button>
              <button className="btn btn-s btn-lg" type="button"
                style={{ flex: 1 }} disabled={loading}
                onClick={() => verifyPhone()}>
                {loading ? 'Verifying…' : 'Verify phone →'}
              </button>
            </div>
          </div>

          {/* ─────────────────────────────────────────────────────────────── */}
          {/* STEP 3: Add your implant(s)                                     */}
          {/* ─────────────────────────────────────────────────────────────── */}
          <div className={`step-pane${step === 'implant' ? ' on' : ''}`}>
            <h3 className="step-title">Add your implant</h3>
            <p className="step-sub">
              Search for your device and add procedure details. Got more than one? Add them all.
            </p>
            <form onSubmit={goToSummary}>

              {implants.map((imp, idx) => (
                <ImplantBlock
                  key={imp.id}
                  entry={imp}
                  index={idx}
                  total={implants.length}
                  onChange={updated =>
                    setImplants(prev => prev.map(i => i.id === imp.id ? updated : i))
                  }
                  onRemove={() =>
                    setImplants(prev => prev.filter(i => i.id !== imp.id))
                  }
                />
              ))}

              <button type="button" className="btn btn-block"
                style={{ marginBottom: 18 }}
                onClick={() => {
                  implantIdCounter.current += 1
                  setImplants(prev => [
                    ...prev,
                    { id: implantIdCounter.current, device: null, hospital: '', surgeon: '', surgeryMonth: '', surgeryYear: '' },
                  ])
                }}>
                + Add another implant
              </button>

              {/* Contrast allergy */}
              <div className="field">
                <label>Contrast allergy</label>
                <div style={{ display:'flex', gap:8, marginBottom: contrastAllergy ? 10 : 0 }}>
                  <button type="button" className={contrastAllergy ? 'btn' : 'btn btn-s'}
                    style={{ flex:1 }}
                    onClick={() => setContrastAllergy(false)}>No known allergy</button>
                  <button type="button" className={contrastAllergy ? 'btn btn-s' : 'btn'}
                    style={{ flex:1, background: contrastAllergy ? '#f59e0b' : undefined, borderColor: contrastAllergy ? '#f59e0b' : undefined }}
                    onClick={() => setContrastAllergy(true)}>Has allergy / reaction</button>
                </div>
                {contrastAllergy && (
                  <textarea className="input" rows={2} placeholder="Describe the reaction or contrast agent involved…"
                    value={contrastAllergyNote} onChange={e => setContrastAllergyNote(e.target.value)}
                    style={{ marginTop:8, resize:'vertical' }} />
                )}
              </div>

              <div className="dev-warn" style={{ marginBottom: 14 }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
                  <circle cx="12" cy="12" r="9" /><path d="M12 7v5M12 16h.01" />
                </svg>
                <span>
                  Your selection will be verified before your record is confirmed.
                  If you're unsure, pick the closest match — your clinic can correct it.
                </span>
              </div>

              <div style={{ display: 'flex', gap: 10 }}>
                {!isSignedIn && (
                  <button className="btn btn-lg" type="button"
                    onClick={() => goStep('verifyPhone')} style={{ flex: '0 0 auto' }}>
                    ← Back
                  </button>
                )}
                <button className="btn btn-s btn-lg" type="submit" style={{ flex: 1 }}>
                  Review & submit →
                </button>
              </div>
            </form>
          </div>

          {/* ─────────────────────────────────────────────────────────────── */}
          {/* STEP 4: Summary + submit                                        */}
          {/* ─────────────────────────────────────────────────────────────── */}
          <div className={`step-pane${step === 'summary' ? ' on' : ''}`}>
            <h3 className="step-title">Review your record</h3>
            <p className="step-sub">
              Check your details below, add any notes, and submit to create your record.
            </p>

            <div className="summary">
              <div className="row">
                <span className="k">Name</span>
                <span className="v">{firstName} {lastName}</span>
              </div>
              <div className="row">
                <span className="k">Date of birth</span>
                <span className="v">
                  {dob
                    ? new Date(dob + 'T00:00:00').toLocaleDateString('en-GB', {
                        day: 'numeric', month: 'long', year: 'numeric',
                      })
                    : '—'}
                </span>
              </div>
              <div className="row">
                <span className="k">Country of birth</span>
                <span className="v">
                  {countryFlag && <span style={{ marginRight: 6 }}>{countryFlag}</span>}
                  {countryName || '—'}
                </span>
              </div>
              <div className="row">
                <span className="k">Phone</span>
                <span className="v">{phoneDisplay}</span>
              </div>
              {implants.map((imp, idx) => (
                <React.Fragment key={imp.id}>
                  {implants.length > 1 && (
                    <div className="row" style={{ background: 'color-mix(in srgb,var(--accent) 5%,transparent)' }}>
                      <span className="k" style={{ fontWeight: 600, color: 'var(--accent)' }}>
                        Implant {idx + 1}
                      </span>
                    </div>
                  )}
                  <div className="row">
                    <span className="k">Device</span>
                    <span className="v">{imp.device?.device_name || 'Not specified'}</span>
                  </div>
                  {imp.device?.manufacturer && (
                    <div className="row">
                      <span className="k">Manufacturer</span>
                      <span className="v">{imp.device.manufacturer}</span>
                    </div>
                  )}
                  {imp.hospital && (
                    <div className="row">
                      <span className="k">Hospital</span>
                      <span className="v">{imp.hospital}</span>
                    </div>
                  )}
                  {imp.surgeon && (
                    <div className="row">
                      <span className="k">Surgeon</span>
                      <span className="v">{imp.surgeon}</span>
                    </div>
                  )}
                  {(imp.surgeryMonth || imp.surgeryYear) && (
                    <div className="row">
                      <span className="k">Surgery date</span>
                      <span className="v">
                        {imp.surgeryMonth ? MONTHS.find(m => m.value === imp.surgeryMonth)?.label : ''}{' '}
                        {imp.surgeryYear}
                      </span>
                    </div>
                  )}
                </React.Fragment>
              ))}
              <div className="row">
                <span className="k">Status</span>
                <span className="v" style={{
                  color: 'var(--warn)',
                  display: 'flex', alignItems: 'center', gap: 6,
                }}>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none"
                    stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" />
                  </svg>
                  Pending hospital verification
                </span>
              </div>
            </div>

            <form onSubmit={submit} style={{ marginTop: 16 }}>
              <div className="field">
                <label>Additional notes <span style={{ color: 'var(--muted2)', fontWeight: 400 }}>(optional)</span></label>
                <textarea className="input" rows={3}
                  placeholder="Allergies, previous devices, special instructions…"
                  value={notes} onChange={e => setNotes(e.target.value)} />
              </div>

              <div className="dev-warn" style={{ marginTop: 12 }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                  <path d="m9 12 2 2 4-4" />
                </svg>
                <span>
                  This information is provided by you and will be marked as unverified
                  until confirmed by your clinic or hospital.
                </span>
              </div>

              <div style={{ display: 'flex', gap: 10, marginTop: 18 }}>
                <button className="btn btn-lg" type="button"
                  onClick={() => goStep('implant')} style={{ flex: '0 0 auto' }}>
                  ← Back
                </button>
                <button className="btn btn-s btn-lg" type="submit"
                  style={{ flex: 1 }} disabled={loading}>
                  {loading ? 'Creating your record…' : 'Submit record →'}
                </button>
              </div>
            </form>
          </div>

          <p className="auth-alt">Already have an account? <a href="/login">Log in</a></p>

        </div>
      </section>
    </main>
  )
}
