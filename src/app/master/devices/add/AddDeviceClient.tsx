'use client'
import { useState }    from 'react'
import { useMutation } from 'convex/react'
import { useRouter }   from 'next/navigation'
import { api as apiBase } from '../../../../../convex/_generated/api'
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const api = apiBase as any

type MriStatus     = 'conditional' | 'safe' | 'unsafe' | 'unknown'
type Classification = 'active' | 'passive' | 'legacy'

const MRI_OPTIONS: { value: MriStatus; label: string; color: string }[] = [
  { value: 'safe',        label: 'Safe',        color: 'var(--ok)' },
  { value: 'conditional', label: 'Conditional',  color: '#b45309' },
  { value: 'unsafe',      label: 'Unsafe',       color: 'var(--err)' },
  { value: 'unknown',     label: 'Unknown',      color: 'var(--muted)' },
]

const CLASS_OPTIONS: { value: Classification; label: string }[] = [
  { value: 'active',  label: 'Active' },
  { value: 'passive', label: 'Passive' },
  { value: 'legacy',  label: 'Legacy' },
]

export default function AddDeviceClient() {
  const [manufacturer,     setManufacturer]     = useState('')
  const [model,            setModel]            = useState('')
  const [deviceType,       setDeviceType]       = useState('')
  const [classification,   setClassification]   = useState<Classification>('active')
  const [mriStatus,        setMriStatus]        = useState<MriStatus>('conditional')
  const [fieldStrengths,   setFieldStrengths]   = useState('')
  const [sarLimit,         setSarLimit]         = useState('')
  const [contraindications, setContraindications] = useState('')
  const [loading,          setLoading]          = useState(false)
  const [error,            setError]            = useState('')

  const addDevice = useMutation(api.devices.addDevice)
  const router    = useRouter()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    if (!manufacturer.trim()) { setError('Manufacturer is required.'); return }
    if (!model.trim())        { setError('Model is required.'); return }
    if (!deviceType.trim())   { setError('Device type is required.'); return }

    setLoading(true)
    try {
      await addDevice({
        manufacturer:      manufacturer.trim(),
        model:             model.trim(),
        deviceType:        deviceType.trim(),
        classification,
        mriStatus,
        fieldStrengths:    fieldStrengths.trim() || undefined,
        sarLimit:          sarLimit.trim() || undefined,
        contraindications: contraindications.trim() || undefined,
      })
      router.push('/master/devices')
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to add device — try again.')
      setLoading(false)
    }
  }

  return (
    <div className="m-content">
      <div className="m-h">
        <div>
          <h2>Add Device</h2>
          <div className="sub">Manually add a new implant device to the catalogue.</div>
        </div>
        <a href="/master/devices" className="btn">← Back to Devices</a>
      </div>

      <form onSubmit={handleSubmit} style={{ maxWidth: 760 }}>
        <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 14, padding: '32px 36px' }}>

          {/* Section 1 — Device identity */}
          <div style={{ marginBottom: 32 }}>
            <h3 style={{ fontFamily: 'var(--ff)', fontSize: 15, fontWeight: 600, marginBottom: 18 }}>Device Identity</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <div className="field">
                <label>Manufacturer <span style={{ color: 'var(--err)', marginLeft: 3 }}>*</span></label>
                <input
                  className="input"
                  type="text"
                  placeholder="e.g. Medtronic"
                  value={manufacturer}
                  onChange={e => setManufacturer(e.target.value)}
                  aria-label="Manufacturer"
                />
              </div>
              <div className="field">
                <label>Model <span style={{ color: 'var(--err)', marginLeft: 3 }}>*</span></label>
                <input
                  className="input"
                  type="text"
                  placeholder="e.g. Micra AV"
                  value={model}
                  onChange={e => setModel(e.target.value)}
                  aria-label="Model"
                />
              </div>
              <div className="field" style={{ gridColumn: '1/-1' }}>
                <label>Device type <span style={{ color: 'var(--err)', marginLeft: 3 }}>*</span></label>
                <input
                  className="input"
                  type="text"
                  placeholder="e.g. Cardiac Pacemaker"
                  value={deviceType}
                  onChange={e => setDeviceType(e.target.value)}
                  aria-label="Device type"
                />
              </div>
            </div>
          </div>

          {/* Section 2 — MRI status */}
          <div style={{ marginBottom: 32 }}>
            <h3 style={{ fontFamily: 'var(--ff)', fontSize: 15, fontWeight: 600, marginBottom: 14 }}>MRI Status</h3>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 20 }}>
              {MRI_OPTIONS.map(opt => {
                const active = mriStatus === opt.value
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setMriStatus(opt.value)}
                    aria-pressed={active}
                    style={{
                      padding: '8px 18px',
                      borderRadius: 8,
                      border: `1.5px solid ${active ? opt.color : 'var(--border)'}`,
                      background: active ? `color-mix(in srgb,${opt.color} 12%,transparent)` : 'transparent',
                      color: active ? opt.color : 'var(--muted)',
                      fontFamily: 'var(--ff)',
                      fontSize: 13,
                      fontWeight: active ? 600 : 400,
                      cursor: 'pointer',
                      transition: 'all .15s',
                    }}
                  >
                    {opt.label}
                  </button>
                )
              })}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <div className="field">
                <label>Field strengths</label>
                <input
                  className="input"
                  type="text"
                  placeholder="e.g. 1.5T, 3T"
                  value={fieldStrengths}
                  onChange={e => setFieldStrengths(e.target.value)}
                  aria-label="Field strengths"
                />
              </div>
              <div className="field">
                <label>SAR limit</label>
                <input
                  className="input"
                  type="text"
                  placeholder="e.g. 2 W/kg"
                  value={sarLimit}
                  onChange={e => setSarLimit(e.target.value)}
                  aria-label="SAR limit"
                />
              </div>
            </div>
          </div>

          {/* Section 3 — Classification */}
          <div style={{ marginBottom: 32 }}>
            <h3 style={{ fontFamily: 'var(--ff)', fontSize: 15, fontWeight: 600, marginBottom: 14 }}>Classification</h3>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {CLASS_OPTIONS.map(opt => {
                const active = classification === opt.value
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setClassification(opt.value)}
                    aria-pressed={active}
                    style={{
                      padding: '8px 18px',
                      borderRadius: 8,
                      border: `1.5px solid ${active ? 'var(--accent)' : 'var(--border)'}`,
                      background: active ? 'color-mix(in srgb,var(--accent) 12%,transparent)' : 'transparent',
                      color: active ? 'var(--accent-deep)' : 'var(--muted)',
                      fontFamily: 'var(--ff)',
                      fontSize: 13,
                      fontWeight: active ? 600 : 400,
                      cursor: 'pointer',
                      transition: 'all .15s',
                    }}
                  >
                    {opt.label}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Section 4 — Contraindications */}
          <div style={{ marginBottom: 28 }}>
            <h3 style={{ fontFamily: 'var(--ff)', fontSize: 15, fontWeight: 600, marginBottom: 14 }}>Contraindications</h3>
            <div className="field">
              <label>Contraindications / notes</label>
              <textarea
                className="input"
                rows={4}
                placeholder="Any known contraindications, warnings, or special conditions…"
                value={contraindications}
                onChange={e => setContraindications(e.target.value)}
                style={{ resize: 'vertical' }}
                aria-label="Contraindications"
              />
            </div>
          </div>

          {/* Error banner */}
          {error && (
            <div style={{ background: 'color-mix(in srgb,var(--err) 8%,transparent)', border: '1px solid color-mix(in srgb,var(--err) 20%,transparent)', borderRadius: 10, padding: '12px 16px', marginBottom: 20, fontFamily: 'var(--ff)', fontSize: 13.5, color: 'var(--err)' }}>
              {error}
            </div>
          )}

          {/* Actions */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, paddingTop: 20, borderTop: '1px solid var(--border)' }}>
            <a href="/master/devices" className="btn">Cancel</a>
            <button className="btn btn-s" type="submit" disabled={loading}>
              {loading ? 'Adding…' : 'Add Device →'}
            </button>
          </div>
        </div>
      </form>
    </div>
  )
}
