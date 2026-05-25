'use client'
import { useState } from 'react'
import { useUser }  from '@clerk/nextjs'
import { useMutation } from 'convex/react'
import { api }         from '../../../../convex/_generated/api'
import { useRouter }   from 'next/navigation'

type Step = 'details' | 'implant' | 'emergency'

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

// ── Tiny helpers ─────────────────────────────────────────────────────────────

function SelectField({
  label, hint, value, onChange, options, placeholder, required,
}: {
  label: string; hint?: string; value: string
  onChange: (v: string) => void; options: string[]
  placeholder?: string; required?: boolean
}) {
  return (
    <div className="field">
      <label>{label}{required && <span style={{color:'var(--err)',marginLeft:3}}>*</span>}</label>
      <select className="select" value={value} onChange={e => onChange(e.target.value)} required={required}>
        <option value="">{placeholder ?? 'Select…'}</option>
        {options.map(o => <option key={o} value={o}>{o}</option>)}
      </select>
      {hint && <span className="hint">{hint}</span>}
    </div>
  )
}

function DobPicker({
  day, month, year,
  onDay, onMonth, onYear,
}: {
  day: string; month: string; year: string
  onDay: (v: string) => void; onMonth: (v: string) => void; onYear: (v: string) => void
}) {
  const currentYear = new Date().getFullYear()
  const years = Array.from({ length: 110 }, (_, i) => String(currentYear - i))
  const days  = Array.from({ length: 31 },  (_, i) => String(i + 1).padStart(2, '0'))

  return (
    <div className="field">
      <label>Date of birth<span style={{color:'var(--err)',marginLeft:3}}>*</span></label>
      <div style={{ display: 'grid', gridTemplateColumns: '80px 1fr 100px', gap: 8 }}>
        <select className="select" value={day}   onChange={e => onDay(e.target.value)}>
          <option value="">Day</option>
          {days.map(d => <option key={d} value={d}>{d}</option>)}
        </select>
        <select className="select" value={month} onChange={e => onMonth(e.target.value)}>
          <option value="">Month</option>
          {MONTHS.map((m, i) => <option key={m} value={String(i+1).padStart(2,'0')}>{m}</option>)}
        </select>
        <select className="select" value={year}  onChange={e => onYear(e.target.value)}>
          <option value="">Year</option>
          {years.map(y => <option key={y} value={y}>{y}</option>)}
        </select>
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
      <label>Approximate date of implant <span style={{fontWeight:400,opacity:.6}}>(optional)</span></label>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 100px', gap: 8 }}>
        <select className="select" value={month} onChange={e => onMonth(e.target.value)}>
          <option value="">Month</option>
          {MONTHS.map((m, i) => <option key={m} value={String(i+1).padStart(2,'0')}>{m}</option>)}
        </select>
        <select className="select" value={year} onChange={e => onYear(e.target.value)}>
          <option value="">Year</option>
          {years.map(y => <option key={y} value={y}>{y}</option>)}
        </select>
      </div>
    </div>
  )
}

// ── Step indicator ────────────────────────────────────────────────────────────

