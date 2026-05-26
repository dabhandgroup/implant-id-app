'use client'
import { useState, useEffect, useRef } from 'react'
import { useUser, useSignUp }  from '@clerk/nextjs'
import { useMutation, useQuery } from 'convex/react'
import { api }                 from '../../../../convex/_generated/api'
import { useRouter }           from 'next/navigation'
import { ALL_DEVICES, MANUFACTURERS } from '@/data/devices'
import { setUserRoleIfNew }    from '../../actions/setUserRole'

// ── Types ─────────────────────────────────────────────────────────────────────

type Step = 'details' | 'verify' | 'implant' | 'implantDetails' | 'success'
const STEPS: Step[] = ['details', 'verify', 'implant', 'implantDetails', 'success']

interface SelectedDevice {
  device_id:    string
  device_name:  string
  manufacturer: string
  model_number: string
  device_type:  string
}

interface ExtraImplant {
  id:          string
  hospital:    string
  surgeon:     string
  surgeryDate: string
  notes:       string
}

// ── Data ──────────────────────────────────────────────────────────────────────

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

// ── Helpers ───────────────────────────────────────────────────────────────────

function uid() { return Math.random().toString(36).slice(2) }

function getMfrName(mfrId: string) {
  return MANUFACTURERS.find(m => m.manufacturer_id === mfrId)?.common_name ?? mfrId
}

