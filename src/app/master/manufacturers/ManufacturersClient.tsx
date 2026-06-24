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
  slug?: string
  status: 'pending' | 'approved' | 'rejected'
  submittedAt: number
  reviewedAt?: number
  reviewNotes?: string
  clerkUserId?: string
}

function formatDate(ms: number): string {
  return new Date(ms).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
}

function MfrAvatar({ logoUrl, name, size = 36 }: { logoUrl?: string; name: string; size?: number }) {
  const [failed, setFailed] = useState(false)
  const initials = name.split(/\s+/).map(w => w[0]).join('').slice(0, 2).toUpperCase()
  return (
    <div style={{ width: size, height: size, borderRadius: 8, background: 'var(--bg2)', border: '1px solid var(--border)', display: 'grid', placeItems: 'center', flexShrink: 0, overflow: 'hidden' }}>
      {logoUrl && !failed
        // eslint-disable-next-line @next/next/no-img-element
        ? <img src={logoUrl} alt={name} style={{ width: size - 10, height: size - 10, objectFit: 'contain', padding: 2 }}
            onError={() => setFailed(true)} />
        : <span style={{ fontFamily: 'var(--ff)', fontWeight: 700, fontSize: Math.round(size * 0.33), color: 'var(--accent)' }}>{initials}</span>
      }
    </div>
  )
}

