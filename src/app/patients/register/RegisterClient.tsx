'use client'
import { useState, useEffect, useRef } from 'react'
import { useUser }                      from '@clerk/nextjs'
import { useMutation, useQuery }        from 'convex/react'
import { api }                          from '../../../../convex/_generated/api'
import { useRouter }                    from 'next/navigation'
import { CustomSelect, InlineSelect }   from '@/components/ui/CustomSelect'
import { ALL_DEVICES, MANUFACTURERS }   from '@/data/devices'

// ── Types ─────────────────────────────────────────────────────────────────────

type Step = 'details' | 'implant' | 'emergency' | 'summary'

interface SelectedDevice {
  device_id:    string
  device_name:  string
  manufacturer: string
  model_number: string
  device_type:  string
}

interface AdditionalImplant {
  id:          string  // local uuid
  deviceName:  string
  deviceType:  string
  hospital:    string
  month:       string
  year:        string
}

// ── Constants ─────────────────────────────────────────────────────────────────

const MONTHS = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December',
]

const DEVICE_TYPES = [
  'Pacemaker',
  'ICD / Defibrillator',
  'CRT-P / CRT-D',
  'Cochlear implant',
  'Deep brain stimulator',
  'Spinal cord stimulator',
  'Hip replacement',
  'Knee replacement',
  'Spinal implant / disc',
  'Insulin pump',
  'Vascular stent',
  'Biliary stent',
  'Other',
]

const RELATIONS = [
  'Partner / Spouse','Parent','Child','Sibling','Friend','Carer','Other',
]

const COUNTRIES = [
  'United Kingdom','United States','Australia','Canada','Ireland',
  'New Zealand','Germany','France','Spain','Italy','Netherlands',
  'Belgium','Sweden','Norway','Denmark','Finland','Switzerland',
  'Austria','Poland','Czech Republic','Portugal','Greece','Other',
]

const STEP_META = [
  { id: 'details'   as Step, label: 'About you',      desc: 'Personal details'         },
  { id: 'implant'   as Step, label: 'Your implant',   desc: 'Device information'        },
  { id: 'emergency' as Step, label: 'Emergency',       desc: 'Emergency contact'         },
  { id: 'summary'   as Step, label: 'Review',          desc: 'Confirm & submit'          },
]

// ── Helpers ───────────────────────────────────────────────────────────────────

function uid() {
  return Math.random().toString(36).slice(2)
}

function getManufacturerName(mfrId: string) {
  return MANUFACTURERS.find(m => m.manufacturer_id === mfrId)?.common_name ?? mfrId
}

// ── Sub-components ────────────────────────────────────────────────────────────

function DobPicker({ day, month, year, onDay, onMonth, onYear }: {
  day: string; month: string; year: string
  onDay: (v:string)=>void; onMonth: (v:string)=>void; onYear: (v:string)=>void
}) {
  const currentYear = new Date().getFullYear()
  const years = Array.from({ length: 110 }, (_, i) => String(currentYear - i))
  const days  = Array.from({ length: 31 },  (_, i) => String(i + 1).padStart(2, '0'))
  return (
    <div className="field">
      <label>Date of birth<span style={{ color:'var(--err)',marginLeft:3 }}>*</span></label>
      <div style={{ display:'grid', gridTemplateColumns:'80px 1fr 100px', gap:8 }}>
        <InlineSelect value={day}   onChange={onDay}   placeholder="Day"   options={days} />
        <InlineSelect value={month} onChange={onMonth} placeholder="Month"
          options={MONTHS.map((m,i)=>({ label:m, value:String(i+1).padStart(2,'0') }))} />
        <InlineSelect value={year}  onChange={onYear}  placeholder="Year"  options={years} />
      </div>
      <span className="hint">Used to generate your unique Implant ID — never shared without consent</span>
    </div>
  )
}

function ImplantDatePicker({ month, year, onMonth, onYear }: {
  month: string; year: string; onMonth:(v:string)=>void; onYear:(v:string)=>void
}) {
  const currentYear = new Date().getFullYear()
  const years = Array.from({ length: 30 }, (_, i) => String(currentYear - i))
  return (
    <div className="field">
      <label>Approximate date of implant <span style={{ fontWeight:400,opacity:.6 }}>(optional)</span></label>
      <div style={{ display:'grid', gridTemplateColumns:'1fr 100px', gap:8 }}>
        <InlineSelect value={month} onChange={onMonth} placeholder="Month"
          options={MONTHS.map((m,i)=>({ label:m, value:String(i+1).padStart(2,'0') }))} />
        <InlineSelect value={year}  onChange={onYear}  placeholder="Year"  options={years} />
      </div>
    </div>
  )
}

