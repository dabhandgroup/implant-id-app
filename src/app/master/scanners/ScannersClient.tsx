'use client'
import React, { useState, useMemo } from 'react'
import { useQuery, useMutation }     from 'convex/react'
import { api as apiBase }            from '../../../../convex/_generated/api'
import './page.css'
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const api = apiBase as any

// ── Types ──────────────────────────────────────────────────────────────────────

interface Scanner {
  _id:               string
  manufacturer:      string
  model:             string
  fieldStrength:     string
  scannerType:       string
  boreDiameter?:     number
  maxSpatialGradient?: number
  notes?:            string
  status:            'approved' | 'pending' | 'rejected'
  submittedByClinicId?: string
  submittedAt:       number
  reviewedAt?:       number
  reviewNotes?:      string
}

// ── Field strength options ────────────────────────────────────────────────────

const FIELD_STRENGTHS = ['0.5T', '1.0T', '1.5T', '3T', '7T', 'Other']
const SCANNER_TYPES   = ['Closed-bore', 'Open-bore', 'Standing / upright', 'Other']

const EMPTY_FORM = {
  manufacturer: '', model: '', fieldStrength: '', scannerType: '',
  boreDiameter: '', maxSpatialGradient: '', notes: '',
}

// ── Add/Edit Scanner modal ────────────────────────────────────────────────────

