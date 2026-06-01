'use client'
import { useQuery }  from 'convex/react'
import { useRouter } from 'next/navigation'
import { api }       from '../../../../convex/_generated/api'

function formatDate(ts: number) {
  return new Date(ts).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

export default function MasterPatientsClient() {
  const patients = useQuery(api.patients.listAllPatients, {})
  const router   = useRouter()

  if (patients === undefined) {
    return (
      <div className="m-content">
        <div className="m-h">
          <div>
            <h2>All Patients</h2>
            <div className="sub">Every patient registered on the platform.</div>
          </div>
        </div>
        <div className="m-tbl-wrap" style={{ padding: '40px 0', textAlign: 'center', color: 'var(--muted)', fontFamily: 'var(--ff)', fontSize: 14 }}>
          Loading…
        </div>
      </div>
    )
  }

  return (
    <div className="m-content">
      <div className="m-h">
        <div>
          <h2>All Patients</h2>
          <div className="sub">Every patient registered on the platform across all clinics.</div>
        </div>
      </div>

      <div className="m-tbl-wrap">
        {patients.length === 0 ? (
          <div style={{ padding: '48px 0', textAlign: 'center', color: 'var(--muted)', fontFamily: 'var(--ff)', fontSize: 14 }}>
            No patients registered yet.
          </div>
        ) : (
          <table className="m-tbl">
            <thead>
              <tr>
                <th>Patient ID</th>
                <th>Name</th>
                <th>DOB</th>
                <th>Status</th>
                <th>Registered</th>
              </tr>
            </thead>
            <tbody>
              {patients.map((p) => (
                <tr
                  key={p._id}
                  style={{ cursor: 'pointer' }}
                  onClick={() => router.push('/master/patients/' + p._id)}
                >
                  <td style={{ fontFamily: 'SF Mono,Monaco,monospace', fontWeight: 700, letterSpacing: '.04em', color: 'var(--accent)', fontSize: 13 }}>
                    {p.implantIdCode}
                  </td>
                  <td>{p.firstName} {p.lastName}</td>
                  <td style={{ color: 'var(--muted)', fontSize: 13 }}>{p.dob ?? '—'}</td>
                  <td>
                    {p.verificationStatus === 'active'
                      ? <span className="m-status active">Verified</span>
                      : <span className="m-status pending">Pending</span>
                    }
                  </td>
                  <td style={{ color: 'var(--muted)', fontSize: 13 }}>{formatDate(p._creationTime)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