// ── Device search ─────────────────────────────────────────────────────────────

function DeviceSearch({ onSelect }: { onSelect: (d: SelectedDevice | null) => void }) {
  const [query,    setQuery]    = useState('')
  const [open,     setOpen]     = useState(false)
  const [selected, setSelected] = useState<SelectedDevice | null>(null)
  const [manual,   setManual]   = useState(false)
  const [manualName, setManualName] = useState('')
  const ref = useRef<HTMLDivElement>(null)

  const results = query.trim().length >= 2
    ? ALL_DEVICES.filter(d => {
        const q = query.toLowerCase()
        return (
          d.device_name.toLowerCase().includes(q) ||
          d.model_number.toLowerCase().includes(q) ||
          getManufacturerName(d.manufacturer_id).toLowerCase().includes(q) ||
          d.device_type.toLowerCase().includes(q)
        )
      }).slice(0, 8)
    : []

  useEffect(() => {
    if (!open) return
    function onDown(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [open])

  function pick(d: typeof ALL_DEVICES[0]) {
    const sel: SelectedDevice = {
      device_id:    d.device_id,
      device_name:  d.device_name,
      manufacturer: getManufacturerName(d.manufacturer_id),
      model_number: d.model_number,
      device_type:  d.device_type,
    }
    setSelected(sel)
    setOpen(false)
    setQuery('')
    onSelect(sel)
  }

  function clear() {
    setSelected(null)
    setManual(false)
    setManualName('')
    onSelect(null)
  }

  function commitManual() {
    if (!manualName.trim()) return
    onSelect({
      device_id:    '',
      device_name:  manualName.trim(),
      manufacturer: '',
      model_number: '',
      device_type:  '',
    })
  }

  if (selected) {
    return (
      <div className="dev-chip">
        <div className="dev-chip-inner">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true" style={{ flexShrink:0, color:'var(--ok)' }}>
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>
          </svg>
          <div>
            <div style={{ fontWeight:600, fontSize:14, color:'var(--text)' }}>{selected.device_name}</div>
            {selected.manufacturer && (
              <div style={{ fontSize:12, color:'var(--muted)', marginTop:1 }}>
                {selected.manufacturer}{selected.model_number ? ` · ${selected.model_number}` : ''}
              </div>
            )}
          </div>
        </div>
        <button type="button" onClick={clear} className="dev-chip-remove" aria-label="Remove device">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true"><path d="M18 6 6 18M6 6l12 12"/></svg>
        </button>
      </div>
    )
  }

  if (manual) {
    return (
      <div>
        <div className="field" style={{ marginBottom:10 }}>
          <input
            className="input"
            type="text"
            placeholder="e.g. Medtronic Azure XT DR, ceramic hip…"
            value={manualName}
            onChange={e => { setManualName(e.target.value); commitManual() }}
            autoFocus
          />
          <span className="hint">As much or as little detail as you know is fine</span>
        </div>
        <button type="button" onClick={() => setManual(false)}
          style={{ fontSize:13, color:'var(--accent)', background:'none', border:'none', cursor:'pointer', padding:0 }}>
          ← Search the database instead
        </button>
      </div>
    )
  }

  return (
    <div ref={ref} style={{ position:'relative' }}>
      <div className="dev-search-wrap">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true" style={{ position:'absolute', left:13, top:'50%', transform:'translateY(-50%)', color:'var(--muted2)', pointerEvents:'none' }}>
          <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
        </svg>
        <input
          className="input dev-search"
          type="text"
          placeholder="Search by name, model number or manufacturer…"
          value={query}
          onChange={e => { setQuery(e.target.value); setOpen(true) }}
          onFocus={() => setOpen(true)}
          autoComplete="off"
        />
      </div>

      {open && results.length > 0 && (
        <ul className="dev-results">
          {results.map(d => (
            <li key={d.device_id}>
              <button type="button" onClick={() => pick(d)} className="dev-result-btn">
                <div className="dev-result-name">{d.device_name}</div>
                <div className="dev-result-meta">
                  {getManufacturerName(d.manufacturer_id)} · {d.model_number} · {d.device_type}
                </div>
              </button>
            </li>
          ))}
        </ul>
      )}

      {open && query.trim().length >= 2 && results.length === 0 && (
        <div className="dev-warn">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><circle cx="12" cy="12" r="10"/><path d="M12 8v4M12 16h.01"/></svg>
          No matches for "{query}" — try a different name or model number
        </div>
      )}

      <button type="button" onClick={() => setManual(true)} className="dev-manual-link">
        Can't find your device? Enter it manually →
      </button>
    </div>
  )
}

// ── Additional implant block ───────────────────────────────────────────────────

function AdditionalImplantBlock({
  implant, onChange, onRemove,
}: {
  implant: AdditionalImplant
  onChange: (id: string, field: keyof AdditionalImplant, val: string) => void
  onRemove: (id: string) => void
}) {
  const currentYear = new Date().getFullYear()
  const years = Array.from({ length: 30 }, (_, i) => String(currentYear - i))

  return (
    <div className="implant-block">
      <div className="implant-block-header">
        <span className="implant-block-label">Additional implant</span>
        <button type="button" onClick={() => onRemove(implant.id)} className="implant-block-remove" aria-label="Remove implant">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true"><path d="M18 6 6 18M6 6l12 12"/></svg>
        </button>
      </div>

      <div className="field" style={{ marginBottom:10 }}>
        <label>Device name / description<span style={{ color:'var(--err)',marginLeft:3 }}>*</span></label>
        <input className="input" type="text" placeholder="e.g. ceramic hip, cochlear implant…"
          value={implant.deviceName}
          onChange={e => onChange(implant.id, 'deviceName', e.target.value)} />
      </div>

      <CustomSelect
        label="Type of implant"
        value={implant.deviceType}
        onChange={v => onChange(implant.id, 'deviceType', v)}
        options={DEVICE_TYPES}
        placeholder="Select type"
      />

      <div className="field" style={{ marginTop:10 }}>
        <label>Hospital / clinic <span style={{ fontWeight:400,opacity:.6 }}>(optional)</span></label>
        <input className="input" type="text" placeholder="e.g. St Vincent's Hospital"
          value={implant.hospital}
          onChange={e => onChange(implant.id, 'hospital', e.target.value)} />
      </div>

      <div className="field" style={{ marginTop:10 }}>
        <label>Approximate date <span style={{ fontWeight:400,opacity:.6 }}>(optional)</span></label>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 100px', gap:8 }}>
          <InlineSelect value={implant.month} onChange={v => onChange(implant.id,'month',v)} placeholder="Month"
            options={MONTHS.map((m,i)=>({ label:m, value:String(i+1).padStart(2,'0') }))} />
          <InlineSelect value={implant.year} onChange={v => onChange(implant.id,'year',v)} placeholder="Year" options={years} />
        </div>
      </div>
    </div>
  )
}

// ── Summary row ───────────────────────────────────────────────────────────────

function SumRow({ label, value }: { label: string; value?: string }) {
  return (
    <div style={{ display:'flex', justifyContent:'space-between', gap:12, padding:'8px 0', borderBottom:'1px solid var(--border)' }}>
      <span style={{ fontSize:13, color:'var(--muted)', flexShrink:0 }}>{label}</span>
      <span style={{ fontSize:13.5, fontWeight:500, textAlign:'right' }}>
        {value || <span style={{ color:'var(--muted2)', fontWeight:400 }}>Not provided</span>}
      </span>
    </div>
  )
}

// ── Side panel steps ──────────────────────────────────────────────────────────

function SideSteps({ current }: { current: Step }) {
  const idx = STEP_META.findIndex(s => s.id === current)
  return (
    <div className="reg-side-steps">
      {STEP_META.map((s, i) => {
        const state = i === idx ? 'active' : i < idx ? 'done' : 'future'
        return (
          <div key={s.id} className={`reg-side-step ${state}`}>
            <div className="reg-side-step-num">
              {state === 'done'
                ? <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true"><path d="M20 6 9 17l-5-5"/></svg>
                : i + 1
              }
            </div>
            <div>
              <div className="reg-side-step-title">{s.label}</div>
              <div className="reg-side-step-desc">{s.desc}</div>
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

export default function RegisterClient() {
  const { user }        = useUser()
  const createPatient   = useMutation(api.patients.createPatient)
  const router          = useRouter()
  const existingPatient = useQuery(api.patients.getMyPatient)

  // Step 1 — personal details
  const [firstName,   setFirstName]   = useState(user?.firstName ?? '')
  const [lastName,    setLastName]    = useState(user?.lastName  ?? '')
  const [dobDay,      setDobDay]      = useState('')
  const [dobMonth,    setDobMonth]    = useState('')
  const [dobYear,     setDobYear]     = useState('')
  const [phone,       setPhone]       = useState(user?.primaryPhoneNumber?.phoneNumber ?? '')
  const [country,     setCountry]     = useState('')

  // Step 2 — implant
  const [selectedDevice, setSelectedDevice] = useState<SelectedDevice | null>(null)
  const [deviceType,     setDeviceType]     = useState('')
  const [implantMonth,   setImplantMonth]   = useState('')
  const [implantYear,    setImplantYear]    = useState('')
  const [hospital,       setHospital]       = useState('')
  const [surgeon,        setSurgeon]        = useState('')
  const [additionalImplants, setAdditionalImplants] = useState<AdditionalImplant[]>([])

  // Step 3 — emergency contact
  const [ecName,     setEcName]     = useState('')
  const [ecPhone,    setEcPhone]    = useState('')
  const [ecRelation, setEcRelation] = useState('')

  // Step 4 — summary / notes
  const [notes, setNotes] = useState('')

  // UI
  const [step,    setStep]    = useState<Step>('details')
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState('')

  // Pre-fill from Clerk once loaded
  useEffect(() => {
    if (user?.firstName && !firstName) setFirstName(user.firstName)
    if (user?.lastName  && !lastName)  setLastName(user.lastName)
    if (user?.primaryPhoneNumber?.phoneNumber && !phone)
      setPhone(user.primaryPhoneNumber.phoneNumber)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user])

  // Redirect if already registered
  useEffect(() => {
    if (existingPatient) router.replace('/patients/dashboard')
  }, [existingPatient, router])

  if (existingPatient === undefined || existingPatient) return null

  const clerkPhone = user?.primaryPhoneNumber?.phoneNumber ?? ''

  function err(msg: string) { setError(msg); setLoading(false) }
  function clearErr()        { setError('') }

  // ── Step handlers ────────────────────────────────────────────────────────

  function goToImplant(e: React.FormEvent) {
    e.preventDefault(); clearErr()
    if (!firstName.trim()) return err('Enter your first name')
    if (!lastName.trim())  return err('Enter your last name')
    if (!dobDay || !dobMonth || !dobYear) return err('Select your full date of birth')
    const dob = new Date(`${dobYear}-${dobMonth}-${dobDay}`)
    if (isNaN(dob.getTime())) return err('Enter a valid date of birth')
    if (dob > new Date())     return err('Date of birth cannot be in the future')
    setStep('implant')
  }

  function goToEmergency(e: React.FormEvent) {
    e.preventDefault(); clearErr()
    if (!selectedDevice?.device_name && !selectedDevice) return err('Search for your implant device or enter it manually')
    setStep('emergency')
  }

  function goToSummary(e: React.FormEvent) {
    e.preventDefault(); clearErr()
    if (!ecName.trim())  return err("Enter your emergency contact's name")
    if (!ecPhone.trim()) return err('Enter their phone number')
    if (!ecRelation)     return err('Select their relationship to you')
    setStep('summary')
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault(); clearErr(); setLoading(true)
    try {
      const dob    = `${dobYear}-${dobMonth}-${dobDay}`
      const extras = additionalImplants.length > 0
        ? JSON.stringify(additionalImplants.map(a => ({
            deviceName: a.deviceName,
            deviceType: a.deviceType,
            hospital:   a.hospital,
            month:      a.month,
            year:       a.year,
          })))
        : undefined

      const result = await createPatient({
        firstName: firstName.trim(),
        lastName:  lastName.trim(),
        dob,
        phone:          phone.trim() || undefined,
        countryOfBirth: country || undefined,

        selfReportedDevice:       selectedDevice?.device_name || undefined,
        selfReportedDeviceId:     selectedDevice?.device_id   || undefined,
        selfReportedManufacturer: selectedDevice?.manufacturer || undefined,
        selfReportedModelNumber:  selectedDevice?.model_number || undefined,
        selfReportedDeviceType:   deviceType || selectedDevice?.device_type || undefined,
        selfReportedImplantMonth: implantMonth || undefined,
        selfReportedImplantYear:  implantYear  || undefined,
        selfReportedHospital:     hospital.trim() || undefined,
        selfReportedSurgeon:      surgeon.trim()  || undefined,
        selfReportedImplants:     extras,

        emergencyContactName:     ecName.trim(),
        emergencyContactPhone:    ecPhone.trim(),
        emergencyContactRelation: ecRelation,
        additionalNotes:          notes.trim() || undefined,
      })

      if (typeof sessionStorage !== 'undefined') {
        const code = result && typeof result === 'object' && 'implantIdCode' in result
          ? (result as { implantIdCode: string }).implantIdCode : ''
        sessionStorage.setItem('iid_just_registered', code)
      }
      router.replace('/patients/dashboard')
    } catch (e) {
      err((e as { message?: string })?.message ?? 'Something went wrong — please try again')
    } finally {
      setLoading(false)
    }
  }

  // ── Additional implant helpers ───────────────────────────────────────────

  function addImplant() {
    setAdditionalImplants(prev => [
      ...prev,
      { id: uid(), deviceName:'', deviceType:'', hospital:'', month:'', year:'' },
    ])
  }

  function updateImplant(id: string, field: keyof AdditionalImplant, val: string) {
    setAdditionalImplants(prev => prev.map(a => a.id === id ? { ...a, [field]: val } : a))
  }

  function removeImplant(id: string) {
    setAdditionalImplants(prev => prev.filter(a => a.id !== id))
  }

  // ── Formatted display values ─────────────────────────────────────────────

  const dobFormatted = dobDay && dobMonth && dobYear
    ? `${parseInt(dobDay, 10)} ${MONTHS[parseInt(dobMonth) - 1]} ${dobYear}` : ''
  const implantDateFormatted = implantYear
    ? (implantMonth ? `${MONTHS[parseInt(implantMonth) - 1]} ${implantYear}` : implantYear) : ''
  const stepIdx = STEP_META.findIndex(s => s.id === step)

  // ── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="reg-split">

      {/* ── Left panel ──────────────────────────────────────────────────── */}
      <div className="reg-side">
        <a href="/" className="reg-side-logo">
          <img src="/icon.svg" alt="" />
          <span className="logo-text"><b>Implant</b><span>ID</span></span>
        </a>

        <div className="reg-side-copy">
          <h1>Your implant.<br/>Always with you.</h1>
          <p>
            Create your secure digital implant record in minutes. Clinicians and
            radiographers can instantly access the information they need — safely.
          </p>
        </div>

        <SideSteps current={step} />

        <div className="reg-side-trust">
          <span>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
            Encrypted &amp; secure
          </span>
          <span>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
            Clinician verified
          </span>
          <span>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><rect x="5" y="2" width="14" height="20" rx="2" ry="2"/><path d="M12 18h.01"/></svg>
            Wallet pass ready
          </span>
        </div>
      </div>

      {/* ── Right panel ─────────────────────────────────────────────────── */}
      <div className="reg-main">
        <div className="reg-box">

          {/* Progress dots */}
          <div className="reg-dots">
            {STEP_META.map((s, i) => (
              <div key={s.id} className={`reg-dot${i === stepIdx ? ' active' : i < stepIdx ? ' done' : ''}`} />
            ))}
          </div>

          {/* Step label */}
          <div className="reg-step-label">
            Step {stepIdx + 1} of {STEP_META.length} — {STEP_META[stepIdx].label}
          </div>

          {/* Error */}
          {error && (
            <div className="reg-error">{error}</div>
          )}

          {/* ── Step 1: About you ──────────────────────────────────────── */}
          {step === 'details' && (
            <>
              <h2 className="reg-h2">Create your patient record</h2>
              <p className="reg-sub">
                We'll use your name and date of birth to generate your unique Implant ID.
                These cannot be changed later, so please be accurate.
              </p>
              <form onSubmit={goToImplant}>
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
                  <div className="field">
                    <label>First name<span style={{ color:'var(--err)',marginLeft:3 }}>*</span></label>
                    <input className="input" type="text" placeholder="Jane" autoComplete="given-name"
                      value={firstName} onChange={e => setFirstName(e.target.value)} />
                  </div>
                  <div className="field">
                    <label>Last name<span style={{ color:'var(--err)',marginLeft:3 }}>*</span></label>
                    <input className="input" type="text" placeholder="Smith" autoComplete="family-name"
                      value={lastName} onChange={e => setLastName(e.target.value)} />
                  </div>
                </div>

                <DobPicker
                  day={dobDay} month={dobMonth} year={dobYear}
                  onDay={setDobDay} onMonth={setDobMonth} onYear={setDobYear}
                />

                <CustomSelect
                  label="Country of birth"
                  value={country} onChange={setCountry}
                  options={COUNTRIES}
                  placeholder="Select country"
                />

                <div className="field">
                  <label>Phone number <span style={{ fontWeight:400,opacity:.6 }}>(optional)</span></label>
                  <input className="input" type="tel" placeholder="+44 7700 900000"
                    autoComplete="tel" value={phone}
                    onChange={e => setPhone(e.target.value)}
                    readOnly={!!clerkPhone}
                    style={clerkPhone ? { background:'var(--bg)', color:'var(--muted)' } : undefined}
                  />
                  {clerkPhone && <span className="hint">From your sign-up — contact support to change</span>}
                </div>

                <button type="submit" className="btn btn-s btn-lg btn-block" style={{ marginTop:8 }}>
                  Continue →
                </button>
              </form>
            </>
          )}

          {/* ── Step 2: Your implant ───────────────────────────────────── */}
          {step === 'implant' && (
            <>
              <h2 className="reg-h2">Tell us about your implant</h2>
              <p className="reg-sub">
                Search for your device in our database, or enter it manually.
                A clinician will verify the details before your record goes live.
              </p>
              <form onSubmit={goToEmergency}>

                <div className="field">
                  <label>Find your device<span style={{ color:'var(--err)',marginLeft:3 }}>*</span></label>
                  <DeviceSearch onSelect={dev => {
                    setSelectedDevice(dev)
                    if (dev?.device_type) setDeviceType(dev.device_type)
                  }} />
                </div>

                <CustomSelect
                  label="Type of implant"
                  value={deviceType} onChange={setDeviceType}
                  options={DEVICE_TYPES}
                  placeholder="Select device type"
                />

                <ImplantDatePicker
                  month={implantMonth} year={implantYear}
                  onMonth={setImplantMonth} onYear={setImplantYear}
                />

                <div className="field">
                  <label>Hospital or clinic <span style={{ fontWeight:400,opacity:.6 }}>(optional)</span></label>
                  <input className="input" type="text"
                    placeholder="e.g. St Vincent's Hospital, London"
                    value={hospital} onChange={e => setHospital(e.target.value)} />
                </div>

                <div className="field">
                  <label>Implanting surgeon <span style={{ fontWeight:400,opacity:.6 }}>(optional)</span></label>
                  <input className="input" type="text"
                    placeholder="e.g. Mr James Holt"
                    value={surgeon} onChange={e => setSurgeon(e.target.value)} />
                </div>

                {/* Additional implants */}
                {additionalImplants.map(a => (
                  <AdditionalImplantBlock
                    key={a.id}
                    implant={a}
                    onChange={updateImplant}
                    onRemove={removeImplant}
                  />
                ))}

                <button type="button" onClick={addImplant} className="add-implant-btn">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg>
                  Add another implant
                </button>

                <div className="reg-info-box" style={{ marginTop:16 }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true" style={{ flexShrink:0, marginTop:1 }}>
                    <circle cx="12" cy="12" r="10"/><path d="M12 8v4M12 16h.01"/>
                  </svg>
                  <span>
                    Your details will be sent to your clinical team for verification.
                    They'll contact your hospital before your full record and wallet pass are activated.
                  </span>
                </div>

                <div style={{ display:'flex', gap:10, marginTop:20 }}>
                  <button type="button" className="btn btn-lg" onClick={() => { setStep('details'); clearErr() }}>← Back</button>
                  <button type="submit" className="btn btn-s btn-lg" style={{ flex:1 }}>Continue →</button>
                </div>
              </form>
            </>
          )}

          {/* ── Step 3: Emergency contact ──────────────────────────────── */}
          {step === 'emergency' && (
            <>
              <h2 className="reg-h2">Emergency contact</h2>
              <p className="reg-sub">
                This person can be contacted in a medical emergency and their details
                will be visible to clinicians when you share your record.
              </p>
              <form onSubmit={goToSummary}>
                <div className="field">
                  <label>Full name<span style={{ color:'var(--err)',marginLeft:3 }}>*</span></label>
                  <input className="input" type="text" placeholder="e.g. Sarah Smith"
                    value={ecName} onChange={e => setEcName(e.target.value)} />
                </div>

                <CustomSelect
                  label="Relationship to you" required
                  value={ecRelation} onChange={setEcRelation}
                  options={RELATIONS}
                  placeholder="Select relationship"
                />

                <div className="field">
                  <label>Their phone number<span style={{ color:'var(--err)',marginLeft:3 }}>*</span></label>
                  <input className="input" type="tel" placeholder="+44 7700 900000"
                    value={ecPhone} onChange={e => setEcPhone(e.target.value)} />
                </div>

                <div style={{ display:'flex', gap:10, marginTop:8 }}>
                  <button type="button" className="btn btn-lg" onClick={() => { setStep('implant'); clearErr() }}>← Back</button>
                  <button type="submit" className="btn btn-s btn-lg" style={{ flex:1 }}>Continue →</button>
                </div>
              </form>
            </>
          )}

          {/* ── Step 4: Summary ────────────────────────────────────────── */}
          {step === 'summary' && (
            <>
              <h2 className="reg-h2">Review your record</h2>
              <p className="reg-sub">
                Double-check everything before we create your Implant ID.
                Your name and date of birth cannot be changed later.
              </p>
              <form onSubmit={submit}>

                {/* Personal */}
                <div style={{ marginBottom:20 }}>
                  <div className="sum-section-header">
                    <span className="sum-section-label">About you</span>
                    <button type="button" className="sum-edit-btn" onClick={() => { setStep('details'); clearErr() }}>Edit</button>
                  </div>
                  <SumRow label="Name"          value={`${firstName} ${lastName}`} />
                  <SumRow label="Date of birth" value={dobFormatted} />
                  <SumRow label="Country"       value={country || undefined} />
                  <SumRow label="Phone"         value={phone || undefined} />
                </div>

                {/* Implant */}
                <div style={{ marginBottom:20 }}>
                  <div className="sum-section-header">
                    <span className="sum-section-label">Your implant</span>
                    <button type="button" className="sum-edit-btn" onClick={() => { setStep('implant'); clearErr() }}>Edit</button>
                  </div>
                  <SumRow label="Device"       value={selectedDevice?.device_name || undefined} />
                  <SumRow label="Manufacturer" value={selectedDevice?.manufacturer || undefined} />
                  <SumRow label="Type"         value={deviceType || undefined} />
                  <SumRow label="Date"         value={implantDateFormatted || undefined} />
                  <SumRow label="Hospital"     value={hospital || undefined} />
                  <SumRow label="Surgeon"      value={surgeon  || undefined} />
                  {additionalImplants.length > 0 && (
                    <SumRow label={`+ ${additionalImplants.length} more`}
                      value={additionalImplants.map(a => a.deviceName).filter(Boolean).join(', ')} />
                  )}
                </div>

                {/* Emergency */}
                <div style={{ marginBottom:20 }}>
                  <div className="sum-section-header">
                    <span className="sum-section-label">Emergency contact</span>
                    <button type="button" className="sum-edit-btn" onClick={() => { setStep('emergency'); clearErr() }}>Edit</button>
                  </div>
                  <SumRow label="Name"         value={ecName} />
                  <SumRow label="Relationship" value={ecRelation} />
                  <SumRow label="Phone"        value={ecPhone} />
                </div>

                {/* Notes */}
                <div className="field">
                  <label>Additional notes <span style={{ fontWeight:400,opacity:.6 }}>(optional)</span></label>
                  <textarea className="input" rows={3}
                    placeholder="Allergies, blood type, other conditions a clinician should know…"
                    value={notes} onChange={e => setNotes(e.target.value)} />
                  <span className="hint">Only visible to clinicians you explicitly share with</span>
                </div>

                <div style={{ display:'flex', gap:10, marginTop:8 }}>
                  <button type="button" className="btn btn-lg" onClick={() => { setStep('emergency'); clearErr() }}>← Back</button>
                  <button type="submit" className="btn btn-s btn-lg" style={{ flex:1 }} disabled={loading}>
                    {loading ? 'Creating your record…' : 'Create my Implant ID →'}
                  </button>
                </div>
              </form>
            </>
          )}

        </div>
      </div>
    </div>
  )
}
