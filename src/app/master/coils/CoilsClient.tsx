'use client'

import { useState }            from 'react'
import { useQuery, useMutation } from 'convex/react'
import { api as apiBase }      from '../../../../convex/_generated/api'
import { CustomSelect }        from '@/components/ui/CustomSelect'
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const api = apiBase as any

// ── Types ──────────────────────────────────────────────────────────────────────

interface Clinic { _id: string; name: string }
interface Coil {
  _id:                  string
  siteId:               string
  coilName:             string
  coilManufacturer?:    string
  coilModel?:           string
  transmitCoilType?:    string
  fieldStrength:        string
  compatibleScannerIds: string[]
  status:               string
  recordState?:         string
  retiredAt?:           number
  notes?:               string
  createdAt?:           number
}

// ── Status badge ──────────────────────────────────────────────────────────────

function StatusBadge({ status, recordState }: { status: string; recordState?: string }) {
  if (status === 'retired') {
    return <span style={{ fontFamily: 'var(--ff)', fontSize: 11, fontWeight: 600, padding: '3px 8px', borderRadius: 6, background: 'rgba(var(--err-rgb),0.10)', color: 'var(--err)' }}>Retired</span>
  }
  if (recordState === 'Confirmed') {
    return <span style={{ fontFamily: 'var(--ff)', fontSize: 11, fontWeight: 600, padding: '3px 8px', borderRadius: 6, background: 'rgba(var(--ok-rgb),0.12)', color: 'var(--ok)' }}>Confirmed</span>
  }
  return <span style={{ fontFamily: 'var(--ff)', fontSize: 11, fontWeight: 600, padding: '3px 8px', borderRadius: 6, background: 'rgba(var(--accent-rgb),0.10)', color: 'var(--accent-deep)' }}>Active</span>
}

// ── Main component ────────────────────────────────────────────────────────────

