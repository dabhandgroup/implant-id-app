'use client'

import { useState } from 'react'

type FilterType = 'all' | 'scan' | 'view' | 'access' | 'admin'

const AUDIT_ROWS = [
  { id: 1, type: 'scan',   time: 'Today 09:44',     user: 'Dr Okafor',      action: 'Card scanned — Marcus Bennett',                sub: 'IID-P-00198 · Medtronic Azure XT DR · MRI Conditional',     tag: 'Scan',   tagClass: 'type-scan' },
  { id: 2, type: 'view',   time: 'Today 08:10',      user: 'Laura Martinez', action: 'Patient record viewed — Sarah Mitchell',        sub: 'Access granted · IID-P-00142',                               tag: 'View',   tagClass: 'type-view' },
  { id: 3, type: 'access', time: 'Yesterday 17:42',  user: 'Tom Price',      action: 'Access request sent — Priya Sharma',            sub: 'Awaiting patient approval · IID-P-00177',                    tag: 'Access', tagClass: 'type-access' },
  { id: 4, type: 'access', time: 'Yesterday 16:15',  user: 'Priya Sharma',   action: 'Access request approved — Priya Sharma',        sub: "Patient approved Tom Price's request · IID-P-00177",         tag: 'Access', tagClass: 'type-access' },
  { id: 5, type: 'admin',  time: 'Yesterday 11:30',  user: 'Dr Okafor',      action: 'Staff member invited — james.chen@northside.nhs.uk', sub: 'Role: Clinician · Expires 19 May 2026',                tag: 'Admin',  tagClass: 'type-admin' },
  { id: 6, type: 'access', time: '13 May 16:22',     user: 'Daniel Chen',    action: 'Access request declined — Daniel Chen',          sub: 'Patient declined access request · IID-P-00055',              tag: 'Access', tagClass: 'type-access' },
  { id: 7, type: 'scan',   time: '13 May 14:00',     user: 'Dr Sarah Russo', action: 'Card scanned — Raymond Tan',                    sub: 'IID-P-00163 · Boston Scientific Accolade MRI',               tag: 'Scan',   tagClass: 'type-scan' },
  { id: 8, type: 'admin',  time: '12 May 09:15',     user: 'Dr Okafor',      action: 'Clinic settings updated',                       sub: 'Notification preferences changed',                            tag: 'Admin',  tagClass: 'type-admin' },
  { id: 9, type: 'admin',  time: '10 May 11:04',     user: 'System',         action: 'New member joined — Laura Martinez',             sub: 'Invitation accepted · Role: Clinician',                       tag: 'Admin',  tagClass: 'type-admin' },
]

const FILTERS: { key: FilterType; label: string }[] = [
  { key: 'all',    label: 'All activity' },
  { key: 'scan',   label: 'Card scans' },
  { key: 'view',   label: 'Record views' },
  { key: 'access', label: 'Access events' },
  { key: 'admin',  label: 'Admin' },
]

function exportCSV(rows: typeof AUDIT_ROWS) {
  const header = 'Time,User,Action,Detail,Type'
  const lines = rows.map(r =>
    [r.time, r.user, r.action, r.sub, r.tag]
      .map(v => `"${v.replace(/"/g, '""')}"`)
      .join(',')
  )
  const csv = [header, ...lines].join('\n')
  const blob = new Blob([csv], { type: 'text/csv' })
  const url  = URL.createObjectURL(blob)
  const a    = document.createElement('a')
  a.href     = url
  a.download = 'audit-log.csv'
  a.click()
  URL.revokeObjectURL(url)
}

export default function AuditClient() {
  const [filter, setFilter] = useState<FilterType>('all')

  const rows = filter === 'all'
    ? AUDIT_ROWS
    : AUDIT_ROWS.filter(r => r.type === filter)

  return (
    <div className="audit-page">
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16, marginBottom: 22 }}>
        <div>
          <div className="ey">Activity log</div>
          <h2 style={{ fontSize: 'clamp(20px,2vw,26px)', letterSpacing: '-.025em', marginTop: 6 }}>
            Northside Imaging — all activity
          </h2>
          <p style={{ color: 'var(--muted)', fontSize: 14, marginTop: 6, lineHeight: 1.5 }}>
            A full record of every scan, lookup, access request, and admin action across your clinic.
          </p>
        </div>
        <button
          className="btn"
          style={{ flexShrink: 0, display: 'inline-flex', alignItems: 'center', gap: 7, fontSize: 13 }}
          onClick={() => exportCSV(rows)}
          aria-label="Export audit log as CSV"
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3"/>
          </svg>
          Export CSV
        </button>
      </div>

      <div className="audit-filters">
        {FILTERS.map(f => (
          <button
            key={f.key}
            className={`audit-filter-btn${filter === f.key ? ' active' : ''}`}
            onClick={() => setFilter(f.key)}
          >
            {f.label}
          </button>
        ))}
      </div>

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div className="audit-head">
          <div>Time</div>
          <div>User</div>
          <div>Action</div>
          <div>Type</div>
        </div>
        <div>
          {rows.length > 0 ? rows.map(r => (
            <div key={r.id} className="audit-row">
              <div className="audit-time">{r.time}</div>
              <div className="audit-user">{r.user}</div>
              <div className="audit-detail">
                <div className="audit-action">{r.action}</div>
                <div className="audit-sub">{r.sub}</div>
              </div>
              <span className={`audit-tag ${r.tagClass}`}>{r.tag}</span>
            </div>
          )) : (
            <div style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--muted)', fontSize: 14 }}>
              No activity events for this filter.
            </div>
          )}
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 16, color: 'var(--muted)', fontSize: 13 }}>
        <span>Showing {rows.length} of {AUDIT_ROWS.length} events</span>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn" style={{ fontSize: 13, padding: '6px 14px' }} disabled>← Previous</button>
          <button className="btn" style={{ fontSize: 13, padding: '6px 14px' }} disabled>Next →</button>
        </div>
      </div>
    </div>
  )
}
