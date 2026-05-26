'use client'
import { useState, useRef } from 'react'
import { useMutation }      from 'convex/react'
import { api }              from '../../../../convex/_generated/api'
import { CustomSelect }     from '@/components/ui/CustomSelect'

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

const REGULATORY_BODIES = [
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

// ── Left panel shared ─────────────────────────────────────────────────────────

function SidePanel() {
  return (
    <div className="onb-side">
      <a href="/" className="logo" style={{ display:'flex', alignItems:'center', gap:10, textDecoration:'none' }}>
        <img src="/icon.svg" alt="" style={{ height:44 }} />
        <span className="logo-text" style={{ fontFamily:'var(--ff)', fontWeight:700, fontSize:18 }}>
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
            { n: 1, label: 'Clinic details',    desc: 'Name, address, facility type, contact info' },
            { n: 2, label: 'Accreditation',     desc: 'Upload your registration certificate or proof of accreditation' },
            { n: 3, label: 'Verification call', desc: 'Quick 10-minute call to verify your clinic and walk you through the platform' },
            { n: 4, label: "You're live",       desc: 'Full access to the Implant ID platform for your team' },
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

// ── Main component ────────────────────────────────────────────────────────────

export default function ClinicOnboardingClient() {
  const submitApplication = useMutation(api.clinics.submitClinicApplication)

  // Section 1 — Clinic information
  const [facilityName,    setFacilityName]    = useState('')
  const [facilityType,    setFacilityType]    = useState('')
  const [facilityCountry, setFacilityCountry] = useState('')
  const [facilityAddress, setFacilityAddress] = useState('')
  const [mriCount,        setMriCount]        = useState('')
  const [staffCount,      setStaffCount]      = useState('')

  // Section 2 — Primary contact
  const [contactName,  setContactName]  = useState('')
  const [jobTitle,     setJobTitle]     = useState('')
  const [contactEmail, setContactEmail] = useState('')
  const [contactPhone, setContactPhone] = useState('')

  // Section 3 — Accreditation (UI only — no upload backend yet)
  const [accreditationFile, setAccreditationFile] = useState<File | null>(null)
  const [dragOver,          setDragOver]          = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Section 4 — Regulatory body (optional)
  const [regulatoryBody,  setRegulatoryBody]  = useState('')
  const [registrationNum, setRegistrationNum] = useState('')

  // Section 5 — Additional information
  const [additionalInfo, setAdditionalInfo] = useState('')

  // UI
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState('')
  const [done,    setDone]    = useState(false)

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
    if (!contactName.trim())     return setError('Enter the primary contact name')
    if (!contactEmail.trim() || !contactEmail.includes('@'))
      return setError('Enter a valid email address')

    setLoading(true)

    // Combine MRI / staff counts into additionalInfo
    const parts: string[] = []
    if (mriCount)               parts.push(`MRI scanners: ${mriCount}`)
    if (staffCount)             parts.push(`Staff using Implant ID: ${staffCount}`)
    if (additionalInfo.trim())  parts.push(additionalInfo.trim())
    const combinedInfo = parts.length ? parts.join('\n') : undefined

    try {
      await submitApplication({
        contactName:     contactName.trim(),
        contactEmail:    contactEmail.trim().toLowerCase(),
        contactPhone:    contactPhone.trim()    || undefined,
        jobTitle:        jobTitle.trim()        || undefined,
        facilityName:    facilityName.trim(),
        facilityType,
        facilityAddress: facilityAddress.trim(),
        facilityCountry,
        regulatoryBody:  regulatoryBody         || undefined,
        registrationNum: registrationNum.trim() || undefined,
        services:        [],
        additionalInfo:  combinedInfo,
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
                background:'color-mix(in srgb,var(--ok) 12%,transparent)',
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
                Thank you, {contactName.split(' ')[0]}. We've received your application for{' '}
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

      {/* ── Left panel (sticky) ───────────────────────────────────────────── */}
      <SidePanel />

      {/* ── Right panel (scrolls with page) ──────────────────────────────── */}
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
            <div style={{
              background:'color-mix(in srgb,var(--err) 10%,transparent)',
              border:'1px solid color-mix(in srgb,var(--err) 25%,transparent)',
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

                <CustomSelect
                  label="Facility type"
                  required
                  value={facilityType}
                  onChange={setFacilityType}
                  options={FACILITY_TYPES}
                  placeholder="Select type"
                />

                <CustomSelect
                  label="Country"
                  required
                  value={facilityCountry}
                  onChange={setFacilityCountry}
                  options={COUNTRIES}
                  placeholder="Select country"
                />

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
                    Full name
                    <span style={{ color:'var(--err)', marginLeft:3 }}>*</span>
                  </label>
                  <input
                    className="input"
                    type="text"
                    placeholder="Dr Jane Smith"
                    value={contactName}
                    onChange={e => setContactName(e.target.value)}
                    autoComplete="name"
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

                <div className="field">
                  <label>Phone <span style={{ fontWeight:400, opacity:.6 }}>(optional)</span></label>
                  <input
                    className="input"
                    type="tel"
                    placeholder="+44 20 7000 0000"
                    value={contactPhone}
                    onChange={e => setContactPhone(e.target.value)}
                    autoComplete="tel"
                  />
                </div>

              </div>
            </div>

            {/* ── Section 3: Accreditation ─────────────────────────────────── */}
            <div className="form-section">
              <h3>
                <span className="num">3</span>
                Accreditation
              </h3>
              <p className="desc">
                Upload your registration certificate or proof of accreditation.
                <span style={{ fontWeight:400, opacity:.7 }}> (optional — you can provide this after approval)</span>
              </p>

              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.jpg,.jpeg,.png"
                onChange={handleFileChange}
                style={{ display:'none' }}
                aria-label="Upload accreditation document"
              />

              <div
                className="dropzone"
                role="button"
                tabIndex={0}
                aria-label="Upload accreditation document — click or drag and drop"
                onClick={() => fileInputRef.current?.click()}
                onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') fileInputRef.current?.click() }}
                onDragOver={e => { e.preventDefault(); setDragOver(true) }}
                onDragLeave={() => setDragOver(false)}
                onDrop={handleFileDrop}
                style={dragOver ? { borderColor:'var(--accent)', background:'color-mix(in srgb,var(--accent) 6%,transparent)' } : {}}
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

            {/* ── Section 4: Regulatory body ───────────────────────────────── */}
            <div className="form-section">
              <h3>
                <span className="num">4</span>
                Regulatory body <span style={{ fontWeight:400, fontSize:13, opacity:.6, marginLeft:4 }}>(optional)</span>
              </h3>
              <p className="desc">If your facility is registered with a regulatory or accreditation body, let us know.</p>

              <div className="form-grid">

                <CustomSelect
                  label="Regulatory / accreditation body"
                  value={regulatoryBody}
                  onChange={setRegulatoryBody}
                  options={REGULATORY_BODIES}
                  placeholder="Select body"
                />

                <div className="field">
                  <label>Registration / licence number <span style={{ fontWeight:400, opacity:.6 }}>(optional)</span></label>
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

            {/* ── Section 5: Additional information ───────────────────────── */}
            <div className="form-section">
              <h3>
                <span className="num">5</span>
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
