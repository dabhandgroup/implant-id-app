'use client'
import { useState }          from 'react'
import { useSignUp }         from '@clerk/nextjs'
import { useRouter }         from 'next/navigation'
import { setUserRoleIfNew }  from '../../actions/setUserRole'

type Phase = 'email' | 'otp'

export default function SignUpClient() {
  // Clerk v7 Signals API — signUp is SignUpFutureResource
  const { signUp } = useSignUp()
  const router     = useRouter()

  const [phase,     setPhase]     = useState<Phase>('email')
  const [firstName, setFirstName] = useState('')
  const [lastName,  setLastName]  = useState('')
  const [email,     setEmail]     = useState('')
  const [otp,       setOtp]       = useState(['','','','','',''])
  const [loading,   setLoading]   = useState(false)
  const [error,     setError]     = useState('')

  function err(msg: string) { setError(msg); setLoading(false) }
  function clearErr()        { setError('') }

  function clerkErr(e: unknown) {
    return (e as { errors?: { message?: string }[] })?.errors?.[0]?.message
      ?? (e instanceof Error ? e.message : 'Something went wrong — please try again')
  }

  // ── Step 1: create account + send verification email ──────────────────────

  async function sendCode(e: React.FormEvent) {
    e.preventDefault()
    if (!firstName.trim()) return err('Enter your first name')
    if (!lastName.trim())  return err('Enter your last name')
    if (!email.trim() || !email.includes('@')) return err('Enter a valid email address')

    setLoading(true); clearErr()
    try {
      const { error: ce } = await signUp!.create({
        emailAddress: email.trim().toLowerCase(),
        firstName:    firstName.trim(),
        lastName:     lastName.trim(),
      })
      if (ce) return err(ce.message ?? 'Could not create account')

      const { error: se } = await signUp!.verifications.sendEmailCode()
      if (se) return err(se.message ?? 'Could not send verification code')

      setOtp(['','','','','',''])
      setPhase('otp')
    } catch (e) { err(clerkErr(e)) } finally { setLoading(false) }
  }

  // ── Step 2: verify OTP + finalize session ─────────────────────────────────

  async function verify(code?: string) {
    const c = code ?? otp.join('')
    if (c.length < 6) return err('Enter the 6-digit code')
    setLoading(true); clearErr()
    try {
      const { error: ve } = await signUp!.verifications.verifyEmailCode({ code: c })
      if (ve) return err(ve.message ?? 'Invalid or expired code')

      // Verification succeeded — finalize to set the active session
      const { error: fe } = await signUp!.finalize()
      if (fe) return err(fe.message ?? 'Could not complete sign-up')

      // Stamp the patient role (non-fatal)
      await setUserRoleIfNew('patient').catch(() => { /* non-fatal */ })

      router.replace('/patients/register')
    } catch (e) { err(clerkErr(e)) } finally { setLoading(false) }
  }

  async function resendCode() {
    setLoading(true); clearErr()
    try {
      const { error: se } = await signUp!.verifications.sendEmailCode()
      if (se) err(se.message ?? 'Could not resend code')
      else setOtp(['','','','','',''])
    } catch (e) { err(clerkErr(e)) } finally { setLoading(false) }
  }

  // ── OTP input ─────────────────────────────────────────────────────────────

  function handleOtpChange(i: number, val: string) {
    const digit = val.slice(-1)
    const next  = [...otp]; next[i] = digit; setOtp(next)
    if (digit && i < 5) {
      document.querySelectorAll<HTMLInputElement>('.code-input')[i + 1]?.focus()
    }
    if (i === 5 && digit) {
      const code = [...otp.slice(0, 5), digit].join('')
      if (code.length === 6) verify(code)
    }
  }

  function handleOtpPaste(e: React.ClipboardEvent<HTMLInputElement>) {
    e.preventDefault()
    const digits = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6)
    if (!digits) return
    const next = ['','','','','','']
    for (let i = 0; i < digits.length; i++) next[i] = digits[i]
    setOtp(next)
    document.querySelectorAll<HTMLInputElement>('.code-input')[Math.min(digits.length - 1, 5)]?.focus()
    if (digits.length === 6) verify(digits)
  }

  function handleOtpKeyDown(i: number, e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Backspace' && !otp[i] && i > 0) {
      document.querySelectorAll<HTMLInputElement>('.code-input')[i - 1]?.focus()
    }
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <main className="auth">

      {/* ── Left panel ────────────────────────────────────────────────── */}
      <aside className="auth-side">
        <a href="/" className="logo">
          <img src="/icon.svg" alt="" />
          <span className="logo-text"><b>Implant</b><span>ID</span></span>
        </a>
        <div>
          <h2>Your implant.<br/>Always with you.</h2>
          <p>
            Create your free patient record in minutes. Your data is encrypted,
            clinician-verified and accessible worldwide via your digital wallet pass.
          </p>
        </div>
        <div className="quote">
          <p>"My wallet pass saved 20 minutes before my MRI. The radiographer had everything she needed."</p>
          <cite>Sarah M. · Pacemaker patient, Manchester</cite>
        </div>
      </aside>

      {/* ── Right panel ───────────────────────────────────────────────── */}
      <section className="auth-main">
        <div className="auth-box">

          {error && (
            <div style={{
              background:'color-mix(in srgb,var(--err) 10%,transparent)',
              border:'1px solid color-mix(in srgb,var(--err) 25%,transparent)',
              borderRadius:10, padding:'10px 14px', fontSize:13.5,
              color:'var(--err)', marginBottom:16,
            }}>
              {error}
            </div>
          )}

          {/* ── Phase 1: Enter details ──────────────────────────────── */}
          {phase === 'email' && (
            <>
              <h1>Create your account</h1>
              <p className="sub" style={{ marginBottom:24 }}>
                Step 1 of 2 — We'll send a verification code to your email.
              </p>

              <form onSubmit={sendCode}>
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

                <div className="field" style={{ marginTop:12 }}>
                  <label>Email address<span style={{ color:'var(--err)',marginLeft:3 }}>*</span></label>
                  <div className="i-wrap">
                    <svg className="i-ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
                      <path d="M4 4h16a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z"/>
                      <path d="m22 6-10 7L2 6"/>
                    </svg>
                    <input className="input" type="email" placeholder="you@email.com"
                      autoComplete="email" value={email} onChange={e => setEmail(e.target.value)} />
                  </div>
                </div>

                <button type="submit" className="btn btn-s btn-lg btn-block" style={{ marginTop:20 }} disabled={loading}>
                  {loading ? 'Sending code…' : 'Send verification code →'}
                </button>
              </form>

              <p className="auth-alt" style={{ marginTop:20 }}>
                Already have an account? <a href="/login">Log in</a>
              </p>
              <p style={{ textAlign:'center', marginTop:12, fontSize:13, color:'var(--muted)' }}>
                Registering a clinic?{' '}
                <a href="/clinics/onboarding" style={{ color:'var(--accent)', fontWeight:600 }}>
                  Apply here →
                </a>
              </p>
            </>
          )}

          {/* ── Phase 2: Enter OTP ─────────────────────────────────── */}
          {phase === 'otp' && (
            <>
              <h1>Check your email</h1>
              <p className="sub" style={{ marginBottom:24 }}>
                We've sent a 6-digit code to <strong>{email}</strong>.
                Enter it below — it expires in 10 minutes.
              </p>

              <div className="code-row">
                {otp.map((v, i) => (
                  <input
                    key={i}
                    maxLength={1}
                    inputMode="numeric"
                    pattern="[0-9]*"
                    className="code-input"
                    value={v}
                    onChange={e => handleOtpChange(i, e.target.value)}
                    onPaste={handleOtpPaste}
                    onKeyDown={e => handleOtpKeyDown(i, e)}
                    onFocus={e => e.target.select()}
                    autoFocus={i === 0}
                  />
                ))}
              </div>

              <p style={{ fontSize:13, color:'var(--muted)', textAlign:'center', margin:'16px 0' }}>
                Didn't get it?{' '}
                <button type="button" className="link-btn" onClick={resendCode} disabled={loading}>
                  Resend code
                </button>
              </p>

              <div style={{ display:'flex', gap:10 }}>
                <button type="button" className="btn btn-lg"
                  onClick={() => { setPhase('email'); clearErr() }}>
                  ← Back
                </button>
                <button type="button" className="btn btn-s btn-lg" style={{ flex:1 }}
                  onClick={() => verify()} disabled={loading}>
                  {loading ? 'Verifying…' : 'Verify & continue →'}
                </button>
              </div>

              <p style={{ textAlign:'center', marginTop:16, fontSize:13, color:'var(--muted)' }}>
                After verification you'll complete your patient record.
              </p>
            </>
          )}

        </div>
      </section>
    </main>
  )
}
