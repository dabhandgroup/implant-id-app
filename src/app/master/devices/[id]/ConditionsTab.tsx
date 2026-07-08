'use client'

import { useState }            from 'react'
import { useQuery, useMutation } from 'convex/react'
import { api as apiBase }      from '../../../../../convex/_generated/api'
import { InlineSelect }        from '@/components/ui/CustomSelect'
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const api = apiBase as any

// ── Constants ──────────────────────────────────────────────────────────────────

const FIELD_STRENGTHS = ['0.55T', '1.5T', '3T', '7T', 'Any', 'N/A']

const ELIGIBILITY_TIERS = [
  'Full Body',
  'Head-Only',
  'Extremity Only',
  'Not Eligible',
  'N-A',
]

const INTEGRITY_STATES = [
  { value: '', label: 'Any / Not specified' },
  { value: 'Complete', label: 'Complete' },
  { value: 'Fractured-Suspected', label: 'Fractured-Suspected' },
  { value: 'Abandoned-Fragment', label: 'Abandoned-Fragment' },
  { value: 'Explanted-Partial', label: 'Explanted-Partial' },
  { value: 'Not Stated', label: 'Not Stated' },
]

const COIL_TYPES = [
  { value: '', label: 'Any / Not specified' },
  { value: 'Body transmit/receive', label: 'Body transmit/receive' },
  { value: 'Head transmit/receive', label: 'Head transmit/receive' },
  { value: 'Head transmit + surface receive', label: 'Head transmit + surface receive' },
  { value: 'Extremity coil', label: 'Extremity coil' },
  { value: 'Not Stated', label: 'Not Stated' },
]

const CONTEXT_STATUSES = [
  { value: '', label: 'None (use eligibilityTier)' },
  { value: 'Not Permitted', label: 'Not Permitted' },
  { value: 'Not Tested', label: 'Not Tested' },
  { value: 'Risk-Benefit Only', label: 'Risk-Benefit Only' },
]

const VERIFICATION_STATUSES = [
  { value: '', label: 'None' },
  { value: 'Extracted', label: 'Extracted' },
  { value: 'Verified', label: 'Verified' },
  { value: 'Pending Review', label: 'Pending Review' },
]

// ── Tier badge colour ─────────────────────────────────────────────────────────

function tierColour(tier: string) {
  if (tier === 'Full Body')  return { bg: 'rgba(var(--ok-rgb),0.12)', color: 'var(--ok)' }
  if (tier === 'Head-Only')  return { bg: 'rgba(var(--accent-rgb),0.10)', color: 'var(--accent-deep)' }
  if (tier === 'Not Eligible') return { bg: 'rgba(var(--err-rgb),0.10)', color: 'var(--err)' }
  return { bg: 'rgba(var(--muted-rgb),0.10)', color: 'var(--muted)' }
}

// ── Empty form ────────────────────────────────────────────────────────────────

const EMPTY: ConditionForm = {
  zoneLabel:                '',
  fieldStrength:            '',
  eligibilityTier:          '',
  deviceIntegrityState:     '',
  contextStatus:            '',
  transmitCoilType:         '',
  implantLocationCond:      '',
  operatingMode:            '',
  maxSpatialGradientCond:   '',
  maxSlewRateCond:          '',
  maxB1RmsVal:              '',
  maxSarWhole:              '',
  maxSarHead:               '',
  exclusionZoneApplies:     false,
  exclusionZoneDescription: '',
  regionExcluded:           '',
  maxScanTimeMins:          '',
  cooloffPeriodMins:        '',
  mriClassification:        '',
  verificationStatus:       '',
  conditionNotes:           '',
  patientPreconditions:     '',
  requiresVisualReview:     false,
  zoneIndex:                '',
}

interface ConditionForm {
  zoneLabel:                string
  fieldStrength:            string
  eligibilityTier:          string
  deviceIntegrityState:     string
  contextStatus:            string
  transmitCoilType:         string
  implantLocationCond:      string
  operatingMode:            string
  maxSpatialGradientCond:   string
  maxSlewRateCond:          string
  maxB1RmsVal:              string
  maxSarWhole:              string
  maxSarHead:               string
  exclusionZoneApplies:     boolean
  exclusionZoneDescription: string
  regionExcluded:           string
  maxScanTimeMins:          string
  cooloffPeriodMins:        string
  mriClassification:        string
  verificationStatus:       string
  conditionNotes:           string
  patientPreconditions:     string
  requiresVisualReview:     boolean
  zoneIndex:                string
}

