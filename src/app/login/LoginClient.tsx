'use client'
import { useState, useEffect, useRef } from 'react'
import { useSignIn, useSignUp, useUser } from '@clerk/nextjs'
import { useRouter, useSearchParams } from 'next/navigation'
import { setUserRoleIfNew } from '../actions/setUserRole'

// ── OTP input row ─────────────────────────────────────────────────────────────
// MUST live at module level — not inside LoginClient.
// If defined inside LoginClient, React creates a new function reference on every
// render (triggered by setOtp), treats it as a new component type, unmounts and
// remounts all inputs, and focus is lost after every keystroke.

interface OtpInputsProps {
  otp: string[]
  setOtp: (v: string[]) => void
  onComplete: (code: string) => void
}

function OtpInputs({ otp, setOtp, onComplete }: OtpInputsProps) {

  function handleChange(i: number, raw: string) {
    const clean = raw.replace(/\D/g, '')
    if (clean.length > 1) {
      // iOS/Android autofill delivers the full code as a single onChange — spread it
      const digits = clean.slice(0, 6)
      const next = ['', '', '', '', '', '']
      for (let j = 0; j < digits.length; j++) next[j] = digits[j]
      setOtp(next)
      const inputs = document.querySelectorAll<HTMLInputElement>('.code-input')
      inputs[Math.min(digits.length - 1, 5)]?.focus()
      if (digits.length === 6) onComplete(digits)
      return
    }
    const digit = clean
    const next  = [...otp]; next[i] = digit; setOtp(next)
    if (digit && i < 5) {
      const inputs = document.querySelectorAll<HTMLInputElement>('.code-input')
      inputs[i + 1]?.focus()
    }
    if (i === 5 && digit) {
      const code = [...otp.slice(0, 5), digit].join('')
      if (code.length === 6) onComplete(code)
    }
  }

  function handleKeyDown(i: number, e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') {
      const code = otp.join('')
      if (code.length === 6) onComplete(code)
      return
    }
    if (e.key === 'Backspace' && !otp[i] && i > 0) {
      const next = [...otp]; next[i - 1] = ''; setOtp(next)
      const inputs = document.querySelectorAll<HTMLInputElement>('.code-input')
      inputs[i - 1]?.focus()
    }
  }

  function handlePaste(e: React.ClipboardEvent<HTMLInputElement>) {
    e.preventDefault()
    const digits = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6)
    if (!digits) return
    const next = ['', '', '', '', '', '']
    for (let i = 0; i < digits.length; i++) next[i] = digits[i]
    setOtp(next)
    const inputs = document.querySelectorAll<HTMLInputElement>('.code-input')
    inputs[Math.min(digits.length - 1, 5)]?.focus()
    if (digits.length === 6) onComplete(digits)
  }

  return (
    <div className="code-row">
      {otp.map((v, i) => (
        <input
          key={i}
          maxLength={6}
          inputMode="numeric"
          pattern="[0-9]*"
          autoComplete="one-time-code"
          className="code-input"
          value={v}
          onChange={e => handleChange(i, e.target.value)}
          onKeyDown={e => handleKeyDown(i, e)}
          onPaste={handlePaste}
          onFocus={e => e.target.select()}
        />
      ))}
    </div>
  )
}

// ─── country list ────────────────────────────────────────────────────────────

const COUNTRIES = [
  { flag: '🇦🇺', dial: '+61',  placeholder: '412 345 678',    name: 'Australia' },
  { flag: '🇬🇧', dial: '+44',  placeholder: '7700 900123',    name: 'United Kingdom' },
  { flag: '🇺🇸', dial: '+1',   placeholder: '(201) 555-0123', name: 'United States' },
  { flag: '🇨🇦', dial: '+1',   placeholder: '(204) 555-0123', name: 'Canada' },
  { flag: '🇮🇪', dial: '+353', placeholder: '85 012 3456',    name: 'Ireland' },
  { flag: '🇳🇿', dial: '+64',  placeholder: '21 123 4567',    name: 'New Zealand' },
  { flag: '🇩🇪', dial: '+49',  placeholder: '151 12345678',   name: 'Germany' },
  { flag: '🇫🇷', dial: '+33',  placeholder: '6 12 34 56 78',  name: 'France' },
  { flag: '🇮🇹', dial: '+39',  placeholder: '312 345 6789',   name: 'Italy' },
  { flag: '🇪🇸', dial: '+34',  placeholder: '612 34 56 78',   name: 'Spain' },
  { flag: '🇳🇱', dial: '+31',  placeholder: '6 12345678',     name: 'Netherlands' },
  { flag: '🇮🇳', dial: '+91',  placeholder: '98765 43210',    name: 'India' },
  { flag: '🇯🇵', dial: '+81',  placeholder: '90 1234 5678',   name: 'Japan' },
  { flag: '🇰🇷', dial: '+82',  placeholder: '10 1234 5678',   name: 'South Korea' },
  { flag: '🇧🇷', dial: '+55',  placeholder: '11 91234 5678',  name: 'Brazil' },
  { flag: '🇿🇦', dial: '+27',  placeholder: '71 123 4567',    name: 'South Africa' },
  { flag: '🇸🇬', dial: '+65',  placeholder: '8123 4567',      name: 'Singapore' },
  { flag: '🇦🇪', dial: '+971', placeholder: '50 123 4567',    name: 'UAE' },
  { flag: '🇸🇦', dial: '+966', placeholder: '50 123 4567',    name: 'Saudi Arabia' },
  { flag: '🇵🇰', dial: '+92',  placeholder: '300 1234567',    name: 'Pakistan' },
]

