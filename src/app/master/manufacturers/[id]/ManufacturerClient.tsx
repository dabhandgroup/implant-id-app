'use client'

import { useState }             from 'react'
import { useQuery, useMutation } from 'convex/react'
import { useRouter }             from 'next/navigation'
import { api as apiBase }        from '../../../../../convex/_generated/api'
import { Id }                    from '../../../../../convex/_generated/dataModel'
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const api = apiBase as any

type ActionType = 'approve' | 'reject'
interface Props { id: string }

function formatDate(ts: number) {
  return new Date(ts).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
}
function getInitials(name: string) {
  const w = name.trim().split(/\s+/)
  return w.length === 1 ? w[0].slice(0, 2).toUpperCase() : (w[0][0] + w[1][0]).toUpperCase()
}

/** A labelled field inside a panel */
function Field({ label, value }: { label: string; value?: string | null }) {
  if (!value) return null
  return (
    <div>
      <div style={{ fontFamily: 'var(--ff)', fontSize: 11, fontWeight: 600, letterSpacing: '.6px', textTransform: 'uppercase', color: 'var(--muted2)', marginBottom: 4 }}>{label}</div>
      <div style={{ fontFamily: 'var(--fb)', fontSize: 14, color: 'var(--text)', lineHeight: 1.4 }}>{value}</div>
    </div>
  )
}

/** A row of pill tags */
function TagField({ label, values }: { label: string; values?: string[] | null }) {
  if (!values?.length) return null
  return (
    <div>
      <div style={{ fontFamily: 'var(--ff)', fontSize: 11, fontWeight: 600, letterSpacing: '.6px', textTransform: 'uppercase', color: 'var(--muted2)', marginBottom: 6 }}>{label}</div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
        {values.map(v => (
          <span key={v} style={{ background: 'color-mix(in srgb,var(--accent) 10%,transparent)', color: 'var(--accent)', fontFamily: 'var(--ff)', fontSize: 12, fontWeight: 500, padding: '3px 10px', borderRadius: 6 }}>{v}</span>
        ))}
      </div>
    </div>
  )
}

/** A section panel containing a grid of fields */
function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 14, overflow: 'hidden', marginBottom: 16 }}>
      <div style={{ padding: '14px 22px', borderBottom: '1px solid var(--border)', background: 'color-mix(in srgb,var(--text) 2%,transparent)' }}>
        <div style={{ fontFamily: 'var(--ff)', fontSize: 12, fontWeight: 700, letterSpacing: '1px', textTransform: 'uppercase', color: 'var(--muted2)' }}>{title}</div>
      </div>
      <div style={{ padding: '20px 22px', display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(180px,1fr))', gap: '18px 24px' }}>
        {children}
      </div>
    </div>
  )
}

