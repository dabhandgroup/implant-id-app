'use client'

import React, { useState, useEffect } from 'react'
import { useQuery, useMutation } from 'convex/react'
import { useRouter } from 'next/navigation'
import { api as apiBase } from '../../../../../../convex/_generated/api'
import { Id } from '../../../../../../convex/_generated/dataModel'
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const api = apiBase as any

interface Props { id: string }

const COUNTRIES = [
  'Australia','Austria','Belgium','Brazil','Canada','Chile','China','Colombia',
  'Czech Republic','Denmark','Egypt','Finland','France','Germany','Greece',
  'Hungary','India','Indonesia','Ireland','Israel','Italy','Japan','Malaysia',
  'Mexico','Netherlands','New Zealand','Nigeria','Norway','Pakistan','Philippines',
  'Poland','Portugal','Romania','Russia','Saudi Arabia','Singapore','Slovakia',
  'Slovenia','South Africa','South Korea','Spain','Sweden','Switzerland','Taiwan',
  'Thailand','Turkey','Ukraine','United Arab Emirates','United Kingdom',
  'United States','Vietnam',
].sort()

export default function EditManufacturerClient({ id }: Props) {
  const router = useRouter()
  const mfr    = useQuery(api.manufacturers.getBySlugOrId, { slugOrId: id })
  const update = useMutation(api.manufacturers.updateManufacturer)

  // Form state — all hooks at top
  const [companyName,             setCompanyName]             = useState('')
  const [legalEntityName,         setLegalEntityName]         = useState('')
  const [contactName,             setContactName]             = useState('')
  const [contactEmail,            setContactEmail]            = useState('')
  const [contactPhone,            setContactPhone]            = useState('')
  const [contactJobTitle,         setContactJobTitle]         = useState('')
  const [country,                 setCountry]                 = useState('')
  const [website,                 setWebsite]                 = useState('')
  const [logoUrl,                 setLogoUrl]                 = useState('')
  const [regNumber,               setRegNumber]               = useState('')
  const [iso13485CertNumber,      setIso13485CertNumber]      = useState('')
  const [iso13485IssuingBody,     setIso13485IssuingBody]     = useState('')
  const [iso13485ExpiryDate,      setIso13485ExpiryDate]      = useState('')
  const [regulatoryRegistrations, setRegulatoryRegistrations] = useState('')
  const [saving,   setSaving]   = useState(false)
  const [error,    setError]    = useState('')
  const [saved,    setSaved]    = useState(false)
  const [hydrated, setHydrated] = useState(false)

  // Populate form once data loads
  useEffect(() => {
    if (!mfr || hydrated) return
    setCompanyName(mfr.companyName ?? '')
    setLegalEntityName(mfr.legalEntityName ?? '')
    setContactName(mfr.contactName ?? '')
    setContactEmail(mfr.contactEmail ?? '')
    setContactPhone(mfr.contactPhone ?? '')
    setContactJobTitle(mfr.contactJobTitle ?? '')
    setCountry(mfr.country ?? '')
    setWebsite(mfr.website ?? '')
    setLogoUrl(mfr.logoUrl ?? '')
    setRegNumber(mfr.regNumber ?? '')
    setIso13485CertNumber(mfr.iso13485CertNumber ?? '')
    setIso13485IssuingBody(mfr.iso13485IssuingBody ?? '')
    setIso13485ExpiryDate(mfr.iso13485ExpiryDate ?? '')
    setRegulatoryRegistrations(mfr.regulatoryRegistrations ?? '')
    setHydrated(true)
  }, [mfr, hydrated])

  if (mfr === undefined) {
    return <div className="m-content" style={{ padding: '48px 0', textAlign: 'center', color: 'var(--muted)', fontFamily: 'var(--ff)', fontSize: 14 }}>Loading…</div>
  }
  if (mfr === null) {
    return <div className="m-content" style={{ padding: '48px 0', textAlign: 'center', color: 'var(--muted)', fontFamily: 'var(--ff)', fontSize: 14 }}>Manufacturer not found.</div>
  }

  const backUrl = `/master/manufacturers/${id}`

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    if (!companyName.trim()) { setError('Company name is required.'); return }
    if (!contactName.trim())  { setError('Contact name is required.'); return }
    if (!contactEmail.trim()) { setError('Contact email is required.'); return }
    if (!country.trim())      { setError('Country is required.'); return }
    setSaving(true); setError(''); setSaved(false)
    try {
      await update({
        id: mfr._id as Id<'manufacturers'>,
        companyName:             companyName.trim(),
        legalEntityName:         legalEntityName.trim() || undefined,
        contactName:             contactName.trim(),
        contactEmail:            contactEmail.trim(),
        contactPhone:            contactPhone.trim() || undefined,
        contactJobTitle:         contactJobTitle.trim() || undefined,
        country:                 country.trim(),
        website:                 website.trim() || undefined,
        logoUrl:                 logoUrl.trim() || undefined,
        regNumber:               regNumber.trim() || undefined,
        iso13485CertNumber:      iso13485CertNumber.trim() || undefined,
        iso13485IssuingBody:     iso13485IssuingBody.trim() || undefined,
        iso13485ExpiryDate:      iso13485ExpiryDate.trim() || undefined,
        regulatoryRegistrations: regulatoryRegistrations.trim() || undefined,
      })
      setSaved(true)
      // Navigate back after a brief confirmation
      setTimeout(() => router.push(backUrl), 900)
    } catch (err) {
      setError((err as { message?: string })?.message ?? 'Failed to save — try again.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="m-content">
      <button onClick={() => router.push(backUrl)} className="m-back"
        style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: 'var(--muted)', fontFamily: 'var(--ff)', fontSize: 13.5, background: 'transparent', border: 0, cursor: 'pointer', padding: 0, marginBottom: 20 }}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16"><polyline points="15 18 9 12 15 6"/></svg>
        Back to {mfr.companyName}
      </button>

      <div style={{ marginBottom: 24 }}>
        <h2 style={{ fontFamily: 'var(--ff)', marginBottom: 4 }}>Edit Manufacturer</h2>
        <div style={{ fontFamily: 'var(--fb)', fontSize: 13.5, color: 'var(--muted)' }}>
          Changes are saved immediately to the live platform.
        </div>
      </div>

      <form onSubmit={handleSave}>

        {/* ── Company Identity ── */}
        <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 14, overflow: 'hidden', marginBottom: 16 }}>
          <div style={{ padding: '14px 22px', borderBottom: '1px solid var(--border)', background: 'rgba(var(--text-rgb),0.02)' }}>
            <div style={{ fontFamily: 'var(--ff)', fontSize: 12, fontWeight: 700, letterSpacing: '1px', textTransform: 'uppercase', color: 'var(--muted2)' }}>Company Identity</div>
          </div>
          <div style={{ padding: '20px 22px', display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(220px,1fr))', gap: '16px 20px' }}>
            <div className="field">
              <label>Trading / Brand Name <span style={{ color: 'var(--err)', marginLeft: 3 }}>*</span></label>
              <input className="input" value={companyName} onChange={e => setCompanyName(e.target.value)} placeholder="Medtronic" />
            </div>
            <div className="field">
              <label>Legal Entity Name</label>
              <input className="input" value={legalEntityName} onChange={e => setLegalEntityName(e.target.value)} placeholder="Medtronic PLC" />
            </div>
            <div className="field">
              <label>Country <span style={{ color: 'var(--err)', marginLeft: 3 }}>*</span></label>
              <select className="input" value={country} onChange={e => setCountry(e.target.value)}>
                <option value="">Select country…</option>
                {COUNTRIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div className="field">
              <label>Registration Number</label>
              <input className="input" value={regNumber} onChange={e => setRegNumber(e.target.value)} placeholder="Company reg. no." />
            </div>
            <div className="field">
              <label>Website</label>
              <input className="input" type="url" value={website} onChange={e => setWebsite(e.target.value)} placeholder="https://example.com" />
            </div>
            <div className="field">
              <label>Logo URL</label>
              <input className="input" value={logoUrl} onChange={e => setLogoUrl(e.target.value)} placeholder="https://logo.clearbit.com/…" />
            </div>
          </div>
        </div>

        {/* ── Primary Contact ── */}
        <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 14, overflow: 'hidden', marginBottom: 16 }}>
          <div style={{ padding: '14px 22px', borderBottom: '1px solid var(--border)', background: 'rgba(var(--text-rgb),0.02)' }}>
            <div style={{ fontFamily: 'var(--ff)', fontSize: 12, fontWeight: 700, letterSpacing: '1px', textTransform: 'uppercase', color: 'var(--muted2)' }}>Primary Contact</div>
          </div>
          <div style={{ padding: '20px 22px', display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(220px,1fr))', gap: '16px 20px' }}>
            <div className="field">
              <label>Full Name <span style={{ color: 'var(--err)', marginLeft: 3 }}>*</span></label>
              <input className="input" value={contactName} onChange={e => setContactName(e.target.value)} placeholder="Jane Smith" />
            </div>
            <div className="field">
              <label>Job Title</label>
              <input className="input" value={contactJobTitle} onChange={e => setContactJobTitle(e.target.value)} placeholder="Regulatory Affairs Manager" />
            </div>
            <div className="field">
              <label>Email <span style={{ color: 'var(--err)', marginLeft: 3 }}>*</span></label>
              <input className="input" type="email" value={contactEmail} onChange={e => setContactEmail(e.target.value)} placeholder="jane@example.com" />
            </div>
            <div className="field">
              <label>Phone</label>
              <input className="input" type="tel" value={contactPhone} onChange={e => setContactPhone(e.target.value)} placeholder="+1 555 000 0000" />
            </div>
          </div>
        </div>

        {/* ── Regulatory ── */}
        <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 14, overflow: 'hidden', marginBottom: 16 }}>
          <div style={{ padding: '14px 22px', borderBottom: '1px solid var(--border)', background: 'rgba(var(--text-rgb),0.02)' }}>
            <div style={{ fontFamily: 'var(--ff)', fontSize: 12, fontWeight: 700, letterSpacing: '1px', textTransform: 'uppercase', color: 'var(--muted2)' }}>Regulatory</div>
          </div>
          <div style={{ padding: '20px 22px', display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(220px,1fr))', gap: '16px 20px' }}>
            <div className="field">
              <label>ISO 13485 Cert. No.</label>
              <input className="input" value={iso13485CertNumber} onChange={e => setIso13485CertNumber(e.target.value)} placeholder="ISO 13485:2016 / CERT-XXXX" />
            </div>
            <div className="field">
              <label>Issuing Body</label>
              <input className="input" value={iso13485IssuingBody} onChange={e => setIso13485IssuingBody(e.target.value)} placeholder="BSI, TÜV, DNV…" />
            </div>
            <div className="field">
              <label>Expiry Date</label>
              <input className="input" value={iso13485ExpiryDate} onChange={e => setIso13485ExpiryDate(e.target.value)} placeholder="DD/MM/YYYY" />
            </div>
            <div className="field" style={{ gridColumn: '1/-1' }}>
              <label>Other Regulatory Registrations</label>
              <textarea className="input" rows={2} value={regulatoryRegistrations}
                onChange={e => setRegulatoryRegistrations(e.target.value)}
                placeholder="FDA 510(k), CE Mark, UKCA…" style={{ resize: 'vertical' }} />
            </div>
          </div>
        </div>

        {/* Error / success banner */}
        {error && (
          <div style={{ background: 'rgba(var(--err-rgb),0.08)', border: '1px solid rgba(var(--err-rgb),0.22)', borderRadius: 10, padding: '12px 16px', marginBottom: 16, color: 'var(--err)', fontFamily: 'var(--ff)', fontSize: 13.5 }}>
            {error}
          </div>
        )}
        {saved && (
          <div style={{ background: 'rgba(var(--ok-rgb),0.08)', border: '1px solid rgba(var(--ok-rgb),0.22)', borderRadius: 10, padding: '12px 16px', marginBottom: 16, color: 'var(--ok)', fontFamily: 'var(--ff)', fontSize: 13.5 }}>
            Saved — redirecting…
          </div>
        )}

        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <button type="button" className="btn" onClick={() => router.push(backUrl)} disabled={saving}>
            Cancel
          </button>
          <button type="submit" className="btn btn-s btn-lg" disabled={saving}>
            {saving ? 'Saving…' : 'Save changes'}
          </button>
        </div>
      </form>
    </div>
  )
}
