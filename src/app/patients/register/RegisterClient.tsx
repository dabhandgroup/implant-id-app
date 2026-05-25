'use client'
import { useState, useRef, useEffect } from 'react'
import { useUser }    from '@clerk/nextjs'
import { useMutation } from 'convex/react'
import { api }         from '../../../../convex/_generated/api'
import { useRouter }   from 'next/navigation'

type Step = 'details' | 'implant' | 'emergency' | 'summary'

const MONTHS = ['January','February','March','April','May','June',
                'July','August','September','October','November','December']

const DEVICE_TYPES = [
  'Pacemaker',
  'ICD / Defibrillator',
  'CRT-P / CRT-D (Cardiac resynchronisation)',
  'Hip replacement',
  'Knee replacement',
  'Spinal implant / disc',
  'Cochlear implant',
  'Neurostimulator / DBS',
  'Insulin pump',
  'Other',
]

const RELATIONS = ['Partner / Spouse','Parent','Child','Sibling','Friend','Carer','Other']

// ── Custom dropdown ───────────────────────────────────────────────────────────

function CustomSelect({
  label, hint, value, onChange, options, placeholder, required,
}: {
  label: string; hint?: string; value: string
  onChange: (v: string) => void; options: string[]
  placeholder?: string; required?: boolean
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  // Close on outside click
  useEffect(() => {
    if (!open) return
    function handle(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handle)
    return () => document.removeEventListener('mousedown', handle)
  }, [open])

  // Close on Escape
  useEffect(() => {
    if (!open) return
    function handle(e: KeyboardEvent) { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('keydown', handle)
    return () => document.removeEventListener('keydown', handle)
  }, [open])

  return (
    <div className="field">
      {label && (
        <label>
          {label}
          {required && <span style={{ color: 'var(--err)', marginLeft: 3 }}>*</span>}
        </label>
      )}
      <div ref={ref} style={{ position: 'relative' }}>
        <button
          type="button"
          className="select cselect-btn"
          onClick={() => setOpen(v => !v)}
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            width: '100%', textAlign: 'left', cursor: 'pointer',
            color: value ? 'var(--text)' : 'var(--muted2)',
          }}
        >
          <span>{value || (placeholder ?? 'Select…')}</span>
          <svg
            width="14" height="14" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" strokeWidth="2"
            style={{ flexShrink: 0, transition: 'transform .2s', transform: open ? 'rotate(180deg)' : 'none' }}
          >
            <polyline points="6 9 12 15 18 9"/>
          </svg>
        </button>

        {open && (
          <div style={{
            position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0, zIndex: 999,
            background: 'var(--bg2)', border: '1px solid var(--border)',
            borderRadius: 12, overflow: 'hidden',
            boxShadow: '0 12px 40px -8px rgba(14,42,51,.18)',
          }}>
            {options.map(o => (
              <button
                key={o}
                type="button"
                onClick={() => { onChange(o); setOpen(false) }}
                style={{
                  display: 'block', width: '100%', textAlign: 'left',
                  padding: '10px 14px',
                  fontFamily: 'var(--ff)', fontSize: 14, fontWeight: 400,
                  background: o === value ? 'color-mix(in srgb,var(--accent) 10%,transparent)' : 'transparent',
                  color: o === value ? 'var(--accent-deep)' : 'var(--text)',
                  border: 'none', cursor: 'pointer',
                  transition: 'background .1s',
                }}
                onMouseEnter={e => { if (o !== value) (e.currentTarget as HTMLButtonElement).style.background = 'var(--bg)' }}
                onMouseLeave={e => { if (o !== value) (e.currentTarget as HTMLButtonElement).style.background = 'transparent' }}
              >
                {o === value && (
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
                    style={{ marginRight: 8, verticalAlign: -1 }}>
                    <path d="M20 6 9 17l-5-5"/>
                  </svg>
                )}
                {o}
              </button>
            ))}
          </div>
        )}
      </div>
      {hint && <span className="hint">{hint}</span>}
    </div>
  )
}

// ── Custom DOB picker (3 custom selects in a row) ─────────────────────────────

