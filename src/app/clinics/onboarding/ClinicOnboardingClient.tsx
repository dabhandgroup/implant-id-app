'use client'
import { useState, useRef, useEffect, useMemo } from 'react'
import { useMutation, useQuery }                 from 'convex/react'
import { api }                                   from '../../../../convex/_generated/api'
import { CustomSelect }     from '@/components/ui/CustomSelect'
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const apiAny = api as any

// ── Constants ─────────────────────────────────────────────────────────────────

const FACILITY_TYPES = [
  'Hospital — NHS / public',
  'Hospital — private',
  'Private clinic',
  'Radiology centre',
  'Cardiac care unit',
  'Orthopaedic centre',
  'Neurology / neurosurgery centre',
  'ENT / cochlear implant centre',
  'General practice / GP surgery',
  'University / teaching hospital',
  'Other',
]

const COUNTRIES = [
  'United Kingdom','United States','Australia','Canada','Ireland',
  'New Zealand','Germany','France','Spain','Italy','Netherlands',
  'Belgium','Sweden','Norway','Denmark','Finland','Switzerland',
  'Austria','Poland','Czech Republic','Portugal','Greece','Other',
]

const EU_BODIES  = ['European CE Mark (EU / EEA)', 'Other', 'Not applicable']
const ALL_BODIES = [
  'CQC — Care Quality Commission (UK)',
  'MHRA — Medicines and Healthcare products Regulatory Agency (UK)',
  'TGA — Therapeutic Goods Administration (Australia)',
  'FDA — Food and Drug Administration (USA)',
  'Health Canada',
  'HIQA — Health Information and Quality Authority (Ireland)',
  'European CE Mark (EU / EEA)',
  'Other',
  'Not applicable',
]
const COUNTRY_REGULATORY_MAP: Record<string, string[]> = {
  'United Kingdom': ['CQC — Care Quality Commission (UK)', 'MHRA — Medicines and Healthcare products Regulatory Agency (UK)', 'Other', 'Not applicable'],
  'United States':  ['FDA — Food and Drug Administration (USA)', 'Other', 'Not applicable'],
  'Australia':      ['TGA — Therapeutic Goods Administration (Australia)', 'Other', 'Not applicable'],
  'Canada':         ['Health Canada', 'Other', 'Not applicable'],
  'Ireland':        ['HIQA — Health Information and Quality Authority (Ireland)', 'Other', 'Not applicable'],
  'New Zealand':    ['Other', 'Not applicable'],
  'Germany':        EU_BODIES, 'France':      EU_BODIES, 'Spain':    EU_BODIES, 'Italy':   EU_BODIES,
  'Netherlands':    EU_BODIES, 'Belgium':     EU_BODIES, 'Sweden':   EU_BODIES, 'Norway':  EU_BODIES,
  'Denmark':        EU_BODIES, 'Finland':     EU_BODIES, 'Switzerland': EU_BODIES, 'Austria': EU_BODIES,
  'Poland':         EU_BODIES, 'Czech Republic': EU_BODIES, 'Portugal': EU_BODIES, 'Greece': EU_BODIES,
}

// Country-specific professional registration labels
const COUNTRY_PROF_REG: Record<string, { label: string; placeholder: string }> = {
  'United Kingdom': { label: 'HCPC number',                       placeholder: 'e.g. PH123456' },
  'United States':  { label: 'NPI number',                        placeholder: 'e.g. 1234567890' },
  'Australia':      { label: 'AHPRA registration number',         placeholder: 'e.g. MED0001234' },
  'Canada':         { label: 'College registration number',       placeholder: 'e.g. 12345' },
  'Ireland':        { label: 'CORU registration number',          placeholder: 'e.g. 12345' },
  'New Zealand':    { label: 'MCNZ / NZRP number',               placeholder: 'e.g. 12345' },
  'Germany':        { label: 'Approbationsnummer',                placeholder: 'e.g. 12345' },
  'France':         { label: 'RPPS number',                       placeholder: 'e.g. 12345678901' },
  'Netherlands':    { label: 'BIG registration number',           placeholder: 'e.g. 89012345616' },
  'Sweden':         { label: 'Socialstyrelsen number',            placeholder: 'e.g. 12345' },
}
const DEFAULT_PROF_REG = { label: 'Professional registration number', placeholder: 'e.g. HCPC, AHPRA, NPI…' }