function clerkErr(e: unknown) {
  return (e as { errors?: { message?: string }[] })?.errors?.[0]?.message
    ?? (e instanceof Error ? e.message : 'Something went wrong — please try again')
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
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
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
        onChange={e => onPhoneChange(e.target.value)} style={{ flex: 1 }} />
      {open && (
        <div className="phone-dd open">
          <div className="phone-dd-search">
            <input placeholder="Search countries…" value={search}
              onChange={e => setSearch(e.target.value)} autoFocus />
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
  const [open,   setOpen]   = useState(false)
  const [search, setSearch] = useState('')
  const ref = useRef<HTMLDivElement>(null)

  const filtered = BIRTH_COUNTRIES.filter(c =>
    !search || c.name.toLowerCase().includes(search.toLowerCase())
  )

  useEffect(() => {
    if (!open) return
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  return (
    <div className={`custom-select${open ? ' open' : ''}`} ref={ref}>
      <button type="button" className="custom-select-btn" onClick={() => setOpen(o => !o)}>
        <span className="custom-select-val">
          {flag
            ? <><span className="flag-circle" style={{ width: 18, height: 18, fontSize: 12 }}>{flag}</span> {country}</>
            : <span style={{ color: 'var(--muted2)' }}>Select country</span>
          }
        </span>
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>
      <div className="custom-select-dd">
        <div className="custom-select-search">
          <input placeholder="Search countries…" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <div className="custom-select-list">
          {filtered.map(c => (
            <button key={c.name} type="button"
              onClick={() => { onChange(c.flag, c.name); setOpen(false); setSearch('') }}>
              <span className="flag-circle">{c.flag}</span>
              {c.name}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

// ── Device search ─────────────────────────────────────────────────────────────

function DeviceSearch({ onSelect }: { onSelect: (d: SelectedDevice | null) => void }) {
  const [query,      setQuery]      = useState('')
  const [open,       setOpen]       = useState(false)
  const [selected,   setSelected]   = useState<SelectedDevice | null>(null)
  const [showManual, setShowManual] = useState(false)
  const [manualMfr,  setManualMfr]  = useState('')
  const [manualName, setManualName] = useState('')
  const [manualMdl,  setManualMdl]  = useState('')
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
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
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

  function clearDevice() { setSelected(null); onSelect(null) }

  function notifyManual(mfr: string, name: string, mdl: string) {
    if (name.trim() || mfr.trim()) {
      onSelect({ device_id: '', device_name: name.trim() || mfr.trim(), manufacturer: mfr.trim(), model_number: mdl.trim(), device_type: '' })
    }
  }

  return (
    <div ref={ref}>
      <div className="dev-search-wrap">
        <div className="dev-search">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="7" /><path d="m21 21-4.3-4.3" />
          </svg>
          <input id="dev-q" className="input" placeholder="Search by device name or model number"
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

      {selected && (
        <div className="dev-selected" style={{ marginTop: 10 }}>
          <div className="dev-sel-card">
            <div className="dev-sel-info">
              <div className="nm">{selected.device_name}</div>
              <div className="mn">{selected.manufacturer}{selected.model_number ? ` · ${selected.model_number}` : ''}</div>
            </div>
            <button className="dev-sel-x" type="button" onClick={clearDevice} title="Remove">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M18 6 6 18M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      )}

      <div className="dev-warn" style={{ marginTop: 12 }}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
          <circle cx="12" cy="12" r="9" /><path d="M12 7v5M12 16h.01" />
        </svg>
        <span>Your device selection will be verified before your record is marked as confirmed. If you're unsure, select the closest match — your clinic can correct it.</span>
      </div>

      <div className="field" style={{ marginTop: 16 }}>
        <label>Don't know your device?</label>
        {!showManual ? (
          <button className="btn btn-lg btn-block" type="button" onClick={() => setShowManual(true)} style={{ textAlign: 'left' }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" style={{ marginRight: 6 }}>
              <path d="M12 20h9" /><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
            </svg>
            Enter details manually
          </button>
        ) : (
          <div style={{ marginTop: 4 }}>
            <div className="field">
              <label>Implant manufacturer</label>
              <input className="input" placeholder="e.g. Medtronic, Boston Scientific, Abbott"
                value={manualMfr}
                onChange={e => { setManualMfr(e.target.value); notifyManual(e.target.value, manualName, manualMdl) }} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1.3fr 1fr', gap: 12 }}>
              <div className="field">
                <label>Device name</label>
                <input className="input" placeholder="e.g. Azure XT DR"
                  value={manualName}
                  onChange={e => { setManualName(e.target.value); notifyManual(manualMfr, e.target.value, manualMdl) }} />
              </div>
              <div className="field">
                <label>Model number (if known)</label>
                <input className="input" placeholder="e.g. W3DR01"
                  value={manualMdl}
                  onChange={e => { setManualMdl(e.target.value); notifyManual(manualMfr, manualName, e.target.value) }} />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

export default function RegisterClient() {
  const { isLoaded, isSignedIn, user } = useUser()
  const { signUp }      = useSignUp()
  const createPatient   = useMutation(api.patients.createPatient)
  const router          = useRouter()
  const existingPatient = useQuery(api.patients.getMyPatient)  // returns null if unauthed

  // Step state
  const [step,    setStep]    = useState<Step>('details')
  const stepIdx = STEPS.indexOf(step)

  // Step 1: personal details + Clerk sign-up
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

  // Step 2: OTP verification
  const [otp, setOtp] = useState(['', '', '', '', '', ''])
  const codeRefs = useRef<(HTMLInputElement | null)[]>([])

  // Steps 3–4: implant data
  const [selectedDevice, setSelectedDevice] = useState<SelectedDevice | null>(null)
  const [hospital,     setHospital]     = useState('')
  const [surgeon,      setSurgeon]      = useState('')
  const [surgeryDate,  setSurgeryDate]  = useState('')
  const [notes,        setNotes]        = useState('')
  const [extras,       setExtras]       = useState<ExtraImplant[]>([])

  // Step 5: success data
  const [iidCode, setIidCode] = useState('')

  // UI
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState('')

  // If user lands already signed in, jump past auth steps
  useEffect(() => {
    if (isLoaded && isSignedIn && (step === 'details' || step === 'verify')) {
      setStep('implant')
    }
  }, [isLoaded, isSignedIn]) // eslint-disable-line react-hooks/exhaustive-deps

  // If already has patient profile, redirect to dashboard
  useEffect(() => {
    if (existingPatient) router.replace('/patients/dashboard')
  }, [existingPatient, router])

  // Pre-fill name from Clerk if already signed in
  useEffect(() => {
    if (user?.firstName && !firstName) setFirstName(user.firstName)
    if (user?.lastName  && !lastName)  setLastName(user.lastName)
    if (user?.primaryEmailAddress?.emailAddress && !email)
      setEmail(user.primaryEmailAddress.emailAddress)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user])

  if (!isLoaded || existingPatient === undefined) return null
  if (existingPatient) return null

  function err(msg: string) {
    setError(msg)
    document.querySelector('.auth-main')?.scrollTo(0, 0)
  }

  function goStep(s: Step) {
    setError('')
    setStep(s)
    document.querySelector('.auth-main')?.scrollTo(0, 0)
  }

  // ── Step 1 → 2: create Clerk account + send OTP ─────────────────────────

  async function goToVerify(e: React.FormEvent) {
    e.preventDefault()
    if (!firstName.trim()) return err('Please enter your first name')
    if (!lastName.trim())  return err('Please enter your last name')
    if (!dob)              return err('Please enter your date of birth')
    const parsed = new Date(dob)
    if (isNaN(parsed.getTime())) return err('Please enter a valid date of birth')
    if (parsed > new Date())     return err('Date of birth cannot be in the future')
    if (!email.trim() || !email.includes('@')) return err('Please enter a valid email address')

    setLoading(true)
    try {
      const { error: ce } = await signUp!.create({
        emailAddress: email.trim().toLowerCase(),
        firstName:    firstName.trim(),
        lastName:     lastName.trim(),
      })
      if (ce) return err(ce.message ?? 'Could not create account')

      const { error: se } = await signUp!.verifications.sendEmailCode()
      if (se) return err(se.message ?? 'Could not send verification code')

      setOtp(['', '', '', '', '', ''])
      goStep('verify')
    } catch (ex) {
      err(clerkErr(ex))
    } finally {
      setLoading(false)
    }
  }

  // ── Step 2: verify OTP + finish Clerk sign-in ────────────────────────────

  async function verifyOtp(code?: string) {
    const c = code ?? otp.join('')
    if (c.length < 6) return err('Enter the full 6-digit code')

    setLoading(true)
    try {
      const { error: ve } = await signUp!.verifications.verifyEmailCode({ code: c })
      if (ve) return err(ve.message ?? 'Incorrect code — please try again')

      await signUp!.finalize()
      await setUserRoleIfNew('patient')
      goStep('implant')
    } catch (ex) {
      err(clerkErr(ex))
    } finally {
      setLoading(false)
    }
  }

  function handleCodeInput(idx: number, val: string) {
    const digit = val.replace(/\D/g, '').slice(-1)
    const next  = [...otp]; next[idx] = digit; setOtp(next)
    if (digit && idx < 5) codeRefs.current[idx + 1]?.focus()
    if (next.every(d => d) && next.join('').length === 6) verifyOtp(next.join(''))
  }

  function handleCodeKeyDown(idx: number, e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Backspace' && !otp[idx] && idx > 0) {
      codeRefs.current[idx - 1]?.focus()
    }
  }

  function handleCodePaste(e: React.ClipboardEvent) {
    const text = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6)
    if (!text) return
    e.preventDefault()
    const next = [...otp]
    text.split('').forEach((d, i) => { if (i < 6) next[i] = d })
    setOtp(next)
    codeRefs.current[Math.min(text.length, 5)]?.focus()
    if (text.length === 6) verifyOtp(text)
  }

  // ── Step 3 → 4 ───────────────────────────────────────────────────────────

  function goToImplantDetails(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    goStep('implantDetails')
  }

  // ── Step 4 → 5: create patient record ────────────────────────────────────

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const extraJson = extras.length > 0
        ? JSON.stringify(extras.map(a => ({
            hospital:    a.hospital,
            surgeon:     a.surgeon,
            surgeryDate: a.surgeryDate,
            notes:       a.notes,
          })))
        : undefined

      const result = await createPatient({
        firstName: firstName.trim(),
        lastName:  lastName.trim(),
        dob,
        phone:          phoneNum.trim() ? `${phoneDial} ${phoneNum.trim()}` : undefined,
        countryOfBirth: countryName || undefined,

        selfReportedDevice:       selectedDevice?.device_name || undefined,
        selfReportedDeviceId:     selectedDevice?.device_id   || undefined,
        selfReportedManufacturer: selectedDevice?.manufacturer || undefined,
        selfReportedModelNumber:  selectedDevice?.model_number || undefined,
        selfReportedDeviceType:   selectedDevice?.device_type  || undefined,
        selfReportedHospital:     hospital.trim()  || undefined,
        selfReportedSurgeon:      surgeon.trim()   || undefined,
        selfReportedImplantMonth: surgeryDate ? surgeryDate.slice(5, 7) : undefined,
        selfReportedImplantYear:  surgeryDate ? surgeryDate.slice(0, 4) : undefined,
        selfReportedImplants:     extraJson,
        additionalNotes:          notes.trim() || undefined,
      })

      const code = result && typeof result === 'object' && 'implantIdCode' in result
        ? (result as { implantIdCode: string }).implantIdCode : ''
      setIidCode(code)
      goStep('success')
    } catch (ex) {
      err((ex as { message?: string })?.message ?? 'Something went wrong — please try again')
    } finally {
      setLoading(false)
    }
  }

  // ── Extra implant helpers ─────────────────────────────────────────────────

  function addExtra() {
    setExtras(p => [...p, { id: uid(), hospital: '', surgeon: '', surgeryDate: '', notes: '' }])
  }
  function updateExtra(id: string, field: keyof ExtraImplant, val: string) {
    setExtras(p => p.map(a => a.id === id ? { ...a, [field]: val } : a))
  }
  function removeExtra(id: string) {
    setExtras(p => p.filter(a => a.id !== id))
  }

  // ── Dot class helper ──────────────────────────────────────────────────────

  function dotCls(i: number) {
    const c = ['dot']
    if (i <= stepIdx) c.push('on')
    if (i < stepIdx)  c.push('done')
    return c.join(' ')
  }

  // ── Render ────────────────────────────────────────────────────────────────

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
          <p>Get your implant record on your phone in under 60 seconds. Free forever — always synced with the manufacturer so your clinician has what they need.</p>
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

          {/* Stepper — 5 dots matching original design */}
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

          {/* ───────────────────────────────────────────────────────────── */}
          {/* STEP 1: Your details                                          */}
          {/* ───────────────────────────────────────────────────────────── */}
          <div className={`step-pane${step === 'details' ? ' on' : ''}`} id="pane-1">
            <h3 style={{ fontFamily: 'var(--ff)', fontSize: 15, fontWeight: 500, marginBottom: 14 }}>
              Your details
            </h3>
            <form onSubmit={goToVerify}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div className="field">
                  <label>First name</label>
                  <input className="input" placeholder="First name" required
                    value={firstName} onChange={e => setFirstName(e.target.value)} />
                </div>
                <div className="field">
                  <label>Last name</label>
                  <input className="input" placeholder="Last name" required
                    value={lastName} onChange={e => setLastName(e.target.value)} />
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div className="field">
                  <label>Date of birth</label>
                  <input className="input" type="date" value={dob} onChange={e => setDob(e.target.value)} />
                </div>
                <div className="field">
                  <label>Country of birth</label>
                  <CountrySelect flag={countryFlag} country={countryName}
                    onChange={(f, n) => { setCountryFlag(f); setCountryName(n) }} />
                </div>
              </div>
              <div className="field">
                <label>Email</label>
                <input className="input" type="email" placeholder="you@example.com"
                  value={email} onChange={e => setEmail(e.target.value)} />
              </div>
              <div className="field">
                <label>Phone number <span style={{ color: 'var(--accent)', fontWeight: 700 }}>*</span></label>
                <PhonePicker flag={phoneFlag} dial={phoneDial} phoneNum={phoneNum} placeholder={phonePH}
                  onCountryChange={c => { setPhoneFlag(c.flag); setPhoneDial(c.dial); setPhonePH(c.placeholder) }}
                  onPhoneChange={setPhoneNum} />
                <span style={{ fontSize: 12, color: 'var(--muted)', marginTop: 4, display: 'block' }}>
                  We'll send a verification code to your email
                </span>
              </div>
              <div style={{ display: 'flex', gap: 10, marginTop: 14 }}>
                <button className="btn btn-s btn-lg" type="submit" style={{ flex: 1 }} disabled={loading}>
                  {loading ? 'Sending code…' : 'Continue'}
                </button>
              </div>
            </form>
          </div>

          {/* ───────────────────────────────────────────────────────────── */}
          {/* STEP 2: Verify your email                                     */}
          {/* ───────────────────────────────────────────────────────────── */}
          <div className={`step-pane${step === 'verify' ? ' on' : ''}`} id="pane-2">
            <h3 style={{ fontFamily: 'var(--ff)', fontSize: 15, fontWeight: 500, marginBottom: 6 }}>
              Verify your email
            </h3>
            <p style={{ color: 'var(--muted)', fontSize: 13.5, marginBottom: 20, lineHeight: 1.55 }}>
              We've sent a 6-digit code to <strong>{email}</strong>. Enter it below to verify your account.
            </p>
            <div className="code-row" onPaste={handleCodePaste}>
              {otp.map((digit, i) => (
                <input
                  key={i}
                  ref={el => { codeRefs.current[i] = el }}
                  maxLength={1}
                  className="code-input"
                  value={digit}
                  onChange={e => handleCodeInput(i, e.target.value)}
                  onKeyDown={e => handleCodeKeyDown(i, e)}
                  onFocus={e => e.target.select()}
                  inputMode="numeric"
                />
              ))}
            </div>
            <p style={{ fontSize: 13, color: 'var(--muted)', textAlign: 'center', margin: '16px 0' }}>
              Didn't receive a code?{' '}
              <button type="button" disabled={loading}
                style={{ background: 'none', border: 0, color: 'var(--accent)', fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--ff)', fontSize: 13 }}
                onClick={async () => {
                  setLoading(true)
                  try { await signUp!.verifications.sendEmailCode() } catch {}
                  setLoading(false)
                }}>
                Resend
              </button>
            </p>
            <div style={{ display: 'flex', gap: 10 }}>
              <button className="btn btn-lg" type="button" onClick={() => goStep('details')} style={{ flex: 0 }}>
                ← Back
              </button>
              <button className="btn btn-s btn-lg" type="button" disabled={loading}
                onClick={() => verifyOtp()} style={{ flex: 1 }}>
                {loading ? 'Verifying…' : 'Verify & continue'}
              </button>
            </div>
          </div>

          {/* ───────────────────────────────────────────────────────────── */}
          {/* STEP 3: Find your implant                                     */}
          {/* ───────────────────────────────────────────────────────────── */}
          <div className={`step-pane${step === 'implant' ? ' on' : ''}`} id="pane-3">
            <h3 style={{ fontFamily: 'var(--ff)', fontSize: 15, fontWeight: 500, marginBottom: 6 }}>
              Find your implant
            </h3>
            <p style={{ color: 'var(--muted)', fontSize: 13.5, marginBottom: 16, lineHeight: 1.55 }}>
              Search for your device below. If you're not sure, that's OK — your clinic can verify it later.
            </p>
            <form onSubmit={goToImplantDetails}>
              <DeviceSearch onSelect={setSelectedDevice} />
              <div style={{ display: 'flex', gap: 10, marginTop: 18 }}>
                {!isSignedIn && (
                  <button className="btn btn-lg" type="button" onClick={() => goStep('verify')} style={{ flex: 0 }}>
                    ← Back
                  </button>
                )}
                <button className="btn btn-s btn-lg" type="submit" style={{ flex: 1 }}>
                  Continue
                </button>
              </div>
            </form>
          </div>

          {/* ───────────────────────────────────────────────────────────── */}
          {/* STEP 4: Implant details                                       */}
          {/* ───────────────────────────────────────────────────────────── */}
          <div className={`step-pane${step === 'implantDetails' ? ' on' : ''}`} id="pane-4">
            <h3 style={{ fontFamily: 'var(--ff)', fontSize: 15, fontWeight: 500, marginBottom: 6 }}>
              Implant details
            </h3>
            <p style={{ color: 'var(--muted)', fontSize: 13.5, marginBottom: 16, lineHeight: 1.55 }}>
              Where and when was your device implanted? This helps us verify your record.
            </p>
            <form onSubmit={submit}>
              <div id="implant-blocks">
                <div className="implant-block">
                  <div className="implant-block-hd" style={{ fontFamily: 'var(--ff)', fontSize: 13, fontWeight: 600, color: 'var(--accent)', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <circle cx="12" cy="12" r="9" /><path d="M8 12h8M12 8v8" />
                    </svg>
                    Implant 1
                  </div>
                  <div className="field">
                    <label>Hospital / clinic where implanted</label>
                    <input className="input" placeholder="e.g. Royal Melbourne Hospital"
                      value={hospital} onChange={e => setHospital(e.target.value)} />
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                    <div className="field">
                      <label>Surgeon name (if known)</label>
                      <input className="input" placeholder="e.g. Dr Sarah Chen"
                        value={surgeon} onChange={e => setSurgeon(e.target.value)} />
                    </div>
                    <div className="field">
                      <label>Date of surgery</label>
                      <input className="input" type="date"
                        value={surgeryDate} onChange={e => setSurgeryDate(e.target.value)} />
                    </div>
                  </div>
                  <div className="field" style={{ marginTop: 4 }}>
                    <label>Additional information</label>
                    <textarea className="input" rows={2}
                      placeholder="Anything else — allergies, previous devices, lead changes…"
                      value={notes} onChange={e => setNotes(e.target.value)} />
                  </div>
                </div>

                {extras.map((a, idx) => (
                  <div key={a.id} className="implant-block">
                    <div style={{ fontFamily: 'var(--ff)', fontSize: 13, fontWeight: 600, color: 'var(--accent)', marginBottom: 10, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <circle cx="12" cy="12" r="9" /><path d="M8 12h8M12 8v8" />
                        </svg>
                        Implant {idx + 2}
                      </span>
                      <button type="button" onClick={() => removeExtra(a.id)}
                        style={{ background: 'none', border: 0, color: 'var(--muted)', cursor: 'pointer', fontSize: 12, fontFamily: 'var(--ff)' }}>
                        Remove
                      </button>
                    </div>
                    <div className="field">
                      <label>Hospital / clinic where implanted</label>
                      <input className="input" placeholder="e.g. Royal Melbourne Hospital"
                        value={a.hospital} onChange={e => updateExtra(a.id, 'hospital', e.target.value)} />
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                      <div className="field">
                        <label>Surgeon name (if known)</label>
                        <input className="input" placeholder="e.g. Dr Sarah Chen"
                          value={a.surgeon} onChange={e => updateExtra(a.id, 'surgeon', e.target.value)} />
                      </div>
                      <div className="field">
                        <label>Date of surgery</label>
                        <input className="input" type="date"
                          value={a.surgeryDate} onChange={e => updateExtra(a.id, 'surgeryDate', e.target.value)} />
                      </div>
                    </div>
                    <div className="field" style={{ marginTop: 4 }}>
                      <label>Additional information</label>
                      <textarea className="input" rows={2} placeholder="Anything else…"
                        value={a.notes} onChange={e => updateExtra(a.id, 'notes', e.target.value)} />
                    </div>
                  </div>
                ))}
              </div>

              <button type="button" className="btn btn-lg btn-block" id="add-implant-btn"
                onClick={addExtra}
                style={{ marginTop: 14, textAlign: 'left', borderStyle: 'dashed' }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginRight: 6 }}>
                  <circle cx="12" cy="12" r="9" /><path d="M12 8v8M8 12h8" />
                </svg>
                Add another implant
              </button>

              <div className="dev-warn" style={{ marginTop: 16 }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /><path d="m9 12 2 2 4-4" />
                </svg>
                <span>This information is provided by you and will be marked as unverified until confirmed by your clinic or hospital.</span>
              </div>

              <div style={{ display: 'flex', gap: 10, marginTop: 18 }}>
                <button className="btn btn-lg" type="button" onClick={() => goStep('implant')} style={{ flex: 0 }}>
                  ← Back
                </button>
                <button className="btn btn-s btn-lg" type="submit" style={{ flex: 1 }} disabled={loading}>
                  {loading ? 'Submitting…' : 'Submit & verify'}
                </button>
              </div>
            </form>
          </div>

          {/* ───────────────────────────────────────────────────────────── */}
          {/* STEP 5: Success                                               */}
          {/* ───────────────────────────────────────────────────────────── */}
          <div className={`step-pane${step === 'success' ? ' on' : ''}`} id="pane-5">
            <div style={{ textAlign: 'center', padding: '20px 0 10px' }}>
              <div style={{ width: 72, height: 72, borderRadius: '50%', background: 'color-mix(in srgb,var(--accent) 10%,transparent)', color: 'var(--accent)', display: 'grid', placeItems: 'center', margin: '0 auto 20px' }}>
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /><path d="m9 12 2 2 4-4" />
                </svg>
              </div>
              <h3 style={{ fontSize: 22, marginBottom: 10, letterSpacing: '-.02em' }}>We're verifying your implant</h3>
              <p style={{ color: 'var(--muted)', maxWidth: 380, margin: '0 auto 8px', lineHeight: 1.6, fontSize: 14.5 }}>
                We're contacting your hospital to confirm your implant details. This usually takes 1–2 working days.
              </p>
              <p style={{ color: 'var(--muted2)', fontSize: 13, marginBottom: 28 }}>
                You'll receive an email once your record is verified.
              </p>
            </div>
            <div className="summary">
              <div className="row"><span className="k">Name</span><span className="v">{firstName} {lastName}</span></div>
              <div className="row"><span className="k">Patient ID</span><span className="v">{iidCode || '—'}</span></div>
              <div className="row"><span className="k">Implant</span><span className="v">{selectedDevice?.device_name || 'Pending verification'}</span></div>
              <div className="row">
                <span className="k">Status</span>
                <span className="v" style={{ color: 'var(--warn)', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" />
                  </svg>
                  Pending hospital verification
                </span>
              </div>
            </div>
            <a href="/patients/dashboard" className="btn btn-s btn-lg btn-block" style={{ marginTop: 18, marginBottom: 10 }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" style={{ marginRight: 6 }}>
                <rect x="3" y="6" width="18" height="14" rx="2" /><path d="M3 10h18" />
              </svg>
              Add to Apple Wallet
            </a>
            <a href="/patients/dashboard" className="btn btn-lg btn-block">Open my record →</a>
            <p style={{ textAlign: 'center', fontSize: 12.5, color: 'var(--muted2)', marginTop: 14 }}>
              Your Wallet pass will update automatically once verified.
            </p>
          </div>

          <p className="auth-alt">Already have an account? <a href="/login">Log in</a></p>

        </div>
      </section>
    </main>
  )
}
