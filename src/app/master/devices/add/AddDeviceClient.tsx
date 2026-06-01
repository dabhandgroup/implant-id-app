'use client'
import { useState }    from 'react'
import { useMutation } from 'convex/react'
import { useRouter }   from 'next/navigation'
import { api as apiBase } from '../../../../../convex/_generated/api'
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const api = apiBase as any

type MriStatus      = 'conditional' | 'safe' | 'unsafe' | 'unknown'
type Classification = 'active' | 'passive' | 'legacy'

// Standard international MRI safety logos in /public/
const MRI_OPTIONS: { value: MriStatus; label: string; fullLabel: string; color: string; bg: string; icon?: string }[] = [
  {
    value:     'safe',
    label:     'MR Safe',
    fullLabel: 'MR Safe — no known hazards in any MRI environment',
    color:     'var(--ok)',
    bg:        'color-mix(in srgb,var(--ok) 10%,transparent)',
    icon:      '/mr-safe.svg',
  },
  {
    value:     'conditional',
    label:     'MR Conditional',
    fullLabel: 'MR Conditional — safe only under specific conditions',
    color:     '#b45309',
    bg:        'color-mix(in srgb,#f59e0b 10%,transparent)',
    icon:      '/mr-conditional.svg',
  },
  {
    value:     'unsafe',
    label:     'MR Unsafe',
    fullLabel: 'MR Unsafe — do not allow in the MRI environment',
    color:     'var(--err)',
    bg:        'color-mix(in srgb,var(--err) 10%,transparent)',
    icon:      '/mr-unsafe.svg',
  },
  {
    value:     'unknown',
    label:     'Unknown',
    fullLabel: 'MRI status not yet determined',
    color:     'var(--muted)',
    bg:        'var(--bg)',
    icon:      undefined,
  },
]

const REGION_OPTIONS = ['UK', 'EU', 'USA', 'Canada', 'Australia', 'New Zealand', 'Global']

function SectionHeader({ title, sub }: { title: string; sub?: string }) {
  return (
    <div style={{ marginBottom: 18 }}>
      <h3 style={{ fontFamily: 'var(--ff)', fontSize: 15, fontWeight: 600, color: 'var(--text)', margin: 0 }}>{title}</h3>
      {sub && <p style={{ fontFamily: 'var(--fb)', fontSize: 13, color: 'var(--muted)', margin: '4px 0 0' }}>{sub}</p>}
    </div>
  )
}

function Divider() {
  return <div style={{ height: 1, background: 'var(--border)', margin: '28px 0' }} />
}

