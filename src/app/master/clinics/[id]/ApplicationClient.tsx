'use client'

import { useState } from 'react'
import { useQuery, useMutation } from 'convex/react'
import { useRouter } from 'next/navigation'
import { api } from '../../../../../convex/_generated/api'
import type { Id } from '../../../../../convex/_generated/dataModel'

type ActionType = 'approve' | 'reject'

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

  const app              = useQuery(api.clinics.getApplicationById, { id: id as Id<'clinicApplications'> })
  const reviewApplication = useMutation(api.clinics.reviewApplication)

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
        notes:         confirmAction === 'reject' && rejectNotes.trim() ? rejectNotes.trim() : undefined,
      })
      router.push('/master/clinics')
    } catch (e) {
      setSubmitError((e as { message?: string })?.message ?? 'Something went wrong')
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
        padding: '28px 32px', marginBottom: 20, display: 'flex', alignItems: 'flex-start', gap: 22,
      }}>
        {/* Initials avatar */}
        <div style={{
          width: 64, height: 64, borderRadius: 16, flexShrink: 0,
          background: 'color-mix(in srgb,var(--accent) 14%,transparent)',
          border: '1.5px solid color-mix(in srgb,var(--accent) 28%,transparent)',
          display: 'grid', placeItems: 'center',
        }}>
          <span style={{ fontFamily: 'var(--ff)', fontWeight: 700, fontSize: 22, color: 'var(--accent)' }}>
            {initials}
          </span>
        </div>

        {/* Name + status */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <h2 style={{ marginBottom: 6 }}>{app.facilityName}</h2>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
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
        </div>

        {/* Approve / Reject — pending only */}
        {app.status === 'pending' && (
          <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
            <button className="btn btn-s"    onClick={() => openConfirm('approve')}>Approve</button>
            <button className="btn btn-danger" onClick={() => openConfirm('reject')}>Reject</button>
          </div>
        )}
      </div>

      {/* ── Contact + Clinic details ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>

        {/* Contact card */}
        <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 14, padding: '20px 22px' }}>
          <div style={{ fontFamily: 'var(--ff)', fontSize: 11, fontWeight: 700, letterSpacing: '1px', textTransform: 'uppercase', color: 'var(--muted2)', marginBottom: 14 }}>
            Contact
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <InfoField label="Name"  value={app.contactName} />
            <InfoField label="Email" value={app.contactEmail} accent />
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

      {/* ── Registration & Compliance ── */}
      {(app.regulatoryBody || app.registrationNum) && (
        <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 14, padding: '20px 22px', marginBottom: 16 }}>
          <div style={{ fontFamily: 'var(--ff)', fontSize: 11, fontWeight: 700, letterSpacing: '1px', textTransform: 'uppercase', color: 'var(--muted2)', marginBottom: 14 }}>
            Registration &amp; Compliance
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
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

      {/* ── Confirmation modal ── */}
      {confirmAction && (
        <div className="logout-back open" onClick={closeConfirm}>
          <div className="logout-modal" onClick={e => e.stopPropagation()}>
            <div className="logout-body">
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
              ) : (
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
              )}
              {submitError && (
                <div style={{ color: 'var(--err)', fontFamily: 'var(--ff)', fontSize: 13, marginTop: 8 }}>
                  {submitError}
                </div>
              )}
            </div>
            <div className="logout-actions">
              <button className="btn" onClick={closeConfirm} disabled={submitting}>Cancel</button>
              {confirmAction === 'approve' ? (
                <button className="btn btn-s" onClick={handleConfirm} disabled={submitting}>
                  {submitting ? 'Approving…' : 'Approve'}
                </button>
              ) : (
                <button className="btn btn-danger" onClick={handleConfirm} disabled={submitting}>
                  {submitting ? 'Rejecting…' : 'Reject'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
