'use client'

import { useState, useRef, useEffect } from 'react'
import { useSignIn, useUser }          from '@clerk/nextjs'
import { useRouter, useSearchParams }  from 'next/navigation'

// ── OTP input row ─────────────────────────────────────────────────────────────
interface OtpProps { otp: string[]; setOtp: (v: string[]) => void; onComplete: (c: string) => void }
function OtpRow({ otp, setOtp, onComplete }: OtpProps) {
  function handleChange(i: number, raw: string) {
    const digit = raw.replace(/\D/g, '').slice(-1)
    const next = [...otp]; next[i] = digit; setOtp(next)
    if (digit && i < 5) document.querySelectorAll<HTMLInputElement>('.mfr-otp-input')[i + 1]?.focus()
    if (i === 5 && digit) {
      const code = [...otp.slice(0, 5), digit].join('')
      if (code.length === 6) onComplete(code)
    }
  }
  function handleKeyDown(i: number, e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Backspace' && !otp[i] && i > 0) {
      const next = [...otp]; next[i - 1] = ''; setOtp(next)
      document.querySelectorAll<HTMLInputElement>('.mfr-otp-input')[i - 1]?.focus()
    }
  }
  function handlePaste(e: React.ClipboardEvent<HTMLInputElement>) {
    e.preventDefault()
    const digits = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6)
    if (!digits) return
    const next = ['','','','','','']
    for (let i = 0; i < digits.length; i++) next[i] = digits[i]
    setOtp(next)
    if (digits.length === 6) onComplete(digits)
  }
  return (
    <div style={{ display: 'flex', gap: 8, margin: '16px 0 4px' }}>
      {otp.map((v, i) => (
        <input key={i} className="mfr-otp-input input" maxLength={2} inputMode="numeric" pattern="[0-9]*"
          value={v} onChange={e => handleChange(i, e.target.value)}
          onKeyDown={e => handleKeyDown(i, e)} onPaste={handlePaste}
          onFocus={e => e.target.select()}
          style={{ width: 46, height: 52, textAlign: 'center', fontSize: 22, fontWeight: 600, fontFamily: 'var(--ff)', padding: 0 }}
        />
      ))}
    </div>
  )
}

type Phase = 'email' | 'otp'

