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

// ── Role capability data ───────────────────────────────────────────────────

const ROLE_CAPS: Record<string, {
  color: string
  bg: string
  headline: string
  detail: string
  can: string[]
  cannot: string[]
}> = {
  radiographer: {
    color: 'var(--ok)',
    bg: 'color-mix(in srgb,var(--ok) 10%,transparent)',
    headline: 'Radiographer',
    detail: 'Standard clinical access. Can look up devices, scan patient cards, and view records that patients have explicitly granted access to.',
    can: [
      'Search & look up any device',
      'Scan patient implant cards (QR)',
      'View patient-granted records',
      'Download MRI safety PDFs',
    ],
    cannot: [
      'Add or remove patients',
      'Authorise risk-benefit decisions',
      'Manage billing or settings',
      'Invite or remove staff',
    ],
  },
  surgeon: {
    color: '#7c3aed',
    bg: 'color-mix(in srgb,#7c3aed 10%,transparent)',
    headline: 'Surgeon Portal',
    detail: 'Surgeons get a dedicated Surgeon Portal — a separate dashboard where they see all patients linked to their practice, manage pre-operative implant checks, and receive alerts when a patient requests MRI clearance.',
    can: [
      'Dedicated Surgeon Portal dashboard',
      'View all linked practice patients',
      'Pre-operative implant checks',
      'MRI clearance request alerts',
      'Look up & scan devices',
      'Authorise risk-benefit decisions',
    ],
    cannot: [
      'Manage billing or subscription',
      'Invite or remove other staff',
      'Access clinic settings',
    ],
  },
  admin: {
    color: 'var(--accent)',
    bg: 'color-mix(in srgb,var(--accent) 10%,transparent)',
    headline: 'Full admin access',
    detail: 'Admins can manage the whole clinic account — billing, settings, team members, and all clinic-level data. They have the same device lookup access as a Radiographer.',
    can: [
      'Team management (invite & remove)',
      'Billing & subscription management',
      'Clinic settings & profile',
      'Look up & scan devices',
      'View all clinic activity',
    ],
    cannot: [
      'Authorise clinical risk-benefit decisions',
      'Access Surgeon Portal',
    ],
  },
}

