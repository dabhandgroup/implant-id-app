'use client'
import { useClerk } from '@clerk/nextjs'
export default function ClinicPendingPage() {
  const { signOut } = useClerk()
  return (
    <main style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg)', padding: 24, fontFamily: 'var(--ff)' }}>
      <div style={{ maxWidth: 480, textAlign: 'center' }}>
        <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'rgba(245,158,11,0.12)', border: '1.5px solid rgba(245,158,11,0.30)', display: 'grid', placeItems: 'center', margin: '0 auto 20px' }}>
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M12 6v6M12 16h.01"/></svg>
        </div>
        <h2 style={{ margin: '0 0 12px', fontSize: 22, fontWeight: 700, color: 'var(--text)' }}>Application under review</h2>
        <p style={{ color: 'var(--muted)', fontSize: 15, lineHeight: 1.65, margin: '0 0 16px' }}>
          Your clinic application is being reviewed by the Implant ID team. You will receive an email once a decision is made — usually within 1–3 working days.
        </p>
        <p style={{ color: 'var(--muted)', fontSize: 13.5, margin: '0 0 28px' }}>
          Questions? <a href="mailto:support@implantid.io" style={{ color: 'var(--accent)' }}>support@implantid.io</a>
        </p>
        <button className="btn" onClick={() => signOut({ redirectUrl: '/login' })}>Sign out</button>
      </div>
    </main>
  )
}
