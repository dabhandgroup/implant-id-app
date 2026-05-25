'use client'
import { useEffect, useState } from 'react'
import { useUser, useClerk }   from '@clerk/nextjs'
import { useQuery }            from 'convex/react'
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
  const [clinicMessage, setClinicMessage] = useState('')
  const [sbCollapsed,   setSbCollapsed]   = useState(false)
  const [sbOpen,        setSbOpen]        = useState(false)
  const [profileOpen,   setProfileOpen]   = useState(false)
  const [notifOpen,     setNotifOpen]     = useState(false)

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

  function handleEmailSubmit(e: React.FormEvent) {
    e.preventDefault()
    // TODO: wire up to a Convex mutation that sends via Resend
    setEmailSent(true)
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
          <a className="sb-link" href="#" title="Documents &amp; manuals">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
              <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20M4 19.5A2.5 2.5 0 0 0 6.5 22H20V2H6.5A2.5 2.5 0 0 0 4 4.5v15z"/>
            </svg>
            <span>Documents &amp; manuals</span>
          </a>

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

          {/* Profile bottom */}
          <div className="sb-bot" onClick={() => setProfileOpen(v => !v)}>
            <div className="av" style={{ background: 'var(--accent)', color: '#fff', fontFamily: 'var(--ff)', fontSize: 13, fontWeight: 600 }}>
              {initials}
            </div>
            <div>
              <div className="name">{fullName}</div>
              <div className="role">Patient</div>
            </div>
            <span className="chev">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="18 15 12 9 6 15"/>
              </svg>
            </span>
          </div>

          <div className={`profile-menu${profileOpen ? ' open' : ''}`}>
            <a href="/patients/account">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
                <circle cx="12" cy="7" r="4"/>
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
              </svg>
              My account
            </a>
            <a href="#">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
                <circle cx="12" cy="12" r="9"/>
                <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3M12 17h.01"/>
              </svg>
              Help &amp; docs
            </a>
            <hr />
            <button className="danger" onClick={() => { setProfileOpen(false); setLogoutOpen(true) }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
                <polyline points="16 17 21 12 16 7"/>
                <line x1="21" y1="12" x2="9" y2="12"/>
              </svg>
              Sign out
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
              <div className="sh-qr-area">
                <div className="sh-qr">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=400x400&margin=10&data=${encodeURIComponent(passUrl)}`}
                    alt={`QR code for ${fullName}'s implant record`}
                    width={200} height={200}
                    style={{ display: 'block', width: '100%', height: '100%', imageRendering: 'pixelated' }}
                  />
                </div>
                <div className="sh-wallet-btns">
                  <a href={`${passUrl}.pkpass`} className="btn btn-s">
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M17.05 12.04c-.02-1.92 1.57-2.85 1.64-2.9-.9-1.3-2.29-1.49-2.78-1.5-1.17-.12-2.3.7-2.9.7-.6 0-1.53-.68-2.52-.66-1.28.02-2.47.75-3.14 1.9-1.36 2.34-.34 5.8.97 7.7.65.94 1.41 1.98 2.4 1.94.97-.04 1.33-.62 2.5-.62s1.5.62 2.53.6c1.04-.02 1.7-.94 2.34-1.88.74-1.08 1.04-2.13 1.05-2.18-.02-.01-2.02-.77-2.05-3.07zM15.1 5.43c.53-.64.88-1.54.78-2.43-.76.03-1.68.5-2.23 1.14-.49.56-.92 1.48-.8 2.35.85.07 1.72-.43 2.25-1.06z"/>
                    </svg>
                    Add to Apple Wallet
                  </a>
                  <a href="#" className="btn">
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
                      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.15-4.53H2.18v2.84A10.99 10.99 0 0 0 12 23z"/>
                      <path fill="#FBBC05" d="M5.85 14.1A6.61 6.61 0 0 1 5.5 12c0-.73.13-1.44.35-2.1V7.07H2.18a11 11 0 0 0 0 9.86l3.67-2.83z"/>
                      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.2 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1A10.99 10.99 0 0 0 2.18 7.07l3.67 2.83C6.71 7.31 9.14 5.38 12 5.38z"/>
                    </svg>
                    Add to Google Wallet
                  </a>
                  <button className="btn" onClick={copyLink}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                      <rect x="9" y="9" width="13" height="13" rx="2"/>
                      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
                    </svg>
                    {linkCopied ? '✓ Copied!' : 'Copy share link'}
                  </button>
                </div>
              </div>
            </div>

            {/* Email a clinic */}
            <div className="sh-card">
              <h2>Email your record to a clinic</h2>
              <p className="sub">Send a signed copy of your implant record directly to any clinic's email address.</p>

              {!emailSent ? (
                <form onSubmit={handleEmailSubmit}>
                  <div className="sh-field">
                    <label>Clinic email<span style={{ color: 'var(--err)', marginLeft: 3 }}>*</span></label>
                    <input className="input" type="email" placeholder="records@clinic.com" required
                      value={clinicEmail} onChange={e => setClinicEmail(e.target.value)} />
                  </div>
                  <div className="sh-field">
                    <label>Your name</label>
                    <input className="input" type="text" value={fullName} readOnly
                      style={{ background: 'var(--bg)', color: 'var(--muted)' }} />
                  </div>
                  <div className="sh-field">
                    <label>Message <span style={{ fontWeight: 400, opacity: .6 }}>(optional)</span></label>
                    <textarea className="input" rows={3}
                      placeholder={`Hi, I have a ${patient.selfReportedDeviceType ?? 'medical implant'} and need to share my record before my appointment…`}
                      value={clinicMessage} onChange={e => setClinicMessage(e.target.value)}
                    />
                  </div>
                  <button type="submit" className="btn btn-s btn-lg" style={{ width: '100%' }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                      <path d="M4 4h16a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z"/>
                      <path d="m22 6-10 7L2 6"/>
                    </svg>
                    Send to clinic
                  </button>
                </form>
              ) : (
                <div className="sh-sent">
                  <div className="sh-sent-ic">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M20 6 9 17l-5-5"/>
                    </svg>
                  </div>
                  <h3>Sent!</h3>
                  <p>Your implant record has been sent to <strong>{clinicEmail}</strong>.</p>
                  <button className="btn btn-lg" onClick={() => { setEmailSent(false); setClinicEmail(''); setClinicMessage('') }}>
                    Send to another clinic
                  </button>
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
          <button className="x" onClick={() => setNotifOpen(false)}>✕</button>
        </div>
        <div className="notif-foot"><a href="#">Mark all as read</a><a href="#">Settings</a></div>
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