// ── Section label ─────────────────────────────────────────────────────────────

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ fontFamily: 'var(--ff)', fontSize: 10.5, fontWeight: 700, letterSpacing: '1px', textTransform: 'uppercase', color: 'var(--muted2)', marginBottom: 12, marginTop: 24 }}>
      {children}
    </div>
  )
}

// ── Add / Edit modal ───────────────────────────────────────────────────────────

function ConditionModal({
  initial,
  onClose,
  onSave,
}: {
  initial?: ConditionForm & { _id?: string }
  onClose: () => void
  onSave:  (f: ConditionForm) => Promise<void>
}) {
  const [form,   setForm]   = useState<ConditionForm>(initial ?? EMPTY)
  const [saving, setSaving] = useState(false)
  const [error,  setError]  = useState('')

  function set<K extends keyof ConditionForm>(k: K, v: ConditionForm[K]) {
    setForm(f => ({ ...f, [k]: v }))
  }

  async function handleSave() {
    if (!form.zoneLabel.trim())   return setError('Zone label is required')
    if (!form.fieldStrength)      return setError('Field strength is required')
    if (!form.eligibilityTier && !form.contextStatus) return setError('Eligibility tier or context status is required')
    setSaving(true); setError('')
    try {
      await onSave(form)
      onClose()
    } catch (e) {
      setError((e as { message?: string })?.message ?? 'Something went wrong')
      setSaving(false)
    }
  }

  const numOpt = (v: string) => v !== '' ? Number(v) : undefined

  return (
    <div
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 400, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div
        style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 16, width: '100%', maxWidth: 680, maxHeight: '90vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}
        role="dialog" aria-modal="true" aria-label={initial?._id ? 'Edit condition' : 'Add condition'}
        onClick={e => e.stopPropagation()}
      >
        {/* Modal header */}
        <div style={{ padding: '18px 24px 14px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
          <h3 style={{ margin: 0, fontFamily: 'var(--ff)', fontSize: 16, fontWeight: 700, color: 'var(--text)' }}>
            {initial?._id ? 'Edit condition' : 'Add MRI condition'}
          </h3>
          <button onClick={onClose} aria-label="Close" style={{ background: 'none', border: 0, cursor: 'pointer', color: 'var(--muted)', fontSize: 20, lineHeight: 1, padding: 4 }}>✕</button>
        </div>

        {/* Scrollable body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '16px 24px 24px' }}>
          {error && (
            <div style={{ background: 'rgba(var(--err-rgb),0.08)', border: '1px solid rgba(var(--err-rgb),0.25)', borderRadius: 8, padding: '10px 14px', color: 'var(--err)', fontFamily: 'var(--ff)', fontSize: 13, marginBottom: 16 }}>
              {error}
            </div>
          )}

          <SectionLabel>Identity</SectionLabel>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div className="field" style={{ gridColumn: '1 / -1' }}>
              <label>Zone label <span style={{ color: 'var(--err)', marginLeft: 3 }}>*</span></label>
              <input className="input" value={form.zoneLabel} onChange={e => set('zoneLabel', e.target.value)} placeholder="e.g. Full Body — 1.5T" />
            </div>
            <div className="field">
              <label>Field strength <span style={{ color: 'var(--err)', marginLeft: 3 }}>*</span></label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {FIELD_STRENGTHS.map(fs => (
                  <button key={fs} type="button"
                    onClick={() => set('fieldStrength', fs)}
                    aria-pressed={form.fieldStrength === fs}
                    style={{ fontFamily: 'var(--ff)', fontSize: 12.5, fontWeight: 500, padding: '5px 12px', borderRadius: 8, cursor: 'pointer', transition: 'all .12s',
                      border: form.fieldStrength === fs ? '1.5px solid var(--accent)' : '1px solid var(--border)',
                      background: form.fieldStrength === fs ? 'rgba(var(--accent-rgb),0.10)' : 'var(--bg)',
                      color: form.fieldStrength === fs ? 'var(--accent-deep)' : 'var(--muted)',
                    }}
                  >{fs}</button>
                ))}
              </div>
            </div>
            <div className="field">
              <label>Zone index <span style={{ fontWeight: 400, opacity: .6 }}>(sort order)</span></label>
              <input className="input" type="number" min="1" value={form.zoneIndex} onChange={e => set('zoneIndex', e.target.value)} placeholder="e.g. 1" />
            </div>
          </div>

          <SectionLabel>Eligibility</SectionLabel>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div className="field">
              <label>Eligibility tier</label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {ELIGIBILITY_TIERS.map(t => (
                  <button key={t} type="button"
                    onClick={() => set('eligibilityTier', form.eligibilityTier === t ? '' : t)}
                    aria-pressed={form.eligibilityTier === t}
                    style={{ fontFamily: 'var(--ff)', fontSize: 12, fontWeight: 500, padding: '4px 10px', borderRadius: 7, cursor: 'pointer', transition: 'all .12s',
                      border: form.eligibilityTier === t ? '1.5px solid var(--accent)' : '1px solid var(--border)',
                      background: form.eligibilityTier === t ? 'rgba(var(--accent-rgb),0.10)' : 'var(--bg)',
                      color: form.eligibilityTier === t ? 'var(--accent-deep)' : 'var(--muted)',
                    }}
                  >{t}</button>
                ))}
              </div>
            </div>
            <div className="field">
              <label>Context status <span style={{ fontWeight: 400, opacity: .6 }}>(overrides tier)</span></label>
              <InlineSelect
                value={form.contextStatus}
                onChange={v => set('contextStatus', v)}
                options={CONTEXT_STATUSES}
                placeholder="None"
              />
            </div>
            <div className="field">
              <label>Device integrity state</label>
              <InlineSelect
                value={form.deviceIntegrityState}
                onChange={v => set('deviceIntegrityState', v)}
                options={INTEGRITY_STATES}
                placeholder="Any / Not specified"
              />
            </div>
            <div className="field">
              <label>MRI classification</label>
              <input className="input" value={form.mriClassification} onChange={e => set('mriClassification', e.target.value)} placeholder="e.g. MR Conditional" />
            </div>
          </div>

          <SectionLabel>Hardware conditions</SectionLabel>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div className="field">
              <label>Transmit coil type</label>
              <InlineSelect
                value={form.transmitCoilType}
                onChange={v => set('transmitCoilType', v)}
                options={COIL_TYPES}
                placeholder="Any / Not specified"
              />
            </div>
            <div className="field">
              <label>Operating mode</label>
              <input className="input" value={form.operatingMode} onChange={e => set('operatingMode', e.target.value)} placeholder="e.g. Normal; First Level" />
            </div>
            <div className="field">
              <label>Max spatial gradient (T/m)</label>
              <input className="input" type="number" min="0" step="0.1" value={form.maxSpatialGradientCond} onChange={e => set('maxSpatialGradientCond', e.target.value)} placeholder="e.g. 20" />
            </div>
            <div className="field">
              <label>Max slew rate (T/m/s)</label>
              <input className="input" type="number" min="0" value={form.maxSlewRateCond} onChange={e => set('maxSlewRateCond', e.target.value)} placeholder="e.g. 200" />
            </div>
            <div className="field">
              <label>Max B1+rms (µT)</label>
              <input className="input" type="number" min="0" step="0.1" value={form.maxB1RmsVal} onChange={e => set('maxB1RmsVal', e.target.value)} placeholder="e.g. 2.0" />
            </div>
            <div className="field">
              <label>Implant location condition</label>
              <input className="input" value={form.implantLocationCond} onChange={e => set('implantLocationCond', e.target.value)} placeholder="e.g. Upper Left Chest (above rib 4)" />
            </div>
            <div className="field">
              <label>Max whole-body SAR (W/kg)</label>
              <input className="input" type="number" min="0" step="0.1" value={form.maxSarWhole} onChange={e => set('maxSarWhole', e.target.value)} placeholder="e.g. 2.0" />
            </div>
            <div className="field">
              <label>Max head SAR (W/kg)</label>
              <input className="input" type="number" min="0" step="0.1" value={form.maxSarHead} onChange={e => set('maxSarHead', e.target.value)} placeholder="e.g. 3.2" />
            </div>
          </div>

          <SectionLabel>Exclusion zone</SectionLabel>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
            <button
              type="button"
              role="switch"
              aria-checked={form.exclusionZoneApplies}
              onClick={() => set('exclusionZoneApplies', !form.exclusionZoneApplies)}
              style={{ width: 40, height: 22, borderRadius: 11, border: 0, cursor: 'pointer', position: 'relative', transition: 'background .15s',
                background: form.exclusionZoneApplies ? 'var(--accent)' : 'var(--border)' }}
            >
              <span style={{ position: 'absolute', top: 3, left: form.exclusionZoneApplies ? 21 : 3, width: 16, height: 16, borderRadius: '50%', background: '#fff', transition: 'left .15s' }} />
            </button>
            <span style={{ fontFamily: 'var(--ff)', fontSize: 13, color: 'var(--text)' }}>Exclusion zone applies</span>
          </div>
          {form.exclusionZoneApplies && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div className="field" style={{ gridColumn: '1 / -1' }}>
                <label>Exclusion zone description</label>
                <input className="input" value={form.exclusionZoneDescription} onChange={e => set('exclusionZoneDescription', e.target.value)} placeholder="e.g. Isocentre must not fall within C7–T8" />
              </div>
              <div className="field">
                <label>Region excluded</label>
                <input className="input" value={form.regionExcluded} onChange={e => set('regionExcluded', e.target.value)} placeholder="e.g. Chest/T-spine (T1–T8 region)" />
              </div>
            </div>
          )}

          <SectionLabel>Scan time limits</SectionLabel>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div className="field">
              <label>Max scan time (mins)</label>
              <input className="input" type="number" min="0" value={form.maxScanTimeMins} onChange={e => set('maxScanTimeMins', e.target.value)} placeholder="e.g. 30" />
            </div>
            <div className="field">
              <label>Cooloff period (mins)</label>
              <input className="input" type="number" min="0" value={form.cooloffPeriodMins} onChange={e => set('cooloffPeriodMins', e.target.value)} placeholder="e.g. 60" />
            </div>
          </div>

          <SectionLabel>Clinical notes</SectionLabel>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div className="field">
              <label>Verification status</label>
              <InlineSelect
                value={form.verificationStatus}
                onChange={v => set('verificationStatus', v)}
                options={VERIFICATION_STATUSES}
                placeholder="None"
              />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 24 }}>
              <button
                type="button"
                role="switch"
                aria-checked={form.requiresVisualReview}
                onClick={() => set('requiresVisualReview', !form.requiresVisualReview)}
                style={{ width: 40, height: 22, borderRadius: 11, border: 0, cursor: 'pointer', position: 'relative', transition: 'background .15s',
                  background: form.requiresVisualReview ? 'var(--accent)' : 'var(--border)' }}
              >
                <span style={{ position: 'absolute', top: 3, left: form.requiresVisualReview ? 21 : 3, width: 16, height: 16, borderRadius: '50%', background: '#fff', transition: 'left .15s' }} />
              </button>
              <span style={{ fontFamily: 'var(--ff)', fontSize: 13, color: 'var(--text)' }}>Requires visual review</span>
            </div>
            <div className="field" style={{ gridColumn: '1 / -1' }}>
              <label>Patient preconditions</label>
              <textarea className="input" rows={2} value={form.patientPreconditions} onChange={e => set('patientPreconditions', e.target.value)} placeholder="e.g. SureScan mode enabled; device programmed to MRI mode" style={{ resize: 'vertical' }} />
            </div>
            <div className="field" style={{ gridColumn: '1 / -1' }}>
              <label>Condition notes / source</label>
              <textarea className="input" rows={2} value={form.conditionNotes} onChange={e => set('conditionNotes', e.target.value)} placeholder="e.g. Source: L01 from prototype. Head coil only when lead integrity suspected." style={{ resize: 'vertical' }} />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div style={{ padding: '14px 24px 18px', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'flex-end', gap: 10, flexShrink: 0 }}>
          <button className="btn" onClick={onClose} disabled={saving}>Cancel</button>
          <button className="btn btn-s" onClick={handleSave} disabled={saving}>
            {saving ? 'Saving…' : (initial?._id ? 'Save changes' : 'Add condition')}
          </button>
        </div>
      </div>
    </div>
  )

  // Unused but satisfies the compiler: build the args shape for createCondition/updateCondition
  void numOpt
}

// ── Main component ────────────────────────────────────────────────────────────

export default function ConditionsTab({ deviceId }: { deviceId: string }) {
  const conditions = useQuery(api.deviceConditions.listConditionsByDevice, { parentId: deviceId })
  const createCondition = useMutation(api.deviceConditions.createCondition)
  const updateCondition = useMutation(api.deviceConditions.updateCondition)
  const deleteCondition = useMutation(api.deviceConditions.deleteCondition)

  const [adding,      setAdding]      = useState(false)
  const [editing,     setEditing]     = useState<(ConditionForm & { _id: string }) | null>(null)
  const [delConfirm,  setDelConfirm]  = useState<{ id: string; label: string } | null>(null)
  const [deleting,    setDeleting]    = useState(false)
  const [delError,    setDelError]    = useState('')

  function formToArgs(f: ConditionForm, parentId: string) {
    const n = (v: string) => v !== '' ? Number(v) : undefined
    return {
      parentId,
      zoneLabel:                f.zoneLabel.trim()                || undefined,
      fieldStrength:            f.fieldStrength,
      eligibilityTier:          f.eligibilityTier                 || undefined,
      deviceIntegrityState:     f.deviceIntegrityState            || undefined,
      contextStatus:            f.contextStatus                   || undefined,
      transmitCoilType:         f.transmitCoilType                || undefined,
      implantLocationCond:      f.implantLocationCond.trim()      || undefined,
      operatingMode:            f.operatingMode.trim()            || undefined,
      maxSpatialGradientCond:   n(f.maxSpatialGradientCond),
      maxSlewRateCond:          n(f.maxSlewRateCond),
      maxB1RmsVal:              n(f.maxB1RmsVal),
      maxSarWhole:              n(f.maxSarWhole),
      maxSarHead:               n(f.maxSarHead),
      exclusionZoneApplies:     f.exclusionZoneApplies            || undefined,
      exclusionZoneDescription: f.exclusionZoneDescription.trim() || undefined,
      regionExcluded:           f.regionExcluded.trim()           || undefined,
      maxScanTimeMins:          n(f.maxScanTimeMins),
      cooloffPeriodMins:        n(f.cooloffPeriodMins),
      mriClassification:        f.mriClassification.trim()        || undefined,
      verificationStatus:       f.verificationStatus              || undefined,
      conditionNotes:           f.conditionNotes.trim()           || undefined,
      patientPreconditions:     f.patientPreconditions.trim()     || undefined,
      requiresVisualReview:     f.requiresVisualReview            || undefined,
      zoneIndex:                n(f.zoneIndex),
    }
  }

  async function handleCreate(f: ConditionForm) {
    await createCondition(formToArgs(f, deviceId) as never)
  }

  async function handleEdit(f: ConditionForm) {
    if (!editing) return
    const { parentId: _p, ...rest } = formToArgs(f, deviceId)
    void _p
    await updateCondition({ id: editing._id as never, ...rest } as never)
  }

  async function handleDelete() {
    if (!delConfirm) return
    setDeleting(true); setDelError('')
    try {
      await deleteCondition({ id: delConfirm.id as never })
      setDelConfirm(null)
    } catch (e) {
      setDelError((e as { message?: string })?.message ?? 'Delete failed')
    } finally {
      setDeleting(false)
    }
  }

  function rowToForm(c: NonNullable<typeof conditions>[number] & { _id: string }): ConditionForm & { _id: string } {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const d = c as any
    return {
      _id:                      d._id,
      zoneLabel:                d.zoneLabel                ?? '',
      fieldStrength:            d.fieldStrength            ?? '',
      eligibilityTier:          d.eligibilityTier          ?? '',
      deviceIntegrityState:     d.deviceIntegrityState     ?? '',
      contextStatus:            d.contextStatus            ?? '',
      transmitCoilType:         d.transmitCoilType         ?? '',
      implantLocationCond:      d.implantLocationCond      ?? '',
      operatingMode:            d.operatingMode            ?? '',
      maxSpatialGradientCond:   d.maxSpatialGradientCond   != null ? String(d.maxSpatialGradientCond) : '',
      maxSlewRateCond:          d.maxSlewRateCond          != null ? String(d.maxSlewRateCond) : '',
      maxB1RmsVal:              d.maxB1RmsVal              != null ? String(d.maxB1RmsVal) : '',
      maxSarWhole:              d.maxSarWhole              != null ? String(d.maxSarWhole) : '',
      maxSarHead:               d.maxSarHead               != null ? String(d.maxSarHead) : '',
      exclusionZoneApplies:     d.exclusionZoneApplies     ?? false,
      exclusionZoneDescription: d.exclusionZoneDescription ?? '',
      regionExcluded:           d.regionExcluded           ?? '',
      maxScanTimeMins:          d.maxScanTimeMins          != null ? String(d.maxScanTimeMins) : '',
      cooloffPeriodMins:        d.cooloffPeriodMins        != null ? String(d.cooloffPeriodMins) : '',
      mriClassification:        d.mriClassification        ?? '',
      verificationStatus:       d.verificationStatus       ?? '',
      conditionNotes:           d.conditionNotes           ?? '',
      patientPreconditions:     d.patientPreconditions     ?? '',
      requiresVisualReview:     d.requiresVisualReview     ?? false,
      zoneIndex:                d.zoneIndex                != null ? String(d.zoneIndex) : '',
    }
  }

  // ── Loading state ────────────────────────────────────────────────────────────
  if (conditions === undefined) {
    return <div style={{ padding: '48px 0', textAlign: 'center', fontFamily: 'var(--ff)', fontSize: 13, color: 'var(--muted)' }}>Loading conditions…</div>
  }

  const sorted = [...(conditions ?? [])].sort((a, b) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const ai = (a as any).zoneIndex ?? 999, bi = (b as any).zoneIndex ?? 999
    return ai - bi
  })

  return (
    <div>
      {/* Header row */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <div>
          <h3 style={{ margin: 0, fontFamily: 'var(--ff)', fontSize: 16, fontWeight: 700, color: 'var(--text)' }}>MRI Conditions</h3>
          <p style={{ margin: '4px 0 0', fontFamily: 'var(--ff)', fontSize: 13, color: 'var(--muted)' }}>
            Gate-walk condition leaves for this device. Absence of a condition = FAIL (closed-world).
          </p>
        </div>
        <button className="btn btn-s" onClick={() => setAdding(true)}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ marginRight: 6 }} aria-hidden="true">
            <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
          Add condition
        </button>
      </div>

      {/* Empty state */}
      {sorted.length === 0 && (
        <div style={{ background: 'rgba(var(--err-rgb),0.06)', border: '1.5px dashed rgba(var(--err-rgb),0.35)', borderRadius: 12, padding: '32px 24px', textAlign: 'center' }}>
          <div style={{ fontFamily: 'var(--ff)', fontSize: 14, fontWeight: 600, color: 'var(--err)', marginBottom: 8 }}>No conditions — closed world FAIL</div>
          <div style={{ fontFamily: 'var(--fb)', fontSize: 13, color: 'var(--muted)', lineHeight: 1.6 }}>
            An MR Conditional device with zero condition records will always return FAIL from the matrix resolver.<br/>
            Add at least one condition leaf to enable scanning.
          </div>
        </div>
      )}

      {/* Conditions table */}
      {sorted.length > 0 && (
        <div style={{ overflowX: 'auto' }}>
          <table className="m-tbl" style={{ minWidth: 780 }}>
            <thead>
              <tr>
                <th style={{ width: 32 }}>#</th>
                <th>Zone label</th>
                <th>Strength</th>
                <th>Tier</th>
                <th>Coil type</th>
                <th>Max B1+rms</th>
                <th>Max SAR WB</th>
                <th>Excl. zone</th>
                <th>Verified</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((c) => {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const d = c as any
                const tc = d.eligibilityTier ? tierColour(d.eligibilityTier) : tierColour('')
                return (
                  <tr key={d._id}>
                    <td style={{ color: 'var(--muted2)', fontSize: 12 }}>{d.zoneIndex ?? '—'}</td>
                    <td style={{ fontFamily: 'var(--ff)', fontWeight: 500, maxWidth: 220 }}>
                      <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{d.zoneLabel ?? '—'}</div>
                      {d.contextStatus && (
                        <div style={{ fontFamily: 'var(--ff)', fontSize: 11, color: 'var(--err)', marginTop: 2 }}>{d.contextStatus}</div>
                      )}
                    </td>
                    <td><span style={{ fontFamily: 'var(--ff)', fontSize: 11.5, fontWeight: 600, padding: '3px 8px', borderRadius: 6, background: 'rgba(var(--accent-rgb),0.10)', color: 'var(--accent-deep)' }}>{d.fieldStrength ?? '—'}</span></td>
                    <td>
                      {d.eligibilityTier ? (
                        <span style={{ fontFamily: 'var(--ff)', fontSize: 11.5, fontWeight: 600, padding: '3px 8px', borderRadius: 6, ...tc }}>{d.eligibilityTier}</span>
                      ) : '—'}
                    </td>
                    <td style={{ fontFamily: 'var(--ff)', fontSize: 12.5, color: 'var(--muted)', maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {d.transmitCoilType ?? '—'}
                    </td>
                    <td style={{ fontFamily: 'var(--ff)', fontSize: 12.5, color: 'var(--text)', fontVariantNumeric: 'tabular-nums' }}>
                      {d.maxB1RmsVal != null ? `${d.maxB1RmsVal} µT` : '—'}
                    </td>
                    <td style={{ fontFamily: 'var(--ff)', fontSize: 12.5, color: 'var(--text)', fontVariantNumeric: 'tabular-nums' }}>
                      {d.maxSarWhole != null ? `${d.maxSarWhole} W/kg` : '—'}
                    </td>
                    <td>
                      {d.exclusionZoneApplies
                        ? <span style={{ fontFamily: 'var(--ff)', fontSize: 11, fontWeight: 600, color: '#b45309', background: 'rgba(180,83,9,0.10)', padding: '2px 7px', borderRadius: 5 }}>Yes</span>
                        : <span style={{ color: 'var(--muted2)', fontSize: 12 }}>No</span>}
                    </td>
                    <td>
                      {d.verificationStatus
                        ? <span style={{ fontFamily: 'var(--ff)', fontSize: 11, fontWeight: 600, color: 'var(--ok)', background: 'rgba(var(--ok-rgb),0.10)', padding: '2px 7px', borderRadius: 5 }}>{d.verificationStatus}</span>
                        : <span style={{ color: 'var(--muted2)', fontSize: 12 }}>—</span>}
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                        <button
                          className="m-act"
                          onClick={() => setEditing(rowToForm(c as NonNullable<typeof conditions>[number] & { _id: string }))}
                        >Edit</button>
                        <button
                          className="m-act reject"
                          onClick={() => setDelConfirm({ id: d._id, label: d.zoneLabel ?? 'this condition' })}
                        >Delete</button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Add modal */}
      {adding && (
        <ConditionModal onClose={() => setAdding(false)} onSave={handleCreate} />
      )}

      {/* Edit modal */}
      {editing && (
        <ConditionModal initial={editing} onClose={() => setEditing(null)} onSave={handleEdit} />
      )}

      {/* Delete confirmation */}
      {delConfirm && (
        <div
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 500, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
          onClick={() => !deleting && setDelConfirm(null)}
        >
          <div
            style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 16, maxWidth: 420, width: '100%', overflow: 'hidden' }}
            onClick={e => e.stopPropagation()}
          >
            <div className="confirm-body">
              <div style={{ width: 48, height: 48, borderRadius: '50%', background: 'rgba(var(--err-rgb),0.12)', display: 'grid', placeItems: 'center', margin: '0 auto 14px' }}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--err)" strokeWidth="1.8" aria-hidden="true">
                  <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6M14 11v6"/>
                </svg>
              </div>
              <h3>Delete condition?</h3>
              <p style={{ color: 'var(--muted)', fontSize: 14, lineHeight: 1.6 }}>
                Delete <strong style={{ color: 'var(--text)' }}>"{delConfirm.label}"</strong>?<br/>
                This removes it from the gate-walk permanently.
              </p>
              {delError && <p style={{ color: 'var(--err)', fontSize: 13, margin: 0 }}>{delError}</p>}
            </div>
            <div className="confirm-actions">
              <button className="btn" onClick={() => setDelConfirm(null)} disabled={deleting}>Cancel</button>
              <button className="btn btn-danger" onClick={handleDelete} disabled={deleting}>
                {deleting ? 'Deleting…' : 'Delete condition'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
