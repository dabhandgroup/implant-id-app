'use client'

import { useState } from 'react'
import { useQuery, useMutation } from 'convex/react'
import { api } from '../../../../convex/_generated/api'

const JOB_LABELS: Record<string, string> = {
  admin:        'Admin',
  surgeon:      'Surgeon',
  radiographer: 'Radiographer',
}

const STATUS_COLOUR: Record<string, string> = {
  active:    'var(--ok)',
  pending:   '#f59e0b',
  suspended: 'var(--err)',
}

export default function StaffClient() {
  // ── All hooks unconditionally at top ────────────────────────────────────────
  const staff       = useQuery(api.clinics.listClinicStaff)
  const inviteStaff = useMutation(api.clinics.inviteClinicStaff)

  const [modalOpen,   setModalOpen]   = useState(false)
  const [inviteName,  setInviteName]  = useState('')
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRole,  setInviteRole]  = useState<'radiographer' | 'surgeon' | 'admin'>('radiographer')
  const [submitting,  setSubmitting]  = useState(false)
  const [error,       setError]       = useState('')
  const [success,     setSuccess]     = useState('')

  // ── Handlers ────────────────────────────────────────────────────────────────
  function openModal() {
    setInviteName('')
    setInviteEmail('')
    setInviteRole('radiographer')
    setError('')
    setSuccess('')
    setModalOpen(true)
  }

  function closeModal() {
    if (submitting) return
    setModalOpen(false)
  }

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault()
    if (!inviteName.trim()) { setError('Enter the staff member\'s name'); return }
    if (!inviteEmail.trim()) { setError('Enter their email address'); return }
    setSubmitting(true); setError('')
    try {
      await inviteStaff({
        contactName:  inviteName.trim(),
        contactEmail: inviteEmail.trim().toLowerCase(),
        jobType:      inviteRole,
      })
      setSuccess(`${inviteName} has been invited as ${JOB_LABELS[inviteRole]}. They'll receive a sign-in link by email.`)
      setModalOpen(false)
    } catch (e) {
      setError((e as { message?: string })?.message ?? 'Something went wrong')
    } finally {
      setSubmitting(false)
    }
  }

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div className="m-content">
      <div className="m-h">
        <div>
          <h2>Staff</h2>
          <div className="sub">Manage your clinic team and invite new members.</div>
        </div>
        <button className="btn btn-s" onClick={openModal}>+ Invite team member</button>
      </div>

      {success && (
        <div style={{
          background: 'color-mix(in srgb,var(--ok) 10%,transparent)',
          border: '1px solid color-mix(in srgb,var(--ok) 30%,transparent)',
          borderRadius: 10, padding: '12px 16px', marginBottom: 16,
          fontFamily: 'var(--ff)', fontSize: 13.5, color: 'var(--ok)',
        }}>
          {success}
        </div>
      )}

      {/* ── Staff table ── */}
      {staff === undefined ? (
        <div style={{ color: 'var(--muted)', fontFamily: 'var(--ff)', fontSize: 14, padding: '32px 0' }}>Loading…</div>
      ) : staff.length === 0 ? (
        <div style={{
          background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 14,
          padding: '48px 24px', textAlign: 'center',
        }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)', marginBottom: 6 }}>No staff yet</div>
          <p style={{ fontSize: 13, color: 'var(--muted)', margin: 0 }}>
            Invite your first team member using the button above.
          </p>
        </div>
      ) : (
        <div className="m-tbl-wrap">
          <table className="m-tbl">
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Role</th>
                <th>Access level</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {staff.map(s => (
                <tr key={s._id}>
                  <td style={{ fontWeight: 500 }}>{s.userName || '—'}</td>
                  <td style={{ color: 'var(--muted)' }}>{s.userEmail || '—'}</td>
                  <td>
                    <span style={{
                      fontFamily: 'var(--ff)', fontSize: 12, fontWeight: 600,
                      background: s.jobType === 'surgeon'
                        ? 'color-mix(in srgb,var(--accent) 12%,transparent)'
                        : 'var(--bg)',
                      color: s.jobType === 'surgeon' ? 'var(--accent)' : 'var(--text)',
                      border: '1px solid var(--border)', borderRadius: 6,
                      padding: '3px 8px',
                    }}>
                      {JOB_LABELS[s.jobType] ?? s.jobType}
                    </span>
                  </td>
                  <td style={{ textTransform: 'capitalize', color: 'var(--muted)' }}>{s.accessLevel}</td>
                  <td>
                    <span style={{
                      fontFamily: 'var(--ff)', fontSize: 12, fontWeight: 600,
                      color: STATUS_COLOUR[s.status] ?? 'var(--muted)',
                      background: `color-mix(in srgb,${STATUS_COLOUR[s.status] ?? 'transparent'} 10%,transparent)`,
                      border: `1px solid color-mix(in srgb,${STATUS_COLOUR[s.status] ?? 'transparent'} 25%,transparent)`,
                      borderRadius: 6, padding: '3px 8px', textTransform: 'capitalize',
                    }}>
                      {s.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ── Invite modal ── */}
      {modalOpen && (
        <div className="logout-back open" onClick={closeModal}>
          <div className="logout-modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 440 }}>
            <div className="logout-body">
              <h3>Invite team member</h3>
              <p style={{ color: 'var(--muted)', fontSize: 13.5, marginBottom: 20 }}>
                They'll receive an email with a sign-in link to access the portal.
              </p>
              <form id="invite-form" onSubmit={handleInvite}>
                <div className="field" style={{ marginBottom: 12 }}>
                  <label>Full name <span style={{ color: 'var(--err)', marginLeft: 3 }}>*</span></label>
                  <input
                    className="input"
                    type="text"
                    placeholder="e.g. Dr Sarah Jones"
                    value={inviteName}
                    onChange={e => setInviteName(e.target.value)}
                    autoFocus
                  />
                </div>
                <div className="field" style={{ marginBottom: 12 }}>
                  <label>Email address <span style={{ color: 'var(--err)', marginLeft: 3 }}>*</span></label>
                  <input
                    className="input"
                    type="email"
                    placeholder="e.g. sarah@clinic.com"
                    value={inviteEmail}
                    onChange={e => setInviteEmail(e.target.value)}
                  />
                </div>
                <div className="field" style={{ marginBottom: 4 }}>
                  <label>Role</label>
                  <div style={{ display: 'flex', gap: 8 }}>
                    {(['radiographer', 'surgeon', 'admin'] as const).map(role => (
                      <button
                        key={role}
                        type="button"
                        className={inviteRole === role ? 'btn btn-s' : 'btn'}
                        style={{ flex: 1, fontSize: 13 }}
                        onClick={() => setInviteRole(role)}
                      >
                        {JOB_LABELS[role]}
                      </button>
                    ))}
                  </div>
                </div>
                {inviteRole === 'surgeon' && (
                  <p style={{ fontFamily: 'var(--ff)', fontSize: 12, color: '#f59e0b', marginTop: 8 }}>
                    Surgeons get access to the Surgeon Portal with their own dedicated dashboard.
                  </p>
                )}
              </form>
              {error && (
                <div style={{ color: 'var(--err)', fontFamily: 'var(--ff)', fontSize: 13, marginTop: 10 }}>
                  {error}
                </div>
              )}
            </div>
            <div className="logout-actions">
              <button className="btn" onClick={closeModal} disabled={submitting}>Cancel</button>
              <button
                className="btn btn-s"
                form="invite-form"
                type="submit"
                disabled={submitting}
              >
                {submitting ? 'Sending invite…' : 'Send invite'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
