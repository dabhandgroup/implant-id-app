'use client'

import { useEffect } from 'react'

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <html lang="en">
      <body style={{
        margin: 0,
        minHeight: '100vh',
        background: '#0f1117',
        color: '#e5e7eb',
        fontFamily: 'system-ui, -apple-system, sans-serif',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '40px 24px',
        textAlign: 'center',
        boxSizing: 'border-box',
      }}>
        <div style={{
          width: 48,
          height: 48,
          borderRadius: '50%',
          background: 'rgba(239,68,68,0.12)',
          border: '1px solid rgba(239,68,68,0.25)',
          display: 'grid',
          placeItems: 'center',
          marginBottom: 20,
        }}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="1.7">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <circle cx="12" cy="16" r="0.5" fill="#ef4444" />
          </svg>
        </div>

        <h1 style={{ fontSize: 22, fontWeight: 700, margin: '0 0 10px', letterSpacing: '-0.02em' }}>
          Critical error
        </h1>

        <p style={{ fontSize: 14, color: '#9ca3af', maxWidth: 360, lineHeight: 1.6, margin: '0 0 28px' }}>
          A critical error has occurred. Please refresh the page or return to the homepage.
          {error.digest && (
            <span style={{ display: 'block', marginTop: 8, fontSize: 11.5, fontFamily: 'monospace', opacity: 0.6 }}>
              {error.digest}
            </span>
          )}
        </p>

        <div style={{ display: 'flex', gap: 10 }}>
          <button
            onClick={reset}
            style={{
              background: '#22c5a0',
              color: '#fff',
              border: 'none',
              borderRadius: 8,
              padding: '10px 20px',
              fontSize: 14,
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Try again
          </button>
          <a
            href="/"
            style={{
              background: 'rgba(255,255,255,0.06)',
              color: '#e5e7eb',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: 8,
              padding: '10px 20px',
              fontSize: 14,
              fontWeight: 500,
              textDecoration: 'none',
            }}
          >
            Home
          </a>
        </div>

        <p style={{ fontSize: 11, color: '#6b7280', marginTop: 40 }}>
          © {new Date().getFullYear()} Implant ID Ltd
        </p>
      </body>
    </html>
  )
}
