'use client'
import { useQuery }    from 'convex/react'
import { useRouter }   from 'next/navigation'
import { api as apiBase } from '../../../../convex/_generated/api'
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const api = apiBase as any

export default function MasterDashboardPage() {
  const router = useRouter()

  // Real Convex data
  const pendingClinics  = useQuery(api.clinics.listApplications,       { status: 'pending' })
  const activeClinics   = useQuery(api.clinics.listClinics)
  const pendingMfrs     = useQuery(api.manufacturers.listApplications, { status: 'pending' })
  const allMfrs         = useQuery(api.manufacturers.listApprovedManufacturers)
  const allPatients     = useQuery(api.patients.listAllPatients,        {})
  const allDevices      = useQuery(api.devices.listAllDevices)
  const pendingDevices  = useQuery(api.devices.listPendingDevices)

  const pendingCount   = pendingClinics?.length ?? 0
  const activeClinicsN = activeClinics?.length ?? 0
  const totalPatients  = allPatients?.length ?? 0
  const activeMfrN     = allMfrs?.length ?? 0
  const pendingMfrN    = pendingMfrs?.length ?? 0
  const deviceCount    = allDevices?.length ?? 0
  const pendingDevN    = pendingDevices?.length ?? 0
  const verifiedPts    = allPatients?.filter((p: any) => p.verificationStatus === 'active').length ?? 0
  const verifyPct      = totalPatients > 0 ? Math.round((verifiedPts / totalPatients) * 100) : 0

  // Device categories from real data
  const deviceCats = (() => {
    if (!allDevices) return []
    const counts: Record<string, number> = {}
    for (const d of allDevices as any[]) {
      const t = d.deviceType || 'Other'
      counts[t] = (counts[t] || 0) + 1
    }
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([label, count]) => ({ label, count, pct: Math.round((count / deviceCount) * 100) }))
  })()

  // Clinic regions from real data
  const clinicRegions = (() => {
    if (!activeClinics) return []
    const counts: Record<string, number> = {}
    const flags: Record<string, string> = {
      'United Kingdom': '🇬🇧', 'Australia': '🇦🇺', 'United States': '🇺🇸',
      'Ireland': '🇮🇪', 'Canada': '🇨🇦', 'Germany': '🇩🇪',
      'France': '🇫🇷', 'New Zealand': '🇳🇿',
    }
    for (const c of activeClinics as any[]) {
      const country = c.facilityCountry || c.country || 'Other'
      const key = flags[country] ? country : 'Other'
      counts[key] = (counts[key] || 0) + 1
    }
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([label, count]) => ({ label, count, flag: flags[label] || '🌐' }))
  })()

  // Recent activity from real pending items
  const recentActivity = [
    ...(pendingClinics ?? []).slice(0, 2).map((c: any) => ({
      dot: 'warn', text: `New clinic application: ${c.facilityName}`,
      time: new Date(c.submittedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) + ' · Applications',
      href: `/master/clinics/${c._id}`,
    })),
    ...(pendingMfrs ?? []).slice(0, 2).map((m: any) => ({
      dot: 'warn', text: `Manufacturer application: ${m.companyName}`,
      time: new Date(m.submittedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) + ' · Manufacturers',
      href: `/master/manufacturers/${m._id}`,
    })),
    ...(pendingDevices ?? []).slice(0, 3).map((d: any) => ({
      dot: 'accent', text: `Device pending review: ${d.manufacturer} ${d.model || d.deviceType}`,
      time: new Date(d.publishedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) + ' · Devices',
      href: '/master/devices',
    })),
  ].slice(0, 7)

  return (
    <div className="m-content">

      {/* Header */}
      <div className="m-h">
        <div>
          <h2>Overview</h2>
          <div className="sub">Platform health, pending actions and recent activity.</div>
        </div>
      </div>

      {/* KPI row — 5 cards */}
      <div className="m-kpi-row">
        <div className="m-kpi" style={{ cursor: 'pointer' }} onClick={() => router.push('/master/clinics')}>
          <div className="k">Pending Applications</div>
          <div className="v">{pendingClinics === undefined ? '…' : pendingCount}</div>
          <div className={`delta${pendingCount > 0 ? ' warn' : ''}`}>{pendingCount > 0 ? `${pendingCount} to review` : 'All clear'}</div>
        </div>
        <div className="m-kpi" style={{ cursor: 'pointer' }} onClick={() => router.push('/master/clinics')}>
          <div className="k">Active Clinics</div>
          <div className="v">{activeClinics === undefined ? '…' : activeClinicsN}</div>
          <div className="delta">On the network</div>
        </div>
        <div className="m-kpi" style={{ cursor: 'pointer' }} onClick={() => router.push('/master/patients')}>
          <div className="k">Total Patients</div>
          <div className="v">{allPatients === undefined ? '…' : totalPatients.toLocaleString()}</div>
          <div className="delta">{verifyPct}% verified</div>
        </div>
        <div className="m-kpi" style={{ cursor: 'pointer' }} onClick={() => router.push('/master/manufacturers')}>
          <div className="k">Manufacturers</div>
          <div className="v">{allMfrs === undefined ? '…' : activeMfrN}</div>
          <div className={`delta${pendingMfrN > 0 ? ' warn' : ''}`}>{pendingMfrN > 0 ? `${pendingMfrN} pending` : 'All approved'}</div>
        </div>
        <div className="m-kpi" style={{ cursor: 'pointer' }} onClick={() => router.push('/master/devices')}>
          <div className="k">Catalogue Devices</div>
          <div className="v">{allDevices === undefined ? '…' : deviceCount.toLocaleString()}</div>
          <div className={`delta${pendingDevN > 0 ? ' warn' : ''}`}>{pendingDevN > 0 ? `${pendingDevN} awaiting sign-off` : 'All live'}</div>
        </div>
      </div>

      {/* Secondary KPI row */}
      <div className="m-kpi-row" style={{ gridTemplateColumns: 'repeat(3,1fr)', marginBottom: 28 }}>
        <div className="m-kpi">
          <div className="k">Verified Patients</div>
          <div className="v">{verifiedPts}</div>
          <div className="delta">{verifyPct}% verification rate</div>
        </div>
        <div className="m-kpi">
          <div className="k">Pending Devices</div>
          <div className="v">{pendingDevices === undefined ? '…' : pendingDevN}</div>
          <div className={`delta${pendingDevN > 0 ? ' warn' : ''}`}>{pendingDevN > 0 ? 'Awaiting sign-off' : 'All clear'}</div>
        </div>
        <div className="m-kpi">
          <div className="k">Pending Manufacturers</div>
          <div className="v">{pendingMfrs === undefined ? '…' : pendingMfrN}</div>
          <div className={`delta${pendingMfrN > 0 ? ' warn' : ''}`}>{pendingMfrN > 0 ? 'Need approval' : 'All clear'}</div>
        </div>
      </div>

      {/* Three-column insight row — stacks on mobile */}
      <div className="m-insight-row">

        {/* Device breakdown — real data */}
        <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 14, padding: '18px 20px' }}>
          <div style={{ fontFamily: 'var(--ff)', fontSize: 13, fontWeight: 600, marginBottom: 14, color: 'var(--text)' }}>Device Categories</div>
          {allDevices === undefined ? (
            <div style={{ color: 'var(--muted)', fontSize: 13 }}>Loading…</div>
          ) : deviceCats.length === 0 ? (
            <div style={{ color: 'var(--muted)', fontSize: 13 }}>No devices yet</div>
          ) : deviceCats.map(cat => (
            <div key={cat.label} style={{ marginBottom: 10 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                <span style={{ fontFamily: 'var(--ff)', fontSize: 12.5, color: 'var(--text)' }}>{cat.label}</span>
                <span style={{ fontFamily: 'var(--ff)', fontSize: 12, color: 'var(--muted)' }}>{cat.count}</span>
              </div>
              <div style={{ height: 5, borderRadius: 3, background: 'var(--bg)', overflow: 'hidden' }}>
                <div style={{ height: '100%', borderRadius: 3, background: 'var(--accent)', width: `${cat.pct}%` }} />
              </div>
            </div>
          ))}
        </div>

        {/* Clinic regions — real data */}
        <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 14, padding: '18px 20px' }}>
          <div style={{ fontFamily: 'var(--ff)', fontSize: 13, fontWeight: 600, marginBottom: 14, color: 'var(--text)' }}>Clinic Regions</div>
          {activeClinics === undefined ? (
            <div style={{ color: 'var(--muted)', fontSize: 13 }}>Loading…</div>
          ) : clinicRegions.length === 0 ? (
            <div style={{ color: 'var(--muted)', fontSize: 13 }}>No clinics yet</div>
          ) : clinicRegions.map(r => (
            <div key={r.label} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '6px 0', borderBottom: '1px solid var(--border)' }}>
              <span style={{ fontSize: 16, lineHeight: 1 }}>{r.flag}</span>
              <span style={{ fontFamily: 'var(--ff)', fontSize: 12.5, color: 'var(--text)', flex: 1 }}>{r.label}</span>
              <span style={{ fontFamily: 'var(--ff)', fontSize: 13, fontWeight: 600, color: 'var(--accent)' }}>{r.count}</span>
            </div>
          ))}
        </div>

        {/* Platform health — static infra data */}
        <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 14, padding: '18px 20px' }}>
          <div style={{ fontFamily: 'var(--ff)', fontSize: 13, fontWeight: 600, marginBottom: 14, color: 'var(--text)' }}>Platform Health</div>
          {[
            { label: 'API Uptime',      value: '99.97%', ok: true },
            { label: 'Avg Response',    value: '124 ms', ok: true },
            { label: 'Error Rate',      value: '0.03%',  ok: true },
            { label: 'Last Deploy',     value: 'Live',   ok: true },
          ].map(h => (
            <div key={h.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 0', borderBottom: '1px solid var(--border)' }}>
              <span style={{ fontFamily: 'var(--ff)', fontSize: 12.5, color: 'var(--muted)' }}>{h.label}</span>
              <span style={{ fontFamily: 'var(--ff)', fontSize: 12.5, fontWeight: 600, color: 'var(--ok)' }}>{h.value}</span>
            </div>
          ))}
        </div>

      </div>

      {/* Two-column: pending actions + recent activity */}
      <div className="m-two" style={{ marginTop: 28 }}>

        {/* Pending — real data */}
        <div>
          <div style={{ fontFamily: 'var(--ff)', fontSize: 13, fontWeight: 600, color: 'var(--text)', marginBottom: 10 }}>Pending Actions</div>
          <div className="m-tbl-wrap" style={{ marginBottom: 16 }}>
            <table className="m-tbl">
              <thead><tr><th>Name</th><th>Type</th><th>Submitted</th><th></th></tr></thead>
              <tbody>
                {(pendingClinics ?? []).slice(0, 4).map((c: any) => (
                  <tr key={c._id} style={{ cursor: 'pointer' }} onClick={() => router.push(`/master/clinics/${c._id}`)}>
                    <td style={{ fontWeight: 500 }}>{c.facilityName}</td>
                    <td><span className="m-status pending">Clinic</span></td>
                    <td style={{ color: 'var(--muted)', fontSize: 12 }}>{new Date(c.submittedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}</td>
                    <td><button className="m-act">Review</button></td>
                  </tr>
                ))}
                {(pendingMfrs ?? []).slice(0, 2).map((m: any) => (
                  <tr key={m._id} style={{ cursor: 'pointer' }} onClick={() => router.push(`/master/manufacturers/${m._id}`)}>
                    <td style={{ fontWeight: 500 }}>{m.companyName}</td>
                    <td><span className="m-status pending">Manufacturer</span></td>
                    <td style={{ color: 'var(--muted)', fontSize: 12 }}>{new Date(m.submittedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}</td>
                    <td><button className="m-act">Review</button></td>
                  </tr>
                ))}
                {pendingCount === 0 && pendingMfrN === 0 && (
                  <tr><td colSpan={4} style={{ textAlign: 'center', color: 'var(--muted)', padding: '20px', fontSize: 13 }}>No pending actions</td></tr>
                )}
              </tbody>
            </table>
          </div>

          {pendingDevN > 0 && (
            <>
              <div style={{ fontFamily: 'var(--ff)', fontSize: 13, fontWeight: 600, color: 'var(--text)', marginBottom: 10 }}>Devices Awaiting Sign-off</div>
              <div className="m-tbl-wrap">
                <table className="m-tbl">
                  <thead><tr><th>Device</th><th>Manufacturer</th><th>Submitted</th><th></th></tr></thead>
                  <tbody>
                    {(pendingDevices ?? []).slice(0, 4).map((d: any) => (
                      <tr key={d._id} style={{ cursor: 'pointer' }} onClick={() => router.push('/master/devices')}>
                        <td style={{ fontWeight: 500 }}>{d.deviceType || d.manufacturer}</td>
                        <td style={{ color: 'var(--muted)', fontSize: 12.5 }}>{d.manufacturer}</td>
                        <td style={{ color: 'var(--muted)', fontSize: 12 }}>{new Date(d.publishedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}</td>
                        <td><button className="m-act">Review</button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>

        {/* Recent activity — derived from real pending items */}
        <div className="m-activity">
          <div className="m-activity-h">
            <h3>Recent Activity</h3>
            <a href="/master/audit" style={{ fontFamily: 'var(--ff)', fontSize: 12, color: 'var(--accent)', textDecoration: 'none' }}>View all →</a>
          </div>
          {recentActivity.length === 0 ? (
            <div style={{ padding: '20px', textAlign: 'center', color: 'var(--muted)', fontSize: 13 }}>No recent activity</div>
          ) : recentActivity.map((item, i) => (
            <div key={i} className="m-act-row" style={{ cursor: 'pointer' }} onClick={() => router.push(item.href)}>
              <div className={`m-act-dot ${item.dot}`} />
              <div className="m-act-body">
                <div className="m-act-text">{item.text}</div>
                <div className="m-act-time">{item.time}</div>
              </div>
            </div>
          ))}
        </div>

      </div>
    </div>
  )
}
