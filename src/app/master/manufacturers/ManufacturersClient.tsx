'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

type Tab = 'pending' | 'all' | 'rejected'

interface PendingMfr {
  id: string; name: string; contact: string; country: string
  applied: string; regNumber: string
}
interface AllMfr {
  id: string; name: string; contact: string; country: string
  status: 'active' | 'pending'; devices: number; joined: string
}
interface RejectedMfr {
  id: string; name: string; contact: string; country: string
  applied: string; reason: string
}
interface ConfirmModal { type: 'approve' | 'reject'; id: string; name: string }

const pendingManufacturers: PendingMfr[] = [
  { id: 'cochlear',  name: 'Cochlear Ltd', contact: 'implantid@cochlear.com', country: 'Australia',      applied: '18 May 2026', regNumber: 'TGA-2026-048237' },
  { id: 'acumed',    name: 'Acumed Ltd',   contact: 'accounts@acumed.net',    country: 'United Kingdom', applied: '21 May 2026', regNumber: 'MHRA-2026-MAN-8821' },
]

const allManufacturers: AllMfr[] = [
  { id: 'medtronic',     name: 'Medtronic plc',        contact: 'uk@medtronic.com',        country: 'Ireland',        status: 'active',  devices: 312, joined: '10 Jan 2026' },
  { id: 'zimmer-biomet', name: 'Zimmer Biomet',         contact: 'data@zimmerbiomet.com',   country: 'United States',  status: 'active',  devices: 487, joined: '14 Jan 2026' },
  { id: 'stryker',       name: 'Stryker Orthopaedics',  contact: 'catalogue@stryker.com',   country: 'United States',  status: 'active',  devices: 214, joined: '20 Feb 2026' },
  { id: 'cochlear',      name: 'Cochlear Ltd',           contact: 'implantid@cochlear.com',  country: 'Australia',      status: 'pending', devices: 0,   joined: '18 May 2026' },
  { id: 'acumed',        name: 'Acumed Ltd',             contact: 'accounts@acumed.net',     country: 'United Kingdom', status: 'pending', devices: 0,   joined: '21 May 2026' },
]

const rejectedManufacturers: RejectedMfr[] = [
  { id: 'biocore',   name: 'Biocore Medical Ltd',  contact: 'info@biocore-med.com',  country: 'Germany',       applied: '03 Apr 2026', reason: 'Unable to verify regulatory certification' },
  { id: 'orthotrak', name: 'OrthoTrak Systems',    contact: 'contact@orthotrak.io',  country: 'United States', applied: '14 Apr 2026', reason: 'Incomplete liability insurance documentation' },
]

