'use client'

import { useState, useMemo } from 'react'
import { MANUFACTURERS as MFR_DATA, ALL_DEVICES } from '@/data/devices'

function getAbbr(name: string): string {
  const words = name.split(/[\s(/]+/).filter(Boolean)
  if (words.length === 1) return name.slice(0, 3).toUpperCase()
  return words.slice(0, 3).map(w => w[0]).join('').toUpperCase()
}

function getFlag(country: string): string {
  if (country.includes('Australia')) return '🇦🇺'
  if (country.includes('Germany'))   return '🇩🇪'
  if (country.includes('Japan'))     return '🇯🇵'
  return '🇺🇸'
}

function getCountry(c: string): string {
  if (c.includes('Ireland')) return 'Ireland / USA'
  if (c.includes('Australia')) return 'Australia'
  if (c.includes('Germany')) return 'Germany'
  return 'United States'
}

function toSlug(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
}

const VerifiedBadge = () => (
  <span className="mfr-verified">
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 11, height: 11 }} aria-hidden="true">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      <path d="m9 12 2 2 4-4" />
    </svg>
    Verified
  </span>
)

export default function ManufacturersClient() {
  const [search, setSearch] = useState('')

  const manufacturers = useMemo(() => {
    return MFR_DATA.map(m => {
      const mfrDevices = ALL_DEVICES.filter(d => d.manufacturer_id === m.manufacturer_id)
      const deviceNames = mfrDevices.slice(0, 3).map(d => d.device_name)
      return {
        id:           m.manufacturer_id,
        slug:         toSlug(m.common_name),
        abbr:         getAbbr(m.common_name),
        name:         m.common_name,
        flag:         getFlag(m.country_of_origin),
        country:      getCountry(m.country_of_origin),
        deviceCount:  mfrDevices.length,
        devices:      deviceNames,
        verified:     m.fda_registered,
        contactEmail: m.contact_email,
        website:      m.website,
      }
    })
  }, [])

  const filtered = manufacturers.filter(m =>
    !search.trim() ||
    m.name.toLowerCase().includes(search.toLowerCase()) ||
    m.devices.some(d => d.toLowerCase().includes(search.toLowerCase()))
  )

  return (
    <div className="mfr-page">
      <div className="ey">Device manufacturers</div>
      <h2 style={{ fontSize: 'clamp(20px,2vw,26px)', letterSpacing: '-.025em', marginTop: 6 }}>
        {manufacturers.length} manufacturers in the Implant ID database
      </h2>
      <p style={{ color: 'var(--muted)', fontSize: 14, marginTop: 6, maxWidth: 560, lineHeight: 1.5 }}>
        Browse every manufacturer in the database. Tap a card to see their full device catalogue and MRI safety documentation.
      </p>
      <div className="mfr-search-wrap">
        <div className="mfr-search">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
            <circle cx="11" cy="11" r="7" /><path d="m21 21-4.3-4.3" />
          </svg>
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search manufacturers or devices…"
            aria-label="Search manufacturers"
          />
          {search && (
            <button className="mfr-clear" onClick={() => setSearch('')} aria-label="Clear search">✕</button>
          )}
        </div>
      </div>

      {filtered.length > 0 ? (
        <div className="mfr-grid">
          {filtered.map(m => (
            <div key={m.id} className="mfr-card">
              <div className="mfr-card-top">
                <div className="mfr-av">{m.abbr}</div>
                <div className="mfr-card-info">
                  <div className="mfr-card-name">{m.name}</div>
                  <div className="mfr-card-meta">
                    {m.flag} {m.country} · {m.deviceCount} device{m.deviceCount !== 1 ? 's' : ''} on Implant ID
                  </div>
                </div>
                {m.verified ? <VerifiedBadge /> : (
                  <span className="mfr-unverified">Legacy</span>
                )}
              </div>
              <div className="mfr-devices">{m.devices.join(' · ')}</div>
              <div className="mfr-card-foot">
                <a href={`/clinics/devices?mfr=${m.slug}`} className="btn btn-s">
                  View devices →
                </a>
                {m.contactEmail ? (
                  <a
                    href={`mailto:${m.contactEmail}`}
                    className="mfr-contact"
                    aria-label={`Email ${m.name}`}
                  >
                    Contact
                  </a>
                ) : m.website ? (
                  <a
                    href={m.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mfr-contact"
                    aria-label={`Visit ${m.name} website`}
                  >
                    Website
                  </a>
                ) : (
                  <span className="mfr-contact" style={{ color: 'var(--muted2)', cursor: 'default' }}>
                    No contact
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="mfr-empty">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ width: 32, height: 32, color: 'var(--muted2)' }} aria-hidden="true">
            <circle cx="11" cy="11" r="7" /><path d="m21 21-4.3-4.3" />
          </svg>
          <p>No manufacturers match your search.</p>
        </div>
      )}
    </div>
  )
}
