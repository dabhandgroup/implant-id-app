'use client'

import { useState }          from 'react'
import { useUser, useClerk } from '@clerk/nextjs'
import { useQuery }          from 'convex/react'
import { api as apiBase }    from '../../../../convex/_generated/api'
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const api = apiBase as any

type MfrTab = 'company' | 'regulatory' | 'contact' | 'account'

function Field({ label, value }: { label: string; value?: string | string[] | null }) {
  if (!value || (Array.isArray(value) && value.length === 0)) return null
  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ fontFamily: 'var(--ff)', fontSize: 11, fontWeight: 600, letterSpacing: '1px', textTransform: 'uppercase', color: 'var(--muted2)', marginBottom: 5 }}>{label}</div>
      {Array.isArray(value) ? (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {value.map(v => <span key={v} style={{ background: 'color-mix(in srgb,var(--accent) 10%,transparent)', color: 'var(--accent)', fontSize: 12, fontWeight: 500, padding: '3px 10px', borderRadius: 6 }}>{v}</span>)}
        </div>
      ) : (
        <div style={{ fontFamily: 'var(--fb)', fontSize: 14.5, color: 'var(--text)' }}>{value}</div>
      )}
    </div>
  )
}

type MfrTab = 'company' | 'regulatory' | 'contact' | 'account'

