'use client'

import { useState } from 'react'

type ActionType = 'approve' | 'reject'
interface ConfirmAction {
  type: ActionType
}

interface ClinicData {
  name: string
  initials: string
  status: string
  contact: string
  email: string
  phone: string
  country: string
  address: string
  type: string
  specialisms: string[]
  staffCount: number
  regNumber: string
  regLabel: string
  website: string
  submitted: string
  notes: string
  docName: string
}

const clinicData: Record<string, ClinicData> = {
  'harley-street': {
    name: 'Harley Street Implant Centre',
    initials: 'HS',
    status: 'pending',
    contact: 'Dr. Ravi Patel',
    email: 'dr.patel@harleyimplants.co.uk',
    phone: '+44 20 7123 4567',
    country: 'United Kingdom',
    address: '82 Harley Street, London, W1G 7HJ',
    type: 'Private Hospital',
    specialisms: ['Orthopaedics', 'Spinal Surgery', 'Joint Replacement'],
    staffCount: 3,
    regNumber: 'CQC-1234567',
    regLabel: 'CQC Number',
    website: 'harleyimplants.co.uk',
    submitted: '24 May 2026',
    notes: 'Well-established private clinic. References checked. CQC registration current.',
    docName: 'Harley_Street_Application_Form.pdf',
  },
  'sydney-cardiac': {
    name: 'Sydney Cardiac Devices',
    initials: 'SC',
    status: 'pending',
    contact: 'Dr. James Wu',
    email: 'admin@sydneycardiac.au',
    phone: '+61 2 9123 4567',
    country: 'Australia',
    address: '45 Macquarie Street, Sydney NSW 2000',
    type: 'Specialist Clinic',
    specialisms: ['Cardiology', 'Cardiac Devices'],
    staffCount: 2,
    regNumber: 'AHPRA-MED0001234',
    regLabel: 'AHPRA Number',
    website: 'sydneycardiac.com.au',
    submitted: '22 May 2026',
    notes: 'First cardiac device clinic in AU to apply. Strong referral from Medtronic.',
    docName: 'Sydney_Cardiac_Application_Pack.pdf',
  },
  'glasgow-knee': {
    name: 'Glasgow Knee Clinic',
    initials: 'GK',
    status: 'rejected',
    contact: 'Mr. Alistair Drummond',
    email: 'admin@glasgowknee.co.uk',
    phone: '+44 141 556 7890',
    country: 'United Kingdom',
    address: '14 West George Street, Glasgow, G2 1DA',
    type: 'Private Clinic',
    specialisms: ['Orthopaedics', 'Knee Surgery'],
    staffCount: 2,
    regNumber: 'CQC-9876543',
    regLabel: 'CQC Number',
    website: 'glasgowknee.co.uk',
    submitted: '10 May 2026',
    notes: 'CQC registration documentation was incomplete. Applicant informed to resubmit with updated docs.',
    docName: 'Glasgow_Knee_Application.pdf',
  },
  'cape-neuro': {
    name: 'Cape Town Neurology Associates',
    initials: 'CT',
    status: 'rejected',
    contact: 'Dr. Amina Okafor',
    email: 'info@capeneuro.co.za',
    phone: '+27 21 555 1234',
    country: 'South Africa',
    address: '22 Loop Street, Cape Town 8001, South Africa',
    type: 'Specialist Clinic',
    specialisms: ['Neurology', 'Spinal Surgery'],
    staffCount: 4,
    regNumber: 'HPCSA-MED-44512',
    regLabel: 'HPCSA Number',
    website: 'capeneuro.co.za',
    submitted: '5 May 2026',
    notes: 'South Africa is currently outside supported regions. Applicant advised to reapply when regional rollout occurs.',
    docName: 'CapeTown_Neuro_Application.pdf',
  },
}

function statusColour(status: string) {
  if (status === 'pending') return '#d97706'
  if (status === 'rejected') return 'var(--err)'
  return 'var(--ok)'
}