function Steps({ current }: { current: Step }) {
  const steps: { id: Step; label: string }[] = [
    { id: 'details',   label: 'About you' },
    { id: 'implant',   label: 'Your implant' },
    { id: 'emergency', label: 'Emergency contact' },
  ]
  const idx = steps.findIndex(s => s.id === current)

  return (
    <div className="reg-steps">
      {steps.map((s, i) => (
        <>
          <div key={s.id} className={`reg-step${i === idx ? ' active' : i < idx ? ' done' : ''}`}>
            <div className="reg-step-dot">{i < idx ? '✓' : i + 1}</div>
            <span>{s.label}</span>
          </div>
          {i < steps.length - 1 && (
            <div key={`line-${i}`} className={`reg-step-line${i < idx ? ' done' : ''}`} />
          )}
        </>
      ))}
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
  // Phone: pre-fill from Clerk if available
  const clerkPhone = user?.primaryPhoneNumber?.phoneNumber ?? ''
  const [phone, setPhone] = useState(clerkPhone)

  // ── Step 2: self-reported implant ─────────────────────────────────────────
  const [deviceName,    setDeviceName]    = useState('')
  const [deviceType,    setDeviceType]    = useState('')
  const [implantMonth,  setImplantMonth]  = useState('')
  const [implantYear,   setImplantYear]   = useState('')
  const [hospital,      setHospital]      = useState('')

  // ── Step 3: emergency contact ─────────────────────────────────────────────
  const [ecName,     setEcName]     = useState('')
  const [ecPhone,    setEcPhone]    = useState('')
  const [ecRelation, setEcRelation] = useState('')
  const [notes,      setNotes]      = useState('')

  // ── UI state ──────────────────────────────────────────────────────────────
  const [step,    setStep]    = useState<Step>('details')
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState('')

  function err(msg: string) { setError(msg); setLoading(false) }

  // ── Step 1 → 2 ────────────────────────────────────────────────────────────
  function goToImplant(e: React.FormEvent) {
    e.preventDefault(); setError('')
    if (!firstName.trim()) return err('Enter your first name')
    if (!lastName.trim())  return err('Enter your last name')
    if (!dobDay || !dobMonth || !dobYear) return err('Select your full date of birth')
    const dob = new Date(`${dobYear}-${dobMonth}-${dobDay}`)
    if (isNaN(dob.getTime()))  return err('Enter a valid date of birth')
    if (dob > new Date())      return err('Date of birth cannot be in the future')
    setStep('implant')
  }

  // ── Step 2 → 3 ────────────────────────────────────────────────────────────
  function goToEmergency(e: React.FormEvent) {
    e.preventDefault(); setError('')
    if (!deviceName.trim()) return err('Enter the name of your implant device')
    if (!deviceType)        return err('Select the type of device')
    setStep('emergency')
  }

  // ── Step 3 → submit ───────────────────────────────────────────────────────
  async function submit(e: React.FormEvent) {
    e.preventDefault(); setError('')
    if (!ecName.trim())    return err('Enter your emergency contact\'s name')
    if (!ecPhone.trim())   return err('Enter their phone number')
    if (!ecRelation)       return err('Select their relationship to you')
    setLoading(true)
    try {
      const dob = `${dobYear}-${dobMonth}-${dobDay}`
      const result = await createPatient({
        firstName: firstName.trim(),
        lastName:  lastName.trim(),
        dob,
        phone: phone.trim() || undefined,

        selfReportedDevice:       deviceName.trim() || undefined,
        selfReportedDeviceType:   deviceType       || undefined,
        selfReportedImplantMonth: implantMonth     || undefined,
        selfReportedImplantYear:  implantYear      || undefined,
        selfReportedHospital:     hospital.trim()  || undefined,

        emergencyContactName:     ecName.trim(),
        emergencyContactPhone:    ecPhone.trim(),
        emergencyContactRelation: ecRelation,
        additionalNotes:          notes.trim() || undefined,
      })
      // Signal the dashboard to show confetti on first load
      if (typeof sessionStorage !== 'undefined') {
        const code = result && typeof result === 'object' && 'implantIdCode' in result
          ? (result as { implantIdCode: string }).implantIdCode
          : ''
        sessionStorage.setItem('iid_just_registered', code)
      }
      router.replace('/patients/dashboard')
    } catch (e) {
      err((e as { message?: string })?.message ?? 'Something went wrong — please try again')
    } finally {
      setLoading(false)
    }
  }

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
                  <label>First name<span style={{color:'var(--err)',marginLeft:3}}>*</span></label>
                  <input className="input" type="text" placeholder="Jane" autoComplete="given-name"
                    value={firstName} onChange={e => setFirstName(e.target.value)} />
                </div>
                <div className="field">
                  <label>Last name<span style={{color:'var(--err)',marginLeft:3}}>*</span></label>
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
                <label>Implant name / description<span style={{color:'var(--err)',marginLeft:3}}>*</span></label>
                <input className="input" type="text"
                  placeholder="e.g. Medtronic Azure XT DR, ceramic hip, etc."
                  value={deviceName} onChange={e => setDeviceName(e.target.value)}
                />
                <span className="hint">As much or as little as you know is fine</span>
              </div>

              <SelectField
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
                <label>Hospital or clinic <span style={{fontWeight:400,opacity:.6}}>(optional)</span></label>
                <input className="input" type="text"
                  placeholder="e.g. St Vincent's Hospital, London"
                  value={hospital} onChange={e => setHospital(e.target.value)}
                />
              </div>

              {/* Verification info box */}
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
                <button type="button" className="btn btn-lg" onClick={() => { setStep('details'); setError('') }}>
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
            <form onSubmit={submit}>
              <div className="field">
                <label>Full name<span style={{color:'var(--err)',marginLeft:3}}>*</span></label>
                <input className="input" type="text" placeholder="e.g. Sarah Smith"
                  value={ecName} onChange={e => setEcName(e.target.value)} />
              </div>

              <SelectField
                label="Relationship to you" required
                value={ecRelation} onChange={setEcRelation}
                options={RELATIONS}
                placeholder="Select relationship"
              />

              <div className="field">
                <label>Their phone number<span style={{color:'var(--err)',marginLeft:3}}>*</span></label>
                <input className="input" type="tel" placeholder="+44 7700 900000"
                  value={ecPhone} onChange={e => setEcPhone(e.target.value)} />
              </div>

              <div className="field">
                <label>Additional notes <span style={{fontWeight:400,opacity:.6}}>(optional)</span></label>
                <textarea className="input" rows={3}
                  placeholder="Allergies, blood type, other conditions a clinician should know…"
                  value={notes} onChange={e => setNotes(e.target.value)}
                />
              </div>

              <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
                <button type="button" className="btn btn-lg" onClick={() => { setStep('implant'); setError('') }}>
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
    </div>
  )
}
