'use client'
import { useState } from 'react'
import { useMutation } from 'convex/react'
import { api } from '../../../../convex/_generated/api'

// ── Constants ─────────────────────────────────────────────────────────────────

const COUNTRIES = [
  'United Kingdom', 'United States', 'Australia', 'Canada', 'Ireland',
  'New Zealand', 'Germany', 'France', 'Spain', 'Italy', 'Netherlands',
  'Belgium', 'Sweden', 'Norway', 'Denmark', 'Finland', 'Switzerland',
  'Austria', 'Poland', 'Czech Republic', 'Portugal', 'Greece',
  'Japan', 'South Korea', 'China', 'India', 'Brazil', 'Mexico',
  'South Africa', 'Singapore', 'Israel', 'Other',
]

const DEVICE_CATEGORIES = [
  'Active implants',
  'Passive implants',
  'Cardiovascular implants',
  'Orthopaedic implants',
  'Neurostimulators',
  'Cochlear / auditory implants',
  'Spinal implants',
  'Dental implants',
  'Other',
]

const GEOGRAPHIC_MARKETS = [
  'United Kingdom',
  'European Union / EEA',
  'United States',
  'Australia',
  'Canada',
  'Rest of World',
]

const STEPS = [
  { n: 1, label: 'Company details',         desc: 'Legal entity, registration and website' },
  { n: 2, label: 'Regulatory & products',   desc: 'ISO 13485, certifications and device categories' },
  { n: 3, label: 'Contact person',          desc: 'Authorised contact for this application' },
  { n: 4, label: 'Declaration & submit',    desc: 'Review your application and confirm' },
]

// ── Left panel ─────────────────────────────────────────────────────────────────

