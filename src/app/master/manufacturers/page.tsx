export const metadata = { title: 'Manufacturers · Master Admin · Implant ID' }

export default function MasterManufacturersPage() {
  return (
    <div className="m-content">
      <div className="m-h">
        <div>
          <h2>Manufacturers</h2>
          <div className="sub">Device manufacturers with access to the Implant ID platform catalogue.</div>
        </div>
        <button className="btn btn-s">+ Invite Manufacturer</button>
      </div>

      <div className="m-tbl-wrap">
        <table className="m-tbl">
          <thead>
            <tr>
              <th>Company</th>
              <th>Contact</th>
              <th>Country</th>
              <th>Status</th>
              <th>Devices</th>
              <th>Joined</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Medtronic plc</td>
              <td>uk@medtronic.com</td>
              <td>Ireland</td>
              <td><span className="m-status active">Active</span></td>
              <td>312</td>
              <td>10 Jan 2026</td>
              <td style={{ display: 'flex', gap: 6 }}>
                <button className="m-act">View</button>
                <button className="m-act danger">Suspend</button>
              </td>
            </tr>
            <tr>
              <td>Zimmer Biomet</td>
              <td>data@zimmerbiomet.com</td>
              <td>United States</td>
              <td><span className="m-status active">Active</span></td>
              <td>487</td>
              <td>14 Jan 2026</td>
              <td style={{ display: 'flex', gap: 6 }}>
                <button className="m-act">View</button>
                <button className="m-act danger">Suspend</button>
              </td>
            </tr>
            <tr>
              <td>Stryker Orthopaedics</td>
              <td>catalogue@stryker.com</td>
              <td>United States</td>
              <td><span className="m-status active">Active</span></td>
              <td>214</td>
              <td>20 Feb 2026</td>
              <td style={{ display: 'flex', gap: 6 }}>
                <button className="m-act">View</button>
                <button className="m-act danger">Suspend</button>
              </td>
            </tr>
            <tr>
              <td>Cochlear Ltd</td>
              <td>implantid@cochlear.com</td>
              <td>Australia</td>
              <td><span className="m-status pending">Pending</span></td>
              <td>0</td>
              <td>18 May 2026</td>
              <td style={{ display: 'flex', gap: 6 }}>
                <button className="m-act">View</button>
                <button className="m-act approve">Approve</button>
              </td>
            </tr>
            <tr>
              <td>Acumed Ltd</td>
              <td>accounts@acumed.net</td>
              <td>United Kingdom</td>
              <td><span className="m-status pending">Pending</span></td>
              <td>0</td>
              <td>21 May 2026</td>
              <td style={{ display: 'flex', gap: 6 }}>
                <button className="m-act">View</button>
                <button className="m-act approve">Approve</button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  )
}
