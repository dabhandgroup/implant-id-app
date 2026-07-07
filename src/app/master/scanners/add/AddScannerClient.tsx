'use client'
import { useState }  from 'react'
import { useMutation } from 'convex/react'
import { useRouter }   from 'next/navigation'
import { api as apiBase } from '../../../../../convex/_generated/api'
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const api = apiBase as any

const FIELD_STRENGTHS = ['0.5T', '1.0T', '1.5T', '3T', '7T', 'Other']
const SCANNER_TYPES   = ['Closed-bore', 'Open-bore', 'Standing / upright', 'Other']

function SectionHeader({ title, sub }: { title: string; sub?: string }) {
  return (
    <div style={{ marginBottom: 18 }}>
      <h3 style={{ fontFamily:'var(--ff)', fontSize:15, fontWeight:600, color:'var(--text)', margin:0 }}>{title}</h3>
      {sub && <p style={{ fontFamily:'var(--fb)', fontSize:13, color:'var(--muted)', margin:'4px 0 0' }}>{sub}</p>}
    </div>
  )
}

function Divider() {
  return <div style={{ height:1, background:'var(--border)', margin:'28px 0' }} />
}

export default function AddScannerClient() {
  const router     = useRouter()
  const addScanner = useMutation(api.scanners.addScanner)

  // Fields
  const [manufacturer,       setManufacturer]       = useState('')
  const [model,              setModel]              = useState('')
  const [fieldStrength,      setFieldStrength]      = useState('')
  const [scannerType,        setScannerType]        = useState('')
  const [boreDiameter,       setBoreDiameter]       = useState('')
  const [maxSpatialGradient, setMaxSpatialGradient] = useState('')
  const [notes,              setNotes]              = useState('')

  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (!manufacturer.trim()) return setError('Manufacturer is required')
    if (!model.trim())        return setError('Model is required')
    if (!fieldStrength)       return setError('Select a field strength')
    if (!scannerType)         return setError('Select a scanner type')

    setLoading(true)
    try {
      await addScanner({
        manufacturer:       manufacturer.trim(),
        model:              model.trim(),
        fieldStrength,
        scannerType,
        boreDiameter:       boreDiameter       ? parseFloat(boreDiameter)       : undefined,
        maxSpatialGradient: maxSpatialGradient ? parseFloat(maxSpatialGradient) : undefined,
        notes:              notes.trim()        || undefined,
      })
      setTimeout(() => router.push('/master/scanners'), 300)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to add scanner — try again.')
      setLoading(false)
    }
  }

  return (
    <div className="m-content">
      <a href="/master/scanners" className="btn" style={{ alignSelf:'flex-start', marginBottom:20 }}>← Back to Scanners</a>
      <div className="m-h">
        <div>
          <h2>Add Scanner</h2>
          <div className="sub">Add an MRI scanner to the Implant ID database. Fields marked * are required.</div>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <div style={{ background:'var(--bg2)', border:'1px solid var(--border)', borderRadius:16, padding:'32px 36px' }}>

          {/* ── Section 1: Scanner Identity ── */}
          <SectionHeader
            title="Scanner identity"
            sub="The core details used to identify this scanner across the platform."
          />
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16 }}>
            <div className="field">
              <label>Manufacturer <span style={{ color:'var(--err)', marginLeft:3 }}>*</span></label>
              <input
                className="input"
                type="text"
                placeholder="e.g. Siemens, Philips, GE"
                value={manufacturer}
                onChange={e => setManufacturer(e.target.value)}
                autoComplete="off"
              />
            </div>
            <div className="field">
              <label>Model <span style={{ color:'var(--err)', marginLeft:3 }}>*</span></label>
              <input
                className="input"
                type="text"
                placeholder="e.g. MAGNETOM Vida, Ingenia 3T"
                value={model}
                onChange={e => setModel(e.target.value)}
              />
            </div>
          </div>

          <Divider />

          {/* ── Section 2: Field Strength ── */}
          <SectionHeader
            title="Field strength"
            sub="The static magnetic field strength of this scanner, in Tesla."
          />
          <div style={{ display:'flex', gap:10, flexWrap:'wrap' }}>
            {FIELD_STRENGTHS.map(fs => {
              const on = fieldStrength === fs
              return (
                <button key={fs} type="button"
                  onClick={() => setFieldStrength(fs)}
                  style={{
                    padding:'9px 22px', borderRadius:10, cursor:'pointer', transition:'all .15s',
                    fontFamily:'var(--ff)', fontSize:14, fontWeight: on ? 700 : 500,
                    border:`2px solid ${on ? 'var(--accent)' : 'var(--border)'}`,
                    background: on ? 'rgba(var(--accent-rgb),0.12)' : 'transparent',
                    color: on ? 'var(--accent-deep)' : 'var(--muted)',
                  }}
                >
                  {fs}
                </button>
              )
            })}
          </div>

          <Divider />

          {/* ── Section 3: Scanner Type ── */}
          <SectionHeader
            title="Scanner type"
            sub="The physical configuration of the scanner bore."
          />
          <div style={{ display:'flex', gap:10, flexWrap:'wrap' }}>
            {SCANNER_TYPES.map(st => {
              const on = scannerType === st
              return (
                <button key={st} type="button"
                  onClick={() => setScannerType(st)}
                  style={{
                    padding:'9px 22px', borderRadius:10, cursor:'pointer', transition:'all .15s',
                    fontFamily:'var(--ff)', fontSize:14, fontWeight: on ? 700 : 500,
                    border:`2px solid ${on ? 'var(--accent)' : 'var(--border)'}`,
                    background: on ? 'rgba(var(--accent-rgb),0.12)' : 'transparent',
                    color: on ? 'var(--accent-deep)' : 'var(--muted)',
                  }}
                >
                  {st}
                </button>
              )
            })}
          </div>

          <Divider />

          {/* ── Section 4: Technical Specs ── */}
          <SectionHeader
            title="Technical specifications"
            sub="Optional — these fields are used when matching implant conditional requirements against scanner capability."
          />
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16 }}>
            <div className="field">
              <label>Bore diameter <span style={{ fontWeight:400, opacity:.6 }}>(cm, optional)</span></label>
              <input
                className="input"
                type="number"
                inputMode="decimal"
                min="0"
                step="0.1"
                placeholder="e.g. 70"
                value={boreDiameter}
                onChange={e => setBoreDiameter(e.target.value)}
              />
            </div>
            <div className="field">
              <label>Max spatial gradient <span style={{ fontWeight:400, opacity:.6 }}>(T/m, optional)</span></label>
              <input
                className="input"
                type="number"
                inputMode="decimal"
                min="0"
                step="0.1"
                placeholder="e.g. 80"
                value={maxSpatialGradient}
                onChange={e => setMaxSpatialGradient(e.target.value)}
              />
            </div>
          </div>

          <Divider />

          {/* ── Section 5: Notes ── */}
          <SectionHeader
            title="Notes"
            sub="Any additional context — software version restrictions, known limitations, or site-specific configuration."
          />
          <div className="field">
            <label>Notes <span style={{ fontWeight:400, opacity:.6 }}>(optional)</span></label>
            <textarea
              className="input"
              rows={4}
              placeholder="e.g. Requires XR software v3.2+ for MRI Conditional mode. Not compatible with abandoned leads longer than 40 cm."
              value={notes}
              onChange={e => setNotes(e.target.value)}
              style={{ resize:'vertical' }}
            />
          </div>

          {/* ── Error + Actions ── */}
          {error && (
            <div style={{ marginTop:24, background:'rgba(var(--err-rgb),0.08)', border:'1px solid rgba(var(--err-rgb),0.20)', borderRadius:10, padding:'12px 16px', fontFamily:'var(--ff)', fontSize:13.5, color:'var(--err)' }}>
              {error}
            </div>
          )}

          <div style={{ display:'flex', justifyContent:'flex-end', gap:10, paddingTop:24, marginTop:28, borderTop:'1px solid var(--border)' }}>
            <a href="/master/scanners" className="btn">Cancel</a>
            <button className="btn btn-s" type="submit" disabled={loading}>
              {loading ? 'Adding…' : 'Add Scanner →'}
            </button>
          </div>

        </div>
      </form>
    </div>
  )
}
