'use client'
import { useState } from 'react'
import { useSignUp, useUser } from '@clerk/nextjs'
import { useRouter } from 'next/navigation'
import { setUserRoleIfNew } from '../../../actions/setUserRole'

export default function ManufacturerSignUpClient() {
  const { signUp } = useSignUp()
  const { user } = useUser()
  const router = useRouter()

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [email, setEmail] = useState('')

  async function handleSignUp(e: React.FormEvent) {
    e.preventDefault()
    if (!signUp) return

    if (!email.trim() || !email.includes('@')) {
      setError('Enter a valid email address')
      return
    }

    setLoading(true)
    setError('')

    try {
      const { error: createErr } = await signUp.create({ emailAddress: email.trim().toLowerCase() })
      if (createErr) {
        setError(createErr.message ?? 'Could not create account')
        setLoading(false)
        return
      }

      const { error: sendErr } = await signUp.verifications.sendEmailCode()
      if (sendErr) {
        setError(sendErr.message ?? 'Could not send verification code')
        setLoading(false)
        return
      }

      // Mark this as a manufacturer sign-up
      await setUserRoleIfNew('manufacturer')

      router.push(`/manufacturer/sign-up/verify?email=${encodeURIComponent(email)}`)
    } catch (err) {
      setError((err as any)?.message ?? 'Something went wrong')
      setLoading(false)
    }
  }

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '100vh',
      background: 'var(--bg)',
      padding: '20px',
    }}>
      <div style={{
        width: '100%',
        maxWidth: '400px',
        background: 'var(--bg2)',
        borderRadius: '12px',
        padding: '32px 24px',
        border: '1px solid var(--border)',
      }}>
        <h1 style={{
          fontSize: '24px',
          fontWeight: 600,
          color: 'var(--text)',
          marginBottom: '8px',
          textAlign: 'center',
        }}>
          Join Implant ID
        </h1>
        <p style={{
          fontSize: '14px',
          color: 'var(--muted)',
          textAlign: 'center',
          marginBottom: '24px',
        }}>
          Create your manufacturer account
        </p>

        <form onSubmit={handleSignUp}>
          <div className="field">
            <label>Email address</label>
            <input
              className="input"
              type="email"
              placeholder="you@company.com"
              value={email}
              onChange={e => { setEmail(e.target.value); setError('') }}
              disabled={loading}
            />
          </div>

          {error && (
            <div style={{
              background: 'color-mix(in srgb, var(--err) 10%, transparent)',
              border: '1px solid var(--err)',
              borderRadius: '8px',
              padding: '12px',
              color: 'var(--err)',
              fontSize: '13px',
              marginBottom: '16px',
              textAlign: 'center',
            }}>
              {error}
            </div>
          )}

          <button
            type="submit"
            className="btn btn-s btn-lg btn-block"
            disabled={loading}
          >
            {loading ? 'Creating account…' : 'Continue →'}
          </button>
        </form>
      </div>
    </div>
  )
}
