'use client'

import { useSignUp, useUser } from '@clerk/nextjs'
import { useSearchParams, useRouter } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'

export default function ClinicActivateClient() {
  const router       = useRouter()
  const searchParams = useSearchParams()
  const email  = searchParams.get('email') ?? ''
  const ticket = searchParams.get('ticket') ?? ''

  const { signUp, setActive } = useSignUp()
  const { isLoaded, isSignedIn, user } = useUser()

  const [phase,    setPhase]    = useState<'idle' | 'loading' | 'error'>('idle')
  const [errorMsg, setErrorMsg] = useState('')
  const attempted = useRef(false)

  // If already signed in, redirect to the right dashboard
  useEffect(() => {
    if (!isLoaded || !isSignedIn) return
    const role = (user?.publicMetadata?.role as string | undefined) ?? ''
    if      (role === 'admin')   router.replace('/master/dashboard')
    else if (role === 'patient') router.replace('/patients/dashboard')
    else                         router.replace('/clinics/dashboard')
  }, [isLoaded, isSignedIn, user, router])

  async function activate() {
    if (!signUp || !ticket || attempted.current) return
    attempted.current = true
    setPhase('loading')
    try {
      const result = await signUp.create({ strategy: 'ticket', ticket })
      if (result.status === 'complete') {
        await setActive({ session: result.createdSessionId })
        window.location.href = '/clinics/dashboard'
      } else {
        attempted.current = false
        setPhase('error')
        // Show the status so we can diagnose (e.g. 'missing_requirements')
        const missing = (result as unknown as { missingFields?: string[] })?.missingFields?.join(', ')
        setErrorMsg(
          `Activation returned status "${result.status}"` +
          (missing ? ` — missing: ${missing}` : '') +
          '. Please contact support@implantid.io or ask your admin to resend the activation email.'
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
          <h2>Every implant.<br />One scan.</h2>
          <p>The modern database for MRI implant safety. Scan the patient's Apple Wallet pass — full profile in under two seconds.</p>
        </div>
        <div className="quote">
          <p>&ldquo;I used to call three manufacturers before every scan. Now I just hold up my phone.&rdquo;</p>
          <cite>Dr M. Okafor · Consultant Radiologist</cite>
        </div>
      </aside>

      {/* ── Right panel ── */}
      <section className="auth-main">
        <div className="auth-box">
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '1.4px', textTransform: 'uppercase', color: 'var(--accent)', marginBottom: 10 }}>
            Clinic Portal
          </div>
          <h1>Activate your account</h1>
          <p className="sub">Your clinic has been approved. Click below to activate and sign in.</p>

          {/* Error banner */}
          {phase === 'error' && (
            <div style={{ background: 'color-mix(in srgb,var(--err) 10%,transparent)', border: '1px solid color-mix(in srgb,var(--err) 25%,transparent)', borderRadius: 10, padding: '12px 14px', fontSize: 13.5, color: 'var(--err)', marginBottom: 16 }}>
              <div style={{ marginBottom: 6 }}>{errorMsg}</div>
              <div style={{ fontSize: 13, color: 'var(--muted)' }}>
                If this link has expired, ask your administrator to resend the activation email.
              </div>
            </div>
          )}

          {/* Invalid link */}
          {!ticket && (
            <div style={{ background: 'color-mix(in srgb,var(--err) 8%,transparent)', border: '1px solid color-mix(in srgb,var(--err) 20%,transparent)', borderRadius: 10, padding: '14px 16px', marginBottom: 20 }}>
              <p style={{ margin: '0 0 8px', color: 'var(--err)', fontSize: 14, fontWeight: 500 }}>
                This activation link is invalid or has already been used.
              </p>
              <p style={{ margin: 0, color: 'var(--muted)', fontSize: 13 }}>
                Ask your administrator to resend the activation email, or contact{' '}
                <a href="mailto:support@implantid.io" style={{ color: 'var(--accent-deep)' }}>
                  support@implantid.io
                </a>
              </p>
            </div>
          )}

          {/* Email display */}
          {email && (
            <div style={{ background: 'color-mix(in srgb,var(--accent) 8%,transparent)', border: '1px solid color-mix(in srgb,var(--accent) 20%,transparent)', borderRadius: 10, padding: '13px 16px', marginBottom: 24 }}>
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
              aria-label="Activate clinic account"
            >
              {phase === 'loading' ? 'Activating…' : 'Activate Account →'}
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
