'use client'

import { useState } from 'react'

type ActionType = 'approve' | 'reject'
interface ConfirmAction {
  type: ActionType
}

interface ClinicData {
  name: string
  status: string
  contact: string
  email: string
  phone: string
  country: string
  address: string
  type: string
  specialisms: string[]
  staffCount: number
  cqcNumber: string
  website: string
  submitted: string
  notes: string
}

const clinicData: Record<string, ClinicData> = {
  'harley-street': {
    name: 'Harley Street Implant Centre',
    status: 'pending',
    contact: 'Dr. Ravi Patel',
    email: 'dr.patel@harleyimplants.co.uk',
    phone: '+44 20 7123 4567',
    country: 'United Kingdom',
    address: '82 Harley Street, London, W1G 7HJ',
    type: 'Private Hospital',
    specialisms: ['Orthopaedics', 'Spinal Surgery', 'Joint Replacement'],
    staffCount: 3,
    cqcNumber: 'CQC-1234567',
    website: 'harleyimplants.co.uk',
    submitted: '24 May 2026',
    notes: 'Well-established private clinic. References checked. CQC registration current.',
  },
  'sydney-cardiac': {
    name: 'Sydney Cardiac Devices',
    status: 'pending',
    contact: 'Dr. James Wu',
    email: 'admin@sydneycardiac.au',
    phone: '+61 2 9123 4567',
    country: 'Australia',
    address: '45 Macquarie Street, Sydney NSW 2000',
    type: 'Specialist Clinic',
    specialisms: ['Cardiology', 'Cardiac Devices'],
    staffCount: 2,
    cqcNumber: 'AHPRA-MED0001234',
    website: 'sydneycardiac.com.au',
    submitted: '22 May 2026',
    notes: 'First cardiac device clinic in AU to apply. Strong referral from Medtronic.',
  },
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

      <div className="m-h">
        <div>
          <h2>{clinic.name}</h2>
          <div className="sub" style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 6 }}>
            <span className={`m-status ${clinic.status}`}>{clinic.status.charAt(0).toUpperCase() + clinic.status.slice(1)}</span>
            <span>Submitted {clinic.submitted}</span>
          </div>
        </div>
        {clinic.status === 'pending' && (
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn btn-s" onClick={() => openConfirm('approve')}>Approve</button>
            <button className="btn btn-danger" onClick={() => openConfirm('reject')}>Reject</button>
          </div>
        )}
      </div>

      <div className="m-info-grid">
        <div className="m-info-card">
          <div className="k">Contact Name</div>
          <div className="v">{clinic.contact}</div>
        </div>
        <div className="m-info-card">
          <div className="k">Email</div>
          <div className="v">{clinic.email}</div>
        </div>
        <div className="m-info-card">
          <div className="k">Phone</div>
          <div className="v">{clinic.phone}</div>
        </div>
        <div className="m-info-card">
          <div className="k">Country</div>
          <div className="v">{clinic.country}</div>
        </div>
        <div className="m-info-card" style={{ gridColumn: '1 / -1' }}>
          <div className="k">Address</div>
          <div className="v">{clinic.address}</div>
        </div>
        <div className="m-info-card">
          <div className="k">Clinic Type</div>
          <div className="v">{clinic.type}</div>
        </div>
        <div className="m-info-card">
          <div className="k">Staff Count</div>
          <div className="v">{clinic.staffCount}</div>
        </div>
        <div className="m-info-card">
          <div className="k">Registration Number</div>
          <div className="v">{clinic.cqcNumber}</div>
        </div>
        <div className="m-info-card">
          <div className="k">Website</div>
          <div className="v">{clinic.website}</div>
        </div>
        <div className="m-info-card" style={{ gridColumn: '1 / -1' }}>
          <div className="k">Specialisms</div>
          <div className="v">{clinic.specialisms.join(', ')}</div>
        </div>
      </div>

      {clinic.notes && (
        <div className="m-info-card" style={{ marginBottom: 24 }}>
          <div className="k">Notes</div>
          <div className="v" style={{ lineHeight: 1.6 }}>{clinic.notes}</div>
        </div>
      )}

      {/* Confirmation modal */}
      {confirmAction && (
        <>
          <div className="logout-back open" onClick={closeConfirm} />
          <div className="logout-modal open">
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
        </>
      )}
    </div>
  )
}