export default function MfrSettingsClient() {
  const { user } = useUser()
  const { signOut } = useClerk()
  const mfr = useQuery(api.manufacturers.getMyManufacturer)

  // All state before any early returns (React rules)
  const [activeTab,      setActiveTab]      = useState<MfrTab>('company')
  const [signOutConfirm, setSignOutConfirm] = useState(false)
  const [signingOut,     setSigningOut]     = useState(false)

  if (mfr === undefined) return <div className="m-content" style={{ color: 'var(--muted)', fontFamily: 'var(--ff)' }}>Loading…</div>

  async function handleSignOut() {
    setSigningOut(true)
    await signOut({ redirectUrl: '/login' })
  }

  return (
    <>
      <div className="m-content">
        <div className="m-h" style={{ marginBottom: 22 }}>
          <div>
            <div className="ey">Manufacturer portal</div>
            <h2 style={{ fontSize: 'clamp(20px,2vw,26px)', letterSpacing: '-.025em', marginTop: 6 }}>
              {mfr?.companyName ?? 'Settings'}
            </h2>
          </div>
        </div>

        {/* Account status banner */}
        <div style={{ background: mfr?.status === 'approved' ? 'color-mix(in srgb,var(--ok) 8%,transparent)' : 'color-mix(in srgb,var(--warn) 8%,transparent)', border: `1px solid ${mfr?.status === 'approved' ? 'color-mix(in srgb,var(--ok) 20%,transparent)' : 'color-mix(in srgb,var(--warn) 20%,transparent)'}`, borderRadius: 12, padding: '14px 18px', marginBottom: 22, display: 'flex', alignItems: 'center', gap: 10 }}>
          {mfr?.status === 'approved' ? (
            <svg viewBox="0 0 24 24" fill="none" stroke="var(--ok)" strokeWidth="2" width="17" height="17" aria-hidden="true"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="m9 12 2 2 4-4"/></svg>
          ) : (
            <svg viewBox="0 0 24 24" fill="none" stroke="#d97706" strokeWidth="2" width="17" height="17" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>
          )}
          <div>
            <div style={{ fontFamily: 'var(--ff)', fontSize: 13.5, fontWeight: 600, color: mfr?.status === 'approved' ? 'var(--ok)' : '#d97706' }}>
              {mfr?.status === 'approved' ? 'Verified manufacturer' : 'Application pending review'}
            </div>
            <div style={{ fontSize: 12.5, color: 'var(--muted)', marginTop: 2 }}>
              {mfr?.status === 'approved' ? 'Your account is active and devices are visible in the catalogue.' : "We'll review your application within 5–10 business days."}
            </div>
          </div>
        </div>

        {/* Tab bar */}
        <div className="stab-bar">
          <button className={`stab-btn${activeTab === 'company' ? ' active' : ''}`} onClick={() => setActiveTab('company')} aria-selected={activeTab === 'company'}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true"><path d="M3 21V8l9-5 9 5v13"/><path d="M9 9h6M9 13h6M9 17h6"/></svg>
            Company
          </button>
          <button className={`stab-btn${activeTab === 'regulatory' ? ' active' : ''}`} onClick={() => setActiveTab('regulatory')} aria-selected={activeTab === 'regulatory'}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="m9 12 2 2 4-4"/></svg>
            Regulatory
          </button>
          <button className={`stab-btn${activeTab === 'contact' ? ' active' : ''}`} onClick={() => setActiveTab('contact')} aria-selected={activeTab === 'contact'}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
            Contact
          </button>
          <button className={`stab-btn${activeTab === 'account' ? ' active' : ''}`} onClick={() => setActiveTab('account')} aria-selected={activeTab === 'account'}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33h0a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51h0a1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82v0a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
            Account
          </button>
        </div>

        {/* Company tab */}
        {activeTab === 'company' && (
          <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 14, padding: '24px 28px' }}>
            <Field label="Legal entity name"   value={mfr?.legalEntityName} />
            <Field label="Trading name"        value={mfr?.companyName} />
            <Field label="Registration number" value={mfr?.regNumber} />
            <Field label="Country"             value={mfr?.country} />
            <Field label="Website"             value={mfr?.website} />
            <Field label="Device categories"   value={mfr?.deviceCategories} />
            <Field label="Geographic markets"  value={mfr?.geographicMarkets} />
          </div>
        )}

        {/* Regulatory tab */}
        {activeTab === 'regulatory' && (
          <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 14, padding: '24px 28px' }}>
            <Field label="ISO 13485 cert number"  value={mfr?.iso13485CertNumber} />
            <Field label="ISO 13485 issuing body" value={mfr?.iso13485IssuingBody} />
            <Field label="ISO 13485 expiry"       value={mfr?.iso13485ExpiryDate} />
            <Field label="Other registrations"    value={mfr?.regulatoryRegistrations} />
          </div>
        )}

        {/* Contact tab */}
        {activeTab === 'contact' && (
          <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 14, padding: '24px 28px' }}>
            <Field label="Name"      value={mfr?.contactName} />
            <Field label="Job title" value={mfr?.contactJobTitle} />
            <Field label="Email"     value={mfr?.contactEmail || user?.primaryEmailAddress?.emailAddress} />
            <Field label="Phone"     value={mfr?.contactPhone} />
          </div>
        )}

        {/* Account tab */}
        {activeTab === 'account' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 14, padding: '24px 28px' }}>
              <div style={{ fontFamily: 'var(--ff)', fontSize: 15, fontWeight: 600, color: 'var(--text)', marginBottom: 4 }}>Sign out</div>
              <div style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 16 }}>Sign out of your manufacturer account on this device.</div>
              <button className="btn btn-danger" onClick={() => setSignOutConfirm(true)}>Sign out</button>
            </div>
            <p style={{ fontSize: 12, color: 'var(--muted2)', margin: 0 }}>
              To update your company details, please <a href="https://implantid.io/contact" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accent)' }}>contact support</a>.
            </p>
          </div>
        )}
      </div>

      {/* Sign-out confirmation modal */}
      {signOutConfirm && (
        <div className="logout-back open" onClick={() => !signingOut && setSignOutConfirm(false)}>
          <div className="logout-modal" onClick={e => e.stopPropagation()}>
            <div className="logout-body">
              <div style={{ width:44, height:44, borderRadius:'50%', background:'color-mix(in srgb,var(--err) 12%,transparent)', display:'grid', placeItems:'center', margin:'0 auto 14px' }}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--err)" strokeWidth="2">
                  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
                  <polyline points="16 17 21 12 16 7"/>
                  <line x1="21" y1="12" x2="9" y2="12"/>
                </svg>
              </div>
              <h3>Sign out?</h3>
              <p>You&apos;ll be returned to the manufacturer login page.</p>
            </div>
            <div className="logout-actions">
              <button className="btn" onClick={() => setSignOutConfirm(false)} disabled={signingOut}>Cancel</button>
              <button className="btn btn-danger" onClick={handleSignOut} disabled={signingOut}>
                {signingOut ? 'Signing out…' : 'Yes, sign out'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