function SidePanel({ step }: { step: number }) {
  return (
    <div className="onb-side">
      <a href="/" className="logo" style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none' }}>
        <img src="/icon.svg" alt="" style={{ height: 56 }} />
        <span className="logo-text" style={{ fontFamily: 'var(--ff)', fontWeight: 700, fontSize: 22 }}>
          <b>Implant</b><span>ID</span>
        </span>
      </a>

      <h1>Register your manufacturing company.</h1>
      <p>
        Every manufacturer on Implant ID is verified before gaining access to the
        platform. This process ensures MRI safety data can be trusted by clinicians
        and their patients.
      </p>

      <div className="steps">
        <div className="onb-side-steps">
          {STEPS.map(s => (
            <div
              key={s.n}
              className={`onb-step ${s.n < step ? 'done' : s.n === step ? 'active' : 'future'}`}
            >
              <div className="num">
                {s.n < step ? (
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" aria-hidden="true">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                ) : s.n}
              </div>
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
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /></svg>
          HIPAA-grade
        </span>
        <span>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><circle cx="12" cy="12" r="10" /><path d="m9 12 2 2 4-4" /></svg>
          SOC 2
        </span>
        <span>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><rect x="5" y="2" width="14" height="20" rx="2" /><path d="M12 18h.01" /></svg>
          GDPR
        </span>
      </div>
    </div>
  )
}

// ── Step progress bar ─────────────────────────────────────────────────────────

function StepBar({ step }: { step: number }) {
  return (
    <div className="step-progress" role="list" aria-label="Application progress">
      {STEPS.map(s => (
        <div
          key={s.n}
          role="listitem"
          className={`step-progress-item ${s.n < step ? 'done' : s.n === step ? 'active' : ''}`}
          aria-current={s.n === step ? 'step' : undefined}
        >
          <span className="sp-num">{s.n < step ? '✓' : s.n}</span>
          {s.label}
        </div>
      ))}
    </div>
  )
}

// ── Error banner ──────────────────────────────────────────────────────────────

function ErrorBanner({ message }: { message: string }) {
  if (!message) return null
  return (
    <div style={{
      background: 'color-mix(in srgb,var(--err) 10%,transparent)',
      border: '1px solid color-mix(in srgb,var(--err) 25%,transparent)',
      borderRadius: 10, padding: '10px 14px', fontSize: 13.5,
      color: 'var(--err)', marginBottom: 24,
    }}>
      {message}
    </div>
  )
}

// ── Main component ─────────────────────────────────────────────────────────────

export default function ManufacturerOnboardingClient() {
  // ── All hooks unconditionally at the top ──────────────────────────────────
  const submitApplication = useMutation(api.manufacturers.submitManufacturerApplication)

  // Step
  const [step, setStep] = useState(1)

  // Step 1 — Company details
  const [legalEntityName,  setLegalEntityName]  = useState('')
  const [companyName,      setCompanyName]      = useState('')
  const [regNumber,        setRegNumber]        = useState('')
  const [country,          setCountry]          = useState('')
  const [website,          setWebsite]          = useState('')

  // Step 2 — Regulatory & products
  const [iso13485CertNumber,  setIso13485CertNumber]  = useState('')
  const [iso13485IssuingBody, setIso13485IssuingBody] = useState('')
  const [iso13485ExpiryDate,  setIso13485ExpiryDate]  = useState('')
  const [regulatoryRegistrations, setRegulatoryRegistrations] = useState('')
  const [deviceCategories, setDeviceCategories] = useState<string[]>([])
  const [geographicMarkets, setGeographicMarkets] = useState<string[]>([])

  // Step 3 — Contact person
  const [contactFirstName, setContactFirstName] = useState('')
  const [contactLastName,  setContactLastName]  = useState('')
  const [contactJobTitle,  setContactJobTitle]  = useState('')
  const [contactEmail,     setContactEmail]     = useState('')
  const [contactPhone,     setContactPhone]     = useState('')

  // Step 4 — Declaration
  const [decl1, setDecl1] = useState(false)
  const [decl2, setDecl2] = useState(false)
  const [decl3, setDecl3] = useState(false)
  const [decl4, setDecl4] = useState(false)

  // UI state
  const [error,   setError]   = useState('')
  const [loading, setLoading] = useState(false)
  const [done,    setDone]    = useState(false)

  // ── Helpers ────────────────────────────────────────────────────────────────

  function toggleCategory(cat: string) {
    setDeviceCategories(prev =>
      prev.includes(cat) ? prev.filter(c => c !== cat) : [...prev, cat]
    )
  }

  function toggleMarket(market: string) {
    setGeographicMarkets(prev =>
      prev.includes(market) ? prev.filter(m => m !== market) : [...prev, market]
    )
  }

  // ── Step validation ────────────────────────────────────────────────────────

  function validateStep1(): string {
    if (!legalEntityName.trim()) return 'Enter the legal entity name'
    if (!regNumber.trim())       return 'Enter the company registration number'
    if (!country)                return 'Select a country of incorporation'
    if (!website.trim())         return 'Enter the company website URL'
    return ''
  }

  function validateStep2(): string {
    if (!iso13485CertNumber.trim())  return 'Enter the ISO 13485 certificate number'
    if (!iso13485IssuingBody.trim()) return 'Enter the ISO 13485 issuing body'
    if (!iso13485ExpiryDate)         return 'Enter the ISO 13485 expiry date'
    if (deviceCategories.length === 0) return 'Select at least one device category'
    if (geographicMarkets.length === 0) return 'Select at least one geographic market'
    return ''
  }

  function validateStep3(): string {
    if (!contactFirstName.trim()) return 'Enter the contact first name'
    if (!contactLastName.trim())  return 'Enter the contact last name'
    if (!contactJobTitle.trim())  return 'Enter the contact job title'
    if (!contactEmail.trim() || !contactEmail.includes('@')) return 'Enter a valid work email address'
    if (!contactPhone.trim())     return 'Enter a direct phone number'
    return ''
  }

  function validateStep4(): string {
    if (!decl1) return 'You must confirm all information is accurate and complete'
    if (!decl2) return 'You must confirm you are authorised to submit this application'
    if (!decl3) return 'You must accept responsibility for MRI safety data accuracy'
    if (!decl4) return 'You must agree to the Manufacturer Terms of Service and Data Processing Agreement'
    return ''
  }

  // ── Navigation ─────────────────────────────────────────────────────────────

  function handleNext() {
    setError('')
    let err = ''
    if (step === 1) err = validateStep1()
    if (step === 2) err = validateStep2()
    if (step === 3) err = validateStep3()
    if (err) { setError(err); return }
    setStep(s => s + 1)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function handleBack() {
    setError('')
    setStep(s => s - 1)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  // ── Submit ─────────────────────────────────────────────────────────────────

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    const err = validateStep4()
    if (err) { setError(err); return }

    setLoading(true)
    const contactName = `${contactFirstName.trim()} ${contactLastName.trim()}`.trim()

    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (api.manufacturers.submitManufacturerApplication as any)({
        companyName:            companyName.trim() || legalEntityName.trim(),
        contactName,
        contactEmail:           contactEmail.trim().toLowerCase(),
        country,
        regNumber:              regNumber.trim()              || undefined,
        website:                website.trim()                || undefined,
        legalEntityName:        legalEntityName.trim()        || undefined,
        contactJobTitle:        contactJobTitle.trim()        || undefined,
        contactPhone:           contactPhone.trim()           || undefined,
        iso13485CertNumber:     iso13485CertNumber.trim()     || undefined,
        iso13485IssuingBody:    iso13485IssuingBody.trim()    || undefined,
        iso13485ExpiryDate:     iso13485ExpiryDate            || undefined,
        deviceCategories:       deviceCategories.length > 0  ? deviceCategories  : undefined,
        geographicMarkets:      geographicMarkets.length > 0 ? geographicMarkets : undefined,
        regulatoryRegistrations: regulatoryRegistrations.trim() || undefined,
        declaration:            true,
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
        <SidePanel step={5} />
        <div className="onb-main">
          <div className="onb-box">
            <div style={{ textAlign: 'center', padding: '20px 0 10px' }}>
              <div style={{
                width: 72, height: 72, borderRadius: '50%',
                background: 'color-mix(in srgb,var(--ok) 12%,transparent)',
                color: 'var(--ok)', display: 'grid', placeItems: 'center', margin: '0 auto 24px',
              }}>
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" />
                </svg>
              </div>
              <h2 style={{ fontFamily: 'var(--ff)', fontSize: 24, fontWeight: 600, marginBottom: 10 }}>
                Application submitted
              </h2>
              <p style={{ color: 'var(--muted)', fontSize: 15, lineHeight: 1.6, maxWidth: 400, margin: '0 auto 28px' }}>
                Thank you, <strong>{contactFirstName}</strong>. We'll review your application for{' '}
                <strong>{legalEntityName || companyName}</strong> and contact you at{' '}
                <strong>{contactEmail}</strong> within 5–10 business days.
              </p>
              <div className="onb-note">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                  <circle cx="12" cy="12" r="10" /><path d="M12 8v4M12 16h.01" />
                </svg>
                <span>
                  Once approved, you'll receive access to the Implant ID Manufacturer Portal
                  where you can submit and manage your device MRI safety data.
                </span>
              </div>
              <a href="/" style={{
                display: 'inline-block', marginTop: 28,
                fontFamily: 'var(--ff)', fontSize: 14, color: 'var(--muted)',
              }}>← Back to homepage</a>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // ── Derived ────────────────────────────────────────────────────────────────

  const contactName = `${contactFirstName.trim()} ${contactLastName.trim()}`.trim()

  // ── Form ───────────────────────────────────────────────────────────────────

  return (
    <div className="onb">

      {/* Left panel */}
      <SidePanel step={step} />

      {/* Right panel */}
      <div className="onb-main">
        <div className="onb-box">

          {/* Eyebrow */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 22 }}>
            <div style={{ width: 22, height: 1.5, background: 'var(--accent)', flexShrink: 0 }} />
            <span style={{ fontFamily: 'var(--ff)', fontSize: 10.5, fontWeight: 700, letterSpacing: '1.6px', textTransform: 'uppercase', color: 'var(--accent)' }}>
              Manufacturer Application
            </span>
          </div>

          <h2 className="onb-box h2">Apply to join the network</h2>
          <p className="sub">Complete all four steps and we'll review your application within 5–10 business days.</p>

          {/* Step progress bar */}
          <StepBar step={step} />

          <form onSubmit={handleSubmit} noValidate>

            {/* ════════════════════════════════════════════════════════════════
                STEP 1 — Company details
            ════════════════════════════════════════════════════════════════ */}
            {step === 1 && (
              <>
                <div className="form-section">
                  <h3>
                    <span className="num">1</span>
                    Company details
                  </h3>
                  <p className="desc">Provide your company's registered details exactly as they appear on official documents.</p>

                  <div className="form-grid">

                    <div className="field field-full">
                      <label>
                        Legal entity name
                        <span style={{ color: 'var(--err)', marginLeft: 3 }}>*</span>
                      </label>
                      <input
                        className="input"
                        type="text"
                        placeholder="Acme Medical Devices Ltd"
                        value={legalEntityName}
                        onChange={e => setLegalEntityName(e.target.value)}
                        autoComplete="organization"
                        aria-label="Legal entity name"
                      />
                    </div>

                    <div className="field field-full">
                      <label>
                        Trading / brand name
                        <span style={{ fontWeight: 400, opacity: .6, textTransform: 'none', letterSpacing: 0, marginLeft: 4 }}>(if different)</span>
                      </label>
                      <input
                        className="input"
                        type="text"
                        placeholder="AcmeMed"
                        value={companyName}
                        onChange={e => setCompanyName(e.target.value)}
                        autoComplete="organization"
                        aria-label="Trading or brand name"
                      />
                    </div>

                    <div className="field">
                      <label>
                        Company registration number
                        <span style={{ color: 'var(--err)', marginLeft: 3 }}>*</span>
                      </label>
                      <input
                        className="input"
                        type="text"
                        placeholder="e.g. 12345678"
                        value={regNumber}
                        onChange={e => setRegNumber(e.target.value)}
                        aria-label="Company registration number"
                      />
                    </div>

                    <div className="field">
                      <label>
                        Country of incorporation
                        <span style={{ color: 'var(--err)', marginLeft: 3 }}>*</span>
                      </label>
                      <select
                        className="input"
                        value={country}
                        onChange={e => setCountry(e.target.value)}
                        aria-label="Country of incorporation"
                        style={{ appearance: 'none', backgroundImage: "url(\"data:image/svg+xml,%3Csvg width='10' height='6' viewBox='0 0 10 6' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M1 1l4 4 4-4' stroke='%230e2a33' stroke-width='1.5' stroke-linecap='round'/%3E%3C/svg%3E\")", backgroundRepeat: 'no-repeat', backgroundPosition: 'right 14px center', backgroundSize: '10px', paddingRight: 36 }}
                      >
                        <option value="">Select country</option>
                        {COUNTRIES.map(c => (
                          <option key={c} value={c}>{c}</option>
                        ))}
                      </select>
                    </div>

                    <div className="field field-full">
                      <label>
                        Company website URL
                        <span style={{ color: 'var(--err)', marginLeft: 3 }}>*</span>
                      </label>
                      <input
                        className="input"
                        type="url"
                        placeholder="https://www.acmemed.com"
                        value={website}
                        onChange={e => setWebsite(e.target.value)}
                        autoComplete="url"
                        aria-label="Company website URL"
                      />
                    </div>

                  </div>
                </div>

                <ErrorBanner message={error} />

                <div className="form-actions">
                  <a href="/" className="btn">← Back to site</a>
                  <button
                    type="button"
                    className="btn btn-s"
                    onClick={handleNext}
                    style={{ flex: 1, justifyContent: 'center' }}
                  >
                    Continue →
                  </button>
                </div>
              </>
            )}

            {/* ════════════════════════════════════════════════════════════════
                STEP 2 — Regulatory & products
            ════════════════════════════════════════════════════════════════ */}
            {step === 2 && (
              <>
                <div className="form-section">
                  <h3>
                    <span className="num">2</span>
                    ISO 13485 certification
                  </h3>
                  <p className="desc">ISO 13485 certification is required for all manufacturers on the Implant ID platform.</p>

                  <div className="form-grid">

                    <div className="field field-full">
                      <label>
                        Certificate number
                        <span style={{ color: 'var(--err)', marginLeft: 3 }}>*</span>
                      </label>
                      <input
                        className="input"
                        type="text"
                        placeholder="e.g. ISO13485-2024-UK-12345"
                        value={iso13485CertNumber}
                        onChange={e => setIso13485CertNumber(e.target.value)}
                        aria-label="ISO 13485 certificate number"
                      />
                    </div>

                    <div className="field">
                      <label>
                        Issuing body
                        <span style={{ color: 'var(--err)', marginLeft: 3 }}>*</span>
                      </label>
                      <input
                        className="input"
                        type="text"
                        placeholder="e.g. BSI, TÜV SÜD, SGS"
                        value={iso13485IssuingBody}
                        onChange={e => setIso13485IssuingBody(e.target.value)}
                        aria-label="ISO 13485 issuing body"
                      />
                    </div>

                    <div className="field">
                      <label>
                        Certificate expiry date
                        <span style={{ color: 'var(--err)', marginLeft: 3 }}>*</span>
                      </label>
                      <input
                        className="input"
                        type="date"
                        value={iso13485ExpiryDate}
                        onChange={e => setIso13485ExpiryDate(e.target.value)}
                        aria-label="ISO 13485 certificate expiry date"
                      />
                    </div>

                  </div>
                </div>

                <div className="form-section">
                  <h3>
                    <span className="num" style={{ background: 'var(--accent)' }}>2</span>
                    Other regulatory registrations
                  </h3>
                  <p className="desc">List any additional regulatory registrations you hold (FDA 510(k), MHRA, TGA, Health Canada, CE Mark, etc.).</p>
                  <textarea
                    className="input"
                    rows={4}
                    placeholder="e.g. FDA 510(k) K123456, UKCA marked, CE marked under MDR 2017/745, TGA ARTG 123456"
                    value={regulatoryRegistrations}
                    onChange={e => setRegulatoryRegistrations(e.target.value)}
                    style={{ resize: 'vertical', minHeight: 100 }}
                    aria-label="Other regulatory registrations"
                  />
                </div>

                <div className="form-section">
                  <h3>
                    <span className="num" style={{ background: 'var(--accent)' }}>2</span>
                    Device categories
                    <span style={{ color: 'var(--err)', marginLeft: 2 }}>*</span>
                  </h3>
                  <p className="desc">Select all categories that apply to your implant portfolio.</p>
                  <div className="check-group" role="group" aria-label="Device categories">
                    {DEVICE_CATEGORIES.map(cat => (
                      <label
                        key={cat}
                        className={deviceCategories.includes(cat) ? 'checked' : ''}
                        aria-checked={deviceCategories.includes(cat)}
                      >
                        <input
                          type="checkbox"
                          checked={deviceCategories.includes(cat)}
                          onChange={() => toggleCategory(cat)}
                          aria-label={cat}
                        />
                        {cat}
                      </label>
                    ))}
                  </div>
                </div>

                <div className="form-section">
                  <h3>
                    <span className="num" style={{ background: 'var(--accent)' }}>2</span>
                    Geographic markets
                    <span style={{ color: 'var(--err)', marginLeft: 2 }}>*</span>
                  </h3>
                  <p className="desc">Select all markets where your devices are registered and sold.</p>
                  <div className="check-group" role="group" aria-label="Geographic markets">
                    {GEOGRAPHIC_MARKETS.map(market => (
                      <label
                        key={market}
                        className={geographicMarkets.includes(market) ? 'checked' : ''}
                        aria-checked={geographicMarkets.includes(market)}
                      >
                        <input
                          type="checkbox"
                          checked={geographicMarkets.includes(market)}
                          onChange={() => toggleMarket(market)}
                          aria-label={market}
                        />
                        {market}
                      </label>
                    ))}
                  </div>
                </div>

                <ErrorBanner message={error} />

                <div className="form-actions">
                  <button type="button" className="btn" onClick={handleBack}>← Back</button>
                  <button
                    type="button"
                    className="btn btn-s"
                    onClick={handleNext}
                    style={{ flex: 1, justifyContent: 'center' }}
                  >
                    Continue →
                  </button>
                </div>
              </>
            )}

            {/* ════════════════════════════════════════════════════════════════
                STEP 3 — Contact person
            ════════════════════════════════════════════════════════════════ */}
            {step === 3 && (
              <>
                <div className="form-section">
                  <h3>
                    <span className="num">3</span>
                    Contact person
                  </h3>
                  <p className="desc">
                    The person submitting this application and who we should contact about the review.
                    They must be authorised to act on behalf of the organisation.
                  </p>

                  <div className="form-grid">

                    <div className="field">
                      <label>
                        First name
                        <span style={{ color: 'var(--err)', marginLeft: 3 }}>*</span>
                      </label>
                      <input
                        className="input"
                        type="text"
                        placeholder="Jane"
                        value={contactFirstName}
                        onChange={e => setContactFirstName(e.target.value)}
                        autoComplete="given-name"
                        aria-label="Contact first name"
                      />
                    </div>

                    <div className="field">
                      <label>
                        Last name
                        <span style={{ color: 'var(--err)', marginLeft: 3 }}>*</span>
                      </label>
                      <input
                        className="input"
                        type="text"
                        placeholder="Smith"
                        value={contactLastName}
                        onChange={e => setContactLastName(e.target.value)}
                        autoComplete="family-name"
                        aria-label="Contact last name"
                      />
                    </div>

                    <div className="field field-full">
                      <label>
                        Job title
                        <span style={{ color: 'var(--err)', marginLeft: 3 }}>*</span>
                      </label>
                      <input
                        className="input"
                        type="text"
                        placeholder="e.g. Regulatory Affairs Director"
                        value={contactJobTitle}
                        onChange={e => setContactJobTitle(e.target.value)}
                        autoComplete="organization-title"
                        aria-label="Job title"
                      />
                    </div>

                    <div className="field">
                      <label>
                        Work email address
                        <span style={{ color: 'var(--err)', marginLeft: 3 }}>*</span>
                      </label>
                      <input
                        className="input"
                        type="email"
                        placeholder="jane.smith@acmemed.com"
                        value={contactEmail}
                        onChange={e => setContactEmail(e.target.value)}
                        autoComplete="email"
                        aria-label="Work email address"
                      />
                    </div>

                    <div className="field">
                      <label>
                        Direct phone
                        <span style={{ color: 'var(--err)', marginLeft: 3 }}>*</span>
                      </label>
                      <input
                        className="input"
                        type="tel"
                        placeholder="+44 20 7000 0000"
                        value={contactPhone}
                        onChange={e => setContactPhone(e.target.value)}
                        autoComplete="tel"
                        aria-label="Direct phone number"
                      />
                    </div>

                  </div>
                </div>

                <ErrorBanner message={error} />

                <div className="form-actions">
                  <button type="button" className="btn" onClick={handleBack}>← Back</button>
                  <button
                    type="button"
                    className="btn btn-s"
                    onClick={handleNext}
                    style={{ flex: 1, justifyContent: 'center' }}
                  >
                    Continue →
                  </button>
                </div>
              </>
            )}

            {/* ════════════════════════════════════════════════════════════════
                STEP 4 — Declaration & submit
            ════════════════════════════════════════════════════════════════ */}
            {step === 4 && (
              <>
                {/* Summary */}
                <div className="form-section">
                  <h3>
                    <span className="num">4</span>
                    Application summary
                  </h3>
                  <p className="desc">Review the details you've provided before submitting.</p>

                  <div className="summary-card">
                    <h4>Company</h4>
                    <dl>
                      <div className="summary-row">
                        <dt>Legal entity</dt>
                        <dd>{legalEntityName || '—'}</dd>
                      </div>
                      {companyName && (
                        <div className="summary-row">
                          <dt>Trading name</dt>
                          <dd>{companyName}</dd>
                        </div>
                      )}
                      <div className="summary-row">
                        <dt>Reg. number</dt>
                        <dd>{regNumber || '—'}</dd>
                      </div>
                      <div className="summary-row">
                        <dt>Country</dt>
                        <dd>{country || '—'}</dd>
                      </div>
                      <div className="summary-row">
                        <dt>Website</dt>
                        <dd>{website || '—'}</dd>
                      </div>
                    </dl>
                  </div>

                  <div className="summary-card" style={{ marginTop: 12 }}>
                    <h4>Regulatory</h4>
                    <dl>
                      <div className="summary-row">
                        <dt>ISO 13485 cert.</dt>
                        <dd>{iso13485CertNumber || '—'}</dd>
                      </div>
                      <div className="summary-row">
                        <dt>Issuing body</dt>
                        <dd>{iso13485IssuingBody || '—'}</dd>
                      </div>
                      <div className="summary-row">
                        <dt>Expiry date</dt>
                        <dd>{iso13485ExpiryDate || '—'}</dd>
                      </div>
                      {deviceCategories.length > 0 && (
                        <div className="summary-row" style={{ flexDirection: 'column', gap: 6 }}>
                          <dt>Device categories</dt>
                          <dd>
                            <div className="summary-tags">
                              {deviceCategories.map(c => (
                                <span key={c} className="summary-tag">{c}</span>
                              ))}
                            </div>
                          </dd>
                        </div>
                      )}
                      {geographicMarkets.length > 0 && (
                        <div className="summary-row" style={{ flexDirection: 'column', gap: 6, marginTop: 8 }}>
                          <dt>Markets</dt>
                          <dd>
                            <div className="summary-tags">
                              {geographicMarkets.map(m => (
                                <span key={m} className="summary-tag">{m}</span>
                              ))}
                            </div>
                          </dd>
                        </div>
                      )}
                    </dl>
                  </div>

                  <div className="summary-card" style={{ marginTop: 12 }}>
                    <h4>Contact</h4>
                    <dl>
                      <div className="summary-row">
                        <dt>Name</dt>
                        <dd>{contactName || '—'}</dd>
                      </div>
                      <div className="summary-row">
                        <dt>Job title</dt>
                        <dd>{contactJobTitle || '—'}</dd>
                      </div>
                      <div className="summary-row">
                        <dt>Email</dt>
                        <dd>{contactEmail || '—'}</dd>
                      </div>
                      <div className="summary-row">
                        <dt>Phone</dt>
                        <dd>{contactPhone || '—'}</dd>
                      </div>
                    </dl>
                  </div>
                </div>

                {/* Declaration */}
                <div className="form-section">
                  <h3>
                    <span className="num">4</span>
                    Declaration
                    <span style={{ color: 'var(--err)', marginLeft: 2 }}>*</span>
                  </h3>
                  <p className="desc">All four declarations are required to submit your application.</p>

                  <div className="decl-list">
                    <label
                      className={`decl-item${decl1 ? ' checked' : ''}`}
                      aria-checked={decl1}
                    >
                      <input
                        type="checkbox"
                        checked={decl1}
                        onChange={e => setDecl1(e.target.checked)}
                        aria-label="I confirm all information provided is accurate and complete"
                      />
                      <span>I confirm all information provided in this application is accurate and complete.</span>
                    </label>

                    <label
                      className={`decl-item${decl2 ? ' checked' : ''}`}
                      aria-checked={decl2}
                    >
                      <input
                        type="checkbox"
                        checked={decl2}
                        onChange={e => setDecl2(e.target.checked)}
                        aria-label="I am authorised to submit this application on behalf of the organisation"
                      />
                      <span>I am authorised to submit this application on behalf of the organisation named above.</span>
                    </label>

                    <label
                      className={`decl-item${decl3 ? ' checked' : ''}`}
                      aria-checked={decl3}
                    >
                      <input
                        type="checkbox"
                        checked={decl3}
                        onChange={e => setDecl3(e.target.checked)}
                        aria-label="I understand that MRI safety data will be relied upon by clinicians and accept responsibility for its accuracy"
                      />
                      <span>
                        I understand that MRI safety data submitted through Implant ID will be relied upon
                        by clinicians making patient care decisions, and I accept full responsibility for
                        its accuracy and currency.
                      </span>
                    </label>

                    <label
                      className={`decl-item${decl4 ? ' checked' : ''}`}
                      aria-checked={decl4}
                    >
                      <input
                        type="checkbox"
                        checked={decl4}
                        onChange={e => setDecl4(e.target.checked)}
                        aria-label="I agree to the Implant ID Manufacturer Terms of Service and Data Processing Agreement"
                      />
                      <span>
                        I agree to the Implant ID{' '}
                        <a href="/legal/manufacturer-terms" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accent)' }}>
                          Manufacturer Terms of Service
                        </a>{' '}and{' '}
                        <a href="/legal/dpa" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accent)' }}>
                          Data Processing Agreement
                        </a>.
                      </span>
                    </label>
                  </div>
                </div>

                {/* Trust note */}
                <div className="onb-note">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                  </svg>
                  <span>
                    Your application will be reviewed by the Implant ID team. We may contact you
                    to verify your ISO 13485 certification or regulatory registrations before granting access.
                  </span>
                </div>

                <ErrorBanner message={error} />

                <div className="form-actions" style={{ marginTop: 24 }}>
                  <button type="button" className="btn" onClick={handleBack}>← Back</button>
                  <button
                    type="submit"
                    className="btn btn-s"
                    disabled={loading}
                    style={{ flex: 1, justifyContent: 'center' }}
                  >
                    {loading ? 'Submitting…' : 'Submit application →'}
                  </button>
                </div>
              </>
            )}

          </form>
        </div>
      </div>
    </div>
  )
}
