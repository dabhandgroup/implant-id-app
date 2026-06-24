'use client'
import { useUser }  from '@clerk/nextjs'
import { useQuery } from 'convex/react'
import { api as apiBase } from '../../../../convex/_generated/api'
const api = apiBase as any

export default function SurgeonSettingsClient() {
  const { user }    = useUser()
  // listClinicPatients indirectly tells us if the surgeon is linked to a clinic
  const patients    = useQuery(api.clinics.listClinicPatients)

  // All hooks at top — guard below
  if (!user) {
    return (
      <div className="m-content">
        <div style={{ color: 'var(--muted)', fontSize: 14, padding: '32px 0', fontFamily: 'var(--ff)' }}>
          Loading&hellip;
        </div>
      </div>
    )
  }

  const initials = (user.fullName ?? user.firstName ?? 'S')
    .split(/\s+/)
    .slice(0, 2)
    .map((p: string) => p[0]?.toUpperCase() ?? '')
    .join('')

  return (
    <div className="m-content">

      {/* Header */}
      <div className="m-h" style={{ marginBottom: 22 }}>
        <div>
          <div className="ey">Surgeon portal</div>
          <h2 style={{ fontSize: 'clamp(20px,2vw,26px)', letterSpacing: '-.025em', marginTop: 6 }}>Settings</h2>
        </div>
      </div>

      {/* Tab bar */}
      <div className="stab-bar">
        <button className="stab-btn active" aria-selected={true}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
          Profile
        </button>
      </div>

      {/* Profile card */}
      <div style={{
        background: 'var(--bg2)',
        border: '1px solid var(--border)',
        borderRadius: 14,
        padding: '28px 28px',
        maxWidth: 640,
        marginBottom: 20,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 18, marginBottom: 28 }}>
          <div style={{
            width: 56, height: 56, borderRadius: '50%',
            background: 'linear-gradient(140deg,var(--accent),var(--accent2))',
            display: 'grid', placeItems: 'center',
            color: '#fff', fontFamily: 'var(--ff)', fontSize: 20, fontWeight: 700,
            flexShrink: 0,
          }}>
            {initials}
          </div>
          <div>
            <div style={{ fontFamily: 'var(--ff)', fontSize: 17, fontWeight: 600, color: 'var(--text)', marginBottom: 3 }}>
              {user.fullName ?? user.firstName ?? 'Surgeon'}
            </div>
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: 5,
              background: 'rgba(var(--accent2-rgb),0.12)',
              color: 'var(--accent-deep)',
              fontFamily: 'var(--ff)', fontSize: 11.5, fontWeight: 600,
              padding: '2px 9px', borderRadius: 5,
              letterSpacing: '.3px',
            }}>
              Surgeon
            </div>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '14px 28px' }}>
          {/* Email */}
          <div style={{ fontFamily: 'var(--ff)', fontSize: 12, fontWeight: 600, color: 'var(--muted2)', letterSpacing: '.5px', textTransform: 'uppercase', display: 'flex', alignItems: 'center' }}>
            Email
          </div>
          <div style={{ fontFamily: 'var(--fb)', fontSize: 14, color: 'var(--text)' }}>
            {user.primaryEmailAddress?.emailAddress ?? '—'}
          </div>

          {/* Role */}
          <div style={{ fontFamily: 'var(--ff)', fontSize: 12, fontWeight: 600, color: 'var(--muted2)', letterSpacing: '.5px', textTransform: 'uppercase', display: 'flex', alignItems: 'center' }}>
            Role
          </div>
          <div style={{ fontFamily: 'var(--fb)', fontSize: 14, color: 'var(--text)' }}>
            Surgeon
          </div>

          {/* Linked clinic */}
          <div style={{ fontFamily: 'var(--ff)', fontSize: 12, fontWeight: 600, color: 'var(--muted2)', letterSpacing: '.5px', textTransform: 'uppercase', display: 'flex', alignItems: 'center' }}>
            Clinic access
          </div>
          <div style={{ fontFamily: 'var(--fb)', fontSize: 14, color: 'var(--text)' }}>
            {patients === undefined ? (
              <span style={{ color: 'var(--muted)' }}>Loading&hellip;</span>
            ) : patients.length > 0 ? (
              <span style={{ color: 'var(--ok)' }}>Linked — {patients.length} patient{patients.length === 1 ? '' : 's'} visible</span>
            ) : (
              <span style={{ color: 'var(--muted)' }}>No patients shared yet</span>
            )}
          </div>
        </div>
      </div>

      {/* Info note */}
      <div style={{
        display: 'flex', alignItems: 'flex-start', gap: 12,
        background: 'rgba(var(--accent-rgb),0.06)',
        border: '1px solid rgba(var(--accent-rgb),0.18)',
        borderRadius: 12,
        padding: '16px 20px',
        maxWidth: 640,
      }}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="1.7" style={{ flexShrink: 0, marginTop: 1 }} aria-hidden="true">
          <circle cx="12" cy="12" r="9"/><path d="M12 8v4M12 16h.01"/>
        </svg>
        <div>
          <div style={{ fontFamily: 'var(--ff)', fontSize: 13.5, fontWeight: 600, color: 'var(--accent-deep)', marginBottom: 4 }}>
            Clinic-level settings
          </div>
          <p style={{ fontFamily: 'var(--fb)', fontSize: 13, color: 'var(--muted)', margin: 0, lineHeight: 1.55 }}>
            Clinic branding, staff management, and notification settings are managed by your clinic admin.
            Contact your clinic administrator to update these preferences.
          </p>
        </div>
      </div>

    </div>
  )
}