export default function ManufacturersClient() {
  const router = useRouter()
  const [tab,          setTab]          = useState<Tab>('pending')
  const [confirmModal, setConfirmModal] = useState<ConfirmModal | null>(null)
  const [confirming,   setConfirming]   = useState(false)
  const [confirmed,    setConfirmed]    = useState(false)
  const [rejectReason, setRejectReason] = useState('')

  function openConfirm(type: 'approve' | 'reject', id: string, name: string) {
    setConfirmModal({ type, id, name })
    setConfirming(false)
    setConfirmed(false)
    setRejectReason('')
  }

  function closeConfirm() {
    setConfirmModal(null)
    setConfirming(false)
    setConfirmed(false)
    setRejectReason('')
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

      {/* Tabs */}
      <div className="m-tabs">
        <button className={`m-tab${tab === 'pending' ? ' active' : ''}`} onClick={() => setTab('pending')}>
          Pending
          {pendingManufacturers.length > 0 && (
            <span style={{ marginLeft: 7, background: 'color-mix(in srgb,var(--warn) 14%,transparent)', color: 'var(--warn)', borderRadius: 10, padding: '1px 7px', fontSize: 11, fontWeight: 600 }}>
              {pendingManufacturers.length}
            </span>
          )}
        </button>
        <button className={`m-tab${tab === 'all' ? ' active' : ''}`} onClick={() => setTab('all')}>
          All Manufacturers
        </button>
        <button className={`m-tab${tab === 'rejected' ? ' active' : ''}`} onClick={() => setTab('rejected')}>
          Rejected
        </button>
      </div>

      {/* ── Pending tab ── */}
      {tab === 'pending' && (
        pendingManufacturers.length === 0
          ? <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 14, padding: '40px 20px', textAlign: 'center', color: 'var(--muted)' }}>No pending manufacturer applications.</div>
          : (
            <div className="m-tbl-wrap">
              <table className="m-tbl">
                <thead>
                  <tr>
                    <th>Company</th>
                    <th>Contact</th>
                    <th>Country</th>
                    <th>Applied</th>
                    <th>Reg. Number</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {pendingManufacturers.map(m => (
                    <tr key={m.id} onClick={() => router.push(`/master/manufacturers/${m.id}`)} style={{ cursor: 'pointer' }}>
                      <td style={{ fontWeight: 500 }}>{m.name}</td>
                      <td style={{ color: 'var(--muted)' }}>{m.contact}</td>
                      <td>{m.country}</td>
                      <td style={{ color: 'var(--muted)' }}>{m.applied}</td>
                      <td style={{ fontFamily: 'var(--ff)', fontSize: 12, color: 'var(--muted)' }}>{m.regNumber}</td>
                      <td style={{ display: 'flex', gap: 6 }} onClick={e => e.stopPropagation()}>
                        <a href={`/master/manufacturers/${m.id}`} className="m-act">Review Application</a>
                        <button className="m-act danger" onClick={() => openConfirm('reject', m.id, m.name)}>Reject</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
      )}

      {/* ── All tab ── */}
      {tab === 'all' && (
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
              {allManufacturers.map(m => (
                <tr key={m.id} onClick={() => router.push(`/master/manufacturers/${m.id}`)} style={{ cursor: 'pointer' }}>
                  <td style={{ fontWeight: 500 }}>{m.name}</td>
                  <td style={{ color: 'var(--muted)' }}>{m.contact}</td>
                  <td>{m.country}</td>
                  <td>
                    <span className={`m-status ${m.status}`}>
                      {m.status === 'active' ? 'Active' : 'Pending'}
                    </span>
                  </td>
                  <td>
                    {m.devices > 0
                      ? m.devices.toLocaleString()
                      : <span style={{ color: 'var(--muted2)' }}>—</span>
                    }
                  </td>
                  <td style={{ color: 'var(--muted)' }}>{m.joined}</td>
                  <td style={{ display: 'flex', gap: 6 }} onClick={e => e.stopPropagation()}>
                    <a href={`/master/manufacturers/${m.id}`} className="m-act">View</a>
                    {m.status === 'pending' && (
                      <button className="m-act approve" onClick={() => openConfirm('approve', m.id, m.name)}>Approve</button>
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
      )}

      {/* ── Rejected tab ── */}
      {tab === 'rejected' && (
        <div className="m-tbl-wrap">
          <table className="m-tbl">
            <thead>
              <tr>
                <th>Company</th>
                <th>Contact</th>
                <th>Country</th>
                <th>Applied</th>
                <th>Rejection Reason</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {rejectedManufacturers.map(m => (
                <tr key={m.id} onClick={() => router.push(`/master/manufacturers/${m.id}`)} style={{ cursor: 'pointer' }}>
                  <td style={{ fontWeight: 500 }}>{m.name}</td>
                  <td style={{ color: 'var(--muted)' }}>{m.contact}</td>
                  <td>{m.country}</td>
                  <td style={{ color: 'var(--muted)' }}>{m.applied}</td>
                  <td style={{ color: 'var(--muted)', fontStyle: 'italic' }}>{m.reason}</td>
                  <td onClick={e => e.stopPropagation()}>
                    <button className="m-act">Reconsider</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ── Approve modal ── */}
      {confirmModal?.type === 'approve' && (
        <div className="logout-back open" onClick={closeConfirm}>
          <div className="logout-modal" onClick={e => e.stopPropagation()}>
            <div className="logout-body">
              <div style={{ width: 44, height: 44, borderRadius: '50%', background: 'color-mix(in srgb,var(--ok) 12%,transparent)', display: 'grid', placeItems: 'center', margin: '0 auto 14px' }}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--ok)" strokeWidth="2">
                  <path d="M20 6L9 17l-5-5"/>
                </svg>
              </div>
              <h3>Approve manufacturer?</h3>
              <p><strong>{confirmModal.name}</strong></p>
              <p>This will activate their account and allow them to upload devices to the catalogue.</p>
            </div>
            <div className="logout-actions">
              <button className="btn" onClick={closeConfirm} disabled={confirming}>Cancel</button>
              <button className="btn btn-s" onClick={handleConfirm} disabled={confirming}>
                {confirmed ? 'Approved!' : confirming ? 'Approving…' : 'Approve'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Reject modal ── */}
      {confirmModal?.type === 'reject' && (
        <div className="logout-back open" onClick={closeConfirm}>
          <div className="logout-modal" onClick={e => e.stopPropagation()}>
            <div className="logout-body">
              <div style={{ width: 44, height: 44, borderRadius: '50%', background: 'color-mix(in srgb,var(--err) 12%,transparent)', display: 'grid', placeItems: 'center', margin: '0 auto 14px' }}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--err)" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </div>
              <h3>Reject manufacturer?</h3>
              <p style={{ marginBottom: 14 }}><strong>{confirmModal.name}</strong></p>
              <p style={{ marginBottom: 14, color: 'var(--muted)', fontSize: 13 }}>Provide a reason — this will be sent to the applicant.</p>
              <textarea
                className="input"
                style={{ resize: 'vertical', minHeight: 80 }}
                placeholder="e.g. Unable to verify regulatory certification…"
                value={rejectReason}
                onChange={e => setRejectReason(e.target.value)}
              />
            </div>
            <div className="logout-actions">
              <button className="btn" onClick={closeConfirm} disabled={confirming}>Cancel</button>
              <button className="btn btn-danger" onClick={handleConfirm} disabled={confirming || !rejectReason.trim()}>
                {confirmed ? 'Rejected' : confirming ? 'Rejecting…' : 'Reject'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
