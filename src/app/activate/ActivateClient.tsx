'use client'

import { useSignUp, useClerk } from '@clerk/nextjs'
import { useSearchParams } from 'next/navigation'
import { useRef, useState } from 'react'
import Link from 'next/link'

export default function ActivateClient() {
  const { signUp } = useSignUp()
  const { setActive } = useClerk()
  const searchParams = useSearchParams()

  const email  = searchParams.get('email') ?? ''
  const ticket = searchParams.get('ticket') ?? ''

  const [phase,    setPhase]    = useState<'idle' | 'loading' | 'error'>('idle')
  const [errorMsg, setErrorMsg] = useState('')
  const attempted = useRef(false)

  async function activate() {
    if (!signUp || !ticket || attempted.current) return
    attempted.current = true
    setPhase('loading')
    try {
      const { error } = await signUp.create({ strategy: 'ticket', ticket })
      if (error) throw error
      if (signUp.status === 'complete') {
        await setActive({ session: signUp.createdSessionId })
        window.location.href = '/clinics/dashboard'
      } else {
        attempted.current = false
        setPhase('error')
        setErrorMsg('Activation could not be completed. Please contact support@implantid.io.')
      }
    } catch (err: unknown) {
      attempted.current = false
      setPhase('error')
      const clerkMsg = (err as { errors?: { message: string }[] })?.errors?.[0]?.message
      setErrorMsg(clerkMsg ?? (err instanceof Error ? err.message : 'Something went wrong.'))
    }
  }

  // ── Invalid link ──────────────────────────────────────────────────────────────
  if (!ticket) {
    return (
      <Shell>
        <p style={{ color: 'var(--err)', fontSize: 15, margin: '0 0 20px' }}>
          This activation link is invalid or has already been used.
        </p>
        <p style={{ color: 'var(--muted)', fontSize: 14, margin: 0 }}>
          Ask your administrator to resend the activation email, or contact{' '}
          <a href="mailto:support@implantid.io" style={{ color: 'var(--accent-deep)' }}>
            support@implantid.io
          </a>
        </p>
      </Shell>
    )
  }

  // ── Activate ─────────────────────────────────────────────────────────────────
  return (
    <Shell>
      <div style={{
        fontSize: 11, fontWeight: 700, letterSpacing: '1.4px', textTransform: 'uppercase',
        color: 'var(--accent)', marginBottom: 16,
      }}>
        Clinic Portal
      </div>

      <h1 style={{
        fontFamily: 'var(--ff)', fontSize: 26, fontWeight: 600,
        letterSpacing: '-.025em', color: 'var(--text)', margin: '0 0 10px',
      }}>
        Activate your account
      </h1>

      <p style={{ color: 'var(--muted)', fontSize: 15, lineHeight: 1.6, margin: '0 0 28px' }}>
        Your clinic has been approved. Click below to activate your account and
        sign in to the Implant ID platform.
      </p>

      {/* Email display */}
      <div style={{
        background: 'color-mix(in srgb, var(--accent) 8%, transparent)',
        border: '1px solid color-mix(in srgb, var(--accent) 20%, transparent)',
        borderRadius: 10, padding: '13px 16px', marginBottom: 24,
      }}>
        <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '1.2px', textTransform: 'uppercase', color: 'var(--accent-deep)', marginBottom: 4 }}>
          Account email
        </div>
        <div style={{ fontSize: 15, fontWeight: 500, color: 'var(--text)', fontFamily: 'var(--fb)' }}>
          {email || '—'}
        </div>
      </div>

      {/* Error */}
      {phase === 'error' && (
        <div style={{
          background: 'color-mix(in srgb, var(--err) 8%, transparent)',
          border: '1px solid color-mix(in srgb, var(--err) 20%, transparent)',
          borderRadius: 10, padding: '12px 16px', marginBottom: 20,
        }}>
          <p style={{ margin: '0 0 8px', color: 'var(--err)', fontSize: 14 }}>{errorMsg}</p>
          <p style={{ margin: 0, color: 'var(--muted)', fontSize: 13 }}>
            If this link has expired, ask your admin to resend the activation email.
          </p>
        </div>
      )}

      {/* CTA */}
      <button
        className="btn btn-s btn-lg btn-block"
        onClick={activate}
        disabled={phase === 'loading' || !signUp}
        aria-label="Activate clinic account"
      >
        {phase === 'loading' ? 'Activating…' : 'Activate Account →'}
      </button>

      <p style={{ color: 'var(--muted2)', fontSize: 13, textAlign: 'center', marginTop: 20 }}>
        Already have access?{' '}
        <Link
          href={email ? `/login?email=${encodeURIComponent(email)}` : '/login'}
          style={{ color: 'var(--accent-deep)', textDecoration: 'none' }}
        >
          Sign in
        </Link>
      </p>
    </Shell>
  )
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <main style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center',
      justifyContent: 'center', background: 'var(--bg)', padding: '24px 16px',
    }}>
      <div style={{
        width: '100%', maxWidth: 420,
        background: 'var(--bg2)', border: '1px solid var(--border)',
        borderRadius: 16, padding: '36px 32px',
      }}>
        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 32 }}>
          <div style={{
            width: 34, height: 34, borderRadius: 9,
            background: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
            </svg>
          </div>
          <span style={{ fontFamily: 'var(--ff)', fontWeight: 600, fontSize: 17, color: 'var(--text)', letterSpacing: '-.02em' }}>
            Implant ID
          </span>
        </div>

        {children}
      </div>
    </main>
  )
}
