'use client'

import { useState, useCallback } from 'react'
import { useMutation } from 'convex/react'
import { api } from '../../../../../convex/_generated/api'
import Papa from 'papaparse'
import * as XLSX from 'xlsx'

// ── Column → schema field mapping ────────────────────────────────────────────

type SchemaKey = 'name' | 'manufacturer' | 'model' | 'deviceType' | 'classification' |
  'mriStatus' | 'fieldStrengths' | 'sarLimit' | 'b1RmsLimit' | 'slewRateLimit' |
  'gradientLimit' | 'maxScanTime' | 'contraindications' | 'sourceUrl' | 'notes'

const SCHEMA_FIELDS: { key: SchemaKey; label: string; required: boolean }[] = [
  { key: 'name',             label: 'Device Name',              required: true  },
  { key: 'manufacturer',     label: 'Manufacturer',              required: true  },
  { key: 'model',            label: 'Model Number',              required: true  },
  { key: 'deviceType',       label: 'Device Type / Category',    required: true  },
  { key: 'mriStatus',        label: 'MRI Classification',        required: true  },
  { key: 'classification',   label: 'Class (active/passive/legacy)', required: false },
  { key: 'fieldStrengths',   label: 'Approved Field Strengths',  required: false },
  { key: 'sarLimit',         label: 'WB SAR Limit (W/kg)',       required: false },
  { key: 'b1RmsLimit',       label: 'B1 RMS Limit (µT)',         required: false },
  { key: 'slewRateLimit',    label: 'Slew Rate Limit (T/m/s)',   required: false },
  { key: 'gradientLimit',    label: 'Gradient Limit (mT/m)',     required: false },
  { key: 'maxScanTime',      label: 'Max Scan Time (mins)',       required: false },
  { key: 'contraindications',label: 'Contraindications / Notes', required: false },
  { key: 'sourceUrl',        label: 'Source URL',                required: false },
  { key: 'notes',            label: 'Internal Notes',            required: false },
]

// ── Known column aliases from the spreadsheet ─────────────────────────────────
const ALIASES: Record<string, SchemaKey> = {
  // name
  'device name': 'name', 'device_name': 'name', 'name': 'name',
  // manufacturer
  'manufacturer': 'manufacturer', 'manufacturer_id': 'manufacturer', 'common_name': 'manufacturer',
  'manufacturer name': 'manufacturer',
  // model
  'model number': 'model', 'model_number': 'model', 'model no': 'model', 'model no.': 'model',
  'model': 'model',
  // device type
  'device type': 'deviceType', 'device_type': 'deviceType', 'category': 'deviceType',
  'device category': 'deviceType',
  // mri status
  'mri classification': 'mriStatus', 'mri_classification': 'mriStatus',
  'mri status': 'mriStatus', 'mri_status': 'mriStatus', 'mri class': 'mriStatus',
  // classification
  'classification': 'classification',
  // field strengths
  'field strengths': 'fieldStrengths', 'approved tesla': 'fieldStrengths',
  'field_strength_1.5t': 'fieldStrengths',
  // sar
  'wb sar': 'sarLimit', 'sar value': 'sarLimit', 'max sar': 'sarLimit',
  'regiona_max_sar_wb (w/kg)': 'sarLimit', 'sara limit': 'sarLimit',
  // b1
  'b1 rms': 'b1RmsLimit', 'max b1 rms': 'b1RmsLimit',
  // slew rate
  'slew rate': 'slewRateLimit', 'max slew rate (t/m/s)': 'slewRateLimit',
  // scan time
  'max scan time': 'maxScanTime', 'max scan time mins': 'maxScanTime',
  // contraindications
  'contraindications': 'contraindications', 'entry notes': 'contraindications',
  // source
  'source url': 'sourceUrl', 'source link': 'sourceUrl', 'document_url': 'sourceUrl',
  // notes
  'notes': 'notes', 'internal notes': 'notes',
}

