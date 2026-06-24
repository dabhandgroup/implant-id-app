'use client'

import { useSignUp, useUser, useClerk } from '@clerk/nextjs'
import { useSearchParams, useRouter } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'

export default function PatientActivateClient() {
  const router       = useRouter()
  const searchParams = useSearchParams()
  const email  = searchParams.get('email') ?? ''
  const ticket = searchParams.get('ticket') ?? ''

  const { signUp } = useSignUp()
  const { setActive } = useClerk()
  const { isLoaded, isSignedIn, user } = useUser()

  const [phase,    setPhase]    = useState<'idle' | 'loading' | 'error'>('idle')
  const [errorMsg, setErrorMsg] = useState('')
  const attempted = useRef(false)

  // If already signed in, redirect to the correct portal
  useEffect(() => {
    if (!isLoaded || !isSignedIn) return
    const role = (user?.publicMetadata?.role as string | undefined) ?? ''
    if      (role === 'admin')        router.replace('/master/dashboard')
    else if (role === 'clinic_staff') router.replace('/clinics/dashboard')
    else if (role === 'surgeon')      router.replace('/surgeons/dashboard')
    else                              router.replace('/patients/dashboard')
  }, [isLoaded, isSignedIn, user, router])

  async function activate() {
    if (!signUp || !ticket || attempted.current) return
    attempted.current = true
    setPhase('loading')
    try {
      const { error } = await signUp.create({ strategy: 'ticket', ticket })
      if (error) throw error
      if (signUp.status === 'complete') {
        await setActive({ session: signUp.createdSessionId })
        window.location.href = '/patients/dashboard'
      } else {
        attempted.current = false
        setPhase('error')
        const missing = (signUp as unknown as { missingFields?: string[] })?.missingFields?.join(', ')
        setErrorMsg(
          `Activation returned status "${signUp.status}"` +
          (missing ? ` — missing: ${missing}` : '') +
          '. Please contact support@implantid.io for help.'
        )
      }
    } catch (err: unknown) {
      attempted.current = false
      setPhase('error')
      const clerkErr = err as { errors?: { message: string; code?: string; longMessage?: string }[] }
      const first    = clerkErr?.errors?.[0]
      const msg      = first
        ? `${first.message}${first.longMessage ? ` — ${first.longMessage}` : ''}${first.code ? ` (${first.code})` : ''}`
        : (err instanceof Error ? err.message : 'Something went wrong.')
      setErrorMsg(msg)
    }
  }

  // Suppress form while session resolves
  if (isLoaded && isSignedIn) {
    return (
      <main style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: 'var(--bg)' }}>
        <div style={{ fontFamily: 'var(--ff)', fontSize: 14, color: 'var(--muted)' }}>Redirecting…</div>
      </main>
    )
  }

  return (
    <main className="auth">
      {/* ── Left panel ── */}
      <aside className="auth-side">
        <a href="/" className="logo">
          <img src="/icon.svg" alt="" />
          <span className="logo-text"><b>Implant</b><span>ID</span></span>
        </a>
        <div>
          <h2>Your implant.<br />Always with you.</h2>
          <p>Access your MRI safety record, add your implant card to Apple or Google Wallet, and share your details with any clinic instantly.</p>
        </div>
        <div className="quote">
          <p>&ldquo;I used to carry a piece of paper. Now my implant info is on my phone — always ready when I need it.&rdquo;</p>
          <cite>Patient, Implant ID</cite>
        </div>
      </aside>

      {/* ── Right panel ── */}
      <section className="auth-main">
        <div className="auth-box">
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '1.4px', textTransform: 'uppercase', color: 'var(--accent)', marginBottom: 10 }}>
            Patient Portal
          </div>
          <h1>Activate your account</h1>
          <p className="sub">Your clinic has registered your implant record. Click below to activate and access your patient portal.</p>

          {/* Error banner */}
          {phase === 'error' && (
            <div style={{ background: 'rgba(var(--err-rgb),0.10)', border: '1px solid rgba(var(--err-rgb),0.25)', borderRadius: 10, padding: '12px 14px', fontSize: 13.5, color: 'var(--err)', marginBottom: 16 }}>
              <div style={{ marginBottom: 6 }}>{errorMsg}</div>
              <div style={{ fontSize: 13, color: 'var(--muted)' }}>
                If this link has expired, contact your clinic and ask them to resend the invite.
              </div>
            </div>
          )}

          {/* Invalid link */}
          {!ticket && (
            <div style={{ background: 'rgba(var(--err-rgb),0.08)', border: '1px solid rgba(var(--err-rgb),0.20)', borderRadius: 10, padding: '14px 16px', marginBottom: 20 }}>
              <p style={{ margin: '0 0 8px', color: 'var(--err)', fontSize: 14, fontWeight: 500 }}>
                This activation link is invalid or has already been used.
              </p>
              <p style={{ margin: 0, color: 'var(--muted)', fontSize: 13 }}>
                Ask your clinic to resend the invitation email, or contact{' '}
                <a href="mailto:support@implantid.io" style={{ color: 'var(--accent-deep)' }}>
                  support@implantid.io
                </a>
              </p>
            </div>
          )}

          {/* Email display */}
          {email && (
            <div style={{ background: 'rgba(var(--accent-rgb),0.08)', border: '1px solid rgba(var(--accent-rgb),0.20)', borderRadius: 10, padding: '13px 16px', marginBottom: 24 }}>
              <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '1.2px', textTransform: 'uppercase', color: 'var(--accent-deep)', marginBottom: 4 }}>
                Activating account for
              </div>
              <div style={{ fontSize: 15, fontWeight: 500, color: 'var(--text)', fontFamily: 'var(--fb)' }}>
                {email}
              </div>
            </div>
          )}

          {/* CTA */}
          {ticket && (
            <button
              type="button"
              className="btn btn-s btn-lg btn-block"
              onClick={activate}
              disabled={phase === 'loading' || !signUp}
              aria-label="Activate patient account"
            >
              {phase === 'loading' ? 'Activating…' : 'Activate My Account →'}
            </button>
          )}

          <p className="auth-alt">
            Already have access?{' '}
            <a href={email ? `/login?email=${encodeURIComponent(email)}` : '/login'}>
              Sign in
            </a>
          </p>
        </div>
      </section>
    </main>
  )
}