function ScannerModal({
  initial, onClose, onSave,
}: {
  initial?: typeof EMPTY_FORM & { _id?: string }
  onClose: () => void
  onSave:  (data: typeof EMPTY_FORM) => Promise<void>
}) {
  const [form,    setForm]    = useState(initial ?? EMPTY_FORM)
  const [saving,  setSaving]  = useState(false)
  const [error,   setError]   = useState('')

  function set(k: keyof typeof EMPTY_FORM, v: string) {
    setForm(f => ({ ...f, [k]: v }))
  }

  async function handleSave() {
    if (!form.manufacturer.trim()) return setError('Manufacturer is required')
    if (!form.model.trim())        return setError('Model name is required')
    if (!form.fieldStrength)       return setError('Field strength is required')
    if (!form.scannerType)         return setError('Scanner type is required')
    setSaving(true); setError('')
    try {
      await onSave(form)
      onClose()
    } catch (e) {
      setError((e as { message?: string })?.message ?? 'Something went wrong')
      setSaving(false)
    }
  }

  return (
    <div className="sc-modal-overlay" onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="sc-modal" role="dialog" aria-modal="true" aria-label={initial?._id ? 'Edit scanner' : 'Add scanner'}>
        <div className="sc-modal-h">
          <h3>{initial?._id ? 'Edit scanner' : 'Add scanner'}</h3>
          <button className="sc-modal-close" onClick={onClose} aria-label="Close">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>
        <div className="sc-modal-body">
          {error && (
            <div style={{ background:'rgba(var(--err-rgb),0.08)', border:'1px solid rgba(var(--err-rgb),0.25)', borderRadius:8, padding:'10px 14px', color:'var(--err)', fontFamily:'var(--ff)', fontSize:13 }}>
              {error}
            </div>
          )}
          <div className="sc-form-row">
            <div className="field">
              <label>Manufacturer <span style={{ color:'var(--err)', marginLeft:2 }}>*</span></label>
              <input className="input" value={form.manufacturer} onChange={e => set('manufacturer', e.target.value)} placeholder="e.g. Siemens Healthineers" />
            </div>
            <div className="field">
              <label>Model name <span style={{ color:'var(--err)', marginLeft:2 }}>*</span></label>
              <input className="input" value={form.model} onChange={e => set('model', e.target.value)} placeholder="e.g. MAGNETOM Vida" />
            </div>
          </div>
          <div className="sc-form-row">
            <div className="field">
              <label>Field strength <span style={{ color:'var(--err)', marginLeft:2 }}>*</span></label>
              <div style={{ display:'flex', flexWrap:'wrap', gap:6 }}>
                {FIELD_STRENGTHS.map(fs => (
                  <button key={fs} type="button"
                    onClick={() => set('fieldStrength', fs)}
                    style={{
                      fontFamily:'var(--ff)', fontSize:13, fontWeight:500,
                      padding:'6px 14px', borderRadius:8, cursor:'pointer',
                      border: form.fieldStrength === fs ? '1.5px solid var(--accent)' : '1px solid var(--border)',
                      background: form.fieldStrength === fs ? 'rgba(var(--accent-rgb),0.10)' : 'var(--bg)',
                      color: form.fieldStrength === fs ? 'var(--accent-deep)' : 'var(--muted)',
                      transition: 'all .12s',
                    }}
                    aria-pressed={form.fieldStrength === fs}
                  >{fs}</button>
                ))}
              </div>
            </div>
            <div className="field">
              <label>Scanner type <span style={{ color:'var(--err)', marginLeft:2 }}>*</span></label>
              <div style={{ display:'flex', flexWrap:'wrap', gap:6 }}>
                {SCANNER_TYPES.map(st => (
                  <button key={st} type="button"
                    onClick={() => set('scannerType', st)}
                    style={{
                      fontFamily:'var(--ff)', fontSize:12.5, fontWeight:500,
                      padding:'5px 11px', borderRadius:8, cursor:'pointer',
                      border: form.scannerType === st ? '1.5px solid var(--accent)' : '1px solid var(--border)',
                      background: form.scannerType === st ? 'rgba(var(--accent-rgb),0.10)' : 'var(--bg)',
                      color: form.scannerType === st ? 'var(--accent-deep)' : 'var(--muted)',
                      transition: 'all .12s',
                    }}
                    aria-pressed={form.scannerType === st}
                  >{st}</button>
                ))}
              </div>
            </div>
          </div>
          <div className="sc-form-row">
            <div className="field">
              <label>Bore diameter (cm) <span style={{ fontWeight:400, opacity:.6 }}>(optional)</span></label>
              <input className="input" type="number" min="40" max="100" value={form.boreDiameter}
                onChange={e => set('boreDiameter', e.target.value)} placeholder="e.g. 70" />
            </div>
            <div className="field">
              <label>Max spatial gradient (T/m) <span style={{ fontWeight:400, opacity:.6 }}>(optional)</span></label>
              <input className="input" type="number" min="0" value={form.maxSpatialGradient}
                onChange={e => set('maxSpatialGradient', e.target.value)} placeholder="e.g. 80" />
            </div>
          </div>
          <div className="field">
            <label>Notes <span style={{ fontWeight:400, opacity:.6 }}>(optional)</span></label>
            <textarea className="input" rows={3} value={form.notes}
              onChange={e => set('notes', e.target.value)}
              placeholder="Any additional details about this scanner model…"
              style={{ resize:'vertical', minHeight:72 }} />
          </div>
        </div>
        <div className="sc-modal-acts">
          <button className="btn" onClick={onClose}>Cancel</button>
          <button className="btn btn-s" onClick={handleSave} disabled={saving}>
            {saving ? 'Saving…' : (initial?._id ? 'Save changes' : 'Add scanner')}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

export default function ScannersClient() {
  const approved = useQuery(api.scanners.listScanners, { status: 'approved' }) as Scanner[] | undefined
  const pending  = useQuery(api.scanners.listScanners, { status: 'pending'  }) as Scanner[] | undefined
  const rejected = useQuery(api.scanners.listScanners, { status: 'rejected' }) as Scanner[] | undefined

  const updateScanner  = useMutation(api.scanners.updateScanner)
  const approveScanner = useMutation(api.scanners.approveScanner)
  const rejectScanner  = useMutation(api.scanners.rejectScanner)
  const deleteScanner  = useMutation(api.scanners.deleteScanner)

  type TabKey = 'approved' | 'pending' | 'rejected'
  const [tab,        setTab]        = useState<TabKey>('approved')
  const [search,     setSearch]     = useState('')
  const [editTarget, setEditTarget] = useState<(typeof EMPTY_FORM & { _id: string }) | null>(null)
  const [confirm,    setConfirm]    = useState<{ id: string; name: string; action: 'delete' | 'reject' } | null>(null)
  const [working,    setWorking]    = useState(false)
  const [workErr,    setWorkErr]    = useState('')
  const [rejectNote, setRejectNote] = useState('')

  const filtered = useMemo(() => {
    const list: Scanner[] = (tab === 'approved' ? approved : tab === 'pending' ? pending : rejected) ?? []
    if (!search.trim()) return list
    const q = search.toLowerCase()
    return list.filter(s =>
      s.manufacturer.toLowerCase().includes(q) ||
      s.model.toLowerCase().includes(q) ||
      s.fieldStrength.toLowerCase().includes(q) ||
      s.scannerType.toLowerCase().includes(q)
    )
  }, [tab, approved, pending, rejected, search])

  async function handleEdit(form: typeof EMPTY_FORM) {
    if (!editTarget) return
    await updateScanner({
      id:                 editTarget._id as never,
      manufacturer:       form.manufacturer.trim(),
      model:              form.model.trim(),
      fieldStrength:      form.fieldStrength,
      scannerType:        form.scannerType,
      boreDiameter:       form.boreDiameter       ? Number(form.boreDiameter)       : undefined,
      maxSpatialGradient: form.maxSpatialGradient ? Number(form.maxSpatialGradient) : undefined,
      notes:              form.notes.trim()        || undefined,
    })
  }

  async function handleApprove(id: string) {
    setWorking(true); setWorkErr('')
    try { await approveScanner({ id: id as never }) }
    catch (e) { setWorkErr((e as { message?: string })?.message ?? 'Failed') }
    finally { setWorking(false) }
  }

  async function handleConfirmAction() {
    if (!confirm) return
    setWorking(true); setWorkErr('')
    try {
      if (confirm.action === 'delete') {
        await deleteScanner({ id: confirm.id as never })
      } else {
        await rejectScanner({ id: confirm.id as never, notes: rejectNote.trim() || undefined })
      }
      setConfirm(null); setRejectNote('')
    } catch (e) {
      setWorkErr((e as { message?: string })?.message ?? 'Failed')
    } finally {
      setWorking(false)
    }
  }

  const pendingCount = pending?.length ?? 0

  return (
    <div className="m-content">
      {/* Header */}
      <div className="m-h">
        <div>
          <h2>Scanner database</h2>
          <p className="sub">MRI scanners available for clinics to link to their site profile.</p>
        </div>
        <a href="/master/scanners/add" className="btn btn-s">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ marginRight:6 }}>
            <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
          Add scanner
        </a>
      </div>

      {/* Tabs */}
      <div className="sc-tabs">
        {(['approved', 'pending', 'rejected'] as TabKey[]).map(t => (
          <button key={t} className={`sc-tab${tab === t ? ' active' : ''}`} onClick={() => setTab(t)}>
            {t === 'approved' ? 'Approved' : t === 'pending' ? 'Pending review' : 'Rejected'}
            {t === 'pending' && pendingCount > 0 && (
              <span style={{ marginLeft:7, background:'var(--warn)', color:'#fff', borderRadius:9, fontSize:10.5, fontWeight:700, padding:'1px 7px' }}>
                {pendingCount}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Error */}
      {workErr && (
        <div style={{ marginBottom:16, background:'rgba(var(--err-rgb),0.08)', border:'1px solid rgba(var(--err-rgb),0.22)', borderRadius:8, padding:'10px 14px', color:'var(--err)', fontFamily:'var(--ff)', fontSize:13 }}>
          {workErr}
        </div>
      )}

      {/* Search */}
      <div className="m-tbl-toolbar">
        <div className="search">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          <input
            placeholder={`Search ${tab} scanners…`}
            value={search}
            onChange={e => setSearch(e.target.value)}
            aria-label="Search scanners"
          />
        </div>
        <span style={{ fontFamily:'var(--ff)', fontSize:12.5, color:'var(--muted2)' }}>
          {filtered.length} scanner{filtered.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Approved / Rejected — table */}
      {tab !== 'pending' && (
        <div className="m-tbl-wrap">
          <table className="m-tbl">
            <thead>
              <tr>
                <th>Manufacturer</th>
                <th>Model</th>
                <th>Strength</th>
                <th>Type</th>
                <th>Bore (cm)</th>
                <th>Max SG (T/m)</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ textAlign:'center', color:'var(--muted2)', fontFamily:'var(--ff)', padding:'32px 0' }}>
                    {search ? 'No scanners match your search.' : `No ${tab} scanners yet.`}
                  </td>
                </tr>
              ) : filtered.map(s => (
                <tr key={s._id}>
                  <td style={{ fontFamily:'var(--ff)', fontWeight:500 }}>{s.manufacturer}</td>
                  <td>{s.model}</td>
                  <td><span className="fs-badge">{s.fieldStrength}</span></td>
                  <td style={{ color:'var(--muted)', fontSize:13 }}>{s.scannerType}</td>
                  <td style={{ color:'var(--muted)', fontSize:13 }}>{s.boreDiameter ?? '—'}</td>
                  <td style={{ color:'var(--muted)', fontSize:13 }}>{s.maxSpatialGradient ?? '—'}</td>
                  <td>
                    <div style={{ display:'flex', gap:6, justifyContent:'flex-end' }}>
                      <button
                        className="m-act"
                        onClick={() => setEditTarget({
                          _id: s._id,
                          manufacturer: s.manufacturer, model: s.model,
                          fieldStrength: s.fieldStrength, scannerType: s.scannerType,
                          boreDiameter: s.boreDiameter?.toString() ?? '',
                          maxSpatialGradient: s.maxSpatialGradient?.toString() ?? '',
                          notes: s.notes ?? '',
                        })}
                      >Edit</button>
                      <button
                        className="m-act reject"
                        onClick={() => setConfirm({ id: s._id, name: `${s.manufacturer} ${s.model}`, action: 'delete' })}
                      >Delete</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Pending — cards */}
      {tab === 'pending' && (
        filtered.length === 0 ? (
          <div style={{ textAlign:'center', padding:'48px 0', color:'var(--muted2)', fontFamily:'var(--ff)' }}>
            {search ? 'No pending scanners match your search.' : 'No scanners awaiting review.'}
          </div>
        ) : (
          <div className="sc-pending-list">
            {filtered.map(s => (
              <div key={s._id} className="sc-pending-card">
                <div className="sc-pending-info">
                  <p className="sc-pending-name">{s.manufacturer} {s.model}</p>
                  <div className="sc-pending-meta">
                    <span className="fs-badge" style={{ fontSize:11 }}>{s.fieldStrength}</span>
                    <span>{s.scannerType}</span>
                    {s.boreDiameter && <span>Bore: {s.boreDiameter} cm</span>}
                    {s.maxSpatialGradient && <span>Max SG: {s.maxSpatialGradient} T/m</span>}
                  </div>
                  {s.notes && (
                    <p style={{ margin:'6px 0 0', fontFamily:'var(--fb)', fontSize:12.5, color:'var(--muted)' }}>{s.notes}</p>
                  )}
                  <p className="sc-pending-clinic">
                    Submitted {new Date(s.submittedAt).toLocaleDateString('en-GB', { day:'numeric', month:'short', year:'numeric' })}
                    {s.submittedByClinicId && ' · by a clinic'}
                  </p>
                </div>
                <div className="sc-pending-acts">
                  <button
                    className="m-act approve"
                    disabled={working}
                    onClick={() => handleApprove(s._id)}
                  >Approve</button>
                  <button
                    className="m-act reject"
                    disabled={working}
                    onClick={() => { setConfirm({ id: s._id, name: `${s.manufacturer} ${s.model}`, action: 'reject' }); setRejectNote('') }}
                  >Reject</button>
                </div>
              </div>
            ))}
          </div>
        )
      )}

      {/* Edit scanner modal */}
      {editTarget && (
        <ScannerModal initial={editTarget} onClose={() => setEditTarget(null)} onSave={handleEdit} />
      )}

      {/* Delete / Reject confirmation modal */}
      {confirm && (
        <div className="sc-modal-overlay" onClick={e => { if (e.target === e.currentTarget) setConfirm(null) }}>
          <div className="sc-modal" style={{ maxWidth:420 }}>
            <div className="sc-modal-h">
              <h3>{confirm.action === 'delete' ? 'Delete scanner' : 'Reject scanner'}</h3>
              <button className="sc-modal-close" onClick={() => setConfirm(null)} aria-label="Close">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            </div>
            <div className="sc-modal-body">
              <p style={{ margin:0, fontFamily:'var(--fb)', fontSize:14, color:'var(--text)', lineHeight:1.6 }}>
                {confirm.action === 'delete'
                  ? <>Permanently delete <strong>{confirm.name}</strong>? This cannot be undone.</>
                  : <>Reject <strong>{confirm.name}</strong>? The submitting clinic will not be notified automatically.</>
                }
              </p>
              {confirm.action === 'reject' && (
                <div className="field">
                  <label>Reason (optional)</label>
                  <textarea className="input" rows={2} value={rejectNote} onChange={e => setRejectNote(e.target.value)}
                    placeholder="e.g. Duplicate entry — see MAGNETOM Sola" style={{ resize:'vertical' }} />
                </div>
              )}
              {workErr && <p style={{ color:'var(--err)', fontFamily:'var(--ff)', fontSize:13, margin:0 }}>{workErr}</p>}
            </div>
            <div className="sc-modal-acts">
              <button className="btn" onClick={() => setConfirm(null)}>Cancel</button>
              <button className="btn btn-danger" onClick={handleConfirmAction} disabled={working}>
                {working ? 'Working…' : confirm.action === 'delete' ? 'Delete' : 'Reject'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
