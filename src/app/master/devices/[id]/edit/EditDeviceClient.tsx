'use client'

import { useState, useEffect } from 'react'
import { useQuery, useMutation } from 'convex/react'
import { useRouter }            from 'next/navigation'
import { api as apiBase }       from '../../../../../convex/_generated/api'
import { Id }                   from '../../../../../convex/_generated/dataModel'
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const api = apiBase as any

type MriStatus      = 'safe' | 'conditional' | 'unsafe' | 'unknown'
type Classification = 'active' | 'passive' | 'legacy'

const MRI_OPTIONS: { value: MriStatus; label: string; color: string; bg: string; icon?: string }[] = [
  { value: 'safe',        label: 'MR Safe',        color: 'var(--ok)',   bg: 'color-mix(in srgb,var(--ok) 10%,transparent)',  icon: '/mr-safe.svg' },
  { value: 'conditional', label: 'MR Conditional',  color: '#b45309',    bg: 'color-mix(in srgb,#f59e0b 10%,transparent)',     icon: '/mr-conditional.svg' },
  { value: 'unsafe',      label: 'MR Unsafe',       color: 'var(--err)', bg: 'color-mix(in srgb,var(--err) 10%,transparent)',  icon: '/mr-unsafe.svg' },
  { value: 'unknown',     label: 'Unknown',          color: 'var(--muted)', bg: 'var(--bg)', icon: undefined },
]

const REGION_OPTIONS = ['UK', 'EU', 'USA', 'Canada', 'Australia', 'New Zealand', 'Global']

function Divider() {
  return <div style={{ height: 1, background: 'var(--border)', margin: '28px 0' }} />
}

function SectionHeader({ title, sub }: { title: string; sub?: string }) {
  return (
    <div style={{ marginBottom: 18 }}>
      <h3 style={{ fontFamily: 'var(--ff)', fontSize: 15, fontWeight: 600, color: 'var(--text)', margin: 0 }}>{title}</h3>
      {sub && <p style={{ fontFamily: 'var(--fb)', fontSize: 13, color: 'var(--muted)', margin: '4px 0 0' }}>{sub}</p>}
    </div>
  )
}

