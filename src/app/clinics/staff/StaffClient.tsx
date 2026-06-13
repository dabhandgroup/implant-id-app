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

type Screen = 'list' | 'add'
type AddTab = 'search' | 'new'

export default function StaffClient() {
  // ── All hooks at top ────────────────────────────────────────────────────────
  const staff       = useQuery(api.clinics.listClinicStaff)
  const inviteStaff = useMutation(api.clinics.inviteClinicStaff)
  const addExisting = useMutation(api.clinics.addExistingStaffToClinic)

  const [screen,   setScreen]   = useState<Screen>('list')
  const [addTab,   setAddTab]   = useState<AddTab>('search')

  const [inviteName,  setInviteName]  = useState('')
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRole,  setInviteRole]  = useState<'radiographer' | 'surgeon' | 'admin'>('radiographer')

  const [searchQuery,    setSearchQuery]    = useState('')
  const [selectedUserId, setSelectedUserId] = useState<Id<'users'> | null>(null)
  const [selectedName,   setSelectedName]   = useState('')

  const searchResults = useQuery(
    api.clinics.searchPlatformSurgeons,
    screen === 'add' && addTab === 'search' ? { query: searchQuery } : 'skip',
  )

  const [submitting, setSubmitting] = useState(false)
  const [error,      setError]      = useState('')
  const [success,    setSuccess]    = useState('')

  // ── Handlers ────────────────────────────────────────────────────────────────

  function openAdd() {
    setInviteName(''); setInviteEmail(''); setInviteRole('radiographer')
    setSearchQuery(''); setSelectedUserId(null); setSelectedName('')
    setError(''); setSuccess(''); setAddTab('search')
    setScreen('add')
  }

  function backToList() { setScreen('list') }

  async function handleInviteNew(e: React.FormEvent) {
    e.preventDefault()
    if (!inviteName.trim())  { setError('Enter the staff member\'s name'); return }
    if (!inviteEmail.trim()) { setError('Enter their email address'); return }
    setSubmitting(true); setError('')
    try {
      await inviteStaff({ contactName: inviteName.trim(), contactEmail: inviteEmail.trim().toLowerCase(), jobType: inviteRole })
      setSuccess(`${inviteName} has been added as ${JOB_LABELS[inviteRole]}. They'll receive a sign-in link by email.`)
      setScreen('list')
    } catch (err) {
      setError((err as { message?: string })?.message ?? 'Something went wrong')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleAddExisting() {
    if (!selectedUserId) { setError('Select a person from the list'); return }
    setSubmitting(true); setError('')
    try {
      await addExisting({ userId: selectedUserId, jobType: 'surgeon' })
      setSuccess(`${selectedName} has been added to your clinic.`)
      setScreen('list')
    } catch (err) {
      setError((err as { message?: string })?.message ?? 'Something went wrong')
    } finally {
      setSubmitting(false)
    }
  }

  // ── Add member screen ───────────────────────────────────────────────────────

  if (screen === 'add') {
    return (
      <div className="m-content">

        {/* Back nav */}
        <button
          type="button"
          onClick={backToList}
          style={{ display: 'inline-flex', alignItems: 'center', gap: 7, marginBottom: 22, background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'var(--ff)', fontSize: 13.5, color: 'var(--muted)', padding: 0 }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden="true"><path d="M19 12H5M12 5l-7 7 7 7"/></svg>
          Back to staff
        </button>

        <div style={{ marginBottom: 28 }}>
          <h2 style={{ fontSize: 'clamp(18px,2vw,22px)', fontWeight: 600, letterSpacing: '-.02em' }}>Add team member</h2>
          <p style={{ color: 'var(--muted)', fontSize: 13.5, marginTop: 5, lineHeight: 1.5 }}>
            Find someone already on the platform, or invite a new member by email.
          </p>
        </div>

        {/* Pill tab toggle */}
        <div style={{
          display: 'inline-flex', background: 'var(--bg)', border: '1px solid var(--border)',
          borderRadius: 12, padding: 4, gap: 4, marginBottom: 28,
        }} role="tablist">
          {([
            { key: 'search', label: 'Search existing', icon: (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/></svg>
            )},
            { key: 'new', label: 'Invite by email', icon: (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
            )},
          ] as const).map(t => (
            <button
              key={t.key}
              role="tab"
              aria-selected={addTab === t.key}
              type="button"
              onClick={() => { setAddTab(t.key as AddTab); setError('') }}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 7,
                padding: '8px 18px', borderRadius: 9, border: 'none', cursor: 'pointer',
                fontFamily: 'var(--ff)', fontSize: 13.5, fontWeight: 500,
                transition: 'all .15s',
                background: addTab === t.key ? 'var(--accent)' : 'transparent',
                color: addTab === t.key ? '#fff' : 'var(--muted)',
              }}
            >
              {t.icon}
              {t.label}
            </button>
          ))}
        </div>

        <div style={{ maxWidth: 560 }}>

          {/* ── Search tab ── */}
          {addTab === 'search' && (
            <div className="table" style={{ borderRadius: 16 }}>
              <div style={{ padding: '22px 24px 18px' }}>
                <div style={{ fontFamily: 'var(--ff)', fontSize: 15, fontWeight: 500, marginBottom: 4 }}>
                  Find a surgeon on the platform
                </div>
                <div style={{ color: 'var(--muted)', fontSize: 13.5, lineHeight: 1.5, marginBottom: 20 }}>
                  Search by name or email — they&apos;ll be added to your clinic instantly with no invitation needed.
                </div>
                <div className="field" style={{ marginBottom: 0 }}>
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
              </div>

              {/* Search results */}
              {searchResults && searchResults.length > 0 && (
                <div style={{ borderTop: '1px solid var(--border)' }}>
                  {searchResults.map(r => (
                    <button
                      key={r.userId}
                      type="button"
                      onClick={() => { setSelectedUserId(r.userId); setSelectedName(r.name) }}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 14, width: '100%',
                        padding: '13px 24px', border: 'none', borderBottom: '1px solid var(--border)',
                        cursor: 'pointer', textAlign: 'left', transition: 'background .1s',
                        background: selectedUserId === r.userId
                          ? 'color-mix(in srgb,var(--accent) 8%,transparent)'
                          : 'var(--bg2)',
                      }}
                    >
                      <div className="staff-av" style={{
                        background: 'color-mix(in srgb,var(--accent) 14%,transparent)',
                        color: 'var(--accent)',
                      }}>
                        {r.name.slice(0, 2).toUpperCase()}
                      </div>
                      <div style={{ flex: 1 }}>
                        <div className="staff-name">{r.name}</div>
                        <div className="staff-meta">{r.email}</div>
                      </div>
                      {selectedUserId === r.userId ? (
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2.5" aria-hidden="true">
                          <path d="M20 6L9 17l-5-5"/>
                        </svg>
                      ) : (
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--muted2)" strokeWidth="1.8" aria-hidden="true">
                          <path d="M9 18l6-6-6-6"/>
                        </svg>
                      )}
                    </button>
                  ))}
                </div>
              )}

              {searchResults && searchResults.length === 0 && searchQuery.trim() && (
                <div style={{ padding: '20px 24px', borderTop: '1px solid var(--border)', color: 'var(--muted)', fontSize: 13.5 }}>
                  No surgeons found for &ldquo;{searchQuery}&rdquo;.
                </div>
              )}

              {/* Actions */}
              <div style={{ padding: '16px 24px', borderTop: '1px solid var(--border)', display: 'flex', gap: 10, alignItems: 'center' }}>
                {error && <div style={{ flex: 1, color: 'var(--err)', fontFamily: 'var(--ff)', fontSize: 13 }}>{error}</div>}
                {!error && <div style={{ flex: 1 }} />}
                <button className="btn" onClick={backToList} disabled={submitting}>Cancel</button>
                <button
                  className="btn btn-s"
                  onClick={handleAddExisting}
                  disabled={submitting || !selectedUserId}
                >
                  {submitting ? 'Adding…' : 'Add to clinic'}
                </button>
              </div>
            </div>
          )}

          {/* ── New invite tab ── */}
          {addTab === 'new' && (
            <form onSubmit={handleInviteNew}>
              <div className="table" style={{ borderRadius: 16 }}>
                <div style={{ padding: '22px 24px 6px' }}>
                  <div style={{ fontFamily: 'var(--ff)', fontSize: 15, fontWeight: 500, marginBottom: 4 }}>
                    Invite by email
                  </div>
                  <div style={{ color: 'var(--muted)', fontSize: 13.5, lineHeight: 1.5, marginBottom: 22 }}>
                    They&apos;ll receive a sign-in link by email. Their account is created automatically — no password needed.
                  </div>

                  <div className="field" style={{ marginBottom: 14 }}>
                    <label>Full name <span style={{ color: 'var(--err)', marginLeft: 3 }}>*</span></label>
                    <input
                      className="input" type="text" placeholder="e.g. Dr Sarah Jones"
                      value={inviteName} onChange={e => setInviteName(e.target.value)} autoFocus
                    />
                  </div>
                  <div className="field" style={{ marginBottom: 14 }}>
                    <label>Email address <span style={{ color: 'var(--err)', marginLeft: 3 }}>*</span></label>
                    <input
                      className="input" type="email" placeholder="e.g. sarah@clinic.com"
                      value={inviteEmail} onChange={e => setInviteEmail(e.target.value)}
                    />
                  </div>

                  <div className="field" style={{ marginBottom: 10 }}>
                    <label>Role</label>
                    <div style={{ display: 'flex', gap: 8 }}>
                      {(['radiographer', 'surgeon', 'admin'] as const).map(r => (
                        <button
                          key={r} type="button"
                          className={inviteRole === r ? 'btn btn-s' : 'btn'}
                          style={{ flex: 1, fontSize: 13, justifyContent: 'center' }}
                          onClick={() => setInviteRole(r)}
                          aria-pressed={inviteRole === r}
                        >
                          {JOB_LABELS[r]}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div style={{ minHeight: 44, paddingBottom: 6 }}>
                    {inviteRole === 'surgeon' && (
                      <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start', background: 'color-mix(in srgb,#f59e0b 8%,transparent)', border: '1px solid color-mix(in srgb,#f59e0b 22%,transparent)', borderRadius: 10, padding: '10px 14px' }}>
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#b45309" strokeWidth="1.8" style={{ flexShrink: 0, marginTop: 1 }} aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 8v4M12 16h.01"/></svg>
                        <p style={{ fontFamily: 'var(--ff)', fontSize: 12.5, color: '#b45309', lineHeight: 1.5, margin: 0 }}>
                          Surgeons get their own Surgeon Portal with a dedicated dashboard.
                        </p>
                      </div>
                    )}
                    {inviteRole === 'admin' && (
                      <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start', background: 'color-mix(in srgb,var(--accent) 6%,transparent)', border: '1px solid color-mix(in srgb,var(--accent) 18%,transparent)', borderRadius: 10, padding: '10px 14px' }}>
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--accent-deep)" strokeWidth="1.8" style={{ flexShrink: 0, marginTop: 1 }} aria-hidden="true"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
                        <p style={{ fontFamily: 'var(--ff)', fontSize: 12.5, color: 'var(--accent-deep)', lineHeight: 1.5, margin: 0 }}>
                          Admins have full access to billing, settings, and team management.
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div style={{ padding: '16px 24px', borderTop: '1px solid var(--border)', display: 'flex', gap: 10, alignItems: 'center' }}>
                  {error && <div style={{ flex: 1, color: 'var(--err)', fontFamily: 'var(--ff)', fontSize: 13 }}>{error}</div>}
                  {!error && <div style={{ flex: 1 }} />}
                  <button className="btn" type="button" onClick={backToList} disabled={submitting}>Cancel</button>
                  <button className="btn btn-s" type="submit" disabled={submitting}>
                    {submitting ? 'Sending…' : 'Send invite'}
                  </button>
                </div>
              </div>
            </form>
          )}

        </div>
      </div>
    )
  }

  // ── Staff list screen ───────────────────────────────────────────────────────

  const active  = (staff ?? []).filter(s => s.status === 'active')
  const pending = (staff ?? []).filter(s => s.status !== 'active')

  return (
    <div className="m-content">
      <div className="m-h">
        <div>
          <div className="ey">Team management</div>
          <h2 style={{ fontSize: 'clamp(20px,2vw,26px)', letterSpacing: '-.025em', marginTop: 6 }}>Your clinic</h2>
          <p style={{ color: 'var(--muted)', fontSize: 13.5, marginTop: 6, maxWidth: 520, lineHeight: 1.5 }}>
            Manage who at your clinic can access Implant ID. <b>Clinicians</b> can look up implants and view granted records.{' '}
            <b>Specialists</b> can additionally authorise risk–benefit decisions. <b>Admins</b> manage billing and clinic settings.
          </p>
        </div>
        <button className="btn btn-s" onClick={openAdd}>+ Invite team member</button>
      </div>

      {success && (
        <div style={{
          background: 'color-mix(in srgb,var(--ok) 10%,transparent)',
          border: '1px solid color-mix(in srgb,var(--ok) 30%,transparent)',
          borderRadius: 10, padding: '12px 16px', marginBottom: 20,
          fontFamily: 'var(--ff)', fontSize: 13.5, color: 'var(--ok)',
        }}>
          {success}
        </div>
      )}

      {/* Role legend */}
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 24 }}>
        {[
          { cls: 'clinician',  label: 'Clinician',  desc: 'Lookups & granted patient records' },
          { cls: 'specialist', label: 'Specialist',  desc: '+ Risk–benefit authorisation' },
          { cls: 'admin',      label: 'Admin',       desc: '+ Billing & clinic settings' },
        ].map(b => (
          <div key={b.cls} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--muted)', background: 'var(--bg)', border: '1px solid var(--border)', padding: '7px 14px', borderRadius: 999 }}>
            <div className={`staff-role-badge ${b.cls}`} style={{ margin: 0 }}>{b.label}</div>
            <span>{b.desc}</span>
          </div>
        ))}
      </div>

      {/* Active members */}
      {staff === undefined ? (
        <div style={{ color: 'var(--muted)', fontFamily: 'var(--ff)', fontSize: 14, padding: '32px 0' }}>Loading…</div>
      ) : (
        <>
          <div className="table" style={{ marginBottom: 22 }}>
            <div className="table-h">
              <h3>Active members <span style={{ fontSize: 13, fontWeight: 400, color: 'var(--muted)', marginLeft: 6 }}>{active.length}</span></h3>
            </div>

            {active.length === 0 ? (
              <div style={{ padding: '32px 22px', textAlign: 'center', color: 'var(--muted)', fontSize: 14 }}>
                No active members yet.
              </div>
            ) : (
              <>
                <div className="staff-head">
                  <div />
                  <div>Name</div>
                  <div>Role</div>
                  <div>Status</div>
                  <div />
                </div>
                <div className="staff-list">
                  {active.map(s => {
                    const initials = (s.userName ?? '??').split(' ').map((w: string) => w[0]).join('').slice(0, 2).toUpperCase()
                    const badgeCls = s.jobType === 'admin' ? 'admin' : s.jobType === 'surgeon' ? 'specialist' : 'clinician'
                    return (
                      <div key={s._id} className="staff-row">
                        <div className="staff-av">{initials}</div>
                        <div className="staff-info">
                          <div className="staff-name">{s.userName || '—'}</div>
                          <div className="staff-meta">{s.userEmail || '—'}</div>
                        </div>
                        <div className={`staff-role-badge ${badgeCls}`}>{JOB_LABELS[s.jobType] ?? s.jobType}</div>
                        <div style={{ textTransform: 'capitalize', color: 'var(--muted)', fontSize: 13 }}>{s.accessLevel}</div>
                        <div />
                      </div>
                    )
                  })}
                </div>
              </>
            )}
          </div>

          {/* Pending invitations */}
          <div className="table">
            <div className="table-h">
              <h3>Pending invitations <span style={{ fontSize: 13, fontWeight: 400, color: 'var(--muted)', marginLeft: 6 }}>{pending.length}</span></h3>
            </div>

            {pending.length === 0 ? (
              <div style={{ padding: '32px 22px', textAlign: 'center', color: 'var(--muted)', fontSize: 14 }}>
                No pending invitations.
              </div>
            ) : (
              <div className="staff-list">
                {pending.map(s => (
                  <div key={s._id} className="staff-row" style={{ opacity: .75 }}>
                    <div className="staff-av" style={{ background: 'var(--border)', color: 'var(--muted)' }}>
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" style={{ width: 16, height: 16 }} aria-hidden="true">
                        <circle cx="12" cy="7" r="4"/><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                      </svg>
                    </div>
                    <div className="staff-info">
                      <div className="staff-name">{s.userEmail || '—'}</div>
                      <div className="staff-meta">Invitation sent</div>
                    </div>
                    <div className={`staff-role-badge ${s.jobType === 'admin' ? 'admin' : s.jobType === 'surgeon' ? 'specialist' : 'clinician'}`}>
                      {JOB_LABELS[s.jobType] ?? s.jobType}
                    </div>
                    <div style={{ color: 'var(--muted)', fontSize: 13, textTransform: 'capitalize' }}>{s.status}</div>
                    <div />
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}