export default function AddDeviceClient() {
  // ── All hooks unconditionally at top ─────────────────────────────────────
  const router    = useRouter()
  const addDevice = useMutation(api.devices.addDevice)

  // Identity
  const [manufacturer,   setManufacturer]   = useState('')
  const [model,          setModel]          = useState('')
  const [deviceType,     setDeviceType]     = useState('')
  const [classification, setClassification] = useState<Classification>('active')

  // MRI status
  const [mriStatus,      setMriStatus]      = useState<MriStatus>('conditional')
  const [fieldStrengths, setFieldStrengths] = useState('')

  // Technical parameters (active/conditional devices)
  const [sarLimit,       setSarLimit]       = useState('')
  const [b1RmsLimit,     setB1RmsLimit]     = useState('')
  const [slewRateLimit,  setSlewRateLimit]  = useState('')
  const [gradientLimit,  setGradientLimit]  = useState('')
  const [maxScanTime,    setMaxScanTime]    = useState('')

  // Clinical notes
  const [contraindications, setContraindications] = useState('')

  // Approved regions
  const [approvedRegions, setApprovedRegions] = useState<string[]>([])

  // Form state
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState('')

  function toggleRegion(r: string) {
    setApprovedRegions(prev =>
      prev.includes(r) ? prev.filter(x => x !== r) : [...prev, r]
    )
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (!manufacturer.trim()) { setError('Manufacturer is required'); return }
    if (!model.trim())        { setError('Model is required'); return }
    if (!deviceType.trim())   { setError('Device type is required'); return }

    setLoading(true)
    try {
      await addDevice({
        manufacturer:      manufacturer.trim(),
        model:             model.trim(),
        deviceType:        deviceType.trim(),
        classification,
        mriStatus,
        fieldStrengths:    fieldStrengths.trim()   || undefined,
        sarLimit:          sarLimit.trim()          || undefined,
        b1RmsLimit:        b1RmsLimit.trim()        || undefined,
        slewRateLimit:     slewRateLimit.trim()     || undefined,
        gradientLimit:     gradientLimit.trim()     || undefined,
        maxScanTime:       maxScanTime.trim()       || undefined,
        contraindications: contraindications.trim() || undefined,
        approvedRegions:   approvedRegions.length > 0 ? approvedRegions : undefined,
      })
      router.push('/master/devices')
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to add device — try again.')
      setLoading(false)
    }
  }

  const isConditional = mriStatus === 'conditional'

  return (
    <div className="m-content">
      <div className="m-h">
        <div>
          <h2>Add Device</h2>
          <div className="sub">Add an implant device to the Implant ID catalogue. Fields marked * are required.</div>
        </div>
        <a href="/master/devices" className="btn">← Back to Devices</a>
      </div>

      <form onSubmit={handleSubmit} style={{ maxWidth: 820 }}>
        <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 16, padding: '32px 36px' }}>

          {/* ── Section 1: Device Identity ── */}
          <SectionHeader
            title="Device identity"
            sub="The core identifiers used across the platform and in patient records."
          />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
            <div className="field">
              <label>Manufacturer <span style={{ color: 'var(--err)', marginLeft: 3 }}>*</span></label>
              <input className="input" type="text" placeholder="e.g. Medtronic" value={manufacturer} onChange={e => setManufacturer(e.target.value)} />
            </div>
            <div className="field">
              <label>Model <span style={{ color: 'var(--err)', marginLeft: 3 }}>*</span></label>
              <input className="input" type="text" placeholder="e.g. Azure XT DR MRI" value={model} onChange={e => setModel(e.target.value)} />
            </div>
            <div className="field">
              <label>Device type <span style={{ color: 'var(--err)', marginLeft: 3 }}>*</span></label>
              <input className="input" type="text" placeholder="e.g. Cardiac Pacemaker" value={deviceType} onChange={e => setDeviceType(e.target.value)} />
            </div>
            <div className="field">
              <label>Classification</label>
              <div style={{ display: 'flex', gap: 8 }}>
                {(['active', 'passive', 'legacy'] as Classification[]).map(c => (
                  <button key={c} type="button"
                    onClick={() => setClassification(c)}
                    style={{
                      flex: 1, padding: '9px 4px', borderRadius: 8, cursor: 'pointer',
                      fontFamily: 'var(--ff)', fontSize: 13, fontWeight: classification === c ? 600 : 400,
                      border: `1.5px solid ${classification === c ? 'var(--accent)' : 'var(--border)'}`,
                      background: classification === c ? 'color-mix(in srgb,var(--accent) 12%,transparent)' : 'transparent',
                      color: classification === c ? 'var(--accent-deep)' : 'var(--muted)',
                      transition: 'all .15s', textTransform: 'capitalize',
                    }}
                  >
                    {c}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <Divider />

          {/* ── Section 2: MRI Safety Status ── */}
          <SectionHeader
            title="MRI safety status"
            sub="Select the internationally-recognised classification. This is the most important field — it drives the patient card colour and clinic alerts."
          />

          {/* Status selector with icons */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginBottom: 24 }}>
            {MRI_OPTIONS.map(opt => {
              const active = mriStatus === opt.value
              return (
                <button key={opt.value} type="button"
                  onClick={() => setMriStatus(opt.value)}
                  title={opt.fullLabel}
                  style={{
                    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10,
                    padding: '16px 10px', borderRadius: 12, cursor: 'pointer', transition: 'all .15s',
                    border: `2px solid ${active ? opt.color : 'var(--border)'}`,
                    background: active ? opt.bg : 'transparent',
                  }}
                >
                  {opt.icon ? (
                    <img src={opt.icon} alt={opt.label} style={{ width: 40, height: 40 }} />
                  ) : (
                    <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'var(--border)', display: 'grid', placeItems: 'center' }}>
                      <span style={{ fontSize: 10, fontFamily: 'var(--ff)', color: 'var(--muted)', fontWeight: 700 }}>?</span>
                    </div>
                  )}
                  <div style={{ fontFamily: 'var(--ff)', fontSize: 12, fontWeight: active ? 700 : 500, color: active ? opt.color : 'var(--muted)', textAlign: 'center', lineHeight: 1.3 }}>
                    {opt.label}
                  </div>
                </button>
              )
            })}
          </div>

          {/* Field strengths */}
          <div className="field" style={{ marginBottom: 0 }}>
            <label>Field strengths tested / approved</label>
            <input className="input" type="text" placeholder="e.g. 1.5T, 3.0T" value={fieldStrengths} onChange={e => setFieldStrengths(e.target.value)} />
          </div>

          <Divider />

          {/* ── Section 3: Technical Parameters ── */}
          <SectionHeader
            title="MRI technical parameters"
            sub={isConditional
              ? 'Required for MR Conditional devices. Radiographers use these to configure the scanner safely.'
              : 'These parameters are most relevant for MR Conditional devices, but record any available data.'}
          />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 14 }}>
            <div className="field">
              <label>Whole-body SAR limit</label>
              <input className="input" type="text" placeholder="e.g. 2.0 W/kg" value={sarLimit} onChange={e => setSarLimit(e.target.value)} />
            </div>
            <div className="field">
              <label>B1+rms limit</label>
              <input className="input" type="text" placeholder="e.g. 2.0 µT" value={b1RmsLimit} onChange={e => setB1RmsLimit(e.target.value)} />
            </div>
            <div className="field">
              <label>Slew rate limit</label>
              <input className="input" type="text" placeholder="e.g. 200 T/m/s" value={slewRateLimit} onChange={e => setSlewRateLimit(e.target.value)} />
            </div>
            <div className="field">
              <label>Gradient limit</label>
              <input className="input" type="text" placeholder="e.g. 80 mT/m" value={gradientLimit} onChange={e => setGradientLimit(e.target.value)} />
            </div>
            <div className="field">
              <label>Max scan time / sequence</label>
              <input className="input" type="text" placeholder="e.g. 15 min" value={maxScanTime} onChange={e => setMaxScanTime(e.target.value)} />
            </div>
          </div>

          <Divider />

          {/* ── Section 4: Clinical Notes ── */}
          <SectionHeader
            title="Contraindications &amp; conditions"
            sub="Document any known contraindications, lead-type restrictions, post-op waiting periods, or special scanning protocols."
          />
          <div className="field">
            <label>Contraindications / special conditions</label>
            <textarea className="input" rows={4}
              placeholder="e.g. Not compatible with abandoned leads. Post-implant wait: 6 weeks. Requires programmer in MRI-ready mode during scan. Pacemaker-dependent patients — monitor throughout."
              value={contraindications} onChange={e => setContraindications(e.target.value)}
              style={{ resize: 'vertical' }}
            />
          </div>

          <Divider />

          {/* ── Section 5: Approved Regions ── */}
          <SectionHeader
            title="Approved regions"
            sub="Select all regions where this device has MRI approval. Leave blank if global or unknown."
          />
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {REGION_OPTIONS.map(r => {
              const on = approvedRegions.includes(r)
              return (
                <button key={r} type="button"
                  onClick={() => toggleRegion(r)}
                  style={{
                    padding: '7px 16px', borderRadius: 8, cursor: 'pointer', transition: 'all .15s',
                    fontFamily: 'var(--ff)', fontSize: 13, fontWeight: on ? 600 : 400,
                    border: `1.5px solid ${on ? 'var(--accent)' : 'var(--border)'}`,
                    background: on ? 'color-mix(in srgb,var(--accent) 10%,transparent)' : 'transparent',
                    color: on ? 'var(--accent-deep)' : 'var(--muted)',
                  }}
                >
                  {r}
                </button>
              )
            })}
          </div>

          {/* ── Error + Actions ── */}
          {error && (
            <div style={{ marginTop: 24, background: 'color-mix(in srgb,var(--err) 8%,transparent)', border: '1px solid color-mix(in srgb,var(--err) 20%,transparent)', borderRadius: 10, padding: '12px 16px', fontFamily: 'var(--ff)', fontSize: 13.5, color: 'var(--err)' }}>
              {error}
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, paddingTop: 24, marginTop: 28, borderTop: '1px solid var(--border)' }}>
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
