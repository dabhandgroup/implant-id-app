'use client'

import { useState } from 'react'
import { CustomSelect } from '@/components/ui/CustomSelect'

// ── Schema fields the import system recognises ────────────────────────────────

const schemaFields = [
  { key: 'name',         label: 'Device Name',          required: true  },
  { key: 'manufacturer', label: 'Manufacturer',          required: true  },
  { key: 'category',     label: 'Category',              required: true  },
  { key: 'model',        label: 'Model Number',          required: true  },
  { key: 'mriClass',     label: 'MRI Classification',    required: true  },
  { key: 'sar',          label: 'WB SAR (W/kg)',         required: false },
  { key: 'tesla',        label: 'Approved Tesla Ratings',required: false },
  { key: 'region',       label: 'Implant Region',        required: false },
  { key: 'description',  label: 'Description',           required: false },
  { key: 'sourceUrl',    label: 'Source URL',            required: false },
]

// ── Mock parsed file data ─────────────────────────────────────────────────────

const mockColumns = ['Device Name', 'Manufacturer', 'Model No.', 'Category', 'MRI Status', 'SAR Value', 'Region', 'Source Link']

const mockDefaultMappings: Record<string, string> = {
  'Device Name':   'name',
  'Manufacturer':  'manufacturer',
  'Model No.':     'model',
  'Category':      'category',
  'MRI Status':    'mriClass',
  'SAR Value':     'sar',
  'Region':        'region',
  'Source Link':   'sourceUrl',
}

const mockPreviewRows = [
  { status: 'ok',   name: 'Medtronic Micra AV',            manufacturer: 'Medtronic plc',   model: 'MC1AVR1',     category: 'Cardiac Pacemaker',  mri: 'MR Conditional' },
  { status: 'ok',   name: 'Zimmer Oxford Knee',            manufacturer: 'Zimmer Biomet',   model: 'ZB-OK-PMU3',  category: 'Knee Replacement',   mri: 'MR Safe'        },
  { status: 'warn', name: 'Stryker Tritanium PL',          manufacturer: 'Stryker',         model: 'STR-TT-PL',   category: 'Spinal Implant',     mri: 'MR Safe'        },
  { status: 'ok',   name: 'Cochlear Nucleus Profile Plus', manufacturer: 'Cochlear Ltd',    model: 'COC-CI-N7-P', category: 'Cochlear Implant',   mri: 'MR Unsafe'      },
  { status: 'err',  name: 'BioCore XT2 Hip',               manufacturer: '',                model: 'BC-XT2',      category: 'Hip Replacement',    mri: ''               },
  { status: 'ok',   name: 'Acumed Total Hip System',       manufacturer: 'Acumed Ltd',      model: 'ACU-TH-7742', category: 'Hip Replacement',    mri: 'MR Conditional' },
  { status: 'warn', name: 'Synthes ProDisc-L',             manufacturer: 'DePuy Synthes',   model: 'PDL-023',     category: 'Spinal Disc',        mri: 'MR Conditional' },
  { status: 'ok',   name: 'Medtronic SureScan Pacemaker',  manufacturer: 'Medtronic plc',   model: 'SSDR01',      category: 'Cardiac Pacemaker',  mri: 'MR Conditional' },
]