export default function EditDeviceClient({ id }: { id: string }) {
  const router       = useRouter()
  const device       = useQuery(api.devices.getDeviceBySlug, { slug: id })
  const updateDevice = useMutation(api.devices.updateDevice)

  // ── All hooks unconditionally at top ─────────────────────────────────────
  const [manufacturer,    setManufacturer]    = useState('')
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
  const [sourceUrls,      setSourceUrls]      = useState<{ url: string; label: string }[]>([{ url: '', label: '' }])
  const [hydrated,        setHydrated]        = useState(false)
  const [saving,          setSaving]          = useState(false)
  const [error,           setError]           = useState('')

  // Populate form from loaded device (run once when device first loads)
  useEffect(() => {
    if (!device || hydrated) return
    setManufacturer(device.manufacturer ?? '')
    setModel(device.model ?? '')
    setDeviceType(device.deviceType ?? '')
    setClassification((device.classification as Classification) ?? 'active')
    setMriStatus((device.mriStatus as MriStatus) ?? 'conditional')
    setFieldStrengths(device.fieldStrengths ?? '')
    setSarLimit(device.sarLimit ?? '')
    setB1RmsLimit(device.b1RmsLimit ?? '')
    setSlewRateLimit(device.slewRateLimit ?? '')
    setGradientLimit(device.gradientLimit ?? '')
    setMaxScanTime(device.maxScanTime ?? '')
    setContraindications(device.contraindications ?? '')
    setApprovedRegions(device.approvedRegions ?? [])
    const existingSources = (device as any).sourceUrls
    setSourceUrls(
      existingSources?.length > 0
        ? existingSources.map((s: any) => ({ url: s.url, label: s.label ?? '' }))
        : [{ url: '', label: '' }]
    )
    setHydrated(true)
  }, [device, hydrated])

  // ── Loading / error guards ─────────────────────────────────────────────
  if (device === undefined) {
    return (
      <div className="m-content">
        <div style={{ color: 'var(--muted)', fontSize: 14, padding: '48px 0', fontFamily: 'var(--ff)' }}>Loading…</div>
      </div>
    )
  }
  if (device === null) {
    return (
      <div className="m-content">
        <a href="/master/devices" className="m-back">← Back to Devices</a>
        <div className="m-h"><div><h2>Device not found</h2></div></div>
      </div>
    )
  }

  function toggleRegion(r: string) {
    setApprovedRegions(prev =>
      prev.includes(r) ? prev.filter(x => x !== r) : [...prev, r]
    )
  }

  function addSourceRow() { setSourceUrls(p => [...p, { url: '', label: '' }]) }
  function removeSourceRow(i: number) { setSourceUrls(p => p.filter((_, j) => j !== i)) }
  function updateSourceRow(i: number, field: 'url' | 'label', val: string) {
    setSourceUrls(p => p.map((s, j) => j === i ? { ...s, [field]: val } : s))
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (!manufacturer.trim()) { setError('Manufacturer is required'); return }
    if (!model.trim())        { setError('Model is required'); return }
    if (!deviceType.trim())   { setError('Device type is required'); return }

    setSaving(true)
    try {
      const cleanSources = sourceUrls.filter(s => s.url.trim())
        .map(s => ({ url: s.url.trim(), label: s.label.trim() || undefined }))
      await updateDevice({
        id:               device._id,
        manufacturer:     manufacturer.trim(),
        model:            model.trim(),
        deviceType:       deviceType.trim(),
        classification,
        mriStatus,
        fieldStrengths:   fieldStrengths.trim()    || undefined,
        sarLimit:         sarLimit.trim()           || undefined,
        b1RmsLimit:       b1RmsLimit.trim()         || undefined,
        slewRateLimit:    slewRateLimit.trim()      || undefined,
        gradientLimit:    gradientLimit.trim()      || undefined,
        maxScanTime:      maxScanTime.trim()        || undefined,
        contraindications:contraindications.trim()  || undefined,
        approvedRegions:  approvedRegions.length > 0 ? approvedRegions : undefined,
        sourceUrls:       cleanSources.length > 0  ? cleanSources : undefined,
      })
      router.push(`/master/devices/${(device as any).deviceCode ?? id}`)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to save — please try again.')
      setSaving(false)
    }
  }

  return (
    <div className="m-content">
      <a href={`/master/devices/${(device as any).deviceCode ?? id}`} className="m-back" style={{ display:'inline-flex', alignItems:'center', gap:6, background:'none', border:0, cursor:'pointer', color:'var(--muted)', fontFamily:'var(--ff)', fontSize:13.5, padding:0, marginBottom:24, textDecoration:'none' }}>
        ← Back to {device.manufacturer} {device.model}
      </a>

      <div className="m-h" style={{ marginBottom: 24 }}>
        <div>
          <h2>Edit Device</h2>
          <div className="sub">{device.manufacturer} · {(device as any).deviceCode ?? device.model}</div>
        </div>
      </div>

      <form onSubmit={handleSave} style={{ maxWidth: 820 }}>
        <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 16, padding: '32px 36px' }}>

          {/* ── 1. Identity ── */}
          <SectionHeader title="Device identity" sub="Core identifiers used across the platform and in patient records." />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
            <div className="field">
              <label>Manufacturer <span style={{ color: 'var(--err)', marginLeft: 3 }}>*</span></label>
              <input className="input" type="text" value={manufacturer} onChange={e => setManufacturer(e.target.value)} placeholder="e.g. Medtronic" />
            </div>
            <div className="field">
              <label>Model <span style={{ color: 'var(--err)', marginLeft: 3 }}>*</span></label>
              <input className="input" type="text" value={model} onChange={e => setModel(e.target.value)} placeholder="e.g. Azure XT DR MRI" />
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
                    style={{ flex:1, padding:'9px 4px', borderRadius:8, cursor:'pointer', fontFamily:'var(--ff)', fontSize:13, fontWeight: classification===c ? 600 : 400, border:`1.5px solid ${classification===c ? 'var(--accent)' : 'var(--border)'}`, background: classification===c ? 'color-mix(in srgb,var(--accent) 12%,transparent)' : 'transparent', color: classification===c ? 'var(--accent-deep)' : 'var(--muted)', transition:'all .15s', textTransform:'capitalize' }}>
                    {c}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <Divider />

          {/* ── 2. MRI Status ── */}
          <SectionHeader title="MRI safety status" sub="Select the internationally-recognised classification. Drives patient card colour and clinic alerts." />
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginBottom: 24 }}>
            {MRI_OPTIONS.map(opt => {
              const active = mriStatus === opt.value
              return (
                <button key={opt.value} type="button" onClick={() => setMriStatus(opt.value)}
                  style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:10, padding:'16px 10px', borderRadius:12, cursor:'pointer', transition:'all .15s', border:`2px solid ${active ? opt.color : 'var(--border)'}`, background: active ? opt.bg : 'transparent' }}>
                  {opt.icon
                    ? <img src={opt.icon} alt={opt.label} style={{ width:40, height:40 }} />
                    : <div style={{ width:40, height:40, borderRadius:'50%', background:'var(--border)', display:'grid', placeItems:'center' }}><span style={{ fontSize:10, fontFamily:'var(--ff)', color:'var(--muted)', fontWeight:700 }}>?</span></div>
                  }
                  <div style={{ fontFamily:'var(--ff)', fontSize:12, fontWeight: active ? 700 : 500, color: active ? opt.color : 'var(--muted)', textAlign:'center', lineHeight:1.3 }}>{opt.label}</div>
                </button>
              )
            })}
          </div>
          <div className="field" style={{ marginBottom: 0 }}>
            <label>Field strengths tested / approved</label>
            <input className="input" type="text" placeholder="e.g. 1.5T, 3.0T" value={fieldStrengths} onChange={e => setFieldStrengths(e.target.value)} />
          </div>

          <Divider />

          {/* ── 3. Technical Parameters ── */}
          <SectionHeader title="MRI technical parameters" sub="Radiographers use these to configure the scanner safely for MR Conditional devices." />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 14 }}>
            <div className="field"><label>Whole-body SAR limit</label><input className="input" type="text" placeholder="e.g. 2.0 W/kg" value={sarLimit} onChange={e => setSarLimit(e.target.value)} /></div>
            <div className="field"><label>B1+rms limit</label><input className="input" type="text" placeholder="e.g. 2.0 µT" value={b1RmsLimit} onChange={e => setB1RmsLimit(e.target.value)} /></div>
            <div className="field"><label>Slew rate limit</label><input className="input" type="text" placeholder="e.g. 200 T/m/s" value={slewRateLimit} onChange={e => setSlewRateLimit(e.target.value)} /></div>
            <div className="field"><label>Gradient limit</label><input className="input" type="text" placeholder="e.g. 80 mT/m" value={gradientLimit} onChange={e => setGradientLimit(e.target.value)} /></div>
            <div className="field"><label>Max scan time / sequence</label><input className="input" type="text" placeholder="e.g. 15 min" value={maxScanTime} onChange={e => setMaxScanTime(e.target.value)} /></div>
          </div>

          <Divider />

          {/* ── 4. Contraindications ── */}
          <SectionHeader title="Contraindications &amp; conditions" sub="Known contraindications, lead restrictions, post-op wait periods, or special scanning protocols." />
          <div className="field">
            <label>Contraindications / special conditions</label>
            <textarea className="input" rows={4}
              placeholder="e.g. Not compatible with abandoned leads. Post-implant wait: 6 weeks…"
              value={contraindications} onChange={e => setContraindications(e.target.value)}
              style={{ resize: 'vertical' }}
            />
          </div>

          <Divider />

          {/* ── 5. Approved Regions ── */}
          <SectionHeader title="Approved regions" sub="Select all regions where this device has MRI approval." />
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {REGION_OPTIONS.map(r => {
              const on = approvedRegions.includes(r)
              return (
                <button key={r} type="button" onClick={() => toggleRegion(r)}
                  style={{ padding:'7px 16px', borderRadius:8, cursor:'pointer', transition:'all .15s', fontFamily:'var(--ff)', fontSize:13, fontWeight: on ? 600 : 400, border:`1.5px solid ${on ? 'var(--accent)' : 'var(--border)'}`, background: on ? 'color-mix(in srgb,var(--accent) 10%,transparent)' : 'transparent', color: on ? 'var(--accent-deep)' : 'var(--muted)' }}>
                  {r}
                </button>
              )
            })}
          </div>

          <Divider />

          {/* ── 6. Sources ── */}
          <SectionHeader title="Source documents &amp; references" sub="IFU PDFs, manufacturer safety pages, or clinical references. Displayed on the device record and to clinic users." />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {sourceUrls.map((s, i) => (
              <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr 200px 36px', gap: 8, alignItems: 'flex-start' }}>
                <div className="field" style={{ margin: 0 }}>
                  {i === 0 && <label style={{ fontFamily:'var(--ff)', fontSize:12, fontWeight:500, color:'var(--muted)', display:'block', marginBottom:5 }}>URL</label>}
                  <input className="input" type="url" placeholder="https://www.medtronic.com/mri-manual.pdf"
                    value={s.url} onChange={e => updateSourceRow(i, 'url', e.target.value)} />
                </div>
                <div className="field" style={{ margin: 0 }}>
                  {i === 0 && <label style={{ fontFamily:'var(--ff)', fontSize:12, fontWeight:500, color:'var(--muted)', display:'block', marginBottom:5 }}>Label (optional)</label>}
                  <input className="input" type="text" placeholder="e.g. IFU PDF"
                    value={s.label} onChange={e => updateSourceRow(i, 'label', e.target.value)} />
                </div>
                <button type="button" onClick={() => removeSourceRow(i)}
                  style={{ alignSelf:'flex-end', height:42, width:36, display:'grid', placeItems:'center', background:'none', border:'1px solid var(--border)', borderRadius:8, cursor:'pointer', color:'var(--err)' }}
                  aria-label="Remove source">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                </button>
              </div>
            ))}
            <button type="button" onClick={addSourceRow}
              style={{ alignSelf:'flex-start', display:'inline-flex', alignItems:'center', gap:6, fontFamily:'var(--ff)', fontSize:13, fontWeight:500, color:'var(--accent)', background:'color-mix(in srgb,var(--accent) 8%,transparent)', border:'1px dashed color-mix(in srgb,var(--accent) 30%,transparent)', borderRadius:8, padding:'7px 14px', cursor:'pointer' }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
              Add another source
            </button>
          </div>

          {/* ── Error + Actions ── */}
          {error && (
            <div style={{ marginTop: 24, background: 'color-mix(in srgb,var(--err) 8%,transparent)', border: '1px solid color-mix(in srgb,var(--err) 20%,transparent)', borderRadius: 10, padding: '12px 16px', fontFamily: 'var(--ff)', fontSize: 13.5, color: 'var(--err)' }}>
              {error}
            </div>
          )}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, paddingTop: 24, marginTop: 28, borderTop: '1px solid var(--border)' }}>
            <a href={`/master/devices/${id}`} className="btn">Cancel</a>
            <button className="btn btn-s" type="submit" disabled={saving}>
              {saving ? 'Saving…' : 'Save Changes'}
            </button>
          </div>
        </div>
      </form>
    </div>
  )
}
