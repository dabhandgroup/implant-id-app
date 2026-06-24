'use client'

import { useQuery } from 'convex/react'
import { api } from '../../../../convex/_generated/api'

function formatDate(ts: number) {
  return new Date(ts).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
}
function formatTime(ts: number) {
  return new Date(ts).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
}
function actionLabel(action: string) {
  if (action === 'patient_lookup') return 'Patient viewed'
  return action.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
}

export default function AuditClient() {
  const entries = useQuery(api.clinics.listAllAuditLogs, { limit: 500 })

  return (
    <div className="m-content">
      <div className="m-h">
        <div>
          <h2>Audit Log</h2>
          <div className="sub">Platform-wide clinic activity. Read-only.</div>
        </div>
        {entries && entries.length > 0 && (
          <div style={{ fontSize: 13, color: 'var(--muted)' }}>{entries.length} event{entries.length !== 1 ? 's' : ''}</div>
        )}
      </div>

      {entries === undefined && (
        <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 14, padding: 32 }}>
          {[...Array(6)].map((_, i) => (
            <div key={i} style={{ height: 18, background: 'var(--border)', borderRadius: 6, marginBottom: 14, width: `${70 + (i % 3) * 10}%`, opacity: 0.5 }} />
          ))}
        </div>
      )}

      {entries !== undefined && entries.length === 0 && (
        <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 14, padding: '56px 40px', textAlign: 'center' }}>
          <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="var(--muted2)" strokeWidth="1.5" style={{ display: 'block', margin: '0 auto 16px' }}>
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
            <path d="M14 2v6h6M16 13H8M16 17H8M10 9H8"/>
          </svg>
          <div style={{ fontSize: 15, fontWeight: 500, color: 'var(--text)', marginBottom: 8 }}>No events yet</div>
          <div style={{ fontSize: 13.5, color: 'var(--muted)', lineHeight: 1.6, maxWidth: 340, margin: '0 auto' }}>
            Clinic patient lookups and admin actions will appear here as clinics use the platform.
          </div>
        </div>
      )}

      {entries !== undefined && entries.length > 0 && (
        <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 14, overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13.5 }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)' }}>
                {['Date', 'Time', 'Clinic', 'Staff', 'Action', 'Patient'].map(h => (
                  <th key={h} style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600, fontSize: 12, color: 'var(--muted)', letterSpacing: '.04em', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {entries.map((e, i) => (
                <tr key={e._id} style={{ borderBottom: i < entries.length - 1 ? '1px solid var(--border)' : 'none', background: i % 2 === 1 ? 'rgba(var(--bg-rgb),0.40)' : 'transparent' }}>
                  <td style={{ padding: '11px 16px', color: 'var(--muted)', whiteSpace: 'nowrap' }}>{formatDate(e.createdAt)}</td>
                  <td style={{ padding: '11px 16px', color: 'var(--muted)', whiteSpace: 'nowrap' }}>{formatTime(e.createdAt)}</td>
                  <td style={{ padding: '11px 16px', fontWeight: 500, color: 'var(--text)' }}>{e.clinicName}</td>
                  <td style={{ padding: '11px 16px', color: 'var(--text)' }}>{e.staffName}</td>
                  <td style={{ padding: '11px 16px' }}>
                    <span style={{ background: 'rgba(var(--accent-rgb),0.12)', color: 'var(--accent-deep)', fontSize: 12, fontWeight: 600, padding: '3px 8px', borderRadius: 5 }}>
                      {actionLabel(e.action)}
                    </span>
                  </td>
                  <td style={{ padding: '11px 16px', color: 'var(--text)' }}>
                    {e.patientName ? (
                      <span>
                        {e.patientName}
                        {e.patientCode && <span style={{ marginLeft: 6, fontSize: 11.5, color: 'var(--muted)', fontFamily: 'monospace' }}>{e.patientCode}</span>}
                      </span>
                    ) : (
                      <span style={{ color: 'var(--muted2)' }}>—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
