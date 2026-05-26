'use client'

import { useState } from 'react'

type Tab = 'pending' | 'all' | 'rejected'

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

const rejectedClinics = [
  { id: 'glasgow-knee', name: 'Glasgow Knee Clinic', country: 'United Kingdom', submitted: '10 May 2026', email: 'admin@glasgowknee.co.uk', rejected: '15 May 2026', reason: 'Incomplete CQC documentation' },
  { id: 'cape-neuro', name: 'Cape Town Neurology Associates', country: 'South Africa', submitted: '5 May 2026', email: 'info@capeneuro.co.za', rejected: '12 May 2026', reason: 'Outside supported regions' },
]

export default function ClinicsClient() {
  const [tab, setTab] = useState<Tab>('pending')

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
          className={`m-tab${tab === 'pending' ? ' active' : ''}`}
          onClick={() => setTab('pending')}
        >
          Pending Applications
          {pendingClinics.length > 0 && (
            <span style={{ marginLeft: 6, background: 'var(--warn)', color: '#fff', borderRadius: 10, padding: '1px 7px', fontSize: 11, fontWeight: 700 }}>
              {pendingClinics.length}
            </span>
          )}
        </button>
        <button
          className={`m-tab${tab === 'all' ? ' active' : ''}`}
          onClick={() => setTab('all')}
        >
          All Clinics
        </button>
        <button
          className={`m-tab${tab === 'rejected' ? ' active' : ''}`}
          onClick={() => setTab('rejected')}
        >
          Rejected
        </button>
      </div>

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
                  <td style={{ fontWeight: 500 }}>{c.name}</td>
                  <td>{c.country}</td>
                  <td>{c.email}</td>
                  <td>{c.submitted}</td>
                  <td>
                    <a href={`/master/clinics/${c.id}`} className="m-act">Review Application</a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

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
                  <td style={{ fontWeight: 500 }}>{c.name}</td>
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

      {tab === 'rejected' && (
        <div className="m-tbl-wrap">
          <table className="m-tbl">
            <thead>
              <tr>
                <th>Clinic Name</th>
                <th>Country</th>
                <th>Contact Email</th>
                <th>Submitted</th>
                <th>Rejected</th>
                <th>Reason</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {rejectedClinics.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', color: 'var(--muted)', padding: '32px 0' }}>
                    No rejected applications.
                  </td>
                </tr>
              ) : rejectedClinics.map(c => (
                <tr key={c.id}>
                  <td style={{ fontWeight: 500 }}>{c.name}</td>
                  <td>{c.country}</td>
                  <td>{c.email}</td>
                  <td>{c.submitted}</td>
                  <td>{c.rejected}</td>
                  <td style={{ color: 'var(--muted)', fontSize: 13 }}>{c.reason}</td>
                  <td>
                    <a href={`/master/clinics/${c.id}`} className="m-act">View</a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
