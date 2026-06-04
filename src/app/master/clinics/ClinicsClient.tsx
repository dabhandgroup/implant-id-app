'use client'

import { useState } from 'react'
import { useQuery, useMutation } from 'convex/react'
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
  const router    = useRouter()
  const [tab,       setTab]       = useState<Tab>('pending')
  const [reviewing, setReviewing] = useState(false) // quick-approve loading state

  const pendingApps   = useQuery(api.clinics.listApplications, { status: 'pending'  }) as Application[] | undefined
  const approvedApps  = useQuery(api.clinics.listApplications, { status: 'approved' }) as Application[] | undefined
  const rejectedApps  = useQuery(api.clinics.listApplications, { status: 'rejected' }) as Application[] | undefined

  const reviewApplication = useMutation(api.clinics.reviewApplication)

  // ── Quick-approve from table row (no reject — use detail page for that) ───────
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

      {/* ── Tabs ── */}
      <div className="m-tabs">
        <button className={`m-tab${tab === 'pending' ? ' active' : ''}`} onClick={() => setTab('pending')}>
          Pending
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
        ) : (<>
          {/* Desktop table */}
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
          {/* Mobile cards */}
          <div className="m-list-cards">
            {pendingApps.map(app => (
              <div key={app._id} onClick={() => router.push('/master/clinics/' + app._id)}
                style={{ background:'var(--bg2)', border:'1px solid color-mix(in srgb,var(--warn) 30%,var(--border))', borderRadius:12, padding:'14px 16px', marginBottom:10, cursor:'pointer' }}>
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
          {/* Desktop table */}
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
          {/* Mobile cards */}
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
          {/* Desktop table */}
          <div className="m-tbl-wrap m-list-table">
            <table className="m-tbl">
              <thead><tr><th>Clinic Name</th><th>Country</th><th>Contact Email</th><th>Submitted</th><th>Reviewed</th><th>Notes</th></tr></thead>
              <tbody>
                {rejectedApps.map(app => (
                  <tr key={app._id} style={{ cursor: 'pointer' }} onClick={() => router.push('/master/clinics/' + app._id)}>
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
          {/* Mobile cards */}
          <div className="m-list-cards">
            {rejectedApps.map(app => (
              <div key={app._id} onClick={() => router.push('/master/clinics/' + app._id)}
                style={{ background:'var(--bg2)', border:'1px solid color-mix(in srgb,var(--err) 20%,var(--border))', borderRadius:12, padding:'14px 16px', marginBottom:10, cursor:'pointer' }}>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:4 }}>
                  <div style={{ fontFamily:'var(--ff)', fontSize:14, fontWeight:600, color:'var(--text)' }}>{app.facilityName}</div>
                  <span style={{ flexShrink:0, marginLeft:8, fontFamily:'var(--ff)', fontSize:11, fontWeight:600, color:'var(--err)', padding:'2px 8px', borderRadius:4, background:'color-mix(in srgb,var(--err) 10%,transparent)' }}>Rejected</span>
                </div>
                <div style={{ fontSize:12.5, color:'var(--muted)', marginBottom:2 }}>{app.facilityCountry} · {formatDate(app.submittedAt)}</div>
                <div style={{ fontSize:12.5, color:'var(--muted)', marginBottom: app.reviewNotes ? 8 : 0 }}>{app.contactEmail}</div>
                {app.reviewNotes && <div style={{ fontSize:12, color:'var(--muted)', fontStyle:'italic', marginTop:6, padding:'8px 10px', background:'var(--bg)', borderRadius:6 }}>{app.reviewNotes}</div>}
              </div>
            ))}
          </div>
        </>)
      )}
    </div>
  )
}
