'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useQuery, useMutation } from 'convex/react'
import { api as apiBase } from '../../../../convex/_generated/api'
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const api = apiBase as any

type Tab = 'pending' | 'all' | 'rejected'

interface ConfirmModal { type: 'approve' | 'reject'; id: string; name: string }

interface Manufacturer {
  _id: string
  _creationTime: number
  companyName: string
  contactEmail: string
  contactName: string
  country: string
  regNumber: string
  website: string
  logoUrl?: string
  status: 'pending' | 'approved' | 'rejected'
  submittedAt: number
  reviewedAt?: number
  reviewNotes?: string
  clerkUserId?: string
}

function formatDate(ms: number): string {
  return new Date(ms).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
}

export default function ManufacturersClient() {
  const router = useRouter()

  // Convex queries
  const pendingApps = useQuery(api.manufacturers.listApplications, { status: 'pending' })
  const rejectedApps = useQuery(api.manufacturers.listApplications, { status: 'rejected' })
  const allMfrs = useQuery(api.manufacturers.listApprovedManufacturers)
  const review = useMutation(api.manufacturers.reviewApplication)
  const invite = useMutation(api.manufacturers.inviteManufacturer)

  // Local state
  const [tab,          setTab]          = useState<Tab>('pending')
  const [confirmModal, setConfirmModal] = useState<ConfirmModal | null>(null)
  const [confirming,   setConfirming]   = useState(false)
  const [confirmed,    setConfirmed]    = useState(false)
  const [rejectReason, setRejectReason] = useState('')
  const [error,        setError]        = useState('')
  const [showInvite,   setShowInvite]   = useState(false)
  const [inviting,     setInviting]     = useState(false)
  const [inviteError,  setInviteError]  = useState('')
  const [inviteForm, setInviteForm] = useState({
    companyName: '',
    contactName: '',
    contactEmail: '',
    country: '',
    regNumber: '',
    website: '',
  })

  function openConfirm(type: 'approve' | 'reject', id: string, name: string) {
    setConfirmModal({ type, id, name })
    setConfirming(false)
    setConfirmed(false)
    setRejectReason('')
    setError('')
  }

  function closeConfirm() {
    setConfirmModal(null)
    setConfirming(false)
    setConfirmed(false)
    setRejectReason('')
    setError('')
  }

  function closeInvite() {
    setShowInvite(false)
    setInviting(false)
    setInviteError('')
    setInviteForm({
      companyName: '',
      contactName: '',
      contactEmail: '',
      country: '',
      regNumber: '',
      website: '',
    })
  }

  async function handleInvite() {
    setInviteError('')
    setInviting(true)
    try {
      await invite({
        companyName: inviteForm.companyName,
        contactName: inviteForm.contactName,
        contactEmail: inviteForm.contactEmail,
        country: inviteForm.country,
        regNumber: inviteForm.regNumber || undefined,
        website: inviteForm.website || undefined,
      })
      closeInvite()
    } catch (err: unknown) {
      setInviteError(err instanceof Error ? err.message : 'An error occurred')
      setInviting(false)
    }
  }

  async function handleConfirm() {
    if (!confirmModal) return
    setError('')
    setConfirming(true)
    try {
      await review({
        applicationId: confirmModal.id,
        decision: confirmModal.type === 'approve' ? 'approved' : 'rejected',
        notes: confirmModal.type === 'reject' ? rejectReason : undefined,
      })
      setConfirmed(true)
      await new Promise(r => setTimeout(r, 900))
      closeConfirm()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'An error occurred')
      setConfirming(false)
    }
  }

  return (
    <div className="m-content">
      <div className="m-h">
        <div>
          <h2>Manufacturers</h2>
          <div className="sub">Device manufacturers with access to the Implant ID platform catalogue.</div>
        </div>
        <button className="btn btn-s" onClick={() => setShowInvite(true)}>+ Invite Manufacturer</button>
      </div>

      {/* Tabs */}
      <div className="m-tabs">
        <button className={`m-tab${tab === 'pending' ? ' active' : ''}`} onClick={() => setTab('pending')}>
          Pending
          {(pendingApps?.length ?? 0) > 0 && (
            <span style={{ marginLeft: 7, background: 'color-mix(in srgb,var(--warn) 14%,transparent)', color: 'var(--warn)', borderRadius: 10, padding: '1px 7px', fontSize: 11, fontWeight: 600 }}>
              {pendingApps!.length}
            </span>
          )}
        </button>
        <button className={`m-tab${tab === 'all' ? ' active' : ''}`} onClick={() => setTab('all')}>
          All Manufacturers
        </button>
        <button className={`m-tab${tab === 'rejected' ? ' active' : ''}`} onClick={() => setTab('rejected')}>
          Rejected
        </button>
      </div>

      {/* ── Pending tab ── */}
      {tab === 'pending' && (
        pendingApps === undefined
          ? <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 14, padding: '40px 20px', textAlign: 'center', color: 'var(--muted)' }}>Loading…</div>
          : pendingApps.length === 0
          ? <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 14, padding: '40px 20px', textAlign: 'center', color: 'var(--muted)' }}>No pending manufacturer applications.</div>
          : (
            <div className="m-tbl-wrap">
              <table className="m-tbl">
                <thead>
                  <tr>
                    <th>Company</th>
                    <th>Contact</th>
                    <th>Country</th>
                    <th>Applied</th>
                    <th>Reg. Number</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {pendingApps.map((m: Manufacturer) => (
                    <tr key={m._id} onClick={() => router.push(`/master/manufacturers/${m._id}`)} style={{ cursor: 'pointer' }}>
                      <td style={{ fontWeight: 500 }}>{m.companyName}</td>
                      <td style={{ color: 'var(--muted)' }}>{m.contactEmail}</td>
                      <td>{m.country}</td>
                      <td style={{ color: 'var(--muted)' }}>{formatDate(m.submittedAt)}</td>
                      <td style={{ fontFamily: 'var(--ff)', fontSize: 12, color: 'var(--muted)' }}>{m.regNumber || '—'}</td>
                      <td style={{ display: 'flex', gap: 6 }} onClick={e => e.stopPropagation()}>
                        <a href={`/master/manufacturers/${m._id}`} className="m-act">Review Application</a>
                        <button className="m-act danger" onClick={() => openConfirm('reject', m._id, m.companyName)}>Reject</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
      )}

      {/* ── All tab ── */}
      {tab === 'all' && (
        allMfrs === undefined || pendingApps === undefined
          ? <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 14, padding: '40px 20px', textAlign: 'center', color: 'var(--muted)' }}>Loading…</div>
          : (
            <div className="m-tbl-wrap">
              <table className="m-tbl">
                <thead>
                  <tr>
                    <th>Company</th>
                    <th>Contact</th>
                    <th>Country</th>
                    <th>Status</th>
                    <th>Devices</th>
                    <th>Joined</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {/* Approved manufacturers */}
                  {allMfrs.map((m: Manufacturer) => (
                    <tr key={m._id} onClick={() => router.push(`/master/manufacturers/${m._id}`)} style={{ cursor: 'pointer' }}>
                      <td style={{ fontWeight: 500 }}>{m.companyName}</td>
                      <td style={{ color: 'var(--muted)' }}>{m.contactEmail}</td>
                      <td>{m.country}</td>
                      <td>
                        <span className="m-status active">Active</span>
                      </td>
                      <td>
                        <span style={{ color: 'var(--muted2)' }}>—</span>
                      </td>
                      <td style={{ color: 'var(--muted)' }}>{formatDate(m.submittedAt)}</td>
                      <td style={{ display: 'flex', gap: 6 }} onClick={e => e.stopPropagation()}>
                        <a href={`/master/manufacturers/${m._id}`} className="m-act">View</a>
                        <button className="m-act danger">Suspend</button>
                      </td>
                    </tr>
                  ))}
                  {/* Pending applications */}
                  {pendingApps.map((m: Manufacturer) => (
                    <tr key={m._id} onClick={() => router.push(`/master/manufacturers/${m._id}`)} style={{ cursor: 'pointer' }}>
                      <td style={{ fontWeight: 500 }}>{m.companyName}</td>
                      <td style={{ color: 'var(--muted)' }}>{m.contactEmail}</td>
                      <td>{m.country}</td>
                      <td>
                        <span className="m-status pending">Pending</span>
                      </td>
                      <td>
                        <span style={{ color: 'var(--muted2)' }}>—</span>
                      </td>
                      <td style={{ color: 'var(--muted)' }}>{formatDate(m.submittedAt)}</td>
                      <td style={{ display: 'flex', gap: 6 }} onClick={e => e.stopPropagation()}>
                        <a href={`/master/manufacturers/${m._id}`} className="m-act">View</a>
                        <button className="m-act approve" onClick={() => openConfirm('approve', m._id, m.companyName)}>Approve</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
      )}

      {/* ── Rejected tab ── */}
      {tab === 'rejected' && (
        rejectedApps === undefined
          ? <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 14, padding: '40px 20px', textAlign: 'center', color: 'var(--muted)' }}>Loading…</div>
          : rejectedApps.length === 0
          ? <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 14, padding: '40px 20px', textAlign: 'center', color: 'var(--muted)' }}>No rejected manufacturer applications.</div>
          : (
            <div className="m-tbl-wrap">
              <table className="m-tbl">
                <thead>
                  <tr>
                    <th>Company</th>
                    <th>Contact</th>
                    <th>Country</th>
                    <th>Applied</th>
                    <th>Rejection Reason</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {rejectedApps.map((m: Manufacturer) => (
                    <tr key={m._id} onClick={() => router.push(`/master/manufacturers/${m._id}`)} style={{ cursor: 'pointer' }}>
                      <td style={{ fontWeight: 500 }}>{m.companyName}</td>
                      <td style={{ color: 'var(--muted)' }}>{m.contactEmail}</td>
                      <td>{m.country}</td>
                      <td style={{ color: 'var(--muted)' }}>{formatDate(m.submittedAt)}</td>
                      <td style={{ color: 'var(--muted)', fontStyle: 'italic' }}>{m.reviewNotes || 'No reason provided'}</td>
                      <td onClick={e => e.stopPropagation()}>
                        <button className="m-act" onClick={() => openConfirm('approve', m._id, m.companyName)}>Reconsider</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
      )}

      {/* ── Approve modal ── */}
      {confirmModal?.type === 'approve' && (
        <div className="logout-back open" onClick={closeConfirm}>
          <div className="logout-modal" onClick={e => e.stopPropagation()}>
            <div className="logout-body">
              <div style={{ width: 44, height: 44, borderRadius: '50%', background: 'color-mix(in srgb,var(--ok) 12%,transparent)', display: 'grid', placeItems: 'center', margin: '0 auto 14px' }}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--ok)" strokeWidth="2">
                  <path d="M20 6L9 17l-5-5"/>
                </svg>
              </div>
              <h3>Approve manufacturer?</h3>
              <p><strong>{confirmModal.name}</strong></p>
              <p>This will activate their account and allow them to upload devices to the catalogue.</p>
              {error && (
                <div style={{ marginTop: 14, background: 'color-mix(in srgb,var(--err) 8%,transparent)', border: '1px solid color-mix(in srgb,var(--err) 20%,transparent)', borderRadius: 8, padding: '10px 12px', fontSize: 13, color: 'var(--err)' }}>
                  {error}
                </div>
              )}
            </div>
            <div className="logout-actions">
              <button className="btn" onClick={closeConfirm} disabled={confirming}>Cancel</button>
              <button className="btn btn-s" onClick={handleConfirm} disabled={confirming}>
                {confirmed ? 'Approved!' : confirming ? 'Approving…' : 'Approve'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Reject modal ── */}
      {confirmModal?.type === 'reject' && (
        <div className="logout-back open" onClick={closeConfirm}>
          <div className="logout-modal" onClick={e => e.stopPropagation()}>
            <div className="logout-body">
              <div style={{ width: 44, height: 44, borderRadius: '50%', background: 'color-mix(in srgb,var(--err) 12%,transparent)', display: 'grid', placeItems: 'center', margin: '0 auto 14px' }}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--err)" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </div>
              <h3>Reject manufacturer?</h3>
              <p style={{ marginBottom: 14 }}><strong>{confirmModal.name}</strong></p>
              <p style={{ marginBottom: 14, color: 'var(--muted)', fontSize: 13 }}>Provide a reason — this will be sent to the applicant.</p>
              <textarea
                className="input"
                style={{ resize: 'vertical', minHeight: 80 }}
                placeholder="e.g. Unable to verify regulatory certification…"
                value={rejectReason}
                onChange={e => setRejectReason(e.target.value)}
              />
              {error && (
                <div style={{ marginTop: 14, background: 'color-mix(in srgb,var(--err) 8%,transparent)', border: '1px solid color-mix(in srgb,var(--err) 20%,transparent)', borderRadius: 8, padding: '10px 12px', fontSize: 13, color: 'var(--err)' }}>
                  {error}
                </div>
              )}
            </div>
            <div className="logout-actions">
              <button className="btn" onClick={closeConfirm} disabled={confirming}>Cancel</button>
              <button className="btn btn-danger" onClick={handleConfirm} disabled={confirming || !rejectReason.trim()}>
                {confirmed ? 'Rejected' : confirming ? 'Rejecting…' : 'Reject'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Invite modal ── */}
      {showInvite && (
        <div className="logout-back open" onClick={closeInvite}>
          <div className="logout-modal" onClick={e => e.stopPropagation()} style={{ width: 500 }}>
            <div className="logout-body">
              <h3 style={{ marginBottom: 20 }}>Invite Manufacturer</h3>

              <div className="field">
                <label>Company Name</label>
                <input
                  className="input"
                  type="text"
                  value={inviteForm.companyName}
                  onChange={e => setInviteForm({ ...inviteForm, companyName: e.target.value })}
                  placeholder="e.g. Acme Medical Devices"
                />
              </div>

              <div className="field">
                <label>Contact Name</label>
                <input
                  className="input"
                  type="text"
                  value={inviteForm.contactName}
                  onChange={e => setInviteForm({ ...inviteForm, contactName: e.target.value })}
                  placeholder="e.g. John Smith"
                />
              </div>

              <div className="field">
                <label>Contact Email</label>
                <input
                  className="input"
                  type="email"
                  value={inviteForm.contactEmail}
                  onChange={e => setInviteForm({ ...inviteForm, contactEmail: e.target.value })}
                  placeholder="john@acme.com"
                />
              </div>

              <div className="field">
                <label>Country</label>
                <input
                  className="input"
                  type="text"
                  value={inviteForm.country}
                  onChange={e => setInviteForm({ ...inviteForm, country: e.target.value })}
                  placeholder="e.g. USA"
                />
              </div>

              <div className="field">
                <label>Reg. Number (optional)</label>
                <input
                  className="input"
                  type="text"
                  value={inviteForm.regNumber}
                  onChange={e => setInviteForm({ ...inviteForm, regNumber: e.target.value })}
                  placeholder="e.g. FDA1234567"
                />
              </div>

              <div className="field">
                <label>Website (optional)</label>
                <input
                  className="input"
                  type="text"
                  value={inviteForm.website}
                  onChange={e => setInviteForm({ ...inviteForm, website: e.target.value })}
                  placeholder="https://acme.com"
                />
              </div>

              {inviteError && (
                <div style={{ marginBottom: 14, background: 'color-mix(in srgb,var(--err) 8%,transparent)', border: '1px solid color-mix(in srgb,var(--err) 20%,transparent)', borderRadius: 8, padding: '10px 12px', fontSize: 13, color: 'var(--err)' }}>
                  {inviteError}
                </div>
              )}
            </div>
            <div className="logout-actions">
              <button className="btn" onClick={closeInvite} disabled={inviting}>Cancel</button>
              <button
                className="btn btn-s"
                onClick={handleInvite}
                disabled={inviting || !inviteForm.companyName.trim() || !inviteForm.contactName.trim() || !inviteForm.contactEmail.trim() || !inviteForm.country.trim()}
              >
                {inviting ? 'Inviting…' : 'Send Invite'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