// ── MRI status normaliser ─────────────────────────────────────────────────────
function normaliseMri(raw: string): 'conditional' | 'safe' | 'unsafe' | 'unknown' {
  const v = raw.toLowerCase().trim()
  if (v.includes('conditional') || v === 'mr conditional') return 'conditional'
  if (v.includes('safe') || v === 'mr safe') return 'safe'
  if (v.includes('unsafe') || v.includes('contraindicated') || v === 'mr unsafe') return 'unsafe'
  return 'unknown'
}

// ── Row validator ─────────────────────────────────────────────────────────────
type ParsedRow = {
  status: 'ok' | 'warn' | 'err'
  errors: string[]
  warnings: string[]
  data: Record<SchemaKey, string>
}

function validateRow(raw: Record<string, string>): ParsedRow {
  const errors: string[] = []
  const warnings: string[] = []
  const data: Record<SchemaKey, string> = {} as Record<SchemaKey, string>

  SCHEMA_FIELDS.forEach(f => { data[f.key] = (raw[f.key] ?? '').trim() })

  if (!data.name)         errors.push('Device name is required')
  if (!data.manufacturer) errors.push('Manufacturer is required')
  if (!data.model)        errors.push('Model number is required')
  if (!data.deviceType)   errors.push('Device type is required')
  if (!data.mriStatus)    errors.push('MRI classification is required')
  else {
    const norm = normaliseMri(data.mriStatus)
    if (norm === 'unknown' && data.mriStatus.toLowerCase() !== 'unknown') {
      warnings.push(`MRI status "${data.mriStatus}" unrecognised — will be set to Unknown`)
    }
  }
  if (!data.sourceUrl) warnings.push('No source URL — recommended for data quality')

  return {
    status: errors.length > 0 ? 'err' : warnings.length > 0 ? 'warn' : 'ok',
    errors,
    warnings,
    data,
  }
}

// ── File parsing ──────────────────────────────────────────────────────────────
async function parseFile(file: File): Promise<{ columns: string[]; rows: Record<string, string>[] }> {
  if (file.name.endsWith('.csv')) {
    return new Promise((resolve, reject) => {
      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        complete: (result) => {
          const cols = result.meta.fields ?? []
          resolve({ columns: cols, rows: result.data as Record<string, string>[] })
        },
        error: reject,
      })
    })
  }

  // Excel
  const buffer = await file.arrayBuffer()
  const wb = XLSX.read(buffer, { type: 'array' })
  // Pick the first non-schema sheet with real data (skip guide/schema sheets)
  const dataSheets = wb.SheetNames.filter(n =>
    !n.toLowerCase().includes('schema') && !n.toLowerCase().includes('guide') &&
    !n.toLowerCase().includes('units') && !n.toLowerCase().includes('terms') &&
    !n.toLowerCase().includes('parameters')
  )
  const sheetName = dataSheets[0] ?? wb.SheetNames[0]
  const ws = wb.Sheets[sheetName]

  // Find the header row (first row with 3+ non-empty cells that looks like column names)
  const range = XLSX.utils.decode_range(ws['!ref'] ?? 'A1:A1')
  let headerRow = 0
  for (let r = 0; r <= Math.min(5, range.e.r); r++) {
    let filledCells = 0
    for (let c = range.s.c; c <= range.e.c; c++) {
      const cell = ws[XLSX.utils.encode_cell({ r, c })]
      if (cell?.v && String(cell.v).length > 1) filledCells++
    }
    if (filledCells >= 3) { headerRow = r; break }
  }

  const json = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' }) as string[][]
  const headers = (json[headerRow] ?? []).map(h => String(h).trim())
  const rows: Record<string, string>[] = []
  for (let r = headerRow + 1; r < json.length; r++) {
    const row = json[r] ?? []
    if (row.every(cell => String(cell).trim() === '')) continue
    const obj: Record<string, string> = {}
    headers.forEach((h, i) => { obj[h] = String(row[i] ?? '').trim() })
    rows.push(obj)
  }
  return { columns: headers.filter(Boolean), rows }
}

