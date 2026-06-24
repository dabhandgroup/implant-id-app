'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useMutation } from 'convex/react'
import { api } from '../../../../../convex/_generated/api'
import { CustomSelect } from '../../../../components/ui/CustomSelect'

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
  'United Kingdom', 'United States', 'Australia', 'Canada', 'Ireland',
  'New Zealand', 'Germany', 'France', 'Spain', 'Italy', 'Netherlands',
  'Belgium', 'Sweden', 'Norway', 'Denmark', 'Finland', 'Switzerland',
  'Austria', 'Poland', 'Czech Republic', 'Portugal', 'Greece',
  'South Africa', 'UAE', 'Singapore', 'Other',
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
  'Pacemaker / ICD', 'Cochlear', 'DBS / Neurostim',
  'Spinal Cord', 'MRI Centre', 'Orthopaedic',
]

function isValidEmail(e: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)
}

function SectionCard({ num, title, optional, desc, children }: {
  num: number
  title: string
  optional?: boolean
  desc: string
  children: React.ReactNode
}) {
  return (
    <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 14, padding: '22px 24px', marginBottom: 16 }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 4 }}>
        <span style={{
          flexShrink: 0, width: 22, height: 22, borderRadius: '50%',
          background: 'var(--accent)', color: '#fff',
          fontFamily: 'var(--ff)', fontSize: 11, fontWeight: 700,
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        }}>{num}</span>
        <span style={{ fontFamily: 'var(--ff)', fontSize: 15, fontWeight: 600, color: 'var(--text)' }}>
          {title}
          {optional && <span style={{ fontFamily: 'var(--ff)', fontWeight: 400, fontSize: 13, color: 'var(--muted2)', marginLeft: 6 }}>(optional)</span>}
        </span>
      </div>
      <p style={{ fontFamily: 'var(--ff)', fontSize: 13, color: 'var(--muted)', marginBottom: 18, marginLeft: 32, lineHeight: 1.5 }}>{desc}</p>
      {children}
    </div>
  )
}

