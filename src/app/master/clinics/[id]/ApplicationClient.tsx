'use client'

import { useState } from 'react'
import { useQuery, useMutation, useAction } from 'convex/react'
import { useRouter } from 'next/navigation'
import { api } from '../../../../../convex/_generated/api'
import type { Id } from '../../../../../convex/_generated/dataModel'

// Strips the "[CONVEX M(...)] Server Error Uncaught Error: " prefix from thrown errors
// so only the human-readable message reaches the UI.
function convexMsg(e: unknown, fallback = 'Something went wrong'): string {
  const raw = (e as { message?: string })?.message ?? fallback
  // Extract the text after "Uncaught Error: " and before " at handler"
  const m = raw.match(/Uncaught Error:\s*([\s\S]*?)(?:\s+at handler\s|\s+Called by)/i)
  return (m ? m[1] : raw).trim() || fallback
}

const CAPABILITY_OPTIONS = [
  { value: 'Pacemaker / ICD',  label: 'Pacemaker / ICD' },
  { value: 'Cochlear',         label: 'Cochlear' },
  { value: 'DBS / Neurostim',  label: 'DBS / Neurostim' },
  { value: 'Spinal Cord',      label: 'Spinal Cord' },
  { value: 'MRI Centre',       label: 'MRI Centre' },
  { value: 'Orthopaedic',      label: 'Orthopaedic' },
]

type ActionType = 'approve' | 'reject' | 'unapprove'

function formatDate(ts: number) {
  return new Date(ts).toLocaleDateString('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric',
  })
}

function getInitials(name: string): string {
  const words = name.trim().split(/\s+/)
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase()
  return (words[0][0] + words[1][0]).toUpperCase()
}

function statusColour(status: string) {
  if (status === 'pending')  return '#d97706'
  if (status === 'rejected') return 'var(--err)'
  return 'var(--ok)'
}

function InfoField({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div>
      <div style={{ fontFamily: 'var(--ff)', fontSize: 11, color: 'var(--muted2)', marginBottom: 2 }}>{label}</div>
      <div style={{ fontFamily: 'var(--fb)', fontSize: 14, color: accent ? 'var(--accent)' : 'var(--text)' }}>{value}</div>
    </div>
  )
}

