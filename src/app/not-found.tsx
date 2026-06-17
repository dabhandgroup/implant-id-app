import type { Metadata } from 'next'
import LegalFooter from '@/components/LegalFooter'

export const metadata: Metadata = {
  title: 'Page not found · Implant ID',
}

export default function NotFound() {
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
          background: 'var(--bg2)',
          border: '1px solid var(--border)',
          display: 'grid',
          placeItems: 'center',
          marginBottom: 24,
        }}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--muted)" strokeWidth="1.7">
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
            <line x1="11" y1="8" x2="11" y2="11" />
            <circle cx="11" cy="14" r="0.5" fill="var(--muted)" />
          </svg>
        </div>

        <p style={{
          fontSize: 12,
          fontWeight: 600,
          letterSpacing: '0.06em',
          textTransform: 'uppercase',
          color: 'var(--muted)',
          marginBottom: 8,
        }}>404 · Not found</p>

        <h1 style={{
          fontFamily: 'var(--ff)',
          fontSize: 28,
          fontWeight: 700,
          color: 'var(--text)',
          letterSpacing: '-0.03em',
          margin: '0 0 12px',
        }}>
          This page doesn&rsquo;t exist
        </h1>

        <p style={{
          fontSize: 15,
          color: 'var(--muted)',
          maxWidth: 380,
          lineHeight: 1.65,
          margin: '0 0 32px',
        }}>
          The page you&rsquo;re looking for may have moved, been removed, or the link may be incorrect.
        </p>

        <div style={{ display: 'flex', gap: 10 }}>
          <a href="/" className="btn btn-s btn-lg" style={{ textDecoration: 'none' }}>
            Go to home
          </a>
          <a href="/login" className="btn btn-lg" style={{ textDecoration: 'none' }}>
            Log in
          </a>
        </div>
      </div>

      <LegalFooter />
    </div>
  )
}
