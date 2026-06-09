'use client'

import { useUser, useClerk } from '@clerk/nextjs'
import { useQuery }          from 'convex/react'
import { api as apiBase }    from '../../../../convex/_generated/api'
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const api = apiBase as any

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

export default function MfrSettingsClient() {
  const { user } = useUser()
  const { signOut } = useClerk()
  const mfr = useQuery(api.manufacturers.getMyManufacturer)

  if (mfr === undefined) return <div style={{ padding: '60px 40px', color: 'var(--muted)', fontFamily: 'var(--ff)' }}>Loading…</div>

  return (
    <div style={{ padding: '36px 40px', maxWidth: 720, margin: '0 auto' }}>
      <h1 style={{ fontFamily: 'var(--ff)', fontSize: 24, fontWeight: 600, marginBottom: 6 }}>Settings</h1>
      <p style={{ color: 'var(--muted)', fontSize: 13.5, marginBottom: 32 }}>Your manufacturer profile and account information.</p>

      {/* Account status */}
      <div style={{ background: mfr?.status === 'approved' ? 'color-mix(in srgb,var(--ok) 8%,transparent)' : 'color-mix(in srgb,var(--warn) 8%,transparent)', border: `1px solid ${mfr?.status === 'approved' ? 'color-mix(in srgb,var(--ok) 20%,transparent)' : 'color-mix(in srgb,var(--warn) 20%,transparent)'}`, borderRadius: 12, padding: '16px 20px', marginBottom: 28, display: 'flex', alignItems: 'center', gap: 10 }}>
        {mfr?.status === 'approved' ? (
          <svg viewBox="0 0 24 24" fill="none" stroke="var(--ok)" strokeWidth="2" width="18" height="18"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="m9 12 2 2 4-4"/></svg>
        ) : (
          <svg viewBox="0 0 24 24" fill="none" stroke="#d97706" strokeWidth="2" width="18" height="18"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>
        )}
        <div>
          <div style={{ fontFamily: 'var(--ff)', fontSize: 13.5, fontWeight: 600, color: mfr?.status === 'approved' ? 'var(--ok)' : '#d97706' }}>
            {mfr?.status === 'approved' ? 'Verified manufacturer' : 'Application pending review'}
          </div>
          <div style={{ fontSize: 12.5, color: 'var(--muted)', marginTop: 2 }}>
            {mfr?.status === 'approved' ? 'Your account is active and devices are visible in the catalogue.' : 'We\'ll review your application within 5–10 business days.'}
          </div>
        </div>
      </div>

      {/* Company */}
      <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 14, padding: '24px 28px', marginBottom: 20 }}>
        <h2 style={{ fontFamily: 'var(--ff)', fontSize: 16, fontWeight: 500, marginBottom: 20 }}>Company details</h2>
        <Field label="Legal entity name"     value={mfr?.legalEntityName} />
        <Field label="Trading name"          value={mfr?.companyName} />
        <Field label="Registration number"   value={mfr?.regNumber} />
        <Field label="Country"               value={mfr?.country} />
        <Field label="Website"               value={mfr?.website} />
        <Field label="Device categories"     value={mfr?.deviceCategories} />
        <Field label="Geographic markets"    value={mfr?.geographicMarkets} />
      </div>

      {/* Regulatory */}
      <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 14, padding: '24px 28px', marginBottom: 20 }}>
        <h2 style={{ fontFamily: 'var(--ff)', fontSize: 16, fontWeight: 500, marginBottom: 20 }}>Regulatory</h2>
        <Field label="ISO 13485 cert number" value={mfr?.iso13485CertNumber} />
        <Field label="ISO 13485 issuing body" value={mfr?.iso13485IssuingBody} />
        <Field label="ISO 13485 expiry"      value={mfr?.iso13485ExpiryDate} />
        <Field label="Other registrations"   value={mfr?.regulatoryRegistrations} />
      </div>

      {/* Contact */}
      <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 14, padding: '24px 28px', marginBottom: 20 }}>
        <h2 style={{ fontFamily: 'var(--ff)', fontSize: 16, fontWeight: 500, marginBottom: 20 }}>Contact</h2>
        <Field label="Name"      value={mfr?.contactName} />
        <Field label="Job title" value={mfr?.contactJobTitle} />
        <Field label="Email"     value={mfr?.contactEmail || user?.primaryEmailAddress?.emailAddress} />
        <Field label="Phone"     value={mfr?.contactPhone} />
      </div>

      {/* Sign out */}
      <div style={{ marginTop: 32 }}>
        <button className="btn btn-danger" onClick={() => signOut({ redirectUrl: '/login' })}>Sign out</button>
      </div>

      <p style={{ fontSize: 12, color: 'var(--muted2)', marginTop: 20 }}>
        To update any of the above details, please <a href="https://implantid.io/contact" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accent)' }}>contact support</a>.
      </p>
    </div>
  )
}
