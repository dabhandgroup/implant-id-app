export const metadata = { title: 'Clinics · Master Admin · Implant ID' }

export default function MasterClinicsPage() {
  return (
    <div className="m-content">
      <div className="m-h">
        <div>
          <h2>Clinics</h2>
          <div className="sub">All registered and active clinic accounts on the platform.</div>
        </div>
        <button className="btn btn-s">+ Add Clinic</button>
      </div>

      <div className="m-tbl-toolbar">
        <div className="search">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
            <circle cx="11" cy="11" r="8"/>
            <line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          <input type="text" placeholder="Search clinics…" />
        </div>
        <button className="m-act">Filter by status</button>
      </div>

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
            <tr>
              <td>Manchester Orthopaedic Centre</td>
              <td>United Kingdom</td>
              <td><span className="m-status active">Active</span></td>
              <td>4</td>
              <td>38</td>
              <td>12 Jan 2026</td>
              <td style={{ display: 'flex', gap: 6 }}>
                <button className="m-act">View</button>
                <button className="m-act danger">Suspend</button>
              </td>
            </tr>
            <tr>
              <td>Boston Spine &amp; Joint</td>
              <td>United States</td>
              <td><span className="m-status active">Active</span></td>
              <td>7</td>
              <td>61</td>
              <td>3 Feb 2026</td>
              <td style={{ display: 'flex', gap: 6 }}>
                <button className="m-act">View</button>
                <button className="m-act danger">Suspend</button>
              </td>
            </tr>
            <tr>
              <td>Sydney Cardiac Devices</td>
              <td>Australia</td>
              <td><span className="m-status pending">Pending</span></td>
              <td>2</td>
              <td>0</td>
              <td>22 May 2026</td>
              <td style={{ display: 'flex', gap: 6 }}>
                <button className="m-act">View</button>
                <button className="m-act approve">Approve</button>
              </td>
            </tr>
            <tr>
              <td>Harley Street Implant Centre</td>
              <td>United Kingdom</td>
              <td><span className="m-status pending">Pending</span></td>
              <td>3</td>
              <td>0</td>
              <td>24 May 2026</td>
              <td style={{ display: 'flex', gap: 6 }}>
                <button className="m-act">View</button>
                <button className="m-act approve">Approve</button>
              </td>
            </tr>
            <tr>
              <td>Auckland Joint Replacement</td>
              <td>New Zealand</td>
              <td><span className="m-status active">Active</span></td>
              <td>5</td>
              <td>44</td>
              <td>28 Mar 2026</td>
              <td style={{ display: 'flex', gap: 6 }}>
                <button className="m-act">View</button>
                <button className="m-act danger">Suspend</button>
              </td>
            </tr>
            <tr>
              <td>Dublin Spinal Institute</td>
              <td>Ireland</td>
              <td><span className="m-status active">Active</span></td>
              <td>6</td>
              <td>29</td>
              <td>15 Apr 2026</td>
              <td style={{ display: 'flex', gap: 6 }}>
                <button className="m-act">View</button>
                <button className="m-act danger">Suspend</button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  )
}
