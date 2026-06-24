'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useMutation } from 'convex/react'
import { api as apiBase } from '../../../../../convex/_generated/api'
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const api = apiBase as any

const REQUIRED = ['companyName', 'contactName', 'contactEmail', 'country']

interface MfrRow {
  companyName: string
  contactName: string
  contactEmail: string
  country: string
  regNumber?: string
  website?: string
  logoUrl?: string
}

function parseCSV(text: string): { headers: string[]; rows: string[][] } {
  const lines = text.split(/\r?\n/).filter(l => l.trim())
  function splitLine(line: string): string[] {
    const cells: string[] = []
    let cur = '', inQ = false
    for (let i = 0; i < line.length; i++) {
      const c = line[i]
      if (c === '"') {
        if (inQ && line[i + 1] === '"') { cur += '"'; i++ }
        else inQ = !inQ
      } else if (c === ',' && !inQ) {
        cells.push(cur); cur = ''
      } else {
        cur += c
      }
    }
    cells.push(cur)
    return cells.map(s => s.trim())
  }
  const headers = splitLine(lines[0])
  const rows = lines.slice(1).map(splitLine)
  return { headers, rows }
}

type ImportResult = { added: number; skipped: string[] }

export default function ImportManufacturersClient() {
  const router   = useRouter()
  const bulk     = useMutation(api.manufacturers.adminBulkAddManufacturers)
  const fileRef  = useRef<HTMLInputElement>(null)

  const [parsed,     setParsed]     = useState<MfrRow[] | null>(null)
  const [parseError, setParseError] = useState('')
  const [dragOver,   setDragOver]   = useState(false)
  const [importing,  setImporting]  = useState(false)
  const [result,     setResult]     = useState<ImportResult | null>(null)
  const [importErr,  setImportErr]  = useState('')
  const [fileName,   setFileName]   = useState('')

  function processFile(file: File) {
    if (!file.name.endsWith('.csv')) {
      setParseError('Please upload a .csv file.'); return
    }
    setFileName(file.name); setParseError(''); setParsed(null)
    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const text = e.target?.result as string
        const { headers, rows } = parseCSV(text)

        const missing = REQUIRED.filter(r => !headers.includes(r))
        if (missing.length) {
          setParseError(`CSV is missing required columns: ${missing.join(', ')}`)
          return
        }

        const idx = (col: string) => headers.indexOf(col)
        const mfrs: MfrRow[] = []
        const errs: string[] = []

        rows.forEach((row, i) => {
          const get = (col: string) => (row[idx(col)] ?? '').trim()
          if (!get('companyName') && !get('contactEmail')) return
          const miss = REQUIRED.filter(r => !get(r))
          if (miss.length) { errs.push(`Row ${i + 2}: missing ${miss.join(', ')}`); return }
          mfrs.push({
            companyName:  get('companyName'),
            contactName:  get('contactName'),
            contactEmail: get('contactEmail'),
            country:      get('country'),
            regNumber:    get('regNumber') || undefined,
            website:      get('website') || undefined,
            logoUrl:      get('logoUrl') || undefined,
          })
        })

        if (errs.length) {
          setParseError(errs.slice(0, 3).join('\n') + (errs.length > 3 ? `\n…and ${errs.length - 3} more` : ''))
          return
        }
        if (!mfrs.length) { setParseError('No valid rows found in the CSV.'); return }

        setParsed(mfrs)
      } catch {
        setParseError('Could not parse the CSV — check the file format.')
      }
    }
    reader.readAsText(file)
  }

  function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) processFile(file)
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault(); setDragOver(false)
    const file = e.dataTransfer.files?.[0]
    if (file) processFile(file)
  }

  async function handleImport() {
    if (!parsed) return
    setImporting(true); setImportErr('')
    try {
      const res = await bulk({ manufacturers: parsed as never[] })
      setResult(res as ImportResult)
    } catch (e) {
      setImportErr((e as { message?: string })?.message ?? 'Import failed — please try again.')
    } finally {
      setImporting(false)
    }
  }

  function reset() {
    setParsed(null); setResult(null); setImportErr(''); setParseError(''); setFileName('')
    if (fileRef.current) fileRef.current.value = ''
  }

  return (
    <div className="m-content">
      <button
        className="m-back"
        onClick={() => router.push('/master/manufacturers')}
        style={{ background:'none', border:0, cursor:'pointer', color:'var(--muted)', fontFamily:'var(--ff)', fontSize:13.5, padding:0, marginBottom:24, display:'inline-flex', alignItems:'center', gap:6 }}
      >
        ← Manufacturers
      </button>

      <div className="m-h" style={{ marginBottom:28 }}>
        <div>
          <h2>Import Manufacturers</h2>
          <div className="sub">Bulk-import manufacturers from a CSV file. Duplicate emails are automatically skipped.</div>
        </div>
      </div>

      {result ? (
        /* ── Result screen ── */
        <div style={{ maxWidth:520 }}>
          <div style={{ background:'rgba(var(--ok-rgb),0.10)', border:'1px solid rgba(var(--ok-rgb),0.25)', borderRadius:14, padding:'28px', marginBottom:16 }}>
            <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:16 }}>
              <div style={{ width:40, height:40, borderRadius:'50%', background:'rgba(var(--ok-rgb),0.15)', display:'grid', placeItems:'center', flexShrink:0 }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--ok)" strokeWidth="2.2"><path d="M20 6L9 17l-5-5"/></svg>
              </div>
              <div>
                <div style={{ fontFamily:'var(--ff)', fontSize:17, fontWeight:600, color:'var(--text)' }}>Import complete</div>
                <div style={{ fontSize:13, color:'var(--muted)', marginTop:2 }}>from {fileName}</div>
              </div>
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, marginBottom: result.skipped.length ? 16 : 0 }}>
              <div style={{ background:'rgba(var(--ok-rgb),0.08)', borderRadius:10, padding:'14px 16px' }}>
                <div style={{ fontFamily:'var(--ff)', fontSize:28, fontWeight:700, color:'var(--ok)' }}>{result.added}</div>
                <div style={{ fontSize:12, color:'var(--muted)', marginTop:2 }}>manufacturers added</div>
              </div>
              <div style={{ background:'var(--bg)', borderRadius:10, padding:'14px 16px' }}>
                <div style={{ fontFamily:'var(--ff)', fontSize:28, fontWeight:700, color:'var(--muted)' }}>{result.skipped.length}</div>
                <div style={{ fontSize:12, color:'var(--muted)', marginTop:2 }}>skipped (duplicates)</div>
              </div>
            </div>
            {result.skipped.length > 0 && (
              <div style={{ fontSize:12, color:'var(--muted)', background:'var(--bg)', borderRadius:8, padding:'10px 12px' }}>
                <div style={{ fontWeight:500, marginBottom:4, color:'var(--text)' }}>Skipped (already exist):</div>
                {result.skipped.map(e => <div key={e} style={{ fontFamily:'monospace' }}>{e}</div>)}
              </div>
            )}
          </div>
          <div style={{ display:'flex', gap:10 }}>
            <button className="btn btn-s" onClick={() => router.push('/master/manufacturers')}>View manufacturers</button>
            <button className="btn" onClick={reset}>Import another file</button>
          </div>
        </div>
      ) : (
        <div style={{ maxWidth:640 }}>

          {/* ── Drop zone ── */}
          <div
            onDragOver={e => { e.preventDefault(); setDragOver(true) }}
            onDragLeave={() => setDragOver(false)}
            onDrop={onDrop}
            onClick={() => fileRef.current?.click()}
            style={{
              border:`2px dashed ${dragOver ? 'var(--accent)' : parsed ? 'var(--ok)' : 'var(--border2)'}`,
              borderRadius:14, padding:'52px 32px', textAlign:'center', cursor:'pointer',
              background: dragOver ? 'rgba(var(--accent-rgb),0.04)' : parsed ? 'rgba(var(--ok-rgb),0.04)' : 'var(--bg2)',
              transition:'border-color .15s, background .15s',
              marginBottom:12,
            }}
          >
            {parsed ? (
              <>
                <div style={{ width:48, height:48, borderRadius:'50%', background:'rgba(var(--ok-rgb),0.12)', display:'grid', placeItems:'center', margin:'0 auto 12px' }}>
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--ok)" strokeWidth="2"><path d="M20 6L9 17l-5-5"/></svg>
                </div>
                <div style={{ fontFamily:'var(--ff)', fontSize:15, fontWeight:600, color:'var(--ok)', marginBottom:4 }}>
                  {fileName}
                </div>
                <div style={{ fontSize:13, color:'var(--muted)' }}>
                  {parsed.length} manufacturer{parsed.length !== 1 ? 's' : ''} ready — click to choose a different file
                </div>
              </>
            ) : (
              <>
                <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="var(--muted2)" strokeWidth="1.5" style={{ marginBottom:12 }}>
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                  <polyline points="17 8 12 3 7 8"/>
                  <line x1="12" y1="3" x2="12" y2="15"/>
                </svg>
                <div style={{ fontFamily:'var(--ff)', fontSize:16, fontWeight:500, color:'var(--text)', marginBottom:6 }}>
                  Drop your CSV here, or click to browse
                </div>
                <div style={{ fontSize:13, color:'var(--muted2)' }}>.csv files only</div>
              </>
            )}
            <input ref={fileRef} type="file" accept=".csv" onChange={onFileChange} style={{ display:'none' }} aria-label="Upload CSV file" />
          </div>

          {/* Template download hint */}
          <div style={{ fontSize:12.5, color:'var(--muted)', marginBottom:20, display:'flex', alignItems:'center', gap:6 }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
            Need the right format?{' '}
            <a href="/manufacturers-template.csv" download="manufacturers-template.csv" style={{ color:'var(--accent)', textDecoration:'none', fontWeight:500 }}>
              Download the CSV template
            </a>
          </div>

          {parseError && (
            <div style={{ marginBottom:16, background:'rgba(var(--err-rgb),0.08)', border:'1px solid rgba(var(--err-rgb),0.20)', borderRadius:8, padding:'10px 14px', fontSize:13, color:'var(--err)', whiteSpace:'pre-line' }}>
              {parseError}
            </div>
          )}

          {/* ── Preview & import ── */}
          {parsed && (
            <div style={{ background:'var(--bg2)', border:'1px solid var(--border)', borderRadius:14, padding:'20px 24px' }}>
              <div style={{ fontFamily:'var(--ff)', fontSize:14, fontWeight:600, color:'var(--text)', marginBottom:12 }}>
                Preview — {parsed.length} manufacturer{parsed.length !== 1 ? 's' : ''}
              </div>

              <div style={{ overflowX:'auto', borderRadius:8, border:'1px solid var(--border)', marginBottom:16 }}>
                <table style={{ width:'100%', borderCollapse:'collapse', fontSize:12.5 }}>
                  <thead>
                    <tr style={{ background:'var(--bg)', borderBottom:'1px solid var(--border)' }}>
                      {['Logo', 'Company', 'Contact', 'Email', 'Country', 'Website'].map(h => (
                        <th key={h} style={{ padding:'8px 12px', textAlign:'left', fontFamily:'var(--ff)', fontWeight:600, color:'var(--muted)', whiteSpace:'nowrap' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {parsed.slice(0, 12).map((m, i) => (
                      <tr key={i} style={{ borderBottom:'1px solid var(--border)' }}>
                        <td style={{ padding:'8px 12px' }}>
                          {m.logoUrl
                            ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img src={m.logoUrl} alt={m.companyName} style={{ width:24, height:24, objectFit:'contain', borderRadius:4, background:'#fff', padding:2 }} onError={e => { (e.target as HTMLImageElement).style.opacity='0' }} />
                            )
                            : <div style={{ width:24, height:24, borderRadius:4, background:'var(--bg)', border:'1px solid var(--border)' }} />
                          }
                        </td>
                        <td style={{ padding:'8px 12px', fontWeight:500, color:'var(--text)', whiteSpace:'nowrap' }}>{m.companyName}</td>
                        <td style={{ padding:'8px 12px', color:'var(--muted)', whiteSpace:'nowrap' }}>{m.contactName}</td>
                        <td style={{ padding:'8px 12px', color:'var(--muted)', whiteSpace:'nowrap' }}>{m.contactEmail}</td>
                        <td style={{ padding:'8px 12px', color:'var(--muted)', whiteSpace:'nowrap' }}>{m.country}</td>
                        <td style={{ padding:'8px 12px', color:'var(--muted)', whiteSpace:'nowrap' }}>
                          {m.website ? <a href={m.website} target="_blank" rel="noopener noreferrer" style={{ color:'var(--accent)', textDecoration:'none' }}>{m.website.replace(/^https?:\/\//, '')}</a> : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {parsed.length > 12 && (
                  <div style={{ padding:'8px 12px', fontSize:12, color:'var(--muted)', borderTop:'1px solid var(--border)', background:'var(--bg)' }}>
                    …and {parsed.length - 12} more
                  </div>
                )}
              </div>

              {importErr && (
                <div style={{ marginBottom:14, background:'rgba(var(--err-rgb),0.08)', border:'1px solid rgba(var(--err-rgb),0.20)', borderRadius:8, padding:'10px 14px', fontSize:13, color:'var(--err)' }}>
                  {importErr}
                </div>
              )}

              <div style={{ display:'flex', gap:10 }}>
                <button type="button" className="btn" onClick={reset} disabled={importing}>Clear</button>
                <button type="button" className="btn btn-s btn-block" onClick={handleImport} disabled={importing}>
                  {importing ? 'Importing…' : `Import ${parsed.length} manufacturer${parsed.length !== 1 ? 's' : ''} →`}
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
