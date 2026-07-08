'use client'

import React, { useState } from 'react'
import { useQuery, useMutation, useAction } from 'convex/react'
import { useRouter } from 'next/navigation'
import { api } from '../../../../convex/_generated/api'
import type { Id } from '../../../../convex/_generated/dataModel'

type Tab = 'pending' | 'all' | 'rejected'

type Application = {
  _id:             Id<'clinicApplications'>
  facilityName:    string
  facilityType:    string
  facilityCountry: string
  contactEmail:    string
  contactPhone?:   string
  facilityPhone?:  string
  status:          'pending' | 'approved' | 'rejected'
  submittedAt:     number
  reviewedAt?:     number
  reviewNotes?:    string
}

function formatDate(ts: number) {
  return new Date(ts).toLocaleDateString('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric',
  })
}

export default function ClinicsClient() {
  // ── All hooks unconditionally at top ─────────────────────────────────────────
  const router = useRouter()
  const [tab, setTab] = useState<Tab>('all')

  const pendingApps  = useQuery(api.clinics.listApplications, { status: 'pending'  }) as Application[] | undefined
  const approvedApps = useQuery(api.clinics.listApplications, { status: 'approved' }) as Application[] | undefined
  const rejectedApps = useQuery(api.clinics.listApplications, { status: 'rejected' }) as Application[] | undefined

  const reviewApplication = useMutation(api.clinics.reviewApplication)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const deleteRejected     = useAction((api.clinics as any).deleteRejectedApplications)

  // Quick-approve
  const [reviewing, setReviewing] = useState(false)

  // Delete / bulk select (rejected tab)
  const [selected,       setSelected]       = useState<Set<Id<'clinicApplications'>>>(new Set())
  const [deleting,       setDeleting]       = useState(false)
  const [deleteError,    setDeleteError]    = useState('')
  const [confirmDelete,  setConfirmDelete]  = useState<'single' | 'bulk' | null>(null)
  const [deleteSingleId, setDeleteSingleId] = useState<Id<'clinicApplications'> | null>(null)

  // ── Quick-approve ─────────────────────────────────────────────────────────────
  async function handleQuickApprove(e: React.MouseEvent, id: Id<'clinicApplications'>) {
    e.stopPropagation()
    setReviewing(true)
    try {
      await reviewApplication({ applicationId: id, decision: 'approved' })
    } catch (err) {
      console.error(err)
    } finally {
      setReviewing(false)
    }
  }

  // ── Delete ────────────────────────────────────────────────────────────────────
  async function handleDelete(ids: Id<'clinicApplications'>[]) {
    setDeleting(true); setDeleteError('')
    try {
      await deleteRejected({ applicationIds: ids })
      setSelected(new Set())
      setConfirmDelete(null)
      setDeleteSingleId(null)
    } catch (e) {
      setDeleteError((e as { message?: string })?.message ?? 'Delete failed — please try again')
    } finally {
      setDeleting(false)
    }
  }

  function toggleSelect(id: Id<'clinicApplications'>) {
    setSelected(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  function toggleAll() {
    if (!rejectedApps) return
    const allIds = rejectedApps.map(a => a._id)
    if (selected.size === allIds.length) {
      setSelected(new Set())
    } else {
      setSelected(new Set(allIds))
    }
  }

  const pendingCount = pendingApps?.length ?? 0
  const allSelected  = !!rejectedApps && rejectedApps.length > 0 && selected.size === rejectedApps.length

  // ── Render ────────────────────────────────────────────────────────────────────
  return (
    <div className="m-content">
      <div className="m-h">
        <div>
          <h2>Clinics</h2>
          <div className="sub">All registered and active clinic accounts on the platform.</div>
        </div>
        <button className="btn btn-s" onClick={() => router.push('/master/clinics/add')}>+ Add Clinic</button>
      </div>

      {/* ── Tabs ── */}
      <div
        className="m-tabs"
        style={{ '--m-tab-count': 3, '--m-tab-idx': tab === 'all' ? 0 : tab === 'pending' ? 1 : 2 } as React.CSSProperties}
        role="tablist"
      >
        <div className="m-tab-slider" aria-hidden="true" />
        <button role="tab" aria-selected={tab === 'all'} className={`m-tab${tab === 'all' ? ' active' : ''}`} onClick={() => setTab('all')}>
          All Clinics
        </button>
        <button role="tab" aria-selected={tab === 'pending'} className={`m-tab${tab === 'pending' ? ' active' : ''}`} onClick={() => setTab('pending')}>
          Pending
          {pendingCount > 0 && (
            <span style={{ marginLeft: 6, background: 'var(--warn)', color: '#fff', borderRadius: 10, padding: '1px 7px', fontSize: 11, fontWeight: 700 }}>
              {pendingCount}
            </span>
          )}
        </button>
        <button role="tab" aria-selected={tab === 'rejected'} className={`m-tab${tab === 'rejected' ? ' active' : ''}`} onClick={() => setTab('rejected')}>
          Rejected
          {(rejectedApps?.length ?? 0) > 0 && (
            <span style={{ marginLeft: 6, background: 'rgba(var(--err-rgb),0.80)', color: '#fff', borderRadius: 10, padding: '1px 7px', fontSize: 11, fontWeight: 700 }}>
              {rejectedApps!.length}
            </span>
          )}
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
        ) : (<>
          <div className="m-tbl-wrap m-list-table">
            <table className="m-tbl">
              <thead><tr><th>Clinic Name</th><th>Facility Type</th><th>Country</th><th>Contact Email</th><th>Submitted</th><th>Actions</th></tr></thead>
              <tbody>
                {pendingApps.map(app => (
                  <tr key={app._id} style={{ cursor: 'pointer' }} onClick={() => router.push('/master/clinics/' + app._id)}>
                    <td style={{ fontWeight: 500 }}>{app.facilityName}</td>
                    <td>{app.facilityType}</td>
                    <td>{app.facilityCountry}</td>
                    <td>{app.contactEmail}</td>
                    <td style={{ whiteSpace: 'nowrap' }}>{formatDate(app.submittedAt)}</td>
                    <td onClick={e => e.stopPropagation()}>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button className="m-act" onClick={() => router.push('/master/clinics/' + app._id)}>View</button>
                        <button className="m-act approve" onClick={e => handleQuickApprove(e, app._id)} disabled={reviewing}>Approve</button>
                        <button className="m-act reject" onClick={() => router.push('/master/clinics/' + app._id)}>Reject</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="m-list-cards">
            {pendingApps.map(app => (
              <div key={app._id} onClick={() => router.push('/master/clinics/' + app._id)}
                style={{ background:'var(--bg2)', border:'1px solid rgba(var(--warn-rgb),0.35)', borderRadius:12, padding:'14px 16px', marginBottom:10, cursor:'pointer' }}>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:6 }}>
                  <div style={{ fontFamily:'var(--ff)', fontSize:14, fontWeight:600, color:'var(--text)' }}>{app.facilityName}</div>
                  <span className="m-status pending" style={{ flexShrink:0, marginLeft:8 }}>Pending</span>
                </div>
                <div style={{ fontSize:12.5, color:'var(--muted)', marginBottom:10 }}>{app.facilityType} · {app.facilityCountry} · {formatDate(app.submittedAt)}</div>
                <div style={{ fontSize:12.5, color:'var(--muted)', marginBottom:12 }}>{app.contactEmail}</div>
                <div style={{ display:'flex', gap:8 }} onClick={e => e.stopPropagation()}>
                  <button className="btn btn-s" style={{ fontSize:12, flex:1 }} onClick={e => handleQuickApprove(e, app._id)} disabled={reviewing}>Approve</button>
                  <button className="btn btn-danger" style={{ fontSize:12, flex:1 }} onClick={() => router.push('/master/clinics/' + app._id)}>Review / Reject</button>
                </div>
              </div>
            ))}
          </div>
        </>)
      )}

      {/* ── All Clinics tab ── */}
      {tab === 'all' && (
        approvedApps === undefined ? (
          <div style={{ color: 'var(--muted)', fontFamily: 'var(--ff)', fontSize: 14, padding: '32px 0' }}>Loading…</div>
        ) : approvedApps.length === 0 ? (
          <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 14, padding: '40px 24px', textAlign: 'center', color: 'var(--muted)', fontFamily: 'var(--ff)', fontSize: 14 }}>
            No active clinics yet. Approve a pending application to get started.
          </div>
        ) : (<>
          <div className="m-tbl-wrap m-list-table">
            <table className="m-tbl">
              <thead><tr><th>Clinic Name</th><th>Contact Email</th><th>Phone</th><th>Status</th><th>Approved</th></tr></thead>
              <tbody>
                {approvedApps.map(app => (
                  <tr key={app._id} style={{ cursor: 'pointer' }} onClick={() => router.push('/master/clinics/' + app._id)}>
                    <td style={{ fontWeight: 500 }}>{app.facilityName}</td>
                    <td>{app.contactEmail}</td>
                    <td>{app.facilityPhone ?? app.contactPhone ?? '—'}</td>
                    <td><span className="m-status active">Active</span></td>
                    <td style={{ whiteSpace: 'nowrap' }}>{app.reviewedAt ? formatDate(app.reviewedAt) : formatDate(app.submittedAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="m-list-cards">
            {approvedApps.map(app => (
              <div key={app._id} onClick={() => router.push('/master/clinics/' + app._id)}
                style={{ background:'var(--bg2)', border:'1px solid var(--border)', borderRadius:12, padding:'14px 16px', marginBottom:10, cursor:'pointer', display:'flex', alignItems:'center', gap:14 }}>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontFamily:'var(--ff)', fontSize:14, fontWeight:600, color:'var(--text)', marginBottom:3 }}>{app.facilityName}</div>
                  <div style={{ fontSize:12.5, color:'var(--muted)' }}>{app.contactEmail}</div>
                  <div style={{ fontSize:12, color:'var(--muted)', marginTop:2 }}>{app.facilityPhone ?? app.contactPhone ?? ''}</div>
                </div>
                <div style={{ display:'flex', flexDirection:'column', alignItems:'flex-end', gap:4, flexShrink:0 }}>
                  <span className="m-status active">Active</span>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--muted2)" strokeWidth="1.7"><polyline points="9 18 15 12 9 6"/></svg>
                </div>
              </div>
            ))}
          </div>
        </>)
      )}

      {/* ── Rejected tab ── */}
      {tab === 'rejected' && (
        rejectedApps === undefined ? (
          <div style={{ color: 'var(--muted)', fontFamily: 'var(--ff)', fontSize: 14, padding: '32px 0' }}>Loading…</div>
        ) : rejectedApps.length === 0 ? (
          <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 14, padding: '40px 24px', textAlign: 'center', color: 'var(--muted)', fontFamily: 'var(--ff)', fontSize: 14 }}>
            No rejected applications.
          </div>
        ) : (<>
          {/* Bulk action bar */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12, flexWrap: 'wrap', gap: 8 }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontFamily: 'var(--ff)', fontSize: 13, color: 'var(--muted)' }}>
              <input
                type="checkbox"
                checked={allSelected}
                onChange={toggleAll}
                style={{ width: 16, height: 16, cursor: 'pointer', accentColor: 'var(--accent)' }}
              />
              {allSelected ? 'Deselect all' : `Select all (${rejectedApps.length})`}
            </label>
            {selected.size > 0 && (
              <button
                className="btn btn-danger"
                style={{ fontSize: 13 }}
                onClick={() => { setDeleteError(''); setConfirmDelete('bulk') }}
              >
                Delete selected ({selected.size})
              </button>
            )}
          </div>

          {deleteError && (
            <div style={{ background: 'rgba(var(--err-rgb),0.10)', border: '1px solid rgba(var(--err-rgb),0.25)', borderRadius: 8, padding: '10px 14px', marginBottom: 12, fontFamily: 'var(--ff)', fontSize: 13, color: 'var(--err)' }}>
              {deleteError}
            </div>
          )}

          {/* Desktop table */}
          <div className="m-tbl-wrap m-list-table">
            <table className="m-tbl">
              <thead>
                <tr>
                  <th style={{ width: 40 }}></th>
                  <th>Clinic Name</th><th>Country</th><th>Contact Email</th><th>Submitted</th><th>Notes</th><th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {rejectedApps.map(app => (
                  <tr key={app._id} style={{ cursor: 'pointer' }} onClick={() => router.push('/master/clinics/' + app._id)}>
                    <td onClick={e => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={selected.has(app._id)}
                        onChange={() => toggleSelect(app._id)}
                        style={{ width: 15, height: 15, cursor: 'pointer', accentColor: 'var(--accent)' }}
                      />
                    </td>
                    <td style={{ fontWeight: 500 }}>{app.facilityName}</td>
                    <td>{app.facilityCountry}</td>
                    <td>{app.contactEmail}</td>
                    <td style={{ whiteSpace: 'nowrap' }}>{formatDate(app.submittedAt)}</td>
                    <td style={{ color: 'var(--muted)', fontSize: 13 }}>{app.reviewNotes ?? '—'}</td>
                    <td onClick={e => e.stopPropagation()}>
                      <button
                        className="m-act"
                        style={{ color: 'var(--err)', borderColor: 'rgba(var(--err-rgb),0.30)' }}
                        onClick={() => { setDeleteSingleId(app._id); setDeleteError(''); setConfirmDelete('single') }}
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="m-list-cards">
            {rejectedApps.map(app => (
              <div key={app._id}
                style={{ background:'var(--bg2)', border:`1px solid ${selected.has(app._id) ? 'rgba(var(--accent-rgb),0.45)' : 'rgba(var(--err-rgb),0.25)'}`, borderRadius:12, padding:'14px 16px', marginBottom:10 }}>
                <div style={{ display:'flex', alignItems:'flex-start', gap:10, marginBottom:6 }}>
                  <input
                    type="checkbox"
                    checked={selected.has(app._id)}
                    onChange={() => toggleSelect(app._id)}
                    style={{ width:16, height:16, cursor:'pointer', marginTop:2, flexShrink:0, accentColor:'var(--accent)' }}
                  />
                  <div style={{ flex:1, cursor:'pointer' }} onClick={() => router.push('/master/clinics/' + app._id)}>
                    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:4 }}>
                      <div style={{ fontFamily:'var(--ff)', fontSize:14, fontWeight:600, color:'var(--text)' }}>{app.facilityName}</div>
                      <span style={{ flexShrink:0, marginLeft:8, fontFamily:'var(--ff)', fontSize:11, fontWeight:600, color:'var(--err)', padding:'2px 8px', borderRadius:4, background:'rgba(var(--err-rgb),0.10)' }}>Rejected</span>
                    </div>
                    <div style={{ fontSize:12.5, color:'var(--muted)', marginBottom:2 }}>{app.facilityCountry} · {formatDate(app.submittedAt)}</div>
                    <div style={{ fontSize:12.5, color:'var(--muted)' }}>{app.contactEmail}</div>
                    {app.reviewNotes && <div style={{ fontSize:12, color:'var(--muted)', fontStyle:'italic', marginTop:6, padding:'8px 10px', background:'var(--bg)', borderRadius:6 }}>{app.reviewNotes}</div>}
                  </div>
                </div>
                <div style={{ display:'flex', gap:8, marginTop:10, paddingLeft:26 }}>
                  <button className="btn btn-danger" style={{ fontSize:12, flex:1 }}
                    onClick={() => { setDeleteSingleId(app._id); setDeleteError(''); setConfirmDelete('single') }}>
                    Delete
                  </button>
                  <button className="btn" style={{ fontSize:12, flex:1 }}
                    onClick={() => router.push('/master/clinics/' + app._id)}>
                    View
                  </button>
                </div>
              </div>
            ))}
          </div>
        </>)
      )}

      {/* ── Delete confirmation modal ── */}
      {confirmDelete && (
        <div className="confirm-back open" onClick={() => { if (!deleting) { setConfirmDelete(null); setDeleteSingleId(null) } }}>
          <div className="confirm-modal" onClick={e => e.stopPropagation()}>
            <div className="confirm-body">
              <div style={{ width:44, height:44, borderRadius:'50%', background:'rgba(var(--err-rgb),0.12)', display:'grid', placeItems:'center', margin:'0 auto 14px' }}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--err)" strokeWidth="2">
                  <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/>
                </svg>
              </div>
              {confirmDelete === 'single' ? (
                <>
                  <h3>Delete this application?</h3>
                  <p style={{ color:'var(--muted)', fontSize:14 }}>
                    This will permanently delete the clinic application and remove the associated Clerk account if one was created. This cannot be undone.
                  </p>
                </>
              ) : (
                <>
                  <h3>Delete {selected.size} application{selected.size !== 1 ? 's' : ''}?</h3>
                  <p style={{ color:'var(--muted)', fontSize:14 }}>
                    This will permanently delete {selected.size} rejected clinic application{selected.size !== 1 ? 's' : ''} and remove the associated Clerk accounts. This cannot be undone.
                  </p>
                </>
              )}
              {deleteError && (
                <div style={{ color:'var(--err)', fontFamily:'var(--ff)', fontSize:13, marginTop:8 }}>{deleteError}</div>
              )}
            </div>
            <div className="confirm-actions">
              <button className="btn" onClick={() => { setConfirmDelete(null); setDeleteSingleId(null) }} disabled={deleting}>Cancel</button>
              <button className="btn btn-danger" disabled={deleting} onClick={() => {
                const ids = confirmDelete === 'single' && deleteSingleId
                  ? [deleteSingleId]
                  : Array.from(selected)
                handleDelete(ids)
              }}>
                {deleting ? 'Deleting…' : 'Delete permanently'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
