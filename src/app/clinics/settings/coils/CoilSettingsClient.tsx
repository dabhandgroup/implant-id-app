'use client'

import { useState }             from 'react'
import { useQuery, useMutation } from 'convex/react'
import { api as apiBase }       from '../../../../../convex/_generated/api'
import { InlineSelect }         from '@/components/ui/CustomSelect'
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const api = apiBase as any

// ── Constants ─────────────────────────────────────────────────────────────────

const FIELD_STRENGTHS = ['0.55T', '1.5T', '3T', '7T']

const COIL_TYPES = [
  { value: 'Body transmit/receive', label: 'Body transmit/receive' },
  { value: 'Head transmit/receive', label: 'Head transmit/receive' },
  { value: 'Head transmit + surface receive', label: 'Head transmit + surface receive' },
  { value: 'Extremity coil', label: 'Extremity coil' },
  { value: 'Not Stated', label: 'Not Stated' },
]

const EMPTY_FORM = {
  coilDisplayName: '',
  coilType:        '',
  fieldStrength:   '',
  manufacturer:    '',
  modelNumber:     '',
  txCapable:       true,
  rxCapable:       true,
  channelCount:    '',
  entryDate:       '',
  notes:           '',
}

// ── Status badge ──────────────────────────────────────────────────────────────

function StatusBadge({ status, recordState }: { status: string; recordState: string }) {
  if (status === 'retired') {
    return <span style={{ fontFamily:'var(--ff)', fontSize:11, fontWeight:600, padding:'3px 8px', borderRadius:6, background:'rgba(var(--err-rgb),0.10)', color:'var(--err)' }}>Retired</span>
  }
  if (recordState === 'Confirmed') {
    return <span style={{ fontFamily:'var(--ff)', fontSize:11, fontWeight:600, padding:'3px 8px', borderRadius:6, background:'rgba(var(--ok-rgb),0.12)', color:'var(--ok)' }}>Confirmed</span>
  }
  return <span style={{ fontFamily:'var(--ff)', fontSize:11, fontWeight:600, padding:'3px 8px', borderRadius:6, background:'rgba(215,85,0,0.10)', color:'#b45309' }}>Pending admin review</span>
}

// ── Add coil modal ────────────────────────────────────────────────────────────