// International phone dial codes (used by PhonePicker + for country auto-populate)
const PHONE_COUNTRIES = [
  { flag: '🇬🇧', dial: '+44',  placeholder: '7700 900123',     name: 'United Kingdom'  },
  { flag: '🇺🇸', dial: '+1',   placeholder: '(201) 555-0123',  name: 'United States'   },
  { flag: '🇦🇺', dial: '+61',  placeholder: '412 345 678',     name: 'Australia'        },
  { flag: '🇨🇦', dial: '+1',   placeholder: '(204) 555-0123',  name: 'Canada'           },
  { flag: '🇮🇪', dial: '+353', placeholder: '85 012 3456',     name: 'Ireland'          },
  { flag: '🇳🇿', dial: '+64',  placeholder: '21 123 4567',     name: 'New Zealand'      },
  { flag: '🇩🇪', dial: '+49',  placeholder: '151 12345678',    name: 'Germany'          },
  { flag: '🇫🇷', dial: '+33',  placeholder: '6 12 34 56 78',   name: 'France'           },
  { flag: '🇪🇸', dial: '+34',  placeholder: '612 34 56 78',    name: 'Spain'            },
  { flag: '🇮🇹', dial: '+39',  placeholder: '312 345 6789',    name: 'Italy'            },
  { flag: '🇳🇱', dial: '+31',  placeholder: '6 12345678',      name: 'Netherlands'      },
  { flag: '🇧🇪', dial: '+32',  placeholder: '470 12 34 56',    name: 'Belgium'          },
  { flag: '🇸🇪', dial: '+46',  placeholder: '70 123 45 67',    name: 'Sweden'           },
  { flag: '🇳🇴', dial: '+47',  placeholder: '406 12 345',      name: 'Norway'           },
  { flag: '🇩🇰', dial: '+45',  placeholder: '20 12 34 56',     name: 'Denmark'          },
  { flag: '🇫🇮', dial: '+358', placeholder: '40 123 4567',     name: 'Finland'          },
  { flag: '🇨🇭', dial: '+41',  placeholder: '76 123 45 67',    name: 'Switzerland'      },
  { flag: '🇦🇹', dial: '+43',  placeholder: '650 1234567',     name: 'Austria'          },
  { flag: '🇵🇱', dial: '+48',  placeholder: '512 345 678',     name: 'Poland'           },
  { flag: '🇨🇿', dial: '+420', placeholder: '601 123 456',     name: 'Czech Republic'   },
  { flag: '🇵🇹', dial: '+351', placeholder: '912 345 678',     name: 'Portugal'         },
  { flag: '🇬🇷', dial: '+30',  placeholder: '691 234 5678',    name: 'Greece'           },
]
type PhoneCountry = typeof PHONE_COUNTRIES[0]

// ── Left panel shared ─────────────────────────────────────────────────────────