type Tab          = 'patient' | 'clinic'
type PatientPhase = 'phone' | 'phone-otp' | 'email' | 'email-otp' | 'email-pw' | 'mfa-totp'
type ClinicPhase  = 'email' | 'email-otp' | 'password' | 'mfa-totp'

// ─── component ───────────────────────────────────────────────────────────────

export default function LoginClient() {
  const router       = useRouter()
  const searchParams = useSearchParams()
  // If the user arrived via the approval email link, their email is pre-filled
  const prefillEmail = searchParams.get('email') ?? ''
  const prefillRole  = searchParams.get('role') ?? ''

  // Clerk 7 signals API
  const { signIn } = useSignIn()
  const { signUp } = useSignUp() // still needed for patient sign-up flow
  // Already-signed-in detection — hooks must all be at top, unconditionally
  const { isLoaded, isSignedIn, user } = useUser()

  // Redirect to the correct dashboard if the user is already signed in
  useEffect(() => {
    if (!isLoaded || !isSignedIn) return
    const role = (user?.publicMetadata?.role as string | undefined) ?? 'patient'
    if      (role === 'admin')        router.replace('/master/dashboard')
    else if (role === 'clinic_staff')  router.replace('/clinics/dashboard')
    else if (role === 'surgeon')       router.replace('/surgeons/dashboard')
    else if (role === 'manufacturer')  router.replace('/manufacturer/dashboard')
    else                              router.replace('/patients/dashboard')
  }, [isLoaded, isSignedIn, user, router])

  // tab / phase state — default to 'clinic' tab when arriving via approval link,
  // but honour ?role=patient for patient invite emails
  const [tab,      setTab]      = useState<Tab>(prefillRole === 'patient' ? 'patient' : (prefillEmail ? 'clinic' : 'patient'))
  const [patPhase, setPatPhase] = useState<PatientPhase>('phone')
  const [clPhase,  setClPhase]  = useState<ClinicPhase>('email')

  // patient phone
  const [country,       setCountry]       = useState(COUNTRIES[0])
  const [countrySearch, setCountrySearch] = useState('')
  const [countryOpen,   setCountryOpen]   = useState(false)
  const [phone,         setPhone]         = useState('')

  // OTP digits shared between phone + email flows
  const [otp, setOtp] = useState(['', '', '', '', '', ''])

  // clinic email / password — pre-fill from URL param if present
  const [clEmail,    setClEmail]    = useState(prefillEmail)
  const [clPassword, setClPassword] = useState('')
  const [clShowPw,   setClShowPw]   = useState(false)

  // patient email phase
  const [ptEmail,    setPtEmail]    = useState('')
  const [ptPassword, setPtPassword] = useState('')
  const [ptShowPw,   setPtShowPw]   = useState(false)

  // feedback
  const [loading, setLoading] = useState(false)
  const [passkeyLoading, setPasskeyLoading] = useState(false)
  const [error,   setError]   = useState('')

  // MFA — TOTP second factor
  const [mfaDest,    setMfaDest]    = useState('')   // remembered so verify can redirect

  // ── Auto-send OTP when arriving via approval email link ───────────────────
  // Account is always pre-created by the backend on application submission.
  // This just triggers the email code so they land straight on the OTP screen.
  const autoSent = useRef(false)
  useEffect(() => {
    if (!prefillEmail || prefillRole === 'patient' || autoSent.current || !signIn) return
    autoSent.current = true
    ;(async () => {
      setLoading(true)
      try {
        const { error: ce } = await signIn.create({ identifier: prefillEmail })
        if (ce) {
          setError("Your account isn't set up yet. If your clinic has invited you, check your email for an activation link — or contact support@implantid.io.")
          return
        }
        const { error: se } = await signIn.emailCode.sendCode()
        if (se) { setError(cleanMsg(se.message) || 'Could not send code'); return }
        setOtp(['', '', '', '', '', ''])
        setClPhase('email-otp')
      } catch {
        setError('Could not send code — enter your email below and click Continue')
      } finally {
        setLoading(false)
      }
    })()
  }, [signIn, prefillEmail]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── helpers ────────────────────────────────────────────────────────────────

  function err(msg: string) { setError(msg); setLoading(false) }
  function otpVal() { return otp.join('') }

  // Known Clerk error codes → plain-English messages.
  // Empty string = suppress silently (e.g. user dismissed biometric sheet).
  const CLERK_ERR: Record<string, string> = {
    passkey_retrieval_cancelled: '',
    passkey_retrieval_failed:    '',
    passkey_not_supported:       '',
    form_identifier_not_found:   'No account found for that email or phone number.',
    form_password_incorrect:     'Incorrect password — try again.',
    form_code_incorrect:         'That code is incorrect — check it and try again.',
    form_code_expired:           'That code has expired — request a new one.',
    too_many_requests:           'Too many attempts. Please wait a moment and try again.',
    session_exists:              "You're already signed in.",
  }

  // Strip "Clerk: " prefix and (code="…") markers from any raw Clerk message.
  function cleanMsg(raw: string | undefined): string {
    if (!raw) return ''
    return raw
      .replace(/^Clerk:\s*/i, '')
      .replace(/\s*\(code="[^"]*"\)/g, '')
      .trim()
  }

  // Translate a caught Clerk exception into a short plain-English string.
  // Returns '' for errors that should be suppressed silently.
  function clerkErr(e: unknown): string {
    if (!e) return 'Something went wrong'
    const code = (e as any)?.errors?.[0]?.code ?? ''
    if (code && code in CLERK_ERR) return CLERK_ERR[code]
    const msg = cleanMsg(
      (e as any)?.errors?.[0]?.message ??
      (e as any)?.message ??
      String(e)
    )
    return msg || 'Something went wrong'
  }

  // Called after every successful primary factor. If the account has TOTP enabled,
  // Clerk sets status 'needs_second_factor' instead of 'complete' — we intercept
  // that and show the TOTP screen. Otherwise we finalize and navigate as normal.
  async function finalizeAndGo(dest: string) {
    if (signIn!.status === 'needs_second_factor') {
      setMfaDest(dest)
      setOtp(['','','','','',''])
      setError('')
      if (tab === 'patient') setPatPhase('mfa-totp')
      else setClPhase('mfa-totp')
      setLoading(false)
      return
    }
    const { error: fe } = await signIn!.finalize()
    if (fe) return err(cleanMsg(fe.message) || 'Could not complete sign-in')
    // Stamp the role onto Clerk publicMetadata (no-op for existing users)
    const role = tab === 'patient' ? 'patient' : 'clinic_staff'
    await setUserRoleIfNew(role).catch(() => { /* non-fatal */ })
    router.push(dest)
  }

  async function verifyMfaTotp(code?: string) {
    const c = code ?? otpVal()
    if (c.length < 6) return err('Enter the 6-digit code from your authenticator app')
    setLoading(true); setError('')
    try {
      const { error: ve } = await signIn!.mfa.verifyTOTP({ code: c })
      if (ve) return err(cleanMsg(ve.message) || 'Incorrect code — try again')
      const { error: fe } = await signIn!.finalize()
      if (fe) return err(cleanMsg(fe.message) || 'Could not complete sign-in')
      const role = tab === 'patient' ? 'patient' : 'clinic_staff'
      await setUserRoleIfNew(role).catch(() => { /* non-fatal */ })
      router.push(mfaDest)
    } catch (e) {
      const msg = clerkErr(e)
      if (msg) err(msg)
    } finally { setLoading(false) }
  }

  // ── Patient: phone OTP ─────────────────────────────────────────────────────

  async function sendPhoneOtp() {
    const number = phone.trim()
    if (!number) return err('Enter your phone number')
    setLoading(true); setError('')
    try {
      const { error: ce } = await signIn!.create({ identifier: `${country.dial}${number.replace(/\s/g, '')}` })
      if (ce) return err(cleanMsg(ce.message) || 'Could not start sign-in')
      const { error: se } = await signIn!.phoneCode.sendCode()
      if (se) return err(cleanMsg(se.message) || 'Could not send code')
      setOtp(['','','','','','']); setPatPhase('phone-otp')
    } catch (e) { const m = clerkErr(e); if (m) err(m) } finally { setLoading(false) }
  }

  async function verifyPhoneOtp(code?: string) {
    const c = code ?? otpVal()
    if (c.length < 6) return err('Enter the 6-digit code')
    setLoading(true); setError('')
    try {
      const { error: ve } = await signIn!.phoneCode.verifyCode({ code: c })
      if (ve) return err(cleanMsg(ve.message) || 'Invalid code — check and try again')
      await finalizeAndGo('/patients/dashboard')
    } catch (e) { const m = clerkErr(e); if (m) err(m) } finally { setLoading(false) }
  }

  // ── Patient: email + password ──────────────────────────────────────────────

  async function patEmailLogin(e: React.FormEvent) {
    e.preventDefault()
    if (!ptEmail.trim()) return err('Enter your email')
    setLoading(true); setError('')
    try {
      const { error: ce } = await signIn!.password({ identifier: ptEmail, password: ptPassword })
      if (ce) return err(cleanMsg(ce.message) || 'Incorrect email or password')
      await finalizeAndGo('/patients/dashboard')
    } catch (e) { const m = clerkErr(e); if (m) err(m) } finally { setLoading(false) }
  }

  // ── Patient: email OTP ────────────────────────────────────────────────────

  async function sendPatientEmailOtp() {
    if (!ptEmail.trim()) return err('Enter your email')
    setLoading(true); setError('')
    try {
      const { error: ce } = await signIn!.create({ identifier: ptEmail.trim() })
      if (ce) return err(cleanMsg(ce.message) || 'No account found for that email.')
      const { error: se } = await signIn!.emailCode.sendCode()
      if (se) return err(cleanMsg(se.message) || 'Could not send code')
      setOtp(['', '', '', '', '', '']); setPatPhase('email-otp')
    } catch (e) { const m = clerkErr(e); if (m) err(m) } finally { setLoading(false) }
  }

  async function verifyPatientEmailOtp(code?: string) {
    const c = code ?? otpVal()
    if (c.length < 6) return err('Enter the 6-digit code')
    setLoading(true); setError('')
    try {
      const { error: ve } = await signIn!.emailCode.verifyCode({ code: c })
      if (ve) return err(cleanMsg(ve.message) || 'Invalid code — check and try again')
      await finalizeAndGo('/patients/dashboard')
    } catch (e) { const m = clerkErr(e); if (m) err(m) } finally { setLoading(false) }
  }

  // ── Clinic: email OTP ─────────────────────────────────────────────────────

  // ── Clinic / Surgeon: email OTP ──────────────────────────────────────────────
  // Tries sign-in first. If account doesn't exist (e.g. invite Clerk pre-creation
  // failed), automatically falls back to sign-up so the user is never stranded.

  async function sendClinicOtp() {
    if (!clEmail.trim()) return err('Enter your email')
    setLoading(true); setError('')
    try {
      const { error: ce } = await signIn!.create({ identifier: clEmail.trim() })
      if (ce) {
        return err('No account found for this email. If you were recently approved, please wait a few minutes then try again, or contact support@implantid.io.')
      }
      const { error: se } = await signIn!.emailCode.sendCode()
      if (se) return err(cleanMsg(se.message) || 'Could not send code')
      setOtp(['','','','','','']); setClPhase('email-otp')
    } catch (e) { const m = clerkErr(e); if (m) err(m) } finally { setLoading(false) }
  }

  async function verifyClinicOtp(code?: string) {
    const c = code ?? otpVal()
    if (c.length < 6) return err('Enter the 6-digit code')
    setLoading(true); setError('')
    try {
      const { error: ve } = await signIn!.emailCode.verifyCode({ code: c })
      if (ve) return err(cleanMsg(ve.message) || 'Invalid code — check and try again')
      // requireRole on /clinics/dashboard bounces surgeons to /surgeons/dashboard automatically
      await finalizeAndGo('/clinics/dashboard')
    } catch (e) { const m = clerkErr(e); if (m) err(m) } finally { setLoading(false) }
  }

  // ── Clinic: email + password ───────────────────────────────────────────────

  async function clinicPasswordLogin(e: React.FormEvent) {
    e.preventDefault()
    if (!clEmail.trim()) return err('Enter your email')
    setLoading(true); setError('')
    try {
      const { error: pe } = await signIn!.password({ identifier: clEmail, password: clPassword })
      if (pe) return err(cleanMsg(pe.message) || 'Incorrect email or password')
      await finalizeAndGo('/clinics/dashboard')
    } catch (e) { const m = clerkErr(e); if (m) err(m) } finally { setLoading(false) }
  }

  // ── Patient: passkey (Face ID / Touch ID / device PIN) ────────────────────

  async function passkeyLogin() {
    setPasskeyLoading(true); setError('')
    try {
      // flow:'discoverable' = no email needed — OS presents all passkeys for this domain
      const { error: pe } = await signIn!.passkey({ flow: 'discoverable' })
      if (pe) {
        const code = (pe as any)?.code ?? ''
        if (code in CLERK_ERR && !CLERK_ERR[code]) { setPasskeyLoading(false); return }
        setPasskeyLoading(false)
        setError(cleanMsg(pe.message) || 'Could not sign in — try again.')
        return
      }
      await finalizeAndGo('/patients/dashboard')
    } catch (e: unknown) {
      const msg = clerkErr(e)
      setPasskeyLoading(false)
      if (msg) setError(msg)   // empty = silent (user dismissed sheet)
    }
  }

  // ── Clinic: passkey (same discoverable flow, redirects to clinic dashboard) ─

  async function clinicPasskeyLogin() {
    setPasskeyLoading(true); setError('')
    try {
      const { error: pe } = await signIn!.passkey({ flow: 'discoverable' })
      if (pe) {
        const code = (pe as any)?.code ?? ''
        if (code in CLERK_ERR && !CLERK_ERR[code]) { setPasskeyLoading(false); return }
        setPasskeyLoading(false)
        setError(cleanMsg(pe.message) || 'Could not sign in — try again.')
        return
      }
      await finalizeAndGo('/clinics/dashboard')
    } catch (e: unknown) {
      const msg = clerkErr(e)
      setPasskeyLoading(false)
      if (msg) setError(msg)   // empty = silent (user dismissed sheet)
    }
  }

  // ── SSO (Google / Microsoft) ───────────────────────────────────────────────

  async function ssoLogin(strategy: 'oauth_google' | 'oauth_microsoft') {
    setLoading(true); setError('')
    try {
      const base = window.location.origin
      const { error: se } = await signIn!.sso({
        strategy,
        redirectUrl:         `${base}/sso-callback`,
        redirectCallbackUrl: `${base}/clinics/dashboard`,
      })
      if (se) err(cleanMsg(se.message) || 'Could not start sign-in')
    } catch (e) { const m = clerkErr(e); if (m) err(m); else setLoading(false) }
  }

  // ── render ─────────────────────────────────────────────────────────────────

  // Suppress the login form while Clerk resolves the session and the redirect fires
  if (isLoaded && isSignedIn) {
    return (
      <main className="auth" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
        <div style={{ fontFamily: 'var(--ff)', fontSize: 14, color: 'var(--muted)' }}>Redirecting…</div>
      </main>
    )
  }

  const filteredCountries = COUNTRIES.filter(c =>
    c.name.toLowerCase().includes(countrySearch.toLowerCase())
  )

  return (
    <main className="auth">
      <aside className="auth-side">
        <a href="/" className="logo">
          <img src="/icon.svg" alt="" />
          <span className="logo-text"><b>Implant</b><span>ID</span></span>
        </a>
        <div>
          <h2>Every implant.<br />One scan.</h2>
          <p>The modern database for MRI implant safety. Scan the patient's Apple Wallet pass — full profile in under two seconds.</p>
        </div>
        <div className="quote">
          <p>"I used to call three manufacturers before every scan. Now I just hold up my phone."</p>
          <cite>Dr M. Okafor · Consultant Radiologist</cite>
        </div>
      </aside>

      <section className="auth-main">
        <div className="auth-box">
          <h1>Log in to Implant ID</h1>
          <p className="sub">Choose your account type to continue.</p>

          {error && (
            <div style={{ background: 'rgba(var(--err-rgb),0.10)', border: '1px solid rgba(var(--err-rgb),0.25)', borderRadius: 10, padding: '10px 14px', fontSize: 13.5, color: 'var(--err)', marginBottom: 16 }}>
              {error}
            </div>
          )}

          {/* ── Tabs ──────────────────────────────────────────────────────── */}
          <div className="auth-tabs">
            <button type="button" className={tab === 'patient' ? 'active' : ''} onTouchStart={(e) => { e.preventDefault(); setTab('patient'); setError('') }} onClick={() => { setTab('patient'); setError('') }}>Patient</button>
            <button type="button" className={tab === 'clinic'  ? 'active' : ''} onTouchStart={(e) => { e.preventDefault(); setTab('clinic');  setError('') }} onClick={() => { setTab('clinic');  setError('') }}>Clinic</button>
          </div>

          {/* ── PATIENT TAB ───────────────────────────────────────────────── */}
          {tab === 'patient' && (
            <>
              {/* Phone: enter number → send OTP */}
              {patPhase === 'phone' && (
                <div className="tab-view active">
                  <div className="field">
                    <label>Phone number</label>
                    <div className="phone-row" style={{ position: 'relative' }}>
                      <button type="button" className="phone-code" onClick={() => setCountryOpen(o => !o)}>
                        <span className="flag-circle">{country.flag}</span>
                        <span className="dial">{country.dial}</span>
                        <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="6 9 12 15 18 9" /></svg>
                      </button>
                      <input className="input" type="tel" placeholder={country.placeholder} value={phone} onChange={e => setPhone(e.target.value)} onKeyDown={e => { if (e.key === 'Enter' && !countryOpen) sendPhoneOtp() }} style={{ flex: 1 }} />
                      {countryOpen && (
                        <div className="phone-dd open" style={{ display: 'flex' }}>
                          <div className="phone-dd-search">
                            <input placeholder="Search countries…" value={countrySearch} onChange={e => setCountrySearch(e.target.value)} />
                          </div>
                          <div className="phone-dd-list">
                            {filteredCountries.map(c => (
                              <button key={c.dial + c.name} type="button" onClick={() => { setCountry(c); setCountryOpen(false); setCountrySearch('') }}>
                                <span className="flag-circle">{c.flag}</span>{c.name}<span className="dial-r">{c.dial}</span>
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                  <button type="button" className="btn btn-s btn-lg btn-block" style={{ marginTop: 16 }} onClick={sendPhoneOtp} disabled={loading}>
                    {loading ? 'Sending…' : 'Send verification code →'}
                  </button>
                  <div className="bio-option">
                    <button type="button" className="bio-btn" onClick={passkeyLogin} disabled={passkeyLoading}>
                      <svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20"><path d="M17.0003 13V14C17.0003 16.7696 16.3364 19.445 15.0853 21.8455L14.8585 22.2663L13.1116 21.2924C14.2716 19.2115 14.9211 16.8817 14.9935 14.4559L15.0003 14V13H17.0003ZM11.0003 10H13.0003V14L12.9948 14.3787C12.9153 17.1495 11.9645 19.7731 10.3038 21.928L10.073 22.2189L8.52406 20.9536C10.0408 19.0969 10.9145 16.8017 10.9943 14.3663L11.0003 14V10ZM12.0003 6C14.7617 6 17.0003 8.23858 17.0003 11H15.0003C15.0003 9.34315 13.6571 8 12.0003 8C10.3434 8 9.00025 9.34315 9.00025 11V14C9.00025 16.2354 8.1806 18.3444 6.72928 19.9768L6.51767 20.2067L5.06955 18.8273C6.23328 17.6056 6.92099 16.0118 6.99381 14.3027L7.00025 14V11C7.00025 8.23858 9.23883 6 12.0003 6ZM12.0003 2C16.9708 2 21.0003 6.02944 21.0003 11V14C21.0003 15.6979 20.7985 17.3699 20.4035 18.9903L20.2647 19.5285L18.3349 19.0032C18.726 17.5662 18.9475 16.0808 18.9919 14.5684L19.0003 14V11C19.0003 7.13401 15.8662 4 12.0003 4C10.4279 4 8.97663 4.51841 7.80805 5.39364L6.38308 3.96769C7.92267 2.73631 9.87547 2 12.0003 2ZM4.96794 5.38282L6.39389 6.8078C5.5635 7.91652 5.0543 9.27971 5.00431 10.7593L4.99961 10.999L5.00378 13C5.00378 14.1195 4.73991 15.2026 4.24263 16.1772L4.08648 16.4663L2.34961 15.4747C2.72889 14.8103 2.95077 14.0681 2.99539 13.2924L3.00378 13L3.00361 11C3.00025 8.87522 3.73656 6.92242 4.96794 5.38282Z"/></svg>
                      <span>{passkeyLoading ? 'Authenticating…' : 'Use Face ID or fingerprint'}</span>
                    </button>
                  </div>
                  <div className="divider">or use email</div>
                  <button type="button" className="btn btn-lg btn-block" onClick={() => { setPatPhase('email'); setError('') }}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" style={{ marginRight: 6 }}><path d="M4 4h16a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z" /><path d="m22 6-10 7L2 6" /></svg>
                    Continue with email
                  </button>
                </div>
              )}

              {/* Phone: enter OTP */}
              {patPhase === 'phone-otp' && (
                <div className="tab-view active">
                  <p style={{ color: 'var(--muted)', fontSize: 14, marginBottom: 18, lineHeight: 1.55 }}>
                    We've sent a 6-digit code to your phone. Enter it below.
                  </p>
                  <OtpInputs otp={otp} setOtp={setOtp} onComplete={verifyPhoneOtp} />
                  <p style={{ fontSize: 13, color: 'var(--muted)', textAlign: 'center', margin: '16px 0' }}>
                    Didn't get it? <button type="button" className="link-btn" onClick={sendPhoneOtp}>Resend code</button>
                  </p>
                  <div style={{ display: 'flex', gap: 10 }}>
                    <button type="button" className="btn btn-lg" onClick={() => { setPatPhase('phone'); setError('') }}>← Back</button>
                    <button type="button" className="btn btn-s btn-lg" style={{ flex: 1 }} onClick={() => verifyPhoneOtp()} disabled={loading}>
                      {loading ? 'Verifying…' : 'Verify & log in →'}
                    </button>
                  </div>
                </div>
              )}

              {/* Email: enter address → send OTP (default email flow) */}
              {patPhase === 'email' && (
                <div className="tab-view active">
                  <div className="field">
                    <label>Email address</label>
                    <div className="i-wrap">
                      <svg className="i-ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"><path d="M4 4h16a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z" /><path d="m22 6-10 7L2 6" /></svg>
                      <input className="input" type="email" placeholder="you@email.com" value={ptEmail} onChange={e => setPtEmail(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') sendPatientEmailOtp() }} />
                    </div>
                  </div>
                  <button type="button" className="btn btn-s btn-lg btn-block" onClick={sendPatientEmailOtp} disabled={loading}>
                    {loading ? 'Sending…' : 'Send verification code →'}
                  </button>
                  <p style={{ textAlign: 'center', marginTop: 14, fontSize: 13, color: 'var(--muted)' }}>
                    Prefer a password?{' '}
                    <button type="button" className="link-btn" onClick={() => { setPatPhase('email-pw'); setError('') }}>Log in with password</button>
                  </p>
                  <button type="button" className="link-btn" style={{ display: 'block', textAlign: 'center', marginTop: 10, width: '100%' }} onClick={() => { setPatPhase('phone'); setError('') }}>
                    ← Back to phone login
                  </button>
                </div>
              )}

              {/* Email: enter OTP */}
              {patPhase === 'email-otp' && (
                <div className="tab-view active">
                  <p style={{ color: 'var(--muted)', fontSize: 14, marginBottom: 18, lineHeight: 1.55 }}>
                    We've sent a 6-digit code to <strong>{ptEmail}</strong>. Enter it below.
                  </p>
                  <OtpInputs otp={otp} setOtp={setOtp} onComplete={verifyPatientEmailOtp} />
                  <p style={{ fontSize: 13, color: 'var(--muted)', textAlign: 'center', margin: '16px 0' }}>
                    Didn't get it? <button type="button" className="link-btn" onClick={sendPatientEmailOtp}>Resend code</button>
                  </p>
                  <div style={{ display: 'flex', gap: 10 }}>
                    <button type="button" className="btn btn-lg" onClick={() => { setPatPhase('email'); setError('') }}>← Back</button>
                    <button type="button" className="btn btn-s btn-lg" style={{ flex: 1 }} onClick={() => verifyPatientEmailOtp()} disabled={loading}>
                      {loading ? 'Verifying…' : 'Verify & log in →'}
                    </button>
                  </div>
                </div>
              )}

              {/* Email + password (old-school fallback) */}
              {patPhase === 'email-pw' && (
                <div className="tab-view active">
                  <form onSubmit={patEmailLogin}>
                    <div className="field">
                      <label>Email</label>
                      <div className="i-wrap">
                        <svg className="i-ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"><path d="M4 4h16a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z" /><path d="m22 6-10 7L2 6" /></svg>
                        <input className="input" type="email" placeholder="you@email.com" value={ptEmail} onChange={e => setPtEmail(e.target.value)} />
                      </div>
                    </div>
                    <div className="field">
                      <label>Password</label>
                      <div className="i-wrap">
                        <svg className="i-ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"><rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></svg>
                        <input className="input" type={ptShowPw ? 'text' : 'password'} placeholder="••••••••" value={ptPassword} onChange={e => setPtPassword(e.target.value)} />
                        <button type="button" className="i-tog" onClick={() => setPtShowPw(v => !v)} aria-label="Show password">
                          {ptShowPw
                            ? <svg className="eye-c" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" /><line x1="1" y1="1" x2="23" y2="23" /></svg>
                            : <svg className="eye-o" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" /></svg>
                          }
                        </button>
                      </div>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '6px 0 20px' }}>
                      <label className="checkbox"><input type="checkbox" /> Keep me signed in</label>
                      <a href="/forgot" style={{ fontFamily: 'var(--ff)', fontSize: 13, color: 'var(--accent)', fontWeight: 500 }}>Forgot password?</a>
                    </div>
                    <button type="submit" className="btn btn-s btn-lg btn-block" disabled={loading}>{loading ? 'Signing in…' : 'Log in →'}</button>
                  </form>
                  <button type="button" className="link-btn" style={{ display: 'block', textAlign: 'center', marginTop: 14, width: '100%' }} onClick={() => { setPatPhase('email'); setError('') }}>
                    ← Send me a code instead
                  </button>
                </div>
              )}

              {/* MFA — TOTP second factor (only shown when account has 2FA enabled) */}
              {patPhase === 'mfa-totp' && (
                <div className="tab-view active">
                  <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:16 }}>
                    <div style={{ width:38, height:38, borderRadius:10, flexShrink:0, background:'rgba(var(--accent-rgb),0.10)', display:'grid', placeItems:'center' }}>
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="1.7"><rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/><circle cx="12" cy="16" r="1.2" fill="var(--accent)" stroke="none"/></svg>
                    </div>
                    <div>
                      <div style={{ fontFamily:'var(--ff)', fontWeight:600, fontSize:15, color:'var(--text)', lineHeight:1.2 }}>Two-factor authentication</div>
                      <div style={{ fontSize:12.5, color:'var(--muted)', marginTop:2 }}>Open your authenticator app for the code</div>
                    </div>
                  </div>
                  <OtpInputs otp={otp} setOtp={setOtp} onComplete={verifyMfaTotp} />
                  <button type="button" className="btn btn-s btn-lg btn-block" onClick={() => verifyMfaTotp()} disabled={loading || otpVal().length < 6} style={{ marginBottom:10, marginTop:16 }}>
                    {loading ? 'Verifying…' : 'Verify →'}
                  </button>
                  <button type="button" className="link-btn" style={{ display:'block', textAlign:'center', width:'100%' }} onClick={() => { setPatPhase('phone'); setError(''); setOtp(['','','','','','']) }}>
                    ← Start over
                  </button>
                </div>
              )}
            </>
          )}

          {/* ── CLINIC TAB ────────────────────────────────────────────────── */}
          {tab === 'clinic' && (
            <>
              {clPhase === 'email' && (
                <div className="tab-view active">
                  <div className="field">
                    <label>Clinic email</label>
                    <div className="i-wrap">
                      <svg className="i-ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"><path d="M4 4h16a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z" /><path d="m22 6-10 7L2 6" /></svg>
                      <input className="input" type="email" placeholder="you@clinic.com" value={clEmail} onChange={e => setClEmail(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') sendClinicOtp() }} />
                    </div>
                  </div>
                  <button type="button" className="btn btn-s btn-lg btn-block" style={{ marginTop: 16 }} onClick={sendClinicOtp} disabled={loading}>
                    {loading ? 'Sending…' : 'Send verification code →'}
                  </button>
                  <div className="bio-option">
                    <button type="button" className="bio-btn" onClick={clinicPasskeyLogin} disabled={passkeyLoading}>
                      <svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20"><path d="M17.0003 13V14C17.0003 16.7696 16.3364 19.445 15.0853 21.8455L14.8585 22.2663L13.1116 21.2924C14.2716 19.2115 14.9211 16.8817 14.9935 14.4559L15.0003 14V13H17.0003ZM11.0003 10H13.0003V14L12.9948 14.3787C12.9153 17.1495 11.9645 19.7731 10.3038 21.928L10.073 22.2189L8.52406 20.9536C10.0408 19.0969 10.9145 16.8017 10.9943 14.3663L11.0003 14V10ZM12.0003 6C14.7617 6 17.0003 8.23858 17.0003 11H15.0003C15.0003 9.34315 13.6571 8 12.0003 8C10.3434 8 9.00025 9.34315 9.00025 11V14C9.00025 16.2354 8.1806 18.3444 6.72928 19.9768L6.51767 20.2067L5.06955 18.8273C6.23328 17.6056 6.92099 16.0118 6.99381 14.3027L7.00025 14V11C7.00025 8.23858 9.23883 6 12.0003 6ZM12.0003 2C16.9708 2 21.0003 6.02944 21.0003 11V14C21.0003 15.6979 20.7985 17.3699 20.4035 18.9903L20.2647 19.5285L18.3349 19.0032C18.726 17.5662 18.9475 16.0808 18.9919 14.5684L19.0003 14V11C19.0003 7.13401 15.8662 4 12.0003 4C10.4279 4 8.97663 4.51841 7.80805 5.39364L6.38308 3.96769C7.92267 2.73631 9.87547 2 12.0003 2ZM4.96794 5.38282L6.39389 6.8078C5.5635 7.91652 5.0543 9.27971 5.00431 10.7593L4.99961 10.999L5.00378 13C5.00378 14.1195 4.73991 15.2026 4.24263 16.1772L4.08648 16.4663L2.34961 15.4747C2.72889 14.8103 2.95077 14.0681 2.99539 13.2924L3.00378 13L3.00361 11C3.00025 8.87522 3.73656 6.92242 4.96794 5.38282Z"/></svg>
                      <span>{passkeyLoading ? 'Authenticating…' : 'Use Face ID or fingerprint'}</span>
                    </button>
                  </div>
                  <div className="divider">or continue with</div>
                  <div className="sso">
                    <button className="sso-btn" type="button" onClick={() => ssoLogin('oauth_google')} disabled={loading}>
                      <svg width="17" height="17" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" /><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.15-4.53H2.18v2.84A10.99 10.99 0 0 0 12 23z" /><path fill="#FBBC05" d="M5.85 14.1A6.61 6.61 0 0 1 5.5 12c0-.73.13-1.44.35-2.1V7.07H2.18a11 11 0 0 0 0 9.86l3.67-2.83z" /><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.2 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1A10.99 10.99 0 0 0 2.18 7.07l3.67 2.83C6.71 7.31 9.14 5.38 12 5.38z" /></svg>
                      Continue with Google
                    </button>
                    <button className="sso-btn" type="button" onClick={() => ssoLogin('oauth_microsoft')} disabled={loading}>
                      <svg width="17" height="17" viewBox="0 0 23 23"><path fill="#f25022" d="M1 1h10v10H1z" /><path fill="#00a4ef" d="M1 12h10v10H1z" /><path fill="#7fba00" d="M12 1h10v10H12z" /><path fill="#ffb900" d="M12 12h10v10H12z" /></svg>
                      Continue with Microsoft
                    </button>
                  </div>
                  <p style={{ textAlign: 'center', marginTop: 18, fontSize: 13, color: 'var(--muted)' }}>
                    Prefer a password?{' '}
                    <button type="button" className="link-btn" onClick={() => { setClPhase('password'); setError('') }}>Log in with password</button>
                  </p>
                </div>
              )}

              {clPhase === 'email-otp' && (
                <div className="tab-view active">
                  <p style={{ color: 'var(--muted)', fontSize: 14, marginBottom: 18, lineHeight: 1.55 }}>
                    We've sent a 6-digit verification code to your email.
                  </p>
                  <OtpInputs otp={otp} setOtp={setOtp} onComplete={verifyClinicOtp} />
                  <p style={{ fontSize: 13, color: 'var(--muted)', textAlign: 'center', margin: '16px 0' }}>
                    Didn't get it? <button type="button" className="link-btn" onClick={sendClinicOtp}>Resend code</button>
                  </p>
                  <div style={{ display: 'flex', gap: 10 }}>
                    <button type="button" className="btn btn-lg" onClick={() => { setClPhase('email'); setError('') }}>← Back</button>
                    <button type="button" className="btn btn-s btn-lg" style={{ flex: 1 }} onClick={() => verifyClinicOtp()} disabled={loading}>
                      {loading ? 'Verifying…' : 'Verify & log in →'}
                    </button>
                  </div>
                </div>
              )}

              {clPhase === 'password' && (
                <div className="tab-view active">
                  <form onSubmit={clinicPasswordLogin}>
                    <div className="field">
                      <label>Email</label>
                      <div className="i-wrap">
                        <svg className="i-ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"><path d="M4 4h16a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z" /><path d="m22 6-10 7L2 6" /></svg>
                        <input className="input" type="email" placeholder="you@clinic.com" value={clEmail} onChange={e => setClEmail(e.target.value)} />
                      </div>
                    </div>
                    <div className="field">
                      <label>Password</label>
                      <div className="i-wrap">
                        <svg className="i-ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"><rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></svg>
                        <input className="input" type={clShowPw ? 'text' : 'password'} placeholder="••••••••" value={clPassword} onChange={e => setClPassword(e.target.value)} />
                        <button type="button" className="i-tog" onClick={() => setClShowPw(v => !v)} aria-label="Show password">
                          {clShowPw
                            ? <svg className="eye-c" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" /><line x1="1" y1="1" x2="23" y2="23" /></svg>
                            : <svg className="eye-o" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" /></svg>
                          }
                        </button>
                      </div>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '6px 0 20px' }}>
                      <label className="checkbox"><input type="checkbox" /> Keep me signed in</label>
                      <a href="/forgot" style={{ fontFamily: 'var(--ff)', fontSize: 13, color: 'var(--accent)', fontWeight: 500 }}>Forgot password?</a>
                    </div>
                    <button type="submit" className="btn btn-s btn-lg btn-block" disabled={loading}>{loading ? 'Signing in…' : 'Log in →'}</button>
                  </form>
                  <button type="button" className="link-btn" style={{ display: 'block', textAlign: 'center', marginTop: 14, width: '100%' }} onClick={() => { setClPhase('email'); setError('') }}>
                    ← Back to email verification
                  </button>
                </div>
              )}

              {/* MFA — TOTP second factor */}
              {clPhase === 'mfa-totp' && (
                <div className="tab-view active">
                  <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:16 }}>
                    <div style={{ width:38, height:38, borderRadius:10, flexShrink:0, background:'rgba(var(--accent-rgb),0.10)', display:'grid', placeItems:'center' }}>
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="1.7"><rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/><circle cx="12" cy="16" r="1.2" fill="var(--accent)" stroke="none"/></svg>
                    </div>
                    <div>
                      <div style={{ fontFamily:'var(--ff)', fontWeight:600, fontSize:15, color:'var(--text)', lineHeight:1.2 }}>Two-factor authentication</div>
                      <div style={{ fontSize:12.5, color:'var(--muted)', marginTop:2 }}>Open your authenticator app for the code</div>
                    </div>
                  </div>
                  <OtpInputs otp={otp} setOtp={setOtp} onComplete={verifyMfaTotp} />
                  <button type="button" className="btn btn-s btn-lg btn-block" onClick={() => verifyMfaTotp()} disabled={loading || otpVal().length < 6} style={{ marginBottom:10, marginTop:16 }}>
                    {loading ? 'Verifying…' : 'Verify →'}
                  </button>
                  <button type="button" className="link-btn" style={{ display:'block', textAlign:'center', width:'100%' }} onClick={() => { setClPhase('email'); setError(''); setOtp(['','','','','','']) }}>
                    ← Start over
                  </button>
                </div>
              )}
            </>
          )}

          <p className="auth-alt">
            {tab === 'patient'
              ? <>Don't have an account? <a href="/patients/register">Sign up as a patient</a></>
              : <>New clinic? <a href="/clinics/onboarding">Apply to join →</a></>
            }
          </p>

          <p style={{ textAlign: 'center', marginTop: 20, fontSize: 11.5, color: 'var(--muted2)', lineHeight: 1.55 }}>
            <a href="https://implantid.io/legal/privacy-policy" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--muted2)', textDecoration: 'underline' }}>Privacy Policy</a>
            {' · '}
            <a href="https://implantid.io/legal/terms-and-conditions" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--muted2)', textDecoration: 'underline' }}>Terms of Service</a>
            {' · '}
            <a href="https://implantid.io/legal/gdpr" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--muted2)', textDecoration: 'underline' }}>GDPR</a>
          </p>
        </div>
      </section>
    </main>
  )
}
