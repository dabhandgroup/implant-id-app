'use client'
import { useState } from 'react'
import { useSignIn } from '@clerk/nextjs'
import { useRouter } from 'next/navigation'

// ── OTP inputs — module level so React doesn't remount on state change ────────

interface OtpProps {
  otp: string[]
  setOtp: (v: string[]) => void
  onComplete: (code: string) => void
}

function OtpInputs({ otp, setOtp, onComplete }: OtpProps) {
  function handleChange(i: number, raw: string) {
    const digit = raw.replace(/\D/g, '').slice(-1)
    const next = [...otp]; next[i] = digit; setOtp(next)
    if (digit && i < 5) {
      document.querySelectorAll<HTMLInputElement>('.mstr-code-input')[i + 1]?.focus()
    }
    if (i === 5 && digit) {
      const code = [...otp.slice(0, 5), digit].join('')
      if (code.length === 6) onComplete(code)
    }
  }

  function handleKeyDown(i: number, e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Backspace' && !otp[i] && i > 0) {
      const next = [...otp]; next[i - 1] = ''; setOtp(next)
      document.querySelectorAll<HTMLInputElement>('.mstr-code-input')[i - 1]?.focus()
    }
  }

  function handlePaste(e: React.ClipboardEvent<HTMLInputElement>) {
    e.preventDefault()
    const digits = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6)
    if (!digits) return
    const next = ['', '', '', '', '', '']
    for (let i = 0; i < digits.length; i++) next[i] = digits[i]
    setOtp(next)
    document.querySelectorAll<HTMLInputElement>('.mstr-code-input')[Math.min(digits.length - 1, 5)]?.focus()
    if (digits.length === 6) onComplete(digits)
  }

  return (
    <div className="mstr-code-row">
      {otp.map((v, i) => (
        <input
          key={i}
          maxLength={2}
          inputMode="numeric"
          pattern="[0-9]*"
          autoComplete={i === 0 ? 'one-time-code' : 'off'}
          className="mstr-code-input"
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

// ── Component ─────────────────────────────────────────────────────────────────

type Phase = 'password' | 'email-otp' | 'mfa-totp'

export default function MasterLoginClient() {
  const router   = useRouter()
  const { signIn } = useSignIn()

  // form state
  const [email,    setEmail]    = useState('')
  const [password, setPassword] = useState('')
  const [showPw,   setShowPw]   = useState(false)
  const [remember, setRemember] = useState(false)

  // OTP / MFA
  const [otp,     setOtp]     = useState(['', '', '', '', '', ''])
  const [mfaDest, setMfaDest] = useState('')

  // UI
  const [phase,   setPhase]   = useState<Phase>('password')
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState('')

  function err(msg: string) { setError(msg); setLoading(false) }
  function otpVal()          { return otp.join('') }

  function clerkErr(e: unknown) {
    return (e as { errors?: { message?: string }[] })?.errors?.[0]?.message
      ?? 'Something went wrong'
  }

  // ── After primary auth — check for MFA ──────────────────────────────────────

  async function finalizeAndGo() {
    if (signIn!.status === 'needs_second_factor') {
      setMfaDest('/master/dashboard')
      setOtp(['', '', '', '', '', ''])
      setError('')
      setPhase('mfa-totp')
      setLoading(false)
      return
    }
    const { error: fe } = await signIn!.finalize()
    if (fe) return err(fe.message ?? 'Could not complete sign-in')
    router.push('/master/dashboard')
  }

  // ── Email + password ─────────────────────────────────────────────────────────

  async function passwordLogin(e: React.FormEvent) {
    e.preventDefault()
    if (!email.trim())    return err('Enter your email address')
    if (!password.trim()) return err('Enter your password')
    setLoading(true); setError('')
    try {
      const { error: pe } = await signIn!.password({ identifier: email.trim(), password })
      if (pe) return err(pe.message ?? 'Invalid credentials')
      await finalizeAndGo()
    } catch (e) { err(clerkErr(e)) } finally { setLoading(false) }
  }

  // ── Email OTP ────────────────────────────────────────────────────────────────

  async function sendEmailOtp() {
    if (!email.trim()) return err('Enter your email address first')
    setLoading(true); setError('')
    try {
      const { error: ce } = await signIn!.create({ identifier: email.trim() })
      if (ce) return err(ce.message ?? 'Could not start sign-in')
      const { error: se } = await signIn!.emailCode.sendCode()
      if (se) return err(se.message ?? 'Could not send code')
      setOtp(['', '', '', '', '', '']); setPhase('email-otp')
    } catch (e) { err(clerkErr(e)) } finally { setLoading(false) }
  }

  async function verifyEmailOtp(code?: string) {
    const c = code ?? otpVal()
    if (c.length < 6) return err('Enter the 6-digit code from your email')
    setLoading(true); setError('')
    try {
      const { error: ve } = await signIn!.emailCode.verifyCode({ code: c })
      if (ve) return err(ve.message ?? 'Invalid code — check and try again')
      await finalizeAndGo()
    } catch (e) { err(clerkErr(e)) } finally { setLoading(false) }
  }

  // ── Passkey (Face ID / fingerprint / device PIN) ─────────────────────────────

  async function passkeyLogin() {
    setLoading(true); setError('')
    try {
      const { error: pe } = await signIn!.passkey({ flow: 'discoverable' })
      if (pe) return err(pe.message ?? 'Passkey authentication failed')
      await finalizeAndGo()
    } catch (e: unknown) {
      const msg = clerkErr(e)
      if (/cancel|abort|not allowed/i.test(msg)) { setLoading(false); return }
      err(msg)
    } finally { setLoading(false) }
  }

  // ── Google SSO ───────────────────────────────────────────────────────────────

  async function googleLogin() {
    setLoading(true); setError('')
    try {
      const base = window.location.origin
      const { error: se } = await signIn!.sso({
        strategy: 'oauth_google',
        redirectUrl:         `${base}/sso-callback`,
        redirectCallbackUrl: `${base}/master/dashboard`,
      })
      if (se) err(se.message ?? 'Google sign-in failed')
    } catch (e) { err(clerkErr(e)); setLoading(false) }
  }

  // ── MFA TOTP ─────────────────────────────────────────────────────────────────

  async function verifyMfaTotp(code?: string) {
    const c = code ?? otpVal()
    if (c.length < 6) return err('Enter the 6-digit code from your authenticator app')
    setLoading(true); setError('')
    try {
      const { error: ve } = await signIn!.mfa.verifyTOTP({ code: c })
      if (ve) return err(ve.message ?? 'Incorrect code — try again')
      const { error: fe } = await signIn!.finalize()
      if (fe) return err(fe.message ?? 'Could not complete sign-in')
      router.push(mfaDest || '/master/dashboard')
    } catch (e) { err(clerkErr(e)) } finally { setLoading(false) }
  }

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <div className="mstr-wrap">
      <div className="mstr-card">

        {/* Logo */}
        <a href="/" className="mstr-logo">
          <img src="/icon.svg" alt="Implant ID" />
          <span className="mstr-logo-text"><b>Implant</b><span>ID</span></span>
        </a>

        {/* Eyebrow */}
        <div className="mstr-ey">
          <div className="mstr-ey-line" />
          <span className="mstr-ey-text">Master Portal</span>
        </div>

        {error && <div className="mstr-err">{error}</div>}

        {/* ── Password phase ─────────────────────────────────────────────── */}
        {phase === 'password' && (
          <>
            <h1 className="mstr-h1">Sign in to your portal</h1>
            <p className="mstr-sub">
              Manage clinic approvals, device oversight and platform administration.
              All actions are logged.
            </p>

            {/* Passkey */}
            <button type="button" className="mstr-bio" onClick={passkeyLogin} disabled={loading}>
              <svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20">
                <path d="M17.0003 13V14C17.0003 16.7696 16.3364 19.445 15.0853 21.8455L14.8585 22.2663L13.1116 21.2924C14.2716 19.2115 14.9211 16.8817 14.9935 14.4559L15.0003 14V13H17.0003ZM11.0003 10H13.0003V14L12.9948 14.3787C12.9153 17.1495 11.9645 19.7731 10.3038 21.928L10.073 22.2189L8.52406 20.9536C10.0408 19.0969 10.9145 16.8017 10.9943 14.3663L11.0003 14V10ZM12.0003 6C14.7617 6 17.0003 8.23858 17.0003 11H15.0003C15.0003 9.34315 13.6571 8 12.0003 8C10.3434 8 9.00025 9.34315 9.00025 11V14C9.00025 16.2354 8.1806 18.3444 6.72928 19.9768L6.51767 20.2067L5.06955 18.8273C6.23328 17.6056 6.92099 16.0118 6.99381 14.3027L7.00025 14V11C7.00025 8.23858 9.23883 6 12.0003 6ZM12.0003 2C16.9708 2 21.0003 6.02944 21.0003 11V14C21.0003 15.6979 20.7985 17.3699 20.4035 18.9903L20.2647 19.5285L18.3349 19.0032C18.726 17.5662 18.9475 16.0808 18.9919 14.5684L19.0003 14V11C19.0003 7.13401 15.8662 4 12.0003 4C10.4279 4 8.97663 4.51841 7.80805 5.39364L6.38308 3.96769C7.92267 2.73631 9.87547 2 12.0003 2ZM4.96794 5.38282L6.39389 6.8078C5.5635 7.91652 5.0543 9.27971 5.00431 10.7593L4.99961 10.999L5.00378 13C5.00378 14.1195 4.73991 15.2026 4.24263 16.1772L4.08648 16.4663L2.34961 15.4747C2.72889 14.8103 2.95077 14.0681 2.99539 13.2924L3.00378 13L3.00361 11C3.00025 8.87522 3.73656 6.92242 4.96794 5.38282Z"/>
              </svg>
              <span>{loading ? 'Authenticating…' : 'Use Face ID or fingerprint'}</span>
            </button>

            <div className="mstr-divider">or sign in with email</div>

            <form onSubmit={passwordLogin} noValidate>
              <div className="mstr-field">
                <label className="mstr-label">Work email</label>
                <div className="mstr-i-wrap">
                  <svg className="mstr-i-ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
                    <path d="M4 4h16a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z"/>
                    <path d="m22 6-10 7L2 6"/>
                  </svg>
                  <input
                    className="mstr-input"
                    type="email"
                    placeholder="you@implantid.io"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    autoComplete="email"
                    aria-label="Work email"
                  />
                </div>
              </div>

              <div className="mstr-field">
                <label className="mstr-label">Password</label>
                <div className="mstr-i-wrap">
                  <svg className="mstr-i-ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
                    <rect x="3" y="11" width="18" height="11" rx="2"/>
                    <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                  </svg>
                  <input
                    className="mstr-input"
                    type={showPw ? 'text' : 'password'}
                    placeholder="••••••••••••"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    autoComplete="current-password"
                    aria-label="Password"
                  />
                  <button
                    type="button"
                    className="mstr-i-tog"
                    onClick={() => setShowPw(v => !v)}
                    aria-label={showPw ? 'Hide password' : 'Show password'}
                  >
                    {showPw
                      ? <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
                      : <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                    }
                  </button>
                </div>
              </div>

              <div className="mstr-row">
                <label className="mstr-check">
                  <input type="checkbox" checked={remember} onChange={e => setRemember(e.target.checked)} />
                  Keep me signed in
                </label>
                <a href="/forgot" className="mstr-forgot">Forgot password?</a>
              </div>

              <button type="submit" className="mstr-btn" disabled={loading}>
                {loading ? 'Signing in…' : 'Sign in to portal →'}
              </button>
            </form>

            <div className="mstr-divider">or</div>

            <div className="mstr-sso">
              <button type="button" className="mstr-sso-btn" onClick={googleLogin} disabled={loading} aria-label="Continue with Google">
                <svg width="17" height="17" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.15-4.53H2.18v2.84A10.99 10.99 0 0 0 12 23z"/>
                  <path fill="#FBBC05" d="M5.85 14.1A6.61 6.61 0 0 1 5.5 12c0-.73.13-1.44.35-2.1V7.07H2.18a11 11 0 0 0 0 9.86l3.67-2.83z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.2 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1A10.99 10.99 0 0 0 2.18 7.07l3.67 2.83C6.71 7.31 9.14 5.38 12 5.38z"/>
                </svg>
                Continue with Google
              </button>
            </div>

            <p style={{ textAlign:'center', marginTop:18, fontSize:13, color:'rgba(255,255,255,.3)' }}>
              <button type="button" className="mstr-link" onClick={sendEmailOtp} disabled={loading}>
                Send me a one-time code instead
              </button>
            </p>
          </>
        )}

        {/* ── Email OTP phase ─────────────────────────────────────────────── */}
        {phase === 'email-otp' && (
          <>
            <h1 className="mstr-h1">Check your email</h1>
            <p className="mstr-sub">
              We sent a 6-digit code to <strong style={{ color:'rgba(255,255,255,.7)' }}>{email}</strong>.
              Enter it below to sign in.
            </p>

            <OtpInputs otp={otp} setOtp={setOtp} onComplete={verifyEmailOtp} />

            <p style={{ textAlign:'center', fontSize:13, color:'rgba(255,255,255,.35)', margin:'16px 0' }}>
              Didn't get it?{' '}
              <button type="button" className="mstr-link" onClick={sendEmailOtp} disabled={loading}>Resend code</button>
            </p>

            <button
              type="button"
              className="mstr-btn"
              onClick={() => verifyEmailOtp()}
              disabled={loading || otpVal().length < 6}
              style={{ marginBottom:12 }}
            >
              {loading ? 'Verifying…' : 'Verify & sign in →'}
            </button>

            <p style={{ textAlign:'center' }}>
              <button type="button" className="mstr-link" onClick={() => { setPhase('password'); setError('') }}>
                ← Back to password
              </button>
            </p>
          </>
        )}

        {/* ── MFA TOTP phase ──────────────────────────────────────────────── */}
        {phase === 'mfa-totp' && (
          <>
            <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:20 }}>
              <div style={{
                width:42, height:42, borderRadius:12, flexShrink:0,
                background:'color-mix(in srgb,var(--accent) 15%,transparent)',
                display:'grid', placeItems:'center',
              }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="1.7">
                  <rect x="5" y="11" width="14" height="10" rx="2"/>
                  <path d="M8 11V7a4 4 0 0 1 8 0v4"/>
                  <circle cx="12" cy="16" r="1.3" fill="var(--accent)" stroke="none"/>
                </svg>
              </div>
              <div>
                <div style={{ fontFamily:'var(--ff)', fontWeight:600, fontSize:16, color:'#f0f0f2', lineHeight:1.2 }}>
                  Two-factor authentication
                </div>
                <div style={{ fontSize:13, color:'rgba(255,255,255,.4)', marginTop:3 }}>
                  Open your authenticator app for the code
                </div>
              </div>
            </div>

            <OtpInputs otp={otp} setOtp={setOtp} onComplete={verifyMfaTotp} />

            <button
              type="button"
              className="mstr-btn"
              onClick={() => verifyMfaTotp()}
              disabled={loading || otpVal().length < 6}
              style={{ marginTop:20, marginBottom:12 }}
            >
              {loading ? 'Verifying…' : 'Verify →'}
            </button>

            <p style={{ textAlign:'center' }}>
              <button type="button" className="mstr-link" onClick={() => { setPhase('password'); setOtp(['','','','','','']); setError('') }}>
                ← Start over
              </button>
            </p>
          </>
        )}

      </div>
    </div>
  )
}
