'use client'

import { useState }             from 'react'
import { useQuery, useMutation } from 'convex/react'
import { useRouter }             from 'next/navigation'
import { api as apiBase }        from '../../../../../convex/_generated/api'
import { Id }                    from '../../../../../convex/_generated/dataModel'
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const api = apiBase as any

interface Props { id: string }

function Field({ label, value }: { label: string; value?: string | string[] | null }) {
  if (!value || (Array.isArray(value) && value.length === 0)) return null
  return (
    <div style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 10, padding: '14px 18px' }}>
      <div style={{ fontFamily: 'var(--ff)', fontSize: 11, fontWeight: 600, letterSpacing: '1.1px', textTransform: 'uppercase', color: 'var(--muted2)', marginBottom: 6 }}>{label}</div>
      {Array.isArray(value) ? (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {value.map(v => (
            <span key={v} style={{ background: 'color-mix(in srgb,var(--accent) 10%,transparent)', color: 'var(--accent)', fontFamily: 'var(--ff)', fontSize: 12, fontWeight: 500, padding: '3px 10px', borderRadius: 6 }}>{v}</span>
          ))}
        </div>
      ) : (
        <div style={{ fontFamily: 'var(--fb)', fontSize: 14, color: 'var(--text)' }}>{value}</div>
      )}
    </div>
  )
}