function DobPicker({
  day, month, year, onDay, onMonth, onYear,
}: {
  day: string; month: string; year: string
  onDay: (v: string) => void; onMonth: (v: string) => void; onYear: (v: string) => void
}) {
  const currentYear = new Date().getFullYear()
  const years  = Array.from({ length: 110 }, (_, i) => String(currentYear - i))
  const days   = Array.from({ length: 31 },  (_, i) => String(i + 1).padStart(2, '0'))

  return (
    <div className="field">
      <label>Date of birth<span style={{ color: 'var(--err)', marginLeft: 3 }}>*</span></label>
      <div style={{ display: 'grid', gridTemplateColumns: '80px 1fr 100px', gap: 8 }}>
        <InlineSelect value={day} onChange={onDay} placeholder="Day" options={days} />
        <InlineSelect value={month} onChange={onMonth} placeholder="Month"
          options={MONTHS.map((m, i) => ({ label: m, value: String(i+1).padStart(2,'0') }))}
        />
        <InlineSelect value={year} onChange={onYear} placeholder="Year" options={years} />
      </div>
      <span className="hint">Used to generate your unique Implant ID — never shared without consent</span>
    </div>
  )
}

function ImplantMonthYearPicker({
  month, year, onMonth, onYear,
}: {
  month: string; year: string; onMonth: (v:string)=>void; onYear: (v:string)=>void
}) {
  const currentYear = new Date().getFullYear()
  const years = Array.from({ length: 30 }, (_, i) => String(currentYear - i))

  return (
    <div className="field">
      <label>Approximate date of implant <span style={{ fontWeight: 400, opacity: .6 }}>(optional)</span></label>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 100px', gap: 8 }}>
        <InlineSelect value={month} onChange={onMonth} placeholder="Month"
          options={MONTHS.map((m, i) => ({ label: m, value: String(i+1).padStart(2,'0') }))}
        />
        <InlineSelect value={year} onChange={onYear} placeholder="Year" options={years} />
      </div>
    </div>
  )
}

