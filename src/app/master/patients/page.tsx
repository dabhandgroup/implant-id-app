export const metadata = { title: 'Patients · Master Admin · Implant ID' }

export default function MasterPatientsPage() {
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
            <circle cx="11" cy="11" r="8"/>
            <line x1="21" y1="21" x2="16.65" y2="16.65"/>
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
              <th>Verified</th>
              <th>Clinic</th>
              <th>Devices</th>
              <th>Last Active</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style={{ fontFamily: 'var(--ff)', letterSpacing: '.04em', color: 'var(--accent)' }}>IID-SMIJO2311XK</td>
              <td>John Smith</td>
              <td>12 Mar 2026</td>
              <td><span className="m-status active">Active</span></td>
              <td>Manchester Orthopaedic Centre</td>
              <td>2</td>
              <td>25 May 2026</td>
            </tr>
            <tr>
              <td style={{ fontFamily: 'var(--ff)', letterSpacing: '.04em', color: 'var(--accent)' }}>IID-BREMA1404RP</td>
              <td>Emma Brown</td>
              <td>3 Apr 2026</td>
              <td><span className="m-status active">Active</span></td>
              <td>Boston Spine &amp; Joint</td>
              <td>1</td>
              <td>24 May 2026</td>
            </tr>
            <tr>
              <td style={{ fontFamily: 'var(--ff)', letterSpacing: '.04em', color: 'var(--accent)' }}>IID-WILSA0805YT</td>
              <td>Sarah Williams</td>
              <td>8 May 2026</td>
              <td><span className="m-status pending">Pending</span></td>
              <td>Auckland Joint Replacement</td>
              <td>1</td>
              <td>20 May 2026</td>
            </tr>
            <tr>
              <td style={{ fontFamily: 'var(--ff)', letterSpacing: '.04em', color: 'var(--accent)' }}>IID-JONMA1509NQ</td>
              <td>Mark Jones</td>
              <td>15 May 2026</td>
              <td><span className="m-status active">Active</span></td>
              <td>Dublin Spinal Institute</td>
              <td>3</td>
              <td>26 May 2026</td>
            </tr>
            <tr>
              <td style={{ fontFamily: 'var(--ff)', letterSpacing: '.04em', color: 'var(--accent)' }}>IID-TAYEL2202CX</td>
              <td>Eleanor Taylor</td>
              <td>22 May 2026</td>
              <td><span className="m-status pending">Pending</span></td>
              <td>Harley Street Implant Centre</td>
              <td>1</td>
              <td>22 May 2026</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  )
}
