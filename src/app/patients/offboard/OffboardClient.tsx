'use client'

import { useState } from 'react'
import { useClerk } from '@clerk/nextjs'
import { useRouter } from 'next/navigation'

export default function OffboardClient() {
  const { signOut } = useClerk()
  const router      = useRouter()
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [signingOut,  setSigningOut]  = useState(false)

  async function handleSignOut() {
    setSigningOut(true)
    await signOut({ redirectUrl: '/login' })
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, fontFamily: 'var(--ff)' }}>
      <div style={{ maxWidth: 480, width: '100%' }}>
        {/* Back */}
        <button onClick={() => router.back()} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)', fontSize: 13.5, padding: 0, marginBottom: 32 }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15 18 9 12 15 6"/></svg>
          Back to account
        </button>

        <h1 style={{ fontSize: 24, fontWeight: 700, color: 'var(--text)', marginBottom: 8 }}>Delete account</h1>
        <p style={{ color: 'var(--muted)', fontSize: 15, lineHeight: 1.65, marginBottom: 20 }}>
          Deleting your Implant ID account will immediately remove your access to the platform and deactivate your wallet passes. Clinics will no longer be able to look up your record.
        </p>

        {/* Data retention notice */}
        <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 10, padding: '14px 18px', marginBottom: 24 }}>
          <div style={{ fontFamily: 'var(--ff)', fontSize: 13, fontWeight: 600, color: 'var(--text)', marginBottom: 6 }}>
            Data retention
          </div>
          <p style={{ fontFamily: 'var(--fb)', fontSize: 13, color: 'var(--muted)', lineHeight: 1.6, margin: 0 }}>
            To comply with UK healthcare record-keeping regulations (NHS Records Management Code of Practice), your medical implant data is retained for a minimum of <strong>8 years</strong> from your last activity, even after account deletion. Your personal contact and login data is deleted within <strong>30 days</strong>.
          </p>
          <p style={{ fontFamily: 'var(--fb)', fontSize: 13, color: 'var(--muted)', lineHeight: 1.6, margin: '8px 0 0' }}>
            To request full erasure of your health data, contact{' '}
            <a href="mailto:privacy@implantid.io" style={{ color: 'var(--accent)', textDecoration: 'none' }}>privacy@implantid.io</a>
            . We will review your request in accordance with UK GDPR Article 17.
          </p>
        </div>

        <div style={{ background: 'rgba(var(--err-rgb),0.06)', border: '1px solid rgba(var(--err-rgb),0.20)', borderRadius: 10, padding: '14px 18px', marginBottom: 24 }}>
          <div style={{ fontFamily: 'var(--ff)', fontSize: 13.5, color: 'var(--err)', fontWeight: 500, lineHeight: 1.6 }}>
            ⚠ This action cannot be undone. Your wallet passes will be deactivated and clinics will no longer be able to access your record.
          </div>
        </div>

        <div style={{ display: 'flex', gap: 12 }}>
          <button onClick={() => router.back()} className="btn" style={{ flex: 1 }}>
            Cancel — keep my account
          </button>
          <button onClick={() => setConfirmOpen(true)} className="btn btn-danger" style={{ flex: 1 }}>
            Delete my account
          </button>
        </div>

        <div style={{ marginTop: 32, paddingTop: 24, borderTop: '1px solid var(--border)', textAlign: 'center' }}>
          <p style={{ fontFamily: 'var(--fb)', fontSize: 13.5, color: 'var(--muted)', marginBottom: 12 }}>
            Just want to sign out?
          </p>
          <button onClick={handleSignOut} disabled={signingOut} className="btn" style={{ fontSize: 13.5 }}>
            {signingOut ? 'Signing out…' : 'Sign out of Implant ID'}
          </button>
        </div>
      </div>

      {/* Deletion confirm modal */}
      {confirmOpen && (
        <div className="logout-back open" onClick={() => setConfirmOpen(false)}>
          <div className="logout-modal" onClick={e => e.stopPropagation()}>
            <div className="logout-body">
              <div style={{ width: 48, height: 48, borderRadius: '50%', background: 'rgba(var(--err-rgb),0.12)', display: 'grid', placeItems: 'center', margin: '0 auto 16px' }}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--err)" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
              </div>
              <h3>Delete your account?</h3>
              <p>
                Your access will be removed immediately and your wallet passes deactivated. Medical implant data is retained for 8 years per UK healthcare regulations.{' '}
                <a href="mailto:privacy@implantid.io" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accent)' }}>Contact us</a> to request full data erasure.
              </p>
            </div>
            <div className="logout-actions">
              <button className="btn" onClick={() => setConfirmOpen(false)}>Cancel</button>
              <button className="btn btn-danger" onClick={handleSignOut} disabled={signingOut}>
                {signingOut ? 'Deleting…' : 'Yes, delete account'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
