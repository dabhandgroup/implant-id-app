'use client'

import { useState } from 'react'

type Tab = 'all' | 'pending'
type ActionType = 'approve' | 'reject'
interface ConfirmAction {
  type: ActionType
  clinicId: string
  clinicName: string
}

const activeClinics = [
  { id: 'manchester-orthopaedic', name: 'Manchester Orthopaedic Centre', country: 'United Kingdom', status: 'active', staff: 4, patients: 38, joined: '12 Jan 2026' },
  { id: 'boston-spine', name: 'Boston Spine & Joint', country: 'United States', status: 'active', staff: 7, patients: 61, joined: '3 Feb 2026' },
  { id: 'auckland-joint', name: 'Auckland Joint Replacement', country: 'New Zealand', status: 'active', staff: 5, patients: 44, joined: '28 Mar 2026' },
  { id: 'dublin-spinal', name: 'Dublin Spinal Institute', country: 'Ireland', status: 'active', staff: 6, patients: 29, joined: '15 Apr 2026' },
]

const pendingClinics = [
  { id: 'harley-street', name: 'Harley Street Implant Centre', country: 'United Kingdom', submitted: '24 May 2026', email: 'dr.patel@harleyimplants.co.uk' },
  { id: 'sydney-cardiac', name: 'Sydney Cardiac Devices', country: 'Australia', submitted: '22 May 2026', email: 'admin@sydneycardiac.au' },
]

export default function ClinicsClient() {
  const [tab, setTab] = useState<Tab>('all')
  const [confirmAction, setConfirmAction] = useState<ConfirmAction | null>(null)
  const [confirming, setConfirming] = useState(false)
  const [confirmed, setConfirmed] = useState(false)

  function openConfirm(type: ActionType, clinicId: string, clinicName: string) {
    setConfirmAction({ type, clinicId, clinicName })
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

  return (
    <div className="m-content">
      <div className="m-h">
        <div>
          <h2>Clinics</h2>
          <div className="sub">All registered and active clinic accounts on the platform.</div>
        </div>
        <button className="btn btn-s">+ Add Clinic</button>
      </div>

      <div className="m-tabs">
        <button
          className={`m-tab${tab === 'all' ? ' active' : ''}`}
          onClick={() => setTab('all')}
        >
          All Clinics
        </button>
        <button
          className={`m-tab${tab === 'pending' ? ' active' : ''}`}
          onClick={() => setTab('pending')}
        >
          Pending Applications (2)
        </button>
      </div>

      {tab === 'all' && (
        <div className="m-tbl-wrap">
          <table className="m-tbl">
            <thead>
              <tr>
                <th>Clinic Name</th>
                <th>Country</th>
                <th>Status</th>
                <th>Staff</th>
                <th>Patients</th>
                <th>Joined</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {activeClinics.map(c => (
                <tr key={c.id}>
                  <td>{c.name}</td>
                  <td>{c.country}</td>
                  <td><span className="m-status active">Active</span></td>
                  <td>{c.staff}</td>
                  <td>{c.patients}</td>
                  <td>{c.joined}</td>
                  <td style={{ display: 'flex', gap: 6 }}>
                    <a href={`/master/clinics/${c.id}`} className="m-act">View</a>
                    <button className="m-act danger">Suspend</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {tab === 'pending' && (
        <div className="m-tbl-wrap">
          <table className="m-tbl">
            <thead>
              <tr>
                <th>Clinic Name</th>
                <th>Country</th>
                <th>Contact Email</th>
                <th>Submitted</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {pendingClinics.map(c => (
                <tr key={c.id}>
                  <td>{c.name}</td>
                  <td>{c.country}</td>
                  <td>{c.email}</td>
                  <td>{c.submitted}</td>
                  <td style={{ display: 'flex', gap: 6 }}>
                    <a href={`/master/clinics/${c.id}`} className="m-act">Review Application</a>
                    <button className="m-act approve" onClick={() => openConfirm('approve', c.id, c.name)}>Approve</button>
                    <button className="m-act reject" onClick={() => openConfirm('reject', c.id, c.name)}>Reject</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
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
                  <p><strong>{confirmAction.clinicName}</strong></p>
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
                  <p><strong>{confirmAction.clinicName}</strong></p>
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
