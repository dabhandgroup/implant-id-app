'use client'

import { useState } from 'react'
import { useMutation } from 'convex/react'
import { useRouter }   from 'next/navigation'
import { api as apiBase } from '../../../../../convex/_generated/api'
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const api = apiBase as any

const MRI_COLOUR: Record<string,string> = {
  safe: 'var(--ok)', conditional: '#b45309', unsafe: 'var(--err)', unknown: 'var(--muted)',
}
const MRI_LABEL: Record<string,string> = {
  safe: 'MR Safe', conditional: 'MR Conditional', unsafe: 'MR Unsafe', unknown: 'Unknown',
}
const CONFIDENCE_COLOUR: Record<string,string> = {
  High: 'var(--ok)', Medium: '#f59e0b', Low: 'var(--err)',
}

type DeviceType = 'active' | 'passive' | 'temp' | 'legacy'

interface MappedDevice {
  manufacturer:      string
  model:             string
  deviceType:        string
  classification:    'active' | 'passive' | 'legacy'
  mriStatus:         'safe' | 'conditional' | 'unsafe' | 'unknown'
  fieldStrengths?:   string
  sarLimit?:         string
  b1RmsLimit?:       string
  slewRateLimit?:    string
  contraindications?: string
  approvedRegions?:  string[]
}

interface ScrapeResult {
  mapped: MappedDevice
  raw:    Record<string, unknown>
  status: string
}