export default function ManufacturersClient() {
  const router = useRouter()

  // Convex queries
  const pendingApps = useQuery(api.manufacturers.listApplications, { status: 'pending' })
  const rejectedApps = useQuery(api.manufacturers.listApplications, { status: 'rejected' })
  const allMfrs = useQuery(api.manufacturers.listApprovedManufacturers)
  const review       = useMutation(api.manufacturers.reviewApplication)
  const deleteMfr    = useMutation(api.manufacturers.deleteManufacturer)
  const backfillSlug = useMutation(api.manufacturers.backfillSlugs)
  const backfillLogos = useMutation(api.manufacturers.backfillLogoUrls)

  // Local state
  const [tab,          setTab]          = useState<Tab>('all')
  const [confirmModal, setConfirmModal] = useState<ConfirmModal | null>(null)
  const [confirming,   setConfirming]   = useState(false)
  const [confirmed,    setConfirmed]    = useState(false)
  const [rejectReason, setRejectReason] = useState('')
  const [error,        setError]        = useState('')

  // Delete state
  const [deleteModal,   setDeleteModal]   = useState<{ id: string; name: string } | null>(null)
  const [deleteWorking, setDeleteWorking] = useState(false)
  const [deleteError,   setDeleteError]   = useState('')

  // Backfill state
  const [backfilling,      setBackfilling]      = useState(false)
  const [backfillingLogos, setBackfillingLogos] = useState(false)

  async function handleDelete() {
    if (!deleteModal) return
    setDeleteWorking(true); setDeleteError('')
    try {
      await deleteMfr({ id: deleteModal.id as never })
      setDeleteModal(null)
    } catch (e) {
      setDeleteError((e as { message?: string })?.message ?? 'Failed to delete — try again')
    } finally {
      setDeleteWorking(false)
    }
  }

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

  // URL segment: use slug when available, fall back to Convex ID
  function mfrUrl(m: Manufacturer) { return `/master/manufacturers/${m.slug ?? m._id}` }

  // Whether any loaded manufacturer is missing a slug
  const needsBackfill = [...(allMfrs ?? []), ...(pendingApps ?? []), ...(rejectedApps ?? [])].some(m => !(m as Manufacturer).slug)

  async function handleBackfill() {
    setBackfilling(true)
    try { await backfillSlug({}) } finally { setBackfilling(false) }
  }

  async function handleBackfillLogos() {
    setBackfillingLogos(true)
    try { await backfillLogos({}) } finally { setBackfillingLogos(false) }
  }

  const needsLogoBackfill = [...(allMfrs ?? []), ...(pendingApps ?? []), ...(rejectedApps ?? [])].some(m => !(m as Manufacturer & { logoUrl?: string }).logoUrl && !!(m as Manufacturer & { website?: string }).website)

  return (
    <div className="m-content">
      <div className="m-h">
        <div>
          <h2>Manufacturers</h2>
          <div className="sub">Device manufacturers with access to the Implant ID platform catalogue.</div>
        </div>
        <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
          {needsLogoBackfill && (
            <button className="btn" onClick={handleBackfillLogos} disabled={backfillingLogos} title="Populate Clearbit logos for manufacturers with a website but no logo set">
              {backfillingLogos ? 'Loading logos…' : 'Fix Logos'}
            </button>
          )}
          {needsBackfill && (
            <button className="btn" onClick={handleBackfill} disabled={backfilling} title="Generate human-readable URL slugs for manufacturers that are missing them">
              {backfilling ? 'Generating…' : 'Fix URLs'}
            </button>
          )}
          <button className="btn" onClick={() => router.push('/master/manufacturers/import')}>Import CSV</button>
          <button className="btn" onClick={() => router.push('/master/manufacturers/new')}>+ Add manually</button>
          <button className="btn btn-s" onClick={() => router.push('/master/manufacturers/invite')}>+ Invite Manufacturer</button>
        </div>
      </div>

      {/* Tabs */}
      <div
        className="m-tabs"
        style={{ '--m-tab-count': 3, '--m-tab-idx': tab === 'all' ? 0 : tab === 'pending' ? 1 : 2 } as React.CSSProperties}
        role="tablist"
      >
        <div className="m-tab-slider" aria-hidden="true" />
        <button role="tab" aria-selected={tab === 'all'} className={`m-tab${tab === 'all' ? ' active' : ''}`} onClick={() => setTab('all')}>
          All Manufacturers
        </button>
        <button role="tab" aria-selected={tab === 'pending'} className={`m-tab${tab === 'pending' ? ' active' : ''}`} onClick={() => setTab('pending')}>
          Pending
          {(pendingApps?.length ?? 0) > 0 && (
            <span style={{ background: 'rgba(var(--warn-rgb),0.14)', color: 'var(--warn)', borderRadius: 10, padding: '1px 7px', fontSize: 11, fontWeight: 600 }}>
              {pendingApps!.length}
            </span>
          )}
        </button>
        <button role="tab" aria-selected={tab === 'rejected'} className={`m-tab${tab === 'rejected' ? ' active' : ''}`} onClick={() => setTab('rejected')}>
          Rejected
        </button>
      </div>

      {/* ── Pending tab ── */}
      {tab === 'pending' && (
        pendingApps === undefined
          ? <div style={{ background:'var(--bg2)', border:'1px solid var(--border)', borderRadius:14, padding:'40px 20px', textAlign:'center', color:'var(--muted)' }}>Loading…</div>
          : pendingApps.length === 0
          ? <div style={{ background:'var(--bg2)', border:'1px solid var(--border)', borderRadius:14, padding:'40px 20px', textAlign:'center', color:'var(--muted)' }}>No pending manufacturer applications.</div>
          : (<>
            <div className="m-tbl-wrap m-list-table">
              <table className="m-tbl">
                <thead><tr><th>Company</th><th>Contact</th><th>Country</th><th>Applied</th><th>Reg. Number</th><th>Actions</th></tr></thead>
                <tbody>
                  {pendingApps.map((m: Manufacturer) => (
                    <tr key={m._id} onClick={() => router.push(mfrUrl(m))} style={{ cursor:'pointer' }}>
                      <td><div style={{ display:'flex', alignItems:'center', gap:10 }}><MfrAvatar logoUrl={m.logoUrl} name={m.companyName} /><span style={{ fontWeight:500 }}>{m.companyName}</span></div></td>
                      <td style={{ color:'var(--muted)' }}>{m.contactEmail}</td>
                      <td>{m.country}</td>
                      <td style={{ color:'var(--muted)' }}>{formatDate(m.submittedAt)}</td>
                      <td style={{ fontFamily:'var(--ff)', fontSize:12, color:'var(--muted)' }}>{m.regNumber || '—'}</td>
                      <td style={{ display:'flex', gap:6 }} onClick={e => e.stopPropagation()}>
                        <a href={mfrUrl(m)} className="m-act">Review</a>
                        <button className="m-act danger" onClick={() => openConfirm('reject', m._id, m.companyName)}>Reject</button>
                        <button className="m-act danger" onClick={() => { setDeleteModal({ id: m._id, name: m.companyName }); setDeleteError('') }}>Delete</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="m-list-cards">
              {pendingApps.map((m: Manufacturer) => (
                <div key={m._id} onClick={() => router.push(mfrUrl(m))}
                  style={{ background:'var(--bg2)', border:'1px solid rgba(var(--warn-rgb),0.35)', borderRadius:12, padding:'14px 16px', marginBottom:10, cursor:'pointer' }}>
                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:8 }}>
                    <div style={{ display:'flex', alignItems:'center', gap:10, minWidth:0 }}>
                      <MfrAvatar logoUrl={m.logoUrl} name={m.companyName} size={36} />
                      <div style={{ fontFamily:'var(--ff)', fontSize:14, fontWeight:600, color:'var(--text)' }}>{m.companyName}</div>
                    </div>
                    <span className="m-status pending" style={{ flexShrink:0, marginLeft:8 }}>Pending</span>
                  </div>
                  <div style={{ fontSize:12.5, color:'var(--muted)', marginBottom:10 }}>{m.country} · {formatDate(m.submittedAt)}</div>
                  <div style={{ fontSize:12.5, color:'var(--muted)', marginBottom:12 }}>{m.contactEmail}</div>
                  <div style={{ display:'flex', gap:8 }} onClick={e => e.stopPropagation()}>
                    <button className="btn btn-s" style={{ fontSize:12, flex:1 }} onClick={() => openConfirm('approve', m._id, m.companyName)}>Approve</button>
                    <button className="btn" style={{ fontSize:12, flex:1 }} onClick={() => router.push(mfrUrl(m))}>Review</button>
                  </div>
                </div>
              ))}
            </div>
          </>)
      )}

      {/* ── All tab ── */}
      {tab === 'all' && (
        allMfrs === undefined || pendingApps === undefined
          ? <div style={{ background:'var(--bg2)', border:'1px solid var(--border)', borderRadius:14, padding:'40px 20px', textAlign:'center', color:'var(--muted)' }}>Loading…</div>
          : (<>
            <div className="m-tbl-wrap m-list-table">
              <table className="m-tbl">
                <thead><tr><th>Company</th><th>Contact</th><th>Country</th><th>Status</th><th>Joined</th><th>Actions</th></tr></thead>
                <tbody>
                  {allMfrs.map((m: Manufacturer) => (
                    <tr key={m._id} onClick={() => router.push(mfrUrl(m))} style={{ cursor:'pointer' }}>
                      <td><div style={{ display:'flex', alignItems:'center', gap:10 }}><MfrAvatar logoUrl={m.logoUrl} name={m.companyName} /><span style={{ fontWeight:500 }}>{m.companyName}</span></div></td>
                      <td style={{ color:'var(--muted)' }}>{m.contactEmail}</td>
                      <td>{m.country}</td>
                      <td><span className="m-status active">Active</span></td>
                      <td style={{ color:'var(--muted)' }}>{formatDate(m.submittedAt)}</td>
                      <td style={{ display:'flex', gap:6 }} onClick={e => e.stopPropagation()}>
                        <a href={mfrUrl(m)} className="m-act">View</a>
                        <button className="m-act danger" onClick={() => { setDeleteModal({ id: m._id, name: m.companyName }); setDeleteError('') }}>Delete</button>
                      </td>
                    </tr>
                  ))}
                  {pendingApps.map((m: Manufacturer) => (
                    <tr key={m._id} onClick={() => router.push(mfrUrl(m))} style={{ cursor:'pointer' }}>
                      <td><div style={{ display:'flex', alignItems:'center', gap:10 }}><MfrAvatar logoUrl={m.logoUrl} name={m.companyName} /><span style={{ fontWeight:500 }}>{m.companyName}</span></div></td>
                      <td style={{ color:'var(--muted)' }}>{m.contactEmail}</td>
                      <td>{m.country}</td>
                      <td><span className="m-status pending">Pending</span></td>
                      <td style={{ color:'var(--muted)' }}>{formatDate(m.submittedAt)}</td>
                      <td style={{ display:'flex', gap:6 }} onClick={e => e.stopPropagation()}>
                        <a href={mfrUrl(m)} className="m-act">View</a>
                        <button className="m-act danger" onClick={() => { setDeleteModal({ id: m._id, name: m.companyName }); setDeleteError('') }}>Delete</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="m-list-cards">
              {[...allMfrs.map((m: Manufacturer) => ({ ...m, _status:'active' })), ...pendingApps.map((m: Manufacturer) => ({ ...m, _status:'pending' }))].map((m: any) => (
                <div key={m._id}
                  style={{ background:'var(--bg2)', border:'1px solid var(--border)', borderRadius:12, padding:'14px 16px', marginBottom:10 }}>
                  <div onClick={() => router.push(mfrUrl(m))} style={{ cursor:'pointer', display:'flex', alignItems:'center', gap:10, marginBottom:10 }}>
                    <MfrAvatar logoUrl={m.logoUrl} name={m.companyName} size={36} />
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ fontFamily:'var(--ff)', fontSize:14, fontWeight:600, color:'var(--text)', marginBottom:3 }}>{m.companyName}</div>
                      <div style={{ fontSize:12.5, color:'var(--muted)' }}>{m.contactEmail}</div>
                      <div style={{ fontSize:12, color:'var(--muted)', marginTop:2 }}>{m.country}</div>
                    </div>
                    <span className={`m-status ${m._status}`}>{m._status === 'active' ? 'Active' : 'Pending'}</span>
                  </div>
                  <div style={{ display:'flex', gap:8 }}>
                    <button className="btn" style={{ flex:1, fontSize:12 }} onClick={() => router.push(mfrUrl(m))}>View</button>
                    <button className="btn btn-danger" style={{ fontSize:12 }} onClick={() => { setDeleteModal({ id: m._id, name: m.companyName }); setDeleteError('') }}>Delete</button>
                  </div>
                </div>
              ))}
            </div>
          </>)
      )}

      {/* ── Rejected tab ── */}
      {tab === 'rejected' && (
        rejectedApps === undefined
          ? <div style={{ background:'var(--bg2)', border:'1px solid var(--border)', borderRadius:14, padding:'40px 20px', textAlign:'center', color:'var(--muted)' }}>Loading…</div>
          : rejectedApps.length === 0
          ? <div style={{ background:'var(--bg2)', border:'1px solid var(--border)', borderRadius:14, padding:'40px 20px', textAlign:'center', color:'var(--muted)' }}>No rejected manufacturer applications.</div>
          : (<>
            <div className="m-tbl-wrap m-list-table">
              <table className="m-tbl">
                <thead><tr><th>Company</th><th>Contact</th><th>Country</th><th>Applied</th><th>Rejection Reason</th><th>Actions</th></tr></thead>
                <tbody>
                  {rejectedApps.map((m: Manufacturer) => (
                    <tr key={m._id} onClick={() => router.push(mfrUrl(m))} style={{ cursor:'pointer' }}>
                      <td><div style={{ display:'flex', alignItems:'center', gap:10 }}><MfrAvatar logoUrl={m.logoUrl} name={m.companyName} /><span style={{ fontWeight:500 }}>{m.companyName}</span></div></td>
                      <td style={{ color:'var(--muted)' }}>{m.contactEmail}</td>
                      <td>{m.country}</td>
                      <td style={{ color:'var(--muted)' }}>{formatDate(m.submittedAt)}</td>
                      <td style={{ color:'var(--muted)', fontStyle:'italic' }}>{m.reviewNotes || 'No reason provided'}</td>
                      <td style={{ display:'flex', gap:6 }} onClick={e => e.stopPropagation()}>
                        <button className="m-act" onClick={() => openConfirm('approve', m._id, m.companyName)}>Reconsider</button>
                        <button className="m-act danger" onClick={() => { setDeleteModal({ id: m._id, name: m.companyName }); setDeleteError('') }}>Delete</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="m-list-cards">
              {rejectedApps.map((m: Manufacturer) => (
                <div key={m._id} onClick={() => router.push(mfrUrl(m))}
                  style={{ background:'var(--bg2)', border:'1px solid rgba(var(--err-rgb),0.25)', borderRadius:12, padding:'14px 16px', marginBottom:10, cursor:'pointer' }}>
                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:8 }}>
                    <div style={{ display:'flex', alignItems:'center', gap:10, minWidth:0 }}>
                      <MfrAvatar logoUrl={m.logoUrl} name={m.companyName} size={36} />
                      <div style={{ fontFamily:'var(--ff)', fontSize:14, fontWeight:600, color:'var(--text)' }}>{m.companyName}</div>
                    </div>
                    <span style={{ flexShrink:0, marginLeft:8, fontFamily:'var(--ff)', fontSize:11, fontWeight:600, color:'var(--err)', padding:'2px 8px', borderRadius:4, background:'rgba(var(--err-rgb),0.10)' }}>Rejected</span>
                  </div>
                  <div style={{ fontSize:12.5, color:'var(--muted)', marginBottom:2 }}>{m.country} · {formatDate(m.submittedAt)}</div>
                  <div style={{ fontSize:12.5, color:'var(--muted)', marginBottom: m.reviewNotes ? 8 : 0 }}>{m.contactEmail}</div>
                  {m.reviewNotes && <div style={{ fontSize:12, color:'var(--muted)', fontStyle:'italic', marginTop:6, padding:'8px 10px', background:'var(--bg)', borderRadius:6 }}>{m.reviewNotes}</div>}
                </div>
              ))}
            </div>
          </>)
      )}

      {/* ── Approve modal ── */}
      {confirmModal?.type === 'approve' && (
        <div className="logout-back open" onClick={closeConfirm}>
          <div className="logout-modal" onClick={e => e.stopPropagation()}>
            <div className="logout-body">
              <div style={{ width: 44, height: 44, borderRadius: '50%', background: 'rgba(var(--ok-rgb),0.12)', display: 'grid', placeItems: 'center', margin: '0 auto 14px' }}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--ok)" strokeWidth="2">
                  <path d="M20 6L9 17l-5-5"/>
                </svg>
              </div>
              <h3>Approve manufacturer?</h3>
              <p><strong>{confirmModal.name}</strong></p>
              <p>This will activate their account and allow them to upload devices to the catalogue.</p>
              {error && (
                <div style={{ marginTop: 14, background: 'rgba(var(--err-rgb),0.08)', border: '1px solid rgba(var(--err-rgb),0.20)', borderRadius: 8, padding: '10px 12px', fontSize: 13, color: 'var(--err)' }}>
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
              <div style={{ width: 44, height: 44, borderRadius: '50%', background: 'rgba(var(--err-rgb),0.12)', display: 'grid', placeItems: 'center', margin: '0 auto 14px' }}>
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
                <div style={{ marginTop: 14, background: 'rgba(var(--err-rgb),0.08)', border: '1px solid rgba(var(--err-rgb),0.20)', borderRadius: 8, padding: '10px 12px', fontSize: 13, color: 'var(--err)' }}>
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

      {/* ── Delete manufacturer modal ── */}
      {deleteModal && (
        <div className="confirm-back open" onClick={() => !deleteWorking && setDeleteModal(null)}>
          <div className="confirm-modal" onClick={e => e.stopPropagation()}>
            <div className="confirm-body">
              <div style={{ width:48, height:48, borderRadius:'50%', background:'rgba(var(--err-rgb),0.12)', display:'grid', placeItems:'center', margin:'0 auto 14px' }}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--err)" strokeWidth="1.8" aria-hidden="true">
                  <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
                </svg>
              </div>
              <h3>Delete manufacturer?</h3>
              <p style={{ color:'var(--muted)', fontSize:14 }}>
                <strong style={{ color:'var(--text)' }}>{deleteModal.name}</strong><br/>
                This will permanently remove their record from the platform. Any devices they have submitted will remain in the catalogue. This cannot be undone.
              </p>
              {deleteError && (
                <p style={{ color:'var(--err)', fontSize:13, marginTop:8 }}>{deleteError}</p>
              )}
            </div>
            <div className="confirm-actions">
              <button type="button" className="btn" onClick={() => setDeleteModal(null)} disabled={deleteWorking}>Cancel</button>
              <button type="button" className="btn btn-danger" onClick={handleDelete} disabled={deleteWorking}>
                {deleteWorking ? 'Deleting…' : 'Yes, delete manufacturer'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}
