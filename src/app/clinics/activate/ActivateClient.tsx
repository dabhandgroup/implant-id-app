'use client'

import { useSignUp } from '@clerk/nextjs'
import { useRouter, useSearchParams } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'

export default function ActivateClient() {
  const { signUp, isLoaded, setActive } = useSignUp()
  const searchParams = useSearchParams()
  const router = useRouter()
  const ticket = searchParams.get('__clerk_ticket')

  const [status, setStatus] = useState<'activating' | 'error'>('activating')
  const [errorMsg, setErrorMsg] = useState('')
  const attempted = useRef(false)

  useEffect(() => {
    if (!isLoaded || !signUp || !ticket || attempted.current) return
    attempted.current = true
    ;(async () => {
      try {
        const result = await signUp.create({ strategy: 'ticket', ticket })
        if (result.status === 'complete') {
          await setActive({ session: result.createdSessionId })
          router.replace('/clinics/dashboard')
        } else {
          setStatus('error')
          setErrorMsg('Account activation could not be completed automatically. Please contact support@implantid.io.')
        }
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Something went wrong during activation.'
        setStatus('error')
        setErrorMsg(msg)
      }
    })()
  }, [isLoaded, signUp, setActive, ticket, router])

  if (!ticket) {
    return (
      <main style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg)' }}>
        <div style={{ maxWidth: 420, padding: '40px 32px', background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 12, textAlign: 'center' }}>
          <p style={{ margin: 0, color: 'var(--err)', fontSize: 15 }}>
            Invalid activation link — the link may have expired or already been used.
            Please contact <a href="mailto:support@implantid.io" style={{ color: 'var(--accent-deep)' }}>support@implantid.io</a>.
          </p>
        </div>
      </main>
    )
  }

  if (status === 'error') {
    return (
      <main style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg)' }}>
        <div style={{ maxWidth: 420, padding: '40px 32px', background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 12, textAlign: 'center' }}>
          <p style={{ margin: '0 0 12px', color: 'var(--err)', fontSize: 15 }}>{errorMsg}</p>
          <a href="/login" style={{ color: 'var(--accent-deep)', fontSize: 14 }}>Go to clinic sign-in →</a>
        </div>
      </main>
    )
  }

  return (
    <main style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg)' }}>
      <div style={{ maxWidth: 420, padding: '40px 32px', background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 12, textAlign: 'center' }}>
        <p style={{ margin: 0, color: 'var(--muted)', fontSize: 15 }}>Activating your clinic account…</p>
      </div>
    </main>
  )
}
