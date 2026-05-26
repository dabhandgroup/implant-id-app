export const metadata = { title: 'Pending Applications · Master Admin · Implant ID' }

export default function MasterApplicationsPage() {
  return (
    <div className="m-content">
      <div className="m-h">
        <div>
          <h2>Pending Applications</h2>
          <div className="sub">Clinic applications awaiting review and approval.</div>
        </div>
      </div>

      <div className="m-tbl-wrap">
        <table className="m-tbl">
          <thead>
            <tr>
              <th>Clinic Name</th>
              <th>Contact Email</th>
              <th>Phone</th>
              <th>Country</th>
              <th>Facility Type</th>
              <th>Submitted</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Harley Street Implant Centre</td>
              <td>dr.patel@harleyimplants.co.uk</td>
              <td>+44 20 7946 0011</td>
              <td>United Kingdom</td>
              <td>Private Hospital</td>
              <td>24 May 2026</td>
              <td><span className="m-status pending">Pending</span></td>
              <td>
                <div style={{ display: 'flex', gap: 6 }}>
                  <button className="m-act">View</button>
                  <button className="m-act approve">Approve</button>
                  <button className="m-act reject">Reject</button>
                </div>
              </td>
            </tr>
            <tr>
              <td>Sydney Cardiac Devices</td>
              <td>admin@sydneycardiac.au</td>
              <td>+61 2 9374 1800</td>
              <td>Australia</td>
              <td>Specialist Clinic</td>
              <td>22 May 2026</td>
              <td><span className="m-status pending">Pending</span></td>
              <td>
                <div style={{ display: 'flex', gap: 6 }}>
                  <button className="m-act">View</button>
                  <button className="m-act approve">Approve</button>
                  <button className="m-act reject">Reject</button>
                </div>
              </td>
            </tr>
            <tr>
              <td>Edinburgh Neuro &amp; Spine</td>
              <td>reception@edinburghneuro.co.uk</td>
              <td>+44 131 550 9200</td>
              <td>United Kingdom</td>
              <td>NHS Trust</td>
              <td>20 May 2026</td>
              <td><span className="m-status pending">Pending</span></td>
              <td>
                <div style={{ display: 'flex', gap: 6 }}>
                  <button className="m-act">View</button>
                  <button className="m-act approve">Approve</button>
                  <button className="m-act reject">Reject</button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  )
}
