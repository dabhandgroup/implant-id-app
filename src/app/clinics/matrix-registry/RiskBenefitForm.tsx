'use client'

import { useState } from 'react'

// ── Types ──────────────────────────────────────────────────────────────────────

interface Resolution {
  verdict:             string
  combinedConstraints: string[]
  systems?:            Array<{ label: string; verdict: string }>
  weightAlert?:        string | null
}

interface RiskBenefitFormProps {
  patientId?:   string
  scannerId:    string
  coilId?:      string
  bodyRegion:   string
  resolution:   Resolution
  onClose:      () => void
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  createRvb:    (args: any) => Promise<string>
}

const DECISIONS = [
  { value: 'Proceed',         label: 'Proceed',         colour: 'var(--ok)' },
  { value: 'Do Not Proceed',  label: 'Do Not Proceed',  colour: 'var(--err)' },
  { value: 'Deferred',        label: 'Deferred',        colour: '#b45309' },
] as const

// ── Component ─────────────────────────────────────────────────────────────────

export default function RiskBenefitForm({
  patientId,
  scannerId,
  coilId,
  bodyRegion,
  resolution,
  onClose,
  createRvb,
}: RiskBenefitFormProps) {
  const [decision,            setDecision]            = useState<'Proceed' | 'Do Not Proceed' | 'Deferred'>('Proceed')
  const [indication,          setIndication]          = useState('')
  const [reasonForProceeding, setReasonForProceeding] = useState('')
  const [clinicianName,       setClinicianName]       = useState('')
  const [clinicianRole,       setClinicianRole]       = useState('')
  const [saving,              setSaving]              = useState(false)
  const [saved,               setSaved]               = useState(false)
  const [rvbId,               setRvbId]               = useState<string | null>(null)
  const [error,               setError]               = useState('')

  async function handleSubmit() {
    if (!indication.trim())    return setError('Clinical indication is required')
    if (!clinicianName.trim()) return setError('Clinician name is required')
    if (!clinicianRole.trim()) return setError('Clinician role is required')
    setSaving(true); setError('')
    try {
      const id = await createRvb({
        ...(patientId ? { patientId: patientId as never } : {}),
        scannerId:               scannerId as never,
        ...(coilId ? { coilId: coilId as never } : {}),
        bodyRegion,
        indication:              indication.trim(),
        decision,
        reasonForProceeding:     reasonForProceeding.trim() || undefined,
        clinicianName:           clinicianName.trim(),
        clinicianRole:           clinicianRole.trim(),
        resolvedOutcomeCache:    resolution.verdict,
        resolvedConditionIds:    (resolution.systems ?? []).flatMap(s => (s as never as { conditionId?: string }).conditionId ? [(s as never as { conditionId: string }).conditionId] : []),
        resolvedConstraintsJson: JSON.stringify(resolution.combinedConstraints),
        resolutionTimestamp:     Date.now(),
      })
      setRvbId(id as string)
      setSaved(true)
    } catch (e) {
      setError((e as { message?: string })?.message ?? 'Failed to create record')
      setSaving(false)
    }
  }

  return (
    <div
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.50)', zIndex: 500, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
      onClick={e => { if (e.target === e.currentTarget && !saving) onClose() }}
    >
      <div
        style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 16, width: '100%', maxWidth: 560, maxHeight: '90vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}
        role="dialog" aria-modal="true" aria-label="Risk-Benefit record"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ padding: '18px 24px 14px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
          <div>
            <h3 style={{ margin: 0, fontFamily: 'var(--ff)', fontSize: 16, fontWeight: 700, color: 'var(--text)' }}>Risk-Benefit record</h3>
            <p style={{ margin: '3px 0 0', fontFamily: 'var(--ff)', fontSize: 12, color: 'var(--muted)' }}>Pre-scan clinical decision — sign-off required</p>
          </div>
          <button onClick={onClose} aria-label="Close" style={{ background: 'none', border: 0, cursor: 'pointer', color: 'var(--muted)', fontSize: 20, lineHeight: 1, padding: 4 }}>✕</button>
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '16px 24px 24px' }}>
          {/* Saved state */}
          {saved ? (
            <div style={{ textAlign: 'center', padding: '32px 0' }}>
              <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'rgba(var(--ok-rgb),0.12)', display: 'grid', placeItems: 'center', margin: '0 auto 16px' }}>
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--ok)" strokeWidth="2" aria-hidden="true">
                  <polyline points="20 6 9 17 4 12"/>
                </svg>
              </div>
              <div style={{ fontFamily: 'var(--ff)', fontSize: 16, fontWeight: 700, color: 'var(--text)', marginBottom: 6 }}>Record saved</div>
              <div style={{ fontFamily: 'var(--ff)', fontSize: 13, color: 'var(--muted)', lineHeight: 1.6 }}>
                Decision: <strong style={{ color: 'var(--text)' }}>{decision}</strong><br/>
                {rvbId && <span style={{ fontSize: 11.5, color: 'var(--muted2)', fontFamily: 'monospace' }}>{rvbId}</span>}
              </div>
            </div>
          ) : (
            <>
              {error && (
                <div style={{ background: 'rgba(var(--err-rgb),0.08)', border: '1px solid rgba(var(--err-rgb),0.25)', borderRadius: 8, padding: '10px 14px', color: 'var(--err)', fontFamily: 'var(--ff)', fontSize: 13, marginBottom: 16 }}>
                  {error}
                </div>
              )}

              {/* Matrix verdict summary */}
              <div style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 10, padding: '12px 14px', marginBottom: 16 }}>
                <div style={{ fontFamily: 'var(--ff)', fontSize: 11, fontWeight: 700, letterSpacing: '1px', textTransform: 'uppercase', color: 'var(--muted2)', marginBottom: 6 }}>Matrix verdict snapshot</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                  <span style={{ fontFamily: 'var(--ff)', fontSize: 13.5, fontWeight: 700, color: resolution.verdict === 'PASS' ? 'var(--ok)' : resolution.verdict === 'FAIL' ? 'var(--err)' : '#b45309' }}>
                    {resolution.verdict}
                  </span>
                  <span style={{ fontFamily: 'var(--ff)', fontSize: 12, color: 'var(--muted)' }}>
                    {bodyRegion}
                  </span>
                  {resolution.combinedConstraints.length > 0 && (
                    <span style={{ fontFamily: 'var(--ff)', fontSize: 12, color: 'var(--muted)' }}>
                      · {resolution.combinedConstraints.length} constraint{resolution.combinedConstraints.length !== 1 ? 's' : ''}
                    </span>
                  )}
                </div>
              </div>

              {/* Clinical decision */}
              <div style={{ fontFamily: 'var(--ff)', fontSize: 11, fontWeight: 700, letterSpacing: '1px', textTransform: 'uppercase', color: 'var(--muted2)', marginBottom: 8 }}>Decision</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginBottom: 16 }}>
                {DECISIONS.map(d => (
                  <button key={d.value} type="button"
                    onClick={() => setDecision(d.value)}
                    aria-pressed={decision === d.value}
                    style={{ fontFamily: 'var(--ff)', fontSize: 12.5, fontWeight: 600, padding: '9px 8px', borderRadius: 9, cursor: 'pointer', transition: 'all .12s', textAlign: 'center',
                      border: decision === d.value ? `1.5px solid ${d.colour}` : '1px solid var(--border)',
                      background: decision === d.value ? `${d.colour}18` : 'var(--bg)',
                      color: decision === d.value ? d.colour : 'var(--muted)',
                    }}
                  >{d.label}</button>
                ))}
              </div>

              <div className="field">
                <label>Clinical indication <span style={{ color: 'var(--err)', marginLeft: 3 }}>*</span></label>
                <textarea className="input" rows={2} value={indication} onChange={e => setIndication(e.target.value)}
                  placeholder="e.g. Cardiac MRI — investigation of suspected hypertrophic cardiomyopathy"
                  style={{ resize: 'vertical' }} />
              </div>

              {decision === 'Proceed' && (
                <div className="field">
                  <label>Reason for proceeding <span style={{ fontWeight: 400, opacity: .6 }}>(optional)</span></label>
                  <textarea className="input" rows={2} value={reasonForProceeding} onChange={e => setReasonForProceeding(e.target.value)}
                    placeholder="e.g. Benefits of diagnostic scan outweigh risks; patient consented and understands constraints"
                    style={{ resize: 'vertical' }} />
                </div>
              )}

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div className="field">
                  <label>Clinician name <span style={{ color: 'var(--err)', marginLeft: 3 }}>*</span></label>
                  <input className="input" value={clinicianName} onChange={e => setClinicianName(e.target.value)} placeholder="Full name" />
                </div>
                <div className="field">
                  <label>Role / designation <span style={{ color: 'var(--err)', marginLeft: 3 }}>*</span></label>
                  <input className="input" value={clinicianRole} onChange={e => setClinicianRole(e.target.value)} placeholder="e.g. Consultant Radiologist" />
                </div>
              </div>

              <div style={{ background: 'rgba(var(--muted-rgb),0.06)', border: '1px solid var(--border)', borderRadius: 8, padding: '10px 14px', fontFamily: 'var(--ff)', fontSize: 12.5, color: 'var(--muted)', lineHeight: 1.6, marginTop: 4 }}>
                By submitting this record you confirm that you have reviewed the matrix output and take clinical responsibility for this decision. The matrix verdict snapshot is frozen at the time of submission.
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div style={{ padding: '14px 24px 18px', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'flex-end', gap: 10, flexShrink: 0 }}>
          <button className="btn" onClick={onClose}>{saved ? 'Close' : 'Cancel'}</button>
          {!saved && (
            <button className="btn btn-s" onClick={handleSubmit} disabled={saving}>
              {saving ? 'Saving…' : 'Sign and submit'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
