'use client'

import { useState, useEffect } from 'react'
import { useQuery, useMutation } from 'convex/react'
import { api } from '../../../../convex/_generated/api'

export default function ClinicSettingsClient() {
  // ── All hooks unconditionally at top ─────────────────────────────────────
  const clinic              = useQuery(api.clinics.getMyClinic)
  const updateVisibility    = useMutation(api.clinics.updateClinicVisibility)

  const [showToPatients, setShowToPatients] = useState<boolean | null>(null)
  const [saving,         setSaving]         = useState(false)
  const [saved,          setSaved]          = useState(false)

  // Initialise toggle from clinic data
  useEffect(() => {
    if (clinic && showToPatients === null) {
      setShowToPatients(clinic.showToPatients !== false) // default true
    }
  }, [clinic, showToPatients])

  async function handleToggle() {
    const newVal = !showToPatients
    setShowToPatients(newVal)
    setSaving(true); setSaved(false)
    try {
      await updateVisibility({ showToPatients: newVal })
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="m-content">
      <div className="m-h">
        <div><h2>Settings</h2><div className="sub">Manage your clinic account settings.</div></div>
      </div>

      {/* ── Patient Discovery ── */}
      <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 14, padding: '24px 28px', marginBottom: 20, maxWidth: 600 }}>
        <div style={{ fontFamily: 'var(--ff)', fontSize: 11, fontWeight: 700, letterSpacing: '1px', textTransform: 'uppercase', color: 'var(--muted2)', marginBottom: 16 }}>
          Patient discovery
        </div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 20 }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontFamily: 'var(--ff)', fontSize: 15, fontWeight: 600, color: 'var(--text)', marginBottom: 5 }}>
              Show my clinic to patients
            </div>
            <div style={{ fontFamily: 'var(--fb)', fontSize: 13.5, color: 'var(--muted)', lineHeight: 1.6 }}>
              When enabled, your clinic appears on the patient&apos;s &ldquo;Find a clinic&rdquo; page so they can
              search for you and share their record before their appointment.
            </div>
          </div>

          {/* Toggle */}
          <button
            type="button"
            disabled={saving || showToPatients === null}
            onClick={handleToggle}
            style={{
              width: 48, height: 26, borderRadius: 13, border: 'none', cursor: saving ? 'wait' : 'pointer',
              transition: 'background .2s', flexShrink: 0,
              background: showToPatients ? 'var(--accent)' : 'var(--border)',
              position: 'relative', opacity: showToPatients === null ? 0.4 : 1,
            }}
            aria-label="Toggle patient visibility"
          >
            <span style={{
              position: 'absolute', top: 3, width: 20, height: 20, borderRadius: '50%', background: '#fff',
              transition: 'left .2s', left: showToPatients ? 24 : 4, display: 'block',
            }} />
          </button>
        </div>

        {saved && (
          <div style={{ marginTop: 12, fontFamily: 'var(--ff)', fontSize: 13, color: 'var(--ok)' }}>
            ✓ Saved
          </div>
        )}

        {/* Current clinic info */}
        {clinic && (
          <div style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid var(--border)' }}>
            <div style={{ fontFamily: 'var(--ff)', fontSize: 12, color: 'var(--muted2)', marginBottom: 8 }}>Currently showing:</div>
            <div style={{ fontFamily: 'var(--ff)', fontSize: 14, fontWeight: 600, color: 'var(--text)', marginBottom: 4 }}>{clinic.name}</div>
            {clinic.address && <div style={{ fontFamily: 'var(--fb)', fontSize: 13, color: 'var(--muted)' }}>{clinic.address}</div>}
            {clinic.capabilities.length > 0 && (
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 8 }}>
                {clinic.capabilities.map(c => (
                  <span key={c} style={{ fontFamily: 'var(--ff)', fontSize: 11.5, padding: '2px 8px', borderRadius: 5, background: 'var(--bg)', border: '1px solid var(--border)', color: 'var(--text)' }}>{c}</span>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      <div style={{ fontFamily: 'var(--fb)', fontSize: 13, color: 'var(--muted)', maxWidth: 600, lineHeight: 1.6 }}>
        Your clinic&apos;s phone number, website, and capabilities listed during onboarding are used on the patient-facing listing.
        To update this information, contact <a href="mailto:support@implantid.io" style={{ color: 'var(--accent)' }}>support@implantid.io</a>.
      </div>
    </div>
  )
}
