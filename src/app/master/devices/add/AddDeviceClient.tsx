'use client'
import { useState, useRef } from 'react'
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
  const router                  = useRouter()
  const addDevice               = useMutation(api.devices.addDevice)
  const generateDocUploadUrl    = useMutation(api.devices.generateDeviceDocUploadUrl)

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

  // Sources (URLs / IFU links)
  const [sourceUrls, setSourceUrls] = useState<{ url: string; label: string }[]>([{ url: '', label: '' }])

  // Uploaded source PDFs
  const [sourceDocs, setSourceDocs] = useState<{ file: File; label: string }[]>([])
  const docInputRef = useRef<HTMLInputElement>(null)

  // Form state
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState('')

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

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (!manufacturer.trim()) { setError('Manufacturer is required'); return }
    if (!model.trim())        { setError('Model is required'); return }
    if (!deviceType.trim())   { setError('Device type is required'); return }

    setLoading(true)
    try {
      const cleanSources = sourceUrls.filter(s => s.url.trim())
        .map(s => ({ url: s.url.trim(), label: s.label.trim() || undefined }))

      // Upload any selected PDFs to Convex storage
      const uploadedDocs: { storageId: string; label?: string }[] = []
      for (const doc of sourceDocs) {
        const uploadUrl = await generateDocUploadUrl()
        const res = await fetch(uploadUrl, {
          method: 'POST',
          headers: { 'Content-Type': doc.file.type || 'application/pdf' },
          body: doc.file,
        })
        if (!res.ok) throw new Error(`Failed to upload ${doc.file.name}`)
        const { storageId } = await res.json() as { storageId: string }
        uploadedDocs.push({ storageId, label: doc.label.trim() || undefined })
      }

      const result = await addDevice({
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
        sourceUrls:        cleanSources.length > 0 ? cleanSources : undefined,
        sourceDocs:        uploadedDocs.length > 0 ? uploadedDocs : undefined,
      })
      // Short delay so Clerk's auth middleware settles before next page load —
      // immediate navigation after a mutation redirects to /login.
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const slug = (result as any)?.deviceCode ?? (result as any)?.id ?? ''
      setTimeout(() => router.push(slug ? `/master/devices/${slug}` : '/master/devices'), 350)
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

          <Divider />

          {/* ── Section 6: Sources ── */}
          <SectionHeader
            title="Source documents &amp; references"
            sub="Paste URLs to IFU PDFs or manufacturer pages, or upload PDF documents directly. Both are displayed on the device record."
          />

          {/* URL rows */}
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
                  style={{ alignSelf: i === 0 ? 'flex-end' : 'center', height:42, width:36, display:'grid', placeItems:'center', background:'none', border:'1px solid var(--border)', borderRadius:8, cursor:'pointer', color:'var(--err)', flexShrink:0 }}
                  aria-label="Remove source">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                </button>
              </div>
            ))}
            <button type="button" onClick={addSourceRow}
              style={{ alignSelf: 'flex-start', display:'inline-flex', alignItems:'center', gap:6, fontFamily:'var(--ff)', fontSize:13, fontWeight:500, color:'var(--accent)', background:'color-mix(in srgb,var(--accent) 8%,transparent)', border:'1px dashed color-mix(in srgb,var(--accent) 30%,transparent)', borderRadius:8, padding:'7px 14px', cursor:'pointer' }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
              Add URL
            </button>
          </div>

          {/* Uploaded PDF documents */}
          <div style={{ marginTop: 16 }}>
            <label style={{ fontFamily:'var(--ff)', fontSize:12, fontWeight:500, color:'var(--muted)', display:'block', marginBottom:8 }}>Upload PDF documents</label>
            {sourceDocs.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 10 }}>
                {sourceDocs.map((doc, i) => (
                  <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr 200px 36px', gap: 8, alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 8, padding: '0 12px', height: 42 }}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="1.7"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
                      <span style={{ fontFamily:'var(--fb)', fontSize:13, color:'var(--text)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{doc.file.name}</span>
                    </div>
                    <input className="input" type="text" placeholder="Label (optional)"
                      value={doc.label}
                      onChange={e => setSourceDocs(p => p.map((d, j) => j === i ? { ...d, label: e.target.value } : d))} />
                    <button type="button"
                      style={{ height:42, width:36, display:'grid', placeItems:'center', background:'none', border:'1px solid var(--border)', borderRadius:8, cursor:'pointer', color:'var(--err)', flexShrink:0 }}
                      aria-label="Remove document"
                      onClick={() => setSourceDocs(p => p.filter((_, j) => j !== i))}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                    </button>
                  </div>
                ))}
              </div>
            )}
            <input
              ref={docInputRef}
              type="file"
              accept=".pdf,application/pdf"
              multiple
              style={{ display: 'none' }}
              onChange={e => {
                const files = Array.from(e.target.files ?? [])
                setSourceDocs(p => [...p, ...files.map(f => ({ file: f, label: '' }))])
                if (docInputRef.current) docInputRef.current.value = ''
              }}
            />
            <button type="button"
              onClick={() => docInputRef.current?.click()}
              style={{ display:'inline-flex', alignItems:'center', gap:6, fontFamily:'var(--ff)', fontSize:13, fontWeight:500, color:'var(--accent)', background:'color-mix(in srgb,var(--accent) 8%,transparent)', border:'1px dashed color-mix(in srgb,var(--accent) 30%,transparent)', borderRadius:8, padding:'7px 14px', cursor:'pointer' }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="16 16 12 12 8 16"/><line x1="12" y1="12" x2="12" y2="21"/><path d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3"/></svg>
              Upload PDF
            </button>
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
