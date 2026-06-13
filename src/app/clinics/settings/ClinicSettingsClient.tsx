'use client'

import { useState, useEffect } from 'react'
import { useQuery, useMutation } from 'convex/react'
import { api } from '../../../../convex/_generated/api'

type Tab = 'info' | 'notifications' | 'security' | 'billing'

export default function ClinicSettingsClient() {
  // ── All hooks at top ──────────────────────────────────────────────────────
  const clinic           = useQuery(api.clinics.getMyClinic)
  const updateVisibility = useMutation(api.clinics.updateClinicVisibility)

  const [tab,            setTab]            = useState<Tab>('info')
  const [showToPatients, setShowToPatients] = useState<boolean | null>(null)
  const [saving,         setSaving]         = useState(false)
  const [saved,          setSaved]          = useState(false)
  const [infoSaved,      setInfoSaved]      = useState(false)
  const [notifSaved,     setNotifSaved]     = useState(false)

  const [recalls,        setRecalls]        = useState(true)
  const [expiry,         setExpiry]         = useState(true)
  const [accessResp,     setAccessResp]     = useState(true)
  const [digest,         setDigest]         = useState(false)

  useEffect(() => {
    if (clinic && showToPatients === null) {
      setShowToPatients(clinic.showToPatients !== false)
    }
  }, [clinic, showToPatients])

  async function handleVisibilityToggle() {
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

  function Toggle({ checked, onChange, disabled }: { checked: boolean; onChange: () => void; disabled?: boolean }) {
    return (
      <input
        type="checkbox"
        className="toggle-chk"
        checked={checked}
        onChange={onChange}
        disabled={disabled}
        aria-label="Toggle"
      />
    )
  }

  return (
    <div className="m-content">
      <div className="m-h" style={{ marginBottom: 22 }}>
        <div>
          <div className="ey">Clinic settings</div>
          <h2 style={{ fontSize: 'clamp(20px,2vw,26px)', letterSpacing: '-.025em', marginTop: 6 }}>
            {clinic?.name ?? 'Your clinic'}
          </h2>
        </div>
      </div>

      {/* Tab bar */}
      <div className="stab-bar">
        {([
          ['info',          'Clinic information'],
          ['notifications', 'Notifications'],
          ['security',      'Security'],
          ['billing',       'Plan & billing'],
        ] as [Tab, string][]).map(([key, label]) => (
          <button
            key={key}
            className={`stab-btn${tab === key ? ' active' : ''}`}
            onClick={() => setTab(key)}
            aria-selected={tab === key}
          >
            {label}
          </button>
        ))}
      </div>

      {/* ── Clinic information ──────────────────────────────────────────────── */}
      {tab === 'info' && (
        <div>
          <div className="card" style={{ marginBottom: 20 }}>
            <div className="ey" style={{ marginBottom: 14 }}>Clinic logo</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 20, flexWrap: 'wrap' }}>
              <div style={{
                width: 80, height: 80, borderRadius: 14, flexShrink: 0,
                background: 'color-mix(in srgb,var(--accent) 10%,transparent)',
                border: '1.5px dashed color-mix(in srgb,var(--accent) 30%,transparent)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden',
              }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ width: 30, height: 30, color: 'var(--muted2)' }} aria-hidden="true">
                  <rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/>
                </svg>
              </div>
              <div style={{ flex: 1, minWidth: 180 }}>
                <div style={{ fontFamily: 'var(--ff)', fontSize: 14, fontWeight: 500, color: 'var(--text)', marginBottom: 4 }}>
                  {clinic?.name ?? 'Your clinic'}
                </div>
                <div style={{ fontSize: 12.5, color: 'var(--muted)', lineHeight: 1.5, marginBottom: 12 }}>
                  Recommended: 400×400px, PNG or SVG. Appears in reports and your clinic profile.
                </div>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  <button className="btn btn-s" style={{ fontSize: 13 }}>Upload logo</button>
                  <button className="btn" style={{ fontSize: 13, color: 'var(--muted)' }}>Remove</button>
                </div>
              </div>
            </div>
          </div>

          <div className="card" style={{ marginBottom: 20 }}>
            <div className="ey" style={{ marginBottom: 14 }}>Clinic information</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              <div className="field">
                <label>Clinic name</label>
                <input className="input" defaultValue={clinic?.name ?? ''} />
              </div>
              <div className="field">
                <label>Clinic type</label>
                <input className="input" defaultValue="" placeholder="e.g. Radiology & MRI" />
              </div>
              <div className="field">
                <label>Primary contact email</label>
                <input className="input" type="email" defaultValue={clinic?.email ?? ''} />
              </div>
              <div className="field">
                <label>Phone</label>
                <input className="input" defaultValue={clinic?.phone ?? ''} placeholder="+44 20 xxxx xxxx" />
              </div>
              <div className="field" style={{ gridColumn: 'span 2' }}>
                <label>Address</label>
                <input className="input" defaultValue={clinic?.address ?? ''} />
              </div>
            </div>
            <div style={{ marginTop: 18 }}>
              <button
                className="btn btn-s"
                onClick={() => { setInfoSaved(true); setTimeout(() => setInfoSaved(false), 2000) }}
              >
                {infoSaved ? 'Saved ✓' : 'Save changes'}
              </button>
            </div>
          </div>

          {/* Patient discovery toggle */}
          <div className="card" style={{ marginBottom: 20 }}>
            <div className="ey" style={{ marginBottom: 16 }}>Patient discovery</div>
            <div className="set-row">
              <div>
                <div className="set-row-label">Show my clinic to patients</div>
                <div className="set-row-desc">
                  When enabled, your clinic appears on the patient&apos;s &ldquo;Find a clinic&rdquo; page so they can search for you and share their record before their appointment.
                </div>
              </div>
              <Toggle
                checked={showToPatients ?? true}
                onChange={handleVisibilityToggle}
                disabled={saving || showToPatients === null}
              />
            </div>
            {saved && (
              <div style={{ marginTop: 12, fontFamily: 'var(--ff)', fontSize: 13, color: 'var(--ok)' }}>✓ Saved</div>
            )}
          </div>

          <p style={{ fontFamily: 'var(--fb)', fontSize: 13, color: 'var(--muted)', lineHeight: 1.6 }}>
            To update billing or compliance information, contact{' '}
            <a href="mailto:support@implantid.io" style={{ color: 'var(--accent)' }}>support@implantid.io</a>.
          </p>
        </div>
      )}

      {/* ── Notifications ───────────────────────────────────────────────────── */}
      {tab === 'notifications' && (
        <div>
          <div className="card">
            <div className="ey" style={{ marginBottom: 16 }}>Notification preferences</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
              <label className="set-row" style={{ cursor: 'pointer' }}>
                <div>
                  <div className="set-row-label">FDA &amp; MHRA recall alerts</div>
                  <div className="set-row-desc">Instant notification when a recall affects a device in your clinic&apos;s lookup history</div>
                </div>
                <Toggle checked={recalls} onChange={() => setRecalls(v => !v)} />
              </label>
              <label className="set-row" style={{ cursor: 'pointer' }}>
                <div>
                  <div className="set-row-label">Safety data expiry warnings</div>
                  <div className="set-row-desc">14-day advance notice when a device&apos;s verified safety data is due for renewal</div>
                </div>
                <Toggle checked={expiry} onChange={() => setExpiry(v => !v)} />
              </label>
              <label className="set-row" style={{ cursor: 'pointer' }}>
                <div>
                  <div className="set-row-label">Patient access request responses</div>
                  <div className="set-row-desc">Email when a patient approves or declines an access request from your clinic</div>
                </div>
                <Toggle checked={accessResp} onChange={() => setAccessResp(v => !v)} />
              </label>
              <label className="set-row" style={{ cursor: 'pointer' }}>
                <div>
                  <div className="set-row-label">Weekly activity digest</div>
                  <div className="set-row-desc">Summary of key events, time saved, and any flags requiring review</div>
                </div>
                <Toggle checked={digest} onChange={() => setDigest(v => !v)} />
              </label>
            </div>
            <div style={{ marginTop: 20 }}>
              <button
                className="btn btn-s"
                onClick={() => { setNotifSaved(true); setTimeout(() => setNotifSaved(false), 2000) }}
              >
                {notifSaved ? 'Saved ✓' : 'Save preferences'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Security ────────────────────────────────────────────────────────── */}
      {tab === 'security' && (
        <div>
          <div className="card">
            <div className="ey" style={{ marginBottom: 16 }}>Security settings</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
              <div className="set-row">
                <div>
                  <div className="set-row-label">Two-factor authentication</div>
                  <div className="set-row-desc">Required for all staff accounts on this clinic</div>
                </div>
                <span className="pill pill-ok" style={{ fontSize: 12, padding: '4px 12px', flexShrink: 0 }}>Enabled</span>
              </div>
              <div className="set-row">
                <div>
                  <div className="set-row-label">Session timeout</div>
                  <div className="set-row-desc">Automatically sign out after inactivity</div>
                </div>
                <span style={{ fontFamily: 'var(--ff)', fontSize: 13, color: 'var(--text)', fontWeight: 500, flexShrink: 0 }}>1 hour</span>
              </div>
              <div className="set-row" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: 12 }}>
                <div>
                  <div className="set-row-label">Audit log retention</div>
                  <div className="set-row-desc">How long staff access logs are kept on file</div>
                </div>
                <span style={{ fontFamily: 'var(--ff)', fontSize: 13, color: 'var(--text)', fontWeight: 500 }}>7 years (regulatory minimum)</span>
              </div>
              <div className="set-row">
                <div>
                  <div className="set-row-label">Active sessions</div>
                  <div className="set-row-desc">View and revoke sessions for all staff members</div>
                </div>
                <button className="btn" style={{ fontSize: 13, flexShrink: 0 }}>View sessions</button>
              </div>
            </div>
          </div>

          <div style={{ marginTop: 20 }}>
            <div style={{
              background: 'color-mix(in srgb,var(--err) 5%,transparent)',
              border: '1px solid color-mix(in srgb,var(--err) 18%,transparent)',
              borderRadius: 14, padding: '20px 24px',
            }}>
              <div style={{ fontFamily: 'var(--ff)', fontSize: 14, fontWeight: 600, color: 'var(--err)', marginBottom: 6 }}>Danger zone</div>
              <p style={{ fontSize: 13.5, color: 'var(--muted)', lineHeight: 1.5, marginBottom: 16 }}>
                These actions are irreversible. Please contact support before proceeding.
              </p>
              <button className="btn btn-danger" style={{ fontSize: 13 }}>Delete clinic account</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Plan & billing ──────────────────────────────────────────────────── */}
      {tab === 'billing' && (
        <div>
          {/* Current plan */}
          <div className="card" style={{ marginBottom: 20 }}>
            <div className="ey" style={{ marginBottom: 14 }}>Current plan</div>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 20, flexWrap: 'wrap' }}>
              <div>
                <div style={{ fontFamily: 'var(--ff)', fontSize: 22, fontWeight: 600, letterSpacing: '-.02em', color: 'var(--text)', marginBottom: 4 }}>
                  Professional
                </div>
                <div style={{ fontSize: 13.5, color: 'var(--muted)', lineHeight: 1.5 }}>
                  Up to 10 staff · Unlimited lookups · Priority support
                </div>
              </div>
              <div style={{ textAlign: 'right', flexShrink: 0 }}>
                <div style={{ fontFamily: 'var(--ff)', fontSize: 26, fontWeight: 700, color: 'var(--text)' }}>£149<span style={{ fontSize: 14, fontWeight: 400, color: 'var(--muted)' }}>/mo</span></div>
                <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>Next invoice: 1 Jul 2026</div>
              </div>
            </div>
            <div style={{ marginTop: 18, display: 'flex', gap: 10 }}>
              <button className="btn btn-s" style={{ fontSize: 13 }}>Upgrade plan</button>
              <button className="btn" style={{ fontSize: 13 }}>Manage subscription</button>
            </div>
          </div>

          {/* Invoices */}
          <div className="card">
            <div className="ey" style={{ marginBottom: 14 }}>Invoice history</div>
            <div className="invoice-list">
              <div className="invoice-row invoice-head">
                <div>Period</div>
                <div>Amount</div>
                <div>Status</div>
                <div />
              </div>
              {[
                { period: 'Jun 2026', amount: '£149.00', status: 'Paid' },
                { period: 'May 2026', amount: '£149.00', status: 'Paid' },
                { period: 'Apr 2026', amount: '£149.00', status: 'Paid' },
                { period: 'Mar 2026', amount: '£149.00', status: 'Paid' },
              ].map(inv => (
                <div key={inv.period} className="invoice-row">
                  <div className="invoice-period">{inv.period}</div>
                  <div className="invoice-amount">{inv.amount}</div>
                  <div>
                    <span className="pill pill-ok" style={{ fontSize: 11, padding: '2px 8px' }}>{inv.status}</span>
                  </div>
                  <div>
                    <button className="invoice-pdf-btn" aria-label={`Download invoice for ${inv.period}`}>
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6M12 18v-6M9 15l3 3 3-3"/></svg>
                      PDF
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

    </div>
  )
}
