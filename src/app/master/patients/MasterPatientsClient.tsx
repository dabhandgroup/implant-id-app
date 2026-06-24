'use client'
import { useState }  from 'react'
import { useQuery }  from 'convex/react'
import { useRouter } from 'next/navigation'
import { api }       from '../../../../convex/_generated/api'

function formatDate(ts: number) {
  return new Date(ts).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

export default function MasterPatientsClient() {
  const patients = useQuery(api.patients.listAllPatients, {})
  const router   = useRouter()
  const [search, setSearch] = useState('')

  const filtered = (patients ?? []).filter(p => {
    if (!search.trim()) return true
    const q = search.toLowerCase()
    return (
      p.implantIdCode?.toLowerCase().includes(q) ||
      p.firstName?.toLowerCase().includes(q) ||
      p.lastName?.toLowerCase().includes(q)
    )
  })

  if (patients === undefined) {
    return (
      <div className="m-content">
        <div className="m-h"><div><h2>All Patients</h2><div className="sub">Loading…</div></div></div>
      </div>
    )
  }

  return (
    <div className="m-content">
      <div className="m-h">
        <div>
          <h2>All Patients</h2>
          <div className="sub">{patients.length} patient{patients.length !== 1 ? 's' : ''} registered on the platform.</div>
        </div>
      </div>

      {/* Search */}
      <div style={{ marginBottom: 16, position: 'relative' }}>
        <svg style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', width: 15, height: 15, color: 'var(--muted2)', pointerEvents: 'none' }}
          viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
          <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
        </svg>
        <input
          className="input"
          type="text"
          placeholder="Search by name or ID…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ paddingLeft: 36, maxWidth: 360 }}
        />
      </div>

      {/* Desktop: table */}
      <div className="m-tbl-wrap m-patients-desktop">
        {filtered.length === 0 ? (
          <div style={{ padding: '48px 0', textAlign: 'center', color: 'var(--muted)', fontFamily: 'var(--ff)', fontSize: 14 }}>
            {search ? 'No patients match your search.' : 'No patients registered yet.'}
          </div>
        ) : (
          <table className="m-tbl">
            <thead>
              <tr>
                <th>Patient ID</th>
                <th>Name</th>
                <th>DOB</th>
                <th>Account</th>
                <th>Status</th>
                <th>Registered</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((p) => (
                <tr key={p._id} style={{ cursor: 'pointer' }} onClick={() => router.push('/master/patients/' + p._id)}>
                  <td style={{ fontFamily: 'SF Mono,Monaco,monospace', fontWeight: 700, letterSpacing: '.04em', color: 'var(--accent)', fontSize: 13 }}>
                    {p.implantIdCode}
                  </td>
                  <td>{p.firstName} {p.lastName}</td>
                  <td style={{ color: 'var(--muted)', fontSize: 13 }}>{p.dob ?? '—'}</td>
                  <td>
                    {(p as any).accountActivated
                      ? <span className="m-status active">Active</span>
                      : <span className="m-status" style={{ background: 'rgba(100,116,139,0.10)', color: '#475569', border: '1px solid rgba(100,116,139,0.25)' }}>Invite pending</span>}
                  </td>
                  <td>
                    {p.verificationStatus === 'active'
                      ? <span className="m-status active">Verified</span>
                      : <span className="m-status pending">Pending</span>}
                  </td>
                  <td style={{ color: 'var(--muted)', fontSize: 13 }}>{formatDate(p._creationTime)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Mobile: card list */}
      <div className="m-patients-mobile">
        {filtered.length === 0 ? (
          <div style={{ textAlign: 'center', color: 'var(--muted)', padding: '32px 0', fontSize: 13 }}>
            {search ? 'No patients match your search.' : 'No patients yet.'}
          </div>
        ) : filtered.map(p => (
          <div
            key={p._id}
            onClick={() => router.push('/master/patients/' + p._id)}
            style={{
              background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 12,
              padding: '14px 16px', marginBottom: 8, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 12,
            }}
          >
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontFamily: 'var(--ff)', fontSize: 14, fontWeight: 600, color: 'var(--text)', marginBottom: 3 }}>
                {p.firstName} {p.lastName}
              </div>
              <div style={{ fontFamily: 'SF Mono,Monaco,monospace', fontSize: 12, color: 'var(--accent)', letterSpacing: '.04em', marginBottom: 3 }}>
                {p.implantIdCode}
              </div>
              <div style={{ fontSize: 12, color: 'var(--muted)' }}>
                DOB: {p.dob ?? '—'} · {formatDate(p._creationTime)}
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6, flexShrink: 0 }}>
              {(p as any).accountActivated
                ? <span className="m-status active">Active</span>
                : <span className="m-status" style={{ background: 'rgba(100,116,139,0.10)', color: '#475569', border: '1px solid rgba(100,116,139,0.25)' }}>Invite pending</span>}
              {p.verificationStatus === 'active'
                ? <span className="m-status active">Verified</span>
                : <span className="m-status pending">Pending</span>}
              <svg viewBox="0 0 24 24" fill="none" stroke="var(--muted2)" strokeWidth="2" width="14" height="14"><polyline points="9 18 15 12 9 6"/></svg>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
