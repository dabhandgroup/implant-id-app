'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { CustomSelect } from '@/components/ui/CustomSelect'

// ── Device type options by category ──────────────────────────────────────────

const typesByCategory: Record<string, string[]> = {
  'Active Implant': [
    'Cardiac Pacemaker', 'ICD / Defibrillator', 'Cochlear Implant',
    'Spinal Cord Stimulator', 'Deep Brain Stimulator', 'Drug Delivery Pump',
    'Neurostimulator', 'Continuous Glucose Monitor',
  ],
  'Passive Implant': [
    'Hip Replacement', 'Knee Replacement', 'Shoulder Implant',
    'Spinal Cage / Fusion', 'Vascular Stent', 'Breast Implant',
    'Dental Implant', 'Intraocular Lens',
  ],
  'Legacy Device': [
    'Hip Replacement (legacy)', 'Knee Replacement (legacy)',
    'Cardiac Device (legacy)', 'Other Legacy Implant',
  ],
}

const regionOptions = [
  'Cardiac / Thoracic', 'Orthopaedic — Lower Limb', 'Orthopaedic — Upper Limb',
  'Spine / Neurovascular', 'Cranial / Skull', 'Head & Neck', 'Abdominal',
  'Urological / Pelvic', 'Multi-region',
]

const sourceTypeOptions = [
  'MRI Conditions PDF', 'Instructions for Use (IFU)', 'Product Leaflet',
  'Clinical Study / White Paper', 'Regulatory Submission Document',
]

const rfModeOptions = ['Circularly Polarized (CP)', 'Linearly Polarized (LP)', 'CP + LP']

const teslaOptions = ['0.5 T', '1.0 T', '1.5 T', '3.0 T', '7.0 T']
const orientOptions = ['Supine', 'Prone', 'Lateral — Left', 'Lateral — Right', 'Head First', 'Feet First']

const regions = [
  { id: 'aunz', label: 'Australia / New Zealand', flag: '🇦🇺' },
  { id: 'uk',   label: 'United Kingdom',           flag: '🇬🇧' },
  { id: 'us',   label: 'United States',            flag: '🇺🇸' },
  { id: 'eu',   label: 'European Union',           flag: '🇪🇺' },
]

// ── Component ─────────────────────────────────────────────────────────────────

