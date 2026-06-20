'use client'

export default function AuditClient() {
  return (
    <div className="m-content">
      <div className="m-h">
        <div>
          <h2>Audit Log</h2>
          <div className="sub">Platform-wide admin events. Read-only.</div>
        </div>
      </div>

      <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 14, padding: '56px 40px', textAlign: 'center' }}>
        <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="var(--muted2)" strokeWidth="1.5" style={{ display: 'block', margin: '0 auto 16px' }}>
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
          <path d="M14 2v6h6M16 13H8M16 17H8M10 9H8"/>
        </svg>
        <div style={{ fontFamily: 'var(--ff)', fontSize: 15, fontWeight: 500, color: 'var(--text)', marginBottom: 8 }}>Platform audit log coming soon</div>
        <div style={{ fontSize: 13.5, color: 'var(--muted)', lineHeight: 1.6, maxWidth: 380, margin: '0 auto' }}>
          Recording of admin approvals, device changes, and clinic events will appear here once the audit pipeline is wired.
        </div>
      </div>
    </div>
  )
}
