'use client'

import { useState }       from 'react'
import { useQuery, useMutation } from 'convex/react'
import { useRouter }      from 'next/navigation'
import { api as apiBase } from '../../../../../convex/_generated/api'
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const api = apiBase as any

type MriStatus      = 'safe' | 'conditional' | 'unsafe' | 'unknown'
type Classification = 'active' | 'passive' | 'legacy'

const MRI_OPTIONS: { value: MriStatus; label: string; color: string; icon?: string }[] = [
  { value: 'conditional', label: 'MR Conditional', color: '#b45309',      icon: '/mr-conditional.svg' },
  { value: 'safe',        label: 'MR Safe',        color: 'var(--ok)',    icon: '/mr-safe.svg' },
  { value: 'unsafe',      label: 'MR Unsafe',      color: 'var(--err)',   icon: '/mr-unsafe.svg' },
  { value: 'unknown',     label: 'Unknown',         color: 'var(--muted)', icon: undefined },
]

const REGION_OPTIONS = ['UK', 'EU', 'USA', 'Canada', 'Australia', 'New Zealand', 'Global']

function Divider() {
  return <div style={{ height: 1, background: 'var(--border)', margin: '28px 0' }} />
}

export default function AddMfrDeviceClient() {
  const router                = useRouter()
  const mfr                   = useQuery(api.manufacturers.getMyManufacturer)
  const submitDevice          = useMutation(api.manufacturers.submitDeviceForReview)

  // ── All hooks unconditionally at top ─────────────────────────────────────
  const [model,           setModel]           = useState('')
  const [deviceType,      setDeviceType]      = useState('')
  const [classification,  setClassification]  = useState<Classification>('active')
  const [mriStatus,       setMriStatus]       = useState<MriStatus>('conditional')
  const [fieldStrengths,  setFieldStrengths]  = useState('')
  const [sarLimit,        setSarLimit]        = useState('')
  const [b1RmsLimit,      setB1RmsLimit]      = useState('')
  const [slewRateLimit,   setSlewRateLimit]   = useState('')
  const [gradientLimit,   setGradientLimit]   = useState('')
  const [maxScanTime,     setMaxScanTime]     = useState('')
  const [contraindications, setContraindications] = useState('')
  const [approvedRegions, setApprovedRegions] = useState<string[]>([])
  const [loading,         setLoading]         = useState(false)
  const [error,           setError]           = useState('')

  if (mfr === undefined) {
    return (
      <div style={{ padding: '48px 32px', color: 'var(--muted)', fontFamily: 'var(--ff)', fontSize: 14 }}>Loading…</div>
    )
  }

  if (!mfr || mfr.status !== 'approved') {
    return (
      <div style={{ padding: '48px 32px' }}>
        <a href="/manufacturer/devices" style={{ color: 'var(--muted)', fontFamily: 'var(--ff)', fontSize: 13.5, textDecoration: 'none' }}>← Back to Devices</a>
        <p style={{ marginTop: 24, fontFamily: 'var(--fb)', fontSize: 14, color: 'var(--muted)' }}>
          Your account must be approved before you can submit devices.
        </p>
      </div>
    )
  }

  function toggleRegion(r: string) {
    setApprovedRegions(prev => prev.includes(r) ? prev.filter(x => x !== r) : [...prev, r])
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (!model.trim())      { setError('Model name is required'); return }
    if (!deviceType.trim()) { setError('Device type is required'); return }

    setLoading(true)
    try {
      await submitDevice({
        manufacturer:      mfr.companyName,
        model:             model.trim(),
        deviceType:        deviceType.trim(),
        classification,
        mriStatus,
        fieldStrengths:    fieldStrengths.trim()     || undefined,
        sarLimit:          sarLimit.trim()            || undefined,
        b1RmsLimit:        b1RmsLimit.trim()          || undefined,
        slewRateLimit:     slewRateLimit.trim()       || undefined,
        gradientLimit:     gradientLimit.trim()       || undefined,
        maxScanTime:       maxScanTime.trim()         || undefined,
        contraindications: contraindications.trim()   || undefined,
        approvedRegions:   approvedRegions.length > 0 ? approvedRegions : undefined,
      })
      router.push('/manufacturer/devices')
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to submit device — try again.')
      setLoading(false)
    }
  }

  return (
    <div style={{ padding: '40px 32px', maxWidth: 860 }}>
      <a href="/manufacturer/devices" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: 'var(--muted)', fontFamily: 'var(--ff)', fontSize: 13.5, textDecoration: 'none', marginBottom: 28 }}>
        ← Back to Devices
      </a>

      <div style={{ marginBottom: 32 }}>
        <h2 style={{ fontFamily: 'var(--ff)', fontSize: 24, fontWeight: 700, color: 'var(--text)', margin: 0 }}>Submit a device</h2>
        <p style={{ fontFamily: 'var(--fb)', fontSize: 14, color: 'var(--muted)', margin: '8px 0 0', lineHeight: 1.6 }}>
          Devices you submit go into a 24-hour review window. They will be published automatically unless flagged by the Implant ID team.
        </p>
      </div>

      <form onSubmit={handleSubmit}>
        <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 16, padding: '32px 36px' }}>

          {/* ── Identity ── */}
          <h3 style={{ fontFamily: 'var(--ff)', fontSize: 15, fontWeight: 600, color: 'var(--text)', margin: '0 0 18px' }}>Device identity</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 8 }}>
            <div className="field">
              <label>Manufacturer</label>
              <input className="input" type="text" value={mfr.companyName} readOnly style={{ opacity: 0.7, cursor: 'not-allowed' }} />
            </div>
            <div className="field">
              <label>Model <span style={{ color: 'var(--err)', marginLeft: 3 }}>*</span></label>
              <input className="input" type="text" value={model} onChange={e => setModel(e.target.value)} placeholder="e.g. Azure XT DR MRI" autoFocus />
            </div>
            <div className="field">
              <label>Device type <span style={{ color: 'var(--err)', marginLeft: 3 }}>*</span></label>
              <input className="input" type="text" value={deviceType} onChange={e => setDeviceType(e.target.value)} placeholder="e.g. Cardiac Pacemaker" />
            </div>
            <div className="field">
              <label>Classification</label>
              <div style={{ display: 'flex', gap: 8 }}>
                {(['active', 'passive', 'legacy'] as Classification[]).map(c => (
                  <button key={c} type="button" onClick={() => setClassification(c)}
                    style={{ flex: 1, padding: '9px 4px', borderRadius: 8, cursor: 'pointer', fontFamily: 'var(--ff)', fontSize: 13, fontWeight: classification === c ? 600 : 400, border: `1.5px solid ${classification === c ? 'var(--accent)' : 'var(--border)'}`, background: classification === c ? 'color-mix(in srgb,var(--accent) 12%,transparent)' : 'transparent', color: classification === c ? 'var(--accent-deep)' : 'var(--muted)', transition: 'all .15s', textTransform: 'capitalize' }}>
                    {c}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <Divider />

          {/* ── MRI Status ── */}
          <h3 style={{ fontFamily: 'var(--ff)', fontSize: 15, fontWeight: 600, color: 'var(--text)', margin: '0 0 6px' }}>MRI status</h3>
          <p style={{ fontFamily: 'var(--fb)', fontSize: 13, color: 'var(--muted)', margin: '0 0 16px', lineHeight: 1.55 }}>
            Select the status as defined in the device&apos;s Instructions for Use (IFU).
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginBottom: 8 }}>
            {MRI_OPTIONS.map(opt => (
              <button key={opt.value} type="button" onClick={() => setMriStatus(opt.value)}
                style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, padding: '14px 8px', borderRadius: 10, cursor: 'pointer', border: `2px solid ${mriStatus === opt.value ? opt.color : 'var(--border)'}`, background: mriStatus === opt.value ? `color-mix(in srgb,${opt.color} 8%,transparent)` : 'transparent', transition: 'all .15s' }}>
                {opt.icon && <img src={opt.icon} alt="" aria-hidden="true" style={{ width: 32, height: 32 }} />}
                <span style={{ fontFamily: 'var(--ff)', fontSize: 12, fontWeight: 600, color: mriStatus === opt.value ? opt.color : 'var(--muted)' }}>{opt.label}</span>
              </button>
            ))}
          </div>

          {mriStatus === 'conditional' && (
            <>
              <Divider />
              <h3 style={{ fontFamily: 'var(--ff)', fontSize: 15, fontWeight: 600, color: 'var(--text)', margin: '0 0 16px' }}>MRI conditions</h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <div className="field">
                  <label>Field strengths</label>
                  <input className="input" type="text" value={fieldStrengths} onChange={e => setFieldStrengths(e.target.value)} placeholder="e.g. 1.5T, 3T" />
                </div>
                <div className="field">
                  <label>SAR limit (whole-body)</label>
                  <input className="input" type="text" value={sarLimit} onChange={e => setSarLimit(e.target.value)} placeholder="e.g. 2 W/kg" />
                </div>
                <div className="field">
                  <label>B1+rms limit</label>
                  <input className="input" type="text" value={b1RmsLimit} onChange={e => setB1RmsLimit(e.target.value)} placeholder="e.g. 3.2 µT" />
                </div>
                <div className="field">
                  <label>Slew rate limit</label>
                  <input className="input" type="text" value={slewRateLimit} onChange={e => setSlewRateLimit(e.target.value)} placeholder="e.g. 200 T/m/s" />
                </div>
                <div className="field">
                  <label>Gradient limit</label>
                  <input className="input" type="text" value={gradientLimit} onChange={e => setGradientLimit(e.target.value)} placeholder="e.g. 80 mT/m" />
                </div>
                <div className="field">
                  <label>Max scan time</label>
                  <input className="input" type="text" value={maxScanTime} onChange={e => setMaxScanTime(e.target.value)} placeholder="e.g. 30 min per session" />
                </div>
                <div className="field" style={{ gridColumn: '1 / -1' }}>
                  <label>Contraindications / special conditions</label>
                  <textarea className="input" rows={3} value={contraindications} onChange={e => setContraindications(e.target.value)} placeholder="Any scan position restrictions, programming requirements, etc." style={{ resize: 'vertical' }} />
                </div>
              </div>
            </>
          )}

          <Divider />

          {/* ── Approved Regions ── */}
          <h3 style={{ fontFamily: 'var(--ff)', fontSize: 15, fontWeight: 600, color: 'var(--text)', margin: '0 0 16px' }}>Approved regions</h3>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {REGION_OPTIONS.map(r => (
              <button key={r} type="button" onClick={() => toggleRegion(r)}
                style={{ padding: '7px 14px', borderRadius: 20, cursor: 'pointer', fontFamily: 'var(--ff)', fontSize: 13, fontWeight: approvedRegions.includes(r) ? 600 : 400, border: `1.5px solid ${approvedRegions.includes(r) ? 'var(--accent)' : 'var(--border)'}`, background: approvedRegions.includes(r) ? 'color-mix(in srgb,var(--accent) 12%,transparent)' : 'transparent', color: approvedRegions.includes(r) ? 'var(--accent-deep)' : 'var(--muted)', transition: 'all .15s' }}>
                {r}
              </button>
            ))}
          </div>

          {/* ── Error + submit ── */}
          {error && (
            <div style={{ marginTop: 28, background: 'color-mix(in srgb,var(--err) 8%,transparent)', border: '1px solid color-mix(in srgb,var(--err) 20%,transparent)', borderRadius: 10, padding: '12px 16px', fontFamily: 'var(--ff)', fontSize: 13.5, color: 'var(--err)' }}>
              {error}
            </div>
          )}

          <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginTop: 28 }}>
            <button type="submit" className="btn btn-s" disabled={loading} style={{ minWidth: 160 }}>
              {loading ? 'Submitting…' : 'Submit for review'}
            </button>
            <a href="/manufacturer/devices" className="btn" style={{ textDecoration: 'none' }}>Cancel</a>
            <span style={{ fontFamily: 'var(--fb)', fontSize: 12.5, color: 'var(--muted)', marginLeft: 8 }}>
              Will be published automatically after a 24-hour review window.
            </span>
          </div>
        </div>
      </form>
    </div>
  )
}