export default function ApplicationClient({ id }: { id: string }) {
  // ── All hooks unconditionally at top ─────────────────────────────────────────
  const router = useRouter()
  const [confirmAction, setConfirmAction] = useState<ActionType | null>(null)
  const [rejectNotes,   setRejectNotes]   = useState('')
  const [submitting,    setSubmitting]    = useState(false)
  const [submitError,   setSubmitError]   = useState('')

  const app                         = useQuery(api.clinics.getApplicationById, { id: id as Id<'clinicApplications'> })
  const reviewApplication           = useMutation(api.clinics.reviewApplication)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const updateClinicContactEmail    = useMutation(api.clinics.updateClinicContactEmail as any)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const retriggerClinicActivation   = useAction((api.clinics as any).retriggerClinicActivation)

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const adminUpdateCapabilities = useMutation((api.clinics as any).adminUpdateClinicCapabilities)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const setForeverFree          = useMutation((api.clinics as any).setForeverFree)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const devSetBillingState      = useMutation((api.clinics as any).devSetBillingState)

  const [resending,    setResending]    = useState(false)
  const [resendDone,   setResendDone]   = useState(false)
  const [resendError,  setResendError]  = useState('')

  const [adminCaps,       setAdminCaps]       = useState<string[] | null>(null)
  const [adminCapsSaving, setAdminCapsSaving] = useState(false)
  const [adminCapsSaved,  setAdminCapsSaved]  = useState(false)
  const [adminCapsError,  setAdminCapsError]  = useState('')
  const [freeToggling,    setFreeToggling]    = useState(false)
  const [freeErr,         setFreeErr]         = useState('')
  const [testPreset,      setTestPreset]      = useState('')
  const [testLoading,     setTestLoading]     = useState(false)

  async function handleResend() {
    if (!app) return
    setResending(true); setResendError(''); setResendDone(false)
    try {
      await retriggerClinicActivation({ applicationId: app._id })
      setResendDone(true)
    } catch (e) {
      setResendError(convexMsg(e, 'Failed to resend'))
    } finally {
      setResending(false)
    }
  }

  // ── Edit email state ─────────────────────────────────────────────────────────
  const [editingEmail, setEditingEmail] = useState(false)
  const [newEmail,     setNewEmail]     = useState('')
  const [emailSaving,  setEmailSaving]  = useState(false)
  const [emailError,   setEmailError]   = useState('')
  const [emailDone,    setEmailDone]    = useState<'saved' | 'resent' | null>(null)

  async function handleEmailSave() {
    if (!app) return
    setEmailSaving(true); setEmailError('')
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = await (updateClinicContactEmail as any)({
        applicationId: app._id,
        newEmail:      newEmail.trim(),
      }) as { wasApproved: boolean }
      setEditingEmail(false)
      setEmailDone(result.wasApproved ? 'resent' : 'saved')
      setTimeout(() => setEmailDone(null), 5000)
    } catch (e) {
      setEmailError(convexMsg(e, 'Failed to update email'))
    } finally {
      setEmailSaving(false)
    }
  }

  // ── Helpers ───────────────────────────────────────────────────────────────────
  function openConfirm(type: ActionType) {
    setConfirmAction(type)
    setRejectNotes('')
    setSubmitError('')
  }

  function closeConfirm() {
    if (submitting) return
    setConfirmAction(null)
    setSubmitError('')
  }

  async function handleConfirm() {
    if (!app) return
    setSubmitting(true)
    setSubmitError('')
    try {
      await reviewApplication({
        applicationId: app._id,
        decision:      confirmAction === 'approve' ? 'approved' : 'rejected',
        notes:         (confirmAction === 'reject' || confirmAction === 'unapprove') && rejectNotes.trim()
                         ? rejectNotes.trim()
                         : undefined,
      })
      setConfirmAction(null)
      setSubmitError('')
      // Navigate back to clinics list after a short delay so Clerk's auth
      // middleware has time to settle before the next page load.
      // Immediate navigation can redirect to /login before the session processes.
      setTimeout(() => router.push('/master/clinics'), 350)
    } catch (e) {
      setSubmitError(convexMsg(e, 'Something went wrong'))
    } finally {
      setSubmitting(false)
    }
  }

  // ── Loading ───────────────────────────────────────────────────────────────────
  if (app === undefined) {
    return (
      <div className="m-content">
        <a href="/master/clinics" className="m-back">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15 18 9 12 15 6"/></svg>
          Back to Clinics
        </a>
        <div style={{ color: 'var(--muted)', fontFamily: 'var(--ff)', fontSize: 14, padding: '32px 0' }}>Loading…</div>
      </div>
    )
  }

  // ── Not found ─────────────────────────────────────────────────────────────────
  if (app === null) {
    return (
      <div className="m-content">
        <a href="/master/clinics" className="m-back">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15 18 9 12 15 6"/></svg>
          Back to Clinics
        </a>
        <div className="m-h"><div><h2>Application not found</h2></div></div>
        <p style={{ color: 'var(--muted)', fontFamily: 'var(--fb)', fontSize: 14 }}>
          This application could not be found. It may have been deleted.
        </p>
      </div>
    )
  }

  // ── Derived ───────────────────────────────────────────────────────────────────
  const initials   = getInitials(app.facilityName)
  const colour     = statusColour(app.status)
  const statusLabel = app.status.charAt(0).toUpperCase() + app.status.slice(1)
  const address    = [app.facilityAddress, app.facilityCity, app.facilityCountry].filter(Boolean).join(', ')

  // ── Render ────────────────────────────────────────────────────────────────────
  return (
    <div className="m-content">
      <a href="/master/clinics" className="m-back">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <polyline points="15 18 9 12 15 6"/>
        </svg>
        Back to Clinics
      </a>

      {/* ── Profile header ── */}
      <div style={{
        background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 16,
        padding: '24px 28px', marginBottom: 20,
      }}>
        {/* Avatar + name row */}
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16, marginBottom: 14 }}>
          <div style={{
            width: 56, height: 56, borderRadius: 14, flexShrink: 0,
            background: 'color-mix(in srgb,var(--accent) 14%,transparent)',
            border: '1.5px solid color-mix(in srgb,var(--accent) 28%,transparent)',
            display: 'grid', placeItems: 'center',
          }}>
            <span style={{ fontFamily: 'var(--ff)', fontWeight: 700, fontSize: 20, color: 'var(--accent)' }}>
              {initials}
            </span>
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <h2 style={{ marginBottom: 8 }}>{app.facilityName}</h2>
            <span style={{
              display: 'inline-flex', alignItems: 'center', gap: 5,
              fontFamily: 'var(--ff)', fontSize: 12, fontWeight: 600,
              color: colour,
              background: `color-mix(in srgb,${colour} 10%,transparent)`,
              border: `1px solid color-mix(in srgb,${colour} 25%,transparent)`,
              borderRadius: 8, padding: '3px 10px', textTransform: 'uppercase', letterSpacing: '.5px',
            }}>
              {app.status === 'pending' && (
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: colour, display: 'inline-block' }} />
              )}
              {statusLabel}
            </span>
          </div>
        </div>

        {/* Dates + location */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px 16px', marginBottom: 18 }}>
          <span style={{ fontFamily: 'var(--fb)', fontSize: 13, color: 'var(--muted)' }}>
            Submitted {formatDate(app.submittedAt)}
          </span>
          {app.reviewedAt && (
            <span style={{ fontFamily: 'var(--fb)', fontSize: 13, color: 'var(--muted)' }}>
              Reviewed {formatDate(app.reviewedAt)}
            </span>
          )}
          <span style={{ fontFamily: 'var(--fb)', fontSize: 13, color: 'var(--muted)' }}>
            {app.facilityCountry}
          </span>
        </div>

        {/* Approve / Reject */}
        {(app.status === 'pending' || app.status === 'rejected') && (
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn btn-s" onClick={() => openConfirm('approve')}>Approve</button>
            {app.status === 'pending' && (
              <button className="btn btn-danger" onClick={() => openConfirm('reject')}>Reject</button>
            )}
          </div>
        )}

        {/* Resend approval email (approved clinics only) */}
        {app.status === 'approved' && (
          <div>
            <button
              className="btn"
              onClick={handleResend}
              disabled={resending}
              style={{ fontSize: 13 }}
            >
              {resending ? 'Resending…' : 'Resend approval email →'}
            </button>
            {resendDone && (
              <div style={{ fontSize: 12.5, color: 'var(--ok)', marginTop: 6 }}>
                ✓ Activation triggered — they'll receive a fresh login link shortly
              </div>
            )}
            {resendError && (
              <div style={{ fontSize: 12.5, color: 'var(--err)', marginTop: 6 }}>{resendError}</div>
            )}
          </div>
        )}
      </div>

      {/* ── Contact + Clinic details ── */}
      <div className="form-grid" style={{ marginBottom: 16 }}>

        {/* Contact card */}
        <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 14, padding: '20px 22px' }}>
          <div style={{ fontFamily: 'var(--ff)', fontSize: 11, fontWeight: 700, letterSpacing: '1px', textTransform: 'uppercase', color: 'var(--muted2)', marginBottom: 14 }}>
            Contact
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <InfoField label="Name" value={app.contactName} />

            {/* Editable email row */}
            <div>
              <div style={{ fontFamily: 'var(--ff)', fontSize: 11, color: 'var(--muted2)', marginBottom: 2 }}>Email</div>
              {editingEmail ? (
                <div>
                  <input
                    className="input"
                    type="text"
                    autoComplete="off"
                    value={newEmail}
                    onChange={e => setNewEmail(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') handleEmailSave(); if (e.key === 'Escape') setEditingEmail(false) }}
                    autoFocus
                    style={{ marginBottom: 6 }}
                  />
                  {emailError && (
                    <div style={{ fontSize: 12.5, color: 'var(--err)', marginBottom: 6 }}>{emailError}</div>
                  )}
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button className="btn btn-s" style={{ fontSize: 12, padding: '5px 12px' }}
                      onClick={handleEmailSave} disabled={emailSaving || !newEmail.trim()}>
                      {emailSaving ? 'Saving…' : 'Save'}
                    </button>
                    <button className="btn" style={{ fontSize: 12, padding: '5px 10px' }}
                      onClick={() => { setEditingEmail(false); setEmailError('') }} disabled={emailSaving}>
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontFamily: 'var(--fb)', fontSize: 14, color: 'var(--accent)' }}>
                    {app.contactEmail}
                  </span>
                  <button
                    onClick={() => { setNewEmail(app.contactEmail); setEmailError(''); setEditingEmail(true) }}
                    aria-label="Edit contact email"
                    style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '2px 6px', borderRadius: 5, color: 'var(--muted2)', fontSize: 11, fontFamily: 'var(--ff)', transition: 'color .15s' }}
                    onMouseEnter={e => (e.currentTarget.style.color = 'var(--accent-deep)')}
                    onMouseLeave={e => (e.currentTarget.style.color = 'var(--muted2)')}>
                    Edit
                  </button>
                </div>
              )}
              {emailDone === 'resent' && (
                <div style={{ fontSize: 12.5, color: 'var(--ok)', marginTop: 4 }}>
                  ✓ Email updated — approval email resent to new address
                </div>
              )}
              {emailDone === 'saved' && (
                <div style={{ fontSize: 12.5, color: 'var(--ok)', marginTop: 4 }}>
                  ✓ Email updated
                </div>
              )}
            </div>
            {(app.contactPhone || app.facilityPhone) && (
              <InfoField label="Phone" value={app.contactPhone ?? app.facilityPhone ?? ''} />
            )}
            {app.jobTitle        && <InfoField label="Job Title" value={app.jobTitle} />}
            {app.facilityWebsite && <InfoField label="Website"   value={app.facilityWebsite} accent />}
          </div>
        </div>

        {/* Clinic details card */}
        <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 14, padding: '20px 22px' }}>
          <div style={{ fontFamily: 'var(--ff)', fontSize: 11, fontWeight: 700, letterSpacing: '1px', textTransform: 'uppercase', color: 'var(--muted2)', marginBottom: 14 }}>
            Clinic Details
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <InfoField label="Type"    value={app.facilityType} />
            <InfoField label="Address" value={address} />
            {app.services.length > 0 && (
              <div>
                <div style={{ fontFamily: 'var(--ff)', fontSize: 11, color: 'var(--muted2)', marginBottom: 4 }}>Services</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                  {app.services.map(s => (
                    <span key={s} style={{
                      fontFamily: 'var(--ff)', fontSize: 11.5, fontWeight: 500,
                      background: 'var(--bg)', border: '1px solid var(--border)',
                      borderRadius: 7, padding: '3px 9px', color: 'var(--text)',
                    }}>
                      {s}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Capabilities (admin can set after approval) ── */}
      {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
      {(app as any).clinic && (
        <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 14, padding: '20px 22px', marginBottom: 16 }}>
          <div style={{ fontFamily: 'var(--ff)', fontSize: 11, fontWeight: 700, letterSpacing: '1px', textTransform: 'uppercase', color: 'var(--muted2)', marginBottom: 6 }}>
            Services &amp; specialisms
          </div>
          <p style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 14, lineHeight: 1.55 }}>
            These appear as filter tags on the patient &ldquo;Find a clinic&rdquo; page.
          </p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 14 }}>
            {CAPABILITY_OPTIONS.map(opt => {
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              const current: string[] = adminCaps ?? (app as any).clinic.capabilities ?? []
              const isOn = current.includes(opt.value)
              return (
                <button
                  key={opt.value}
                  type="button"
                  className={`cap-chip${isOn ? ' on' : ''}`}
                  style={{ fontSize: 12.5 }}
                  onClick={() => {
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    const base: string[] = adminCaps ?? (app as any).clinic.capabilities ?? []
                    setAdminCaps(isOn ? base.filter((c: string) => c !== opt.value) : [...base, opt.value])
                  }}
                  aria-pressed={isOn}
                >
                  {opt.label}
                </button>
              )
            })}
          </div>
          {adminCapsError && (
            <div style={{ marginBottom: 10, fontSize: 12.5, color: 'var(--err)' }}>{adminCapsError}</div>
          )}
          <button
            className="btn btn-s"
            style={{ fontSize: 13 }}
            disabled={adminCapsSaving || adminCaps === null}
            onClick={async () => {
              if (adminCaps === null) return
              setAdminCapsSaving(true); setAdminCapsError('')
              try {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                await adminUpdateCapabilities({ clinicId: (app as any).clinic._id, capabilities: adminCaps })
                setAdminCapsSaved(true)
                setTimeout(() => setAdminCapsSaved(false), 3000)
              } catch (e) {
                setAdminCapsError(convexMsg(e, 'Save failed'))
              } finally {
                setAdminCapsSaving(false)
              }
            }}
          >
            {adminCapsSaving ? 'Saving…' : adminCapsSaved ? 'Saved ✓' : 'Save capabilities'}
          </button>
        </div>
      )}

      {/* ── Registration & Compliance ── */}
      {(app.regulatoryBody || app.registrationNum) && (
        <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 14, padding: '20px 22px', marginBottom: 16 }}>
          <div style={{ fontFamily: 'var(--ff)', fontSize: 11, fontWeight: 700, letterSpacing: '1px', textTransform: 'uppercase', color: 'var(--muted2)', marginBottom: 14 }}>
            Registration &amp; Compliance
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(200px,1fr))', gap: 16 }}>
            {app.registrationNum && (
              <InfoField label={app.regulatoryBody ?? 'Registration Number'} value={app.registrationNum} />
            )}
            {app.regulatoryBody && !app.registrationNum && (
              <InfoField label="Regulatory Body" value={app.regulatoryBody} />
            )}
            <InfoField label="Country" value={app.facilityCountry} />
          </div>
        </div>
      )}

      {/* ── Accreditation Document ── */}
      {app.fileUrl && (
        <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 14, padding: '20px 22px', marginBottom: 16 }}>
          <div style={{ fontFamily: 'var(--ff)', fontSize: 11, fontWeight: 700, letterSpacing: '1px', textTransform: 'uppercase', color: 'var(--muted2)', marginBottom: 14 }}>
            Accreditation Document
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 10, padding: '14px 16px' }}>
            <div style={{
              width: 38, height: 38, borderRadius: 9, flexShrink: 0,
              background: 'color-mix(in srgb,var(--err) 10%,transparent)',
              border: '1px solid color-mix(in srgb,var(--err) 22%,transparent)',
              display: 'grid', placeItems: 'center',
            }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--err)" strokeWidth="1.7">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                <polyline points="14 2 14 8 20 8"/>
                <line x1="16" y1="13" x2="8" y2="13"/>
                <line x1="16" y1="17" x2="8" y2="17"/>
              </svg>
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontFamily: 'var(--ff)', fontSize: 13.5, fontWeight: 600, color: 'var(--text)', marginBottom: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {app.fileName ?? 'Accreditation document'}
              </div>
              <div style={{ fontFamily: 'var(--fb)', fontSize: 12, color: 'var(--muted)' }}>
                Submitted {formatDate(app.submittedAt)}
              </div>
            </div>
            <a
              href={app.fileUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="btn"
              style={{ flexShrink: 0, display: 'flex', alignItems: 'center', gap: 6, fontSize: 13 }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                <polyline points="7 10 12 15 17 10"/>
                <line x1="12" y1="15" x2="12" y2="3"/>
              </svg>
              View / Download
            </a>
          </div>
        </div>
      )}

      {/* ── Facility capacity ── */}
      {(app.mriScannerCount != null || app.staffUsingImplantId != null) && (
        <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 14, padding: '20px 22px', marginBottom: 16 }}>
          <div style={{ fontFamily: 'var(--ff)', fontSize: 11, fontWeight: 700, letterSpacing: '1px', textTransform: 'uppercase', color: 'var(--muted2)', marginBottom: 14 }}>
            Facility Capacity
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(200px,1fr))', gap: 16 }}>
            {app.mriScannerCount != null && (
              <InfoField label="MRI Scanners" value={String(app.mriScannerCount)} />
            )}
            {app.staffUsingImplantId != null && (
              <InfoField label="Staff using Implant ID" value={String(app.staffUsingImplantId)} />
            )}
          </div>
        </div>
      )}

      {/* ── Notes (applicant additional info + admin review notes) ── */}
      {(app.additionalInfo || app.reviewNotes) && (
        <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 14, padding: '20px 22px', marginBottom: 24 }}>
          {app.additionalInfo && (
            <>
              <div style={{ fontFamily: 'var(--ff)', fontSize: 11, fontWeight: 700, letterSpacing: '1px', textTransform: 'uppercase', color: 'var(--muted2)', marginBottom: 10 }}>
                Additional Information
              </div>
              <div style={{ fontFamily: 'var(--fb)', fontSize: 14, color: 'var(--text)', lineHeight: 1.65, marginBottom: app.reviewNotes ? 16 : 0 }}>
                {app.additionalInfo}
              </div>
            </>
          )}
          {app.reviewNotes && (
            <>
              <div style={{ fontFamily: 'var(--ff)', fontSize: 11, fontWeight: 700, letterSpacing: '1px', textTransform: 'uppercase', color: 'var(--muted2)', marginBottom: 10, marginTop: app.additionalInfo ? 4 : 0 }}>
                Review Notes
              </div>
              <div style={{ fontFamily: 'var(--fb)', fontSize: 14, color: 'var(--text)', lineHeight: 1.65 }}>
                {app.reviewNotes}
              </div>
            </>
          )}
        </div>
      )}

      {/* ── Unapprove link (approved clinics only) ── */}
      {/* ── Billing / Forever free ── */}
      {app.status === 'approved' && (app as any).clinic && (
        <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 14, padding: '20px 22px', marginTop: 16 }}>
          <div style={{ fontFamily: 'var(--ff)', fontSize: 11, fontWeight: 700, letterSpacing: '1px', textTransform: 'uppercase', color: 'var(--muted2)', marginBottom: 14 }}>
            Billing
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
            <div>
              <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)', marginBottom: 3 }}>
                Free plan
              </div>
              <div style={{ fontSize: 13, color: 'var(--muted)' }}>
                {(app as any).clinic.foreverFree
                  ? 'Active — complimentary access, no payment required.'
                  : `Off — ${(app as any).clinic.billingStatus ?? 'trialing'} · ${(app as any).clinic.billingPlan ?? 'no plan'}`}
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6 }}>
              {/* Toggle switch */}
              <button
                role="switch"
                aria-checked={(app as any).clinic.foreverFree}
                aria-label="Free plan"
                disabled={freeToggling}
                onClick={async () => {
                  setFreeToggling(true); setFreeErr('')
                  try {
                    await setForeverFree({ clinicId: (app as any).clinic._id, foreverFree: !(app as any).clinic.foreverFree })
                  } catch (e) {
                    setFreeErr(convexMsg(e, 'Failed to update'))
                  } finally {
                    setFreeToggling(false)
                  }
                }}
                style={{
                  position: 'relative', display: 'inline-flex', alignItems: 'center',
                  width: 44, height: 24, borderRadius: 12, border: 'none', cursor: freeToggling ? 'wait' : 'pointer',
                  background: (app as any).clinic.foreverFree ? 'var(--accent)' : 'var(--border)',
                  transition: 'background .2s', flexShrink: 0, padding: 0,
                }}
              >
                <span style={{
                  position: 'absolute', top: 3, left: (app as any).clinic.foreverFree ? 23 : 3,
                  width: 18, height: 18, borderRadius: '50%', background: '#fff',
                  boxShadow: '0 1px 3px rgba(0,0,0,.2)', transition: 'left .2s',
                }} />
              </button>
              {freeErr && <div style={{ fontSize: 12, color: 'var(--err)' }}>{freeErr}</div>}
            </div>
          </div>
        </div>
      )}

      {/* ── Billing test panel (dev only) ── */}
      {app.status === 'approved' && (app as any).clinic && (
        <div style={{ background: 'rgba(255,200,0,.06)', border: '1.5px dashed rgba(255,200,0,.4)', borderRadius: 14, padding: '18px 20px', marginTop: 16 }}>
          <div style={{ fontFamily: 'var(--ff)', fontSize: 11, fontWeight: 700, letterSpacing: '1px', textTransform: 'uppercase', color: 'rgba(160,120,0,.8)', marginBottom: 12 }}>
            🧪 Billing test controls (dev only)
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {[
              { preset: 'trialing_14d',    label: 'Trial · 14 days' },
              { preset: 'trialing_2d',     label: 'Trial · 2 days left' },
              { preset: 'trial_expired',   label: 'Trial expired' },
              { preset: 'active_per_user', label: 'Active · Per User' },
              { preset: 'active_clinics',  label: 'Active · Clinics' },
              { preset: 'past_due_grace',  label: 'Past due · 5 days grace' },
              { preset: 'past_due_expired',label: 'Past due · suspended' },
              { preset: 'canceled',        label: 'Canceled' },
              { preset: 'forever_free',    label: 'Forever free' },
              { preset: 'reset',           label: '↺ Reset' },
            ].map(({ preset, label }) => (
              <button
                key={preset}
                className="btn"
                style={{ fontSize: 12, padding: '5px 12px', opacity: testLoading ? 0.5 : 1 }}
                disabled={testLoading}
                onClick={async () => {
                  setTestPreset(preset); setTestLoading(true)
                  try { await devSetBillingState({ clinicId: (app as any).clinic._id, preset }) }
                  catch (e: any) { alert(e.message) }
                  finally { setTestLoading(false); setTestPreset('') }
                }}
              >
                {testLoading && testPreset === preset ? 'Setting…' : label}
              </button>
            ))}
          </div>
          <div style={{ marginTop: 8, fontSize: 12, color: 'rgba(160,120,0,.7)' }}>
            After setting a state, open the clinic portal in another tab to see the result.
          </div>
        </div>
      )}

      {app.status === 'approved' && (
        <div style={{ marginTop: 32, paddingTop: 20, borderTop: '1px solid var(--border)', textAlign: 'center' }}>
          <button
            onClick={() => openConfirm('unapprove')}
            style={{
              background: 'none', border: 'none', cursor: 'pointer', padding: 0,
              fontFamily: 'var(--ff)', fontSize: 12, color: 'var(--muted2)',
              textDecoration: 'underline', textDecorationStyle: 'dotted',
              textUnderlineOffset: 3,
            }}
          >
            Unapprove this clinic
          </button>
        </div>
      )}

      {/* ── Confirmation modal ── */}
      {confirmAction && (
        <div className="confirm-back open" onClick={closeConfirm}>
          <div className="confirm-modal" onClick={e => e.stopPropagation()}>
            <div className="confirm-body">
              {confirmAction === 'approve' ? (
                <>
                  <div style={{
                    width: 44, height: 44, borderRadius: '50%',
                    background: 'color-mix(in srgb,var(--ok) 12%,transparent)',
                    display: 'grid', placeItems: 'center', margin: '0 auto 14px',
                  }}>
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--ok)" strokeWidth="2">
                      <path d="M20 6L9 17l-5-5"/>
                    </svg>
                  </div>
                  <h3>Approve clinic?</h3>
                  <p><strong>{app.facilityName}</strong></p>
                  <p>This will activate their clinic account on the platform.</p>
                </>
              ) : confirmAction === 'reject' ? (
                <>
                  <div style={{
                    width: 44, height: 44, borderRadius: '50%',
                    background: 'color-mix(in srgb,var(--err) 12%,transparent)',
                    display: 'grid', placeItems: 'center', margin: '0 auto 14px',
                  }}>
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--err)" strokeWidth="2">
                      <line x1="18" y1="6" x2="6" y2="18"/>
                      <line x1="6" y1="6" x2="18" y2="18"/>
                    </svg>
                  </div>
                  <h3>Reject application?</h3>
                  <p><strong>{app.facilityName}</strong></p>
                  <div className="field" style={{ marginTop: 12, textAlign: 'left' }}>
                    <label style={{
                      fontFamily: 'var(--ff)', fontSize: 13, fontWeight: 500,
                      color: 'var(--text)', display: 'block', marginBottom: 6,
                    }}>
                      Reason <span style={{ color: 'var(--muted)', fontWeight: 400 }}>(optional)</span>
                    </label>
                    <textarea
                      className="input"
                      rows={3}
                      placeholder="Reason for rejection…"
                      value={rejectNotes}
                      onChange={e => setRejectNotes(e.target.value)}
                      style={{ resize: 'vertical' }}
                    />
                  </div>
                </>
              ) : (
                <>
                  <div style={{
                    width: 44, height: 44, borderRadius: '50%',
                    background: 'color-mix(in srgb,var(--warn,#d97706) 12%,transparent)',
                    display: 'grid', placeItems: 'center', margin: '0 auto 14px',
                  }}>
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#d97706" strokeWidth="2">
                      <circle cx="12" cy="12" r="10"/>
                      <line x1="12" y1="8" x2="12" y2="12"/>
                      <line x1="12" y1="16" x2="12.01" y2="16"/>
                    </svg>
                  </div>
                  <h3>Unapprove this clinic?</h3>
                  <p><strong>{app.facilityName}</strong></p>
                  <p style={{ color: 'var(--muted)', fontSize: 13 }}>
                    Their clinic account will be suspended and they'll receive a rejection email.
                  </p>
                  <div className="field" style={{ marginTop: 12, textAlign: 'left' }}>
                    <label style={{
                      fontFamily: 'var(--ff)', fontSize: 13, fontWeight: 500,
                      color: 'var(--text)', display: 'block', marginBottom: 6,
                    }}>
                      Reason <span style={{ color: 'var(--muted)', fontWeight: 400 }}>(optional — included in email)</span>
                    </label>
                    <textarea
                      className="input"
                      rows={3}
                      placeholder="Reason for unapproval…"
                      value={rejectNotes}
                      onChange={e => setRejectNotes(e.target.value)}
                      style={{ resize: 'vertical' }}
                    />
                  </div>
                </>
              )}
              {submitError && (
                <div style={{ color: 'var(--err)', fontFamily: 'var(--ff)', fontSize: 13, marginTop: 8 }}>
                  {submitError}
                </div>
              )}
            </div>
            <div className="confirm-actions">
              <button className="btn" onClick={closeConfirm} disabled={submitting}>Cancel</button>
              {confirmAction === 'approve' ? (
                <button className="btn btn-s" onClick={handleConfirm} disabled={submitting}>
                  {submitting ? 'Approving…' : 'Approve'}
                </button>
              ) : confirmAction === 'reject' ? (
                <button className="btn btn-danger" onClick={handleConfirm} disabled={submitting}>
                  {submitting ? 'Rejecting…' : 'Reject'}
                </button>
              ) : (
                <button className="btn btn-danger" onClick={handleConfirm} disabled={submitting}>
                  {submitting ? 'Unapproving…' : 'Unapprove'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