function AddCoilModal({
  clinicId,
  clinicScanners,
  onClose,
  onSave,
}: {
  clinicId:       string
  clinicScanners: { _id: string; model: string; manufacturer: string; fieldStrength: string }[]
  onClose: () => void
  onSave:  (f: typeof EMPTY_FORM, scannerIds: string[]) => Promise<void>
}) {
  const [form,       setForm]       = useState(EMPTY_FORM)
  const [scannerIds, setScannerIds] = useState<string[]>([])
  const [saving,     setSaving]     = useState(false)
  const [error,      setError]      = useState('')
  void clinicId

  function set<K extends keyof typeof EMPTY_FORM>(k: K, v: (typeof EMPTY_FORM)[K]) {
    setForm(f => ({ ...f, [k]: v }))
  }

  function toggleScanner(id: string) {
    setScannerIds(ids => ids.includes(id) ? ids.filter(x => x !== id) : [...ids, id])
  }

  async function handleSave() {
    if (!form.coilDisplayName.trim()) return setError('Coil display name is required')
    if (!form.coilType)               return setError('Coil type is required')
    if (!form.fieldStrength)          return setError('Field strength is required')
    if (scannerIds.length === 0)      return setError('Select at least one compatible scanner')
    setSaving(true); setError('')
    try {
      await onSave(form, scannerIds)
      onClose()
    } catch (e) {
      setError((e as { message?: string })?.message ?? 'Something went wrong')
      setSaving(false)
    }
  }

  const compatibleScanners = clinicScanners.filter(s =>
    !form.fieldStrength || s.fieldStrength === form.fieldStrength
  )

  return (
    <div
      style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.45)', zIndex:400, display:'flex', alignItems:'center', justifyContent:'center', padding:16 }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div
        style={{ background:'var(--bg2)', border:'1px solid var(--border)', borderRadius:16, width:'100%', maxWidth:580, maxHeight:'90vh', display:'flex', flexDirection:'column', overflow:'hidden' }}
        role="dialog" aria-modal="true" aria-label="Add coil"
        onClick={e => e.stopPropagation()}
      >
        <div style={{ padding:'18px 24px 14px', borderBottom:'1px solid var(--border)', display:'flex', alignItems:'center', justifyContent:'space-between', flexShrink:0 }}>
          <h3 style={{ margin:0, fontFamily:'var(--ff)', fontSize:16, fontWeight:700, color:'var(--text)' }}>Register a coil</h3>
          <button onClick={onClose} aria-label="Close" style={{ background:'none', border:0, cursor:'pointer', color:'var(--muted)', fontSize:20, lineHeight:1, padding:4 }}>✕</button>
        </div>

        <div style={{ flex:1, overflowY:'auto', padding:'16px 24px 24px' }}>
          {error && (
            <div style={{ background:'rgba(var(--err-rgb),0.08)', border:'1px solid rgba(var(--err-rgb),0.25)', borderRadius:8, padding:'10px 14px', color:'var(--err)', fontFamily:'var(--ff)', fontSize:13, marginBottom:16 }}>
              {error}
            </div>
          )}

          <div className="field">
            <label>Display name <span style={{ color:'var(--err)', marginLeft:3 }}>*</span></label>
            <input className="input" value={form.coilDisplayName} onChange={e => set('coilDisplayName', e.target.value)} placeholder="e.g. 18-channel body matrix" />
          </div>

          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
            <div className="field">
              <label>Coil type <span style={{ color:'var(--err)', marginLeft:3 }}>*</span></label>
              <InlineSelect
                value={form.coilType}
                onChange={v => set('coilType', v)}
                options={COIL_TYPES}
                placeholder="Select type…"
              />
            </div>
            <div className="field">
              <label>Field strength <span style={{ color:'var(--err)', marginLeft:3 }}>*</span></label>
              <div style={{ display:'flex', flexWrap:'wrap', gap:6 }}>
                {FIELD_STRENGTHS.map(fs => (
                  <button key={fs} type="button"
                    onClick={() => { set('fieldStrength', fs); setScannerIds([]) }}
                    aria-pressed={form.fieldStrength === fs}
                    style={{ fontFamily:'var(--ff)', fontSize:12.5, fontWeight:500, padding:'5px 12px', borderRadius:8, cursor:'pointer', transition:'all .12s',
                      border: form.fieldStrength === fs ? '1.5px solid var(--accent)' : '1px solid var(--border)',
                      background: form.fieldStrength === fs ? 'rgba(var(--accent-rgb),0.10)' : 'var(--bg)',
                      color: form.fieldStrength === fs ? 'var(--accent-deep)' : 'var(--muted)',
                    }}
                  >{fs}</button>
                ))}
              </div>
            </div>
            <div className="field">
              <label>Manufacturer <span style={{ fontWeight:400, opacity:.6 }}>(optional)</span></label>
              <input className="input" value={form.manufacturer} onChange={e => set('manufacturer', e.target.value)} placeholder="e.g. Siemens" />
            </div>
            <div className="field">
              <label>Model number <span style={{ fontWeight:400, opacity:.6 }}>(optional)</span></label>
              <input className="input" value={form.modelNumber} onChange={e => set('modelNumber', e.target.value)} placeholder="e.g. BO-76-1300" />
            </div>
            <div className="field">
              <label>Channel count <span style={{ fontWeight:400, opacity:.6 }}>(optional)</span></label>
              <input className="input" type="number" min="1" value={form.channelCount} onChange={e => set('channelCount', e.target.value)} placeholder="e.g. 18" />
            </div>
            <div className="field">
              <label>Entry date <span style={{ fontWeight:400, opacity:.6 }}>(optional)</span></label>
              <input className="input" type="date" value={form.entryDate} onChange={e => set('entryDate', e.target.value)} />
            </div>
          </div>

          <div style={{ display:'flex', gap:24, marginBottom:16 }}>
            <label style={{ display:'flex', alignItems:'center', gap:8, cursor:'pointer', fontFamily:'var(--ff)', fontSize:13, color:'var(--text)' }}>
              <input type="checkbox" checked={form.txCapable} onChange={e => set('txCapable', e.target.checked)} />
              Transmit capable
            </label>
            <label style={{ display:'flex', alignItems:'center', gap:8, cursor:'pointer', fontFamily:'var(--ff)', fontSize:13, color:'var(--text)' }}>
              <input type="checkbox" checked={form.rxCapable} onChange={e => set('rxCapable', e.target.checked)} />
              Receive capable
            </label>
          </div>

          <div className="field">
            <label>Compatible scanners at this site <span style={{ color:'var(--err)', marginLeft:3 }}>*</span></label>
            {form.fieldStrength && compatibleScanners.length === 0 && (
              <p style={{ fontFamily:'var(--ff)', fontSize:13, color:'var(--muted)', margin:'4px 0 0' }}>
                No {form.fieldStrength} scanners registered at this site. Add a scanner in Settings → Scanners first.
              </p>
            )}
            {!form.fieldStrength && (
              <p style={{ fontFamily:'var(--ff)', fontSize:13, color:'var(--muted2)', margin:'4px 0 0' }}>Select a field strength above to see compatible scanners.</p>
            )}
            <div style={{ display:'flex', flexDirection:'column', gap:6, marginTop:6 }}>
              {compatibleScanners.map(s => (
                <label key={s._id} style={{ display:'flex', alignItems:'center', gap:10, cursor:'pointer', padding:'8px 12px', background: scannerIds.includes(s._id) ? 'rgba(var(--accent-rgb),0.06)' : 'var(--bg)', border:`1.5px solid ${scannerIds.includes(s._id) ? 'rgba(var(--accent-rgb),0.30)' : 'var(--border)'}`, borderRadius:8, transition:'all .12s' }}>
                  <input type="checkbox" checked={scannerIds.includes(s._id)} onChange={() => toggleScanner(s._id)} style={{ accentColor:'var(--accent)' }} />
                  <span style={{ fontFamily:'var(--ff)', fontSize:13, color:'var(--text)' }}>{s.manufacturer} {s.model}</span>
                  <span style={{ fontFamily:'var(--ff)', fontSize:11, fontWeight:600, marginLeft:'auto', padding:'2px 7px', borderRadius:5, background:'rgba(var(--accent-rgb),0.10)', color:'var(--accent-deep)' }}>{s.fieldStrength}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="field">
            <label>Notes <span style={{ fontWeight:400, opacity:.6 }}>(optional)</span></label>
            <textarea className="input" rows={2} value={form.notes} onChange={e => set('notes', e.target.value)} placeholder="Any additional notes about this coil…" style={{ resize:'vertical' }} />
          </div>
        </div>

        <div style={{ padding:'14px 24px 18px', borderTop:'1px solid var(--border)', display:'flex', justifyContent:'flex-end', gap:10, flexShrink:0 }}>
          <button className="btn" onClick={onClose} disabled={saving}>Cancel</button>
          <button className="btn btn-s" onClick={handleSave} disabled={saving}>
            {saving ? 'Saving…' : 'Register coil'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

export default function CoilSettingsClient() {
  const clinic   = useQuery(api.clinics.getMyClinic)
  const scanners = useQuery(api.scanners.getMyClinicScanners) as { _id: string; model: string; manufacturer: string; fieldStrength: string }[] | undefined

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const coils = useQuery(
    api.siteCoils.listAllCoilsBySite,
    clinic ? { siteId: clinic._id } : 'skip'
  ) as Array<{
    _id: string; coilDisplayName: string; coilType: string; fieldStrength: string;
    manufacturer?: string; modelNumber?: string; status: string; recordState: string;
    compatibleScannerIds: string[]; notes?: string; txCapable: boolean; rxCapable: boolean
  }> | undefined

  const addCoil  = useMutation(api.siteCoils.addCoil)
  const retireCoil = useMutation(api.siteCoils.retireCoil)

  const [adding,    setAdding]    = useState(false)
  const [retireId,  setRetireId]  = useState<string | null>(null)
  const [working,   setWorking]   = useState(false)
  const [workErr,   setWorkErr]   = useState('')

  async function handleAdd(f: typeof EMPTY_FORM, scannerIds: string[]) {
    if (!clinic) return
    await addCoil({
      siteId:               clinic._id,
      coilDisplayName:      f.coilDisplayName.trim(),
      coilType:             f.coilType,
      fieldStrength:        f.fieldStrength,
      compatibleScannerIds: scannerIds as never,
      txCapable:            f.txCapable,
      rxCapable:            f.rxCapable,
      channelCount:         f.channelCount ? Number(f.channelCount) : undefined,
      manufacturer:         f.manufacturer.trim() || undefined,
      modelNumber:          f.modelNumber.trim()  || undefined,
      entryDate:            f.entryDate            || undefined,
      notes:                f.notes.trim()         || undefined,
    })
  }

  async function handleRetire() {
    if (!retireId) return
    setWorking(true); setWorkErr('')
    try {
      await retireCoil({ id: retireId as never })
      setRetireId(null)
    } catch (e) {
      setWorkErr((e as { message?: string })?.message ?? 'Retire failed')
    } finally {
      setWorking(false)
    }
  }

  if (clinic === undefined) {
    return <div style={{ padding:'32px 0', textAlign:'center', fontFamily:'var(--ff)', fontSize:13, color:'var(--muted)' }}>Loading…</div>
  }

  const sorted = [...(coils ?? [])].sort((a, b) => a.coilDisplayName.localeCompare(b.coilDisplayName))
  const active  = sorted.filter(c => c.status === 'active')
  const retired = sorted.filter(c => c.status === 'retired')

  return (
    <div className="m-content">
      <div className="m-h" style={{ marginBottom: 24 }}>
        <div>
          <h2>Coil management</h2>
          <p className="sub">RF coils registered at your site. The MRI matrix resolver uses these for Gate 6 matching.</p>
        </div>
        <button className="btn btn-s" onClick={() => setAdding(true)}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ marginRight:6 }} aria-hidden="true">
            <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
          Register coil
        </button>
      </div>

      {/* Info banner */}
      <div style={{ background:'rgba(var(--accent-rgb),0.06)', border:'1px solid rgba(var(--accent-rgb),0.18)', borderRadius:10, padding:'12px 16px', marginBottom:24, fontFamily:'var(--ff)', fontSize:13, color:'var(--accent-deep)', lineHeight:1.6 }}>
        New coils are marked <strong>Pending admin review</strong> until an administrator confirms them. Only confirmed coils appear in the MRI matrix resolver.
      </div>

      {/* Active coils */}
      <div style={{ fontFamily:'var(--ff)', fontSize:11, fontWeight:700, letterSpacing:'1px', textTransform:'uppercase', color:'var(--muted2)', marginBottom:10 }}>
        Active ({active.length})
      </div>

      {active.length === 0 ? (
        <div style={{ padding:'32px 0', textAlign:'center', fontFamily:'var(--ff)', fontSize:13.5, color:'var(--muted)', marginBottom:24 }}>
          No coils registered yet. Register your first coil to use the MRI matrix resolver.
        </div>
      ) : (
        <div style={{ display:'flex', flexDirection:'column', gap:8, marginBottom:24 }}>
          {active.map(c => (
            <div key={c._id} style={{ background:'var(--bg2)', border:'1px solid var(--border)', borderRadius:12, padding:'14px 18px', display:'flex', alignItems:'center', gap:16, flexWrap:'wrap' }}>
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ fontFamily:'var(--ff)', fontSize:14, fontWeight:600, color:'var(--text)', marginBottom:2 }}>{c.coilDisplayName}</div>
                <div style={{ fontFamily:'var(--ff)', fontSize:12, color:'var(--muted)', display:'flex', flexWrap:'wrap', gap:8 }}>
                  <span>{c.coilType}</span>
                  <span style={{ fontWeight:600, color:'var(--accent-deep)', background:'rgba(var(--accent-rgb),0.10)', padding:'1px 6px', borderRadius:5 }}>{c.fieldStrength}</span>
                  {c.manufacturer && <span>{c.manufacturer}</span>}
                  {c.modelNumber && <span>{c.modelNumber}</span>}
                  <span>{c.compatibleScannerIds.length} scanner{c.compatibleScannerIds.length !== 1 ? 's' : ''}</span>
                </div>
              </div>
              <div style={{ display:'flex', alignItems:'center', gap:10, flexShrink:0 }}>
                <StatusBadge status={c.status} recordState={c.recordState} />
                <button
                  className="btn"
                  style={{ fontSize:12, padding:'5px 12px' }}
                  onClick={() => setRetireId(c._id)}
                >Retire</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Retired coils */}
      {retired.length > 0 && (
        <>
          <div style={{ fontFamily:'var(--ff)', fontSize:11, fontWeight:700, letterSpacing:'1px', textTransform:'uppercase', color:'var(--muted2)', marginBottom:10 }}>
            Retired ({retired.length})
          </div>
          <div style={{ display:'flex', flexDirection:'column', gap:8, opacity:0.65 }}>
            {retired.map(c => (
              <div key={c._id} style={{ background:'var(--bg2)', border:'1px solid var(--border)', borderRadius:12, padding:'12px 18px', display:'flex', alignItems:'center', gap:12 }}>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontFamily:'var(--ff)', fontSize:13.5, fontWeight:500, color:'var(--muted)', textDecoration:'line-through' }}>{c.coilDisplayName}</div>
                </div>
                <StatusBadge status={c.status} recordState={c.recordState} />
              </div>
            ))}
          </div>
        </>
      )}

      {/* Add modal */}
      {adding && clinic && (
        <AddCoilModal
          clinicId={clinic._id}
          clinicScanners={scanners ?? []}
          onClose={() => setAdding(false)}
          onSave={handleAdd}
        />
      )}

      {/* Retire confirmation */}
      {retireId && (
        <div className="confirm-back open" onClick={() => !working && setRetireId(null)}>
          <div className="confirm-modal" onClick={e => e.stopPropagation()}>
            <div className="confirm-body">
              <h3>Retire coil?</h3>
              <p style={{ color:'var(--muted)', fontSize:14, lineHeight:1.6 }}>
                <strong style={{ color:'var(--text)' }}>{sorted.find(c => c._id === retireId)?.coilDisplayName}</strong><br/>
                This coil will be hidden from the MRI matrix resolver. You can ask your administrator to re-activate it.
              </p>
              {workErr && <p style={{ color:'var(--err)', fontSize:13, margin:0 }}>{workErr}</p>}
            </div>
            <div className="confirm-actions">
              <button className="btn" onClick={() => setRetireId(null)} disabled={working}>Cancel</button>
              <button className="btn btn-danger" onClick={handleRetire} disabled={working}>
                {working ? 'Retiring…' : 'Retire coil'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
