'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useMutation } from 'convex/react'
import { api } from '../../../../../convex/_generated/api'
import { CustomSelect } from '../../../../components/ui/CustomSelect'

const FACILITY_TYPES = [
  'Hospital — NHS / public',
  'Hospital — private',
  'Private clinic',
  'Radiology centre',
  'Cardiac centre',
  'Orthopaedic centre',
  'Neurology centre',
  'Other',
]

const COUNTRIES = [
  'United Kingdom', 'United States', 'Ireland', 'Australia', 'Canada',
  'Germany', 'France', 'Netherlands', 'Spain', 'Italy', 'Sweden', 'Norway',
  'Denmark', 'Switzerland', 'Belgium', 'Portugal', 'Poland', 'Austria',
  'New Zealand', 'South Africa', 'UAE', 'Singapore', 'Other',
]

function isValidEmail(e: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)
}

export default function AddClinicClient() {
  const router = useRouter()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const adminAddClinic = useMutation((api.clinics as any).adminAddClinic)

  const [name,        setName]        = useState('')
  const [type,        setType]        = useState('')
  const [address,     setAddress]     = useState('')
  const [city,        setCity]        = useState('')
  const [country,     setCountry]     = useState('')
  const [phone,       setPhone]       = useState('')
  const [contactName, setContactName] = useState('')
  const [email,       setEmail]       = useState('')
  const [loading,     setLoading]     = useState(false)
  const [error,       setError]       = useState('')
  const [done,        setDone]        = useState(false)
  const [addedEmail,  setAddedEmail]  = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim())         return setError('Enter the clinic name')
    if (!type)                return setError('Select a facility type')
    if (!address.trim())      return setError('Enter the address')
    if (!country)             return setError('Select a country')
    if (!contactName.trim())  return setError('Enter the contact name')
    if (!isValidEmail(email)) return setError('Enter a valid email address')

    setLoading(true)
    setError('')
    try {
      await adminAddClinic({
        clinicName:      name.trim(),
        contactName:     contactName.trim(),
        contactEmail:    email.trim().toLowerCase(),
        facilityType:    type,
        facilityAddress: address.trim(),
        facilityCountry: country,
        facilityCity:    city.trim() || undefined,
        facilityPhone:   phone.trim() || undefined,
      })
      setAddedEmail(email.trim().toLowerCase())
      setDone(true)
    } catch (err) {
      setError((err as { message?: string })?.message ?? 'Something went wrong — please try again')
    } finally {
      setLoading(false)
    }
  }

  if (done) {
    return (
      <div className="m-content">
        <div style={{ maxWidth: 560 }}>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 16,
            background: 'color-mix(in srgb, var(--ok) 8%, transparent)',
            border: '1px solid color-mix(in srgb, var(--ok) 25%, transparent)',
            borderRadius: 14, padding: '24px 28px', marginBottom: 28,
          }}>
            <div style={{
              width: 48, height: 48, borderRadius: '50%', flexShrink: 0,
              background: 'color-mix(in srgb, var(--ok) 15%, transparent)',
              display: 'grid', placeItems: 'center',
            }}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--ok)" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 6L9 17l-5-5" />
              </svg>
            </div>
            <div>
              <div style={{ fontFamily: 'var(--ff)', fontWeight: 600, fontSize: 16, color: 'var(--text)', marginBottom: 4 }}>
                Clinic added successfully
              </div>
              <div style={{ fontFamily: 'var(--ff)', fontSize: 14, color: 'var(--muted)', lineHeight: 1.5 }}>
                An activation email has been sent to <strong style={{ color: 'var(--text)' }}>{addedEmail}</strong>.
                They&apos;ll receive a link to set up their account.
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 12 }}>
            <button
              className="btn btn-s"
              onClick={() => router.push('/master/clinics')}
            >
              Back to Clinics
            </button>
            <button
              className="btn"
              onClick={() => {
                setName(''); setType(''); setAddress(''); setCity('')
                setCountry(''); setPhone(''); setContactName(''); setEmail('')
                setError(''); setDone(false); setAddedEmail('')
              }}
            >
              Add Another Clinic
            </button>
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
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 18 9 12 15 6" />
            </svg>
            Back to Clinics
          </button>
          <h2>Add Clinic</h2>
          <div className="sub">Manually add a clinic and send them an activation link.</div>
        </div>
      </div>

      <form onSubmit={handleSubmit} noValidate style={{ maxWidth: 560 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>

          {/* Facility details */}
          <div style={{
            background: 'var(--bg2)', border: '1px solid var(--border)',
            borderRadius: 14, padding: '22px 24px',
          }}>
            <div style={{ fontFamily: 'var(--ff)', fontSize: 11, fontWeight: 700, letterSpacing: '1.2px', textTransform: 'uppercase', color: 'var(--muted2)', marginBottom: 18 }}>
              Facility Details
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div className="field">
                <label>
                  Clinic / Facility name{' '}
                  <span style={{ color: 'var(--err)', marginLeft: 3 }}>*</span>
                </label>
                <input
                  className="input"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="St Vincent's Hospital MRI Department"
                  autoFocus
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <CustomSelect
                  label="Facility type"
                  required
                  value={type}
                  onChange={setType}
                  options={FACILITY_TYPES}
                  placeholder="Select…"
                />
                <CustomSelect
                  label="Country"
                  required
                  value={country}
                  onChange={setCountry}
                  options={COUNTRIES}
                  placeholder="Select…"
                />
              </div>

              <div className="field">
                <label>
                  Address{' '}
                  <span style={{ color: 'var(--err)', marginLeft: 3 }}>*</span>
                </label>
                <input
                  className="input"
                  value={address}
                  onChange={e => setAddress(e.target.value)}
                  placeholder="123 Hospital Road, London W1A 1AA"
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div className="field">
                  <label>City</label>
                  <input
                    className="input"
                    value={city}
                    onChange={e => setCity(e.target.value)}
                    placeholder="London"
                  />
                </div>
                <div className="field">
                  <label>Phone</label>
                  <input
                    className="input"
                    value={phone}
                    onChange={e => setPhone(e.target.value)}
                    placeholder="+44 20 7123 4567"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Primary contact */}
          <div style={{
            background: 'var(--bg2)', border: '1px solid var(--border)',
            borderRadius: 14, padding: '22px 24px',
          }}>
            <div style={{ fontFamily: 'var(--ff)', fontSize: 11, fontWeight: 700, letterSpacing: '1.2px', textTransform: 'uppercase', color: 'var(--muted2)', marginBottom: 18 }}>
              Primary Contact
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div className="field">
                <label>
                  Name{' '}
                  <span style={{ color: 'var(--err)', marginLeft: 3 }}>*</span>
                </label>
                <input
                  className="input"
                  value={contactName}
                  onChange={e => setContactName(e.target.value)}
                  placeholder="Dr Jane Smith"
                />
              </div>
              <div className="field">
                <label>
                  Email{' '}
                  <span style={{ color: 'var(--err)', marginLeft: 3 }}>*</span>
                </label>
                <input
                  className="input"
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="jane@hospital.nhs.uk"
                />
              </div>
            </div>
          </div>

          {/* Error banner */}
          {error && (
            <div style={{
              background: 'color-mix(in srgb, var(--err) 10%, transparent)',
              border: '1px solid color-mix(in srgb, var(--err) 25%, transparent)',
              borderRadius: 10, padding: '12px 16px',
              fontFamily: 'var(--ff)', fontSize: 13, color: 'var(--err)',
            }}>
              {error}
            </div>
          )}

          <div style={{ display: 'flex', gap: 12 }}>
            <button
              type="submit"
              className="btn btn-s btn-lg"
              disabled={loading}
            >
              {loading ? 'Adding…' : 'Add Clinic →'}
            </button>
            <button
              type="button"
              className="btn btn-lg"
              onClick={() => router.push('/master/clinics')}
              disabled={loading}
            >
              Cancel
            </button>
          </div>
        </div>
      </form>
    </div>
  )
}