export default function StaffClient() {
  // ── All hooks at top ────────────────────────────────────────────────────────
  const staff       = useQuery(api.clinics.listClinicStaff)
  const inviteStaff = useMutation(api.clinics.inviteClinicStaff)
  const addExisting = useMutation(api.clinics.addExistingStaffToClinic)

  const [screen, setScreen] = useState<Screen>('list')

  const [inviteName,  setInviteName]  = useState('')
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRole,  setInviteRole]  = useState<'radiographer' | 'surgeon' | 'admin'>('radiographer')

  const [searchQuery,    setSearchQuery]    = useState('')
  const [selectedUserId, setSelectedUserId] = useState<Id<'users'> | null>(null)
  const [selectedName,   setSelectedName]   = useState('')

  const searchResults = useQuery(
    api.clinics.searchPlatformSurgeons,
    screen === 'add' ? { query: searchQuery } : 'skip',
  )

  const [submittingInvite, setSubmittingInvite] = useState(false)
  const [submittingSearch, setSubmittingSearch] = useState(false)
  const [inviteError,  setInviteError]  = useState('')
  const [searchError,  setSearchError]  = useState('')
  const [success,      setSuccess]      = useState('')

  // ── Handlers ────────────────────────────────────────────────────────────────

  function openAdd() {
    setInviteName(''); setInviteEmail(''); setInviteRole('radiographer')
    setSearchQuery(''); setSelectedUserId(null); setSelectedName('')
    setInviteError(''); setSearchError(''); setSuccess('')
    setScreen('add')
  }

  function backToList() { setScreen('list') }

  async function handleInviteNew(e: React.FormEvent) {
    e.preventDefault()
    if (!inviteName.trim())  { setInviteError("Enter the staff member's name"); return }
    if (!inviteEmail.trim()) { setInviteError('Enter their email address'); return }
    setSubmittingInvite(true); setInviteError('')
    try {
      await inviteStaff({ contactName: inviteName.trim(), contactEmail: inviteEmail.trim().toLowerCase(), jobType: inviteRole })
      setSuccess(`${inviteName} has been added as ${JOB_LABELS[inviteRole]}. They'll receive a sign-in link by email.`)
      setScreen('list')
    } catch (err) {
      setInviteError((err as { message?: string })?.message ?? 'Something went wrong')
    } finally {
      setSubmittingInvite(false)
    }
  }

  async function handleAddExisting() {
    if (!selectedUserId) { setSearchError('Select a person from the list'); return }
    setSubmittingSearch(true); setSearchError('')
    try {
      await addExisting({ userId: selectedUserId, jobType: 'surgeon' })
      setSuccess(`${selectedName} has been added to your clinic.`)
      setScreen('list')
    } catch (err) {
      setSearchError((err as { message?: string })?.message ?? 'Something went wrong')
    } finally {
      setSubmittingSearch(false)
    }
  }

  // ── Add member screen ───────────────────────────────────────────────────────

  if (screen === 'add') {
    const roleCap = ROLE_CAPS[inviteRole]

    return (
      <div className="m-content">

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

        {/* Two-column card layout */}
        <div className="add-staff-grid">

          {/* LEFT — Find existing surgeon */}
          <div className="table" style={{ borderRadius: 16, alignSelf: 'start' }}>
            <div style={{ padding: '22px 24px 18px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="1.8" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/></svg>
                <div style={{ fontFamily: 'var(--ff)', fontSize: 15, fontWeight: 600 }}>Find existing surgeon</div>
              </div>
              <div style={{ color: 'var(--muted)', fontSize: 13, lineHeight: 1.5, marginBottom: 20 }}>
                Search the platform by name or email — they&apos;ll be added to your clinic instantly with no invitation needed.
              </div>
              <div className="field" style={{ marginBottom: 0 }}>
                <label>Search by name or email</label>
                <input
                  className="input"
                  type="text"
                  placeholder="Dr Sarah Jones or sarah@hospital.com"
                  value={searchQuery}
                  onChange={e => { setSearchQuery(e.target.value); setSelectedUserId(null) }}
                />
              </div>
            </div>

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
                    <div className="staff-av" style={{ background: 'color-mix(in srgb,var(--accent) 14%,transparent)', color: 'var(--accent)' }}>
                      {r.name.slice(0, 2).toUpperCase()}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div className="staff-name">{r.name}</div>
                      <div className="staff-meta">{r.email}</div>
                    </div>
                    {selectedUserId === r.userId ? (
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2.5" aria-hidden="true"><path d="M20 6L9 17l-5-5"/></svg>
                    ) : (
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--muted2)" strokeWidth="1.8" aria-hidden="true"><path d="M9 18l6-6-6-6"/></svg>
                    )}
                  </button>
                ))}
              </div>
            )}

            {searchResults && searchResults.length === 0 && searchQuery.trim() && (
              <div style={{ padding: '16px 24px', borderTop: '1px solid var(--border)', color: 'var(--muted)', fontSize: 13.5 }}>
                No surgeons found for &ldquo;{searchQuery}&rdquo;.
              </div>
            )}

            <div style={{ padding: '14px 24px', borderTop: '1px solid var(--border)', display: 'flex', gap: 10, alignItems: 'center' }}>
              {searchError && <div style={{ flex: 1, color: 'var(--err)', fontFamily: 'var(--ff)', fontSize: 13 }}>{searchError}</div>}
              {!searchError && <div style={{ flex: 1 }} />}
              <button
                className="btn btn-s"
                type="button"
                onClick={handleAddExisting}
                disabled={submittingSearch || !selectedUserId}
              >
                {submittingSearch ? 'Adding…' : 'Add to clinic'}
              </button>
            </div>
          </div>

          {/* RIGHT — Invite by email */}
          <form onSubmit={handleInviteNew}>
            <div className="table" style={{ borderRadius: 16 }}>
              <div style={{ padding: '22px 24px 6px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="1.8" aria-hidden="true"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
                  <div style={{ fontFamily: 'var(--ff)', fontSize: 15, fontWeight: 600 }}>Invite by email</div>
                </div>
                <div style={{ color: 'var(--muted)', fontSize: 13, lineHeight: 1.5, marginBottom: 22 }}>
                  They&apos;ll receive a sign-in link — their account is created automatically, no password needed.
                </div>

                <div className="field" style={{ marginBottom: 14 }}>
                  <label>Full name <span style={{ color: 'var(--err)', marginLeft: 3 }}>*</span></label>
                  <input
                    className="input" type="text" placeholder="e.g. Dr Sarah Jones"
                    value={inviteName} onChange={e => setInviteName(e.target.value)}
                  />
                </div>
                <div className="field" style={{ marginBottom: 18 }}>
                  <label>Email address <span style={{ color: 'var(--err)', marginLeft: 3 }}>*</span></label>
                  <input
                    className="input" type="email" placeholder="e.g. sarah@clinic.com"
                    value={inviteEmail} onChange={e => setInviteEmail(e.target.value)}
                  />
                </div>

                {/* Role selector */}
                <div className="field" style={{ marginBottom: 0 }}>
                  <label>Role</label>
                  <div style={{ display: 'flex', gap: 6, marginBottom: 14 }}>
                    {(['radiographer', 'surgeon', 'admin'] as const).map(r => (
                      <button
                        key={r} type="button"
                        onClick={() => setInviteRole(r)}
                        aria-pressed={inviteRole === r}
                        style={{
                          flex: 1, padding: '9px 6px', border: '1.5px solid',
                          borderColor: inviteRole === r ? ROLE_CAPS[r].color : 'var(--border)',
                          borderRadius: 10, background: inviteRole === r ? ROLE_CAPS[r].bg : 'var(--bg2)',
                          color: inviteRole === r ? ROLE_CAPS[r].color : 'var(--muted)',
                          fontFamily: 'var(--ff)', fontSize: 13, fontWeight: 600,
                          cursor: 'pointer', transition: 'all .15s',
                        }}
                      >
                        {JOB_LABELS[r]}
                      </button>
                    ))}
                  </div>

                  {/* Role capability panel */}
                  <div style={{
                    background: roleCap.bg,
                    border: `1px solid color-mix(in srgb,${roleCap.color} 22%,transparent)`,
                    borderRadius: 12, padding: '14px 16px', marginBottom: 6,
                  }}>
                    <div style={{ fontFamily: 'var(--ff)', fontSize: 13, fontWeight: 700, color: roleCap.color, marginBottom: 4 }}>
                      {roleCap.headline}
                    </div>
                    <div style={{ fontSize: 12.5, color: 'var(--muted)', lineHeight: 1.55, marginBottom: 12 }}>
                      {roleCap.detail}
                    </div>

                    <div style={{ borderTop: `1px solid color-mix(in srgb,${roleCap.color} 16%,transparent)`, paddingTop: 10 }}>
                      {roleCap.can.map(item => (
                        <div key={item} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 5, fontSize: 12.5 }}>
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={roleCap.color} strokeWidth="2.5" aria-hidden="true" style={{ flexShrink: 0 }}><polyline points="20 6 9 17 4 12"/></svg>
                          <span style={{ color: 'var(--text)' }}>{item}</span>
                        </div>
                      ))}
                      {roleCap.cannot.map(item => (
                        <div key={item} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 5, fontSize: 12.5 }}>
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="var(--muted2)" strokeWidth="2.5" aria-hidden="true" style={{ flexShrink: 0 }}><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                          <span style={{ color: 'var(--muted)' }}>{item}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              <div style={{ padding: '14px 24px', borderTop: '1px solid var(--border)', display: 'flex', gap: 10, alignItems: 'center' }}>
                {inviteError && <div style={{ flex: 1, color: 'var(--err)', fontFamily: 'var(--ff)', fontSize: 13 }}>{inviteError}</div>}
                {!inviteError && <div style={{ flex: 1 }} />}
                <button className="btn" type="button" onClick={backToList} disabled={submittingInvite}>Cancel</button>
                <button className="btn btn-s" type="submit" disabled={submittingInvite}>
                  {submittingInvite ? 'Sending…' : 'Send invite'}
                </button>
              </div>
            </div>
          </form>

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
            Manage who at your clinic can access Implant ID. <b>Radiographers</b> can look up implants and view granted records.{' '}
            <b>Surgeons</b> get their own dedicated portal and can authorise risk-benefit decisions.{' '}
            <b>Admins</b> manage billing and clinic settings.
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
          { cls: 'clinician',  label: 'Radiographer', desc: 'Device lookups & granted records' },
          { cls: 'specialist', label: 'Surgeon',       desc: 'Surgeon Portal + risk authorisation' },
          { cls: 'admin',      label: 'Admin',         desc: 'Billing, settings & team management' },
        ].map(b => (
          <div key={b.cls} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--muted)', background: 'var(--bg)', border: '1px solid var(--border)', padding: '7px 14px', borderRadius: 999 }}>
            <div className={`staff-role-badge ${b.cls}`} style={{ margin: 0 }}>{b.label}</div>
            <span>{b.desc}</span>
          </div>
        ))}
      </div>

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