export default function ManufacturerLoginClient() {
  const { signIn } = useSignIn()
  const { isLoaded, isSignedIn, user } = useUser()
  const router       = useRouter()
  const searchParams = useSearchParams()
  const prefillEmail = searchParams.get('email') ?? ''

  const [phase,   setPhase]   = useState<Phase>('email')
  const [email,   setEmail]   = useState(prefillEmail)
  const [otp,     setOtp]     = useState(['','','','','',''])
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState('')
  const autoSent = useRef(false)

  // Redirect if already signed in as manufacturer
  useEffect(() => {
    if (!isSignedIn || !user) return
    const role = (user.publicMetadata?.role as string) ?? 'patient'
    if (role === 'manufacturer') router.replace('/manufacturer/dashboard')
    else if (role === 'admin')   router.replace('/manufacturer/dashboard')
  }, [isSignedIn, user, router])

  // Auto-send OTP if email pre-filled from approval link
  useEffect(() => {
    if (!prefillEmail || autoSent.current || !isLoaded || !signIn) return
    autoSent.current = true
    setLoading(true)
    signIn.create({ identifier: prefillEmail })
      .then(({ error: ce }) => {
        if (ce) { setError('No account found for this email. Contact support@implantid.io.'); setLoading(false); return }
        return signIn.emailCode.sendCode()
      })
      .then(res => {
        if (!res) return
        if (res.error) { setError(res.error.message ?? 'Could not send code'); setLoading(false); return }
        setOtp(['','','','','',''])
        setPhase('otp')
        setLoading(false)
      })
      .catch(() => { setError('Could not send code — enter your email below'); setLoading(false) })
  }, [isLoaded, signIn, prefillEmail]) // eslint-disable-line react-hooks/exhaustive-deps

  async function sendOtp(e?: React.FormEvent) {
    e?.preventDefault()
    if (!email.trim()) return
    setError(''); setLoading(true)
    try {
      const { error: ce } = await signIn!.create({ identifier: email.trim() })
      if (ce) { setError('No account found for this email. Contact support@implantid.io.'); return }
      const { error: se } = await signIn!.emailCode.sendCode()
      if (se) { setError(se.message ?? 'Could not send code'); return }
      setOtp(['','','','','','']); setPhase('otp')
    } catch (e) { setError((e as { message?: string })?.message ?? 'Error') }
    finally { setLoading(false) }
  }

  async function verifyOtp(code?: string) {
    const c = code ?? otp.join('')
    if (c.length < 6) return
    setError(''); setLoading(true)
    try {
      const { error: ve } = await signIn!.emailCode.verifyCode({ code: c })
      if (ve) { setError(ve.message ?? 'Invalid code — check and try again'); return }
      await signIn!.finalize()
      router.replace('/manufacturer/dashboard')
    } catch (e) { setError((e as { message?: string })?.message ?? 'Verification failed') }
    finally { setLoading(false) }
  }

  return (
    <main className="mauth">
      {/* ── Left panel ── */}
      <aside className="mauth-side">
        <a href="/" className="logo">
          <img src="/icon.svg" alt="" style={{ filter: 'brightness(0) invert(1)' }} />
          <span className="logo-text"><b>Implant</b><span>ID</span></span>
        </a>
        <div className="body">
          <h2>Upload your device data.</h2>
          <p>One place for clinics and patients to find every device you make — directly from your team.</p>
          <div className="mauth-feats">
            <div className="mauth-feat">
              <div className="i"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6M9 13h6M9 17h6"/></svg></div>
              <div><b>Bulk CSV import</b><span>Upload your full catalogue in one go.</span></div>
            </div>
            <div className="mauth-feat">
              <div className="i"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="m9 12 2 2 4-4"/></svg></div>
              <div><b>Manufacturer-verified flag</b><span>Every device you submit is marked verified, with a date and source link.</span></div>
            </div>
            <div className="mauth-feat">
              <div className="i"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg></div>
              <div><b>One source of truth</b><span>Update once — every clinic on the network sees it.</span></div>
            </div>
          </div>
        </div>
        <div className="quote">
          <p>&ldquo;We have one technical manual per device. Now there&apos;s one place clinicians actually look at it.&rdquo;</p>
          <cite>Manufacturer regulatory affairs lead</cite>
        </div>
      </aside>

      {/* ── Right panel ── */}
      <section className="mauth-main">
        <div className="mauth-box">
          <div className="ey">Manufacturer portal</div>
          <h1>{phase === 'otp' ? 'Check your email' : 'Sign in to your portal'}</h1>
          <p className="sub">
            {phase === 'otp'
              ? `We sent a 6-digit code to ${email}. Enter it below to sign in.`
              : 'Manage your device catalogue, upload safety data and maintain the manufacturer-verified flag. All actions are logged.'}
          </p>

          {error && (
            <div style={{ background: 'rgba(239,68,68,.12)', border: '1px solid rgba(239,68,68,.3)', borderRadius: 8, padding: '10px 14px', fontSize: 13.5, color: '#fca5a5', marginBottom: 16 }}>
              {error}
            </div>
          )}

          {phase === 'email' ? (
            <form onSubmit={sendOtp}>
              <div className="field" style={{ marginBottom: 16 }}>
                <label>Work email</label>
                <div className="i-wrap">
                  <svg className="i-ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"><path d="M4 4h16a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z" /><path d="m22 6-10 7L2 6" /></svg>
                  <input className="input" type="email" placeholder="you@medtronic.com" required
                    value={email} onChange={e => setEmail(e.target.value)} autoComplete="email" autoFocus={!prefillEmail} />
                </div>
              </div>
              <button type="submit" className="mauth-btn" disabled={loading || !email.trim()}>
                {loading ? 'Sending code…' : 'Send verification code →'}
              </button>
            </form>
          ) : (
            <div>
              <OtpRow otp={otp} setOtp={setOtp} onComplete={verifyOtp} />
              <button className="mauth-btn" onClick={() => verifyOtp()} disabled={loading || otp.join('').length < 6} style={{ marginTop: 16 }}>
                {loading ? 'Verifying…' : 'Verify & sign in →'}
              </button>
              <p className="mauth-alt" style={{ marginTop: 16 }}>
                Didn&apos;t get it? <button type="button" onClick={() => sendOtp()} style={{ background: 'none', border: 'none', color: 'var(--accent)', cursor: 'pointer', fontFamily: 'var(--ff)', fontWeight: 600, fontSize: 13.5, padding: 0 }}>Resend code</button>
              </p>
              <p className="mauth-alt">
                <button type="button" onClick={() => { setPhase('email'); setOtp(['','','','','','']); setError('') }} style={{ background: 'none', border: 'none', color: 'var(--muted)', cursor: 'pointer', fontFamily: 'var(--ff)', fontSize: 13, padding: 0 }}>← Use a different email</button>
              </p>
            </div>
          )}

          <div className="mauth-divider">or</div>
          <p className="mauth-alt">Don&apos;t have an account yet? <a href="/manufacturer/onboarding">Request access →</a></p>

          <div className="mauth-foot">
            Not a manufacturer? <a href="/login">Clinic / patient login</a> · <a href="/">Back to the site</a>
          </div>
        </div>
      </section>
    </main>
  )
}
