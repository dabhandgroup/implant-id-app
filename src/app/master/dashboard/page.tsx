export const metadata = { title: 'Dashboard · Master Admin · Implant ID' }

export default function MasterDashboardPage() {
  return (
    <div className="m-content">

      {/* Header */}
      <div className="m-h">
        <div>
          <h2>Overview</h2>
          <div className="sub">Platform health, pending actions and recent activity.</div>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <span style={{ fontFamily: 'var(--ff)', fontSize: 12, color: 'var(--muted2)' }}>Last updated: just now</span>
        </div>
      </div>

      {/* KPI row */}
      <div className="m-kpi-row">
        <div className="m-kpi">
          <div className="k">Pending Applications</div>
          <div className="v">3</div>
          <div className="delta warn">↑ 2 this week</div>
        </div>
        <div className="m-kpi">
          <div className="k">Active Clinics</div>
          <div className="v">8</div>
          <div className="delta">↑ 1 this month</div>
        </div>
        <div className="m-kpi">
          <div className="k">Total Patients</div>
          <div className="v">214</div>
          <div className="delta">↑ 12 this week</div>
        </div>
        <div className="m-kpi">
          <div className="k">Active Manufacturers</div>
          <div className="v">12</div>
          <div className="delta warn">2 pending approval</div>
        </div>
        <div className="m-kpi">
          <div className="k">Catalogue Devices</div>
          <div className="v">1,847</div>
          <div className="delta muted">↑ 96 this month</div>
        </div>
      </div>

      {/* Secondary KPI row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 28 }}>
        <div className="m-kpi" style={{ display: 'flex', flexDirection: 'column' }}>
          <div className="k">Verified Patients</div>
          <div className="v">189</div>
          <div className="delta">88% verification rate</div>
        </div>
        <div className="m-kpi">
          <div className="k">Pending Devices</div>
          <div className="v">7</div>
          <div className="delta warn">Awaiting sign-off</div>
        </div>
        <div className="m-kpi">
          <div className="k">Submission Contracts</div>
          <div className="v">64</div>
          <div className="delta muted">PDFs on file</div>
        </div>
      </div>

      {/* Three-column insight row */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16, marginBottom: 28 }}>

        {/* Device breakdown */}
        <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 14, padding: '18px 20px' }}>
          <div style={{ fontFamily: 'var(--ff)', fontSize: 13, fontWeight: 600, marginBottom: 16, color: 'var(--text)' }}>Device Categories</div>
          {[
            { label: 'Cardiac',    count: 612, pct: 33 },
            { label: 'Orthopaedic', count: 544, pct: 29 },
            { label: 'Spinal',     count: 371, pct: 20 },
            { label: 'Cochlear',   count: 185, pct: 10 },
            { label: 'Other',      count: 135, pct: 8  },
          ].map(cat => (
            <div key={cat.label} style={{ marginBottom: 10 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                <span style={{ fontFamily: 'var(--ff)', fontSize: 12.5, color: 'var(--text)' }}>{cat.label}</span>
                <span style={{ fontFamily: 'var(--ff)', fontSize: 12, color: 'var(--muted)' }}>{cat.count.toLocaleString()}</span>
              </div>
              <div style={{ height: 5, borderRadius: 3, background: 'var(--bg)', overflow: 'hidden' }}>
                <div style={{ height: '100%', borderRadius: 3, background: 'var(--accent)', width: `${cat.pct}%` }} />
              </div>
            </div>
          ))}
        </div>

        {/* Clinic regions */}
        <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 14, padding: '18px 20px' }}>
          <div style={{ fontFamily: 'var(--ff)', fontSize: 13, fontWeight: 600, marginBottom: 16, color: 'var(--text)' }}>Clinic Regions</div>
          {[
            { label: 'United Kingdom', count: 5, flag: '🇬🇧' },
            { label: 'Australia',      count: 2, flag: '🇦🇺' },
            { label: 'United States',  count: 4, flag: '🇺🇸' },
            { label: 'Europe',         count: 3, flag: '🇪🇺' },
            { label: 'Other',          count: 2, flag: '🌐' },
          ].map(r => (
            <div key={r.label} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '6px 0', borderBottom: '1px solid var(--border)' }}>
              <span style={{ fontSize: 16, lineHeight: 1 }}>{r.flag}</span>
              <span style={{ fontFamily: 'var(--ff)', fontSize: 12.5, color: 'var(--text)', flex: 1 }}>{r.label}</span>
              <span style={{ fontFamily: 'var(--ff)', fontSize: 13, fontWeight: 600, color: 'var(--accent)' }}>{r.count}</span>
            </div>
          ))}
        </div>

        {/* Platform health */}
        <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 14, padding: '18px 20px' }}>
          <div style={{ fontFamily: 'var(--ff)', fontSize: 13, fontWeight: 600, marginBottom: 16, color: 'var(--text)' }}>Platform Health</div>
          {[
            { label: 'API Uptime',       value: '99.97%', ok: true },
            { label: 'Avg Response',     value: '124 ms', ok: true },
            { label: 'Active Sessions',  value: '38',     ok: true },
            { label: 'Error Rate',       value: '0.03%',  ok: true },
            { label: 'Last Deploy',      value: '2h ago', ok: true },
          ].map(h => (
            <div key={h.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 0', borderBottom: '1px solid var(--border)' }}>
              <span style={{ fontFamily: 'var(--ff)', fontSize: 12.5, color: 'var(--muted)' }}>{h.label}</span>
              <span style={{ fontFamily: 'var(--ff)', fontSize: 12.5, fontWeight: 600, color: h.ok ? 'var(--ok)' : 'var(--err)' }}>{h.value}</span>
            </div>
          ))}
        </div>

      </div>

      {/* Two-column: pending actions + recent activity */}
      <div className="m-two">

        {/* Pending applications */}
        <div>
          <div style={{ fontFamily: 'var(--ff)', fontSize: 13, fontWeight: 600, color: 'var(--text)', marginBottom: 10 }}>
            Pending Actions
          </div>
          <div className="m-tbl-wrap" style={{ marginBottom: 16 }}>
            <table className="m-tbl">
              <thead>
                <tr>
                  <th>Clinic Name</th>
                  <th>Contact</th>
                  <th>Submitted</th>
                  <th>Status</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td style={{ fontWeight: 500 }}>Harley Street Implant Centre</td>
                  <td style={{ color: 'var(--muted)', fontSize: 12.5 }}>dr.patel@harleyimplants.co.uk</td>
                  <td style={{ color: 'var(--muted)' }}>24 May 2026</td>
                  <td><span className="m-status pending">Pending</span></td>
                  <td><a href="/master/clinics/harley-street" className="m-act">Review</a></td>
                </tr>
                <tr>
                  <td style={{ fontWeight: 500 }}>Sydney Cardiac Devices</td>
                  <td style={{ color: 'var(--muted)', fontSize: 12.5 }}>admin@sydneycardiac.au</td>
                  <td style={{ color: 'var(--muted)' }}>22 May 2026</td>
                  <td><span className="m-status pending">Pending</span></td>
                  <td><a href="/master/clinics/sydney-cardiac" className="m-act">Review</a></td>
                </tr>
                <tr>
                  <td style={{ fontWeight: 500 }}>Cochlear Ltd</td>
                  <td style={{ color: 'var(--muted)', fontSize: 12.5 }}>implantid@cochlear.com</td>
                  <td style={{ color: 'var(--muted)' }}>18 May 2026</td>
                  <td><span className="m-status pending">Manufacturer</span></td>
                  <td><a href="/master/manufacturers/cochlear" className="m-act">Review</a></td>
                </tr>
                <tr>
                  <td style={{ fontWeight: 500 }}>Boston Spine &amp; Joint</td>
                  <td style={{ color: 'var(--muted)', fontSize: 12.5 }}>clinic@bostonspine.com</td>
                  <td style={{ color: 'var(--muted)' }}>19 May 2026</td>
                  <td><span className="m-status active">Active</span></td>
                  <td><a href="/master/clinics/boston-spine" className="m-act">View</a></td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Pending devices */}
          <div style={{ fontFamily: 'var(--ff)', fontSize: 13, fontWeight: 600, color: 'var(--text)', marginBottom: 10, marginTop: 4 }}>
            Devices Awaiting Sign-off
          </div>
          <div className="m-tbl-wrap">
            <table className="m-tbl">
              <thead>
                <tr>
                  <th>Device</th>
                  <th>Manufacturer</th>
                  <th>Submitted</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td style={{ fontWeight: 500 }}>Cochlear Nucleus 8</td>
                  <td style={{ color: 'var(--muted)' }}>Cochlear Ltd</td>
                  <td style={{ color: 'var(--muted)' }}>18 May 2026</td>
                  <td><a href="/master/devices/cochlear-nucleus-8" className="m-act">Review</a></td>
                </tr>
                <tr>
                  <td style={{ fontWeight: 500 }}>Acumed DF3 Hip System</td>
                  <td style={{ color: 'var(--muted)' }}>Acumed Ltd</td>
                  <td style={{ color: 'var(--muted)' }}>21 May 2026</td>
                  <td><a href="/master/devices/acumed-df3" className="m-act">Review</a></td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Recent activity */}
        <div className="m-activity">
          <div className="m-activity-h">
            <h3>Recent Activity</h3>
            <a href="/master/audit" style={{ fontFamily: 'var(--ff)', fontSize: 12, color: 'var(--accent)', textDecoration: 'none' }}>View all →</a>
          </div>
          <div className="m-act-row">
            <div className="m-act-dot ok" />
            <div className="m-act-body">
              <div className="m-act-text">Manchester Orthopaedics approved</div>
              <div className="m-act-time">2 hours ago · Clinics</div>
            </div>
          </div>
          <div className="m-act-row">
            <div className="m-act-dot warn" />
            <div className="m-act-body">
              <div className="m-act-text">New application: Harley Street Implant Centre</div>
              <div className="m-act-time">5 hours ago · Applications</div>
            </div>
          </div>
          <div className="m-act-row">
            <div className="m-act-dot warn" />
            <div className="m-act-body">
              <div className="m-act-text">New device pending: Cochlear Nucleus 8</div>
              <div className="m-act-time">Yesterday, 4:12 pm · Devices</div>
            </div>
          </div>
          <div className="m-act-row">
            <div className="m-act-dot accent" />
            <div className="m-act-body">
              <div className="m-act-text">Stryker Orthopaedics added 14 devices via bulk upload</div>
              <div className="m-act-time">Yesterday, 3:41 pm · Devices</div>
            </div>
          </div>
          <div className="m-act-row">
            <div className="m-act-dot ok" />
            <div className="m-act-body">
              <div className="m-act-text">Patient IID-SMIJO2311XK verified</div>
              <div className="m-act-time">Yesterday, 11:08 am · Patients</div>
            </div>
          </div>
          <div className="m-act-row">
            <div className="m-act-dot muted" />
            <div className="m-act-body">
              <div className="m-act-text">Medtronic plc onboarded as manufacturer</div>
              <div className="m-act-time">23 May 2026 · Manufacturers</div>
            </div>
          </div>
          <div className="m-act-row">
            <div className="m-act-dot accent" />
            <div className="m-act-body">
              <div className="m-act-text">96-device bulk import completed</div>
              <div className="m-act-time">20 May 2026 · Devices</div>
            </div>
          </div>
        </div>

      </div>
    </div>
  )
}
