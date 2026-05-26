export const metadata = { title: 'Devices · Master Admin · Implant ID' }

export default function MasterDevicesPage() {
  return (
    <div className="m-content">
      <div className="m-h">
        <div>
          <h2>All Devices</h2>
          <div className="sub">Full catalogue of implantable medical devices across all manufacturers.</div>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <a href="/master/devices/add" className="btn btn-s">+ Add Device</a>
          <a href="/master/devices/bulk" className="btn">Bulk Upload</a>
        </div>
      </div>

      <div className="m-tbl-toolbar">
        <div className="search">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
            <circle cx="11" cy="11" r="8"/>
            <line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          <input type="text" placeholder="Search devices, manufacturers…" />
        </div>
        <button className="m-act">Filter by category</button>
      </div>

      <div className="m-tbl-wrap">
        <table className="m-tbl">
          <thead>
            <tr>
              <th>Device Name</th>
              <th>Manufacturer</th>
              <th>Category</th>
              <th>Model No.</th>
              <th>MRI Safe</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Acumed Total Hip System</td>
              <td>Acumed Ltd</td>
              <td>Hip Replacement</td>
              <td>ACU-TH-7742</td>
              <td style={{ color: 'var(--ok)' }}>MR Conditional</td>
              <td><span className="m-status active">Active</span></td>
              <td style={{ display: 'flex', gap: 6 }}>
                <button className="m-act">Edit</button>
                <button className="m-act danger">Archive</button>
              </td>
            </tr>
            <tr>
              <td>Zimmer Biomet Oxford Knee</td>
              <td>Zimmer Biomet</td>
              <td>Knee Replacement</td>
              <td>ZB-OK-PMU3</td>
              <td style={{ color: 'var(--ok)' }}>MR Safe</td>
              <td><span className="m-status active">Active</span></td>
              <td style={{ display: 'flex', gap: 6 }}>
                <button className="m-act">Edit</button>
                <button className="m-act danger">Archive</button>
              </td>
            </tr>
            <tr>
              <td>Medtronic Micra AV</td>
              <td>Medtronic plc</td>
              <td>Cardiac Pacemaker</td>
              <td>MDT-MICRA-AV2</td>
              <td style={{ color: 'var(--warn)' }}>MR Conditional</td>
              <td><span className="m-status active">Active</span></td>
              <td style={{ display: 'flex', gap: 6 }}>
                <button className="m-act">Edit</button>
                <button className="m-act danger">Archive</button>
              </td>
            </tr>
            <tr>
              <td>Stryker Tritanium PL Cage</td>
              <td>Stryker Orthopaedics</td>
              <td>Spinal Implant</td>
              <td>STR-TT-PL-S</td>
              <td style={{ color: 'var(--ok)' }}>MR Safe</td>
              <td><span className="m-status draft">Draft</span></td>
              <td style={{ display: 'flex', gap: 6 }}>
                <button className="m-act">Edit</button>
                <button className="m-act">Publish</button>
              </td>
            </tr>
            <tr>
              <td>Cochlear Nucleus Profile Plus</td>
              <td>Cochlear Ltd</td>
              <td>Cochlear Implant</td>
              <td>COC-CI-N7-P</td>
              <td style={{ color: 'var(--err)' }}>MR Unsafe</td>
              <td><span className="m-status active">Active</span></td>
              <td style={{ display: 'flex', gap: 6 }}>
                <button className="m-act">Edit</button>
                <button className="m-act danger">Archive</button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  )
}
