'use client'

import { useState, useEffect, useRef } from 'react'
import { useMutation, useQuery } from 'convex/react'
import { useRouter }   from 'next/navigation'
import { tint } from '@/lib/tint'
import { api as apiBase } from '../../../../../convex/_generated/api'
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const api = apiBase as any

function MriIcon({ status, size = 24 }: { status: string; size?: number }) {
  const src = status === 'safe' ? '/mr-safe.svg' : status === 'conditional' ? '/mr-conditional.svg' : status === 'unsafe' ? '/mr-unsafe.svg' : null
  if (!src) return null
  return <img src={src} alt={MRI_LABEL[status] ?? status} style={{ width: size, height: size, flexShrink: 0, verticalAlign: 'middle' }} />
}

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

// ── History row ───────────────────────────────────────────────────────────────

function HistoryRow({ job, isActive, onLoad }: { job: any; isActive: boolean; onLoad: (job: any) => void }) {
  const isComplete = job.status === 'complete'
  const isError    = job.status === 'error'
  const isPending  = job.status === 'pending'
  const mri        = job.result?.mapped?.mriStatus
  const conf       = job.result?.raw?.confidence_pct as number | undefined

  return (
    <div
      onClick={() => isComplete && onLoad(job)}
      style={{
        display:'flex', alignItems:'center', gap:14, padding:'13px 18px',
        borderBottom:'1px solid var(--border)',
        cursor: isComplete ? 'pointer' : 'default',
        background: isActive ? 'rgba(var(--accent-rgb),0.06)' : 'transparent',
        transition: 'background .15s',
      }}
    >
      {/* Status dot */}
      <div style={{ width:8, height:8, borderRadius:'50%', flexShrink:0,
        background: isComplete ? 'var(--ok)' : isError ? 'var(--err)' : 'var(--accent)',
        boxShadow: isPending ? '0 0 0 3px rgba(var(--accent-rgb),0.25)' : 'none',
      }} />

      {/* Device info */}
      <div style={{ flex:1, minWidth:0 }}>
        <div style={{ fontFamily:'var(--ff)', fontSize:13.5, fontWeight:500, color:'var(--text)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
          {job.manufacturer} — {job.model}
        </div>
        <div style={{ fontSize:12, color:'var(--muted)', marginTop:2 }}>
          {new Date(job.createdAt).toLocaleString('en-GB', { day:'numeric', month:'short', hour:'2-digit', minute:'2-digit' })}
          {' · '}
          <span style={{ textTransform:'capitalize' }}>
            {isPending ? 'In progress…' : isError ? (job.errorMessage ?? 'Error') : job.deviceType}
          </span>
        </div>
      </div>

      {/* Right: MRI badge, confidence, CTA — stacked column so nothing wraps or overflows */}
      {isComplete && (
        <div style={{ display:'flex', flexDirection:'column', alignItems:'flex-end', gap:4, flexShrink:0 }}>
          {mri && (
            <div style={{ display:'flex', alignItems:'center', gap:4 }}>
              <MriIcon status={mri} size={13} />
              <span style={{ fontFamily:'var(--ff)', fontSize:11, fontWeight:600, color:MRI_COLOUR[mri], whiteSpace:'nowrap' }}>{MRI_LABEL[mri]}</span>
            </div>
          )}
          <div style={{ display:'flex', alignItems:'center', gap:8 }}>
            {conf !== undefined && (
              <span style={{ fontFamily:'var(--ff)', fontSize:12, fontWeight:700, color: conf >= 80 ? 'var(--ok)' : conf >= 50 ? '#f59e0b' : 'var(--err)' }}>
                {conf}%
              </span>
            )}
            <span style={{ fontFamily:'var(--ff)', fontSize:12, color:'var(--accent)', fontWeight:500 }}>
              {isActive ? 'Loaded' : 'Load →'}
            </span>
          </div>
        </div>
      )}
      {isPending && (
        <div style={{ fontFamily:'var(--ff)', fontSize:12, color:'var(--accent)', flexShrink:0 }}>running…</div>
      )}
      {isError && (
        <div style={{ fontFamily:'var(--ff)', fontSize:12, color:'var(--err)', flexShrink:0 }}>failed</div>
      )}
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

export default function ScrapeClient() {
  const router            = useRouter()
  const addDevice         = useMutation(api.devices.addDevice)
  const createJob         = useMutation(api.scrapeJobs.createScrapeJob)
  const completeJob       = useMutation(api.scrapeJobs.completeScrapeJob)
  const failJob           = useMutation(api.scrapeJobs.failScrapeJob)
  const history           = useQuery(api.scrapeJobs.listScrapeJobs, { limit: 15 })

  const [manufacturer, setManufacturer] = useState('')
  const [model,        setModel]        = useState('')
  const [deviceType,   setDeviceType]   = useState<DeviceType>('active')
  const [ifuUrl,       setIfuUrl]       = useState('')
  const [ifuText,      setIfuText]      = useState('')
  const [webSearch,    setWebSearch]    = useState(true)

  const [loading,   setLoading]   = useState(false)
  const [elapsed,   setElapsed]   = useState(0)
  const timerRef                  = useRef<ReturnType<typeof setInterval> | null>(null)
  const [error,     setError]     = useState('')
  const [result,    setResult]    = useState<ScrapeResult | null>(null)
  const [activeJobId,  setActiveJobId]  = useState<string | null>(null)
  const [loadedJobId,  setLoadedJobId]  = useState<string | null>(null)
  const resultsRef                      = useRef<HTMLDivElement | null>(null)

  // Elapsed timer
  useEffect(() => {
    if (loading) {
      setElapsed(0)
      timerRef.current = setInterval(() => setElapsed(s => s + 1), 1000)
    } else {
      if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null }
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current) }
  }, [loading])

  // Editable mapped fields
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
  const [certified, setCertified] = useState(false)

  function loadResult(data: ScrapeResult, fallbacks?: { manufacturer?: string; model?: string }) {
    setResult(data)
    const m = data.mapped
    setEditManufacturer(m.manufacturer || fallbacks?.manufacturer || '')
    setEditModel(m.model || fallbacks?.model || '')
    setEditDeviceType(m.deviceType)
    setEditMriStatus(m.mriStatus)
    setEditClassification(m.classification)
    setEditFieldStrengths(m.fieldStrengths ?? '')
    setEditSarLimit(m.sarLimit ?? '')
    setEditB1Rms(m.b1RmsLimit ?? '')
    setEditContra(m.contraindications ?? '')
    setAdded(false)
    setAddError('')
    setCertified(false)
  }

  function loadFromHistory(job: any) {
    if (!job.result) return
    loadResult(job.result as ScrapeResult, { manufacturer: job.manufacturer, model: job.model })
    setLoadedJobId(job._id)
    setManufacturer(job.manufacturer)
    setModel(job.model)
    // Scroll to results panel below the form
    setTimeout(() => {
      resultsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }, 50)
  }

  async function handleScrape(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setResult(null)
    setAdded(false)
    setLoading(true)

    // Create a persisted job record immediately so it survives navigation
    const jobId = await createJob({
      manufacturer,
      model,
      deviceType,
      ifuUrl: ifuUrl || undefined,
    })
    setActiveJobId(String(jobId))

    try {
      const res = await fetch('/api/devices/scrape', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ manufacturer, model, deviceType, ifuUrl, ifuText, useWebSearch: webSearch }),
      })
      const data = await res.json() as ScrapeResult & { error?: string }

      if (!res.ok || data.error) {
        const msg = data.error ?? 'Extraction failed'
        await failJob({ jobId, errorMessage: msg })
        setError(msg)
        return
      }

      // Persist result to Convex so it shows in history
      await completeJob({ jobId, result: data })
      setLoadedJobId(String(jobId))
      loadResult(data, { manufacturer, model })
    } catch {
      const msg = 'Network error — please try again'
      await failJob({ jobId, errorMessage: msg }).catch(() => {})
      setError(msg)
    } finally {
      setLoading(false)
      setActiveJobId(null)
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
        sourceUrl:         (result?.mapped as any)?.sourceUrl || undefined,
        pdfLinks:          pdfLinks.length > 0 ? pdfLinks : undefined,
        sourcesRaw:        sources.length > 0 ? JSON.stringify(sources) : undefined,
      })
      setAdded(true)
    } catch (e) {
      setAddError((e as { message?: string })?.message ?? 'Failed to add device')
    } finally {
      setAdding(false)
    }
  }

  const rawConfidence = result?.raw as Record<string, unknown> | undefined
  const sources       = (rawConfidence?._sources_consulted as Array<{ id: string; type?: string; title?: string; url?: string; accessible?: boolean }>) ?? []
  const pdfLinks      = (result?.mapped as any)?.pdfLinks as string[] | undefined ?? []
  const fieldConf     = (rawConfidence?._field_confidence as Record<string, string>) ?? {}
  const conflicts     = (rawConfidence?._conflicts as Array<{ field: string; values: Array<{ value: unknown; source_id: string }> }>) ?? []
  const needsReview   = (rawConfidence?.needs_review as string[]) ?? []
  const confPct       = (rawConfidence?.confidence_pct as number) ?? 0

  const pendingJobs   = (history ?? []).filter((j: any) => j.status === 'pending')

  return (
    <div className="m-content">
      <a href="/master/devices" className="m-back" style={{ display:'inline-flex',alignItems:'center',gap:6,color:'var(--muted)',fontFamily:'var(--ff)',fontSize:13.5,textDecoration:'none',marginBottom:24 }}>
        ← Back to devices
      </a>

      <div>
        {/* ── Header ── */}
        <div className="m-h" style={{ marginBottom:20 }}>
          <div>
            <h2>Scrape device data</h2>
            <div className="sub">
              Enter a manufacturer + model and let AI extract the MRI safety fields from the official IFU or web sources.
              Review the results before adding to the catalogue.
            </div>
          </div>
        </div>

        {/* ── Form (capped width for readability) ── */}
        <div style={{ maxWidth: 760 }}>

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

            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(200px, 1fr))', gap:12, marginBottom:12 }}>
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
              <div style={{ color:'var(--err)', fontFamily:'var(--ff)', fontSize:13.5, marginBottom:12, background:'rgba(var(--err-rgb),0.08)', border:'1px solid rgba(var(--err-rgb),0.20)', borderRadius:8, padding:'10px 14px' }}>
                {error}
              </div>
            )}

            <button type="submit" className="btn btn-s btn-block" disabled={loading || !manufacturer || !model} style={{ fontSize:14 }}>
              {loading ? `⏳ Extracting data… ${elapsed}s` : '🔍 Extract device data'}
            </button>
          </form>

          {/* Progress panel */}
          {loading && (
            <div style={{ marginTop:16, padding:'18px 20px', background:'var(--bg2)', border:'1px solid var(--border)', borderRadius:12 }}>
              <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:14 }}>
                <div style={{ fontFamily:'var(--ff)', fontWeight:600, color:'var(--text)', fontSize:14 }}>
                  {webSearch ? 'Searching sources…' : 'Extracting from provided source…'}
                </div>
                <div style={{ fontFamily:'var(--fb)', fontSize:13, color:'var(--muted)', background:'var(--bg)', border:'1px solid var(--border)', borderRadius:6, padding:'3px 10px' }}>
                  {elapsed}s elapsed
                </div>
              </div>
              {webSearch && (
                <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                  {[
                    { label:`${manufacturer || 'OEM'} official website`,                delay: 0  },
                    { label:`${manufacturer || 'Manufacturer'} IFU / manual library`,   delay: 3  },
                    { label:'FDA medical device database',                               delay: 6  },
                    { label:'EU MDR / EUDAMED registry',                                delay: 10 },
                    { label:'Third-party MRI safety databases',                          delay: 15 },
                    { label:'Cross-referencing extracted parameters',                    delay: 20 },
                  ].map((s, i) => {
                    const active = elapsed >= s.delay
                    const done   = i < Math.floor(elapsed / 5)
                    return (
                      <div key={s.label} style={{ display:'flex', alignItems:'center', gap:10, opacity: active ? 1 : 0.3, transition:'opacity .5s' }}>
                        <div style={{ width:16, height:16, borderRadius:'50%', flexShrink:0, border:`2px solid ${done ? 'var(--ok)' : active ? 'var(--accent)' : 'var(--border)'}`, background: done ? 'var(--ok)' : 'transparent', display:'grid', placeItems:'center' }}>
                          {done && <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3"><path d="M20 6L9 17l-5-5"/></svg>}
                          {!done && active && <span style={{ width:6, height:6, borderRadius:'50%', background:'var(--accent)', animation:'pending-pulse 1s ease-in-out infinite', display:'block' }}/>}
                        </div>
                        <span style={{ fontFamily:'var(--fb)', fontSize:13, color: done ? 'var(--ok)' : active ? 'var(--text)' : 'var(--muted)' }}>
                          {s.label}
                        </span>
                        {!done && active && <span style={{ fontFamily:'var(--ff)', fontSize:11, color:'var(--muted)', marginLeft:'auto' }}>checking…</span>}
                        {done && <span style={{ fontFamily:'var(--ff)', fontSize:11, color:'var(--ok)', marginLeft:'auto' }}>✓ checked</span>}
                      </div>
                    )
                  })}
                </div>
              )}
              {!webSearch && (
                <div style={{ fontFamily:'var(--fb)', fontSize:13, color:'var(--muted)' }}>
                  Parsing the provided {ifuUrl ? 'URL' : 'text'} and extracting MRI safety parameters…
                </div>
              )}
            </div>
          )}

        </div>{/* end maxWidth:760 form wrapper */}

        {/* Results — full width */}
        {result && (
          <div ref={resultsRef} style={{ marginTop: 24 }}>
              {/* Confidence banner */}
              <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:16, padding:'12px 16px', borderRadius:10, background: confPct >= 80 ? 'rgba(var(--ok-rgb),0.08)' : 'rgba(245,158,11,0.08)', border: `1px solid ${tint(confPct >= 80 ? 'var(--ok)' : '#f59e0b', 20)}` }}>
                <div style={{ fontSize:22, fontWeight:700, color: confPct >= 80 ? 'var(--ok)' : '#b45309', fontFamily:'var(--ff)', width:48, flexShrink:0 }}>{confPct}%</div>
                <div>
                  <div style={{ fontFamily:'var(--ff)', fontSize:13, fontWeight:600, color:'var(--text)' }}>
                    {confPct >= 80 ? 'High confidence' : confPct >= 50 ? 'Medium confidence — review flagged fields' : 'Low confidence — manual verification required'}
                  </div>
                  {needsReview.length > 0 && <div style={{ fontSize:12, color:'var(--muted)', marginTop:2 }}>Review: {needsReview.join(', ')}</div>}
                </div>
              </div>

              {conflicts.length > 0 && (
                <div style={{ marginBottom:12, padding:'10px 14px', borderRadius:8, background:'rgba(var(--err-rgb),0.08)', border:'1px solid rgba(var(--err-rgb),0.20)', fontSize:13 }}>
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
                <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(200px, 1fr))', gap:10 }}>
                  {[
                    { label:'Manufacturer',    value:editManufacturer,  set:setEditManufacturer,  conf:fieldConf.manufacturer },
                    { label:'Model',           value:editModel,         set:setEditModel,         conf:fieldConf.device_name },
                    { label:'Device type',     value:editDeviceType,    set:setEditDeviceType,    conf:fieldConf.device_type },
                    { label:'Field strengths', value:editFieldStrengths,set:setEditFieldStrengths,conf:fieldConf.field_strength_15t },
                    { label:'SAR limit',       value:editSarLimit,      set:setEditSarLimit,      conf:fieldConf.whole_body_sar_limit },
                    { label:'B1+rms limit',    value:editB1Rms,         set:setEditB1Rms,         conf:fieldConf.b1rms_limit },
                  ].map(f => (
                    <div key={f.label}>
                      <div style={{ display:'flex', justifyContent:'space-between', marginBottom:4 }}>
                        <label style={{ fontFamily:'var(--ff)', fontSize:11, color:'var(--muted2)' }}>{f.label}</label>
                        {f.conf && <span style={{ fontSize:10, fontWeight:600, color: CONFIDENCE_COLOUR[f.conf] ?? 'var(--muted)' }}>{f.conf}</span>}
                      </div>
                      <input className="input" type="text" value={f.value} onChange={e => f.set(e.target.value)} style={{ fontSize:13 }} />
                    </div>
                  ))}
                </div>
                {/* MRI Status */}
                <div style={{ marginTop:12 }}>
                  <div style={{ display:'flex', justifyContent:'space-between', marginBottom:6 }}>
                    <label style={{ fontFamily:'var(--ff)', fontSize:11, color:'var(--muted2)' }}>MRI Status</label>
                    {fieldConf.mri_classification && <span style={{ fontSize:10, fontWeight:600, color: CONFIDENCE_COLOUR[fieldConf.mri_classification] ?? 'var(--muted)' }}>{fieldConf.mri_classification}</span>}
                  </div>
                  <div style={{ display:'flex', flexWrap:'wrap', gap:8 }}>
                    {(['safe','conditional','unsafe','unknown'] as const).map(s => (
                      <button key={s} type="button"
                        style={{ flex:'1 1 calc(50% - 4px)', minWidth:0, padding:'8px 6px', borderRadius:6, cursor:'pointer', fontFamily:'var(--ff)', fontSize:11.5, fontWeight:600, transition:'all .15s',
                          background: editMriStatus === s ? (s === 'safe' ? 'var(--ok)' : s === 'conditional' ? '#d97706' : s === 'unsafe' ? 'var(--err)' : 'var(--muted)') : 'var(--bg)',
                          color:      editMriStatus === s ? '#fff' : 'var(--muted)',
                          border:     editMriStatus === s ? '2px solid transparent' : '1px solid var(--border)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
                        }}
                        onClick={() => setEditMriStatus(s)}
                      >
                        {s !== 'unknown' && <MriIcon status={s} size={16} />}
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

              {/* PDF sources — prominent for clinic verification */}
              {pdfLinks.length > 0 && (
                <div style={{ background:'rgba(var(--accent-rgb),0.06)', border:'1px solid rgba(var(--accent-rgb),0.20)', borderRadius:10, padding:'14px 16px', marginBottom:16 }}>
                  <div style={{ fontFamily:'var(--ff)', fontSize:11, fontWeight:700, letterSpacing:'1px', textTransform:'uppercase', color:'var(--accent-deep)', marginBottom:10 }}>
                    📄 Source documents (IFU / MRI Manual)
                  </div>
                  <div style={{ fontSize:12, color:'var(--muted)', marginBottom:8 }}>These PDFs were found during extraction. Clinicians can use these to independently verify the data below.</div>
                  {pdfLinks.map((url, i) => (
                    <a key={i} href={url} target="_blank" rel="noopener noreferrer"
                      style={{ display:'flex', alignItems:'center', gap:8, padding:'8px 10px', background:'var(--bg2)', borderRadius:7, marginBottom:6, textDecoration:'none', border:'1px solid var(--border)' }}
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--err)" strokeWidth="1.7" style={{ flexShrink:0 }}><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
                      <span style={{ fontFamily:'var(--ff)', fontSize:12.5, color:'var(--accent)', wordBreak:'break-all' }}>{url}</span>
                    </a>
                  ))}
                </div>
              )}

              {/* Web sources consulted */}
              {sources.length > 0 && (
                <div style={{ background:'var(--bg2)', border:'1px solid var(--border)', borderRadius:10, padding:'14px 16px', marginBottom:16 }}>
                  <div style={{ fontFamily:'var(--ff)', fontSize:11, fontWeight:700, letterSpacing:'1px', textTransform:'uppercase', color:'var(--muted2)', marginBottom:10 }}>Sources consulted</div>
                  {sources.map((s, i) => (
                    <div key={i} style={{ display:'flex', gap:8, marginBottom:6, alignItems:'flex-start' }}>
                      <span style={{ fontFamily:'var(--ff)', fontSize:10, fontWeight:600, padding:'2px 6px', borderRadius:4, background: s.accessible !== false ? 'rgba(var(--ok-rgb),0.12)' : 'rgba(var(--err-rgb),0.10)', color: s.accessible !== false ? 'var(--ok)' : 'var(--err)', flexShrink:0 }}>
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

              {/* Certification + Add to catalogue */}
              {added ? (
                <div style={{ background:'rgba(var(--ok-rgb),0.10)', border:'1px solid rgba(var(--ok-rgb),0.25)', borderRadius:10, padding:'14px 18px', display:'flex', alignItems:'center', gap:10 }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--ok)" strokeWidth="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
                  <span style={{ fontFamily:'var(--ff)', fontSize:13.5, color:'var(--ok)', fontWeight:500 }}>Added to device catalogue</span>
                  <button className="btn" style={{ marginLeft:'auto', fontSize:12 }} onClick={() => router.push('/master/devices')}>View all devices</button>
                </div>
              ) : (
                <>
                  {/* Certification checkbox — mandatory before adding */}
                  <div style={{ background:'rgba(var(--warn-rgb),0.06)', border:'1px solid rgba(var(--warn-rgb),0.25)', borderRadius:10, padding:'14px 16px', marginBottom:14 }}>
                    <label style={{ display:'flex', alignItems:'flex-start', gap:10, cursor:'pointer' }}>
                      <input type="checkbox" checked={certified} onChange={e => setCertified(e.target.checked)}
                        style={{ marginTop:2, accentColor:'var(--accent)', width:15, height:15, flexShrink:0 }} />
                      <span style={{ fontFamily:'var(--fb)', fontSize:13, color:'var(--text)', lineHeight:1.5 }}>
                        I have independently verified the MRI safety data above against the manufacturer's IFU or official source documentation.
                        I certify this information is accurate and authorised for submission to the Implant ID device catalogue.
                      </span>
                    </label>
                  </div>
                  {addError && <div style={{ color:'var(--err)', fontFamily:'var(--ff)', fontSize:13.5, marginBottom:12, background:'rgba(var(--err-rgb),0.08)', border:'1px solid rgba(var(--err-rgb),0.20)', borderRadius:8, padding:'10px 14px' }}>{addError}</div>}
                  <button type="button" className="btn btn-s btn-block" disabled={adding || !editManufacturer || !editModel || !certified} onClick={handleAddToDb} style={{ fontSize:14 }}>
                    {adding ? 'Adding…' : '+ Add to device catalogue'}
                  </button>
                  {!certified && (
                    <p style={{ fontFamily:'var(--ff)', fontSize:12, color:'var(--muted)', textAlign:'center', marginTop:8 }}>
                      You must verify the data and tick the box above before adding.
                    </p>
                  )}
                </>
              )}
            </div>
          )}
        {/* ── Scrape history — full width, below everything ── */}
        {(history === undefined || history.length > 0) && (
          <div style={{ marginTop: result ? 40 : 32 }}>
            <div style={{ background:'var(--bg2)', border:'1px solid var(--border)', borderRadius:14, overflow:'hidden' }}>

              {/* Header */}
              <div style={{ padding:'14px 20px', borderBottom:'1px solid var(--border)', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
                <div style={{ fontFamily:'var(--ff)', fontSize:14, fontWeight:600, color:'var(--text)' }}>
                  Scrape history
                </div>
                {pendingJobs.length > 0 && (
                  <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                    <span style={{ width:7, height:7, borderRadius:'50%', background:'var(--accent)', animation:'pending-pulse 1s ease-in-out infinite', display:'block' }} />
                    <span style={{ fontFamily:'var(--ff)', fontSize:12, color:'var(--accent)' }}>
                      {pendingJobs.length} running
                    </span>
                  </div>
                )}
              </div>

              {/* Rows */}
              {history === undefined ? (
                <div style={{ padding:'20px', color:'var(--muted)', fontSize:13, fontFamily:'var(--ff)' }}>Loading…</div>
              ) : (
                <div>
                  {history.map((job: any) => (
                    <HistoryRow
                      key={job._id}
                      job={job}
                      isActive={job._id === loadedJobId}
                      onLoad={loadFromHistory}
                    />
                  ))}
                </div>
              )}

            </div>
          </div>
        )}

      </div>
    </div>
  )
}