export default function ManufacturerClient({ id }: Props) {
  const router   = useRouter()
  const mfr      = useQuery(api.manufacturers.getApplicationById, { id: id as Id<'manufacturers'> })
  const review   = useMutation(api.manufacturers.reviewApplication)

  const [confirmAction, setConfirmAction] = useState<ActionType | null>(null)
  const [rejectNotes,   setRejectNotes]   = useState('')
  const [submitting,    setSubmitting]    = useState(false)
  const [submitError,   setSubmitError]   = useState('')

  function openConfirm(type: ActionType) { setConfirmAction(type); setRejectNotes(''); setSubmitError('') }
  function closeConfirm() { if (!submitting) { setConfirmAction(null); setSubmitError('') } }

  async function handleConfirm() {
    if (!mfr) return
    setSubmitting(true); setSubmitError('')
    try {
      await review({
        applicationId: id,
        decision: confirmAction === 'approve' ? 'approved' : 'rejected',
        notes: confirmAction === 'reject' && rejectNotes.trim() ? rejectNotes.trim() : undefined,
      })
      // Stay on page — Convex reactively updates the status badge.
      // Immediate navigation triggers Clerk auth middleware redirect to /login.
      setConfirmAction(null); setSubmitError('')
    } catch (e) {
      setSubmitError((e as { message?: string })?.message ?? 'Something went wrong')
      setSubmitting(false)
    }
  }

  if (mfr === undefined) return <div className="m-content" style={{ padding: '48px 0', textAlign: 'center', color: 'var(--muted)', fontFamily: 'var(--ff)', fontSize: 14 }}>Loading…</div>
  if (mfr === null)      return <div className="m-content" style={{ padding: '48px 0', textAlign: 'center', color: 'var(--muted)', fontFamily: 'var(--ff)', fontSize: 14 }}>Manufacturer not found.</div>

  const isPending  = mfr.status === 'pending'
  const isApproved = mfr.status === 'approved'
  const colour     = isPending ? '#d97706' : isApproved ? 'var(--ok)' : 'var(--err)'

  return (
    <div className="m-content">
      <button onClick={() => router.push('/master/manufacturers')} className="m-back"
        style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: 'var(--muted)', fontFamily: 'var(--ff)', fontSize: 13.5, background: 'transparent', border: 0, cursor: 'pointer', padding: 0, marginBottom: 20 }}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16"><polyline points="15 18 9 12 15 6"/></svg>
        Back to Manufacturers
      </button>

      {/* ── Profile header ── */}
      <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 16, padding: '24px 28px', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 20 }}>
        <div style={{ width: 60, height: 60, borderRadius: 14, flexShrink: 0, background: 'color-mix(in srgb,var(--accent) 14%,transparent)', border: '1.5px solid color-mix(in srgb,var(--accent) 28%,transparent)', display: 'grid', placeItems: 'center' }}>
          <span style={{ fontFamily: 'var(--ff)', fontWeight: 700, fontSize: 20, color: 'var(--accent)' }}>{getInitials(mfr.companyName)}</span>
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <h2 style={{ marginBottom: 6, fontFamily: 'var(--ff)' }}>{mfr.companyName}</h2>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontFamily: 'var(--ff)', fontSize: 11.5, fontWeight: 700, color: colour, background: `color-mix(in srgb,${colour} 10%,transparent)`, border: `1px solid color-mix(in srgb,${colour} 25%,transparent)`, borderRadius: 7, padding: '3px 10px', textTransform: 'uppercase', letterSpacing: '.5px' }}>
              {isPending && <span style={{ width: 6, height: 6, borderRadius: '50%', background: colour, display: 'inline-block' }} />}
              {mfr.status.charAt(0).toUpperCase() + mfr.status.slice(1)}
            </span>
            <span style={{ fontFamily: 'var(--fb)', fontSize: 13, color: 'var(--muted)' }}>Applied {formatDate(mfr.submittedAt)}</span>
            {mfr.country && <span style={{ fontFamily: 'var(--fb)', fontSize: 13, color: 'var(--muted)' }}>{mfr.country}</span>}
            {mfr.website && <a href={mfr.website.startsWith('http') ? mfr.website : `https://${mfr.website}`} target="_blank" rel="noopener noreferrer" style={{ fontFamily: 'var(--fb)', fontSize: 13, color: 'var(--accent)', textDecoration: 'none' }}>{mfr.website}</a>}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
          {(isPending || mfr.status === 'rejected') && <button className="btn btn-s" onClick={() => openConfirm('approve')}>Approve ✓</button>}
          {(isPending || isApproved) && <button className="btn btn-danger" onClick={() => openConfirm('reject')}>{isApproved ? 'Suspend' : 'Reject'}</button>}
        </div>
      </div>

      {/* ── Company Identity panel ── */}
      <Panel title="Company Identity">
        <Field label="Legal entity name"        value={mfr.legalEntityName} />
        <Field label="Trading / brand name"     value={mfr.companyName} />
        <Field label="Registration number"      value={mfr.regNumber} />
        <Field label="Country of incorporation" value={mfr.country} />
      </Panel>

      {/* ── Regulatory panel ── */}
      <Panel title="Regulatory">
        <Field label="ISO 13485 cert no."  value={mfr.iso13485CertNumber} />
        <Field label="Issuing body"        value={mfr.iso13485IssuingBody} />
        <Field label="Expiry date"         value={mfr.iso13485ExpiryDate} />
        <Field label="Other registrations" value={mfr.regulatoryRegistrations} />
        <div style={{ gridColumn: '1/-1' }}>
          <TagField label="Device categories"  values={mfr.deviceCategories} />
        </div>
        <div style={{ gridColumn: '1/-1' }}>
          <TagField label="Geographic markets" values={mfr.geographicMarkets} />
        </div>
      </Panel>

      {/* ── Primary Contact panel ── */}
      <Panel title="Primary Contact">
        <Field label="Name"      value={mfr.contactName} />
        <Field label="Job title" value={mfr.contactJobTitle} />
        <Field label="Email"     value={mfr.contactEmail} />
        <Field label="Phone"     value={mfr.contactPhone} />
      </Panel>

      {/* ── Supporting Documents panel ── */}
      {(mfr.docCompanyRegistration || mfr.docIso13485 || mfr.docRegulatoryCert || mfr.docLetterhead || mfr.docMriSampleData) && (
        <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 14, overflow: 'hidden', marginBottom: 16 }}>
          <div style={{ padding: '14px 22px', borderBottom: '1px solid var(--border)', background: 'color-mix(in srgb,var(--text) 2%,transparent)' }}>
            <div style={{ fontFamily: 'var(--ff)', fontSize: 12, fontWeight: 700, letterSpacing: '1px', textTransform: 'uppercase', color: 'var(--muted2)' }}>Supporting Documents</div>
          </div>
          <div style={{ padding: '16px 22px', display: 'flex', flexDirection: 'column', gap: 8 }}>
            {([
              { id: mfr.docCompanyRegistration, label: 'Certificate of Incorporation' },
              { id: mfr.docIso13485,            label: 'ISO 13485 Certificate' },
              { id: mfr.docRegulatoryCert,      label: 'Regulatory Certificate' },
              { id: mfr.docLetterhead,          label: 'Company Letterhead Statement' },
              { id: mfr.docMriSampleData,       label: 'Sample MRI Safety Data' },
            ] as const).filter(d => d.id).map(doc => (
              <a key={doc.label} href={`/api/storage/${doc.id}`} target="_blank" rel="noopener noreferrer"
                style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 10, textDecoration: 'none', color: 'var(--text)' }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="1.7"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
                <div style={{ flex: 1 }}>
                  <div style={{ fontFamily: 'var(--ff)', fontSize: 13.5, fontWeight: 500 }}>{doc.label}</div>
                </div>
                <div style={{ fontFamily: 'var(--ff)', fontSize: 12, color: 'var(--accent)' }}>View / Download →</div>
              </a>
            ))}
          </div>
        </div>
      )}

      {/* Review notes */}
      {mfr.reviewNotes && (
        <div style={{ background: 'color-mix(in srgb,var(--err) 6%,transparent)', border: '1px solid color-mix(in srgb,var(--err) 18%,transparent)', borderRadius: 12, padding: '14px 18px', marginBottom: 16 }}>
          <div style={{ fontFamily: 'var(--ff)', fontSize: 11, fontWeight: 700, letterSpacing: '1px', textTransform: 'uppercase', color: 'var(--err)', marginBottom: 6 }}>Review Notes</div>
          <div style={{ fontFamily: 'var(--fb)', fontSize: 14 }}>{mfr.reviewNotes}</div>
        </div>
      )}

      {/* ── Approve modal ── */}
      {confirmAction === 'approve' && (
        <div className="logout-back open" onClick={closeConfirm}>
          <div className="logout-modal" onClick={e => e.stopPropagation()}>
            <div className="logout-body">
              <div style={{ width: 44, height: 44, borderRadius: '50%', background: 'color-mix(in srgb,var(--ok) 12%,transparent)', display: 'grid', placeItems: 'center', margin: '0 auto 14px' }}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--ok)" strokeWidth="2"><path d="M20 6L9 17l-5-5"/></svg>
              </div>
              <h3>Approve manufacturer?</h3>
              <p><strong>{mfr.companyName}</strong> will be activated and able to upload devices to the catalogue.</p>
              {submitError && <div style={{ marginTop: 12, padding: '10px 12px', background: 'color-mix(in srgb,var(--err) 8%,transparent)', borderRadius: 8, fontSize: 13, color: 'var(--err)' }}>{submitError}</div>}
            </div>
            <div className="logout-actions">
              <button className="btn" onClick={closeConfirm} disabled={submitting}>Cancel</button>
              <button className="btn btn-s" onClick={handleConfirm} disabled={submitting}>{submitting ? 'Approving…' : 'Approve'}</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Reject modal ── */}
      {confirmAction === 'reject' && (
        <div className="logout-back open" onClick={closeConfirm}>
          <div className="logout-modal" onClick={e => e.stopPropagation()}>
            <div className="logout-body">
              <div style={{ width: 44, height: 44, borderRadius: '50%', background: 'color-mix(in srgb,var(--err) 12%,transparent)', display: 'grid', placeItems: 'center', margin: '0 auto 14px' }}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--err)" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </div>
              <h3>{isApproved ? 'Suspend manufacturer?' : 'Reject application?'}</h3>
              <p style={{ marginBottom: 14 }}><strong>{mfr.companyName}</strong></p>
              <p style={{ marginBottom: 14, color: 'var(--muted)', fontSize: 13 }}>Provide a reason — this will be sent to the applicant.</p>
              <textarea className="input" style={{ resize: 'vertical', minHeight: 80 }}
                placeholder="e.g. Unable to verify ISO 13485 certificate…"
                value={rejectNotes} onChange={e => setRejectNotes(e.target.value)} />
              {submitError && <div style={{ marginTop: 12, padding: '10px 12px', background: 'color-mix(in srgb,var(--err) 8%,transparent)', borderRadius: 8, fontSize: 13, color: 'var(--err)' }}>{submitError}</div>}
            </div>
            <div className="logout-actions">
              <button className="btn" onClick={closeConfirm} disabled={submitting}>Cancel</button>
              <button className="btn btn-danger" onClick={handleConfirm} disabled={submitting || !rejectNotes.trim()}>
                {submitting ? 'Processing…' : isApproved ? 'Suspend' : 'Reject'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