export default function ApplicationClient({ id }: { id: string }) {
  const [confirmAction, setConfirmAction] = useState<ConfirmAction | null>(null)
  const [confirming, setConfirming] = useState(false)
  const [confirmed, setConfirmed] = useState(false)

  function openConfirm(type: ActionType) {
    setConfirmAction({ type })
    setConfirming(false)
    setConfirmed(false)
  }

  function closeConfirm() {
    setConfirmAction(null)
    setConfirming(false)
    setConfirmed(false)
  }

  async function handleConfirm() {
    setConfirming(true)
    await new Promise(r => setTimeout(r, 800))
    setConfirmed(true)
    await new Promise(r => setTimeout(r, 900))
    closeConfirm()
  }

  const clinic = clinicData[id]

  if (!clinic) {
    return (
      <div className="m-content">
        <a href="/master/clinics" className="m-back">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="15 18 9 12 15 6"/>
          </svg>
          Back to Clinics
        </a>
        <div className="m-h">
          <div>
            <h2>Clinic Detail</h2>
            <div className="sub">Clinic ID: {id}</div>
          </div>
        </div>
        <p style={{ color: 'var(--muted)', fontFamily: 'var(--fb)', fontSize: 14 }}>
          Full clinic detail view coming soon.
        </p>
      </div>
    )
  }

  return (
    <div className="m-content">
      <a href="/master/clinics" className="m-back">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <polyline points="15 18 9 12 15 6"/>
        </svg>
        Back to Clinics
      </a>

      {/* ── Profile header ── */}
      <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 16, padding: '28px 32px', marginBottom: 20, display: 'flex', alignItems: 'flex-start', gap: 22 }}>
        <div style={{ width: 64, height: 64, borderRadius: 16, background: 'color-mix(in srgb,var(--accent) 14%,transparent)', border: '1.5px solid color-mix(in srgb,var(--accent) 28%,transparent)', display: 'grid', placeItems: 'center', flexShrink: 0 }}>
          <span style={{ fontFamily: 'var(--ff)', fontWeight: 700, fontSize: 22, color: 'var(--accent)' }}>{clinic.initials}</span>
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <h2 style={{ marginBottom: 6 }}>{clinic.name}</h2>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontFamily: 'var(--ff)', fontSize: 12, fontWeight: 600, color: statusColour(clinic.status), background: `color-mix(in srgb,${statusColour(clinic.status)} 10%,transparent)`, border: `1px solid color-mix(in srgb,${statusColour(clinic.status)} 25%,transparent)`, borderRadius: 8, padding: '3px 10px', textTransform: 'uppercase', letterSpacing: '.5px' }}>
              {clinic.status === 'pending' && <span style={{ width: 6, height: 6, borderRadius: '50%', background: statusColour(clinic.status), display: 'inline-block' }} />}
              {clinic.status.charAt(0).toUpperCase() + clinic.status.slice(1)}
            </span>
            <span style={{ fontFamily: 'var(--fb)', fontSize: 13, color: 'var(--muted)' }}>Application submitted {clinic.submitted}</span>
            <span style={{ fontFamily: 'var(--fb)', fontSize: 13, color: 'var(--muted)' }}>{clinic.country}</span>
          </div>
        </div>
        {clinic.status === 'pending' && (
          <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
            <button className="btn btn-s" onClick={() => openConfirm('approve')}>Approve</button>
            <button className="btn btn-danger" onClick={() => openConfirm('reject')}>Reject</button>
          </div>
        )}
      </div>

      {/* ── Two-column info ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>

        {/* Contact */}
        <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 14, padding: '20px 22px' }}>
          <div style={{ fontFamily: 'var(--ff)', fontSize: 11, fontWeight: 700, letterSpacing: '1px', textTransform: 'uppercase', color: 'var(--muted2)', marginBottom: 14 }}>Contact</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div>
              <div style={{ fontFamily: 'var(--ff)', fontSize: 11, color: 'var(--muted2)', marginBottom: 2 }}>Name</div>
              <div style={{ fontFamily: 'var(--fb)', fontSize: 14, color: 'var(--text)', fontWeight: 500 }}>{clinic.contact}</div>
            </div>
            <div>
              <div style={{ fontFamily: 'var(--ff)', fontSize: 11, color: 'var(--muted2)', marginBottom: 2 }}>Email</div>
              <div style={{ fontFamily: 'var(--fb)', fontSize: 14, color: 'var(--accent)' }}>{clinic.email}</div>
            </div>
            <div>
              <div style={{ fontFamily: 'var(--ff)', fontSize: 11, color: 'var(--muted2)', marginBottom: 2 }}>Phone</div>
              <div style={{ fontFamily: 'var(--fb)', fontSize: 14, color: 'var(--text)' }}>{clinic.phone}</div>
            </div>
            <div>
              <div style={{ fontFamily: 'var(--ff)', fontSize: 11, color: 'var(--muted2)', marginBottom: 2 }}>Website</div>
              <div style={{ fontFamily: 'var(--fb)', fontSize: 14, color: 'var(--accent)' }}>{clinic.website}</div>
            </div>
          </div>
        </div>

        {/* Clinic details */}
        <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 14, padding: '20px 22px' }}>
          <div style={{ fontFamily: 'var(--ff)', fontSize: 11, fontWeight: 700, letterSpacing: '1px', textTransform: 'uppercase', color: 'var(--muted2)', marginBottom: 14 }}>Clinic Details</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div>
              <div style={{ fontFamily: 'var(--ff)', fontSize: 11, color: 'var(--muted2)', marginBottom: 2 }}>Type</div>
              <div style={{ fontFamily: 'var(--fb)', fontSize: 14, color: 'var(--text)' }}>{clinic.type}</div>
            </div>
            <div>
              <div style={{ fontFamily: 'var(--ff)', fontSize: 11, color: 'var(--muted2)', marginBottom: 2 }}>Specialisms</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginTop: 2 }}>
                {clinic.specialisms.map(s => (
                  <span key={s} style={{ fontFamily: 'var(--ff)', fontSize: 11.5, fontWeight: 500, background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 7, padding: '3px 9px', color: 'var(--text)' }}>{s}</span>
                ))}
              </div>
            </div>
            <div>
              <div style={{ fontFamily: 'var(--ff)', fontSize: 11, color: 'var(--muted2)', marginBottom: 2 }}>Staff Count</div>
              <div style={{ fontFamily: 'var(--fb)', fontSize: 14, color: 'var(--text)' }}>{clinic.staffCount} clinician{clinic.staffCount !== 1 ? 's' : ''}</div>
            </div>
            <div>
              <div style={{ fontFamily: 'var(--ff)', fontSize: 11, color: 'var(--muted2)', marginBottom: 2 }}>Address</div>
              <div style={{ fontFamily: 'var(--fb)', fontSize: 14, color: 'var(--text)', lineHeight: 1.5 }}>{clinic.address}</div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Registration ── */}
      <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 14, padding: '20px 22px', marginBottom: 16 }}>
        <div style={{ fontFamily: 'var(--ff)', fontSize: 11, fontWeight: 700, letterSpacing: '1px', textTransform: 'uppercase', color: 'var(--muted2)', marginBottom: 14 }}>Registration &amp; Compliance</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <div>
            <div style={{ fontFamily: 'var(--ff)', fontSize: 11, color: 'var(--muted2)', marginBottom: 2 }}>{clinic.regLabel}</div>
            <div style={{ fontFamily: 'var(--fb)', fontSize: 14, color: 'var(--text)', fontWeight: 500 }}>{clinic.regNumber}</div>
          </div>
          <div>
            <div style={{ fontFamily: 'var(--ff)', fontSize: 11, color: 'var(--muted2)', marginBottom: 2 }}>Country</div>
            <div style={{ fontFamily: 'var(--fb)', fontSize: 14, color: 'var(--text)' }}>{clinic.country}</div>
          </div>
        </div>
      </div>

      {/* ── Application document ── */}
      <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 14, padding: '20px 22px', marginBottom: 16 }}>
        <div style={{ fontFamily: 'var(--ff)', fontSize: 11, fontWeight: 700, letterSpacing: '1px', textTransform: 'uppercase', color: 'var(--muted2)', marginBottom: 14 }}>Application Document</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 10, padding: '14px 16px' }}>
          <div style={{ width: 38, height: 38, borderRadius: 9, background: 'color-mix(in srgb,var(--err) 10%,transparent)', border: '1px solid color-mix(in srgb,var(--err) 22%,transparent)', display: 'grid', placeItems: 'center', flexShrink: 0 }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--err)" strokeWidth="1.7">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
              <polyline points="14 2 14 8 20 8"/>
              <line x1="16" y1="13" x2="8" y2="13"/>
              <line x1="16" y1="17" x2="8" y2="17"/>
              <polyline points="10 9 9 9 8 9"/>
            </svg>
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontFamily: 'var(--ff)', fontSize: 13.5, fontWeight: 600, color: 'var(--text)', marginBottom: 2 }}>{clinic.docName}</div>
            <div style={{ fontFamily: 'var(--fb)', fontSize: 12, color: 'var(--muted)' }}>PDF · Submitted {clinic.submitted}</div>
          </div>
          <button className="btn" style={{ flexShrink: 0, display: 'flex', alignItems: 'center', gap: 6, fontSize: 13 }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
              <polyline points="7 10 12 15 17 10"/>
              <line x1="12" y1="15" x2="12" y2="3"/>
            </svg>
            Download
          </button>
        </div>
      </div>

      {/* ── Notes ── */}
      {clinic.notes && (
        <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 14, padding: '20px 22px', marginBottom: 24 }}>
          <div style={{ fontFamily: 'var(--ff)', fontSize: 11, fontWeight: 700, letterSpacing: '1px', textTransform: 'uppercase', color: 'var(--muted2)', marginBottom: 10 }}>Notes</div>
          <div style={{ fontFamily: 'var(--fb)', fontSize: 14, color: 'var(--text)', lineHeight: 1.65 }}>{clinic.notes}</div>
        </div>
      )}

      {/* ── Confirmation modal ── */}
      {confirmAction && (
        <div className="logout-back open" onClick={closeConfirm}>
          <div className="logout-modal" onClick={e => e.stopPropagation()}>
            <div className="logout-body">
              {confirmAction.type === 'approve' ? (
                <>
                  <div style={{ width: 44, height: 44, borderRadius: '50%', background: 'color-mix(in srgb,var(--ok) 12%,transparent)', display: 'grid', placeItems: 'center', margin: '0 auto 14px' }}>
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--ok)" strokeWidth="2">
                      <path d="M20 6L9 17l-5-5"/>
                    </svg>
                  </div>
                  <h3>Approve clinic?</h3>
                  <p><strong>{clinic.name}</strong></p>
                  <p>This will create their account and send them a welcome email.</p>
                </>
              ) : (
                <>
                  <div style={{ width: 44, height: 44, borderRadius: '50%', background: 'color-mix(in srgb,var(--err) 12%,transparent)', display: 'grid', placeItems: 'center', margin: '0 auto 14px' }}>
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--err)" strokeWidth="2">
                      <line x1="18" y1="6" x2="6" y2="18"/>
                      <line x1="6" y1="6" x2="18" y2="18"/>
                    </svg>
                  </div>
                  <h3>Reject application?</h3>
                  <p><strong>{clinic.name}</strong></p>
                  <p>The clinic will be notified by email.</p>
                </>
              )}
            </div>
            <div className="logout-actions">
              <button className="btn" onClick={closeConfirm} disabled={confirming}>Cancel</button>
              {confirmAction.type === 'approve' ? (
                <button className="btn btn-s" onClick={handleConfirm} disabled={confirming}>
                  {confirmed ? 'Approved!' : confirming ? 'Approving…' : 'Approve'}
                </button>
              ) : (
                <button className="btn btn-danger" onClick={handleConfirm} disabled={confirming}>
                  {confirmed ? 'Rejected' : confirming ? 'Rejecting…' : 'Reject'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
