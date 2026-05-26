'use client'

const auditRows = [
  { when: '26 May 2026 · 09:42', who: 'Master Admin',                    role: 'active',  roleLabel: 'Admin',       action: 'Approved clinic',       entity: 'Manchester Orthopaedics' },
  { when: '25 May 2026 · 16:11', who: 'Toby Russell',                    role: 'draft',   roleLabel: 'Manufacturer', action: 'Updated SAR limits',    entity: 'Azure XT DR (W3DR01)' },
  { when: '25 May 2026 · 14:08', who: 'dr.patel@harleyimplants.co.uk',   role: 'pending', roleLabel: 'Clinic',       action: 'Submitted application', entity: 'Harley Street Implant Centre' },
  { when: '24 May 2026 · 11:30', who: 'Master Admin',                    role: 'active',  roleLabel: 'Admin',       action: 'Added manufacturer',    entity: 'Stryker Orthopaedics' },
  { when: '23 May 2026 · 09:14', who: 'James Carter',                    role: 'draft',   roleLabel: 'Patient',     action: 'Registered patient',    entity: 'IID-SMIJO2311XK' },
  { when: '22 May 2026 · 15:47', who: 'admin@sydneycardiac.au',          role: 'pending', roleLabel: 'Clinic',       action: 'Submitted application', entity: 'Sydney Cardiac Devices' },
  { when: '20 May 2026 · 10:02', who: 'Toby Russell',                    role: 'draft',   roleLabel: 'Manufacturer', action: 'Bulk import',           entity: '96 devices · cardiac-2026-Q1.csv' },
  { when: '18 May 2026 · 08:55', who: 'Master Admin',                    role: 'active',  roleLabel: 'Admin',       action: 'Published device',      entity: 'Cochlear Nucleus Profile Plus' },
  { when: '15 May 2026 · 14:23', who: 'data@zimmerbiomet.com',           role: 'draft',   roleLabel: 'Manufacturer', action: 'Updated device record', entity: 'Oxford Knee System (ZB-OK-PMU3)' },
  { when: '12 May 2026 · 11:00', who: 'dr.chen@manchesterortho.nhs.uk', role: 'pending', roleLabel: 'Clinic',       action: 'Added patient',         entity: 'IID-CHMALE1205TQ' },
]

function downloadCsv() {
  const header = 'When,Who,Role,Action,Entity'
  const rows = auditRows.map(r =>
    [r.when, r.who, r.roleLabel, r.action, r.entity]
      .map(v => `"${v.replace(/"/g, '""')}"`)
      .join(',')
  )
  const csv = [header, ...rows].join('\n')
  const blob = new Blob([csv], { type: 'text/csv' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `implant-id-audit-${new Date().toISOString().slice(0, 10)}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

export default function AuditClient() {
  return (
    <div className="m-content">
      <div className="m-h">
        <div>
          <h2>Audit Log</h2>
          <div className="sub">Every action taken on the platform. Read-only.</div>
        </div>
        <button className="btn btn-s" onClick={downloadCsv}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginRight: 7 }}>
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
            <polyline points="7 10 12 15 17 10"/>
            <line x1="12" y1="15" x2="12" y2="3"/>
          </svg>
          Export CSV
        </button>
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
            {auditRows.map((row, i) => (
              <tr key={i}>
                <td style={{ color: 'var(--muted)', fontFamily: 'var(--ff)', fontSize: 12.5, whiteSpace: 'nowrap' }}>{row.when}</td>
                <td style={{ fontFamily: 'var(--ff)', fontSize: 13 }}>{row.who}</td>
                <td><span className={`m-status ${row.role}`}>{row.roleLabel}</span></td>
                <td>{row.action}</td>
                <td style={{ color: 'var(--muted)', fontFamily: 'var(--ff)', fontSize: 13 }}>{row.entity}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
