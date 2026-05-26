'use client'
import { useState }      from 'react'
import { useMutation }   from 'convex/react'
import { api }           from '../../../../convex/_generated/api'
import { CustomSelect }  from '@/components/ui/CustomSelect'

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

const SERVICES = [
  'MRI services',
  'Pacemaker / ICD clinics',
  'Cochlear implant programme',
  'Deep brain stimulation programme',
  'Orthopaedic implant surgery',
  'Spinal cord stimulation',
  'Cardiothoracic surgery',
  'General surgery',
  'Neurosurgery',
  'Radiology / imaging',
]

type Step = 1 | 2 | 3 | 4

const STEP_META = [
  { id: 1, label: 'Contact',  desc: 'Your details'         },
  { id: 2, label: 'Facility', desc: 'Clinic information'   },
  { id: 3, label: 'Services', desc: 'What you offer'       },
  { id: 4, label: 'Review',   desc: 'Confirm & submit'     },
]

// ── Summary row ───────────────────────────────────────────────────────────────

function SumRow({ label, value }: { label: string; value?: string }) {
  return (
    <div style={{ display:'flex', justifyContent:'space-between', gap:12, padding:'8px 0', borderBottom:'1px solid var(--border)' }}>
      <span style={{ fontSize:13, color:'var(--muted)', flexShrink:0 }}>{label}</span>
      <span style={{ fontSize:13.5, fontWeight:500, textAlign:'right' }}>
        {value || <span style={{ color:'var(--muted2)', fontWeight:400 }}>Not provided</span>}
      </span>
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

export default function ClinicOnboardingClient() {
  const submitApplication = useMutation(api.clinics.submitClinicApplication)

  // Step 1 — contact
  const [contactName,  setContactName]  = useState('')
  const [contactEmail, setContactEmail] = useState('')
  const [contactPhone, setContactPhone] = useState('')
  const [jobTitle,     setJobTitle]     = useState('')

  // Step 2 — facility
  const [facilityName,    setFacilityName]    = useState('')
  const [facilityType,    setFacilityType]    = useState('')
  const [facilityAddress, setFacilityAddress] = useState('')
  const [facilityCity,    setFacilityCity]    = useState('')
  const [facilityCountry, setFacilityCountry] = useState('')
  const [facilityWebsite, setFacilityWebsite] = useState('')
  const [facilityPhone,   setFacilityPhone]   = useState('')
  const [regulatoryBody,  setRegulatoryBody]  = useState('')
  const [registrationNum, setRegistrationNum] = useState('')

  // Step 3 — services
  const [selectedServices, setSelectedServices] = useState<Set<string>>(new Set())
  const [additionalInfo,   setAdditionalInfo]   = useState('')

  // UI
  const [step,    setStep]    = useState<Step>(1)
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState('')
  const [done,    setDone]    = useState(false)

  function err(msg: string) { setError(msg); setLoading(false) }
  function clearErr()        { setError('') }

  function toggleService(s: string) {
    setSelectedServices(prev => {
      const next = new Set(prev)
      next.has(s) ? next.delete(s) : next.add(s)
      return next
    })
  }

  // ── Step navigation ────────────────────────────────────────────────────────

  function goStep2(e: React.FormEvent) {
    e.preventDefault(); clearErr()
    if (!contactName.trim())  return err('Enter your full name')
    if (!contactEmail.trim() || !contactEmail.includes('@')) return err('Enter a valid email address')
    setStep(2)
  }

  function goStep3(e: React.FormEvent) {
    e.preventDefault(); clearErr()
    if (!facilityName.trim())    return err('Enter the facility name')
    if (!facilityType)           return err('Select the facility type')
    if (!facilityAddress.trim()) return err('Enter the facility address')
    if (!facilityCity.trim())    return err('Enter the city')
    if (!facilityCountry)        return err('Select the country')
    setStep(3)
  }

  function goStep4(e: React.FormEvent) {
    e.preventDefault(); clearErr()
    if (selectedServices.size === 0) return err('Select at least one service your facility offers')
    setStep(4)
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault(); clearErr(); setLoading(true)
    try {
      await submitApplication({
        contactName:     contactName.trim(),
        contactEmail:    contactEmail.trim().toLowerCase(),
        contactPhone:    contactPhone.trim()  || undefined,
        jobTitle:        jobTitle.trim()      || undefined,
        facilityName:    facilityName.trim(),
        facilityType,
        facilityAddress: facilityAddress.trim(),
        facilityCity:    facilityCity.trim(),
        facilityCountry,
        facilityWebsite: facilityWebsite.trim() || undefined,
        facilityPhone:   facilityPhone.trim()   || undefined,
        regulatoryBody:  regulatoryBody || undefined,
        registrationNum: registrationNum.trim() || undefined,
        services:        Array.from(selectedServices),
        additionalInfo:  additionalInfo.trim() || undefined,
      })
      setDone(true)
    } catch (e) {
      err((e as { message?: string })?.message ?? 'Something went wrong — please try again')
    } finally {
      setLoading(false)
    }
  }

  const stepIdx = step - 1

  // ── Success screen ─────────────────────────────────────────────────────────

  if (done) {
    return (
      <div className="onb">
        <div className="onb-side">
          <a href="/" className="logo" style={{ display:'flex', alignItems:'center', gap:10, textDecoration:'none' }}>
            <img src="/icon.svg" alt="" style={{ height:34 }} />
            <span className="logo-text" style={{ fontFamily:'var(--ff)', fontWeight:700, fontSize:18 }}>
              <b>Implant</b><span>ID</span>
            </span>
          </a>
          <h1 style={{ marginTop:40 }}>Register your clinic.</h1>
          <p>We verify every clinic before granting access to patient records. This keeps the platform secure and trustworthy for everyone.</p>
          <div className="trust" style={{ marginTop:'auto' }}>
            <span>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
              HIPAA-grade
            </span>
            <span>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><circle cx="12" cy="12" r="10"/><path d="m9 12 2 2 4-4"/></svg>
              SOC 2
            </span>
            <span>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><rect x="5" y="2" width="14" height="20" rx="2"/><path d="M12 18h.01"/></svg>
              GDPR
            </span>
          </div>
        </div>
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
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><circle cx="12" cy="12" r="10"/><path d="M12 8v4M12 16h.01"/></svg>
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

      {/* ── Left panel ───────────────────────────────────────────────────── */}
      <div className="onb-side">
        <a href="/" className="logo" style={{ display:'flex', alignItems:'center', gap:10, textDecoration:'none' }}>
          <img src="/icon.svg" alt="" style={{ height:34 }} />
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
              { n: 1, label: 'Clinic details',     desc: 'Name, address, facility type, contact info' },
              { n: 2, label: 'Accreditation',       desc: 'Upload your registration certificate or proof of accreditation' },
              { n: 3, label: 'Verification call',   desc: 'Quick 10-minute call to verify your clinic and walk you through the platform' },
              { n: 4, label: 'You\'re live',        desc: 'Full access to the Implant ID platform for your team' },
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

      {/* ── Right panel ──────────────────────────────────────────────────── */}
      <div className="onb-main">
        <div className="onb-box">

          {/* Eyebrow */}
          <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:22 }}>
            <div style={{ width:22, height:1.5, background:'var(--accent)', flexShrink:0 }} />
            <span style={{ fontFamily:'var(--ff)', fontSize:10.5, fontWeight:700, letterSpacing:'1.6px', textTransform:'uppercase', color:'var(--accent)' }}>
              Clinic Onboarding
            </span>
          </div>

          {/* Progress dots */}
          <div style={{ display:'flex', gap:6, marginBottom:14 }}>
            {STEP_META.map((s, i) => (
              <div key={s.id} style={{
                height:6, borderRadius:3, transition:'all .2s',
                width: i === stepIdx ? 22 : 6,
                background: i === stepIdx ? 'var(--accent)' : i < stepIdx ? 'var(--ok)' : 'var(--border)',
              }} />
            ))}
          </div>

          <div style={{ fontFamily:'var(--ff)', fontSize:11, fontWeight:600, letterSpacing:'1px', textTransform:'uppercase', color:'var(--muted2)', marginBottom:14 }}>
            Step {step} of {STEP_META.length} — {STEP_META[stepIdx].label}
          </div>

          {error && (
            <div style={{
              background:'color-mix(in srgb,var(--err) 10%,transparent)',
              border:'1px solid color-mix(in srgb,var(--err) 25%,transparent)',
              borderRadius:10, padding:'10px 14px', fontSize:13.5, color:'var(--err)', marginBottom:20,
            }}>{error}</div>
          )}

          {/* ── Step 1: Contact ──────────────────────────────────────────── */}
          {step === 1 && (
            <>
              <h2 className="onb-box h2" style={{ fontFamily:'var(--ff)', fontSize:26, fontWeight:600, letterSpacing:'-.02em', marginBottom:6 }}>Your contact details</h2>
              <p className="sub">Tell us who we should speak to about your application.</p>

              <form onSubmit={goStep2}>
                <div className="form-section">
                  <div className="form-grid">
                    <div className="field field-full">
                      <label>Full name<span style={{ color:'var(--err)',marginLeft:3 }}>*</span></label>
                      <input className="input" type="text" placeholder="Dr Jane Smith"
                        value={contactName} onChange={e => setContactName(e.target.value)} autoComplete="name" />
                    </div>
                    <div className="field field-full">
                      <label>Work email<span style={{ color:'var(--err)',marginLeft:3 }}>*</span></label>
                      <input className="input" type="email" placeholder="jane.smith@hospital.nhs.uk"
                        value={contactEmail} onChange={e => setContactEmail(e.target.value)} autoComplete="email" />
                    </div>
                    <div className="field">
                      <label>Phone <span style={{ fontWeight:400,opacity:.6 }}>(optional)</span></label>
                      <input className="input" type="tel" placeholder="+44 20 7000 0000"
                        value={contactPhone} onChange={e => setContactPhone(e.target.value)} autoComplete="tel" />
                    </div>
                    <div className="field">
                      <label>Job title <span style={{ fontWeight:400,opacity:.6 }}>(optional)</span></label>
                      <input className="input" type="text" placeholder="MRI Lead Radiographer"
                        value={jobTitle} onChange={e => setJobTitle(e.target.value)} />
                    </div>
                  </div>
                </div>

                <div className="form-actions">
                  <button type="submit" className="btn btn-s btn-lg" style={{ flex:1, justifyContent:'center' }}>
                    Continue →
                  </button>
                </div>
              </form>
            </>
          )}

          {/* ── Step 2: Facility ─────────────────────────────────────────── */}
          {step === 2 && (
            <>
              <h2 style={{ fontFamily:'var(--ff)', fontSize:26, fontWeight:600, letterSpacing:'-.02em', marginBottom:6 }}>Your facility</h2>
              <p className="sub">Tell us about the clinic or hospital you're registering.</p>

              <form onSubmit={goStep3}>
                <div className="form-section">
                  <div className="form-grid">
                    <div className="field field-full">
                      <label>Facility name<span style={{ color:'var(--err)',marginLeft:3 }}>*</span></label>
                      <input className="input" type="text" placeholder="St Vincent's Hospital MRI Department"
                        value={facilityName} onChange={e => setFacilityName(e.target.value)} />
                    </div>
                  </div>
                  <div style={{ marginTop:14 }}>
                    <CustomSelect
                      label="Facility type" required
                      value={facilityType} onChange={setFacilityType}
                      options={FACILITY_TYPES}
                      placeholder="Select type"
                    />
                  </div>
                  <div className="form-grid" style={{ marginTop:14 }}>
                    <div className="field field-full">
                      <label>Street address<span style={{ color:'var(--err)',marginLeft:3 }}>*</span></label>
                      <input className="input" type="text" placeholder="123 Hospital Road"
                        value={facilityAddress} onChange={e => setFacilityAddress(e.target.value)} autoComplete="street-address" />
                    </div>
                    <div className="field">
                      <label>City<span style={{ color:'var(--err)',marginLeft:3 }}>*</span></label>
                      <input className="input" type="text" placeholder="London"
                        value={facilityCity} onChange={e => setFacilityCity(e.target.value)} autoComplete="address-level2" />
                    </div>
                    <div className="field">
                      <label>Country<span style={{ color:'var(--err)',marginLeft:3 }}>*</span></label>
                      <CustomSelect
                        value={facilityCountry} onChange={setFacilityCountry}
                        options={COUNTRIES}
                        placeholder="Select country"
                      />
                    </div>
                    <div className="field">
                      <label>Facility phone <span style={{ fontWeight:400,opacity:.6 }}>(optional)</span></label>
                      <input className="input" type="tel" placeholder="+44 20 7000 0000"
                        value={facilityPhone} onChange={e => setFacilityPhone(e.target.value)} />
                    </div>
                    <div className="field">
                      <label>Website <span style={{ fontWeight:400,opacity:.6 }}>(optional)</span></label>
                      <input className="input" type="url" placeholder="https://www.hospital.nhs.uk"
                        value={facilityWebsite} onChange={e => setFacilityWebsite(e.target.value)} />
                    </div>
                  </div>
                </div>

                <div className="form-section">
                  <h3 style={{ fontFamily:'var(--ff)', fontSize:15, fontWeight:500, marginBottom:14 }}>
                    Regulatory information <span style={{ fontWeight:400, fontSize:13, opacity:.6 }}>(optional)</span>
                  </h3>
                  <div style={{ marginBottom:14 }}>
                    <CustomSelect
                      label="Regulatory / accreditation body"
                      value={regulatoryBody} onChange={setRegulatoryBody}
                      options={REGULATORY_BODIES}
                      placeholder="Select body"
                    />
                  </div>
                  <div className="field">
                    <label>Registration / accreditation number <span style={{ fontWeight:400,opacity:.6 }}>(optional)</span></label>
                    <input className="input" type="text" placeholder="e.g. CQC-12345"
                      value={registrationNum} onChange={e => setRegistrationNum(e.target.value)} />
                  </div>
                </div>

                <div className="form-actions">
                  <button type="button" className="btn btn-lg" onClick={() => { setStep(1); clearErr() }}>← Back</button>
                  <button type="submit" className="btn btn-s btn-lg" style={{ flex:1, justifyContent:'center' }}>Continue →</button>
                </div>
              </form>
            </>
          )}

          {/* ── Step 3: Services ─────────────────────────────────────────── */}
          {step === 3 && (
            <>
              <h2 style={{ fontFamily:'var(--ff)', fontSize:26, fontWeight:600, letterSpacing:'-.02em', marginBottom:6 }}>Services you offer</h2>
              <p className="sub">Select all that apply — this helps us match patients to the right facilities.</p>

              <form onSubmit={goStep4}>
                <div className="form-section">
                  <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
                    {SERVICES.map(s => {
                      const checked = selectedServices.has(s)
                      return (
                        <button
                          key={s}
                          type="button"
                          onClick={() => toggleService(s)}
                          style={{
                            display:'flex', alignItems:'center', gap:10,
                            padding:'11px 14px', borderRadius:10,
                            border:`1.5px solid ${checked ? 'var(--accent)' : 'var(--border)'}`,
                            background: checked
                              ? 'color-mix(in srgb,var(--accent) 8%,transparent)'
                              : 'var(--bg2)',
                            fontFamily:'var(--ff)', fontSize:13, color: checked ? 'var(--accent-deep)' : 'var(--text)',
                            cursor:'pointer', textAlign:'left', transition:'all .15s',
                          }}
                        >
                          <div style={{
                            width:18, height:18, borderRadius:5, flexShrink:0,
                            border:`1.5px solid ${checked ? 'var(--accent)' : 'var(--border)'}`,
                            background: checked ? 'var(--accent)' : 'transparent',
                            display:'grid', placeItems:'center', transition:'all .15s',
                          }}>
                            {checked && (
                              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" aria-hidden="true">
                                <path d="M20 6 9 17l-5-5"/>
                              </svg>
                            )}
                          </div>
                          {s}
                        </button>
                      )
                    })}
                  </div>

                  <div className="field" style={{ marginTop:20 }}>
                    <label>Additional information <span style={{ fontWeight:400,opacity:.6 }}>(optional)</span></label>
                    <textarea className="input" rows={3}
                      placeholder="Any other details about your facility or specialist services…"
                      value={additionalInfo} onChange={e => setAdditionalInfo(e.target.value)} />
                  </div>
                </div>

                <div className="form-actions">
                  <button type="button" className="btn btn-lg" onClick={() => { setStep(2); clearErr() }}>← Back</button>
                  <button type="submit" className="btn btn-s btn-lg" style={{ flex:1, justifyContent:'center' }}>Continue →</button>
                </div>
              </form>
            </>
          )}

          {/* ── Step 4: Review ───────────────────────────────────────────── */}
          {step === 4 && (
            <>
              <h2 style={{ fontFamily:'var(--ff)', fontSize:26, fontWeight:600, letterSpacing:'-.02em', marginBottom:6 }}>Review your application</h2>
              <p className="sub">Check your details before submitting. We'll be in touch within 2 working days.</p>

              <form onSubmit={submit}>

                <div style={{ marginBottom:20 }}>
                  <div style={{ display:'flex', justifyContent:'space-between', marginBottom:6 }}>
                    <span style={{ fontFamily:'var(--ff)', fontSize:11, fontWeight:600, letterSpacing:'1.2px', textTransform:'uppercase', color:'var(--muted2)' }}>Contact</span>
                    <button type="button" onClick={() => { setStep(1); clearErr() }} style={{ fontFamily:'var(--ff)', fontSize:12, color:'var(--accent)', background:'none', border:'none', cursor:'pointer', padding:0 }}>Edit</button>
                  </div>
                  <SumRow label="Name"     value={contactName} />
                  <SumRow label="Email"    value={contactEmail} />
                  <SumRow label="Phone"    value={contactPhone || undefined} />
                  <SumRow label="Job title" value={jobTitle || undefined} />
                </div>

                <div style={{ marginBottom:20 }}>
                  <div style={{ display:'flex', justifyContent:'space-between', marginBottom:6 }}>
                    <span style={{ fontFamily:'var(--ff)', fontSize:11, fontWeight:600, letterSpacing:'1.2px', textTransform:'uppercase', color:'var(--muted2)' }}>Facility</span>
                    <button type="button" onClick={() => { setStep(2); clearErr() }} style={{ fontFamily:'var(--ff)', fontSize:12, color:'var(--accent)', background:'none', border:'none', cursor:'pointer', padding:0 }}>Edit</button>
                  </div>
                  <SumRow label="Name"       value={facilityName} />
                  <SumRow label="Type"       value={facilityType} />
                  <SumRow label="Address"    value={`${facilityAddress}, ${facilityCity}`} />
                  <SumRow label="Country"    value={facilityCountry} />
                  <SumRow label="Regulatory" value={regulatoryBody || undefined} />
                </div>

                <div style={{ marginBottom:24 }}>
                  <div style={{ display:'flex', justifyContent:'space-between', marginBottom:6 }}>
                    <span style={{ fontFamily:'var(--ff)', fontSize:11, fontWeight:600, letterSpacing:'1.2px', textTransform:'uppercase', color:'var(--muted2)' }}>Services</span>
                    <button type="button" onClick={() => { setStep(3); clearErr() }} style={{ fontFamily:'var(--ff)', fontSize:12, color:'var(--accent)', background:'none', border:'none', cursor:'pointer', padding:0 }}>Edit</button>
                  </div>
                  <SumRow label="Selected" value={Array.from(selectedServices).join(', ')} />
                </div>

                <div className="onb-note">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><circle cx="12" cy="12" r="10"/><path d="M12 8v4M12 16h.01"/></svg>
                  <span>
                    By submitting this application you confirm that the information provided is accurate
                    and that you have authority to register this facility. We'll verify your details
                    before granting access.
                  </span>
                </div>

                <div className="form-actions" style={{ marginTop:20 }}>
                  <button type="button" className="btn btn-lg" onClick={() => { setStep(3); clearErr() }}>← Back</button>
                  <button type="submit" className="btn btn-s btn-lg" style={{ flex:1, justifyContent:'center' }} disabled={loading}>
                    {loading ? 'Submitting…' : 'Submit application →'}
                  </button>
                </div>
              </form>
            </>
          )}

        </div>
      </div>
    </div>
  )
}
