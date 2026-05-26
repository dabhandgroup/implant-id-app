export const metadata = { title: 'Master Dashboard — Implant ID' }

export default function MasterDashboardPage() {
  return (
    <div style={{
      minHeight: '100vh',
      background: '#0a0a0c',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: 'var(--ff)',
    }}>
      <div style={{ textAlign: 'center', color: '#f0f0f2' }}>
        <div style={{
          width: 64, height: 64, borderRadius: '50%',
          background: 'color-mix(in srgb,var(--accent) 15%,transparent)',
          display: 'grid', placeItems: 'center', margin: '0 auto 20px',
        }}>
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="1.7">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
          </svg>
        </div>
        <h1 style={{ fontSize: 28, fontWeight: 600, letterSpacing: '-.02em', marginBottom: 8 }}>
          Master Dashboard
        </h1>
        <p style={{ color: 'rgba(255,255,255,.45)', fontSize: 15, marginBottom: 32 }}>
          Clinic approvals, manufacturer oversight and platform administration.
        </p>
        <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
          {[
            { label: 'Applications', href: '/master/applications', desc: 'Review clinic submissions' },
            { label: 'Clinics',      href: '/master/clinics',      desc: 'Manage active clinics' },
            { label: 'Devices',      href: '/master/devices',      desc: 'Device catalogue' },
            { label: 'Patients',     href: '/master/patients',     desc: 'All patient records' },
          ].map(item => (
            <a
              key={item.href}
              href={item.href}
              style={{
                display: 'block', padding: '18px 22px',
                background: '#18181b',
                border: '1px solid rgba(255,255,255,.08)',
                borderRadius: 14, textDecoration: 'none', minWidth: 150,
                transition: 'border-color .15s',
              }}
              onMouseEnter={e => (e.currentTarget.style.borderColor = 'rgba(255,255,255,.2)')}
              onMouseLeave={e => (e.currentTarget.style.borderColor = 'rgba(255,255,255,.08)')}
            >
              <div style={{ fontWeight: 600, fontSize: 14, color: '#f0f0f2', marginBottom: 4 }}>{item.label}</div>
              <div style={{ fontSize: 12, color: 'rgba(255,255,255,.35)' }}>{item.desc}</div>
            </a>
          ))}
        </div>
        <p style={{ marginTop: 40, fontSize: 13, color: 'rgba(255,255,255,.2)' }}>
          Full admin UI coming in Phase A
        </p>
      </div>
    </div>
  )
}
