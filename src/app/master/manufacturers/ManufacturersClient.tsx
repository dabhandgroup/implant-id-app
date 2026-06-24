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
  const review      = useMutation(api.manufacturers.reviewApplication)
  const addMfr      = useMutation(api.manufacturers.adminAddManufacturer)
  const deleteMfr   = useMutation(api.manufacturers.deleteManufacturer)

  // Local state
  const [tab,          setTab]          = useState<Tab>('pending')
  const [confirmModal, setConfirmModal] = useState<ConfirmModal | null>(null)
  const [confirming,   setConfirming]   = useState(false)
  const [confirmed,    setConfirmed]    = useState(false)
  const [rejectReason, setRejectReason] = useState('')
  const [error,        setError]        = useState('')

  // Delete state
  const [deleteModal,   setDeleteModal]   = useState<{ id: string; name: string } | null>(null)
  const [deleteWorking, setDeleteWorking] = useState(false)
  const [deleteError,   setDeleteError]   = useState('')

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

  // Add manufacturer manually state
  const [addOpen,    setAddOpen]    = useState(false)
  const [addForm,    setAddForm]    = useState({ companyName:'', contactName:'', contactEmail:'', country:'', regNumber:'', website:'' })
  const [addSaving,  setAddSaving]  = useState(false)
  const [addError,   setAddError]   = useState('')

  function openAdd() {
    setAddForm({ companyName:'', contactName:'', contactEmail:'', country:'', regNumber:'', website:'' })
    setAddError('')
    setAddOpen(true)
  }
  function closeAdd() { setAddOpen(false); setAddError('') }
  function setAddField(k: keyof typeof addForm) {
    return (e: React.ChangeEvent<HTMLInputElement>) => setAddForm(f => ({ ...f, [k]: e.target.value }))
  }
  async function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    if (!addForm.companyName.trim() || !addForm.contactName.trim() || !addForm.contactEmail.trim() || !addForm.country.trim()) {
      setAddError('Company name, contact name, email and country are required.')
      return
    }
    setAddSaving(true); setAddError('')
    try {
      await addMfr({
        companyName:  addForm.companyName.trim(),
        contactName:  addForm.contactName.trim(),
        contactEmail: addForm.contactEmail.trim(),
        country:      addForm.country.trim(),
        regNumber:    addForm.regNumber.trim() || undefined,
        website:      addForm.website.trim() || undefined,
      })
      closeAdd()
      setTab('all')
    } catch (e) {
      setAddError((e as { message?: string })?.message ?? 'Failed to add manufacturer.')
    } finally {
      setAddSaving(false)
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

  return (
    <div className="m-content">
      <div className="m-h">
        <div>
          <h2>Manufacturers</h2>
          <div className="sub">Device manufacturers with access to the Implant ID platform catalogue.</div>
        </div>
        <div style={{ display:'flex', gap:8 }}>
          <button className="btn" onClick={openAdd}>+ Add manually</button>
          <button className="btn btn-s" onClick={() => router.push('/master/manufacturers/invite')}>+ Invite Manufacturer</button>
        </div>
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
          ? <div style={{ background:'var(--bg2)', border:'1px solid var(--border)', borderRadius:14, padding:'40px 20px', textAlign:'center', color:'var(--muted)' }}>Loading…</div>
          : pendingApps.length === 0
          ? <div style={{ background:'var(--bg2)', border:'1px solid var(--border)', borderRadius:14, padding:'40px 20px', textAlign:'center', color:'var(--muted)' }}>No pending manufacturer applications.</div>
          : (<>
            <div className="m-tbl-wrap m-list-table">
              <table className="m-tbl">
                <thead><tr><th>Company</th><th>Contact</th><th>Country</th><th>Applied</th><th>Reg. Number</th><th>Actions</th></tr></thead>
                <tbody>
                  {pendingApps.map((m: Manufacturer) => (
                    <tr key={m._id} onClick={() => router.push(`/master/manufacturers/${m._id}`)} style={{ cursor:'pointer' }}>
                      <td style={{ fontWeight:500 }}>{m.companyName}</td>
                      <td style={{ color:'var(--muted)' }}>{m.contactEmail}</td>
                      <td>{m.country}</td>
                      <td style={{ color:'var(--muted)' }}>{formatDate(m.submittedAt)}</td>
                      <td style={{ fontFamily:'var(--ff)', fontSize:12, color:'var(--muted)' }}>{m.regNumber || '—'}</td>
                      <td style={{ display:'flex', gap:6 }} onClick={e => e.stopPropagation()}>
                        <a href={`/master/manufacturers/${m._id}`} className="m-act">Review</a>
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
                <div key={m._id} onClick={() => router.push(`/master/manufacturers/${m._id}`)}
                  style={{ background:'var(--bg2)', border:'1px solid color-mix(in srgb,var(--warn) 30%,var(--border))', borderRadius:12, padding:'14px 16px', marginBottom:10, cursor:'pointer' }}>
                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:5 }}>
                    <div style={{ fontFamily:'var(--ff)', fontSize:14, fontWeight:600, color:'var(--text)' }}>{m.companyName}</div>
                    <span className="m-status pending" style={{ flexShrink:0, marginLeft:8 }}>Pending</span>
                  </div>
                  <div style={{ fontSize:12.5, color:'var(--muted)', marginBottom:10 }}>{m.country} · {formatDate(m.submittedAt)}</div>
                  <div style={{ fontSize:12.5, color:'var(--muted)', marginBottom:12 }}>{m.contactEmail}</div>
                  <div style={{ display:'flex', gap:8 }} onClick={e => e.stopPropagation()}>
                    <button className="btn btn-s" style={{ fontSize:12, flex:1 }} onClick={() => openConfirm('approve', m._id, m.companyName)}>Approve</button>
                    <button className="btn" style={{ fontSize:12, flex:1 }} onClick={() => router.push(`/master/manufacturers/${m._id}`)}>Review</button>
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
                    <tr key={m._id} onClick={() => router.push(`/master/manufacturers/${m._id}`)} style={{ cursor:'pointer' }}>
                      <td style={{ fontWeight:500 }}>{m.companyName}</td>
                      <td style={{ color:'var(--muted)' }}>{m.contactEmail}</td>
                      <td>{m.country}</td>
                      <td><span className="m-status active">Active</span></td>
                      <td style={{ color:'var(--muted)' }}>{formatDate(m.submittedAt)}</td>
                      <td style={{ display:'flex', gap:6 }} onClick={e => e.stopPropagation()}>
                        <a href={`/master/manufacturers/${m._id}`} className="m-act">View</a>
                        <button className="m-act danger" onClick={() => { setDeleteModal({ id: m._id, name: m.companyName }); setDeleteError('') }}>Delete</button>
                      </td>
                    </tr>
                  ))}
                  {pendingApps.map((m: Manufacturer) => (
                    <tr key={m._id} onClick={() => router.push(`/master/manufacturers/${m._id}`)} style={{ cursor:'pointer' }}>
                      <td style={{ fontWeight:500 }}>{m.companyName}</td>
                      <td style={{ color:'var(--muted)' }}>{m.contactEmail}</td>
                      <td>{m.country}</td>
                      <td><span className="m-status pending">Pending</span></td>
                      <td style={{ color:'var(--muted)' }}>{formatDate(m.submittedAt)}</td>
                      <td style={{ display:'flex', gap:6 }} onClick={e => e.stopPropagation()}>
                        <a href={`/master/manufacturers/${m._id}`} className="m-act">View</a>
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
                  <div onClick={() => router.push(`/master/manufacturers/${m._id}`)} style={{ cursor:'pointer', display:'flex', alignItems:'center', gap:14, marginBottom:10 }}>
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ fontFamily:'var(--ff)', fontSize:14, fontWeight:600, color:'var(--text)', marginBottom:3 }}>{m.companyName}</div>
                      <div style={{ fontSize:12.5, color:'var(--muted)' }}>{m.contactEmail}</div>
                      <div style={{ fontSize:12, color:'var(--muted)', marginTop:2 }}>{m.country}</div>
                    </div>
                    <span className={`m-status ${m._status}`}>{m._status === 'active' ? 'Active' : 'Pending'}</span>
                  </div>
                  <div style={{ display:'flex', gap:8 }}>
                    <button className="btn" style={{ flex:1, fontSize:12 }} onClick={() => router.push(`/master/manufacturers/${m._id}`)}>View</button>
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
                    <tr key={m._id} onClick={() => router.push(`/master/manufacturers/${m._id}`)} style={{ cursor:'pointer' }}>
                      <td style={{ fontWeight:500 }}>{m.companyName}</td>
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
                <div key={m._id} onClick={() => router.push(`/master/manufacturers/${m._id}`)}
                  style={{ background:'var(--bg2)', border:'1px solid color-mix(in srgb,var(--err) 20%,var(--border))', borderRadius:12, padding:'14px 16px', marginBottom:10, cursor:'pointer' }}>
                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:5 }}>
                    <div style={{ fontFamily:'var(--ff)', fontSize:14, fontWeight:600, color:'var(--text)' }}>{m.companyName}</div>
                    <span style={{ flexShrink:0, marginLeft:8, fontFamily:'var(--ff)', fontSize:11, fontWeight:600, color:'var(--err)', padding:'2px 8px', borderRadius:4, background:'color-mix(in srgb,var(--err) 10%,transparent)' }}>Rejected</span>
                  </div>
                  <div style={{ fontSize:12.5, color:'var(--muted)', marginBottom:2 }}>{m.country} · {formatDate(m.submittedAt)}</div>
                  <div style={{ fontSize:12.5, color:'var(--muted)', marginBottom: m.reviewNotes ? 8 : 0 }}>{m.contactEmail}</div>
                  {m.reviewNotes && <div style={{ fontSize:12, color:'var(--muted)', fontStyle:'italic', marginTop:6, padding:'8px 10px', background:'var(--bg)', borderRadius:6 }}>{m.reviewNotes}</div>}
                </div>
              ))}
            </div>
          </>)
      )}

      {/* ── Add manually modal ── */}
      {addOpen && (
        <div className="confirm-back open" onClick={closeAdd}>
          <div className="confirm-modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 480 }}>
            <div className="confirm-body">
              <h3 style={{ fontFamily:'var(--ff)', fontWeight:700, fontSize:18, color:'var(--text)', margin:'0 0 4px' }}>Add manufacturer</h3>
              <p style={{ fontFamily:'var(--ff)', fontSize:13.5, color:'var(--muted)', margin:'0 0 20px', lineHeight:1.5 }}>Creates an approved manufacturer account. No invitation email is sent — you can share access with them separately.</p>
              <form id="add-mfr-form" onSubmit={handleAdd} style={{ display:'flex', flexDirection:'column', gap:12 }}>
                <div className="field" style={{ margin:0 }}>
                  <label>Company name <span style={{ color:'var(--err)', marginLeft:2 }}>*</span></label>
                  <input className="input" type="text" placeholder="e.g. Medtronic" value={addForm.companyName} onChange={setAddField('companyName')} autoFocus />
                </div>
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
                  <div className="field" style={{ margin:0 }}>
                    <label>Contact name <span style={{ color:'var(--err)', marginLeft:2 }}>*</span></label>
                    <input className="input" type="text" placeholder="Full name" value={addForm.contactName} onChange={setAddField('contactName')} />
                  </div>
                  <div className="field" style={{ margin:0 }}>
                    <label>Country <span style={{ color:'var(--err)', marginLeft:2 }}>*</span></label>
                    <input className="input" type="text" placeholder="e.g. United Kingdom" value={addForm.country} onChange={setAddField('country')} />
                  </div>
                </div>
                <div className="field" style={{ margin:0 }}>
                  <label>Contact email <span style={{ color:'var(--err)', marginLeft:2 }}>*</span></label>
                  <input className="input" type="email" placeholder="contact@manufacturer.com" value={addForm.contactEmail} onChange={setAddField('contactEmail')} />
                </div>
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
                  <div className="field" style={{ margin:0 }}>
                    <label>Reg. number <span style={{ color:'var(--muted)', fontWeight:400 }}>(optional)</span></label>
                    <input className="input" type="text" placeholder="ISO / FDA number" value={addForm.regNumber} onChange={setAddField('regNumber')} />
                  </div>
                  <div className="field" style={{ margin:0 }}>
                    <label>Website <span style={{ color:'var(--muted)', fontWeight:400 }}>(optional)</span></label>
                    <input className="input" type="text" placeholder="https://…" value={addForm.website} onChange={setAddField('website')} />
                  </div>
                </div>
                {addError && (
                  <div style={{ color:'var(--err)', fontSize:13, background:'color-mix(in srgb,var(--err) 8%,transparent)', border:'1px solid color-mix(in srgb,var(--err) 20%,transparent)', borderRadius:8, padding:'10px 14px' }}>
                    {addError}
                  </div>
                )}
              </form>
            </div>
            <div className="confirm-actions">
              <button type="button" className="btn" onClick={closeAdd} disabled={addSaving}>Cancel</button>
              <button type="submit" form="add-mfr-form" className="btn btn-s" disabled={addSaving}>
                {addSaving ? 'Adding…' : 'Add manufacturer'}
              </button>
            </div>
          </div>
        </div>
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

      {/* ── Delete manufacturer modal ── */}
      {deleteModal && (
        <div className="confirm-back open" onClick={() => !deleteWorking && setDeleteModal(null)}>
          <div className="confirm-modal" onClick={e => e.stopPropagation()}>
            <div className="confirm-body">
              <div style={{ width:48, height:48, borderRadius:'50%', background:'color-mix(in srgb,var(--err) 12%,transparent)', display:'grid', placeItems:'center', margin:'0 auto 14px' }}>
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
