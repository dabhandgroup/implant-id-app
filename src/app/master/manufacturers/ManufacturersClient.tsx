'use client'

import { useState } from 'react'

interface ConfirmAction {
  mfrId: string
  mfrName: string
}

const manufacturers = [
  { id: 'medtronic', name: 'Medtronic plc', contact: 'uk@medtronic.com', country: 'Ireland', status: 'active', devices: 312, joined: '10 Jan 2026' },
  { id: 'zimmer-biomet', name: 'Zimmer Biomet', contact: 'data@zimmerbiomet.com', country: 'United States', status: 'active', devices: 487, joined: '14 Jan 2026' },
  { id: 'stryker', name: 'Stryker Orthopaedics', contact: 'catalogue@stryker.com', country: 'United States', status: 'active', devices: 214, joined: '20 Feb 2026' },
  { id: 'cochlear', name: 'Cochlear Ltd', contact: 'implantid@cochlear.com', country: 'Australia', status: 'pending', devices: 0, joined: '18 May 2026' },
  { id: 'acumed', name: 'Acumed Ltd', contact: 'accounts@acumed.net', country: 'United Kingdom', status: 'pending', devices: 0, joined: '21 May 2026' },
]

export default function ManufacturersClient() {
  const [confirmAction, setConfirmAction] = useState<ConfirmAction | null>(null)
  const [confirming, setConfirming] = useState(false)
  const [confirmed, setConfirmed] = useState(false)

  function openConfirm(mfrId: string, mfrName: string) {
    setConfirmAction({ mfrId, mfrName })
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
          <h2>Manufacturers</h2>
          <div className="sub">Device manufacturers with access to the Implant ID platform catalogue.</div>
        </div>
        <button className="btn btn-s">+ Invite Manufacturer</button>
      </div>

      <div className="m-tbl-wrap">
        <table className="m-tbl">
          <thead>
            <tr>
              <th>Company</th>
              <th>Contact</th>
              <th>Country</th>
              <th>Status</th>
              <th>Devices</th>
              <th>Joined</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {manufacturers.map(m => (
              <tr key={m.id}>
                <td>{m.name}</td>
                <td>{m.contact}</td>
                <td>{m.country}</td>
                <td><span className={`m-status ${m.status}`}>{m.status.charAt(0).toUpperCase() + m.status.slice(1)}</span></td>
                <td>{m.devices}</td>
                <td>{m.joined}</td>
                <td style={{ display: 'flex', gap: 6 }}>
                  <a href={`/master/manufacturers/${m.id}`} className="m-act">View</a>
                  {m.status === 'pending' && (
                    <button className="m-act approve" onClick={() => openConfirm(m.id, m.name)}>Approve</button>
                  )}
                  {m.status === 'active' && (
                    <button className="m-act danger">Suspend</button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Approve confirmation modal */}
      {confirmAction && (
        <>
          <div className="logout-back open" onClick={closeConfirm} />
          <div className="logout-modal open">
            <div className="logout-body">
              <div style={{ width: 44, height: 44, borderRadius: '50%', background: 'color-mix(in srgb,var(--ok) 12%,transparent)', display: 'grid', placeItems: 'center', margin: '0 auto 14px' }}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--ok)" strokeWidth="2">
                  <path d="M20 6L9 17l-5-5"/>
                </svg>
              </div>
              <h3>Approve manufacturer?</h3>
              <p><strong>{confirmAction.mfrName}</strong></p>
              <p>This will activate their account and allow them to upload devices.</p>
            </div>
            <div className="logout-actions">
              <button className="btn" onClick={closeConfirm} disabled={confirming}>Cancel</button>
              <button className="btn btn-s" onClick={handleConfirm} disabled={confirming}>
                {confirmed ? 'Approved!' : confirming ? 'Approving…' : 'Approve'}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
