'use client'

import { useEffect } from 'react'
import { useClerk } from '@clerk/nextjs'
import LegalFooter from '@/components/LegalFooter'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  const { signOut } = useClerk()

  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <div style={{
      minHeight: '100vh',
      background: 'var(--bg)',
      display: 'flex',
      flexDirection: 'column',
      fontFamily: 'var(--fb)',
    }}>
      <div style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '60px 24px',
        textAlign: 'center',
      }}>
        <a href="/" style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 7,
          textDecoration: 'none',
          color: 'var(--text)',
          fontFamily: 'var(--ff)',
          fontSize: 14,
          fontWeight: 500,
          letterSpacing: '-0.02em',
          marginBottom: 40,
        }}>
          <img src="/icon.svg" alt="" width={18} height={18} style={{ opacity: 0.75 }} />
          <span><b>Implant</b>ID</span>
        </a>

        <div style={{
          width: 56,
          height: 56,
          borderRadius: '50%',
          background: 'rgba(var(--err-rgb),0.08)',
          border: '1px solid rgba(var(--err-rgb),0.20)',
          display: 'grid',
          placeItems: 'center',
          marginBottom: 24,
        }}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--err)" strokeWidth="1.7">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <circle cx="12" cy="16" r="0.5" fill="var(--err)" />
          </svg>
        </div>

        <p style={{
          fontSize: 12,
          fontWeight: 600,
          letterSpacing: '0.06em',
          textTransform: 'uppercase' as const,
          color: 'var(--muted)',
          marginBottom: 8,
        }}>Something went wrong</p>

        <h1 style={{
          fontFamily: 'var(--ff)',
          fontSize: 26,
          fontWeight: 700,
          color: 'var(--text)',
          letterSpacing: '-0.03em',
          margin: '0 0 12px',
        }}>
          An unexpected error occurred
        </h1>

        <p style={{
          fontSize: 14.5,
          color: 'var(--muted)',
          maxWidth: 400,
          lineHeight: 1.65,
          margin: '0 0 32px',
        }}>
          We&rsquo;ve logged this automatically. Try refreshing the page, or go back to the dashboard.
          {error.digest && (
            <span style={{ display: 'block', marginTop: 8, fontSize: 12, color: 'var(--muted2)', fontFamily: 'monospace' }}>
              Error ID: {error.digest}
            </span>
          )}
        </p>

        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={reset} className="btn btn-s btn-lg">
            Try again
          </button>
          <button className="btn btn-lg" onClick={() => signOut({ redirectUrl: '/login' })}>
            Sign out
          </button>
        </div>
      </div>

      <LegalFooter />
    </div>
  )
}
