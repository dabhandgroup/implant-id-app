'use client'
import { useState } from 'react'
import { useSignIn } from '@clerk/nextjs'
import { useRouter } from 'next/navigation'

type Phase = 'email' | 'otp' | 'password' | 'done'

export default function ForgotClient() {
  const { signIn } = useSignIn()
  const router = useRouter()

  const [phase,           setPhase]           = useState<Phase>('email')
  const [email,           setEmail]           = useState('')
  const [otp,             setOtp]             = useState(['', '', '', '', '', ''])
  const [password,        setPassword]        = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPw,          setShowPw]          = useState(false)
  const [loading,         setLoading]         = useState(false)
  const [error,           setError]           = useState('')

  function err(msg: string) { setError(msg); setLoading(false) }
  function otpVal()         { return otp.join('') }



  function clerkErr(e: unknown) {
    return (e as { errors?: { message?: string }[] })?.errors?.[0]?.message
      ?? 'Something went wrong'
  }

  // ── Step 1: enter email → send reset code ────────────────────────────────

  async function sendResetCode() {
    if (!email.trim()) return err('Enter your email address')
    setLoading(true); setError('')
    try {
      const { error: ce } = await signIn!.create({ identifier: email.trim() })
      if (ce) return err(ce.message ?? 'Could not find that account')
      const { error: se } = await signIn!.resetPasswordEmailCode.sendCode()
      if (se) return err(se.message ?? 'Could not send reset code')
      setOtp(['', '', '', '', '', ''])
      setPhase('otp')
    } catch (e) { err(clerkErr(e)) } finally { setLoading(false) }
  }

  // ── Step 2: enter OTP → verify ───────────────────────────────────────────

  async function verifyResetCode(code?: string) {
    const c = code ?? otpVal()
    if (c.length < 6) return err('Enter the 6-digit code')
    setLoading(true); setError('')
    try {
      const { error: ve } = await signIn!.resetPasswordEmailCode.verifyCode({ code: c })
      if (ve) return err(ve.message ?? 'Invalid or expired code')
      setPhase('password')
    } catch (e) { err(clerkErr(e)) } finally { setLoading(false) }
  }

  // ── Step 3: set new password → finalize ─────────────────────────────────

  async function submitNewPassword(e: React.FormEvent) {
    e.preventDefault()
    if (!password)                   return err('Enter a new password')
    if (password.length < 8)         return err('Password must be at least 8 characters')
    if (password !== confirmPassword) return err('Passwords do not match')
    setLoading(true); setError('')
    try {
      const { error: pe } = await signIn!.resetPasswordEmailCode.submitPassword({
        password,
        signOutOfOtherSessions: true,
      })
      if (pe) return err(pe.message ?? 'Could not set password')
      // finalize() sets the active session
      const { error: fe } = await signIn!.finalize()
      if (fe) return err(fe.message ?? 'Could not sign in')
      setPhase('done')
      // /dashboard reads the user's role and routes them to the right section
      setTimeout(() => router.push('/dashboard'), 1500)
    } catch (e) { err(clerkErr(e)) } finally { setLoading(false) }
  }

  // ── shared OTP row ───────────────────────────────────────────────────────

  function OtpInputs({ onComplete }: { onComplete: (code: string) => void }) {

    function handleChange(i: number, val: string) {
      const digit = val.slice(-1)
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

    function handleKeyDown(i: number, e: React.KeyboardEvent<HTMLInputElement>) {
      if (e.key === 'Backspace' && !otp[i] && i > 0) {
        const inputs = document.querySelectorAll<HTMLInputElement>('.code-input')
        inputs[i - 1]?.focus()
      }
    }

    return (
      <div className="code-row">
        {otp.map((v, i) => (
          <input
            key={i}
            maxLength={1}
            inputMode="numeric"
            pattern="[0-9]*"
            className="code-input"
            value={v}
            onChange={e => handleChange(i, e.target.value)}
            onPaste={handlePaste}
            onKeyDown={e => handleKeyDown(i, e)}
            onFocus={e => e.target.select()}
          />
        ))}
      </div>
    )
  }

  // ── render ───────────────────────────────────────────────────────────────

  return (
    <main className="auth">
      <aside className="auth-side">
        <a href="/" className="logo">
          <img src="/icon.svg" alt="" />
          <span className="logo-text"><b>Implant</b><span>ID</span></span>
        </a>
        <div>
          <h2>Let's get you back in.</h2>
          <p>Enter your email and we'll send a 6-digit code. Most people are back signed in within a minute.</p>
        </div>
        <div className="quote">
          <p>"Security-first infrastructure means no more shared logins. Every scan is audited to the individual clinician."</p>
          <cite>HIPAA-grade · SOC 2 in progress</cite>
        </div>
      </aside>

      <section className="auth-main">
        <div className="auth-box">

          {error && (
            <div style={{ background: 'color-mix(in srgb,var(--err) 10%,transparent)', border: '1px solid color-mix(in srgb,var(--err) 25%,transparent)', borderRadius: 10, padding: '10px 14px', fontSize: 13.5, color: 'var(--err)', marginBottom: 16 }}>
              {error}
            </div>
          )}

          {/* ── Step 1: Email entry ─────────────────────────────────────── */}
          {phase === 'email' && (
            <>
              <h1>Reset your password</h1>
              <p className="sub">We'll send a 6-digit code to verify it's you, then you can set a new one.</p>
              <div className="field">
                <label>Email address</label>
                <div className="i-wrap">
                  <input
                    className="input"
                    type="email"
                    placeholder="you@clinic.com"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && sendResetCode()}
                  />
                </div>
              </div>
              <button type="button" className="btn btn-s btn-lg btn-block" onClick={sendResetCode} disabled={loading}>
                {loading ? 'Sending…' : 'Send reset code →'}
              </button>
              <p className="auth-alt"><a href="/login">← Back to log in</a></p>
            </>
          )}

          {/* ── Step 2: OTP entry ───────────────────────────────────────── */}
          {phase === 'otp' && (
            <>
              <h1>Check your email</h1>
              <p className="sub" style={{ marginBottom: 20 }}>
                We sent a 6-digit code to <strong>{email}</strong>. Enter it below — it expires in 10 minutes.
              </p>
              <OtpInputs onComplete={verifyResetCode} />
              <p style={{ fontSize: 13, color: 'var(--muted)', textAlign: 'center', margin: '16px 0' }}>
                Didn't get it?{' '}
                <button type="button" className="link-btn" onClick={sendResetCode}>Resend code</button>
              </p>
              <div style={{ display: 'flex', gap: 10 }}>
                <button type="button" className="btn btn-lg" onClick={() => { setPhase('email'); setError('') }}>← Back</button>
                <button type="button" className="btn btn-s btn-lg" style={{ flex: 1 }} onClick={() => verifyResetCode()} disabled={loading}>
                  {loading ? 'Verifying…' : 'Verify code →'}
                </button>
              </div>
            </>
          )}

          {/* ── Step 3: New password ────────────────────────────────────── */}
          {phase === 'password' && (
            <>
              <h1>Set a new password</h1>
              <p className="sub">Choose something strong that you haven't used before.</p>
              <form onSubmit={submitNewPassword}>
                <div className="field">
                  <label>New password</label>
                  <div className="i-wrap">
                    <input
                      className="input"
                      type={showPw ? 'text' : 'password'}
                      placeholder="Min. 8 characters"
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                    />
                    <button type="button" className="i-tog" onClick={() => setShowPw(v => !v)} aria-label="Show password">
                      {showPw
                        ? <svg className="eye-c" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" /><line x1="1" y1="1" x2="23" y2="23" /></svg>
                        : <svg className="eye-o" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" /></svg>
                      }
                    </button>
                  </div>
                </div>
                <div className="field">
                  <label>Confirm password</label>
                  <div className="i-wrap">
                    <input
                      className="input"
                      type={showPw ? 'text' : 'password'}
                      placeholder="Repeat password"
                      value={confirmPassword}
                      onChange={e => setConfirmPassword(e.target.value)}
                    />
                  </div>
                </div>
                <button type="submit" className="btn btn-s btn-lg btn-block" style={{ marginTop: 8 }} disabled={loading}>
                  {loading ? 'Saving…' : 'Set new password →'}
                </button>
              </form>
            </>
          )}

          {/* ── Done ────────────────────────────────────────────────────── */}
          {phase === 'done' && (
            <div style={{ textAlign: 'center', padding: '24px 0' }}>
              <div style={{ width: 52, height: 52, borderRadius: '50%', background: 'color-mix(in srgb,var(--accent) 15%,transparent)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2.5"><polyline points="20 6 9 17 4 12" /></svg>
              </div>
              <h1>Password updated</h1>
              <p className="sub">You're signed in. Taking you to your dashboard…</p>
            </div>
          )}

        </div>
      </section>
    </main>
  )
}