export default function ManufacturerClient({ id }: Props) {
  const router             = useRouter()
  const mfr                = useQuery(api.manufacturers.getApplicationById, { id: id as Id<'manufacturers'> })
  const review             = useMutation(api.manufacturers.reviewApplication)

  const [confirmType,  setConfirmType]  = useState<'approve' | 'reject' | null>(null)
  const [rejectReason, setRejectReason] = useState('')
  const [confirming,   setConfirming]   = useState(false)
  const [confirmed,    setConfirmed]    = useState(false)
  const [error,        setError]        = useState('')

  // All hooks must be before early returns
  if (mfr === undefined) return <div className="m-content" style={{ padding: '48px 0', textAlign: 'center', color: 'var(--muted)', fontFamily: 'var(--ff)', fontSize: 14 }}>Loading…</div>
  if (mfr === null) return <div className="m-content" style={{ padding: '48px 0', textAlign: 'center', color: 'var(--muted)', fontFamily: 'var(--ff)', fontSize: 14 }}>Manufacturer not found.</div>

  const isPending  = mfr.status === 'pending'
  const isApproved = mfr.status === 'approved'
  const isRejected = mfr.status === 'rejected'

  async function handleConfirm() {
    if (!confirmType) return
    setError(''); setConfirming(true)
    try {
      await review({
        applicationId: id,
        action: confirmType,
        reviewNotes: confirmType === 'reject' ? rejectReason : undefined,
      })
      setConfirmed(true)
      await new Promise(r => setTimeout(r, 800))
      setConfirmType(null); setConfirmed(false); setConfirming(false)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'An error occurred')
      setConfirming(false)
    }
  }

  return (
    <div className="m-content">
      {/* Back */}
      <button
        className="m-back"
        onClick={() => router.push('/master/manufacturers')}
        style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: 'var(--muted)', fontFamily: 'var(--ff)', fontSize: 13.5, background: 'transparent', border: 0, cursor: 'pointer', padding: 0, marginBottom: 24 }}
      >
        ← All Manufacturers
      </button>

      {/* Header */}
      <div className="m-h">
        <div>
          <h2 style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            {mfr.companyName}
            <span className={`m-status ${mfr.status}`}>{mfr.status.charAt(0).toUpperCase() + mfr.status.slice(1)}</span>
          </h2>
          <div className="sub">{mfr.contactEmail} · Applied {new Date(mfr.submittedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {isPending && <>
            <button className="btn btn-s" onClick={() => { setConfirmType('approve'); setError('') }}>Approve ✓</button>
            <button className="btn btn-danger" onClick={() => { setConfirmType('reject'); setError('') }}>Reject</button>
          </>}
          {isRejected && <button className="btn btn-s" onClick={() => { setConfirmType('approve'); setError('') }}>Reconsider</button>}
          {isApproved && <button className="btn btn-danger" onClick={() => { setConfirmType('reject'); setError('') }}>Suspend</button>}
        </div>
      </div>

      {/* Confirmed banner */}
      {confirmed && (
        <div style={{ background: 'color-mix(in srgb,var(--ok) 10%,transparent)', border: '1px solid color-mix(in srgb,var(--ok) 25%,transparent)', borderRadius: 10, padding: '12px 18px', marginBottom: 20, fontFamily: 'var(--ff)', fontSize: 13.5, color: 'var(--ok)', fontWeight: 500 }}>
          Action applied successfully.
        </div>
      )}

      {/* ── Section: Company identity ── */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ fontFamily: 'var(--ff)', fontSize: 12, fontWeight: 700, letterSpacing: '1px', textTransform: 'uppercase', color: 'var(--muted2)', marginBottom: 12 }}>Company Identity</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(240px,1fr))', gap: 12 }}>
          <Field label="Legal Entity Name"          value={mfr.legalEntityName} />
          <Field label="Trading / Brand Name"       value={mfr.companyName} />
          <Field label="Registration Number"        value={mfr.regNumber} />
          <Field label="Country of Incorporation"   value={mfr.country} />
          <Field label="Website"                    value={mfr.website} />
        </div>
      </div>

      {/* ── Section: Regulatory ── */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ fontFamily: 'var(--ff)', fontSize: 12, fontWeight: 700, letterSpacing: '1px', textTransform: 'uppercase', color: 'var(--muted2)', marginBottom: 12 }}>Regulatory</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(240px,1fr))', gap: 12 }}>
          <Field label="ISO 13485 Certificate No."  value={mfr.iso13485CertNumber} />
          <Field label="ISO 13485 Issuing Body"     value={mfr.iso13485IssuingBody} />
          <Field label="ISO 13485 Expiry Date"      value={mfr.iso13485ExpiryDate} />
          <Field label="Other Registrations"        value={mfr.regulatoryRegistrations} />
          <Field label="Device Categories"          value={mfr.deviceCategories} />
          <Field label="Geographic Markets"         value={mfr.geographicMarkets} />
        </div>
      </div>

      {/* ── Section: Contact ── */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ fontFamily: 'var(--ff)', fontSize: 12, fontWeight: 700, letterSpacing: '1px', textTransform: 'uppercase', color: 'var(--muted2)', marginBottom: 12 }}>Primary Contact</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(240px,1fr))', gap: 12 }}>
          <Field label="Name"       value={mfr.contactName} />
          <Field label="Job Title"  value={mfr.contactJobTitle} />
          <Field label="Email"      value={mfr.contactEmail} />
          <Field label="Phone"      value={mfr.contactPhone} />
        </div>
      </div>

      {/* ── Supporting documents ── */}
      {(mfr.docCompanyRegistration || mfr.docIso13485 || mfr.docRegulatoryCert || mfr.docLetterhead || mfr.docMriSampleData) && (
        <div style={{ marginBottom: 24 }}>
          <div style={{ fontFamily: 'var(--ff)', fontSize: 12, fontWeight: 700, letterSpacing: '1px', textTransform: 'uppercase', color: 'var(--muted2)', marginBottom: 12 }}>Supporting Documents</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(220px,1fr))', gap: 10 }}>
            {([
              { id: mfr.docCompanyRegistration, label: 'Certificate of Incorporation' },
              { id: mfr.docIso13485,            label: 'ISO 13485 Certificate' },
              { id: mfr.docRegulatoryCert,      label: 'Regulatory Certificate' },
              { id: mfr.docLetterhead,          label: 'Company Letterhead Statement' },
              { id: mfr.docMriSampleData,       label: 'Sample MRI Safety Data' },
            ] as const).filter(d => d.id).map(doc => (
              <a
                key={doc.label}
                href={`/api/storage/${doc.id}`}
                target="_blank"
                rel="noopener noreferrer"
                style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 10, padding: '12px 16px', textDecoration: 'none', color: 'var(--text)', transition: 'border-color .15s' }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="1.7"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
                <div>
                  <div style={{ fontFamily: 'var(--ff)', fontSize: 13, fontWeight: 500 }}>{doc.label}</div>
                  <div style={{ fontSize: 11.5, color: 'var(--accent)', marginTop: 1 }}>View / Download →</div>
                </div>
              </a>
            ))}
          </div>
        </div>
      )}

      {/* ── Review notes ── */}
      {mfr.reviewNotes && (
        <div style={{ background: 'color-mix(in srgb,var(--err) 6%,transparent)', border: '1px solid color-mix(in srgb,var(--err) 18%,transparent)', borderRadius: 10, padding: '14px 18px', marginBottom: 24 }}>
          <div style={{ fontFamily: 'var(--ff)', fontSize: 11, fontWeight: 700, letterSpacing: '1px', textTransform: 'uppercase', color: 'var(--err)', marginBottom: 6 }}>Review Notes</div>
          <div style={{ fontFamily: 'var(--fb)', fontSize: 14, color: 'var(--text)' }}>{mfr.reviewNotes}</div>
        </div>
      )}

      {/* ── Approve modal ── */}
      {confirmType === 'approve' && (
        <div className="logout-back open" onClick={() => setConfirmType(null)}>
          <div className="logout-modal" onClick={e => e.stopPropagation()}>
            <div className="logout-body">
              <div style={{ width: 44, height: 44, borderRadius: '50%', background: 'color-mix(in srgb,var(--ok) 12%,transparent)', display: 'grid', placeItems: 'center', margin: '0 auto 14px' }}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--ok)" strokeWidth="2"><path d="M20 6L9 17l-5-5"/></svg>
              </div>
              <h3>Approve manufacturer?</h3>
              <p><strong>{mfr.companyName}</strong> will be activated and able to upload devices to the catalogue.</p>
              {error && <div style={{ marginTop: 12, padding: '10px 12px', background: 'color-mix(in srgb,var(--err) 8%,transparent)', borderRadius: 8, fontSize: 13, color: 'var(--err)' }}>{error}</div>}
            </div>
            <div className="logout-actions">
              <button className="btn" onClick={() => setConfirmType(null)} disabled={confirming}>Cancel</button>
              <button className="btn btn-s" onClick={handleConfirm} disabled={confirming}>
                {confirmed ? '✓ Approved!' : confirming ? 'Approving…' : 'Approve'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Reject modal ── */}
      {confirmType === 'reject' && (
        <div className="logout-back open" onClick={() => setConfirmType(null)}>
          <div className="logout-modal" onClick={e => e.stopPropagation()}>
            <div className="logout-body">
              <div style={{ width: 44, height: 44, borderRadius: '50%', background: 'color-mix(in srgb,var(--err) 12%,transparent)', display: 'grid', placeItems: 'center', margin: '0 auto 14px' }}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--err)" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </div>
              <h3>{isApproved ? 'Suspend manufacturer?' : 'Reject application?'}</h3>
              <p style={{ marginBottom: 14 }}><strong>{mfr.companyName}</strong></p>
              <p style={{ marginBottom: 14, color: 'var(--muted)', fontSize: 13 }}>Provide a reason — this will be included in the notification email.</p>
              <textarea className="input" style={{ resize: 'vertical', minHeight: 80 }} placeholder="e.g. Unable to verify ISO 13485 certificate…" value={rejectReason} onChange={e => setRejectReason(e.target.value)} />
              {error && <div style={{ marginTop: 12, padding: '10px 12px', background: 'color-mix(in srgb,var(--err) 8%,transparent)', borderRadius: 8, fontSize: 13, color: 'var(--err)' }}>{error}</div>}
            </div>
            <div className="logout-actions">
              <button className="btn" onClick={() => setConfirmType(null)} disabled={confirming}>Cancel</button>
              <button className="btn btn-danger" onClick={handleConfirm} disabled={confirming || !rejectReason.trim()}>
                {confirmed ? 'Done' : confirming ? 'Processing…' : isApproved ? 'Suspend' : 'Reject'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
