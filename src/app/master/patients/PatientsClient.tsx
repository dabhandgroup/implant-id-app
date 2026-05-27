'use client'

import { useRouter } from 'next/navigation'

const patients = [
  {
    id: 'john-smith',
    patientId: 'IID-SMIJO2311XK',
    name: 'John Smith',
    registered: '12 Mar 2026',
    verified: 'active' as const,
    clinic: 'Manchester Orthopaedic Centre',
    devices: 2,
    lastActive: '25 May 2026',
  },
  {
    id: 'emma-brown',
    patientId: 'IID-BREMA1404RP',
    name: 'Emma Brown',
    registered: '3 Apr 2026',
    verified: 'active' as const,
    clinic: 'Boston Spine & Joint',
    devices: 1,
    lastActive: '24 May 2026',
  },
  {
    id: 'sarah-williams',
    patientId: 'IID-WILSA0805YT',
    name: 'Sarah Williams',
    registered: '8 May 2026',
    verified: 'pending' as const,
    clinic: 'Auckland Joint Replacement',
    devices: 1,
    lastActive: '20 May 2026',
  },
  {
    id: 'mark-jones',
    patientId: 'IID-JONMA1509NQ',
    name: 'Mark Jones',
    registered: '15 May 2026',
    verified: 'active' as const,
    clinic: 'Dublin Spinal Institute',
    devices: 3,
    lastActive: '26 May 2026',
  },
  {
    id: 'eleanor-taylor',
    patientId: 'IID-TAYEL2202CX',
    name: 'Eleanor Taylor',
    registered: '22 May 2026',
    verified: 'pending' as const,
    clinic: 'Harley Street Implant Centre',
    devices: 1,
    lastActive: '22 May 2026',
  },
]

export default function PatientsClient() {
  const router = useRouter()

  return (
    <div className="m-content">
      <div className="m-h">
        <div>
          <h2>All Patients</h2>
          <div className="sub">Every patient registered on the platform across all clinics.</div>
        </div>
      </div>

      <div className="m-tbl-toolbar">
        <div className="search">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input type="text" placeholder="Search by name, patient ID, clinic…" />
        </div>
        <button className="m-act">Filter by status</button>
      </div>

      <div className="m-tbl-wrap">
        <table className="m-tbl">
          <thead>
            <tr>
              <th>Patient ID</th>
              <th>Name</th>
              <th>Registered</th>
              <th>Status</th>
              <th>Clinic</th>
              <th>Devices</th>
              <th>Last Active</th>
            </tr>
          </thead>
          <tbody>
            {patients.map(p => (
              <tr
                key={p.id}
                onClick={() => router.push(`/master/patients/${p.id}`)}
                style={{ cursor: 'pointer' }}
              >
                <td style={{ fontFamily: 'var(--ff)', letterSpacing: '.04em', color: 'var(--accent)' }}>
                  {p.patientId}
                </td>
                <td style={{ fontWeight: 500 }}>{p.name}</td>
                <td style={{ color: 'var(--muted)' }}>{p.registered}</td>
                <td>
                  <span className={`m-status ${p.verified}`}>
                    {p.verified === 'active' ? 'Active' : 'Pending'}
                  </span>
                </td>
                <td>{p.clinic}</td>
                <td>{p.devices}</td>
                <td style={{ color: 'var(--muted)' }}>{p.lastActive}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