export default function AddDeviceClient() {
  // Section 1 — Identification
  const [category,      setCategory]      = useState('')
  const [deviceType,    setDeviceType]    = useState('')
  const [deviceName,    setDeviceName]    = useState('')
  const [modelNumber,   setModelNumber]   = useState('')
  const [implantRegion, setImplantRegion] = useState('')
  const [gmdnCode,      setGmdnCode]      = useState('')
  const [description,   setDescription]  = useState('')

  // Section 2 — MRI
  const [mriClass,      setMriClass]      = useState<'safe'|'conditional'|'unsafe'|''>('')
  const [teslaRatings,  setTeslaRatings]  = useState<string[]>([])
  const [mriNotes,      setMriNotes]      = useState('')

  // Section 3 — SAR (only if conditional)
  const [sarAWb,  setSarAWb]  = useState('')
  const [sarAHd,  setSarAHd]  = useState('')
  const [sarAB1,  setSarAB1]  = useState('')
  const [sarBWb,  setSarBWb]  = useState('')
  const [sarBHd,  setSarBHd]  = useState('')
  const [sarBB1,  setSarBB1]  = useState('')
  const [slew,    setSlew]    = useState('')
  const [dbdt,    setDbdt]    = useState('')
  const [spatial, setSpatial] = useState('')
  const [rfMode,  setRfMode]  = useState('')

  // Section 4 — Restrictions
  const [maxScan,     setMaxScan]     = useState('')
  const [coolOff,     setCoolOff]     = useState('')
  const [postWait,    setPostWait]    = useState('')
  const [orientations,setOrientations]= useState<string[]>([])
  const [preScan,     setPreScan]     = useState('')
  const [postScan,    setPostScan]    = useState('')
  const [patientInstr,setPatientInstr]= useState('')

  // Section 5 — Documents
  const [sourceUrl,    setSourceUrl]    = useState('')
  const [sourceType,   setSourceType]   = useState('')
  const [uploadedFile, setUploadedFile] = useState<string | null>(null)
  const [externalLink, setExternalLink] = useState('')
  const [implantImage, setImplantImage] = useState<string | null>(null)

  // Regional approvals
  const [regOpen, setRegOpen]   = useState<string[]>([])
  const [regNums, setRegNums]   = useState<Record<string,string>>({})
  const [regDates, setRegDates] = useState<Record<string,string>>({})

  // Certification
  const [cert1, setCert1] = useState(false)
  const [cert2, setCert2] = useState(false)
  const [cert3, setCert3] = useState(false)

  // Signature — prefilled for master admin
  const [sigMode,       setSigMode]       = useState<'draw'|'type'>('type')
  const [sigName,       setSigName]       = useState('Master Admin')
  const [sigTitle,      setSigTitle]      = useState('Implant ID Master User')
  const [sigHasDrawing, setSigHasDrawing] = useState(false)

  const canvasRef    = useRef<HTMLCanvasElement>(null)
  const isDrawingRef = useRef(false)
  const today        = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' })

  // Initialise canvas when switching to draw mode
  useEffect(() => {
    if (sigMode !== 'draw') return
    const canvas = canvasRef.current
    if (!canvas) return
    const dpr = window.devicePixelRatio || 1
    const rect = canvas.getBoundingClientRect()
    canvas.width  = rect.width  * dpr
    canvas.height = rect.height * dpr
    const ctx = canvas.getContext('2d')
    if (ctx) {
      ctx.scale(dpr, dpr)
      ctx.strokeStyle = '#2d4a54'
      ctx.lineWidth   = 1.8
      ctx.lineCap     = 'round'
      ctx.lineJoin    = 'round'
    }
  }, [sigMode])

  function getPos(e: React.MouseEvent<HTMLCanvasElement>) {
    const canvas = e.currentTarget
    const rect   = canvas.getBoundingClientRect()
    const dpr    = window.devicePixelRatio || 1
    return {
      x: (e.clientX - rect.left),
      y: (e.clientY - rect.top),
    }
    void dpr
  }

  const startDraw = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    isDrawingRef.current = true
    setSigHasDrawing(true)
    const ctx = canvasRef.current?.getContext('2d')
    if (!ctx) return
    const { x, y } = getPos(e)
    ctx.beginPath()
    ctx.moveTo(x, y)
  }, [])

  const draw = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawingRef.current) return
    const ctx = canvasRef.current?.getContext('2d')
    if (!ctx) return
    const { x, y } = getPos(e)
    ctx.lineTo(x, y)
    ctx.stroke()
  }, [])

  const stopDraw = useCallback(() => { isDrawingRef.current = false }, [])

  function clearSig() {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    const dpr = window.devicePixelRatio || 1
    ctx?.clearRect(0, 0, canvas.width / dpr, canvas.height / dpr)
    setSigHasDrawing(false)
  }

  function toggleTesla(v: string) {
    setTeslaRatings(prev => prev.includes(v) ? prev.filter(x => x !== v) : [...prev, v])
  }

  function toggleOrient(v: string) {
    setOrientations(prev => prev.includes(v) ? prev.filter(x => x !== v) : [...prev, v])
  }

  function toggleReg(id: string) {
    setRegOpen(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])
  }

  // ───────────────────────────────────────────────────────────────────────────

  return (
    <div className="m-content">
      <div className="m-h">
        <div>
          <h2>Add Device</h2>
          <div className="sub">Manually add a new implant device to the catalogue.</div>
        </div>
        <a href="/master/devices" className="btn">← Back to Devices</a>
      </div>

      {/* ── Section 1: Identification ── */}
      <div className="form-card">
        <div className="form-section-h">
          <div className="form-num">1</div>
          <h3>Device Identification</h3>
        </div>
        <p className="form-desc">Core identifying information for this device.</p>

        <div className="form-grid">
          <CustomSelect
            label="Device Category"
            required
            placeholder="Select category…"
            value={category}
            onChange={v => { setCategory(v); setDeviceType('') }}
            options={Object.keys(typesByCategory)}
          />
          <CustomSelect
            label="Device Type"
            required
            placeholder={category ? 'Select type…' : 'Select category first'}
            value={deviceType}
            onChange={setDeviceType}
            options={typesByCategory[category] ?? []}
          />
          <div className="field">
            <label>Device Name <span style={{ color: 'var(--err)', marginLeft: 3 }}>*</span></label>
            <input className="input" type="text" placeholder="e.g. Medtronic Micra AV" value={deviceName} onChange={e => setDeviceName(e.target.value)} />
          </div>
          <div className="field">
            <label>Model Number <span style={{ color: 'var(--err)', marginLeft: 3 }}>*</span></label>
            <input className="input" type="text" placeholder="e.g. MC1AVR1" value={modelNumber} onChange={e => setModelNumber(e.target.value)} />
          </div>
          <CustomSelect
            label="Primary Implant Region"
            required
            placeholder="Select region…"
            value={implantRegion}
            onChange={setImplantRegion}
            options={regionOptions}
          />
          <div className="field">
            <label>GMDN Code</label>
            <input className="input" type="text" placeholder="e.g. 35391" value={gmdnCode} onChange={e => setGmdnCode(e.target.value)} />
          </div>
          <div className="field field-full">
            <label>Clinical Description</label>
            <textarea className="input" style={{ resize: 'vertical', minHeight: 80 }} placeholder="Brief clinical description of the device and its indication…" value={description} onChange={e => setDescription(e.target.value)} />
          </div>

          {/* Implant image */}
          <div className="field field-full" style={{ marginTop: 8 }}>
            <label>Implant Image <span style={{ fontWeight: 400, color: 'var(--muted2)', fontSize: 12 }}>(optional)</span></label>
            {!implantImage ? (
              <label
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  padding: '14px 16px',
                  border: '2px dashed var(--border2)',
                  borderRadius: 10,
                  cursor: 'pointer',
                  background: 'var(--bg)',
                  transition: 'border-color .15s,background .15s',
                }}
                onMouseEnter={e => { (e.currentTarget as HTMLLabelElement).style.borderColor = 'var(--accent)'; (e.currentTarget as HTMLLabelElement).style.background = 'color-mix(in srgb,var(--accent) 3%,transparent)' }}
                onMouseLeave={e => { (e.currentTarget as HTMLLabelElement).style.borderColor = ''; (e.currentTarget as HTMLLabelElement).style.background = 'var(--bg)' }}
                onClick={() => setImplantImage('device-photo.jpg')}
              >
                <div style={{ width: 36, height: 36, borderRadius: 9, background: 'color-mix(in srgb,var(--accent) 10%,transparent)', display: 'grid', placeItems: 'center', flexShrink: 0 }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="1.7">
                    <rect x="3" y="3" width="18" height="18" rx="3"/>
                    <circle cx="8.5" cy="8.5" r="1.5"/>
                    <polyline points="21 15 16 10 5 21"/>
                  </svg>
                </div>
                <div>
                  <div style={{ fontFamily: 'var(--ff)', fontSize: 13.5, fontWeight: 500, color: 'var(--text)' }}>Upload device photo</div>
                  <div style={{ fontFamily: 'var(--fb)', fontSize: 12, color: 'var(--muted)' }}>JPG, PNG, WebP · max 10 MB</div>
                </div>
              </label>
            ) : (
              <div className="uploaded-file" style={{ background: 'color-mix(in srgb,var(--accent) 6%,transparent)', borderColor: 'color-mix(in srgb,var(--accent) 20%,transparent)' }}>
                <div className="uf-ic" style={{ background: 'color-mix(in srgb,var(--accent) 10%,transparent)' }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="1.7">
                    <rect x="3" y="3" width="18" height="18" rx="3"/>
                    <circle cx="8.5" cy="8.5" r="1.5"/>
                    <polyline points="21 15 16 10 5 21"/>
                  </svg>
                </div>
                <div>
                  <div className="uf-name">{implantImage}</div>
                  <div className="uf-meta">Image · ready to upload</div>
                </div>
                <button type="button" className="uf-remove" onClick={() => setImplantImage(null)} aria-label="Remove image">✕</button>
              </div>
            )}
          </div>

          {/* External link */}
          <div className="field field-full" style={{ marginTop: 8 }}>
            <label>Manufacturer Product Page <span style={{ fontWeight: 400, color: 'var(--muted2)', fontSize: 12 }}>(optional)</span></label>
            <input
              className="input"
              type="url"
              placeholder="https://www.manufacturer.com/product/device-name"
              value={externalLink}
              onChange={e => setExternalLink(e.target.value)}
            />
            <div style={{ fontFamily: 'var(--fb)', fontSize: 12, color: 'var(--muted2)', marginTop: 5 }}>
              Link to the official manufacturer product or IFU page. Clinics can use this to cross-reference data directly on the manufacturer&apos;s website.
            </div>
          </div>
        </div>
      </div>

      {/* ── Section 2: MRI Classification ── */}
      <div className="form-card">
        <div className="form-section-h">
          <div className="form-num">2</div>
          <h3>MRI Classification</h3>
        </div>
        <p className="form-desc">Select the device&apos;s MRI safety classification per ASTM F2503.</p>

        <div className="mri-toggles">
          {(['safe', 'conditional', 'unsafe'] as const).map(cls => (
            <button
              key={cls}
              type="button"
              className={`mri-toggle${mriClass === cls ? ` sel-${cls}` : ''}`}
              onClick={() => setMriClass(cls)}
              style={{ display: 'flex', alignItems: 'center', gap: 8 }}
            >
              <img src={`/mr-${cls}.svg`} width="22" height="22" alt="" style={{ flexShrink: 0, opacity: mriClass === cls ? 1 : 0.55 }} />
              {cls === 'safe' ? 'MR Safe' : cls === 'conditional' ? 'MR Conditional' : 'MR Unsafe'}
            </button>
          ))}
        </div>

        {mriClass === 'conditional' && (
          <>
            <div style={{ marginBottom: 14 }}>
              <div style={{ fontFamily: 'var(--ff)', fontSize: 11.5, letterSpacing: '1.1px', textTransform: 'uppercase', color: 'var(--muted2)', fontWeight: 600, marginBottom: 10 }}>
                Approved Field Strengths
              </div>
              <div className="check-pills">
                {teslaOptions.map(t => (
                  <label key={t} className={`check-pill${teslaRatings.includes(t) ? ' checked' : ''}`}>
                    <input type="checkbox" checked={teslaRatings.includes(t)} onChange={() => toggleTesla(t)} />
                    {t}
                  </label>
                ))}
              </div>
            </div>
          </>
        )}

        <div className="field">
          <label>MRI Notes / Additional Conditions</label>
          <textarea className="input" style={{ resize: 'vertical', minHeight: 70 }} placeholder="Specific conditions, caveats, or manufacturer notes…" value={mriNotes} onChange={e => setMriNotes(e.target.value)} />
        </div>
      </div>

      {/* ── Section 3: RF / SAR Parameters (conditional) ── */}
      {mriClass === 'conditional' && (
        <div className="form-card">
          <div className="form-section-h">
            <div className="form-num">3</div>
            <h3>RF &amp; SAR Parameters</h3>
          </div>
          <p className="form-desc">Maximum RF and SAR values under which the device can be safely scanned.</p>

          <div className="sar-region-h">Scan Region A</div>
          <div className="form-grid-3">
            <div className="field">
              <label>WB SAR (W/kg)</label>
              <input className="input" type="text" placeholder="e.g. 2.0" value={sarAWb} onChange={e => setSarAWb(e.target.value)} />
            </div>
            <div className="field">
              <label>Head SAR (W/kg)</label>
              <input className="input" type="text" placeholder="e.g. 3.2" value={sarAHd} onChange={e => setSarAHd(e.target.value)} />
            </div>
            <div className="field">
              <label>B1+rms (µT)</label>
              <input className="input" type="text" placeholder="e.g. 2.0" value={sarAB1} onChange={e => setSarAB1(e.target.value)} />
            </div>
          </div>

          <hr className="sar-divider" />
          <div className="sar-region-h">Scan Region B</div>
          <div className="form-grid-3">
            <div className="field">
              <label>WB SAR (W/kg)</label>
              <input className="input" type="text" placeholder="e.g. 2.0" value={sarBWb} onChange={e => setSarBWb(e.target.value)} />
            </div>
            <div className="field">
              <label>Head SAR (W/kg)</label>
              <input className="input" type="text" placeholder="e.g. 3.2" value={sarBHd} onChange={e => setSarBHd(e.target.value)} />
            </div>
            <div className="field">
              <label>B1+rms (µT)</label>
              <input className="input" type="text" placeholder="e.g. 2.0" value={sarBB1} onChange={e => setSarBB1(e.target.value)} />
            </div>
          </div>

          <hr className="sar-divider" />
          <div className="form-grid">
            <div className="field">
              <label>Max Slew Rate (T/m/s)</label>
              <input className="input" type="text" placeholder="e.g. 200" value={slew} onChange={e => setSlew(e.target.value)} />
            </div>
            <div className="field">
              <label>Max dB/dt (T/s)</label>
              <input className="input" type="text" placeholder="e.g. 80" value={dbdt} onChange={e => setDbdt(e.target.value)} />
            </div>
            <div className="field">
              <label>Max Spatial Gradient (T/m)</label>
              <input className="input" type="text" placeholder="e.g. 720" value={spatial} onChange={e => setSpatial(e.target.value)} />
            </div>
            <CustomSelect
              label="RF Transmit Mode"
              placeholder="Select transmit mode…"
              value={rfMode}
              onChange={setRfMode}
              options={rfModeOptions}
            />
          </div>
        </div>
      )}

      {/* ── Section for non-conditional: renumber ── */}
      {/* ── Section 3/4: Restrictions & Timing ── */}
      <div className="form-card">
        <div className="form-section-h">
          <div className="form-num">{mriClass === 'conditional' ? 4 : 3}</div>
          <h3>Restrictions, Timing &amp; Pre-scan Setup</h3>
        </div>
        <p className="form-desc">Scan time limits, post-implant waiting periods, and patient preparation instructions.</p>

        <div className="form-grid">
          <div className="field">
            <label>Maximum Scan Duration (min)</label>
            <input className="input" type="text" placeholder="e.g. 30" value={maxScan} onChange={e => setMaxScan(e.target.value)} />
          </div>
          <div className="field">
            <label>Cool-off Period Between Scans</label>
            <input className="input" type="text" placeholder="e.g. 15 minutes" value={coolOff} onChange={e => setCoolOff(e.target.value)} />
          </div>
          <div className="field">
            <label>Post-implant Wait Before MRI</label>
            <input className="input" type="text" placeholder="e.g. 6 weeks" value={postWait} onChange={e => setPostWait(e.target.value)} />
          </div>
        </div>

        <div style={{ marginBottom: 16 }}>
          <div style={{ fontFamily: 'var(--ff)', fontSize: 11.5, letterSpacing: '1.1px', textTransform: 'uppercase', color: 'var(--muted2)', fontWeight: 600, marginBottom: 10 }}>
            Approved Patient Orientations
          </div>
          <div className="check-pills">
            {orientOptions.map(o => (
              <label key={o} className={`check-pill${orientations.includes(o) ? ' checked' : ''}`}>
                <input type="checkbox" checked={orientations.includes(o)} onChange={() => toggleOrient(o)} />
                {o}
              </label>
            ))}
          </div>
        </div>

        <div className="form-grid">
          <div className="field">
            <label>Pre-scan Checklist (one item per line)</label>
            <textarea className="input" style={{ resize: 'vertical', minHeight: 90 }} placeholder="e.g. Confirm device model and implant date&#10;Check device programmed below 2.4 GHz&#10;Remove all ferromagnetic items" value={preScan} onChange={e => setPreScan(e.target.value)} />
          </div>
          <div className="field">
            <label>Post-scan Checklist (one item per line)</label>
            <textarea className="input" style={{ resize: 'vertical', minHeight: 90 }} placeholder="e.g. Verify device function post-scan&#10;Record SAR values used&#10;Follow up if patient reports discomfort" value={postScan} onChange={e => setPostScan(e.target.value)} />
          </div>
          <div className="field field-full">
            <label>Patient Instructions</label>
            <textarea className="input" style={{ resize: 'vertical', minHeight: 70 }} placeholder="Instructions to be shown to the patient before and after the scan…" value={patientInstr} onChange={e => setPatientInstr(e.target.value)} />
          </div>
        </div>
      </div>

      {/* ── Section 4/5: Source Documents ── */}
      <div className="form-card">
        <div className="form-section-h">
          <div className="form-num">{mriClass === 'conditional' ? 5 : 4}</div>
          <h3>Source Documents</h3>
        </div>
        <p className="form-desc">Upload supporting PDFs such as MRI condition documents, IFU, or product leaflets.</p>

        {!uploadedFile ? (
          <label
            className="dropzone"
            style={{ display: 'block' }}
            onClick={() => setUploadedFile('Medtronic_Micra_AV_MRI_Conditions.pdf')}
          >
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="1.5">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                <polyline points="17 8 12 3 7 8"/>
                <line x1="12" y1="3" x2="12" y2="15"/>
              </svg>
              <div className="dz-title">Drop PDF here or click to browse</div>
              <div className="dz-sub">Accepts PDF, max 25 MB · MRI conditions, IFU, product leaflet</div>
            </div>
          </label>
        ) : (
          <div className="uploaded-file">
            <div className="uf-ic">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--err)" strokeWidth="1.7">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                <polyline points="14 2 14 8 20 8"/>
              </svg>
            </div>
            <div>
              <div className="uf-name">{uploadedFile}</div>
              <div className="uf-meta">PDF · 1.4 MB</div>
            </div>
            <button type="button" className="uf-remove" onClick={() => setUploadedFile(null)} aria-label="Remove file">✕</button>
          </div>
        )}

        <div className="form-grid" style={{ marginTop: 16 }}>
          <div className="field">
            <label>Source URL</label>
            <input className="input" type="url" placeholder="https://manufacturer.com/device-docs" value={sourceUrl} onChange={e => setSourceUrl(e.target.value)} />
          </div>
          <CustomSelect
            label="Document Type"
            placeholder="Select type…"
            value={sourceType}
            onChange={setSourceType}
            options={sourceTypeOptions}
          />
        </div>
      </div>

      {/* ── Regional Approvals ── */}
      <div className="form-card">
        <div style={{ fontFamily: 'var(--ff)', fontSize: 15, fontWeight: 600, marginBottom: 6 }}>Regional Approvals</div>
        <p style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 16 }}>Regulatory approval numbers and dates per jurisdiction.</p>

        <div className="reg-list">
          {regions.map(r => (
            <div key={r.id} className={`reg-item${regOpen.includes(r.id) ? ' open' : ''}`}>
              <button type="button" className="reg-toggle" onClick={() => toggleReg(r.id)}>
                <span className="reg-flag">{r.flag}</span>
                <span>{r.label}</span>
                {regNums[r.id] && (
                  <span style={{ marginLeft: 8, fontFamily: 'var(--ff)', fontSize: 12, color: 'var(--accent)', fontWeight: 500 }}>
                    {regNums[r.id]}
                  </span>
                )}
                <span className="reg-chev">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="6 9 12 15 18 9"/>
                  </svg>
                </span>
              </button>
              <div className="reg-body">
                <div className="form-grid">
                  <div className="field" style={{ marginBottom: 0 }}>
                    <label>Registration Number</label>
                    <input className="input" type="text" placeholder="e.g. TGA-2026-048237" value={regNums[r.id] ?? ''} onChange={e => setRegNums(prev => ({ ...prev, [r.id]: e.target.value }))} />
                  </div>
                  <div className="field" style={{ marginBottom: 0 }}>
                    <label>Approval Date</label>
                    <input className="input" type="date" value={regDates[r.id] ?? ''} onChange={e => setRegDates(prev => ({ ...prev, [r.id]: e.target.value }))} />
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Manufacturer Certification ── */}
      <div className="form-card">
        <div style={{ fontFamily: 'var(--ff)', fontSize: 15, fontWeight: 600, marginBottom: 6 }}>Manufacturer Certification</div>
        <p style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 16 }}>Confirm the accuracy and authority of this submission.</p>

        <div className="cert-list">
          <label className="cert-item">
            <input type="checkbox" checked={cert1} onChange={e => setCert1(e.target.checked)} />
            <span className="cert-text">I confirm that all device information submitted is accurate, complete, and up to date to the best of my knowledge.</span>
          </label>
          <label className="cert-item">
            <input type="checkbox" checked={cert2} onChange={e => setCert2(e.target.checked)} />
            <span className="cert-text">I confirm I have read and agree to the Implant ID submission guidelines and platform terms of use.</span>
          </label>
          <label className="cert-item">
            <input type="checkbox" checked={cert3} onChange={e => setCert3(e.target.checked)} />
            <span className="cert-text">I confirm I have the authority and permission to submit this device on behalf of the manufacturer.</span>
          </label>
        </div>
      </div>

      {/* ── Electronic Signature ── */}
      <div className="form-card">
        <div style={{ fontFamily: 'var(--ff)', fontSize: 15, fontWeight: 600, marginBottom: 6 }}>Electronic Signature</div>
        <p style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 16 }}>Sign to confirm this submission. Your signature will be embedded in the generated contract PDF.</p>

        <div className="sig-tabs">
          <button type="button" className={`sig-tab${sigMode === 'type' ? ' active' : ''}`} onClick={() => setSigMode('type')}>Type name</button>
          <button type="button" className={`sig-tab${sigMode === 'draw' ? ' active' : ''}`} onClick={() => setSigMode('draw')}>Draw signature</button>
        </div>

        {sigMode === 'type' ? (
          <div className="form-grid">
            <div className="field">
              <label>Full Name <span style={{ color: 'var(--err)', marginLeft: 3 }}>*</span></label>
              <input className="input" type="text" placeholder="Your full legal name" value={sigName} onChange={e => setSigName(e.target.value)} />
            </div>
            <div className="field">
              <label>Job Title <span style={{ color: 'var(--err)', marginLeft: 3 }}>*</span></label>
              <input className="input" type="text" placeholder="e.g. Regulatory Affairs Manager" value={sigTitle} onChange={e => setSigTitle(e.target.value)} />
            </div>
            {sigName && (
              <div className="field field-full">
                <div style={{ border: '1px solid var(--border)', borderRadius: 10, padding: '16px 20px', background: 'var(--bg)', minHeight: 70, display: 'flex', alignItems: 'center' }}>
                  <span style={{ fontFamily: 'Georgia, serif', fontSize: 26, color: 'var(--text)', fontStyle: 'italic', opacity: .85 }}>{sigName}</span>
                </div>
              </div>
            )}
          </div>
        ) : (
          <>
            <div className="sig-canvas-wrap">
              <canvas
                ref={canvasRef}
                onMouseDown={startDraw}
                onMouseMove={draw}
                onMouseUp={stopDraw}
                onMouseLeave={stopDraw}
              />
              {!sigHasDrawing && (
                <div className="sig-canvas-hint">Draw your signature here</div>
              )}
              {sigHasDrawing && (
                <button type="button" className="sig-canvas-clear" onClick={clearSig}>Clear</button>
              )}
            </div>
            <div className="form-grid" style={{ marginTop: 14 }}>
              <div className="field">
                <label>Full Name <span style={{ color: 'var(--err)', marginLeft: 3 }}>*</span></label>
                <input className="input" type="text" placeholder="Your full legal name" value={sigName} onChange={e => setSigName(e.target.value)} />
              </div>
              <div className="field">
                <label>Job Title <span style={{ color: 'var(--err)', marginLeft: 3 }}>*</span></label>
                <input className="input" type="text" placeholder="e.g. Regulatory Affairs Manager" value={sigTitle} onChange={e => setSigTitle(e.target.value)} />
              </div>
            </div>
          </>
        )}

        <div className="sig-date">Signature date: {today}</div>
      </div>

      {/* ── 24h Publication Hold Notice ── */}
      <div className="pub-delay">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
          <circle cx="12" cy="12" r="9"/>
          <path d="M12 7v5l3 2"/>
        </svg>
        <div className="pub-delay-body">
          <strong>24-hour publication hold.</strong> After submission, the system places a 24-hour hold before the device goes live globally. This gives you the opportunity to review and correct any information you&apos;ve submitted before it is used by clinics and patients.
        </div>
      </div>

      {/* ── Footer buttons ── */}
      <div className="form-footer">
        <a href="/master/devices" className="btn">Cancel</a>
        <button type="button" className="btn">Save as Draft</button>
        <button
          type="button"
          className="btn btn-s"
          disabled={!deviceName || !category || !mriClass || !cert1 || !cert2 || !cert3 || !sigName}
        >
          Submit for Review →
        </button>
      </div>

    </div>
  )
}
