'use client'

import { useState, useMemo } from 'react'
import { useQuery } from 'convex/react'
import { api } from '../../../../convex/_generated/api'

type FilterType = 'all' | 'scan' | 'view' | 'access' | 'admin'

const FILTERS: { key: FilterType; label: string }[] = [
  { key: 'all',    label: 'All activity' },
  { key: 'scan',   label: 'Card scans' },
  { key: 'view',   label: 'Record views' },
  { key: 'access', label: 'Access events' },
  { key: 'admin',  label: 'Admin' },
]

function actionToType(action: string): FilterType {
  if (action === 'patient_lookup')  return 'scan'
  if (action === 'patient_saved')   return 'access'
  if (action === 'access_request')  return 'access'
  if (action === 'record_viewed')   return 'view'
  return 'admin'
}

function actionLabel(action: string, patientName: string): string {
  if (action === 'patient_lookup') return patientName ? `Card scanned — ${patientName}` : 'Card scanned'
  if (action === 'patient_saved')  return patientName ? `Patient saved — ${patientName}` : 'Patient saved'
  if (action === 'access_request') return patientName ? `Access requested — ${patientName}` : 'Access requested'
  if (action === 'record_viewed')  return patientName ? `Record viewed — ${patientName}` : 'Record viewed'
  return action.replace(/_/g, ' ')
}

function actionTag(type: FilterType): { label: string; cls: string } {
  if (type === 'scan')   return { label: 'Scan',   cls: 'type-scan' }
  if (type === 'view')   return { label: 'View',   cls: 'type-view' }
  if (type === 'access') return { label: 'Access', cls: 'type-access' }
  return { label: 'Admin', cls: 'type-admin' }
}

function formatTime(ts: number): string {
  const d   = new Date(ts)
  const now = new Date()
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()
  const hm  = d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
  if (ts >= todayStart) return `Today ${hm}`
  if (ts >= todayStart - 86400000) return `Yesterday ${hm}`
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) + ' ' + hm
}

type Row = {
  _id:    string
  type:   FilterType
  time:   string
  user:   string
  action: string
  sub:    string
  tag:    string
  tagCls: string
}

function exportCSV(rows: Row[]) {
  const header = 'Time,User,Action,Detail,Type'
  const lines  = rows.map(r =>
    [r.time, r.user, r.action, r.sub, r.tag]
      .map(v => `"${String(v).replace(/"/g, '""')}"`)
      .join(',')
  )
  const csv  = [header, ...lines].join('\n')
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
  const entries = useQuery(api.clinics.getClinicAuditLog, {})

  const allRows: Row[] = useMemo(() => {
    if (!entries) return []
    return entries.map(e => {
      const type = actionToType(e.action)
      const tag  = actionTag(type)
      const sub  = [e.patientCode, e.detail].filter(Boolean).join(' · ')
      return {
        _id:    String(e._id),
        type,
        time:   formatTime(e.createdAt),
        user:   e.staffName,
        action: actionLabel(e.action, e.patientName),
        sub,
        tag:    tag.label,
        tagCls: tag.cls,
      }
    })
  }, [entries])

  const rows = filter === 'all' ? allRows : allRows.filter(r => r.type === filter)

  if (entries === undefined) {
    return (
      <div className="audit-page">
        <div className="card" style={{ padding: 40, textAlign: 'center', color: 'var(--muted)', fontSize: 14 }}>
          Loading activity log…
        </div>
      </div>
    )
  }

  return (
    <div className="audit-page">
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16, marginBottom: 22 }}>
        <div>
          <div className="ey">Activity log</div>
          <h2 style={{ fontSize: 'clamp(20px,2vw,26px)', letterSpacing: '-.025em', marginTop: 6 }}>
            All activity
          </h2>
          <p style={{ color: 'var(--muted)', fontSize: 14, marginTop: 6, lineHeight: 1.5 }}>
            A full record of every scan, lookup, and access event across your clinic.
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
            <div key={r._id} className="audit-row">
              <div className="audit-time">{r.time}</div>
              <div className="audit-user">{r.user}</div>
              <div className="audit-detail">
                <div className="audit-action">{r.action}</div>
                {r.sub && <div className="audit-sub">{r.sub}</div>}
              </div>
              <span className={`audit-tag ${r.tagCls}`}>{r.tag}</span>
            </div>
          )) : (
            <div style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--muted)', fontSize: 14 }}>
              {allRows.length === 0 ? 'No activity recorded yet.' : 'No activity events for this filter.'}
            </div>
          )}
        </div>
      </div>

      <div style={{ marginTop: 16, color: 'var(--muted)', fontSize: 13 }}>
        Showing {rows.length} of {allRows.length} events
      </div>
    </div>
  )
}