export default function AddClinicClient() {
  const router = useRouter()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const adminAddClinic      = useMutation((api.clinics as any).adminAddClinic)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const generateUploadUrl   = useMutation((api.clinics as any).adminGenerateUploadUrl)

  // Section 1 — Clinic information
  const [facilityName,    setFacilityName]    = useState('')
  const [facilityType,    setFacilityType]    = useState('')
  const [facilityCountry, setFacilityCountry] = useState('')
  const [facilityAddress, setFacilityAddress] = useState('')
  const [facilityCity,    setFacilityCity]    = useState('')
  const [facilityPhone,   setFacilityPhone]   = useState('')
  const [mriCount,        setMriCount]        = useState('')
  const [staffCount,      setStaffCount]      = useState('')

  // Section 2 — Primary contact
  const [contactName,  setContactName]  = useState('')
  const [jobTitle,     setJobTitle]     = useState('')
  const [contactEmail, setContactEmail] = useState('')
  const [contactPhone, setContactPhone] = useState('')

  // Section 3 — Accreditation
  const [accreditationFile, setAccreditationFile] = useState<File | null>(null)
  const [dragOver,          setDragOver]          = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Section 4 — Regulatory body
  const [regulatoryBody,  setRegulatoryBody]  = useState('')
  const [registrationNum, setRegistrationNum] = useState('')

  // Section 5 — Services
  const [services, setServices] = useState<string[]>([])

  // Section 6 — Additional information
  const [additionalInfo, setAdditionalInfo] = useState('')

  // UI
  const [loading,    setLoading]    = useState(false)
  const [error,      setError]      = useState('')
  const [done,       setDone]       = useState(false)
  const [addedEmail, setAddedEmail] = useState('')
  const [addedName,  setAddedName]  = useState('')

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

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    if (!facilityName.trim())       return setError('Enter the clinic / facility name')
    if (!facilityType)              return setError('Select a facility type')
    if (!facilityCountry)           return setError('Select a country')
    if (!facilityAddress.trim())    return setError('Enter the clinic address')
    if (!contactName.trim())        return setError('Enter the primary contact name')
    if (!isValidEmail(contactEmail)) return setError('Enter a valid email address')

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

      await adminAddClinic({
        clinicName:          facilityName.trim(),
        contactName:         contactName.trim(),
        contactEmail:        contactEmail.trim().toLowerCase(),
        contactPhone:        contactPhone.trim()     || undefined,
        jobTitle:            jobTitle.trim()         || undefined,
        facilityType,
        facilityAddress:     facilityAddress.trim(),
        facilityCountry,
        facilityCity:        facilityCity.trim()     || undefined,
        facilityPhone:       facilityPhone.trim()    || undefined,
        regulatoryBody:      regulatoryBody          || undefined,
        registrationNum:     registrationNum.trim()  || undefined,
        services,
        additionalInfo:      additionalInfo.trim()   || undefined,
        mriScannerCount:     mriCount   ? Number(mriCount)   : undefined,
        staffUsingImplantId: staffCount ? Number(staffCount) : undefined,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        storageId:           storageId as any,
        fileName,
      })
      setAddedEmail(contactEmail.trim().toLowerCase())
      setAddedName(facilityName.trim())
      setDone(true)
    } catch (err) {
      setError((err as { message?: string })?.message ?? 'Something went wrong — please try again')
    } finally {
      setLoading(false)
    }
  }

  function resetForm() {
    setFacilityName(''); setFacilityType(''); setFacilityCountry(''); setFacilityAddress('')
    setFacilityCity(''); setFacilityPhone(''); setMriCount(''); setStaffCount('')
    setContactName(''); setJobTitle(''); setContactEmail(''); setContactPhone('')
    setAccreditationFile(null); setRegulatoryBody(''); setRegistrationNum('')
    setServices([]); setAdditionalInfo(''); setError(''); setDone(false)
  }

  if (done) {
    return (
      <div className="m-content">
        <div style={{ maxWidth: 560 }}>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 16,
            background: 'rgba(var(--ok-rgb),0.08)', border: '1px solid rgba(var(--ok-rgb),0.25)',
            borderRadius: 14, padding: '24px 28px', marginBottom: 28,
          }}>
            <div style={{
              width: 48, height: 48, borderRadius: '50%', flexShrink: 0,
              background: 'rgba(var(--ok-rgb),0.15)', display: 'grid', placeItems: 'center',
            }}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--ok)" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 6L9 17l-5-5" />
              </svg>
            </div>
            <div>
              <div style={{ fontFamily: 'var(--ff)', fontWeight: 600, fontSize: 16, color: 'var(--text)', marginBottom: 4 }}>
                {addedName} added
              </div>
              <div style={{ fontFamily: 'var(--ff)', fontSize: 14, color: 'var(--muted)', lineHeight: 1.5 }}>
                Activation email sent to <strong style={{ color: 'var(--text)' }}>{addedEmail}</strong>.
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 12 }}>
            <button className="btn btn-s" onClick={() => router.push('/master/clinics')}>Back to Clinics</button>
            <button className="btn" onClick={resetForm}>Add Another Clinic</button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="m-content">
      <div className="m-h">
        <div>
          <button
            className="btn"
            style={{ marginBottom: 12, fontSize: 13, display: 'flex', alignItems: 'center', gap: 6 }}
            onClick={() => router.push('/master/clinics')}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
              <polyline points="15 18 9 12 15 6" />
            </svg>
            Back to Clinics
          </button>
          <h2>Add Clinic</h2>
          <div className="sub">Manually register a clinic and send them an activation link.</div>
        </div>
      </div>

      {error && (
        <div style={{
          background: 'rgba(var(--err-rgb),0.10)', border: '1px solid rgba(var(--err-rgb),0.25)',
          borderRadius: 10, padding: '12px 16px', fontFamily: 'var(--ff)', fontSize: 13,
          color: 'var(--err)', marginBottom: 24, maxWidth: 700,
        }}>
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} noValidate style={{ maxWidth: 700 }}>

        {/* ── Section 1: Clinic information ─────────────────────────────── */}
        <SectionCard num={1} title="Clinic information" desc="Basic details about the facility and where it's located.">
          <div className="form-grid">
            <div className="field field-full">
              <label>Clinic / facility name <span style={{ color: 'var(--err)', marginLeft: 3 }}>*</span></label>
              <input className="input" type="text" placeholder="St Vincent's Hospital MRI Department"
                value={facilityName} onChange={e => setFacilityName(e.target.value)} autoFocus />
            </div>

            <CustomSelect label="Facility type" required value={facilityType} onChange={setFacilityType}
              options={FACILITY_TYPES} placeholder="Select type" />

            <CustomSelect label="Country" required value={facilityCountry} onChange={setFacilityCountry}
              options={COUNTRIES} placeholder="Select country" />

            <div className="field field-full">
              <label>Clinic address <span style={{ color: 'var(--err)', marginLeft: 3 }}>*</span></label>
              <input className="input" type="text" placeholder="123 Hospital Road, London W1A 1AA"
                value={facilityAddress} onChange={e => setFacilityAddress(e.target.value)} />
            </div>

            <div className="field">
              <label>City <span style={{ fontWeight: 400, opacity: .6 }}>(optional)</span></label>
              <input className="input" type="text" placeholder="London"
                value={facilityCity} onChange={e => setFacilityCity(e.target.value)} />
            </div>

            <div className="field">
              <label>Clinic phone <span style={{ fontWeight: 400, opacity: .6 }}>(optional)</span></label>
              <input className="input" type="tel" placeholder="+44 20 7123 4567"
                value={facilityPhone} onChange={e => setFacilityPhone(e.target.value)} />
            </div>

            <div className="field">
              <label>Number of MRI scanners <span style={{ fontWeight: 400, opacity: .6 }}>(optional)</span></label>
              <input className="input" type="number" min="0" placeholder="e.g. 3"
                value={mriCount} onChange={e => setMriCount(e.target.value)} />
            </div>

            <div className="field">
              <label>Staff using Implant ID <span style={{ fontWeight: 400, opacity: .6 }}>(optional)</span></label>
              <input className="input" type="number" min="1" placeholder="e.g. 12"
                value={staffCount} onChange={e => setStaffCount(e.target.value)} />
            </div>
          </div>
        </SectionCard>

        {/* ── Section 2: Primary contact ────────────────────────────────── */}
        <SectionCard num={2} title="Primary contact" desc="Who will receive the activation link and manage this account?">
          <div className="form-grid">
            <div className="field">
              <label>Full name <span style={{ color: 'var(--err)', marginLeft: 3 }}>*</span></label>
              <input className="input" type="text" placeholder="Dr Jane Smith"
                value={contactName} onChange={e => setContactName(e.target.value)} />
            </div>

            <div className="field">
              <label>Job title <span style={{ fontWeight: 400, opacity: .6 }}>(optional)</span></label>
              <input className="input" type="text" placeholder="MRI Lead Radiographer"
                value={jobTitle} onChange={e => setJobTitle(e.target.value)} />
            </div>

            <div className="field">
              <label>Work email <span style={{ color: 'var(--err)', marginLeft: 3 }}>*</span></label>
              <input className="input" type="email" placeholder="jane.smith@hospital.nhs.uk"
                value={contactEmail} onChange={e => setContactEmail(e.target.value)} />
            </div>

            <div className="field">
              <label>Direct phone <span style={{ fontWeight: 400, opacity: .6 }}>(optional)</span></label>
              <input className="input" type="tel" placeholder="+44 20 7000 0000"
                value={contactPhone} onChange={e => setContactPhone(e.target.value)} />
            </div>
          </div>
        </SectionCard>

        {/* ── Section 3: Accreditation ─────────────────────────────────── */}
        <SectionCard num={3} title="Accreditation" optional desc="Upload the registration certificate or proof of accreditation if available. PDF, JPG or PNG — max 10 MB.">
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.jpg,.jpeg,.png"
            onChange={handleFileChange}
            style={{ display: 'none' }}
            aria-label="Upload accreditation document"
          />
          <div
            role="button"
            tabIndex={0}
            aria-label="Upload accreditation document — click or drag and drop"
            onClick={() => fileInputRef.current?.click()}
            onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') fileInputRef.current?.click() }}
            onDragOver={e => { e.preventDefault(); setDragOver(true) }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleFileDrop}
            style={{
              border: `2px dashed ${dragOver ? 'var(--accent)' : 'var(--border2, var(--border))'}`,
              borderRadius: 12, padding: '28px 20px', textAlign: 'center', cursor: 'pointer',
              background: dragOver ? 'rgba(var(--accent-rgb),0.06)' : 'transparent',
              transition: 'all 0.15s',
            }}
          >
            {accreditationFile ? (
              <>
                <svg viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2" width="28" height="28" style={{ display: 'block', margin: '0 auto 10px' }}>
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/>
                </svg>
                <p style={{ fontFamily: 'var(--ff)', fontSize: 14, fontWeight: 500, color: 'var(--accent-deep)', margin: '0 0 4px' }}>{accreditationFile.name}</p>
                <p style={{ fontFamily: 'var(--ff)', fontSize: 12, color: 'var(--muted)', margin: 0 }}>Click to change file</p>
              </>
            ) : (
              <>
                <svg viewBox="0 0 24 24" fill="none" stroke="var(--muted)" strokeWidth="2" width="28" height="28" style={{ display: 'block', margin: '0 auto 10px' }}>
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>
                </svg>
                <p style={{ fontFamily: 'var(--ff)', fontSize: 14, color: 'var(--muted)', margin: '0 0 4px' }}>Click to upload or drag and drop</p>
                <p style={{ fontFamily: 'var(--ff)', fontSize: 12, color: 'var(--muted2)', margin: 0 }}>PDF, JPG or PNG — max 10 MB</p>
              </>
            )}
          </div>
        </SectionCard>

        {/* ── Section 4: Regulatory body ───────────────────────────────── */}
        <SectionCard num={4} title="Regulatory body" optional desc="The facility's regulatory or accreditation body and registration number.">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <CustomSelect label="Regulatory / accreditation body" value={regulatoryBody}
              onChange={setRegulatoryBody} options={REGULATORY_BODIES} placeholder="Select body" />
            <div className="field">
              <label>Registration / licence number</label>
              <input className="input" type="text" placeholder="e.g. CQC-12345"
                value={registrationNum} onChange={e => setRegistrationNum(e.target.value)} />
            </div>
          </div>
        </SectionCard>

        {/* ── Section 5: Services & specialisms ────────────────────────── */}
        <SectionCard num={5} title="Services & specialisms" optional desc="Select the implant types and services this clinic handles. These appear as filters on the patient-facing Find a Clinic page.">
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
            {SERVICES.map(opt => {
              const isOn = services.includes(opt)
              return (
                <button
                  key={opt}
                  type="button"
                  aria-pressed={isOn}
                  onClick={() => setServices(prev => isOn ? prev.filter(s => s !== opt) : [...prev, opt])}
                  style={{
                    fontFamily: 'var(--ff)', fontSize: 13, fontWeight: isOn ? 600 : 400,
                    padding: '7px 14px', borderRadius: 20, cursor: 'pointer',
                    border: `1.5px solid ${isOn ? 'var(--accent)' : 'var(--border)'}`,
                    background: isOn ? 'rgba(var(--accent-rgb),0.10)' : 'transparent',
                    color: isOn ? 'var(--accent-deep)' : 'var(--muted)',
                    transition: 'all 0.15s',
                  }}
                >
                  {opt}
                </button>
              )
            })}
          </div>
        </SectionCard>

        {/* ── Section 6: Additional information ───────────────────────── */}
        <SectionCard num={6} title="Additional information" optional desc="Anything else relevant to this clinic's setup or account.">
          <textarea
            className="input"
            rows={4}
            placeholder="e.g. specialist implant types managed, any notes for the account setup…"
            value={additionalInfo}
            onChange={e => setAdditionalInfo(e.target.value)}
            style={{ resize: 'vertical', minHeight: 100 }}
          />
        </SectionCard>

        <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
          <button type="button" className="btn btn-lg" onClick={() => router.push('/master/clinics')} disabled={loading}>
            Cancel
          </button>
          <button type="submit" className="btn btn-s btn-lg" disabled={loading} style={{ flex: 1, justifyContent: 'center' }}>
            {loading ? 'Adding clinic…' : 'Add clinic & send activation →'}
          </button>
        </div>
      </form>
    </div>
  )
}
