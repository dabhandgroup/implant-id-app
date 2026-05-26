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
          <div className="k">All Devices</div>
          <div className="v">1,847</div>
          <div className="delta muted">across 23 manufacturers</div>
        </div>
        <div className="m-kpi">
          <div className="k">Manufacturers</div>
          <div className="v">12</div>
          <div className="delta">3 pending approval</div>
        </div>
      </div>

      {/* Two-column: recent applications + activity */}
      <div className="m-two">
        {/* Recent applications table */}
        <div>
          <div className="m-tbl-wrap">
            <table className="m-tbl">
              <thead>
                <tr>
                  <th>Clinic Name</th>
                  <th>Contact</th>
                  <th>Country</th>
                  <th>Submitted</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>Harley Street Implant Centre</td>
                  <td>dr.patel@harleyimplants.co.uk</td>
                  <td>United Kingdom</td>
                  <td>24 May 2026</td>
                  <td><span className="m-status pending">Pending</span></td>
                </tr>
                <tr>
                  <td>Sydney Cardiac Devices</td>
                  <td>admin@sydneycardiac.au</td>
                  <td>Australia</td>
                  <td>22 May 2026</td>
                  <td><span className="m-status pending">Pending</span></td>
                </tr>
                <tr>
                  <td>Boston Spine & Joint</td>
                  <td>clinic@bostonspine.com</td>
                  <td>United States</td>
                  <td>19 May 2026</td>
                  <td><span className="m-status active">Active</span></td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Recent activity */}
        <div className="m-activity">
          <div className="m-activity-h">
            <h3>Recent Activity</h3>
          </div>
          <div className="m-act-row">
            <div className="m-act-dot ok" />
            <div className="m-act-body">
              <div className="m-act-text">Manchester Orthopaedics approved</div>
              <div className="m-act-time">2 hours ago</div>
            </div>
          </div>
          <div className="m-act-row">
            <div className="m-act-dot warn" />
            <div className="m-act-body">
              <div className="m-act-text">New application: Harley Street Implant Centre</div>
              <div className="m-act-time">5 hours ago</div>
            </div>
          </div>
          <div className="m-act-row">
            <div className="m-act-dot accent" />
            <div className="m-act-body">
              <div className="m-act-text">Stryker Orthopaedics added 14 devices</div>
              <div className="m-act-time">Yesterday, 3:41 pm</div>
            </div>
          </div>
          <div className="m-act-row">
            <div className="m-act-dot ok" />
            <div className="m-act-body">
              <div className="m-act-text">Patient IID-SMIJO2311XK registered</div>
              <div className="m-act-time">Yesterday, 11:08 am</div>
            </div>
          </div>
          <div className="m-act-row">
            <div className="m-act-dot muted" />
            <div className="m-act-body">
              <div className="m-act-text">Medtronic onboarded as manufacturer</div>
              <div className="m-act-time">23 May 2026</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