// Inline compact select — used inside multi-column grid rows
type OptionObj = { label: string; value: string }
function InlineSelect({
  value, onChange, placeholder, options,
}: {
  value: string; onChange: (v: string) => void
  placeholder: string; options: string[] | OptionObj[]
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  const normalised: OptionObj[] = (options as Array<string | OptionObj>).map(o =>
    typeof o === 'string' ? { label: o, value: o } : o
  )
  const selectedLabel = normalised.find(o => o.value === value)?.label ?? ''

  useEffect(() => {
    if (!open) return
    function handle(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handle)
    return () => document.removeEventListener('mousedown', handle)
  }, [open])

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        type="button"
        className="select cselect-btn"
        onClick={() => setOpen(v => !v)}
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          width: '100%', textAlign: 'left', cursor: 'pointer',
          color: value ? 'var(--text)' : 'var(--muted2)',
          padding: '0 10px',
        }}
      >
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {selectedLabel || placeholder}
        </span>
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
          style={{ flexShrink: 0, marginLeft: 4, transition: 'transform .2s', transform: open ? 'rotate(180deg)' : 'none' }}>
          <polyline points="6 9 12 15 18 9"/>
        </svg>
      </button>

      {open && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 4px)', left: 0, minWidth: '100%', zIndex: 999,
          background: 'var(--bg2)', border: '1px solid var(--border)',
          borderRadius: 10, overflow: 'auto', maxHeight: 200,
          boxShadow: '0 12px 40px -8px rgba(14,42,51,.18)',
        }}>
          {normalised.map(o => (
            <button
              key={o.value}
              type="button"
              onClick={() => { onChange(o.value); setOpen(false) }}
              style={{
                display: 'block', width: '100%', textAlign: 'left',
                padding: '9px 12px',
                fontFamily: 'var(--ff)', fontSize: 13.5,
                background: o.value === value ? 'color-mix(in srgb,var(--accent) 10%,transparent)' : 'transparent',
                color: o.value === value ? 'var(--accent-deep)' : 'var(--text)',
                border: 'none', cursor: 'pointer', whiteSpace: 'nowrap',
              }}
            >
              {o.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Step indicator ────────────────────────────────────────────────────────────

const STEPS: { id: Step; label: string }[] = [
  { id: 'details',   label: 'About you' },
  { id: 'implant',   label: 'Your implant' },
  { id: 'emergency', label: 'Emergency' },
  { id: 'summary',   label: 'Summary' },
]

function Steps({ current }: { current: Step }) {
  const idx = STEPS.findIndex(s => s.id === current)
  return (
    <div className="reg-steps">
      {STEPS.map((s, i) => (
        <>
          <div key={s.id} className={`reg-step${i === idx ? ' active' : i < idx ? ' done' : ''}`}>
            <div className="reg-step-dot">{i < idx ? '✓' : i + 1}</div>
            <span>{s.label}</span>
          </div>
          {i < STEPS.length - 1 && (
            <div key={`line-${i}`} className={`reg-step-line${i < idx ? ' done' : ''}`} />
          )}
        </>
      ))}
    </div>
  )
}

// ── Summary row helper ────────────────────────────────────────────────────────

function SumRow({ label, value }: { label: string; value?: string }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, padding: '9px 0', borderBottom: '1px solid var(--border)' }}>
      <span style={{ fontSize: 13, color: 'var(--muted)', fontFamily: 'var(--ff)', flexShrink: 0 }}>{label}</span>
      <span style={{ fontSize: 13.5, fontFamily: 'var(--ff)', fontWeight: 500, textAlign: 'right' }}>
        {value || <span style={{ color: 'var(--muted2)', fontWeight: 400 }}>Not provided</span>}
      </span>
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

export default function RegisterClient() {
  const { user }      = useUser()
  const createPatient = useMutation(api.patients.createPatient)
  const router        = useRouter()

  // ── Step 1: personal details ──────────────────────────────────────────────
  const [firstName, setFirstName] = useState(user?.firstName ?? '')
  const [lastName,  setLastName]  = useState(user?.lastName  ?? '')
  const [dobDay,    setDobDay]    = useState('')
  const [dobMonth,  setDobMonth]  = useState('')
  const [dobYear,   setDobYear]   = useState('')
  const clerkPhone = user?.primaryPhoneNumber?.phoneNumber ?? ''
  const [phone, setPhone] = useState(clerkPhone)

  // ── Step 2: self-reported implant ─────────────────────────────────────────
  const [deviceName,   setDeviceName]   = useState('')
  const [deviceType,   setDeviceType]   = useState('')
  const [implantMonth, setImplantMonth] = useState('')
  const [implantYear,  setImplantYear]  = useState('')
  const [hospital,     setHospital]     = useState('')

  // ── Step 3: emergency contact ─────────────────────────────────────────────
  const [ecName,     setEcName]     = useState('')
  const [ecPhone,    setEcPhone]    = useState('')
  const [ecRelation, setEcRelation] = useState('')

  // ── Step 4: summary / additional notes ───────────────────────────────────
  const [notes, setNotes] = useState('')

  // ── UI state ──────────────────────────────────────────────────────────────
  const [step,    setStep]    = useState<Step>('details')
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState('')

  function err(msg: string) { setError(msg); setLoading(false) }
  function clearErr()       { setError('') }

  // ── Navigation ────────────────────────────────────────────────────────────

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
    if (!deviceName.trim()) return err('Enter the name of your implant device')
    if (!deviceType)        return err('Select the type of device')
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
    e.preventDefault(); clearErr()
    setLoading(true)
    try {
      const dob = `${dobYear}-${dobMonth}-${dobDay}`
      const result = await createPatient({
        firstName: firstName.trim(),
        lastName:  lastName.trim(),
        dob,
        phone: phone.trim() || undefined,

        selfReportedDevice:       deviceName.trim() || undefined,
        selfReportedDeviceType:   deviceType        || undefined,
        selfReportedImplantMonth: implantMonth      || undefined,
        selfReportedImplantYear:  implantYear       || undefined,
        selfReportedHospital:     hospital.trim()   || undefined,

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

  // Derived display values for summary
  const dobFormatted = dobDay && dobMonth && dobYear
    ? `${dobDay} ${MONTHS[parseInt(dobMonth) - 1]} ${dobYear}` : ''
  const implantDateFormatted = implantYear
    ? (implantMonth ? `${MONTHS[parseInt(implantMonth) - 1]} ${implantYear}` : implantYear) : ''

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="reg">
      <div className="reg-card">

        {/* Logo */}
        <a href="/" className="reg-logo">
          <img src="/icon.svg" alt="" />
          <span className="logo-text"><b>Implant</b><span>ID</span></span>
        </a>

        <Steps current={step} />

        {/* Error banner */}
        {error && (
          <div style={{
            background: 'color-mix(in srgb,var(--err) 10%,transparent)',
            border: '1px solid color-mix(in srgb,var(--err) 25%,transparent)',
            borderRadius: 10, padding: '10px 14px', fontSize: 13.5,
            color: 'var(--err)', marginBottom: 20,
          }}>
            {error}
          </div>
        )}

        {/* ── Step 1: About you ───────────────────────────────────────────── */}
        {step === 'details' && (
          <>
            <h1>Create your patient record</h1>
            <p className="sub">
              We'll use your name and date of birth to generate your unique Implant ID.
              These can't be changed later, so please be accurate.
            </p>
            <form onSubmit={goToImplant}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div className="field">
                  <label>First name<span style={{ color:'var(--err)', marginLeft:3 }}>*</span></label>
                  <input className="input" type="text" placeholder="Jane" autoComplete="given-name"
                    value={firstName} onChange={e => setFirstName(e.target.value)} />
                </div>
                <div className="field">
                  <label>Last name<span style={{ color:'var(--err)', marginLeft:3 }}>*</span></label>
                  <input className="input" type="text" placeholder="Smith" autoComplete="family-name"
                    value={lastName} onChange={e => setLastName(e.target.value)} />
                </div>
              </div>

              <DobPicker
                day={dobDay} month={dobMonth} year={dobYear}
                onDay={setDobDay} onMonth={setDobMonth} onYear={setDobYear}
              />

              <div className="field">
                <label>Phone number</label>
                <input className="input" type="tel" placeholder="+44 7700 900000"
                  autoComplete="tel" value={phone}
                  onChange={e => setPhone(e.target.value)}
                  readOnly={!!clerkPhone}
                  style={clerkPhone ? { background: 'var(--bg)', color: 'var(--muted)' } : undefined}
                />
                {clerkPhone && (
                  <span className="hint">This is the number you signed up with</span>
                )}
              </div>

              <button type="submit" className="btn btn-s btn-lg btn-block" style={{ marginTop: 8 }}>
                Continue →
              </button>
            </form>
          </>
        )}

        {/* ── Step 2: Your implant ────────────────────────────────────────── */}
        {step === 'implant' && (
          <>
            <h1>Your implant details</h1>
            <p className="sub">
              Tell us what you can about your implant. A clinician will verify these
              details with your hospital before your record goes live.
            </p>
            <form onSubmit={goToEmergency}>
              <div className="field">
                <label>Implant name / description<span style={{ color:'var(--err)', marginLeft:3 }}>*</span></label>
                <input className="input" type="text"
                  placeholder="e.g. Medtronic Azure XT DR, ceramic hip, etc."
                  value={deviceName} onChange={e => setDeviceName(e.target.value)}
                />
                <span className="hint">As much or as little as you know is fine</span>
              </div>

              <CustomSelect
                label="Type of implant" required
                value={deviceType} onChange={setDeviceType}
                options={DEVICE_TYPES}
                placeholder="Select device type"
              />

              <ImplantMonthYearPicker
                month={implantMonth} year={implantYear}
                onMonth={setImplantMonth} onYear={setImplantYear}
              />

              <div className="field">
                <label>Hospital or clinic <span style={{ fontWeight:400, opacity:.6 }}>(optional)</span></label>
                <input className="input" type="text"
                  placeholder="e.g. St Vincent's Hospital, London"
                  value={hospital} onChange={e => setHospital(e.target.value)}
                />
              </div>

              <div className="reg-info-box">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{flexShrink:0,marginTop:1}}>
                  <circle cx="12" cy="12" r="10"/><path d="M12 8v4M12 16h.01"/>
                </svg>
                <span>
                  Your implant information will be sent to your clinical team.
                  They'll contact your hospital to verify the details before your
                  full record and wallet pass are activated.
                </span>
              </div>

              <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
                <button type="button" className="btn btn-lg" onClick={() => { setStep('details'); clearErr() }}>
                  ← Back
                </button>
                <button type="submit" className="btn btn-s btn-lg" style={{ flex: 1 }}>
                  Continue →
                </button>
              </div>
            </form>
          </>
        )}

        {/* ── Step 3: Emergency contact ────────────────────────────────────── */}
        {step === 'emergency' && (
          <>
            <h1>Emergency contact</h1>
            <p className="sub">
              This person can be contacted in a medical emergency. This information
              is visible to clinicians when you share your record.
            </p>
            <form onSubmit={goToSummary}>
              <div className="field">
                <label>Full name<span style={{ color:'var(--err)', marginLeft:3 }}>*</span></label>
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
                <label>Their phone number<span style={{ color:'var(--err)', marginLeft:3 }}>*</span></label>
                <input className="input" type="tel" placeholder="+44 7700 900000"
                  value={ecPhone} onChange={e => setEcPhone(e.target.value)} />
              </div>

              <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
                <button type="button" className="btn btn-lg" onClick={() => { setStep('implant'); clearErr() }}>
                  ← Back
                </button>
                <button type="submit" className="btn btn-s btn-lg" style={{ flex: 1 }}>
                  Continue →
                </button>
              </div>
            </form>
          </>
        )}

        {/* ── Step 4: Summary ──────────────────────────────────────────────── */}
        {step === 'summary' && (
          <>
            <h1>Review your record</h1>
            <p className="sub">
              Double-check your details before we create your Implant ID. Your name and
              date of birth can't be changed later.
            </p>
            <form onSubmit={submit}>

              {/* Personal */}
              <div style={{ marginBottom: 20 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                  <span style={{ fontSize: 11, letterSpacing: '1.2px', textTransform: 'uppercase', fontFamily: 'var(--ff)', fontWeight: 600, color: 'var(--muted2)' }}>About you</span>
                  <button type="button" onClick={() => { setStep('details'); clearErr() }} style={{ fontFamily: 'var(--ff)', fontSize: 12, color: 'var(--accent)', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>Edit</button>
                </div>
                <SumRow label="Name"           value={`${firstName} ${lastName}`} />
                <SumRow label="Date of birth"  value={dobFormatted} />
                <SumRow label="Phone"          value={phone || undefined} />
              </div>

              {/* Implant */}
              <div style={{ marginBottom: 20 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                  <span style={{ fontSize: 11, letterSpacing: '1.2px', textTransform: 'uppercase', fontFamily: 'var(--ff)', fontWeight: 600, color: 'var(--muted2)' }}>Your implant</span>
                  <button type="button" onClick={() => { setStep('implant'); clearErr() }} style={{ fontFamily: 'var(--ff)', fontSize: 12, color: 'var(--accent)', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>Edit</button>
                </div>
                <SumRow label="Device"        value={deviceName || undefined} />
                <SumRow label="Type"          value={deviceType || undefined} />
                <SumRow label="Implant date"  value={implantDateFormatted || undefined} />
                <SumRow label="Hospital"      value={hospital || undefined} />
              </div>

              {/* Emergency */}
              <div style={{ marginBottom: 24 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                  <span style={{ fontSize: 11, letterSpacing: '1.2px', textTransform: 'uppercase', fontFamily: 'var(--ff)', fontWeight: 600, color: 'var(--muted2)' }}>Emergency contact</span>
                  <button type="button" onClick={() => { setStep('emergency'); clearErr() }} style={{ fontFamily: 'var(--ff)', fontSize: 12, color: 'var(--accent)', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>Edit</button>
                </div>
                <SumRow label="Name"          value={ecName} />
                <SumRow label="Relationship"  value={ecRelation} />
                <SumRow label="Phone"         value={ecPhone} />
              </div>

              {/* Additional notes */}
              <div className="field">
                <label>Additional notes <span style={{ fontWeight: 400, opacity: .6 }}>(optional)</span></label>
                <textarea className="input" rows={3}
                  placeholder="Allergies, blood type, other conditions a clinician should know…"
                  value={notes} onChange={e => setNotes(e.target.value)}
                />
                <span className="hint">Only visible to clinicians you explicitly share with</span>
              </div>

              <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
                <button type="button" className="btn btn-lg" onClick={() => { setStep('emergency'); clearErr() }}>
                  ← Back
                </button>
                <button type="submit" className="btn btn-s btn-lg" style={{ flex: 1 }} disabled={loading}>
                  {loading ? 'Creating your record…' : 'Create my record →'}
                </button>
              </div>
            </form>
          </>
        )}

      </div>

      <style>{`
        .cselect-btn{
          appearance: none;
          -webkit-appearance: none;
          background: var(--bg2);
          border: 1px solid var(--border);
          border-radius: 10px;
          padding: 0 12px;
          height: 44px;
          font-family: var(--ff);
          font-size: 14px;
          color: var(--text);
          width: 100%;
          transition: border-color .15s;
        }
        .cselect-btn:hover, .cselect-btn:focus{
          border-color: var(--accent);
          outline: none;
        }
      `}</style>
    </div>
  )
}