export default function CoilsClient() {
  const clinics = useQuery(api.clinics.listClinics) as Clinic[] | undefined

  const [selectedClinicId, setSelectedClinicId] = useState('')
  const [confirm, setConfirm] = useState<{ id: string; name: string; action: 'retire' | 'confirm' } | null>(null)
  const [working, setWorking] = useState(false)
  const [workErr, setWorkErr] = useState('')

  const coils = useQuery(
    api.siteCoils.listAllCoilsBySite,
    selectedClinicId ? { siteId: selectedClinicId } : 'skip'
  ) as Coil[] | undefined

  const confirmCoil = useMutation(api.siteCoils.confirmCoil)
  const retireCoil  = useMutation(api.siteCoils.retireCoil)

  async function handleAction() {
    if (!confirm) return
    setWorking(true); setWorkErr('')
    try {
      if (confirm.action === 'confirm') {
        await confirmCoil({ id: confirm.id as never })
      } else {
        await retireCoil({ id: confirm.id as never })
      }
      setConfirm(null)
    } catch (e) {
      setWorkErr((e as { message?: string })?.message ?? 'Action failed')
    } finally {
      setWorking(false)
    }
  }

  const clinicOptions = (clinics ?? []).map(c => ({ value: c._id, label: c.name }))
  const sorted = [...(coils ?? [])].sort((a, b) => (a.coilName ?? '').localeCompare(b.coilName ?? ''))
  const activeCount  = sorted.filter(c => c.status === 'active').length
  const retiredCount = sorted.filter(c => c.status === 'retired').length

  return (
    <div className="m-content">
      {/* Header */}
      <div className="m-h">
        <div>
          <h2>Coil management</h2>
          <p className="sub">RF coils registered at clinic sites. Select a clinic to view and manage its coils.</p>
        </div>
      </div>

      {/* Clinic selector */}
      <div style={{ marginBottom: 24, maxWidth: 420 }}>
        <div className="field">
          <label>Clinic</label>
          <CustomSelect
            value={selectedClinicId}
            onChange={v => setSelectedClinicId(v)}
            options={clinicOptions}
            placeholder={clinics === undefined ? 'Loading clinics…' : 'Select a clinic…'}
          />
        </div>
      </div>

      {/* No clinic selected */}
      {!selectedClinicId && (
        <div style={{ padding: '48px 0', textAlign: 'center', fontFamily: 'var(--ff)', fontSize: 13.5, color: 'var(--muted)' }}>
          Select a clinic above to view its registered coils.
        </div>
      )}

      {/* Loading */}
      {selectedClinicId && coils === undefined && (
        <div style={{ padding: '32px 0', textAlign: 'center', fontFamily: 'var(--ff)', fontSize: 13, color: 'var(--muted)' }}>Loading coils…</div>
      )}

      {/* Coils loaded */}
      {selectedClinicId && coils !== undefined && (
        <>
          {/* Stats row */}
          <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
            {[
              { label: 'Total coils', value: sorted.length },
              { label: 'Active', value: activeCount, colour: 'var(--ok)' },
              { label: 'Retired', value: retiredCount, colour: 'var(--err)' },
            ].map(s => (
              <div key={s.label} style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 10, padding: '12px 18px', minWidth: 110 }}>
                <div style={{ fontFamily: 'var(--ff)', fontSize: 11, fontWeight: 600, letterSpacing: '1px', textTransform: 'uppercase', color: 'var(--muted2)', marginBottom: 4 }}>{s.label}</div>
                <div style={{ fontFamily: 'var(--ff)', fontSize: 22, fontWeight: 700, color: s.colour ?? 'var(--text)', fontVariantNumeric: 'tabular-nums' }}>{s.value}</div>
              </div>
            ))}
          </div>

          {/* Empty state */}
          {sorted.length === 0 && (
            <div style={{ padding: '48px 0', textAlign: 'center', fontFamily: 'var(--ff)', fontSize: 13.5, color: 'var(--muted)' }}>
              This clinic has no registered coils yet.<br/>
              <span style={{ fontSize: 12, color: 'var(--muted2)', marginTop: 4, display: 'block' }}>Coils are added from the clinic's coil management settings page.</span>
            </div>
          )}

          {/* Table */}
          {sorted.length > 0 && (
            <div className="m-tbl-wrap">
              <table className="m-tbl">
                <thead>
                  <tr>
                    <th>Coil name</th>
                    <th>Manufacturer / Model</th>
                    <th>Type</th>
                    <th>Field strength</th>
                    <th>Compatible scanners</th>
                    <th>Status</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {sorted.map(c => (
                    <tr key={c._id} style={{ opacity: c.status === 'retired' ? 0.6 : 1 }}>
                      <td style={{ fontFamily: 'var(--ff)', fontWeight: 500 }}>{c.coilName}</td>
                      <td style={{ fontFamily: 'var(--ff)', fontSize: 12.5, color: 'var(--muted)' }}>
                        {c.coilManufacturer && c.coilModel
                          ? `${c.coilManufacturer} ${c.coilModel}`
                          : (c.coilManufacturer ?? c.coilModel ?? '—')}
                      </td>
                      <td style={{ fontFamily: 'var(--ff)', fontSize: 12.5, color: 'var(--muted)' }}>{c.transmitCoilType ?? '—'}</td>
                      <td>
                        <span style={{ fontFamily: 'var(--ff)', fontSize: 11.5, fontWeight: 600, padding: '3px 8px', borderRadius: 6, background: 'rgba(var(--accent-rgb),0.10)', color: 'var(--accent-deep)' }}>
                          {c.fieldStrength}
                        </span>
                      </td>
                      <td style={{ fontFamily: 'var(--ff)', fontSize: 12.5, color: 'var(--muted)', fontVariantNumeric: 'tabular-nums' }}>
                        {c.compatibleScannerIds.length} scanner{c.compatibleScannerIds.length !== 1 ? 's' : ''}
                      </td>
                      <td><StatusBadge status={c.status} recordState={c.recordState} /></td>
                      <td>
                        <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                          {c.status === 'active' && c.recordState !== 'Confirmed' && (
                            <button
                              className="m-act approve"
                              onClick={() => setConfirm({ id: c._id, name: c.coilName, action: 'confirm' })}
                            >Confirm</button>
                          )}
                          {c.status === 'active' && (
                            <button
                              className="m-act reject"
                              onClick={() => setConfirm({ id: c._id, name: c.coilName, action: 'retire' })}
                            >Retire</button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {/* Confirm / Retire modal */}
      {confirm && (
        <div className="confirm-back open" onClick={() => !working && setConfirm(null)}>
          <div className="confirm-modal" onClick={e => e.stopPropagation()}>
            <div className="confirm-body">
              <h3>{confirm.action === 'confirm' ? 'Confirm coil' : 'Retire coil'}</h3>
              <p style={{ color: 'var(--muted)', fontSize: 14, lineHeight: 1.6 }}>
                {confirm.action === 'confirm'
                  ? <><strong style={{ color: 'var(--text)' }}>{confirm.name}</strong><br/>Mark this coil as confirmed? The clinic will be able to use it in the MRI matrix resolver.</>
                  : <><strong style={{ color: 'var(--text)' }}>{confirm.name}</strong><br/>Retire this coil? It will be hidden from the matrix resolver. This action is reversible.</>
                }
              </p>
              {workErr && <p style={{ color: 'var(--err)', fontSize: 13, margin: 0 }}>{workErr}</p>}
            </div>
            <div className="confirm-actions">
              <button className="btn" onClick={() => setConfirm(null)} disabled={working}>Cancel</button>
              <button
                className={`btn ${confirm.action === 'confirm' ? 'btn-s' : 'btn-danger'}`}
                onClick={handleAction}
                disabled={working}
              >
                {working ? 'Working…' : confirm.action === 'confirm' ? 'Confirm coil' : 'Retire coil'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
