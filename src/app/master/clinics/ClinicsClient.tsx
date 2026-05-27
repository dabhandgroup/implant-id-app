'use client'

import { useState } from 'react'
import { useQuery, useMutation } from 'convex/react'
import { api } from '../../../../convex/_generated/api'
import type { Id } from '../../../../convex/_generated/dataModel'

type Tab = 'pending' | 'all' | 'rejected'

type Application = {
  _id:              Id<'clinicApplications'>
  facilityName:     string
  facilityType:     string
  facilityAddress:  string
  facilityCity?:    string
  facilityCountry:  string
  facilityWebsite?: string
  facilityPhone?:   string
  contactName:      string
  contactEmail:     string
  contactPhone?:    string
  jobTitle?:        string
  regulatoryBody?:  string
  registrationNum?: string
  services:         string[]
  additionalInfo?:  string
  status:           'pending' | 'approved' | 'rejected'
  submittedAt:      number
  reviewedAt?:      number
  reviewNotes?:     string
}

type Clinic = {
  _id:         Id<'clinics'>
  name:        string
  address:     string
  email?:      string
  phone?:      string
  website?:    string
  status:      'active' | 'pending' | 'suspended'
  _creationTime: number
}

function formatDate(ts: number) {
  return new Date(ts).toLocaleDateString('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric',
  })
}

// ── Detail modal for an application ──────────────────────────────────────────

function DetailRow({ label, value, fullWidth }: { label: string; value: string; fullWidth?: boolean }) {
  return (
    <div style={{ gridColumn: fullWidth ? '1 / -1' : undefined }}>
      <div style={{ fontFamily: 'var(--ff)', fontSize: 10.5, fontWeight: 600, letterSpacing: '1.2px', textTransform: 'uppercase', color: 'var(--muted2)', marginBottom: 4 }}>
        {label}
      </div>
      <div style={{ fontFamily: 'var(--fb)', fontSize: 14, color: 'var(--text)' }}>
        {value}
      </div>
    </div>
  )
}