function SidePanel() {
  return (
    <div className="onb-side">
      <a href="/" className="logo" style={{ display:'flex', alignItems:'center', gap:10, textDecoration:'none' }}>
        <img src="/icon.svg" alt="" style={{ height:56 }} />
        <span className="logo-text" style={{ fontFamily:'var(--ff)', fontWeight:700, fontSize:22 }}>
          <b>Implant</b><span>ID</span>
        </span>
      </a>

      <h1>Register your clinic.</h1>
      <p>
        We verify every clinic before granting access to patient records.
        This keeps the platform secure and trustworthy for everyone.
      </p>

      <div className="steps">
        <div className="onb-side-steps">
          {[
            { n: 1, label: 'Clinic details',    desc: 'Fill in this form — name, address, accreditation and contact info' },
            { n: 2, label: 'Verification call', desc: 'Quick 10-minute call to verify your clinic and walk you through the platform' },
            { n: 3, label: "You're live",       desc: 'Full access to the Implant ID platform for your team' },
          ].map(s => (
            <div key={s.n} className="onb-step future">
              <div className="num">{s.n}</div>
              <div>
                <h4>{s.label}</h4>
                <p>{s.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="trust">
        <span>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
          HIPAA-grade
        </span>
        <span>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><circle cx="12" cy="12" r="10"/><path d="m9 12 2 2 4-4"/></svg>
          SOC 2
        </span>
        <span>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><rect x="5" y="2" width="14" height="20" rx="2"/><path d="M12 18h.01"/></svg>
          GDPR
        </span>
      </div>
    </div>
  )
}

// ── International phone picker ────────────────────────────────────────────────

function PhonePicker({
  flag, dial, phoneNum, placeholder,
  onCountryChange, onPhoneChange,
}: {
  flag: string; dial: string; phoneNum: string; placeholder: string
  onCountryChange: (c: PhoneCountry) => void
  onPhoneChange:   (v: string) => void
}) {
  const [open,   setOpen]   = useState(false)
  const [search, setSearch] = useState('')
  const ref = useRef<HTMLDivElement>(null)

  const filtered = PHONE_COUNTRIES.filter(c =>
    !search || c.name.toLowerCase().includes(search.toLowerCase()) || c.dial.includes(search)
  )

  useEffect(() => {
    if (!open) return
    function h(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [open])

  return (
    <div className="phone-row" ref={ref}>
      <button type="button" className="phone-code" onClick={() => setOpen(o => !o)} aria-label="Select country dial code">
        <span className="flag-em">{flag}</span>
        <span className="dial">{dial}</span>
        <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>
      <input
        className="input" type="tel" placeholder={placeholder}
        value={phoneNum}
        onChange={e => onPhoneChange(e.target.value)}
        onBlur={e => {
          const stripped = e.target.value.replace(/^0+/, '')
          if (stripped !== e.target.value) onPhoneChange(stripped)
        }}
      />
      {open && (
        <div className="phone-dd open">
          <div className="phone-dd-search">
            <input
              placeholder="Search countries…" value={search}
              onChange={e => setSearch(e.target.value)} autoFocus
            />
          </div>
          <div className="phone-dd-list">
            {filtered.map(c => (
              <button key={c.name} type="button"
                onClick={() => { onCountryChange(c); setOpen(false); setSearch('') }}>
                <span className="flag-em">{c.flag}</span>
                {c.name}
                <span className="dial-r">{c.dial}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ── Scanner picker ────────────────────────────────────────────────────────────

interface ScDoc { _id: string; manufacturer: string; model: string; fieldStrength: string; scannerType: string }

const FIELD_STRENGTHS_SUGGEST = ['0.5T', '1.0T', '1.5T', '3T', '7T', 'Other']
const SCANNER_TYPES_SUGGEST   = ['Closed-bore', 'Open-bore', 'Standing / upright', 'Other']

function ScannerPicker({
  selected, onSelect, onRemove,
}: {
  selected:  ScDoc[]
  onSelect:  (s: ScDoc) => void
  onRemove:  (id: string) => void
}) {
  const allScanners   = useQuery(apiAny.scanners.listApprovedScanners) as ScDoc[] | undefined
  const suggestMut    = useMutation(apiAny.scanners.suggestScannerPublic)

  const [search,          setSearch]          = useState('')
  const [open,            setOpen]            = useState(false)
  const [suggesting,      setSuggesting]      = useState(false)
  const [suggestDone,     setSuggestDone]     = useState(false)
  const [suggestLoading,  setSuggestLoading]  = useState(false)
  const [suggestError,    setSuggestError]    = useState('')
  const [sfManufacturer,  setSfManufacturer]  = useState('')
  const [sfModel,         setSfModel]         = useState('')
  const [sfFieldStrength, setSfFieldStrength] = useState('')
  const [sfScannerType,   setSfScannerType]   = useState('')
  const [sfNotes,         setSfNotes]         = useState('')

  const ref = useRef<HTMLDivElement>(null)

  const results = useMemo(() => {
    if (!allScanners || !search.trim()) return []
    const q = search.toLowerCase()
    return allScanners
      .filter(s => !selected.some(sel => sel._id === s._id))
      .filter(s =>
        s.manufacturer.toLowerCase().includes(q) ||
        s.model.toLowerCase().includes(q) ||
        s.fieldStrength.toLowerCase().includes(q)
      )
      .slice(0, 8)
  }, [allScanners, search, selected])

  useEffect(() => {
    function h(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [])

  function openSuggestion() {
    setOpen(false)
    setSuggesting(true)
    setSuggestDone(false)
    setSuggestError('')
    setSfManufacturer(search.trim())
    setSfModel('')
    setSfFieldStrength('')
    setSfScannerType('')
    setSfNotes('')
  }

  function closeSuggestion() {
    setSuggesting(false)
    setSuggestDone(false)
  }

  async function handleSuggest(e: React.FormEvent) {
    e.preventDefault()
    setSuggestError('')
    if (!sfManufacturer.trim()) return setSuggestError('Enter the manufacturer name')
    if (!sfModel.trim())        return setSuggestError('Enter the model name')
    if (!sfFieldStrength)       return setSuggestError('Select a field strength')
    if (!sfScannerType)         return setSuggestError('Select a scanner type')
    setSuggestLoading(true)
    try {
      await suggestMut({
        manufacturer:  sfManufacturer.trim(),
        model:         sfModel.trim(),
        fieldStrength: sfFieldStrength,
        scannerType:   sfScannerType,
        notes:         sfNotes.trim() || undefined,
      })
      setSuggestDone(true)
    } catch (err) {
      setSuggestError((err as { message?: string })?.message ?? 'Submission failed — try again')
    } finally {
      setSuggestLoading(false)
    }
  }

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
      {/* Selected scanners */}
      {selected.length > 0 && (
        <div style={{ display:'flex', flexWrap:'wrap', gap:8 }}>
          {selected.map(s => (
            <span key={s._id} style={{
              display:'inline-flex', alignItems:'center', gap:7,
              background:'rgba(var(--accent-rgb),0.10)', border:'1px solid rgba(var(--accent-rgb),0.25)',
              borderRadius:8, padding:'5px 10px', fontFamily:'var(--ff)', fontSize:13, color:'var(--accent-deep)',
            }}>
              <span style={{ fontWeight:600 }}>{s.fieldStrength}</span>
              {s.manufacturer} {s.model}
              <button
                type="button"
                onClick={() => onRemove(s._id)}
                aria-label={`Remove ${s.manufacturer} ${s.model}`}
                style={{ background:'transparent', border:'none', cursor:'pointer', color:'var(--accent)', padding:0, lineHeight:1, display:'flex' }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            </span>
          ))}
        </div>
      )}

      {/* Search input + dropdown */}
      <div ref={ref} style={{ position:'relative' }}>
        <input
          className="input"
          placeholder="Search scanner (e.g. Siemens 3T, Philips 1.5T…)"
          value={search}
          onChange={e => { setSearch(e.target.value); setOpen(true) }}
          onFocus={() => setOpen(true)}
          aria-label="Search MRI scanners"
          aria-autocomplete="list"
        />
        {open && results.length > 0 && (
          <div style={{
            position:'absolute', top:'calc(100% + 4px)', left:0, right:0, zIndex:99,
            background:'var(--bg2)', border:'1px solid var(--border)', borderRadius:10,
            boxShadow:'0 8px 24px rgba(0,0,0,.12)', maxHeight:240, overflowY:'auto',
          }}>
            {results.map(s => (
              <button
                key={s._id}
                type="button"
                onMouseDown={e => { e.preventDefault(); onSelect(s); setSearch(''); setOpen(false) }}
                style={{
                  display:'flex', alignItems:'center', gap:10, width:'100%', textAlign:'left',
                  padding:'10px 14px', background:'transparent', border:'none', cursor:'pointer',
                  borderBottom:'1px solid var(--border)', fontFamily:'var(--ff)',
                }}
              >
                <span style={{ background:'rgba(var(--accent-rgb),0.10)', color:'var(--accent-deep)', borderRadius:5, padding:'2px 7px', fontSize:11, fontWeight:700 }}>{s.fieldStrength}</span>
                <span style={{ fontWeight:600, fontSize:13.5, color:'var(--text)' }}>{s.manufacturer} {s.model}</span>
                <span style={{ fontSize:12, color:'var(--muted)', marginLeft:'auto' }}>{s.scannerType}</span>
              </button>
            ))}
          </div>
        )}
        {open && search.trim() && results.length === 0 && allScanners !== undefined && (
          <div style={{
            position:'absolute', top:'calc(100% + 4px)', left:0, right:0, zIndex:99,
            background:'var(--bg2)', border:'1px solid var(--border)', borderRadius:10,
            padding:'14px 16px', fontFamily:'var(--ff)',
          }}>
            <p style={{ fontSize:13.5, color:'var(--muted)', margin:'0 0 10px' }}>
              No matching scanners found.
            </p>
            <button
              type="button"
              onMouseDown={e => { e.preventDefault(); openSuggestion() }}
              style={{
                display:'inline-flex', alignItems:'center', gap:6, fontFamily:'var(--ff)',
                fontSize:13, fontWeight:500, color:'var(--accent)',
                background:'rgba(var(--accent-rgb),0.08)', border:'1px dashed rgba(var(--accent-rgb),0.30)',
                borderRadius:8, padding:'7px 14px', cursor:'pointer',
              }}
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
              </svg>
              Suggest this scanner for review
            </button>
          </div>
        )}
      </div>

      {/* Suggestion form */}
      {suggesting && !suggestDone && (
        <div style={{
          background:'var(--bg)', border:'1px solid var(--border)', borderRadius:12, padding:'20px 22px',
        }}>
          <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', marginBottom:4 }}>
            <h4 style={{ fontFamily:'var(--ff)', fontSize:14, fontWeight:600, color:'var(--text)', margin:0 }}>
              Suggest a scanner
            </h4>
            <button
              type="button"
              onClick={closeSuggestion}
              aria-label="Close suggestion form"
              style={{ background:'transparent', border:'none', cursor:'pointer', color:'var(--muted)', padding:2, lineHeight:1, display:'flex' }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>
          </div>
          <p style={{ fontFamily:'var(--fb)', fontSize:12.5, color:'var(--muted)', margin:'0 0 16px', lineHeight:1.5 }}>
            Tell us the details and we'll verify and add it to the database within a few days.
          </p>

          <form onSubmit={handleSuggest} style={{ display:'flex', flexDirection:'column', gap:12 }}>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
              <div className="field" style={{ margin:0 }}>
                <label>Manufacturer <span style={{ color:'var(--err)', marginLeft:3 }}>*</span></label>
                <input
                  className="input" type="text" placeholder="e.g. Siemens"
                  value={sfManufacturer} onChange={e => setSfManufacturer(e.target.value)} autoComplete="off"
                />
              </div>
              <div className="field" style={{ margin:0 }}>
                <label>Model <span style={{ color:'var(--err)', marginLeft:3 }}>*</span></label>
                <input
                  className="input" type="text" placeholder="e.g. MAGNETOM Vida"
                  value={sfModel} onChange={e => setSfModel(e.target.value)} autoComplete="off"
                />
              </div>
            </div>

            <div className="field" style={{ margin:0 }}>
              <label>Field strength <span style={{ color:'var(--err)', marginLeft:3 }}>*</span></label>
              <div style={{ display:'flex', gap:6, flexWrap:'wrap', marginTop:2 }}>
                {FIELD_STRENGTHS_SUGGEST.map(fs => {
                  const on = sfFieldStrength === fs
                  return (
                    <button key={fs} type="button" onClick={() => setSfFieldStrength(fs)} style={{
                      padding:'6px 14px', borderRadius:8, cursor:'pointer', transition:'all .15s',
                      fontFamily:'var(--ff)', fontSize:13, fontWeight: on ? 700 : 500,
                      border:`1.5px solid ${on ? 'var(--accent)' : 'var(--border)'}`,
                      background: on ? 'rgba(var(--accent-rgb),0.12)' : 'transparent',
                      color: on ? 'var(--accent-deep)' : 'var(--muted)',
                    }}>{fs}</button>
                  )
                })}
              </div>
            </div>

            <div className="field" style={{ margin:0 }}>
              <label>Scanner type <span style={{ color:'var(--err)', marginLeft:3 }}>*</span></label>
              <div style={{ display:'flex', gap:6, flexWrap:'wrap', marginTop:2 }}>
                {SCANNER_TYPES_SUGGEST.map(st => {
                  const on = sfScannerType === st
                  return (
                    <button key={st} type="button" onClick={() => setSfScannerType(st)} style={{
                      padding:'6px 14px', borderRadius:8, cursor:'pointer', transition:'all .15s',
                      fontFamily:'var(--ff)', fontSize:13, fontWeight: on ? 700 : 500,
                      border:`1.5px solid ${on ? 'var(--accent)' : 'var(--border)'}`,
                      background: on ? 'rgba(var(--accent-rgb),0.12)' : 'transparent',
                      color: on ? 'var(--accent-deep)' : 'var(--muted)',
                    }}>{st}</button>
                  )
                })}
              </div>
            </div>

            <div className="field" style={{ margin:0 }}>
              <label>Notes <span style={{ fontWeight:400, opacity:.6 }}>(optional)</span></label>
              <textarea
                className="input" rows={2}
                placeholder="Any additional details — country, specific model variant, certifications…"
                value={sfNotes} onChange={e => setSfNotes(e.target.value)} style={{ resize:'vertical' }}
              />
            </div>

            {suggestError && (
              <div style={{
                background:'rgba(var(--err-rgb),0.08)', border:'1px solid rgba(var(--err-rgb),0.20)',
                borderRadius:8, padding:'10px 14px', fontFamily:'var(--ff)', fontSize:13, color:'var(--err)',
              }}>{suggestError}</div>
            )}

            <div style={{ display:'flex', gap:8, justifyContent:'flex-end' }}>
              <button type="button" className="btn" onClick={closeSuggestion}>Cancel</button>
              <button type="submit" className="btn btn-s" disabled={suggestLoading}>
                {suggestLoading ? 'Submitting…' : 'Submit for review →'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Success state */}
      {suggesting && suggestDone && (
        <div style={{
          display:'flex', alignItems:'flex-start', gap:12,
          background:'rgba(var(--ok-rgb),0.08)', border:'1px solid rgba(var(--ok-rgb),0.22)',
          borderRadius:12, padding:'14px 16px',
        }}>
          <div style={{
            width:28, height:28, borderRadius:'50%', background:'rgba(var(--ok-rgb),0.15)',
            color:'var(--ok)', display:'grid', placeItems:'center', flexShrink:0,
          }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
              <polyline points="20 6 9 17 4 12"/>
            </svg>
          </div>
          <div style={{ flex:1 }}>
            <p style={{ fontFamily:'var(--ff)', fontSize:13.5, fontWeight:600, color:'var(--text)', margin:'0 0 2px' }}>
              Scanner submitted for review
            </p>
            <p style={{ fontFamily:'var(--fb)', fontSize:13, color:'var(--muted)', margin:0 }}>
              We'll verify the details and add it to the database within a few days.
            </p>
          </div>
          <button type="button" onClick={closeSuggestion} aria-label="Dismiss"
            style={{ background:'transparent', border:'none', cursor:'pointer', color:'var(--muted)', padding:2, lineHeight:1, display:'flex' }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>
      )}
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

export default function ClinicOnboardingClient() {
  const submitApplication = useMutation(api.clinics.submitClinicApplication)
  const generateUploadUrl = useMutation(api.clinics.onboardingGenerateUploadUrl)

  // Section 1 — Clinic information
  const [facilityName,    setFacilityName]    = useState('')
  const [facilityType,    setFacilityType]    = useState('')
  const [facilityCountry, setFacilityCountry] = useState('')
  const [facilityAddress, setFacilityAddress] = useState('')

  // Section 2 — Primary contact
  const [firstName,    setFirstName]    = useState('')
  const [lastName,     setLastName]     = useState('')
  const [jobTitle,     setJobTitle]     = useState('')
  const [contactEmail, setContactEmail] = useState('')
  // Phone picker state
  const [phoneFlag,        setPhoneFlag]        = useState('🇬🇧')
  const [phoneDial,        setPhoneDial]        = useState('+44')
  const [phoneNum,         setPhoneNum]         = useState('')
  const [phonePlaceholder, setPhonePlaceholder] = useState('7700 900123')
  // Professional registration (label driven by facilityCountry from section 1)
  const [accreditationNumber, setAccreditationNumber] = useState('')

  // Section 3 — Scanner hardware
  const [selectedScanners, setSelectedScanners] = useState<ScDoc[]>([])
  const [mriCount,         setMriCount]         = useState('')
  const [staffCount,       setStaffCount]       = useState('')

  // Section 4 — Accreditation (optional)
  const [accreditationFile, setAccreditationFile] = useState<File | null>(null)
  const [dragOver,          setDragOver]          = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Section 5 — Regulatory body (optional)
  const [regulatoryBody,  setRegulatoryBody]  = useState('')
  const [registrationNum, setRegistrationNum] = useState('')

  // Section 6 — Additional information
  const [additionalInfo, setAdditionalInfo] = useState('')

  // UI
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState('')
  const [done,    setDone]    = useState(false)
  const errorRef = useRef<HTMLDivElement>(null)

  // Derived
  const profRegInfo = COUNTRY_PROF_REG[facilityCountry] ?? DEFAULT_PROF_REG
  const availableRegulatoryBodies = facilityCountry
    ? (COUNTRY_REGULATORY_MAP[facilityCountry] ?? ALL_BODIES)
    : ALL_BODIES

  function handleCountryChange(country: string) {
    setFacilityCountry(country)
    const available = COUNTRY_REGULATORY_MAP[country] ?? ALL_BODIES
    if (regulatoryBody && !available.includes(regulatoryBody)) setRegulatoryBody('')
  }

  // When phone country is selected, auto-populate clinic country if not yet set
  function handlePhoneCountryChange(pc: PhoneCountry) {
    setPhoneFlag(pc.flag)
    setPhoneDial(pc.dial)
    setPhonePlaceholder(pc.placeholder)
    if (!facilityCountry && COUNTRIES.includes(pc.name)) {
      handleCountryChange(pc.name)
    }
  }

  useEffect(() => {
    if (error) errorRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }, [error])

  // ── File drop handlers ─────────────────────────────────────────────────────

  function handleFileDrop(e: React.DragEvent) {
    e.preventDefault()
    setDragOver(false)
    const f = e.dataTransfer.files[0]
    if (f) setAccreditationFile(f)
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]
    if (f) setAccreditationFile(f)
  }

  // ── Submit ─────────────────────────────────────────────────────────────────

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    if (!facilityName.trim())    return setError('Enter the clinic / facility name')
    if (!facilityType)           return setError('Select a facility type')
    if (!facilityCountry)        return setError('Select a country')
    if (!facilityAddress.trim()) return setError('Enter the clinic address')
    if (!firstName.trim())       return setError('Enter your first name')
    if (!lastName.trim())        return setError('Enter your last name')
    if (!contactEmail.trim() || !contactEmail.includes('@'))
      return setError('Enter a valid email address')

    setLoading(true)

    try {
      let storageId: string | undefined
      let fileName:  string | undefined

      if (accreditationFile) {
        const uploadUrl = await generateUploadUrl()
        const uploadRes = await fetch(uploadUrl, {
          method:  'POST',
          headers: { 'Content-Type': accreditationFile.type },
          body:    accreditationFile,
        })
        if (!uploadRes.ok) throw new Error('File upload failed — please try again')
        const { storageId: sid } = await uploadRes.json() as { storageId: string }
        storageId = sid
        fileName  = accreditationFile.name
      }

      const fullPhone = phoneNum.trim() ? `${phoneDial} ${phoneNum.trim()}` : undefined

      await submitApplication({
        contactName:     `${firstName.trim()} ${lastName.trim()}`.trim(),
        contactEmail:    contactEmail.trim().toLowerCase(),
        contactPhone:    fullPhone,
        jobTitle:        jobTitle.trim()       || undefined,
        facilityName:    facilityName.trim(),
        facilityType,
        facilityAddress: facilityAddress.trim(),
        facilityCountry,
        regulatoryBody:      regulatoryBody             || undefined,
        registrationNum:     registrationNum.trim()     || undefined,
        accreditationNumber: accreditationNumber.trim() || undefined,
        pendingScannerIds:   selectedScanners.length > 0 ? selectedScanners.map(s => s._id) : undefined,
        additionalInfo:      additionalInfo.trim()      || undefined,
        mriScannerCount:     mriCount   ? Number(mriCount)   : undefined,
        staffUsingImplantId: staffCount ? Number(staffCount) : undefined,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        storageId: storageId as any,
        fileName,
      })
      setDone(true)
    } catch (err) {
      setError((err as { message?: string })?.message ?? 'Something went wrong — please try again')
    } finally {
      setLoading(false)
    }
  }

  // ── Success screen ─────────────────────────────────────────────────────────

  if (done) {
    return (
      <div className="onb">
        <SidePanel />
        <div className="onb-main">
          <div className="onb-box">
            <div style={{ textAlign:'center', padding:'20px 0 10px' }}>
              <div style={{
                width:72, height:72, borderRadius:'50%',
                background:'rgba(var(--ok-rgb),0.12)',
                color:'var(--ok)', display:'grid', placeItems:'center', margin:'0 auto 24px',
              }}>
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>
                </svg>
              </div>
              <h2 style={{ fontFamily:'var(--ff)', fontSize:24, fontWeight:600, marginBottom:10 }}>
                Application submitted
              </h2>
              <p style={{ color:'var(--muted)', fontSize:15, lineHeight:1.6, maxWidth:380, margin:'0 auto 28px' }}>
                Thank you, {firstName}. We've received your application for{' '}
                <strong>{facilityName}</strong> and will be in touch at{' '}
                <strong>{contactEmail}</strong> within 2 working days.
              </p>
              <div className="onb-note">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                  <circle cx="12" cy="12" r="10"/><path d="M12 8v4M12 16h.01"/>
                </svg>
                <span>
                  Once approved, you'll receive login credentials to access the Implant ID clinic portal,
                  where you can verify patient implant records and share MRI safety data.
                </span>
              </div>
              <a href="/" style={{
                display:'inline-block', marginTop:28,
                fontFamily:'var(--ff)', fontSize:14, color:'var(--muted)',
              }}>← Back to homepage</a>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // ── Form ───────────────────────────────────────────────────────────────────

  return (
    <div className="onb">

      <SidePanel />

      <div className="onb-main">
        <div className="onb-box">

          {/* Eyebrow */}
          <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:22 }}>
            <div style={{ width:22, height:1.5, background:'var(--accent)', flexShrink:0 }} />
            <span style={{ fontFamily:'var(--ff)', fontSize:10.5, fontWeight:700, letterSpacing:'1.6px', textTransform:'uppercase', color:'var(--accent)' }}>
              Clinic Onboarding
            </span>
          </div>

          <h2 className="onb-box h2">Apply to join the network</h2>
          <p className="sub">Complete the form below and we'll review your application within 2 working days.</p>

          {/* Error banner */}
          {error && (
            <div ref={errorRef} style={{
              background:'rgba(var(--err-rgb),0.10)',
              border:'1px solid rgba(var(--err-rgb),0.25)',
              borderRadius:10, padding:'10px 14px', fontSize:13.5, color:'var(--err)', marginBottom:24,
            }}>{error}</div>
          )}

          <form onSubmit={handleSubmit} noValidate>

            {/* ── Section 1: Clinic information ────────────────────────────── */}
            <div className="form-section">
              <h3>
                <span className="num">1</span>
                Clinic information
              </h3>
              <p className="desc">Basic details about your facility and where you're located.</p>

              <div className="form-grid">

                <div className="field field-full">
                  <label>
                    Clinic / facility name
                    <span style={{ color:'var(--err)', marginLeft:3 }}>*</span>
                  </label>
                  <input
                    className="input"
                    type="text"
                    placeholder="St Vincent's Hospital MRI Department"
                    value={facilityName}
                    onChange={e => setFacilityName(e.target.value)}
                    autoComplete="organization"
                  />
                </div>

                <div style={{ gridColumn: '1 / -1' }}>
                  <CustomSelect
                    label="Facility type"
                    required
                    value={facilityType}
                    onChange={setFacilityType}
                    options={FACILITY_TYPES}
                    placeholder="Select type"
                  />
                </div>

                <div style={{ gridColumn: '1 / -1' }}>
                  <CustomSelect
                    label="Country"
                    required
                    value={facilityCountry}
                    onChange={handleCountryChange}
                    options={COUNTRIES}
                    placeholder="Select your country"
                  />
                </div>

                <div className="field field-full">
                  <label>
                    Clinic address
                    <span style={{ color:'var(--err)', marginLeft:3 }}>*</span>
                  </label>
                  <input
                    className="input"
                    type="text"
                    placeholder="123 Hospital Road, London, W1A 1AA"
                    value={facilityAddress}
                    onChange={e => setFacilityAddress(e.target.value)}
                    autoComplete="street-address"
                  />
                </div>

              </div>
            </div>

            {/* ── Section 2: Primary contact ───────────────────────────────── */}
            <div className="form-section">
              <h3>
                <span className="num">2</span>
                Primary contact
              </h3>
              <p className="desc">Who should we contact about this application?</p>

              <div className="form-grid">

                <div className="field">
                  <label>
                    First name
                    <span style={{ color:'var(--err)', marginLeft:3 }}>*</span>
                  </label>
                  <input
                    className="input"
                    type="text"
                    placeholder="Jane"
                    value={firstName}
                    onChange={e => setFirstName(e.target.value)}
                    autoComplete="given-name"
                  />
                </div>

                <div className="field">
                  <label>
                    Last name
                    <span style={{ color:'var(--err)', marginLeft:3 }}>*</span>
                  </label>
                  <input
                    className="input"
                    type="text"
                    placeholder="Smith"
                    value={lastName}
                    onChange={e => setLastName(e.target.value)}
                    autoComplete="family-name"
                  />
                </div>

                <div className="field">
                  <label>Job title <span style={{ fontWeight:400, opacity:.6 }}>(optional)</span></label>
                  <input
                    className="input"
                    type="text"
                    placeholder="MRI Lead Radiographer"
                    value={jobTitle}
                    onChange={e => setJobTitle(e.target.value)}
                    autoComplete="organization-title"
                  />
                </div>

                <div className="field">
                  <label>
                    Work email
                    <span style={{ color:'var(--err)', marginLeft:3 }}>*</span>
                  </label>
                  <input
                    className="input"
                    type="email"
                    placeholder="jane.smith@hospital.nhs.uk"
                    value={contactEmail}
                    onChange={e => setContactEmail(e.target.value)}
                    autoComplete="email"
                  />
                </div>

                <div className="field field-full">
                  <label>Phone <span style={{ fontWeight:400, opacity:.6 }}>(optional)</span></label>
                  <PhonePicker
                    flag={phoneFlag}
                    dial={phoneDial}
                    phoneNum={phoneNum}
                    placeholder={phonePlaceholder}
                    onCountryChange={handlePhoneCountryChange}
                    onPhoneChange={setPhoneNum}
                  />
                </div>

                <div className="field">
                  <label>
                    {profRegInfo.label}
                    {' '}<span style={{ fontWeight:400, opacity:.6 }}>(optional)</span>
                  </label>
                  <input
                    className="input"
                    type="text"
                    placeholder={profRegInfo.placeholder}
                    value={accreditationNumber}
                    onChange={e => setAccreditationNumber(e.target.value)}
                    aria-label={profRegInfo.label}
                  />
                </div>

              </div>
            </div>

            {/* ── Section 3: Scanner hardware ──────────────────────────────── */}
            <div className="form-section">
              <h3>
                <span className="num">3</span>
                Scanner hardware <span style={{ fontWeight:400, fontSize:13, opacity:.6, marginLeft:4 }}>(optional)</span>
              </h3>
              <p className="desc">
                Search for the MRI scanner(s) at your site and add them individually.
                Linking your scanners helps us match patients to compatible equipment automatically.
                If your scanner isn't listed, you can suggest it for review directly from this field.
              </p>
              <ScannerPicker
                selected={selectedScanners}
                onSelect={s => setSelectedScanners(prev => [...prev, s])}
                onRemove={id => setSelectedScanners(prev => prev.filter(s => s._id !== id))}
              />

              <div className="form-grid" style={{ marginTop:16 }}>
                <div className="field">
                  <label>Number of MRI scanners <span style={{ fontWeight:400, opacity:.6 }}>(optional)</span></label>
                  <input
                    className="input"
                    type="number"
                    min="0"
                    placeholder="e.g. 3"
                    value={mriCount}
                    onChange={e => setMriCount(e.target.value)}
                  />
                </div>

                <div className="field">
                  <label>Staff who'll use Implant ID <span style={{ fontWeight:400, opacity:.6 }}>(optional)</span></label>
                  <input
                    className="input"
                    type="number"
                    min="1"
                    placeholder="e.g. 12"
                    value={staffCount}
                    onChange={e => setStaffCount(e.target.value)}
                  />
                </div>
              </div>
            </div>

            {/* ── Section 4: Accreditation (shown after country selected) ──── */}
            {facilityCountry && (
              <div className="form-section">
                <h3>
                  <span className="num">4</span>
                  Clinic accreditation
                  <span style={{
                    marginLeft:10, fontFamily:'var(--ff)', fontSize:11, fontWeight:700,
                    letterSpacing:'.8px', textTransform:'uppercase', color:'var(--ok)',
                    background:'rgba(var(--ok-rgb),0.12)', border:'1px solid rgba(var(--ok-rgb),0.22)',
                    borderRadius:5, padding:'2px 8px', verticalAlign:'middle',
                  }}>Recommended</span>
                </h3>
                <p className="desc">
                  Upload any certification or proof of accreditation for your clinic — CQC registration, ISO certificates, NHS trust documentation, or similar.
                </p>

                <div style={{
                  background:'rgba(var(--accent-rgb),0.05)', border:'1px solid rgba(var(--accent-rgb),0.15)',
                  borderRadius:10, padding:'12px 16px', marginBottom:18,
                  fontFamily:'var(--ff)', fontSize:13, color:'var(--muted)', lineHeight:1.55,
                  display:'flex', gap:10, alignItems:'flex-start',
                }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ flexShrink:0, marginTop:1, color:'var(--accent)' }} aria-hidden="true">
                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                  </svg>
                  <span>
                    We have strict verification processes to ensure only healthcare professionals get onto the app.
                    The more information you can provide to allow us to verify you, the better.
                  </span>
                </div>

                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png"
                  onChange={handleFileChange}
                  style={{ display:'none' }}
                  aria-label="Upload clinic accreditation document"
                />

                <div
                  className="dropzone"
                  role="button"
                  tabIndex={0}
                  aria-label="Upload clinic accreditation document — click or drag and drop"
                  onClick={() => fileInputRef.current?.click()}
                  onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') fileInputRef.current?.click() }}
                  onDragOver={e => { e.preventDefault(); setDragOver(true) }}
                  onDragLeave={() => setDragOver(false)}
                  onDrop={handleFileDrop}
                  style={dragOver ? { borderColor:'var(--accent)', background:'rgba(var(--accent-rgb),0.06)' } : {}}
                >
                  {accreditationFile ? (
                    <>
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/>
                      </svg>
                      <p style={{ color:'var(--accent-deep)', fontWeight:500 }}>{accreditationFile.name}</p>
                      <p className="hint">Click to change file</p>
                    </>
                  ) : (
                    <>
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>
                      </svg>
                      <p>Click to upload or drag and drop</p>
                      <p className="hint">PDF, JPG or PNG — max 10 MB</p>
                    </>
                  )}
                </div>
              </div>
            )}

            {/* ── Section 5: Regulatory body (shown after country selected) ── */}
            {facilityCountry && (
              <div className="form-section">
                <h3>
                  <span className="num">5</span>
                  Regulatory body <span style={{ fontWeight:400, fontSize:13, opacity:.6, marginLeft:4 }}>(optional)</span>
                </h3>
                <p className="desc">Your facility's regulatory or accreditation body and registration number.</p>

                <div style={{ display:'flex', flexDirection:'column', gap:14 }}>

                  <CustomSelect
                    label="Regulatory / accreditation body"
                    value={regulatoryBody}
                    onChange={setRegulatoryBody}
                    options={availableRegulatoryBodies}
                    placeholder="Select body"
                  />

                  <div className="field">
                    <label>
                      Registration / licence number
                      <span style={{ fontWeight:400, opacity:.6, marginLeft:4 }}>(optional)</span>
                    </label>
                    <input
                      className="input"
                      type="text"
                      placeholder="e.g. CQC-12345"
                      value={registrationNum}
                      onChange={e => setRegistrationNum(e.target.value)}
                    />
                  </div>

                </div>
              </div>
            )}

            {/* ── Section 6: Additional information ───────────────────────── */}
            <div className="form-section">
              <h3>
                <span className="num">6</span>
                Additional information <span style={{ fontWeight:400, fontSize:13, opacity:.6, marginLeft:4 }}>(optional)</span>
              </h3>
              <p className="desc">Anything else we should know about your facility or the services you offer?</p>

              <textarea
                className="input"
                rows={4}
                placeholder="e.g. specialist implant types managed, any existing workflows or systems we should know about…"
                value={additionalInfo}
                onChange={e => setAdditionalInfo(e.target.value)}
                style={{ resize:'vertical', minHeight:100 }}
              />
            </div>

            {/* ── Trust note ──────────────────────────────────────────────── */}
            <div className="onb-note">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
              </svg>
              <span>
                By submitting this application you confirm that the information provided is accurate
                and that you have authority to register this facility on the Implant ID platform.
                We'll verify your details before granting access to any patient records.
              </span>
            </div>

            {/* ── Actions ─────────────────────────────────────────────────── */}
            <div className="form-actions" style={{ marginTop:24 }}>
              <a href="/" className="btn">← Back to site</a>
              <button
                type="submit"
                className="btn btn-s"
                disabled={loading}
                style={{ flex:1, justifyContent:'center' }}
              >
                {loading ? 'Submitting…' : 'Submit application →'}
              </button>
            </div>

          </form>
        </div>
      </div>
    </div>
  )
}
