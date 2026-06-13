'use client'

import { useState } from 'react'

const MANUFACTURERS = [
  {
    id: 'medtronic', abbr: 'MDT', name: 'Medtronic',
    flag: '🇺🇸', country: 'United States', deviceCount: 3,
    devices: ['Azure XT DR', 'CapSureFix MRI', 'RestoreAdvanced'],
    verified: true,
  },
  {
    id: 'abbott', abbr: 'ABT', name: 'Abbott',
    flag: '🇺🇸', country: 'United States', deviceCount: 2,
    devices: ['Assurity MRI', 'Tendril STS'],
    verified: true,
  },
  {
    id: 'boston-scientific', abbr: 'BSc', name: 'Boston Scientific',
    flag: '🇺🇸', country: 'United States', deviceCount: 1,
    devices: ['Accolade MRI'],
    verified: true,
  },
  {
    id: 'biotronik', abbr: 'BIO', name: 'Biotronik',
    flag: '🇩🇪', country: 'Germany', deviceCount: 1,
    devices: ['Etrinsa 8 HF-T'],
    verified: true,
  },
  {
    id: 'cochlear', abbr: 'COC', name: 'Cochlear',
    flag: '🇦🇺', country: 'Australia', deviceCount: 1,
    devices: ['Nucleus Profile Plus'],
    verified: true,
  },
  {
    id: 'cook-medical', abbr: 'COK', name: 'Cook Medical',
    flag: '🇺🇸', country: 'United States', deviceCount: 1,
    devices: ['Zilver PTX'],
    verified: true,
  },
  {
    id: 'edwards', abbr: 'EDW', name: 'Edwards Lifesciences',
    flag: '🇺🇸', country: 'United States', deviceCount: 1,
    devices: ['Pre-6000 series (legacy)'],
    verified: false,
  },
]

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

  const filtered = MANUFACTURERS.filter(m =>
    !search.trim() ||
    m.name.toLowerCase().includes(search.toLowerCase()) ||
    m.devices.some(d => d.toLowerCase().includes(search.toLowerCase()))
  )

  return (
    <div className="m-content">
      <div className="mfr-header">
        <div>
          <div className="ey">Device manufacturers</div>
          <h2 style={{ fontSize: 'clamp(20px,2vw,26px)', letterSpacing: '-.025em', marginTop: 6 }}>
            {MANUFACTURERS.length} manufacturers verified on Implant ID
          </h2>
          <p style={{ color: 'var(--muted)', fontSize: 14, marginTop: 6, maxWidth: 520, lineHeight: 1.5 }}>
            Browse every manufacturer in the database. Tap a card to see their full device catalogue and MRI safety documentation.
          </p>
        </div>
        <div className="mfr-search-wrap">
          <div className="mfr-search">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <circle cx="11" cy="11" r="7" /><path d="m21 21-4.3-4.3" />
            </svg>
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search manufacturers…"
              aria-label="Search manufacturers"
            />
          </div>
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
                  <span className="mfr-unverified">Unverified</span>
                )}
              </div>
              <div className="mfr-devices">{m.devices.join(' · ')}</div>
              <div className="mfr-card-foot">
                <a href={`/clinics/library?mfr=${m.id}`} className="btn btn-s">
                  View devices →
                </a>
                <span className="mfr-contact">Contact</span>
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
