'use client'

import { useState } from 'react'
import { useQuery, useMutation } from 'convex/react'
import { api } from '../../../../convex/_generated/api'
import type { Id } from '../../../../convex/_generated/dataModel'

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

type ModalTab = 'search' | 'new'

export default function StaffClient() {
  // ── All hooks unconditionally at top ────────────────────────────────────────
  const staff          = useQuery(api.clinics.listClinicStaff)
  const inviteStaff    = useMutation(api.clinics.inviteClinicStaff)
  const addExisting    = useMutation(api.clinics.addExistingStaffToClinic)

  // Modal state
  const [modalOpen,   setModalOpen]   = useState(false)
  const [modalTab,    setModalTab]    = useState<ModalTab>('search')

  // New invite fields
  const [inviteName,  setInviteName]  = useState('')
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRole,  setInviteRole]  = useState<'radiographer' | 'surgeon' | 'admin'>('radiographer')

  // Search existing fields
  const [searchQuery,    setSearchQuery]    = useState('')
  const [selectedUserId, setSelectedUserId] = useState<Id<'users'> | null>(null)
  const [selectedName,   setSelectedName]   = useState('')

  const searchResults = useQuery(
    api.clinics.searchPlatformSurgeons,
    modalOpen && modalTab === 'search' ? { query: searchQuery } : 'skip',
  )

  const [submitting,  setSubmitting]  = useState(false)
  const [error,       setError]       = useState('')
  const [success,     setSuccess]     = useState('')

  // ── Handlers ────────────────────────────────────────────────────────────────
  function openModal() {
    setInviteName(''); setInviteEmail(''); setInviteRole('radiographer')
    setSearchQuery(''); setSelectedUserId(null); setSelectedName('')
    setError(''); setSuccess('')
    setModalTab('search')
    setModalOpen(true)
  }

  function closeModal() {
    if (submitting) return
    setModalOpen(false)
  }

  async function handleInviteNew(e: React.FormEvent) {
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
      setSuccess(`${inviteName} has been added as ${JOB_LABELS[inviteRole]}. They'll receive a sign-in link by email.`)
      setModalOpen(false)
    } catch (e) {
      setError((e as { message?: string })?.message ?? 'Something went wrong')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleAddExisting() {
    if (!selectedUserId) { setError('Select a surgeon from the list'); return }
    setSubmitting(true); setError('')
    try {
      await addExisting({ userId: selectedUserId, jobType: 'surgeon' })
      setSuccess(`${selectedName} has been added to your clinic.`)
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
          <div className="logout-modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 460, width: '95vw' }}>
            <div className="logout-body">
              <h3>Add team member</h3>

              {/* Tabs */}
              <div style={{ display: 'flex', gap: 0, marginBottom: 20, borderBottom: '1px solid var(--border)' }}>
                {(['search', 'new'] as const).map(t => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => { setModalTab(t); setError('') }}
                    style={{
                      background: 'none', border: 'none', cursor: 'pointer',
                      padding: '8px 16px 10px', fontFamily: 'var(--ff)', fontSize: 13.5,
                      fontWeight: modalTab === t ? 600 : 400,
                      color: modalTab === t ? 'var(--accent)' : 'var(--muted)',
                      borderBottom: modalTab === t ? '2px solid var(--accent)' : '2px solid transparent',
                      marginBottom: -1,
                    }}
                  >
                    {t === 'search' ? 'Search existing surgeons' : 'Invite new member'}
                  </button>
                ))}
              </div>

              {/* ── Search tab ── */}
              {modalTab === 'search' && (
                <div>
                  <p style={{ color: 'var(--muted)', fontSize: 13.5, marginBottom: 14 }}>
                    Find a surgeon already on the platform and add them to your clinic instantly.
                  </p>
                  <div className="field" style={{ marginBottom: 12 }}>
                    <label>Search by name or email</label>
                    <input
                      className="input"
                      type="text"
                      placeholder="e.g. Dr Sarah Jones or sarah@hospital.com"
                      value={searchQuery}
                      onChange={e => { setSearchQuery(e.target.value); setSelectedUserId(null) }}
                      autoFocus
                    />
                  </div>

                  {/* Results list */}
                  {searchResults && searchResults.length > 0 && (
                    <div style={{
                      border: '1px solid var(--border)', borderRadius: 10, overflow: 'hidden',
                      marginBottom: 8,
                    }}>
                      {searchResults.map(r => (
                        <button
                          key={r.userId}
                          type="button"
                          onClick={() => { setSelectedUserId(r.userId); setSelectedName(r.name) }}
                          style={{
                            display: 'flex', alignItems: 'center', gap: 12, width: '100%',
                            padding: '11px 14px', border: 'none',
                            borderBottom: '1px solid var(--border)', cursor: 'pointer',
                            textAlign: 'left' as const,
                            background: selectedUserId === r.userId
                              ? 'color-mix(in srgb,var(--accent) 8%,transparent)'
                              : 'var(--bg)',
                          }}
                        >
                          <div style={{
                            width: 34, height: 34, borderRadius: '50%', flexShrink: 0,
                            background: 'color-mix(in srgb,var(--accent) 14%,transparent)',
                            display: 'grid', placeItems: 'center',
                            fontFamily: 'var(--ff)', fontWeight: 700, fontSize: 13,
                            color: 'var(--accent)',
                          }}>
                            {r.name.slice(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <div style={{ fontFamily: 'var(--ff)', fontSize: 13.5, fontWeight: 500, color: 'var(--text)' }}>
                              {r.name}
                            </div>
                            <div style={{ fontSize: 12, color: 'var(--muted)' }}>{r.email}</div>
                          </div>
                          {selectedUserId === r.userId && (
                            <svg style={{ marginLeft: 'auto', flexShrink: 0 }} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2.5">
                              <path d="M20 6L9 17l-5-5"/>
                            </svg>
                          )}
                        </button>
                      ))}
                    </div>
                  )}

                  {searchResults && searchResults.length === 0 && searchQuery.trim() && (
                    <p style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 8 }}>
                      No surgeons found — try inviting them as a new member instead.
                    </p>
                  )}
                </div>
              )}

              {/* ── New invite tab ── */}
              {modalTab === 'new' && (
                <form id="invite-form" onSubmit={handleInviteNew}>
                  <p style={{ color: 'var(--muted)', fontSize: 13.5, marginBottom: 14 }}>
                    They'll receive an email with a sign-in link. Their account is created automatically.
                  </p>
                  <div className="field" style={{ marginBottom: 12 }}>
                    <label>Full name <span style={{ color: 'var(--err)', marginLeft: 3 }}>*</span></label>
                    <input
                      className="input" type="text" placeholder="e.g. Dr Sarah Jones"
                      value={inviteName} onChange={e => setInviteName(e.target.value)} autoFocus
                    />
                  </div>
                  <div className="field" style={{ marginBottom: 12 }}>
                    <label>Email address <span style={{ color: 'var(--err)', marginLeft: 3 }}>*</span></label>
                    <input
                      className="input" type="email" placeholder="e.g. sarah@clinic.com"
                      value={inviteEmail} onChange={e => setInviteEmail(e.target.value)}
                    />
                  </div>
                  <div className="field" style={{ marginBottom: 4 }}>
                    <label>Role</label>
                    <div style={{ display: 'flex', gap: 8 }}>
                      {(['radiographer', 'surgeon', 'admin'] as const).map(role => (
                        <button key={role} type="button"
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
                      Surgeons get their own Surgeon Portal with a dedicated dashboard.
                    </p>
                  )}
                </form>
              )}

              {error && (
                <div style={{ color: 'var(--err)', fontFamily: 'var(--ff)', fontSize: 13, marginTop: 10 }}>
                  {error}
                </div>
              )}
            </div>

            <div className="logout-actions">
              <button className="btn" onClick={closeModal} disabled={submitting}>Cancel</button>
              {modalTab === 'search' ? (
                <button className="btn btn-s" onClick={handleAddExisting} disabled={submitting || !selectedUserId}>
                  {submitting ? 'Adding…' : 'Add to clinic'}
                </button>
              ) : (
                <button className="btn btn-s" form="invite-form" type="submit" disabled={submitting}>
                  {submitting ? 'Sending…' : 'Send invite'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