function StatusFlag({ status }: { status: string }) {
  if (status === 'ok')   return <span className="bulk-row-flag ok">✓ Valid</span>
  if (status === 'warn') return <span className="bulk-row-flag warn">⚠ Warning</span>
  return <span className="bulk-row-flag err">✕ Error</span>
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function BulkUploadClient() {
  const [step,         setStep]         = useState<1|2|3>(1)
  const [fileName,     setFileName]     = useState<string | null>(null)
  const [rowCount,     setRowCount]     = useState(0)
  const [mappings,     setMappings]     = useState<Record<string, string>>(mockDefaultMappings)
  const [cert1,        setCert1]        = useState(false)
  const [cert2,        setCert2]        = useState(false)
  const [sigName,      setSigName]      = useState('')
  const [sigTitle,     setSigTitle]     = useState('')
  const [importing,    setImporting]    = useState(false)
  const [imported,     setImported]     = useState(false)

  const today = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' })

  const okCount   = mockPreviewRows.filter(r => r.status === 'ok').length
  const warnCount = mockPreviewRows.filter(r => r.status === 'warn').length
  const errCount  = mockPreviewRows.filter(r => r.status === 'err').length

  function simulateUpload() {
    setFileName('devices-catalogue-2026-Q2.csv')
    setRowCount(mockPreviewRows.length)
    setStep(2)
  }

  function proceedToValidation() {
    setStep(3)
  }

  async function handleImport() {
    setImporting(true)
    await new Promise(r => setTimeout(r, 1200))
    setImported(true)
    await new Promise(r => setTimeout(r, 1000))
    window.location.href = '/master/devices'
  }

  const fieldOptions = [
    { label: '— Skip column —', value: '' },
    ...schemaFields.map(f => ({ label: f.label + (f.required ? ' *' : ''), value: f.key })),
  ]

  return (
    <div className="m-content">
      <div className="m-h">
        <div>
          <h2>Bulk Upload</h2>
          <div className="sub">Import multiple devices from a CSV or Excel file.</div>
        </div>
        <a href="/master/devices" className="btn">← Back to Devices</a>
      </div>

      {/* ── Step 1: Upload ── */}
      <div className={`bulk-step${step > 1 ? '' : ''}`}>
        <div className="bulk-step-h">
          <div className="form-num" style={{ background: step >= 1 ? 'var(--accent)' : 'var(--muted2)' }}>1</div>
          <h3>Upload your file</h3>
          {fileName && <span className="slabel ok">✓ File ready</span>}
        </div>

        {!fileName ? (
          <>
            <div className="dropzone" onClick={simulateUpload} style={{ cursor: 'pointer' }}>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="1.4">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                  <polyline points="17 8 12 3 7 8"/>
                  <line x1="12" y1="3" x2="12" y2="15"/>
                </svg>
                <div className="dz-title">Drop your CSV or Excel file here, or click to browse</div>
                <div className="dz-sub">Accepts .csv, .xlsx, .xls — max 10 MB</div>
                <button type="button" className="dz-link" onClick={e => { e.stopPropagation() }}>
                  Download template CSV
                </button>
              </div>
            </div>
          </>
        ) : (
          <div className="uploaded-file">
            <div className="uf-ic">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--ok)" strokeWidth="1.7">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                <polyline points="14 2 14 8 20 8"/>
              </svg>
            </div>
            <div>
              <div className="uf-name">{fileName}</div>
              <div className="uf-meta">CSV · {rowCount} rows detected</div>
            </div>
            <button type="button" className="uf-remove" onClick={() => { setFileName(null); setStep(1) }} aria-label="Remove file">✕</button>
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
              We&apos;ve auto-detected {mockColumns.length} columns. Map each to a schema field, or skip columns you don&apos;t need.
            </p>
            <table className="bulk-mapping">
              <thead>
                <tr>
                  <th>File Column</th>
                  <th>→</th>
                  <th>Schema Field</th>
                  <th>Preview</th>
                </tr>
              </thead>
              <tbody>
                {mockColumns.map(col => (
                  <tr key={col}>
                    <td><span className="bulk-col-name">{col}</span></td>
                    <td style={{ color: 'var(--muted2)', fontFamily: 'var(--ff)', fontSize: 16 }}>→</td>
                    <td style={{ minWidth: 220 }}>
                      <CustomSelect
                        value={mappings[col] ?? ''}
                        onChange={v => setMappings(prev => ({ ...prev, [col]: v }))}
                        options={fieldOptions}
                        placeholder="— Skip column —"
                      />
                    </td>
                    <td style={{ color: 'var(--muted)', fontFamily: 'var(--ff)', fontSize: 12.5 }}>
                      e.g. {col === 'Device Name' ? 'Medtronic Micra AV' : col === 'Manufacturer' ? 'Medtronic plc' : col === 'Model No.' ? 'MC1AVR1' : '…'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {step === 2 && (
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 16 }}>
                <button type="button" className="btn btn-s" onClick={proceedToValidation}>
                  Validate {rowCount} rows →
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
            {/* Validation summary chips */}
            <div className="bulk-vchips">
              <span className="bulk-vchip ok">
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M20 6L9 17l-5-5"/></svg>
                {okCount} valid
              </span>
              <span className="bulk-vchip warn">
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 9v4M12 17h.01"/><path d="m10.3 3.3-8 13.4A1.87 1.87 0 0 0 3.93 19.4h16.14a1.87 1.87 0 0 0 1.63-2.7L13.7 3.3a2 2 0 0 0-3.4 0z"/></svg>
                {warnCount} warnings
              </span>
              {errCount > 0 && (
                <span className="bulk-vchip err">
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                  {errCount} errors — must fix before import
                </span>
              )}
            </div>

            {/* Preview table */}
            <div className="bulk-preview-wrap" style={{ marginBottom: 16 }}>
              <table className="bulk-preview-tbl">
                <thead>
                  <tr>
                    <th>Status</th>
                    <th>Device Name</th>
                    <th>Manufacturer</th>
                    <th>Model No.</th>
                    <th>Category</th>
                    <th>MRI Class</th>
                  </tr>
                </thead>
                <tbody>
                  {mockPreviewRows.map((row, i) => (
                    <tr key={i}>
                      <td><StatusFlag status={row.status} /></td>
                      <td style={{ fontWeight: 500 }}>{row.name || <span style={{ color: 'var(--err)', fontStyle: 'italic' }}>missing</span>}</td>
                      <td style={{ color: row.manufacturer ? 'var(--text)' : 'var(--err)', fontStyle: row.manufacturer ? 'normal' : 'italic' }}>{row.manufacturer || 'missing'}</td>
                      <td style={{ fontFamily: 'var(--ff)', fontSize: 12, color: 'var(--muted)' }}>{row.model}</td>
                      <td>{row.category}</td>
                      <td style={{ color: row.mri === 'MR Safe' ? 'var(--ok)' : row.mri === 'MR Conditional' ? '#d97706' : row.mri === 'MR Unsafe' ? 'var(--err)' : 'var(--muted2)', fontFamily: 'var(--ff)', fontSize: 12.5, fontWeight: 600 }}>
                        {row.mri || <span style={{ color: 'var(--err)', fontStyle: 'italic' }}>missing</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <p style={{ fontSize: 12.5, color: 'var(--muted2)', marginBottom: 20, fontFamily: 'var(--ff)' }}>
              Showing {mockPreviewRows.length} of {rowCount} rows. Rows with errors will not be imported.
            </p>

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

            {/* 24h delay notice */}
            <div className="pub-delay" style={{ marginBottom: 20 }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
                <circle cx="12" cy="12" r="9"/>
                <path d="M12 7v5l3 2"/>
              </svg>
              <div className="pub-delay-body">
                <strong>24-hour review hold.</strong> Imported devices are reviewed before going live. You&apos;ll be notified by email once the batch is approved.
              </div>
            </div>

            {/* Footer actions */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              {errCount > 0 ? (
                <button type="button" className="btn">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginRight: 6 }}>
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                    <polyline points="7 10 12 15 17 10"/>
                    <line x1="12" y1="15" x2="12" y2="3"/>
                  </svg>
                  Download error report
                </button>
              ) : <span />}
              <button
                type="button"
                className="btn btn-s"
                onClick={handleImport}
                disabled={importing || !cert1 || !cert2 || !sigName || !sigTitle}
              >
                {imported ? 'Import complete!' : importing ? `Importing ${okCount + warnCount} devices…` : `Import ${okCount + warnCount} devices →`}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
