'use client'
import { useState }   from 'react'
import { useQuery }   from 'convex/react'
import { useRouter }  from 'next/navigation'
import { api as apiBase } from '../../../../convex/_generated/api'
const api = apiBase as any

function formatDate(ts: number) {
  return new Date(ts).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
}

export default function SurgeonPatientsClient() {
  const router   = useRouter()
  const patients = useQuery(api.clinics.listClinicPatients)
  const [search, setSearch] = useState('')

  const filtered = (patients ?? []).filter((p: any) =>
    !search.trim() ||
    `${p.firstName} ${p.lastName}`.toLowerCase().includes(search.toLowerCase()) ||
    p.implantIdCode.toLowerCase().includes(search.toLowerCase()) ||
    p.selfReportedDevice?.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="m-content">
      <div className="m-h">
        <div>
          <h2>My Patients</h2>
          <div className="sub">Patients who have shared their record with your clinic.</div>
        </div>
        <a href="/surgeons/scan" className="btn btn-s" style={{ textDecoration: 'none' }}>
          Look up patient
        </a>
      </div>

      <div style={{ position: 'relative', marginBottom: 16, maxWidth: 400 }}>
        <svg
          style={{
            position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)',
            width: 15, height: 15, color: 'var(--muted2)', pointerEvents: 'none',
          }}
          viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"
          aria-hidden="true"
        >
          <circle cx="11" cy="11" r="8"/>
          <line x1="21" y1="21" x2="16.65" y2="16.65"/>
        </svg>
        <input
          className="input"
          type="text"
          placeholder="Search by name or Implant ID…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ paddingLeft: 40 }}
          aria-label="Search patients"
        />
      </div>

      {patients === undefined && (
        <div style={{ color: 'var(--muted)', fontSize: 14, padding: '32px 0' }}>
          Loading&hellip;
        </div>
      )}

      {patients !== undefined && filtered.length === 0 && (
        <div style={{
          background: 'var(--bg2)',
          border: '1px solid var(--border)',
          borderRadius: 14,
          padding: '48px 24px',
          textAlign: 'center',
        }}>
          <div style={{ fontFamily: 'var(--ff)', fontSize: 15, fontWeight: 500, color: 'var(--text)', marginBottom: 6 }}>
            {search ? 'No patients found' : 'No patients yet'}
          </div>
          <p style={{ color: 'var(--muted)', fontSize: 13.5, margin: 0 }}>
            {search
              ? 'Try a different search term.'
              : 'Patients will appear here when they share their record with your clinic.'}
          </p>
        </div>
      )}

      {filtered.length > 0 && (
        <div className="m-tbl-wrap">
          <table className="m-tbl">
            <thead>
              <tr>
                <th>Implant ID</th>
                <th>Name</th>
                <th>Device</th>
                <th>Status</th>
                <th>Shared</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((p: any) => (
                <tr
                  key={p._id}
                  style={{ cursor: 'pointer' }}
                  onClick={() => router.push('/surgeons/scan?code=' + p.implantIdCode)}
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      router.push('/surgeons/scan?code=' + p.implantIdCode)
                    }
                  }}
                  aria-label={`View record for ${p.firstName} ${p.lastName}`}
                >
                  <td style={{ fontFamily: 'SF Mono,Monaco,monospace', fontWeight: 600, color: 'var(--accent)', fontSize: 13 }}>
                    {p.implantIdCode}
                  </td>
                  <td style={{ fontWeight: 500 }}>{p.firstName} {p.lastName}</td>
                  <td style={{ color: 'var(--muted)' }}>{p.selfReportedDevice ?? '—'}</td>
                  <td>
                    <span style={{
                      fontFamily: 'var(--ff)',
                      fontSize: 11.5,
                      fontWeight: 600,
                      padding: '2px 8px',
                      borderRadius: 5,
                      background: p.verificationStatus === 'active'
                        ? 'color-mix(in srgb,var(--ok) 10%,transparent)'
                        : 'color-mix(in srgb,#f59e0b 10%,transparent)',
                      color: p.verificationStatus === 'active' ? 'var(--ok)' : '#92400e',
                      border: p.verificationStatus === 'active'
                        ? '1px solid color-mix(in srgb,var(--ok) 25%,transparent)'
                        : '1px solid color-mix(in srgb,#f59e0b 25%,transparent)',
                    }}>
                      {p.verificationStatus === 'active' ? 'Verified' : 'Pending'}
                    </span>
                  </td>
                  <td style={{ color: 'var(--muted)', fontSize: 12, whiteSpace: 'nowrap' }}>
                    {p.lastAccessed ? formatDate(p.lastAccessed) : '—'}
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
