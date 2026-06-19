'use client'
import { useState } from 'react'
import { useSignUp } from '@clerk/nextjs'
import { useRouter, useSearchParams } from 'next/navigation'

export default function ManufacturerVerifyClient() {
  const { signUp } = useSignUp()
  const router = useRouter()
  const searchParams = useSearchParams()

  const email = searchParams.get('email') || ''
  const [otp, setOtp] = useState(['', '', '', '', '', ''])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  function handleOtpChange(index: number, value: string) {
    const clean = value.replace(/\D/g, '')
    if (clean.length > 1) {
      const digits = clean.slice(0, 6)
      const next = ['', '', '', '', '', '']
      for (let j = 0; j < digits.length; j++) next[j] = digits[j]
      setOtp(next)
      const inputs = document.querySelectorAll<HTMLInputElement>('.code-input')
      inputs[Math.min(digits.length - 1, 5)]?.focus()
      return
    }
    const digit = clean
    const newOtp = [...otp]
    newOtp[index] = digit
    setOtp(newOtp)
    if (digit && index < 5) {
      const inputs = document.querySelectorAll<HTMLInputElement>('.code-input')
      inputs[index + 1]?.focus()
    }
  }

  async function handleVerify(e: React.FormEvent) {
    e.preventDefault()
    const code = otp.join('')

    if (code.length !== 6) {
      setError('Enter all 6 digits')
      return
    }

    if (!signUp) return

    setLoading(true)
    setError('')

    try {
      const { error: verifyErr } = await signUp.verifications.verifyEmailCode({ code })
      if (verifyErr) {
        setError(verifyErr.message ?? 'Invalid code')
        setLoading(false)
        return
      }

      // Email verified, finalize the sign-up and redirect
      const { error: finalizeErr } = await signUp.finalize()
      if (finalizeErr) {
        setError(finalizeErr.message ?? 'Could not complete sign-up')
        setLoading(false)
        return
      }

      router.push('/manufacturer/dashboard')
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
          Verify your email
        </h1>
        <p style={{
          fontSize: '14px',
          color: 'var(--muted)',
          textAlign: 'center',
          marginBottom: '24px',
        }}>
          We've sent a code to {email}
        </p>

        <form onSubmit={handleVerify}>
          <div style={{
            display: 'flex',
            gap: '8px',
            justifyContent: 'center',
            marginBottom: '16px',
          }}>
            {otp.map((digit, i) => (
              <input
                key={i}
                type="text"
                className="code-input"
                maxLength={6}
                inputMode="numeric"
                autoComplete="one-time-code"
                value={digit}
                onChange={e => handleOtpChange(i, e.target.value)}
                disabled={loading}
                autoFocus={i === 0}
              />
            ))}
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
            {loading ? 'Verifying…' : 'Verify email →'}
          </button>
        </form>
      </div>
    </div>
  )
}
