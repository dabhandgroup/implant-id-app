export const metadata = { title: 'Audit Log · Master Admin · Implant ID' }

export default function MasterAuditPage() {
  return (
    <div className="m-content">
      <div className="m-h">
        <div>
          <h2>Audit Log</h2>
          <div className="sub">Every action taken on the platform. Read-only.</div>
        </div>
      </div>

      <div className="m-tbl-wrap">
        <table className="m-tbl">
          <thead>
            <tr>
              <th>When</th>
              <th>Who</th>
              <th>Role</th>
              <th>Action</th>
              <th>Entity</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>26 May 2026 · 09:42</td>
              <td>Master Admin</td>
              <td><span className="m-status active">Admin</span></td>
              <td>Approved clinic</td>
              <td>Manchester Orthopaedics</td>
            </tr>
            <tr>
              <td>25 May 2026 · 16:11</td>
              <td>Toby Russell</td>
              <td><span className="m-status draft">Manufacturer</span></td>
              <td>Updated SAR limits</td>
              <td>Azure XT DR (W3DR01)</td>
            </tr>
            <tr>
              <td>25 May 2026 · 14:08</td>
              <td>dr.patel@harleyimplants.co.uk</td>
              <td><span className="m-status pending">Clinic</span></td>
              <td>Submitted application</td>
              <td>Harley Street Implant Centre</td>
            </tr>
            <tr>
              <td>24 May 2026 · 11:30</td>
              <td>Master Admin</td>
              <td><span className="m-status active">Admin</span></td>
              <td>Added manufacturer</td>
              <td>Stryker Orthopaedics</td>
            </tr>
            <tr>
              <td>23 May 2026 · 09:14</td>
              <td>James Carter</td>
              <td><span className="m-status draft">Patient</span></td>
              <td>Registered patient</td>
              <td>IID-SMIJO2311XK</td>
            </tr>
            <tr>
              <td>22 May 2026 · 15:47</td>
              <td>admin@sydneycardiac.au</td>
              <td><span className="m-status pending">Clinic</span></td>
              <td>Submitted application</td>
              <td>Sydney Cardiac Devices</td>
            </tr>
            <tr>
              <td>20 May 2026 · 10:02</td>
              <td>Toby Russell</td>
              <td><span className="m-status draft">Manufacturer</span></td>
              <td>Bulk import</td>
              <td>96 devices · cardiac-2026-Q1.csv</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  )
}
