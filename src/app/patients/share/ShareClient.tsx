'use client'
import { useEffect, useState } from 'react'
import { useUser, useClerk }   from '@clerk/nextjs'
import { useQuery, useMutation } from 'convex/react'
import { api }                 from '../../../../convex/_generated/api'
import { useRouter }           from 'next/navigation'

export default function ShareClient() {
  const { user, isLoaded }  = useUser()
  const { signOut }         = useClerk()
  const router              = useRouter()
  const patient             = useQuery(api.patients.getMyPatient)

  // UI state — all hooks declared before any early returns
  const [logoutOpen,    setLogoutOpen]    = useState(false)
  const [linkCopied,    setLinkCopied]    = useState(false)
  const [emailSent,     setEmailSent]     = useState(false)
  const [clinicEmail,   setClinicEmail]   = useState('')
  const [clinicSearch,  setClinicSearch]  = useState('')
  const [sharing,       setSharing]       = useState(false)
  const [shareError,    setShareError]    = useState('')
  const [sbCollapsed,   setSbCollapsed]   = useState(false)
  const [sbOpen,        setSbOpen]        = useState(false)
  const [notifOpen,     setNotifOpen]     = useState(false)

  // Queries
  const allClinics      = useQuery(api.clinics.listClinics)
  const notifications   = useQuery(api.patients.getMyNotifications)
  const markRead        = useMutation(api.patients.markAllNotificationsRead)
  const shareRecordWithClinic = useMutation(api.patients.shareRecordWithClinic)

  // Redirect guards — after all hooks
  useEffect(() => {
    if (patient === null) router.replace('/patients/register')
  }, [patient, router])

  useEffect(() => {
    // If record is still pending, send them back to dashboard
    if (patient && patient.verificationStatus !== 'active') {
      router.replace('/patients/dashboard')
    }
  }, [patient, router])

  // Escape key closes modals
  useEffect(() => {
    function handle(e: KeyboardEvent) {
      if (e.key === 'Escape') { setLogoutOpen(false); setNotifOpen(false) }
    }
    document.addEventListener('keydown', handle)
    return () => document.removeEventListener('keydown', handle)
  }, [])

  // Loading / redirect states — after all hooks
  if (!isLoaded || patient === undefined) {
    return <div style={{ minHeight: '100vh', background: 'var(--bg)' }} />
  }
  if (patient === null || patient.verificationStatus !== 'active') return null

  // Derived data
  const firstName = patient.firstName
  const lastName  = patient.lastName
  const fullName  = `${firstName} ${lastName}`
  const initials  = `${firstName[0] ?? ''}${lastName[0] ?? ''}`.toUpperCase()
  const iidCode   = patient.implantIdCode
  const passUrl   = `${typeof window !== 'undefined' ? window.location.origin : 'https://implantid.io'}/pass/${iidCode}`

  function doSignOut() {
    setLogoutOpen(false)
    signOut({ redirectUrl: '/login' })
  }

  function copyLink() {
    if (navigator.clipboard) navigator.clipboard.writeText(passUrl)
    setLinkCopied(true)
    setTimeout(() => setLinkCopied(false), 2000)
  }

  return (
    <>
      {/* Mobile overlay */}
      <div className={`sb-back${sbOpen ? ' open' : ''}`} onClick={() => setSbOpen(false)} />

      <div className={`app${sbCollapsed ? ' collapsed' : ''}`}>

        {/* ── Sidebar ──────────────────────────────────────────────────────── */}
        <aside className={`sidebar${sbOpen ? ' open' : ''}`}>
          <div className="sb-logo">
            <a href="/" className="logo">
              <img src="/icon.svg" alt="" />
              <span className="logo-text"><b>Implant</b><span>ID</span></span>
            </a>
            <button className="sb-toggle" aria-label="Collapse sidebar" onClick={() => setSbCollapsed(v => !v)}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="15 18 9 12 15 6"/>
              </svg>
            </button>
          </div>

          <div className="sb-scroll">
          <span className="sb-section">My record</span>
          <a className="sb-link" href="/patients/dashboard" title="My record">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
              <rect x="3" y="3" width="7" height="9" rx="1.5"/>
              <rect x="14" y="3" width="7" height="5" rx="1.5"/>
              <rect x="14" y="12" width="7" height="9" rx="1.5"/>
              <rect x="3" y="16" width="7" height="5" rx="1.5"/>
            </svg>
            <span>My record</span>
          </a>
          <a className="sb-link active" href="/patients/share" title="Share with clinic">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
              <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/>
              <path d="M16 6l-4-4-4 4M12 2v13"/>
            </svg>
            <span>Share with clinic</span>
          </a>
          <button type="button" className="sb-link" onClick={() => router.push('/patients/dashboard?section=documents')} title="Documents" style={{ background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'none' }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
              <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20M4 19.5A2.5 2.5 0 0 0 6.5 22H20V2H6.5A2.5 2.5 0 0 0 4 4.5v15z"/>
            </svg>
            <span>Documents</span>
          </button>

          <span className="sb-section">Find care</span>
          <a className="sb-link" href="/patients/find-care" title="Find a clinic">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
              <circle cx="12" cy="10" r="3"/>
            </svg>
            <span>Find a clinic</span>
          </a>

          <span className="sb-section">Account</span>
          <a className="sb-link" href="/patients/account" title="Account settings">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
              <circle cx="12" cy="12" r="3"/>
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33h0a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51h0a1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82v0a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
            </svg>
            <span>Account settings</span>
          </a>
          <a className="sb-link" href="/patients/emergency" title="Emergency info">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.8 19.8 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.8 19.8 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.91.34 1.85.57 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
            <span>Emergency info</span>
          </a>
          <button className="sb-notif" aria-label="Notifications" title="Notifications"
            onClick={e => { e.stopPropagation(); setNotifOpen(true) }}>
            <span className="sb-notif-ic">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
                <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
              </svg>
              <span className="dot" />
            </span>
            <span className="label">Notifications</span>
            <span className="count">{notifications?.filter((n: {read: boolean}) => !n.read).length || 0}</span>
          </button>

          <div className="sb-divider" />
          <div className="sb-identity">
            <div className="av">{initials}</div>
            <div>
              <div className="name">{fullName}</div>
              <div className="role">Patient</div>
            </div>
          </div>
          <a href="/patients/account" className="sb-link">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"><circle cx="12" cy="7" r="4"/><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/></svg>
            <span>My account</span>
          </a>
          <a href="/patients/notifications" className="sb-link">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
            <span>Notifications</span>
          </a>
          <a href="mailto:hello@implantid.io" className="sb-link">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"><circle cx="12" cy="12" r="9"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3M12 17h.01"/></svg>
            <span>Help &amp; docs</span>
          </a>
          <span className="sb-section">Legal</span>
          <a href="https://implantid.io/legal/privacy" target="_blank" rel="noopener noreferrer" className="sb-link">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
            <span>Privacy Policy</span>
          </a>
          <a href="https://implantid.io/legal/terms" target="_blank" rel="noopener noreferrer" className="sb-link">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>
            <span>Terms of Service</span>
          </a>
          <a href="https://implantid.io/legal/gdpr" target="_blank" rel="noopener noreferrer" className="sb-link">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><polyline points="9 12 11 14 15 10"/></svg>
            <span>GDPR</span>
          </a>
          <button className="sb-link sb-signout" onClick={() => setLogoutOpen(true)}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
            <span>Sign out</span>
          </button>
          </div>
        </aside>

        {/* ── Main content ─────────────────────────────────────────────────── */}
        <div className="app-main">

          {/* Mobile header */}
          <div className="mob-header">
            <a href="/patients/dashboard" className="mob-header-logo">
              <img src="/icon.svg" alt="" />
              <span className="logo-text"><b>Implant</b><span>ID</span></span>
            </a>
          </div>

          <div className="sh-wrap">
            <div className="sh-hd">
              <h1>Share with clinic</h1>
              <p>Send your implant record to any clinic so they're ready before you arrive.</p>
            </div>

            {/* QR / Wallet */}
            <div className="sh-card">
              <h2>Share via QR code or Wallet</h2>
              <p className="sub">The fastest way. Show this at your appointment or add the pass to your phone.</p>
              <div style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 12, padding: 24, marginBottom: 20 }}>
                <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 20 }}>
                  <div style={{ width: 180, height: 180, background: '#fff', borderRadius: 8, padding: 8, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={`https://api.qrserver.com/v1/create-qr-code/?size=400x400&margin=10&data=${encodeURIComponent(passUrl)}`}
                      alt={`QR code for ${fullName}'s implant record`}
                      width={164} height={164}
                      style={{ display: 'block', width: '100%', height: '100%', imageRendering: 'pixelated' }}
                    />
                  </div>
                </div>
                <div className="sh-wallet-btns" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 16 }}>
                  <a href={`${passUrl}.pkpass`} className="btn btn-s btn-lg">
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M17.05 12.04c-.02-1.92 1.57-2.85 1.64-2.9-.9-1.3-2.29-1.49-2.78-1.5-1.17-.12-2.3.7-2.9.7-.6 0-1.53-.68-2.52-.66-1.28.02-2.47.75-3.14 1.9-1.36 2.34-.34 5.8.97 7.7.65.94 1.41 1.98 2.4 1.94.97-.04 1.33-.62 2.5-.62s1.5.62 2.53.6c1.04-.02 1.7-.94 2.34-1.88.74-1.08 1.04-2.13 1.05-2.18-.02-.01-2.02-.77-2.05-3.07zM15.1 5.43c.53-.64.88-1.54.78-2.43-.76.03-1.68.5-2.23 1.14-.49.56-.92 1.48-.8 2.35.85.07 1.72-.43 2.25-1.06z"/>
                    </svg>
                    Apple Wallet
                  </a>
                  <a href="#" className="btn btn-s btn-lg">
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
                      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.15-4.53H2.18v2.84A10.99 10.99 0 0 0 12 23z"/>
                      <path fill="#FBBC05" d="M5.85 14.1A6.61 6.61 0 0 1 5.5 12c0-.73.13-1.44.35-2.1V7.07H2.18a11 11 0 0 0 0 9.86l3.67-2.83z"/>
                      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.2 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1A10.99 10.99 0 0 0 2.18 7.07l3.67 2.83C6.71 7.31 9.14 5.38 12 5.38z"/>
                    </svg>
                    Google Wallet
                  </a>
                </div>
                <div style={{ background: 'color-mix(in srgb, var(--accent) 4%, transparent)', border: '1px solid var(--border)', borderRadius: 8, padding: 12, marginBottom: 10 }}>
                  <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5, fontWeight: 600 }}>Your share link</div>
                  <div className="sh-link-row">
                    <input type="text" value={passUrl} readOnly className="input" style={{ flex: 1, background: 'var(--bg2)', fontSize: 13 }} />
                    <button onClick={copyLink} className="btn sh-copy-btn" style={{ whiteSpace: 'nowrap' }}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                        <rect x="9" y="9" width="13" height="13" rx="2"/>
                        <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
                      </svg>
                      {linkCopied ? '✓ Copied' : 'Copy'}
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Share with clinic */}
            <div className="sh-card">
              <h2>Share record with clinic</h2>
              <p className="sub">Search for a clinic we work with, or enter their email directly.</p>

              {!emailSent ? (
                <form onSubmit={async e => {
                  e.preventDefault()
                  if (!clinicEmail) return
                  setSharing(true); setShareError('')
                  try {
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    const matchedClinic = (allClinics ?? []).find((c: any) => c.email === clinicEmail)
                    await shareRecordWithClinic({
                      clinicEmail,
                      clinicName: (matchedClinic?.name ?? clinicSearch.trim()) || undefined,
                    })
                    setEmailSent(true)
                  } catch {
                    setShareError('Failed to send — please try again.')
                  } finally {
                    setSharing(false)
                  }
                }}>
                  {/* Search field */}
                  <div style={{ position: 'relative', marginBottom: 10 }}>
                    <svg style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', width: 15, height: 15, color: 'var(--muted2)', pointerEvents: 'none', zIndex: 1 }}
                      viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
                      <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
                    </svg>
                    <input className="input" type="text" placeholder="Search clinic name…"
                      value={clinicSearch}
                      onChange={e => { setClinicSearch(e.target.value); setClinicEmail('') }}
                      style={{ paddingLeft: 42 }}
                    />
                  </div>

                  {/* Clinic results dropdown */}
                  {clinicSearch.trim().length >= 2 && (() => {
                    const q = clinicSearch.toLowerCase()
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    const matches = (allClinics ?? []).filter((c: any) =>
                      c.name.toLowerCase().includes(q) || c.email?.toLowerCase().includes(q)
                    ).slice(0, 5)
                    return matches.length > 0 ? (
                      <div style={{ border: '1px solid var(--border)', borderRadius: 10, marginBottom: 12, overflow: 'hidden', boxShadow: '0 4px 12px rgba(0,0,0,.06)' }}>
                        {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                        {matches.map((c: any, i: number) => (
                          <button key={c._id} type="button"
                            onClick={() => { setClinicEmail(c.email ?? ''); setClinicSearch(c.name) }}
                            style={{ display: 'flex', alignItems: 'center', gap: 12, width: '100%', padding: '12px 16px', background: clinicEmail === c.email ? 'color-mix(in srgb,var(--accent) 7%,transparent)' : 'transparent', border: 'none', cursor: 'pointer', textAlign: 'left', borderBottom: i < matches.length - 1 ? '1px solid var(--border)' : 'none' }}
                          >
                            <div style={{ width: 32, height: 32, borderRadius: 8, background: 'color-mix(in srgb,var(--accent) 10%,transparent)', display: 'grid', placeItems: 'center', flexShrink: 0, fontFamily: 'var(--ff)', fontWeight: 700, fontSize: 12, color: 'var(--accent)' }}>
                              {c.name.slice(0,2).toUpperCase()}
                            </div>
                            <div style={{ flex: 1 }}>
                              <div style={{ fontFamily: 'var(--ff)', fontSize: 14, fontWeight: 500, color: 'var(--text)' }}>{c.name}</div>
                              {c.city && <div style={{ fontFamily: 'var(--fb)', fontSize: 12, color: 'var(--muted)' }}>{c.city}{c.country ? `, ${c.country}` : ''}</div>}
                            </div>
                            {clinicEmail === c.email && (
                              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2.5"><path d="M20 6L9 17l-5-5"/></svg>
                            )}
                          </button>
                        ))}
                      </div>
                    ) : (
                      <div style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 12, padding: '10px 14px', background: 'color-mix(in srgb,#f59e0b 7%,transparent)', border: '1px solid color-mix(in srgb,#f59e0b 20%,transparent)', borderRadius: 8, lineHeight: 1.55 }}>
                        Clinic not found — enter their email below and we'll invite them to join Implant ID.
                      </div>
                    )
                  })()}

                  {/* Manual email field */}
                  <div className="sh-field" style={{ marginBottom: 14 }}>
                    <label style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 6, display: 'block' }}>Or enter clinic email</label>
                    <input className="input" type="email" placeholder="records@clinic.com" required
                      value={clinicEmail} onChange={e => setClinicEmail(e.target.value)} />
                  </div>

                  {/* Your name (prefilled) */}
                  <div className="sh-field" style={{ marginBottom: 16 }}>
                    <label style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 6, display: 'block' }}>Your name</label>
                    <input className="input" type="text" value={fullName} readOnly
                      style={{ background: 'color-mix(in srgb, var(--text) 3%, transparent)', color: 'var(--text)' }} />
                  </div>

                  {shareError && <div style={{ color: 'var(--err)', fontSize: 13, marginBottom: 12 }}>{shareError}</div>}

                  <button type="submit" className="btn btn-s btn-lg" style={{ width: '100%' }} disabled={!clinicEmail || sharing}>
                    {sharing ? 'Sending…' : (
                      // eslint-disable-next-line @typescript-eslint/no-explicit-any
                      clinicEmail && (allClinics ?? []).find((c: any) => c.email === clinicEmail)
                        ? 'Send my record →'
                        : 'Send record + invite clinic →'
                    )}
                  </button>
                </form>
              ) : (
                <div style={{ textAlign: 'center', padding: '20px 0' }}>
                  <div style={{ width: 52, height: 52, borderRadius: '50%', background: 'color-mix(in srgb,var(--ok) 12%,transparent)', color: 'var(--ok)', display: 'grid', placeItems: 'center', margin: '0 auto 14px' }}>
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M20 6 9 17l-5-5"/>
                    </svg>
                  </div>
                  <h3 style={{ fontFamily: 'var(--ff)', fontSize: 18, marginBottom: 8 }}>Sent!</h3>
                  <p style={{ color: 'var(--muted)', fontSize: 14, marginBottom: 6 }}>
                    Your implant record has been sent to <strong>{clinicEmail}</strong>.
                  </p>
                  <p style={{ color: 'var(--muted)', fontSize: 13, marginBottom: 20 }}>
                    A confirmation has also been sent to your email address.
                  </p>
                  <button className="btn btn-lg" onClick={() => { setEmailSent(false); setClinicEmail(''); setClinicSearch(''); setShareError('') }}>Done</button>
                </div>
              )}
            </div>

            <p style={{ textAlign: 'center', color: 'var(--muted2)', fontFamily: 'var(--ff)', fontSize: 12, padding: '8px 0 40px' }}>
              Encrypted · Signed · Safe to share with any clinic
            </p>
          </div>

          {/* Mobile nav */}
          <nav className="mob-nav" aria-label="Mobile navigation">
            <div className="mob-nav-tabs">
              <a href="/patients/dashboard" className="mob-nav-tab" aria-label="My record">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
                  <rect x="3" y="3" width="7" height="9" rx="1.5"/>
                  <rect x="14" y="3" width="7" height="5" rx="1.5"/>
                  <rect x="14" y="12" width="7" height="9" rx="1.5"/>
                  <rect x="3" y="16" width="7" height="5" rx="1.5"/>
                </svg>
                <span className="t">Record</span>
              </a>
              <a href="/patients/share" className="mob-nav-tab active" aria-label="Share with clinic">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
                  <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/>
                  <path d="M16 6l-4-4-4 4M12 2v13"/>
                </svg>
                <span className="t">Share</span>
              </a>
              <a href="/patients/find-care" className="mob-nav-tab" aria-label="Find a clinic">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
                  <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
                  <circle cx="12" cy="10" r="3"/>
                </svg>
                <span className="t">Find</span>
              </a>
              <a href="/patients/account" className="mob-nav-tab" aria-label="Account">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
                  <circle cx="12" cy="7" r="4"/>
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                </svg>
                <span className="t">Account</span>
              </a>
              <button className="mob-nav-tab mob-nav-menu-btn" aria-label="Toggle menu" onClick={() => setSbOpen(v => !v)}>
                <div className="ham-ic"><span /><span /><span /></div>
                <span className="t">Menu</span>
              </button>
            </div>
          </nav>
        </div>
      </div>

      {/* Notification drawer */}
      <div className={`notif-back${notifOpen ? ' open' : ''}`} onClick={() => setNotifOpen(false)} />
      <aside className={`notif-drawer${notifOpen ? ' open' : ''}`} aria-label="Notifications">
        <div className="notif-h">
          <h3>Updates</h3>
          <button className="x" onClick={() => setNotifOpen(false)}><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button>
        </div>
        <div className="notif-list">
          {!notifications || notifications.length === 0 ? (
            <div style={{ padding: '20px 16px', textAlign: 'center', color: 'var(--muted)', fontSize: 13 }}>No notifications</div>
          ) : (notifications as {_id: string, title: string, body: string, read: boolean, createdAt: number}[]).map(n => (
            <div key={n._id} style={{ padding: '14px 16px', borderBottom: '1px solid var(--border)', borderLeft: n.read ? '3px solid transparent' : '3px solid var(--accent)', background: n.read ? 'transparent' : 'color-mix(in srgb,var(--accent) 5%,transparent)', display: 'flex', alignItems: 'flex-start', gap: 10 }}>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
                  <span style={{ fontFamily: 'var(--ff)', fontSize: 13.5, fontWeight: n.read ? 400 : 600, color: 'var(--text)' }}>{n.title}</span>
                  {!n.read && <span style={{ fontFamily: 'var(--ff)', fontSize: 10, fontWeight: 700, letterSpacing: '.4px', textTransform: 'uppercase', color: 'var(--accent)', background: 'color-mix(in srgb,var(--accent) 12%,transparent)', borderRadius: 4, padding: '2px 6px' }}>New</span>}
                </div>
                <div style={{ fontSize: 12.5, color: 'var(--muted)', lineHeight: 1.5 }}>{n.body}</div>
                <div style={{ fontSize: 11.5, color: 'var(--muted2)', marginTop: 4 }}>{new Date(n.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</div>
              </div>
            </div>
          ))}
        </div>
        <div className="notif-foot">
          <a href="#" onClick={e => { e.preventDefault(); markRead() }}>Mark all as read</a>
          <a href="/patients/account">Notification settings</a>
        </div>
      </aside>

      {/* Logout modal */}
      <div
        className={`logout-back${logoutOpen ? ' open' : ''}`}
        onClick={e => { if (e.target === e.currentTarget) setLogoutOpen(false) }}
      >
        <div className="logout-modal">
          <div className="logout-body">
            <div className="logout-ic">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
                <polyline points="16 17 21 12 16 7"/>
                <line x1="21" y1="12" x2="9" y2="12"/>
              </svg>
            </div>
            <h3>Log out of Implant ID?</h3>
            <p>You'll need to sign back in to access your implant record and wallet pass. Your data stays safe either way.</p>
          </div>
          <div className="logout-actions">
            <button className="btn btn-lg" onClick={() => setLogoutOpen(false)}>← Back</button>
            <button className="btn btn-danger btn-lg" onClick={doSignOut}>Yes, log out</button>
          </div>
        </div>
      </div>
    </>
  )
}
