'use client'
import { useState } from 'react'
import { useMutation } from 'convex/react'
import { api } from '../../../../convex/_generated/api'
import { useRouter } from 'next/navigation'

type Step = 'details' | 'contact' | 'done'

export default function RegisterClient() {
  const createPatient = useMutation(api.patients.createPatient)
  const router        = useRouter()

  const [step,        setStep]        = useState<Step>('details')
  const [firstName,   setFirstName]   = useState('')
  const [lastName,    setLastName]    = useState('')
  const [dob,         setDob]         = useState('')
  const [phone,       setPhone]       = useState('')
  const [address,     setAddress]     = useState('')
  const [iidCode,     setIidCode]     = useState('')
  const [loading,     setLoading]     = useState(false)
  const [error,       setError]       = useState('')

  function err(msg: string) { setError(msg); setLoading(false) }

  // ── Step 1: validate name + DOB ──────────────────────────────────────────
  function goToContact(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (!firstName.trim())   return err('Enter your first name')
    if (!lastName.trim())    return err('Enter your last name')
    if (!dob)                return err('Enter your date of birth')

    const dobDate = new Date(dob)
    if (isNaN(dobDate.getTime()))    return err('Enter a valid date of birth')
    if (dobDate > new Date())         return err('Date of birth cannot be in the future')
    const age = (Date.now() - dobDate.getTime()) / (1000 * 60 * 60 * 24 * 365.25)
    if (age > 130)                    return err('Please check your date of birth')

    setStep('contact')
  }

  // ── Step 2: create patient record ────────────────────────────────────────
  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true); setError('')
    try {
      const result = await createPatient({
        firstName: firstName.trim(),
        lastName:  lastName.trim(),
        dob,
        phone:   phone.trim()   || undefined,
        address: address.trim() || undefined,
      })
      // result is { id, implantIdCode } for new patients or just Id for idempotent re-calls
      if (result && typeof result === 'object' && 'implantIdCode' in result) {
        setIidCode((result as { implantIdCode: string }).implantIdCode)
      }
      setStep('done')
      setTimeout(() => router.replace('/patients/dashboard'), 3000)
    } catch (e) {
      const msg = (e as { message?: string })?.message ?? 'Something went wrong'
      err(msg)
    } finally {
      setLoading(false)
    }
  }

  const stepNum = step === 'details' ? 1 : step === 'contact' ? 2 : 3

  return (
    <div className="reg">
      <div className="reg-card">

        {/* Logo */}
        <a href="/" className="reg-logo">
          <img src="/icon.svg" alt="" />
          <span className="logo-text"><b>Implant</b><span>ID</span></span>
        </a>

        {/* Step indicator */}
        <div className="reg-steps">
          <div className={`reg-step${stepNum >= 1 ? (stepNum > 1 ? ' done' : ' active') : ''}`}>
            <div className="reg-step-dot">{stepNum > 1 ? '✓' : '1'}</div>
            <span>About you</span>
          </div>
          <div className={`reg-step-line${stepNum > 1 ? ' done' : ''}`} />
          <div className={`reg-step${stepNum >= 2 ? (stepNum > 2 ? ' done' : ' active') : ''}`}>
            <div className="reg-step-dot">{stepNum > 2 ? '✓' : '2'}</div>
            <span>Contact</span>
          </div>
          <div className={`reg-step-line${stepNum > 2 ? ' done' : ''}`} />
          <div className={`reg-step${stepNum >= 3 ? ' active' : ''}`}>
            <div className="reg-step-dot">3</div>
            <span>Done</span>
          </div>
        </div>

        {/* Error banner */}
        {error && (
          <div style={{
            background: 'color-mix(in srgb,var(--err) 10%,transparent)',
            border: '1px solid color-mix(in srgb,var(--err) 25%,transparent)',
            borderRadius: 10,
            padding: '10px 14px',
            fontSize: 13.5,
            color: 'var(--err)',
            marginBottom: 20,
          }}>
            {error}
          </div>
        )}

        {/* ── Step 1: name + DOB ─────────────────────────────────────────── */}
        {step === 'details' && (
          <>
            <h1>Create your patient record</h1>
            <p className="sub">
              We'll use your name and date of birth to generate your unique Implant ID.
              These can't be changed later, so please be accurate.
            </p>
            <form onSubmit={goToContact}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div className="field">
                  <label>First name</label>
                  <input
                    className="input"
                    type="text"
                    placeholder="Jane"
                    autoComplete="given-name"
                    value={firstName}
                    onChange={e => setFirstName(e.target.value)}
                  />
                </div>
                <div className="field">
                  <label>Last name</label>
                  <input
                    className="input"
                    type="text"
                    placeholder="Smith"
                    autoComplete="family-name"
                    value={lastName}
                    onChange={e => setLastName(e.target.value)}
                  />
                </div>
              </div>
              <div className="field">
                <label>Date of birth</label>
                <input
                  className="input"
                  type="date"
                  value={dob}
                  max={new Date().toISOString().slice(0, 10)}
                  onChange={e => setDob(e.target.value)}
                />
                <span className="hint">Used to generate your unique ID — never shared without your consent</span>
              </div>
              <button type="submit" className="btn btn-s btn-lg btn-block" style={{ marginTop: 8 }}>
                Continue →
              </button>
            </form>
          </>
        )}

        {/* ── Step 2: contact details (optional) ─────────────────────────── */}
        {step === 'contact' && (
          <>
            <h1>Contact details</h1>
            <p className="sub">
              Optional — but useful if a clinic needs to reach you. You can add or update these any time from your account settings.
            </p>
            <form onSubmit={submit}>
              <div className="field">
                <label>Phone number <span style={{ fontWeight: 400, opacity: .65 }}>(optional)</span></label>
                <input
                  className="input"
                  type="tel"
                  placeholder="+44 7700 900000"
                  autoComplete="tel"
                  value={phone}
                  onChange={e => setPhone(e.target.value)}
                />
              </div>
              <div className="field">
                <label>Home address <span style={{ fontWeight: 400, opacity: .65 }}>(optional)</span></label>
                <textarea
                  className="input"
                  rows={3}
                  placeholder="1 Example Street, London, EC1A 1BB"
                  autoComplete="street-address"
                  value={address}
                  onChange={e => setAddress(e.target.value)}
                />
              </div>
              <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
                <button
                  type="button"
                  className="btn btn-lg"
                  onClick={() => { setStep('details'); setError('') }}
                >
                  ← Back
                </button>
                <button type="submit" className="btn btn-s btn-lg" style={{ flex: 1 }} disabled={loading}>
                  {loading ? 'Creating your record…' : 'Create my record →'}
                </button>
              </div>
              <p style={{ textAlign: 'center', marginTop: 14, fontSize: 13, color: 'var(--muted2)' }}>
                You can skip this and add it later
              </p>
            </form>
          </>
        )}

        {/* ── Step 3: done ────────────────────────────────────────────────── */}
        {step === 'done' && (
          <div className="reg-success">
            <div className="reg-success-ic">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                <path d="m9 12 2 2 4-4"/>
              </svg>
            </div>
            <h1>Your record is ready</h1>
            <p className="sub" style={{ marginBottom: 12 }}>
              Your unique Implant ID has been created and is ready to use.
              Taking you to your dashboard now…
            </p>
            <div style={{ display: 'flex', justifyContent: 'center', margin: '20px 0' }}>
              <div
                style={{
                  display: 'inline-flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  background: 'color-mix(in srgb,var(--accent) 8%,transparent)',
                  border: '1px solid color-mix(in srgb,var(--accent) 22%,transparent)',
                  borderRadius: 14,
                  padding: '16px 28px',
                }}
              >
                <span style={{ fontFamily: 'var(--ff)', fontSize: 10, letterSpacing: '1.4px', textTransform: 'uppercase', color: 'var(--muted2)', fontWeight: 600, marginBottom: 6 }}>
                  Your Implant ID
                </span>
                <span style={{ fontFamily: 'var(--ff)', fontSize: 24, fontWeight: 600, color: 'var(--accent-deep)', letterSpacing: .5 }}>
                  {iidCode || '…'}
                </span>
              </div>
            </div>
            <p style={{ fontSize: 13, color: 'var(--muted2)', marginTop: 8 }}>Redirecting in a moment…</p>
          </div>
        )}

      </div>
    </div>
  )
}