// ── Auto-map columns ──────────────────────────────────────────────────────────
function autoMap(columns: string[]): Record<string, SchemaKey | ''> {
  const map: Record<string, SchemaKey | ''> = {}
  columns.forEach(col => {
    const key = ALIASES[col.toLowerCase().replace(/\n/g, ' ').trim()]
    map[col] = key ?? ''
  })
  return map
}

// ── Apply mappings to raw rows ────────────────────────────────────────────────
function applyMappings(
  rawRows: Record<string, string>[],
  mappings: Record<string, SchemaKey | ''>,
): Record<SchemaKey, string>[] {
  return rawRows.map(raw => {
    const mapped: Partial<Record<SchemaKey, string>> = {}
    Object.entries(mappings).forEach(([col, field]) => {
      if (field && raw[col] !== undefined) mapped[field] = (mapped[field] || '') || raw[col].trim()
    })
    return mapped as Record<SchemaKey, string>
  })
}

// ── Component ─────────────────────────────────────────────────────────────────
interface Props { returnUrl?: string }

export default function BulkUploadClient({ returnUrl = '/master/devices' }: Props) {
  const bulkInsert = useMutation(api.devices.bulkInsertDevices)

  const [step,       setStep]       = useState<1 | 2 | 3>(1)
  const [file,       setFile]       = useState<File | null>(null)
  const [columns,    setColumns]    = useState<string[]>([])
  const [rawRows,    setRawRows]    = useState<Record<string, string>[]>([])
  const [mappings,   setMappings]   = useState<Record<string, SchemaKey | ''>>({})
  const [validated,  setValidated]  = useState<ParsedRow[]>([])
  const [parseErr,   setParseErr]   = useState('')
  const [parsing,    setParsing]    = useState(false)
  const [importing,  setImporting]  = useState(false)
  const [importDone, setImportDone] = useState(false)
  const [importErr,  setImportErr]  = useState('')
  const [cert1,      setCert1]      = useState(false)
  const [cert2,      setCert2]      = useState(false)
  const [sigName,    setSigName]    = useState('')
  const [sigTitle,   setSigTitle]   = useState('')
  const [dragOver,   setDragOver]   = useState(false)

  const today = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' })

  const handleFile = useCallback(async (f: File) => {
    setParseErr('')
    setParsing(true)
    try {
      const { columns: cols, rows } = await parseFile(f)
      if (cols.length === 0) throw new Error('No columns found — check the file format')
      if (rows.length === 0) throw new Error('No data rows found in file')
      setFile(f)
      setColumns(cols)
      setRawRows(rows)
      setMappings(autoMap(cols))
      setStep(2)
    } catch (e) {
      setParseErr(e instanceof Error ? e.message : 'Could not parse file')
    } finally {
      setParsing(false)
    }
  }, [])

  function handleDrop(e: React.DragEvent) {
    e.preventDefault(); setDragOver(false)
    const f = e.dataTransfer.files[0]
    if (f) handleFile(f)
  }

  function handleInput(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]
    if (f) handleFile(f)
  }

  function proceedToValidation() {
    const mapped = applyMappings(rawRows, mappings)
    setValidated(mapped.map(validateRow))
    setStep(3)
  }

  async function handleImport() {
    setImporting(true); setImportErr('')
    const okRows = validated.filter(r => r.status !== 'err')
    const devices = okRows.map(r => ({
      name:             r.data.name || r.data.manufacturer + ' ' + r.data.model,
      manufacturer:     r.data.manufacturer,
      model:            r.data.model,
      deviceType:       r.data.deviceType,
      mriStatus:        normaliseMri(r.data.mriStatus),
      classification:   (['active','passive','legacy'] as const).includes(r.data.classification as 'active' | 'passive' | 'legacy')
                          ? r.data.classification as 'active' | 'passive' | 'legacy'
                          : undefined,
      fieldStrengths:   r.data.fieldStrengths   || undefined,
      sarLimit:         r.data.sarLimit          || undefined,
      b1RmsLimit:       r.data.b1RmsLimit        || undefined,
      slewRateLimit:    r.data.slewRateLimit      || undefined,
      gradientLimit:    r.data.gradientLimit      || undefined,
      maxScanTime:      r.data.maxScanTime        || undefined,
      contraindications:r.data.contraindications  || undefined,
      sourceUrl:        r.data.sourceUrl          || undefined,
      notes:            r.data.notes              || undefined,
    }))
    try {
      await bulkInsert({ devices, submitterName: sigName, submitterTitle: sigTitle })
      setImportDone(true)
      setTimeout(() => { window.location.href = returnUrl }, 1500)
    } catch (e) {
      setImportErr(e instanceof Error ? e.message : 'Import failed — try again')
    } finally {
      setImporting(false)
    }
  }

  const okCount   = validated.filter(r => r.status === 'ok').length
  const warnCount = validated.filter(r => r.status === 'warn').length
  const errCount  = validated.filter(r => r.status === 'err').length
  const importable = okCount + warnCount

  const fieldOptions: { label: string; value: string }[] = [
    { label: '— Skip column —', value: '' },
    ...SCHEMA_FIELDS.map(f => ({ label: f.label + (f.required ? ' *' : ''), value: f.key })),
  ]

  return (
    <div className="m-content">
      <div className="m-h">
        <div>
          <h2>Bulk Upload</h2>
          <div className="sub">Import multiple devices from a CSV or Excel file (.csv, .xlsx, .xls)</div>
        </div>
        <a href={returnUrl} className="btn">← Back to Devices</a>
      </div>

      {/* ── Step 1: Upload ── */}
      <div className="bulk-step">
        <div className="bulk-step-h">
          <div className="form-num" style={{ background: step >= 1 ? 'var(--accent)' : 'var(--muted2)' }}>1</div>
          <h3>Upload your file</h3>
          {file && <span className="slabel ok">✓ {file.name}</span>}
        </div>

        {!file ? (
          <div
            className={`dropzone${dragOver ? ' drag-over' : ''}`}
            onDragOver={e => { e.preventDefault(); setDragOver(true) }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            onClick={() => document.getElementById('bulk-file-input')?.click()}
            style={{ cursor: 'pointer', opacity: parsing ? 0.6 : 1 }}
          >
            <input id="bulk-file-input" type="file" accept=".csv,.xlsx,.xls" style={{ display: 'none' }} onChange={handleInput} />
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="1.4">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                <polyline points="17 8 12 3 7 8"/>
                <line x1="12" y1="3" x2="12" y2="15"/>
              </svg>
              <div className="dz-title">{parsing ? 'Parsing file…' : 'Drop your CSV or Excel file here, or click to browse'}</div>
              <div className="dz-sub">Accepts .csv, .xlsx, .xls — max 50 MB</div>
            </div>
          </div>
        ) : (
          <div className="uploaded-file">
            <div className="uf-ic">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--ok)" strokeWidth="1.7">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                <polyline points="14 2 14 8 20 8"/>
              </svg>
            </div>
            <div>
              <div className="uf-name">{file.name}</div>
              <div className="uf-meta">{rawRows.length} data rows · {columns.length} columns detected</div>
            </div>
            <button type="button" className="uf-remove" onClick={() => { setFile(null); setColumns([]); setRawRows([]); setStep(1) }} aria-label="Remove">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="12" height="12"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
          </div>
        )}
        {parseErr && (
          <div style={{ marginTop: 10, padding: '10px 14px', background: 'color-mix(in srgb,var(--err) 8%,transparent)', border: '1px solid color-mix(in srgb,var(--err) 20%,transparent)', borderRadius: 8, fontFamily: 'var(--ff)', fontSize: 13, color: 'var(--err)' }}>
            {parseErr}
          </div>
        )}
      </div>

      {/* ── Step 2: Map columns ── */}
      <div className={`bulk-step${step < 2 ? ' waiting' : ''}`}>
        <div className="bulk-step-h">
          <div className="form-num" style={{ background: step >= 2 ? 'var(--accent)' : 'var(--muted2)' }}>2</div>
          <h3>Map columns</h3>
          {step < 2 && <span className="slabel">Waiting for file</span>}
          {step >= 3 && <span className="slabel ok">✓ Mapped</span>}
        </div>

        {step >= 2 && (
          <>
            <p style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 14 }}>
              We auto-detected {columns.length} columns from your file. Check the mappings below — required fields are marked *.
            </p>
            <table className="bulk-mapping">
              <thead>
                <tr>
                  <th>File Column</th>
                  <th style={{ width: 30 }}></th>
                  <th>Schema Field</th>
                  <th>Sample value</th>
                </tr>
              </thead>
              <tbody>
                {columns.map(col => {
                  const sample = rawRows[0]?.[col] ?? ''
                  return (
                    <tr key={col}>
                      <td><span className="bulk-col-name">{col}</span></td>
                      <td style={{ color: 'var(--muted2)', fontFamily: 'var(--ff)', fontSize: 16 }}>→</td>
                      <td style={{ minWidth: 220 }}>
                        <select
                          className="input"
                          style={{ padding: '6px 10px', fontSize: 13 }}
                          value={mappings[col] ?? ''}
                          onChange={e => setMappings(prev => ({ ...prev, [col]: e.target.value as SchemaKey | '' }))}
                        >
                          {fieldOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                        </select>
                      </td>
                      <td style={{ color: 'var(--muted)', fontFamily: 'var(--ff)', fontSize: 12.5, maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {sample ? sample.slice(0, 60) : <span style={{ color: 'var(--muted2)', fontStyle: 'italic' }}>empty</span>}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
            {step === 2 && (
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 16 }}>
                <button type="button" className="btn btn-s" onClick={proceedToValidation}>
                  Validate {rawRows.length} rows →
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {/* ── Step 3: Validate & import ── */}
      <div className={`bulk-step${step < 3 ? ' waiting' : ''}`}>
        <div className="bulk-step-h">
          <div className="form-num" style={{ background: step >= 3 ? 'var(--accent)' : 'var(--muted2)' }}>3</div>
          <h3>Validate &amp; import</h3>
          {step < 3 && <span className="slabel">Waiting for mapping</span>}
        </div>

        {step >= 3 && (
          <>
            <div className="bulk-vchips">
              <span className="bulk-vchip ok">
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M20 6L9 17l-5-5"/></svg>
                {okCount} valid
              </span>
              <span className="bulk-vchip warn">
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 9v4M12 17h.01"/><path d="m10.3 3.3-8 13.4A1.87 1.87 0 0 0 3.93 19.4h16.14a1.87 1.87 0 0 0 1.63-2.7L13.7 3.3a2 2 0 0 0-3.4 0z"/></svg>
                {warnCount} warnings (will import)
              </span>
              {errCount > 0 && (
                <span className="bulk-vchip err">
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                  {errCount} errors — will be skipped
                </span>
              )}
            </div>

            <div className="bulk-preview-wrap" style={{ marginBottom: 16, maxHeight: 360, overflowY: 'auto' }}>
              <table className="bulk-preview-tbl">
                <thead>
                  <tr>
                    <th>Status</th>
                    <th>Device Name</th>
                    <th>Manufacturer</th>
                    <th>Model</th>
                    <th>Type</th>
                    <th>MRI Class</th>
                    <th>Issues</th>
                  </tr>
                </thead>
                <tbody>
                  {validated.map((row, i) => (
                    <tr key={i} style={{ background: row.status === 'err' ? 'color-mix(in srgb,var(--err) 4%,transparent)' : undefined }}>
                      <td>
                        {row.status === 'ok'   && <span className="bulk-row-flag ok">✓</span>}
                        {row.status === 'warn' && <span className="bulk-row-flag warn">⚠</span>}
                        {row.status === 'err'  && <span className="bulk-row-flag err">✕</span>}
                      </td>
                      <td style={{ fontWeight: 500 }}>{row.data.name || row.data.manufacturer + ' ' + row.data.model || <span style={{ color: 'var(--err)', fontStyle: 'italic' }}>missing</span>}</td>
                      <td>{row.data.manufacturer || <span style={{ color: 'var(--err)', fontStyle: 'italic' }}>missing</span>}</td>
                      <td style={{ fontFamily: 'var(--ff)', fontSize: 12, color: 'var(--muted)' }}>{row.data.model || '—'}</td>
                      <td>{row.data.deviceType || '—'}</td>
                      <td style={{ fontFamily: 'var(--ff)', fontSize: 12.5, fontWeight: 600,
                        color: row.data.mriStatus ? (normaliseMri(row.data.mriStatus) === 'safe' ? 'var(--ok)' : normaliseMri(row.data.mriStatus) === 'conditional' ? '#d97706' : normaliseMri(row.data.mriStatus) === 'unsafe' ? 'var(--err)' : 'var(--muted)') : 'var(--err)'
                      }}>
                        {row.data.mriStatus ? normaliseMri(row.data.mriStatus) : <span style={{ fontStyle: 'italic' }}>missing</span>}
                      </td>
                      <td style={{ fontSize: 11.5, color: 'var(--err)' }}>
                        {[...row.errors, ...row.warnings].join('; ') || '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Certification */}
            <div style={{ borderTop: '1px solid var(--border)', paddingTop: 20, marginBottom: 20 }}>
              <div style={{ fontFamily: 'var(--ff)', fontSize: 14, fontWeight: 600, marginBottom: 12 }}>Confirm Import</div>
              <div className="cert-list" style={{ marginBottom: 14 }}>
                <label className="cert-item">
                  <input type="checkbox" checked={cert1} onChange={e => setCert1(e.target.checked)} />
                  <span className="cert-text">I confirm all device data in this import is accurate and authorised for submission to Implant ID.</span>
                </label>
                <label className="cert-item">
                  <input type="checkbox" checked={cert2} onChange={e => setCert2(e.target.checked)} />
                  <span className="cert-text">I have reviewed the validation results and understand that rows with errors will be skipped.</span>
                </label>
              </div>
              <div className="form-grid">
                <div className="field">
                  <label>Authorised by (Full Name) <span style={{ color: 'var(--err)', marginLeft: 3 }}>*</span></label>
                  <input className="input" type="text" placeholder="Your full legal name" value={sigName} onChange={e => setSigName(e.target.value)} />
                </div>
                <div className="field">
                  <label>Job Title <span style={{ color: 'var(--err)', marginLeft: 3 }}>*</span></label>
                  <input className="input" type="text" placeholder="e.g. Regulatory Affairs Manager" value={sigTitle} onChange={e => setSigTitle(e.target.value)} />
                </div>
              </div>
              <div className="sig-date">Import date: {today}</div>
            </div>

            <div className="pub-delay" style={{ marginBottom: 20 }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
                <circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>
              </svg>
              <div className="pub-delay-body">
                <strong>24-hour review hold.</strong> Imported devices go into pending_review status. The admin team will verify and publish them.
              </div>
            </div>

            {importErr && (
              <div style={{ marginBottom: 16, padding: '10px 14px', background: 'color-mix(in srgb,var(--err) 8%,transparent)', border: '1px solid color-mix(in srgb,var(--err) 20%,transparent)', borderRadius: 8, fontFamily: 'var(--ff)', fontSize: 13, color: 'var(--err)' }}>
                {importErr}
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button
                type="button"
                className="btn btn-s"
                onClick={handleImport}
                disabled={importing || importDone || !cert1 || !cert2 || !sigName || !sigTitle || importable === 0}
              >
                {importDone
                  ? '✓ Import complete! Redirecting…'
                  : importing
                    ? `Importing ${importable} devices…`
                    : `Import ${importable} device${importable !== 1 ? 's' : ''} →`}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