function ApplicationModal({
  app,
  onClose,
  onApprove,
  onReject,
  reviewing,
  reviewError,
}: {
  app: Application
  onClose: () => void
  onApprove: (id: Id<'clinicApplications'>) => void
  onReject: (id: Id<'clinicApplications'>, notes?: string) => void
  reviewing: boolean
  reviewError: string
}) {
  const [rejectMode, setRejectMode] = useState(false)
  const [notes, setNotes] = useState('')

  return (
    <div
      className="logout-back open"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
      style={{ zIndex: 100 }}
    >
      <div
        className="logout-modal"
        style={{ maxWidth: 560, width: '90%', textAlign: 'left', padding: '28px 32px' }}
      >
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
          <div>
            <div style={{ fontFamily: 'var(--ff)', fontSize: 18, fontWeight: 600, color: 'var(--text)', marginBottom: 6 }}>
              {app.facilityName}
            </div>
            <span className={`m-status ${app.status === 'approved' ? 'active' : app.status}`}>
              {app.status.charAt(0).toUpperCase() + app.status.slice(1)}
            </span>
          </div>
          <button className="m-act" onClick={onClose}>Close</button>
        </div>

        {/* Details */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 20 }}>
          <DetailRow label="Facility Type"   value={app.facilityType} />
          <DetailRow label="Country"         value={app.facilityCountry} />
          <DetailRow label="Address"         value={app.facilityAddress} fullWidth />
          {app.facilityCity     && <DetailRow label="City"           value={app.facilityCity} />}
          {app.facilityPhone    && <DetailRow label="Facility Phone" value={app.facilityPhone} />}
          {app.facilityWebsite  && <DetailRow label="Website"        value={app.facilityWebsite} />}
          <DetailRow label="Contact Name"    value={app.contactName} />
          <DetailRow label="Contact Email"   value={app.contactEmail} />
          {app.contactPhone     && <DetailRow label="Phone"          value={app.contactPhone} />}
          {app.jobTitle         && <DetailRow label="Job Title"      value={app.jobTitle} />}
          {app.regulatoryBody   && <DetailRow label="Regulatory Body" value={app.regulatoryBody} />}
          {app.registrationNum  && <DetailRow label="Reg. Number"    value={app.registrationNum} />}
          {app.services.length > 0 && (
            <DetailRow label="Services"      value={app.services.join(', ')} fullWidth />
          )}
          {app.additionalInfo   && <DetailRow label="Additional Info" value={app.additionalInfo} fullWidth />}
          <DetailRow label="Submitted"       value={formatDate(app.submittedAt)} />
          {app.reviewedAt       && <DetailRow label="Reviewed"       value={formatDate(app.reviewedAt)} />}
          {app.reviewNotes      && <DetailRow label="Review Notes"   value={app.reviewNotes} fullWidth />}
        </div>

        {/* Actions — only for pending */}
        {app.status === 'pending' && (
          rejectMode ? (
            <div>
              <div className="field" style={{ marginBottom: 12 }}>
                <label style={{ fontFamily: 'var(--ff)', fontSize: 13, fontWeight: 500, color: 'var(--text)', display: 'block', marginBottom: 6 }}>
                  Rejection reason <span style={{ color: 'var(--muted)', fontWeight: 400 }}>(optional)</span>
                </label>
                <textarea
                  className="input"
                  rows={3}
                  placeholder="Reason for rejection…"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  style={{ resize: 'vertical' }}
                />
              </div>
              {reviewError && (
                <div style={{ color: 'var(--err)', fontFamily: 'var(--ff)', fontSize: 13, marginBottom: 10 }}>{reviewError}</div>
              )}
              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  className="btn btn-danger"
                  onClick={() => onReject(app._id, notes || undefined)}
                  disabled={reviewing}
                >
                  {reviewing ? 'Rejecting…' : 'Confirm Rejection'}
                </button>
                <button className="btn" onClick={() => setRejectMode(false)} disabled={reviewing}>
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <>
              {reviewError && (
                <div style={{ color: 'var(--err)', fontFamily: 'var(--ff)', fontSize: 13, marginBottom: 10 }}>{reviewError}</div>
              )}
              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  className="btn btn-s"
                  onClick={() => onApprove(app._id)}
                  disabled={reviewing}
                >
                  {reviewing ? 'Approving…' : 'Approve Application'}
                </button>
                <button
                  className="btn btn-danger"
                  onClick={() => setRejectMode(true)}
                  disabled={reviewing}
                >
                  Reject
                </button>
              </div>
            </>
          )
        )}
      </div>
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

export default function ClinicsClient() {
  // ALL hooks at top, unconditionally
  const [tab,          setTab]          = useState<Tab>('pending')
  const [selectedApp,  setSelectedApp]  = useState<Application | null>(null)
  const [reviewing,    setReviewing]    = useState(false)
  const [reviewError,  setReviewError]  = useState('')

  const pendingApps  = useQuery(api.clinics.listApplications, { status: 'pending'  }) as Application[] | undefined
  const rejectedApps = useQuery(api.clinics.listApplications, { status: 'rejected' }) as Application[] | undefined
  const allClinics   = useQuery(api.clinics.listClinics) as Clinic[] | undefined

  const reviewApplication = useMutation(api.clinics.reviewApplication)

  async function handleApprove(id: Id<'clinicApplications'>) {
    setReviewing(true)
    setReviewError('')
    try {
      await reviewApplication({ applicationId: id, decision: 'approved' })
      setSelectedApp(null)
    } catch (e) {
      setReviewError((e as { message?: string })?.message ?? 'Something went wrong')
    } finally {
      setReviewing(false)
    }
  }

  async function handleReject(id: Id<'clinicApplications'>, notes?: string) {
    setReviewing(true)
    setReviewError('')
    try {
      await reviewApplication({ applicationId: id, decision: 'rejected', notes })
      setSelectedApp(null)
    } catch (e) {
      setReviewError((e as { message?: string })?.message ?? 'Something went wrong')
    } finally {
      setReviewing(false)
    }
  }

  const pendingCount = pendingApps?.length ?? 0

  return (
    <div className="m-content">
      <div className="m-h">
        <div>
          <h2>Clinics</h2>
          <div className="sub">All registered and active clinic accounts on the platform.</div>
        </div>
        <button className="btn btn-s">+ Add Clinic</button>
      </div>

      {/* Tabs */}
      <div className="m-tabs">
        <button className={`m-tab${tab === 'pending' ? ' active' : ''}`} onClick={() => setTab('pending')}>
          Pending Applications
          {pendingCount > 0 && (
            <span style={{ marginLeft: 6, background: 'var(--warn)', color: '#fff', borderRadius: 10, padding: '1px 7px', fontSize: 11, fontWeight: 700 }}>
              {pendingCount}
            </span>
          )}
        </button>
        <button className={`m-tab${tab === 'all' ? ' active' : ''}`} onClick={() => setTab('all')}>
          All Clinics
        </button>
        <button className={`m-tab${tab === 'rejected' ? ' active' : ''}`} onClick={() => setTab('rejected')}>
          Rejected
        </button>
      </div>

      {/* ── Pending tab ── */}
      {tab === 'pending' && (
        pendingApps === undefined ? (
          <div style={{ color: 'var(--muted)', fontFamily: 'var(--ff)', fontSize: 14, padding: '32px 0' }}>Loading…</div>
        ) : pendingApps.length === 0 ? (
          <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 14, padding: '40px 24px', textAlign: 'center', color: 'var(--muted)', fontFamily: 'var(--ff)', fontSize: 14 }}>
            No pending applications.
          </div>
        ) : (
          <div className="m-tbl-wrap">
            <table className="m-tbl">
              <thead>
                <tr>
                  <th>Clinic Name</th>
                  <th>Facility Type</th>
                  <th>Country</th>
                  <th>Contact Email</th>
                  <th>Submitted</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {pendingApps.map(app => (
                  <tr
                    key={app._id}
                    style={{ cursor: 'pointer' }}
                    onClick={() => setSelectedApp(app)}
                  >
                    <td style={{ fontWeight: 500 }}>{app.facilityName}</td>
                    <td>{app.facilityType}</td>
                    <td>{app.facilityCountry}</td>
                    <td>{app.contactEmail}</td>
                    <td style={{ whiteSpace: 'nowrap' }}>{formatDate(app.submittedAt)}</td>
                    <td onClick={e => e.stopPropagation()}>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button
                          className="m-act"
                          onClick={() => setSelectedApp(app)}
                        >
                          View
                        </button>
                        <button
                          className="m-act approve"
                          onClick={() => handleApprove(app._id)}
                          disabled={reviewing}
                        >
                          Approve
                        </button>
                        <button
                          className="m-act reject"
                          onClick={() => setSelectedApp(app)}
                        >
                          Reject
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      )}

      {/* ── All Clinics tab ── */}
      {tab === 'all' && (
        allClinics === undefined ? (
          <div style={{ color: 'var(--muted)', fontFamily: 'var(--ff)', fontSize: 14, padding: '32px 0' }}>Loading…</div>
        ) : allClinics.length === 0 ? (
          <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 14, padding: '40px 24px', textAlign: 'center', color: 'var(--muted)', fontFamily: 'var(--ff)', fontSize: 14 }}>
            No active clinics yet. Approve a pending application to get started.
          </div>
        ) : (
          <div className="m-tbl-wrap">
            <table className="m-tbl">
              <thead>
                <tr>
                  <th>Clinic Name</th>
                  <th>Contact Email</th>
                  <th>Phone</th>
                  <th>Status</th>
                  <th>Joined</th>
                </tr>
              </thead>
              <tbody>
                {allClinics.map(c => (
                  <tr key={c._id}>
                    <td style={{ fontWeight: 500 }}>{c.name}</td>
                    <td>{c.email ?? '—'}</td>
                    <td>{c.phone ?? '—'}</td>
                    <td><span className="m-status active">Active</span></td>
                    <td style={{ whiteSpace: 'nowrap' }}>{formatDate(c._creationTime)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      )}

      {/* ── Rejected tab ── */}
      {tab === 'rejected' && (
        rejectedApps === undefined ? (
          <div style={{ color: 'var(--muted)', fontFamily: 'var(--ff)', fontSize: 14, padding: '32px 0' }}>Loading…</div>
        ) : rejectedApps.length === 0 ? (
          <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 14, padding: '40px 24px', textAlign: 'center', color: 'var(--muted)', fontFamily: 'var(--ff)', fontSize: 14 }}>
            No rejected applications.
          </div>
        ) : (
          <div className="m-tbl-wrap">
            <table className="m-tbl">
              <thead>
                <tr>
                  <th>Clinic Name</th>
                  <th>Country</th>
                  <th>Contact Email</th>
                  <th>Submitted</th>
                  <th>Reviewed</th>
                  <th>Notes</th>
                </tr>
              </thead>
              <tbody>
                {rejectedApps.map(app => (
                  <tr key={app._id} style={{ cursor: 'pointer' }} onClick={() => setSelectedApp(app)}>
                    <td style={{ fontWeight: 500 }}>{app.facilityName}</td>
                    <td>{app.facilityCountry}</td>
                    <td>{app.contactEmail}</td>
                    <td style={{ whiteSpace: 'nowrap' }}>{formatDate(app.submittedAt)}</td>
                    <td style={{ whiteSpace: 'nowrap' }}>{app.reviewedAt ? formatDate(app.reviewedAt) : '—'}</td>
                    <td style={{ color: 'var(--muted)', fontSize: 13 }}>{app.reviewNotes ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      )}

      {/* ── Application detail / review modal ── */}
      {selectedApp && (
        <ApplicationModal
          app={selectedApp}
          onClose={() => { setSelectedApp(null); setReviewError('') }}
          onApprove={handleApprove}
          onReject={handleReject}
          reviewing={reviewing}
          reviewError={reviewError}
        />
      )}
    </div>
  )
}
