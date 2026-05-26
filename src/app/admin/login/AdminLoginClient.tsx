'use client'
import { useState, useRef } from 'react'

// ── OTP inputs — module level so React never remounts on state change ──────────

interface OtpProps {
  otp: string[]
  setOtp: (v: string[]) => void
  onComplete: (code: string) => void
}

function OtpInputs({ otp, setOtp, onComplete }: OtpProps) {
  const refs = useRef<(HTMLInputElement | null)[]>([])

  function handleChange(i: number, raw: string) {
    const digit = raw.replace(/\D/g, '').slice(-1)
    const next = [...otp]
    next[i] = digit
    setOtp(next)
    if (digit && i < 5) refs.current[i + 1]?.focus()
    if (i === 5 && digit) {
      const code = [...otp.slice(0, 5), digit].join('')
      if (code.length === 6) onComplete(code)
    }
  }

  function handleKeyDown(i: number, e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Backspace' && !otp[i] && i > 0) {
      const next = [...otp]
      next[i - 1] = ''
      setOtp(next)
      refs.current[i - 1]?.focus()
    }
  }

  function handlePaste(e: React.ClipboardEvent<HTMLInputElement>) {
    e.preventDefault()
    const digits = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6)
    if (!digits) return
    const next = ['', '', '', '', '', '']
    for (let i = 0; i < digits.length; i++) next[i] = digits[i]
    setOtp(next)
    refs.current[Math.min(digits.length - 1, 5)]?.focus()
    if (digits.length === 6) onComplete(digits)
  }

  return (
    <div className="adm-2fa">
      {otp.map((v, i) => (
        <input
          key={i}
          ref={el => { refs.current[i] = el }}
          maxLength={2}
          inputMode="numeric"
          pattern="[0-9]*"
          autoComplete={i === 0 ? 'one-time-code' : 'off'}
          value={v}
          onChange={e => handleChange(i, e.target.value)}
          onKeyDown={e => handleKeyDown(i, e)}
          onPaste={handlePaste}
          onFocus={e => e.target.select()}
          aria-label={`Digit ${i + 1} of 6`}
        />
      ))}
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

export default function AdminLoginClient() {
  const [email,    setEmail]    = useState('')
  const [password, setPassword] = useState('')
  const [showPw,   setShowPw]   = useState(false)
  const [show2FA,  setShow2FA]  = useState(false)
  const [otp,      setOtp]      = useState(['', '', '', '', '', ''])
  const [loading,  setLoading]  = useState(false)
  const [error,    setError]    = useState('')

  function otpVal() { return otp.join('') }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!email.trim())    { setError('Enter your email address'); return }
    if (!password.trim()) { setError('Enter your password');      return }

    if (!show2FA) {
      setShow2FA(true)
      setError('')
      return
    }

    const code = otpVal()
    if (code.length < 6) { setError('Enter the 6-digit code from your authenticator app'); return }

    setLoading(true)
    setError('')
    // Navigate on success — no Clerk wiring yet
    setTimeout(() => {
      window.location.href = '/admin/dashboard'
    }, 600)
  }

  function handleOtpComplete(code: string) {
    if (code.length === 6 && email.trim() && password.trim()) {
      setLoading(true)
      setError('')
      setTimeout(() => {
        window.location.href = '/admin/dashboard'
      }, 400)
    }
  }

  return (
    <div>
      <div className="adm-box">
        <div className="adm-glow" aria-hidden="true" />

        {/* Lock icon */}
        <div className="adm-lock" aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
            <path d="M7 11V7a5 5 0 0 1 10 0v4" />
          </svg>
        </div>

        <h1>Admin access</h1>
        <p>
          Manufacturer and data admin portal — adding devices, attaching PDFs, managing catalogue data.
          All actions are logged.
        </p>

        {error && <div className="adm-err" role="alert">{error}</div>}

        <form onSubmit={handleSubmit} noValidate>
          {/* Email */}
          <div className="adm-field">
            <label htmlFor="adm-email">Email</label>
            <input
              id="adm-email"
              type="email"
              placeholder="you@company.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
              autoComplete="email"
              disabled={loading || show2FA}
            />
          </div>

          {/* Password */}
          <div className="adm-field">
            <label htmlFor="adm-password">Password</label>
            <div className="adm-pw-wrap">
              <input
                id="adm-password"
                type={showPw ? 'text' : 'password'}
                placeholder="••••••••••"
                value={password}
                onChange={e => setPassword(e.target.value)}
                autoComplete="current-password"
                disabled={loading || show2FA}
              />
              <button
                type="button"
                className="adm-pw-tog"
                onClick={() => setShowPw(v => !v)}
                aria-label={showPw ? 'Hide password' : 'Show password'}
              >
                {showPw
                  ? <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
                  : <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                }
              </button>
            </div>
          </div>

          {/* 2FA section */}
          {show2FA && (
            <div className="adm-field">
              <label>Authenticator code</label>
              <p className="adm-2fa-label">Enter the 6-digit code from your authenticator app.</p>
              <OtpInputs otp={otp} setOtp={setOtp} onComplete={handleOtpComplete} />
            </div>
          )}

          <button type="submit" className="adm-btn" disabled={loading}>
            {loading
              ? 'Signing in…'
              : show2FA
                ? 'Verify & sign in →'
                : 'Sign in to admin →'}
          </button>
        </form>

        <div className="adm-foot">
          Manufacturer?{' '}
          <a href="/contact">Contact us to get access</a>
          {' · '}
          <a href="/">Back to site</a>
        </div>
      </div>
    </div>
  )
}