export default function ScrapeClient() {
  // ── All hooks unconditionally at top ─────────────────────────────────────
  const router     = useRouter()
  const addDevice  = useMutation(api.devices.addDevice)

  const [manufacturer, setManufacturer] = useState('')
  const [model,        setModel]        = useState('')
  const [deviceType,   setDeviceType]   = useState<DeviceType>('active')
  const [ifuUrl,       setIfuUrl]       = useState('')
  const [ifuText,      setIfuText]      = useState('')
  const [webSearch,    setWebSearch]    = useState(true)

  const [loading,   setLoading]   = useState(false)
  const [error,     setError]     = useState('')
  const [result,    setResult]    = useState<ScrapeResult | null>(null)

  // Editable mapped fields (pre-filled from scrape, user can adjust)
  const [editManufacturer,  setEditManufacturer]  = useState('')
  const [editModel,         setEditModel]         = useState('')
  const [editDeviceType,    setEditDeviceType]     = useState('')
  const [editMriStatus,     setEditMriStatus]     = useState<'safe'|'conditional'|'unsafe'|'unknown'>('unknown')
  const [editClassification,setEditClassification]= useState<'active'|'passive'|'legacy'>('active')
  const [editFieldStrengths,setEditFieldStrengths]= useState('')
  const [editSarLimit,      setEditSarLimit]      = useState('')
  const [editB1Rms,         setEditB1Rms]         = useState('')
  const [editContra,        setEditContra]        = useState('')

  const [adding,   setAdding]   = useState(false)
  const [added,    setAdded]    = useState(false)
  const [addError, setAddError] = useState('')

  // ── Handlers ──────────────────────────────────────────────────────────────

  async function handleScrape(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setResult(null)
    setAdded(false)
    setLoading(true)

    try {
      const res = await fetch('/api/devices/scrape', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ manufacturer, model, deviceType, ifuUrl, ifuText, useWebSearch: webSearch }),
      })
      const data = await res.json() as ScrapeResult & { error?: string }

      if (!res.ok || data.error) {
        setError(data.error ?? 'Extraction failed')
        return
      }

      setResult(data)
      // Pre-fill editable fields
      const m = data.mapped
      setEditManufacturer(m.manufacturer)
      setEditModel(m.model)
      setEditDeviceType(m.deviceType)
      setEditMriStatus(m.mriStatus)
      setEditClassification(m.classification)
      setEditFieldStrengths(m.fieldStrengths ?? '')
      setEditSarLimit(m.sarLimit ?? '')
      setEditB1Rms(m.b1RmsLimit ?? '')
      setEditContra(m.contraindications ?? '')
    } catch {
      setError('Network error — please try again')
    } finally {
      setLoading(false)
    }
  }

  async function handleAddToDb() {
    setAdding(true); setAddError('')
    try {
      await addDevice({
        manufacturer:      editManufacturer.trim(),
        model:             editModel.trim(),
        deviceType:        editDeviceType.trim() || deviceType,
        classification:    editClassification,
        mriStatus:         editMriStatus,
        fieldStrengths:    editFieldStrengths || undefined,
        sarLimit:          editSarLimit || undefined,
        b1RmsLimit:        editB1Rms || undefined,
        contraindications: editContra || undefined,
      })
      setAdded(true)
    } catch (e) {
      setAddError((e as { message?: string })?.message ?? 'Failed to add device')
    } finally {
      setAdding(false)
    }
  }

  // ── Render ────────────────────────────────────────────────────────────────

  const rawConfidence = result?.raw as Record<string, unknown> | undefined
  const sources       = (rawConfidence?._sources_consulted as Array<{ id: string; type?: string; title?: string; url?: string; accessible?: boolean }>) ?? []
  const fieldConf     = (rawConfidence?._field_confidence as Record<string, string>) ?? {}
  const conflicts     = (rawConfidence?._conflicts as Array<{ field: string; values: Array<{ value: unknown; source_id: string }> }>) ?? []
  const needsReview   = (rawConfidence?.needs_review as string[]) ?? []
  const confPct       = (rawConfidence?.confidence_pct as number) ?? 0

  return (
    <div className="m-content">
      <a href="/master/devices" className="m-back" style={{ display:'inline-flex',alignItems:'center',gap:6,color:'var(--muted)',fontFamily:'var(--ff)',fontSize:13.5,textDecoration:'none',marginBottom:24 }}>
        ← Back to devices
      </a>

      <div className="m-h">
        <div>
          <h2>Scrape device data</h2>
          <div className="sub">
            Enter a manufacturer + model and let AI extract the MRI safety fields from the official IFU or web sources.
            Review the results before adding to the catalogue.
          </div>
        </div>
      </div>

      <div style={{ display:'grid', gridTemplateColumns: result ? '1fr 1fr' : '560px', gap:24 }}>

        {/* ── LEFT: Input form ── */}
        <div>
          <form onSubmit={handleScrape}>
            {/* Device type tabs */}
            <div style={{ display:'flex', gap:6, marginBottom:16 }}>
              {(['active','passive','temp','legacy'] as DeviceType[]).map(t => (
                <button key={t} type="button"
                  className={deviceType === t ? 'btn btn-s' : 'btn'}
                  style={{ flex:1, fontSize:12, textTransform:'capitalize', padding:'7px 4px' }}
                  onClick={() => setDeviceType(t)}
                >
                  {t}
                </button>
              ))}
            </div>

            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, marginBottom:12 }}>
              <div className="field">
                <label>Manufacturer</label>
                <input className="input" type="text" placeholder="e.g. Medtronic" value={manufacturer} onChange={e => setManufacturer(e.target.value)} />
              </div>
              <div className="field">
                <label>Model</label>
                <input className="input" type="text" placeholder="e.g. Azure XT DR MRI" value={model} onChange={e => setModel(e.target.value)} />
              </div>
            </div>

            <div className="field" style={{ marginBottom:12 }}>
              <label>IFU / manual URL <span style={{ color:'var(--muted)', fontWeight:400 }}>(optional)</span></label>
              <input className="input" type="url" placeholder="https://manuals.medtronic.com/…" value={ifuUrl} onChange={e => setIfuUrl(e.target.value)} />
            </div>

            <div className="field" style={{ marginBottom:14 }}>
              <label>Paste IFU text <span style={{ color:'var(--muted)', fontWeight:400 }}>(optional — paste relevant sections)</span></label>
              <textarea className="input" rows={4} placeholder="Paste MRI safety sections from the IFU here…" value={ifuText} onChange={e => setIfuText(e.target.value)} style={{ resize:'vertical' }} />
            </div>

            {/* Web search toggle */}
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', background:'var(--bg2)', border:'1px solid var(--border)', borderRadius:10, padding:'12px 14px', marginBottom:16 }}>
              <div>
                <div style={{ fontFamily:'var(--ff)', fontSize:13.5, fontWeight:500, color:'var(--text)' }}>Web search</div>
                <div style={{ fontSize:12, color:'var(--muted)', marginTop:2 }}>
                  AI searches for the official IFU and manufacturer pages automatically
                </div>
              </div>
              <button type="button"
                style={{ width:40, height:22, borderRadius:11, border:'none', cursor:'pointer', transition:'background .2s', background: webSearch ? 'var(--accent)' : 'var(--border)', position:'relative', flexShrink:0 }}
                onClick={() => setWebSearch(w => !w)}
                aria-label="Toggle web search"
              >
                <span style={{ position:'absolute', top:3, width:16, height:16, borderRadius:'50%', background:'#fff', transition:'left .2s', left: webSearch ? 20 : 2 }} />
              </button>
            </div>

            {error && (
              <div style={{ color:'var(--err)', fontFamily:'var(--ff)', fontSize:13.5, marginBottom:12, background:'color-mix(in srgb,var(--err) 8%,transparent)', border:'1px solid color-mix(in srgb,var(--err) 20%,transparent)', borderRadius:8, padding:'10px 14px' }}>
                {error}
              </div>
            )}

            <button type="submit" className="btn btn-s btn-block" disabled={loading} style={{ fontSize:14 }}>
              {loading ? '⏳ Extracting data…' : '🔍 Extract device data'}
            </button>
          </form>

          {loading && (
            <div style={{ marginTop:16, padding:'14px 16px', background:'var(--bg2)', border:'1px solid var(--border)', borderRadius:10, fontFamily:'var(--ff)', fontSize:13, color:'var(--muted)', lineHeight:1.6 }}>
              <div style={{ fontWeight:600, color:'var(--text)', marginBottom:4 }}>Searching…</div>
              {webSearch ? 'Searching for the official IFU and MRI technical manual. This may take 15–30 seconds.' : 'Extracting from the provided source.'}
            </div>
          )}
        </div>

        {/* ── RIGHT: Results + edit ── */}
        {result && (
          <div>
            {/* Confidence banner */}
            <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:16, padding:'12px 16px', borderRadius:10, background: confPct >= 80 ? 'color-mix(in srgb,var(--ok) 8%,transparent)' : 'color-mix(in srgb,#f59e0b 8%,transparent)', border: `1px solid color-mix(in srgb,${confPct >= 80 ? 'var(--ok)' : '#f59e0b'} 20%,transparent)` }}>
              <div style={{ fontSize:22, fontWeight:700, color: confPct >= 80 ? 'var(--ok)' : '#b45309', fontFamily:'var(--ff)', width:48, flexShrink:0 }}>{confPct}%</div>
              <div>
                <div style={{ fontFamily:'var(--ff)', fontSize:13, fontWeight:600, color:'var(--text)' }}>
                  {confPct >= 80 ? 'High confidence' : confPct >= 50 ? 'Medium confidence — review flagged fields' : 'Low confidence — manual verification required'}
                </div>
                {needsReview.length > 0 && <div style={{ fontSize:12, color:'var(--muted)', marginTop:2 }}>Review: {needsReview.join(', ')}</div>}
              </div>
            </div>

            {/* Conflicts */}
            {conflicts.length > 0 && (
              <div style={{ marginBottom:12, padding:'10px 14px', borderRadius:8, background:'color-mix(in srgb,var(--err) 8%,transparent)', border:'1px solid color-mix(in srgb,var(--err) 20%,transparent)', fontSize:13 }}>
                <div style={{ fontFamily:'var(--ff)', fontWeight:600, color:'var(--err)', marginBottom:4 }}>⚠ Source conflicts — verify before adding</div>
                {conflicts.map((c, i) => (
                  <div key={i} style={{ color:'var(--muted)', fontSize:12 }}>
                    <strong>{c.field}</strong>: {c.values.map(v => `"${v.value}" (${v.source_id})`).join(' vs ')}
                  </div>
                ))}
              </div>
            )}

            {/* Editable extracted fields */}
            <div style={{ background:'var(--bg2)', border:'1px solid var(--border)', borderRadius:14, padding:'18px 20px', marginBottom:16 }}>
              <div style={{ fontFamily:'var(--ff)', fontSize:11, fontWeight:700, letterSpacing:'1px', textTransform:'uppercase', color:'var(--muted2)', marginBottom:14, display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                Extracted fields
                <span style={{ fontSize:10, fontWeight:400, color:'var(--muted)', textTransform:'none', letterSpacing:0 }}>Edit before saving</span>
              </div>

              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
                {[
                  { label:'Manufacturer', value:editManufacturer, set:setEditManufacturer, conf:fieldConf.manufacturer },
                  { label:'Model',        value:editModel,        set:setEditModel,        conf:fieldConf.device_name },
                  { label:'Device type',  value:editDeviceType,   set:setEditDeviceType,   conf:fieldConf.device_type },
                  { label:'Field strengths', value:editFieldStrengths, set:setEditFieldStrengths, conf:fieldConf.field_strength_15t },
                  { label:'SAR limit',    value:editSarLimit,     set:setEditSarLimit,     conf:fieldConf.whole_body_sar_limit },
                  { label:'B1+rms limit', value:editB1Rms,        set:setEditB1Rms,        conf:fieldConf.b1rms_limit },
                ].map(f => (
                  <div key={f.label}>
                    <div style={{ display:'flex', justifyContent:'space-between', marginBottom:4 }}>
                      <label style={{ fontFamily:'var(--ff)', fontSize:11, color:'var(--muted2)' }}>{f.label}</label>
                      {f.conf && (
                        <span style={{ fontSize:10, fontWeight:600, color: CONFIDENCE_COLOUR[f.conf] ?? 'var(--muted)' }}>{f.conf}</span>
                      )}
                    </div>
                    <input className="input" type="text" value={f.value} onChange={e => f.set(e.target.value)} style={{ fontSize:13 }} />
                  </div>
                ))}
              </div>

              {/* MRI Status */}
              <div style={{ marginTop:12 }}>
                <div style={{ display:'flex', justifyContent:'space-between', marginBottom:6 }}>
                  <label style={{ fontFamily:'var(--ff)', fontSize:11, color:'var(--muted2)' }}>MRI Status</label>
                  {fieldConf.mri_classification && (
                    <span style={{ fontSize:10, fontWeight:600, color: CONFIDENCE_COLOUR[fieldConf.mri_classification] ?? 'var(--muted)' }}>{fieldConf.mri_classification}</span>
                  )}
                </div>
                <div style={{ display:'flex', gap:8 }}>
                  {(['safe','conditional','unsafe','unknown'] as const).map(s => (
                    <button key={s} type="button"
                      style={{ flex:1, padding:'8px 4px', borderRadius:6, cursor:'pointer', fontFamily:'var(--ff)', fontSize:11.5, fontWeight:600, transition:'all .15s',
                        background: editMriStatus === s ? (s === 'safe' ? 'var(--ok)' : s === 'conditional' ? '#d97706' : s === 'unsafe' ? 'var(--err)' : 'var(--muted)') : 'var(--bg)',
                        color:      editMriStatus === s ? '#fff' : 'var(--muted)',
                        border:     editMriStatus === s ? '2px solid transparent' : '1px solid var(--border)',
                      }}
                      onClick={() => setEditMriStatus(s)}
                    >
                      {MRI_LABEL[s]}
                    </button>
                  ))}
                </div>
              </div>

              {/* Classification */}
              <div style={{ marginTop:12 }}>
                <label style={{ fontFamily:'var(--ff)', fontSize:11, color:'var(--muted2)', display:'block', marginBottom:6 }}>Classification</label>
                <div style={{ display:'flex', gap:8 }}>
                  {(['active','passive','legacy'] as const).map(c => (
                    <button key={c} type="button"
                      className={editClassification === c ? 'btn btn-s' : 'btn'}
                      style={{ flex:1, fontSize:12, textTransform:'capitalize' }}
                      onClick={() => setEditClassification(c)}
                    >
                      {c}
                    </button>
                  ))}
                </div>
              </div>

              {/* Contraindications */}
              <div style={{ marginTop:12 }}>
                <label style={{ fontFamily:'var(--ff)', fontSize:11, color:'var(--muted2)', display:'block', marginBottom:4 }}>Contraindications / special conditions</label>
                <textarea className="input" rows={3} value={editContra} onChange={e => setEditContra(e.target.value)} style={{ resize:'vertical', fontSize:13 }} />
              </div>
            </div>

            {/* Sources */}
            {sources.length > 0 && (
              <div style={{ background:'var(--bg2)', border:'1px solid var(--border)', borderRadius:10, padding:'14px 16px', marginBottom:16 }}>
                <div style={{ fontFamily:'var(--ff)', fontSize:11, fontWeight:700, letterSpacing:'1px', textTransform:'uppercase', color:'var(--muted2)', marginBottom:10 }}>Sources consulted</div>
                {sources.map((s, i) => (
                  <div key={i} style={{ display:'flex', gap:8, marginBottom:6, alignItems:'flex-start' }}>
                    <span style={{ fontFamily:'var(--ff)', fontSize:10, fontWeight:600, padding:'2px 6px', borderRadius:4, background: s.accessible !== false ? 'color-mix(in srgb,var(--ok) 12%,transparent)' : 'color-mix(in srgb,var(--err) 10%,transparent)', color: s.accessible !== false ? 'var(--ok)' : 'var(--err)', flexShrink:0 }}>
                      {s.accessible !== false ? '✓' : '⚠'} {s.type ?? 'src'}
                    </span>
                    <div>
                      {s.title && <div style={{ fontFamily:'var(--ff)', fontSize:12.5, color:'var(--text)' }}>{s.title}</div>}
                      {s.url && <a href={s.url} target="_blank" rel="noopener noreferrer" style={{ fontSize:11.5, color:'var(--accent)', wordBreak:'break-all' }}>{s.url}</a>}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Add to catalogue */}
            {added ? (
              <div style={{ background:'color-mix(in srgb,var(--ok) 10%,transparent)', border:'1px solid color-mix(in srgb,var(--ok) 25%,transparent)', borderRadius:10, padding:'14px 18px', display:'flex', alignItems:'center', gap:10 }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--ok)" strokeWidth="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
                <span style={{ fontFamily:'var(--ff)', fontSize:13.5, color:'var(--ok)', fontWeight:500 }}>Added to device catalogue</span>
                <button className="btn" style={{ marginLeft:'auto', fontSize:12 }} onClick={() => router.push('/master/devices')}>View all devices</button>
              </div>
            ) : (
              <>
                {addError && <div style={{ color:'var(--err)', fontSize:13, marginBottom:8, fontFamily:'var(--ff)' }}>{addError}</div>}
                <button className="btn btn-s btn-block" disabled={adding || !editManufacturer || !editModel} onClick={handleAddToDb} style={{ fontSize:14 }}>
                  {adding ? 'Adding…' : '+ Add to device catalogue'}
                </button>
                <p style={{ fontFamily:'var(--ff)', fontSize:12, color:'var(--muted)', textAlign:'center', marginTop:8 }}>
                  Review the fields above before adding. You can edit any value directly.
                </p>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
