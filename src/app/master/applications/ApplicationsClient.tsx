'use client'

import { useState }     from 'react'
import { useQuery, useMutation } from 'convex/react'
import { api }          from '../../../../convex/_generated/api'
import type { Id }      from '../../../../convex/_generated/dataModel'

type AppStatus = 'pending' | 'approved' | 'rejected'
type TabValue  = 'pending' | 'approved' | 'rejected' | 'all'

type Application = {
  _id:              Id<'clinicApplications'>
  _creationTime:    number
  contactName:      string
  contactEmail:     string
  contactPhone?:    string
  jobTitle?:        string
  facilityName:     string
  facilityType:     string
  facilityAddress:  string
  facilityCity?:    string
  facilityCountry:  string
  facilityWebsite?: string
  facilityPhone?:   string
  regulatoryBody?:  string
  registrationNum?: string
  services:         string[]
  additionalInfo?:  string
  status:           AppStatus
  submittedAt:      number
  reviewedAt?:      number
  reviewNotes?:     string
  clerkUserId?:     string
}

function formatDate(ts: number) {
  return new Date(ts).toLocaleDateString('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric',
  })
}

export default function ApplicationsClient() {
  const [activeTab,        setActiveTab]        = useState<TabValue>('pending')
  const [selectedApp,      setSelectedApp]      = useState<Application | null>(null)
  const [pendingDecision,  setPendingDecision]  = useState<'approved' | 'rejected' | null>(null)
  const [reviewNotes,      setReviewNotes]      = useState('')
  const [reviewing,        setReviewing]        = useState(false)
  const [reviewError,      setReviewError]      = useState('')

  const applications    = useQuery(api.clinics.listApplications, {
    status: activeTab === 'all' ? undefined : activeTab,
  }) as Application[] | undefined

  const reviewApplication = useMutation(api.clinics.reviewApplication)

  async function handleReview(
    id: Id<'clinicApplications'>,
    decision: 'approved' | 'rejected',
    notes?: string,
  ) {
    setReviewing(true)
    setReviewError('')
    try {
      await reviewApplication({ applicationId: id, decision, notes })
      setSelectedApp(null)
      setPendingDecision(null)
      setReviewNotes('')
    } catch (e) {
      setReviewError((e as { message?: string })?.message ?? 'Something went wrong')
    } finally {
      setReviewing(false)
    }
  }

  function closeModal() {
    setSelectedApp(null)
    setPendingDecision(null)
    setReviewNotes('')
    setReviewError('')
  }

  const tabs: { label: string; value: TabValue }[] = [
    { label: 'Pending',  value: 'pending'  },
    { label: 'Approved', value: 'approved' },
    { label: 'Rejected', value: 'rejected' },
    { label: 'All',      value: 'all'      },
  ]

  return (
    <div className="m-content">
      {/* Header */}
      <div className="m-h">
        <div>
          <h2>Clinic Applications</h2>
          <div className="sub">Review and approve clinic onboarding applications.</div>
        </div>
      </div>

      {/* Tabs */}
      <div className="m-tabs">
        {tabs.map((t) => (
          <button
            key={t.value}
            className={`m-tab${activeTab === t.value ? ' active' : ''}`}
            onClick={() => setActiveTab(t.value)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Table */}
      {applications === undefined ? (
        <div style={{ color: 'var(--muted)', fontFamily: 'var(--ff)', fontSize: 14, padding: '32px 0' }}>
          Loading…
        </div>
      ) : applications.length === 0 ? (
        <div style={{
          background: 'var(--bg2)', border: '1px solid var(--border)',
          borderRadius: 14, padding: '40px 24px', textAlign: 'center',
          color: 'var(--muted)', fontFamily: 'var(--ff)', fontSize: 14,
        }}>
          No applications
        </div>
      ) : (
        <div className="m-tbl-wrap">
          <table className="m-tbl">
            <thead>
              <tr>
                <th>Clinic Name</th>
                <th>Contact</th>
                <th>Country</th>
                <th>Facility Type</th>
                <th>Services</th>
                <th>Submitted</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {applications.map((app) => (
                <tr key={app._id}>
                  <td style={{ fontWeight: 500 }}>{app.facilityName}</td>
                  <td>
                    <div style={{ fontFamily: 'var(--ff)', fontSize: 13 }}>{app.contactName}</div>
                    <div style={{ color: 'var(--muted)', fontSize: 12 }}>{app.contactEmail}</div>
                  </td>
                  <td>{app.facilityCountry}</td>
                  <td>{app.facilityType}</td>
                  <td style={{ maxWidth: 180 }}>
                    {app.services.slice(0, 2).join(', ')}
                    {app.services.length > 2 && (
                      <span style={{ color: 'var(--muted)', fontSize: 12 }}>
                        {' '}+{app.services.length - 2} more
                      </span>
                    )}
                  </td>
                  <td style={{ whiteSpace: 'nowrap' }}>{formatDate(app.submittedAt)}</td>
                  <td>
                    <span className={`m-status ${app.status === 'approved' ? 'active' : app.status}`}>
                      {app.status.charAt(0).toUpperCase() + app.status.slice(1)}
                    </span>
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button
                        className="m-act"
                        onClick={() => { setSelectedApp(app); setPendingDecision(null) }}
                      >
                        View
                      </button>
                      {app.status === 'pending' && (
                        <>
                          <button
                            className="m-act approve"
                            onClick={() => handleReview(app._id, 'approved')}
                            disabled={reviewing}
                          >
                            Approve
                          </button>
                          <button
                            className="m-act reject"
                            onClick={() => { setSelectedApp(app); setPendingDecision('rejected') }}
                          >
                            Reject
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal */}
      {selectedApp && (
        <div
          className="logout-back open"
          onClick={(e) => { if (e.target === e.currentTarget) closeModal() }}
          style={{ zIndex: 100 }}
        >
          <div
            className="logout-modal"
            style={{ maxWidth: 560, width: '90%', textAlign: 'left', padding: '28px 32px' }}
          >
            {/* Modal header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
              <div>
                <div style={{ fontFamily: 'var(--ff)', fontSize: 18, fontWeight: 600, color: 'var(--text)', marginBottom: 4 }}>
                  {selectedApp.facilityName}
                </div>
                <span className={`m-status ${selectedApp.status === 'approved' ? 'active' : selectedApp.status}`}>
                  {selectedApp.status.charAt(0).toUpperCase() + selectedApp.status.slice(1)}
                </span>
              </div>
              <button className="m-act" onClick={closeModal} style={{ flexShrink: 0 }}>Close</button>
            </div>

            {/* Details grid */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 20 }}>
              <DetailRow label="Facility Type"      value={selectedApp.facilityType} />
              <DetailRow label="Country"            value={selectedApp.facilityCountry} />
              <DetailRow label="Address"            value={selectedApp.facilityAddress} fullWidth />
              {selectedApp.facilityCity && <DetailRow label="City"           value={selectedApp.facilityCity} />}
              {selectedApp.facilityPhone && <DetailRow label="Facility Phone" value={selectedApp.facilityPhone} />}
              {selectedApp.facilityWebsite && <DetailRow label="Website"      value={selectedApp.facilityWebsite} />}
              <DetailRow label="Contact Name"       value={selectedApp.contactName} />
              <DetailRow label="Contact Email"      value={selectedApp.contactEmail} />
              {selectedApp.contactPhone && <DetailRow label="Contact Phone" value={selectedApp.contactPhone} />}
              {selectedApp.jobTitle && <DetailRow label="Job Title"         value={selectedApp.jobTitle} />}
              {selectedApp.regulatoryBody && <DetailRow label="Regulatory Body" value={selectedApp.regulatoryBody} />}
              {selectedApp.registrationNum && <DetailRow label="Reg. Number"    value={selectedApp.registrationNum} />}
              <DetailRow
                label="Services"
                value={selectedApp.services.join(', ')}
                fullWidth
              />
              {selectedApp.additionalInfo && (
                <DetailRow label="Additional Info"  value={selectedApp.additionalInfo} fullWidth />
              )}
              <DetailRow label="Submitted"          value={formatDate(selectedApp.submittedAt)} />
              {selectedApp.reviewedAt && (
                <DetailRow label="Reviewed"         value={formatDate(selectedApp.reviewedAt)} />
              )}
              {selectedApp.reviewNotes && (
                <DetailRow label="Review Notes"     value={selectedApp.reviewNotes} fullWidth />
              )}
            </div>

            {/* Actions for pending applications */}
            {selectedApp.status === 'pending' && (
              <>
                {pendingDecision === 'rejected' ? (
                  <div>
                    <div className="field" style={{ marginBottom: 12 }}>
                      <label style={{ fontFamily: 'var(--ff)', fontSize: 13, fontWeight: 500, color: 'var(--text)', display: 'block', marginBottom: 6 }}>
                        Rejection notes <span style={{ color: 'var(--muted)', fontWeight: 400 }}>(optional)</span>
                      </label>
                      <textarea
                        className="input"
                        rows={3}
                        placeholder="Reason for rejection…"
                        value={reviewNotes}
                        onChange={(e) => setReviewNotes(e.target.value)}
                        style={{ resize: 'vertical' }}
                      />
                    </div>
                    {reviewError && (
                      <div style={{ color: 'var(--err)', fontFamily: 'var(--ff)', fontSize: 13, marginBottom: 10 }}>
                        {reviewError}
                      </div>
                    )}
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button
                        className="btn btn-danger"
                        onClick={() => handleReview(selectedApp._id, 'rejected', reviewNotes || undefined)}
                        disabled={reviewing}
                      >
                        {reviewing ? 'Rejecting…' : 'Confirm Rejection'}
                      </button>
                      <button className="btn" onClick={() => setPendingDecision(null)} disabled={reviewing}>
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    {reviewError && (
                      <div style={{ color: 'var(--err)', fontFamily: 'var(--ff)', fontSize: 13, marginBottom: 10 }}>
                        {reviewError}
                      </div>
                    )}
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button
                        className="btn btn-s"
                        onClick={() => handleReview(selectedApp._id, 'approved')}
                        disabled={reviewing}
                      >
                        {reviewing ? 'Approving…' : 'Approve Application'}
                      </button>
                      <button
                        className="btn btn-danger"
                        onClick={() => setPendingDecision('rejected')}
                        disabled={reviewing}
                      >
                        Reject
                      </button>
                    </div>
                  </>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

function DetailRow({
  label,
  value,
  fullWidth,
}: {
  label: string
  value: string
  fullWidth?: boolean
}) {
  return (
    <div style={{ gridColumn: fullWidth ? '1 / -1' : undefined }}>
      <div style={{
        fontFamily: 'var(--ff)', fontSize: 10.5, fontWeight: 600,
        letterSpacing: '1.2px', textTransform: 'uppercase', color: 'var(--muted2)',
        marginBottom: 4,
      }}>
        {label}
      </div>
      <div style={{ fontFamily: 'var(--fb)', fontSize: 14, color: 'var(--text)' }}>
        {value}
      </div>
    </div>
  )
}
