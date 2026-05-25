'use client'
import { useState } from 'react'
import { useSignIn } from '@clerk/nextjs'
import { useRouter } from 'next/navigation'

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
type PatientPhase = 'phone' | 'phone-otp' | 'email'
type ClinicPhase  = 'email' | 'email-otp' | 'password'

// ─── component ───────────────────────────────────────────────────────────────

export default function LoginClient() {
  const router = useRouter()
  // Clerk 7 signals API — signIn is always defined, finalize() sets the session
  const { signIn } = useSignIn()

  // tab / phase state
  const [tab,      setTab]      = useState<Tab>('patient')
  const [patPhase, setPatPhase] = useState<PatientPhase>('phone')
  const [clPhase,  setClPhase]  = useState<ClinicPhase>('email')

  // patient phone
  const [country,       setCountry]       = useState(COUNTRIES[0])
  const [countrySearch, setCountrySearch] = useState('')
  const [countryOpen,   setCountryOpen]   = useState(false)
  const [phone,         setPhone]         = useState('')

  // OTP digits shared between phone + email flows
  const [otp, setOtp] = useState(['', '', '', '', '', ''])

  // clinic email / password
  const [clEmail,    setClEmail]    = useState('')
  const [clPassword, setClPassword] = useState('')
  const [clShowPw,   setClShowPw]   = useState(false)

  // patient email phase
  const [ptEmail,    setPtEmail]    = useState('')
  const [ptPassword, setPtPassword] = useState('')
  const [ptShowPw,   setPtShowPw]   = useState(false)

  // feedback
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState('')

  // ── helpers ────────────────────────────────────────────────────────────────

  function err(msg: string) { setError(msg); setLoading(false) }
  function otpVal() { return otp.join('') }

  function handleOtpInput(i: number, val: string) {
    const next = [...otp]; next[i] = val.slice(-1); setOtp(next)
    if (val && i < 5) {
      const inputs = document.querySelectorAll<HTMLInputElement>('.code-input')
      inputs[i + 1]?.focus()
    }
  }

  async function finalizeAndGo(dest: string) {
    const { error: fe } = await signIn!.finalize()
    if (fe) return err(fe.message ?? 'Could not complete sign-in')
    router.push(dest)
  }

  function clerkErr(e: unknown) {
    return (e as { errors?: { message?: string }[] })?.errors?.[0]?.message
      ?? 'Something went wrong'
  }

  // ── Patient: phone OTP ─────────────────────────────────────────────────────

  async function sendPhoneOtp() {
    const number = phone.trim()
    if (!number) return err('Enter your phone number')
    setLoading(true); setError('')
    try {
      const { error: ce } = await signIn!.create({ identifier: `${country.dial}${number.replace(/\s/g, '')}` })
      if (ce) return err(ce.message ?? 'Could not start sign-in')
      const { error: se } = await signIn!.phoneCode.sendCode()
      if (se) return err(se.message ?? 'Could not send code')
      setOtp(['','','','','','']); setPatPhase('phone-otp')
    } catch (e) { err(clerkErr(e)) } finally { setLoading(false) }
  }

  async function verifyPhoneOtp() {
    if (otpVal().length < 6) return err('Enter the 6-digit code')
    setLoading(true); setError('')
    try {
      const { error: ve } = await signIn!.phoneCode.verifyCode({ code: otpVal() })
      if (ve) return err(ve.message ?? 'Invalid code')
      if (signIn!.status === 'complete') await finalizeAndGo('/patients/dashboard')
      else err('Verification incomplete — contact support')
    } catch (e) { err(clerkErr(e)) } finally { setLoading(false) }
  }

  // ── Patient: email + password ──────────────────────────────────────────────

  async function patEmailLogin(e: React.FormEvent) {
    e.preventDefault()
    if (!ptEmail.trim()) return err('Enter your email')
    setLoading(true); setError('')
    try {
      const { error: ce } = await signIn!.password({ identifier: ptEmail, password: ptPassword })
      if (ce) return err(ce.message ?? 'Invalid credentials')
      if (signIn!.status === 'complete') await finalizeAndGo('/patients/dashboard')
      else err('Sign-in incomplete — contact support')
    } catch (e) { err(clerkErr(e)) } finally { setLoading(false) }
  }

  // ── Clinic: email OTP ─────────────────────────────────────────────────────

  async function sendClinicOtp() {
    if (!clEmail.trim()) return err('Enter your clinic email')
    setLoading(true); setError('')
    try {
      const { error: ce } = await signIn!.create({ identifier: clEmail })
      if (ce) return err(ce.message ?? 'Could not start sign-in')
      const { error: se } = await signIn!.emailCode.sendCode()
      if (se) return err(se.message ?? 'Could not send code')
      setOtp(['','','','','','']); setClPhase('email-otp')
    } catch (e) { err(clerkErr(e)) } finally { setLoading(false) }
  }

  async function verifyClinicOtp() {
    if (otpVal().length < 6) return err('Enter the 6-digit code')
    setLoading(true); setError('')
    try {
      const { error: ve } = await signIn!.emailCode.verifyCode({ code: otpVal() })
      if (ve) return err(ve.message ?? 'Invalid code')
      if (signIn!.status === 'complete') await finalizeAndGo('/clinics/dashboard')
      else err('Verification incomplete — contact support')
    } catch (e) { err(clerkErr(e)) } finally { setLoading(false) }
  }

  // ── Clinic: email + password ───────────────────────────────────────────────

  async function clinicPasswordLogin(e: React.FormEvent) {
    e.preventDefault()
    if (!clEmail.trim()) return err('Enter your email')
    setLoading(true); setError('')
    try {
      const { error: pe } = await signIn!.password({ identifier: clEmail, password: clPassword })
      if (pe) return err(pe.message ?? 'Invalid credentials')
      if (signIn!.status === 'complete') await finalizeAndGo('/clinics/dashboard')
      else err('Sign-in incomplete — contact support')
    } catch (e) { err(clerkErr(e)) } finally { setLoading(false) }
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
      if (se) err(se.message ?? 'SSO failed')
    } catch (e) { err(clerkErr(e)); setLoading(false) }
  }

  // ── shared OTP input row ───────────────────────────────────────────────────

  function OtpInputs() {
    return (
      <div className="code-row">
        {otp.map((v, i) => (
          <input
            key={i}
            maxLength={1}
            className="code-input"
            value={v}
            onChange={e => handleOtpInput(i, e.target.value)}
            onFocus={e => e.target.select()}
          />
        ))}
      </div>
    )
  }

  // ── render ─────────────────────────────────────────────────────────────────

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
            <div style={{ background: 'color-mix(in srgb,var(--err) 10%,transparent)', border: '1px solid color-mix(in srgb,var(--err) 25%,transparent)', borderRadius: 10, padding: '10px 14px', fontSize: 13.5, color: 'var(--err)', marginBottom: 16 }}>
              {error}
            </div>
          )}

          {/* ── Tabs ──────────────────────────────────────────────────────── */}
          <div className="auth-tabs">
            <button className={tab === 'patient' ? 'active' : ''} onClick={() => { setTab('patient'); setError('') }}>Patient</button>
            <button className={tab === 'clinic'  ? 'active' : ''} onClick={() => { setTab('clinic');  setError('') }}>Clinic</button>
          </div>

          {/* ── PATIENT TAB ───────────────────────────────────────────────── */}
          {tab === 'patient' && (
            <>
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
                      <input className="input" type="tel" placeholder={country.placeholder} value={phone} onChange={e => setPhone(e.target.value)} style={{ flex: 1 }} />
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
                  <button type="button" className="btn btn-s btn-lg btn-block" onClick={sendPhoneOtp} disabled={loading}>
                    {loading ? 'Sending…' : 'Send verification code →'}
                  </button>
                  <div className="bio-option">
                    <button type="button" className="bio-btn" onClick={() => router.push('/patients/dashboard')}>
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="5" y="2" width="14" height="20" rx="3" /><circle cx="12" cy="15" r="3" /><path d="M12 12v-2" /></svg>
                      <span>Use Face ID or fingerprint</span>
                    </button>
                  </div>
                  <div className="divider">or continue with email</div>
                  <button type="button" className="btn btn-lg btn-block" onClick={() => { setPatPhase('email'); setError('') }}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" style={{ marginRight: 6 }}><path d="M4 4h16a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z" /><path d="m22 6-10 7L2 6" /></svg>
                    Log in with email
                  </button>
                </div>
              )}

              {patPhase === 'phone-otp' && (
                <div className="tab-view active">
                  <p style={{ color: 'var(--muted)', fontSize: 14, marginBottom: 18, lineHeight: 1.55 }}>
                    We've sent a 6-digit code to your phone. Enter it below.
                  </p>
                  <OtpInputs />
                  <p style={{ fontSize: 13, color: 'var(--muted)', textAlign: 'center', margin: '16px 0' }}>
                    Didn't get it? <button type="button" className="link-btn" onClick={sendPhoneOtp}>Resend code</button>
                  </p>
                  <div style={{ display: 'flex', gap: 10 }}>
                    <button type="button" className="btn btn-lg" onClick={() => { setPatPhase('phone'); setError('') }}>← Back</button>
                    <button type="button" className="btn btn-s btn-lg" style={{ flex: 1 }} onClick={verifyPhoneOtp} disabled={loading}>
                      {loading ? 'Verifying…' : 'Verify & log in →'}
                    </button>
                  </div>
                </div>
              )}

              {patPhase === 'email' && (
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
                  <button type="button" className="link-btn" style={{ display: 'block', textAlign: 'center', marginTop: 14, width: '100%' }} onClick={() => { setPatPhase('phone'); setError('') }}>
                    ← Back to phone login
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
                      <input className="input" type="email" placeholder="you@clinic.com" value={clEmail} onChange={e => setClEmail(e.target.value)} />
                    </div>
                  </div>
                  <button type="button" className="btn btn-s btn-lg btn-block" onClick={sendClinicOtp} disabled={loading}>
                    {loading ? 'Sending…' : 'Send verification code →'}
                  </button>
                  <div className="divider">or continue with email &amp; password</div>
                  <button type="button" className="btn btn-lg btn-block" onClick={() => { setClPhase('password'); setError('') }}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" style={{ marginRight: 6 }}><rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></svg>
                    Log in with password
                  </button>
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
                </div>
              )}

              {clPhase === 'email-otp' && (
                <div className="tab-view active">
                  <p style={{ color: 'var(--muted)', fontSize: 14, marginBottom: 18, lineHeight: 1.55 }}>
                    We've sent a 6-digit verification code to your email.
                  </p>
                  <OtpInputs />
                  <p style={{ fontSize: 13, color: 'var(--muted)', textAlign: 'center', margin: '16px 0' }}>
                    Didn't get it? <button type="button" className="link-btn" onClick={sendClinicOtp}>Resend code</button>
                  </p>
                  <div style={{ display: 'flex', gap: 10 }}>
                    <button type="button" className="btn btn-lg" onClick={() => { setClPhase('email'); setError('') }}>← Back</button>
                    <button type="button" className="btn btn-s btn-lg" style={{ flex: 1 }} onClick={verifyClinicOtp} disabled={loading}>
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
            </>
          )}

          <p className="auth-alt">Don't have an account? <a href="/patients/register">Sign up</a></p>
        </div>
      </section>
    </main>
  )
}
