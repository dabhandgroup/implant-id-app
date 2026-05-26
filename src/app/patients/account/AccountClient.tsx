'use client'
import { useState, useEffect, useRef } from 'react'
import { useUser, useClerk }           from '@clerk/nextjs'
import { useQuery }                    from 'convex/react'
import { api }                         from '../../../../convex/_generated/api'
import { useRouter }                   from 'next/navigation'
import { CustomSelect }                from '@/components/ui/CustomSelect'
import QRCode                          from 'qrcode'

const MONTHS_LONG = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December',
]

const VISIBILITY_OPTIONS = [
  { label: 'Global — any registered clinician can look me up', value: 'global' },
  { label: 'Restricted — only clinicians I\'ve shared with',   value: 'restricted' },
  { label: 'Emergency only — visible in emergencies only',     value: 'emergency' },
]

export default function AccountClient() {
  const { user, isLoaded } = useUser()
  const { signOut }        = useClerk()
  const router             = useRouter()
  const patient            = useQuery(api.patients.getMyPatient)

  // ── UI state ──────────────────────────────────────────────────────────────
  const [sbCollapsed,    setSbCollapsed]    = useState(false)
  const [sbOpen,         setSbOpen]         = useState(false)
  const [profileOpen,    setProfileOpen]    = useState(false)
  const [mobProfileOpen, setMobProfileOpen] = useState(false)
  const [notifOpen,      setNotifOpen]      = useState(false)
  const [logoutOpen,     setLogoutOpen]     = useState(false)

  // ── Notification preferences (persist to Convex in Phase 3) ───────────────
  const [notifRecord,  setNotifRecord]  = useState(true)
  const [notifWallet,  setNotifWallet]  = useState(true)
  const [notifTips,    setNotifTips]    = useState(true)
  const [notifNetwork, setNotifNetwork] = useState(false)

  // ── Privacy preferences (persist to Convex in Phase 3) ───────────────────
  const [visibility,      setVisibility]      = useState('global')
  const [emergencyAccess, setEmergencyAccess] = useState(true)
  const [shareLocation,   setShareLocation]   = useState(false)

  // ── Security — passkeys ───────────────────────────────────────────────────
  const [passkeyLoading, setPasskeyLoading] = useState(false)
  const [passkeyErr,     setPasskeyErr]     = useState('')

  // ── Security — TOTP ───────────────────────────────────────────────────────
  const [totpSetup,          setTotpSetup]          = useState<{ secret: string; uri: string } | null>(null)
  const [totpQr,             setTotpQr]             = useState('')
  const [totpShowKey,        setTotpShowKey]        = useState(false)
  const [totpCode,           setTotpCode]           = useState('')
  const [totpVerifyErr,      setTotpVerifyErr]      = useState('')
  const [totpVerifyLoading,  setTotpVerifyLoading]  = useState(false)
  const [totpDisableLoading, setTotpDisableLoading] = useState(false)
  const [totpDisableErr,     setTotpDisableErr]     = useState('')
  const [secretCopied,       setSecretCopied]       = useState(false)

  // ── Profile photo upload ──────────────────────────────────────────────────
  const [photoUploading, setPhotoUploading] = useState(false)
  const [photoErr,       setPhotoErr]       = useState('')

  // ── Implant ID clipboard ──────────────────────────────────────────────────
  const [iidCopied, setIidCopied] = useState(false)

  const sbBotRef      = useRef<HTMLDivElement>(null)
  const mobProfileRef = useRef<HTMLDivElement>(null)
  const photoInputRef = useRef<HTMLInputElement>(null)

  // Close dropdowns on outside click
  useEffect(() => {
    function handle(e: MouseEvent) {
      const t = e.target as HTMLElement
      if (sbBotRef.current      && !sbBotRef.current.contains(t))      setProfileOpen(false)
      if (mobProfileRef.current && !mobProfileRef.current.contains(t)) setMobProfileOpen(false)
    }
    document.addEventListener('mousedown', handle)
    return () => document.removeEventListener('mousedown', handle)
  }, [])

  // Escape closes modals
  useEffect(() => {
    function handle(e: KeyboardEvent) {
      if (e.key === 'Escape') { setLogoutOpen(false); setNotifOpen(false) }
    }
    document.addEventListener('keydown', handle)
    return () => document.removeEventListener('keydown', handle)
  }, [])

  // Redirect to registration if no record
  useEffect(() => {
    if (patient === null) router.replace('/patients/register')
  }, [patient, router])

  // ── Guards ────────────────────────────────────────────────────────────────
  if (!isLoaded || patient === undefined) {
    return <div style={{ minHeight: '100vh', background: 'var(--bg)' }} />
  }
  if (patient === null) return null // redirecting

  // ── Derived data ──────────────────────────────────────────────────────────
  const firstName = patient.firstName
  const lastName  = patient.lastName
  const fullName  = `${firstName} ${lastName}`
  const initials  = `${firstName[0] ?? ''}${lastName[0] ?? ''}`.toUpperCase()
  const iidCode   = patient.implantIdCode
  const isPending = !patient.verificationStatus || patient.verificationStatus === 'pending'
  const email     = user?.primaryEmailAddress?.emailAddress ?? ''
  const phone     = user?.primaryPhoneNumber?.phoneNumber ?? ''
  const photoUrl  = user?.imageUrl

  // Format DOB: stored as YYYY-MM-DD
  let dobFormatted = ''
  if (patient.dob) {
    const [y, m, d] = patient.dob.split('-')
    const monthName = MONTHS_LONG[parseInt(m, 10) - 1] ?? ''
    dobFormatted = `${parseInt(d, 10)} ${monthName} ${y}`
  }

  async function addPasskey() {
    if (!user) return
    setPasskeyErr('')
    setPasskeyLoading(true)
    try {
      await user.createPasskey()
    } catch (err: unknown) {
      const e = err as { errors?: Array<{ message: string }> }
      setPasskeyErr(e?.errors?.[0]?.message ?? 'Failed to add passkey. Try again.')
    } finally {
      setPasskeyLoading(false)
    }
  }

  async function removePasskey(id: string) {
    if (!user) return
    setPasskeyErr('')
    try {
      const pk = user.passkeys?.find(p => p.id === id)
      await pk?.delete()
    } catch (err: unknown) {
      const e = err as { errors?: Array<{ message: string }> }
      setPasskeyErr(e?.errors?.[0]?.message ?? 'Failed to remove passkey. Try again.')
    }
  }

  async function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file || !user) return
    setPhotoErr('')
    setPhotoUploading(true)
    try {
      await user.setProfileImage({ file })
    } catch (err: unknown) {
      const ex = err as { errors?: Array<{ message: string }> }
      setPhotoErr(ex?.errors?.[0]?.message ?? 'Upload failed — please try again.')
    } finally {
      setPhotoUploading(false)
      if (photoInputRef.current) photoInputRef.current.value = ''
    }
  }

  async function copyIid() {
    if (!iidCode) return
    try {
      await navigator.clipboard.writeText(iidCode)
      setIidCopied(true)
      setTimeout(() => setIidCopied(false), 2000)
    } catch { /* ignore */ }
  }

  async function startTotpSetup() {
    if (!user) return
    setTotpVerifyErr('')
    setTotpCode('')
    setTotpShowKey(false)
    try {
      const totp = await user.createTOTP()
      const uri = totp.uri ?? ''
      const secret = totp.secret ?? ''
      setTotpSetup({ secret, uri })
      // Generate QR entirely in-browser — secret never leaves the device
      if (uri) {
        const dataUrl = await QRCode.toDataURL(uri, { margin: 1, width: 180, color: { dark: '#0e2a33', light: '#ffffff' } })
        setTotpQr(dataUrl)
      }
    } catch (err: unknown) {
      const e = err as { errors?: Array<{ message: string }> }
      setTotpVerifyErr(e?.errors?.[0]?.message ?? 'Failed to start 2FA setup.')
    }
  }

  async function verifyTotpSetup() {
    if (!user || !totpSetup || totpCode.length < 6) return
    setTotpVerifyErr('')
    setTotpVerifyLoading(true)
    try {
      await user.verifyTOTP({ code: totpCode })
      setTotpSetup(null)
      setTotpCode('')
      setTotpQr('')
      setTotpShowKey(false)
    } catch (err: unknown) {
      const e = err as { errors?: Array<{ message: string }> }
      setTotpVerifyErr(e?.errors?.[0]?.message ?? 'Incorrect code — check the app and try again.')
    } finally {
      setTotpVerifyLoading(false)
    }
  }

  async function disableTotp() {
    if (!user) return
    setTotpDisableErr('')
    setTotpDisableLoading(true)
    try {
      await user.disableTOTP()
    } catch (err: unknown) {
      const e = err as { errors?: Array<{ message: string }> }
      setTotpDisableErr(e?.errors?.[0]?.message ?? 'Failed to disable 2FA. Try again.')
    } finally {
      setTotpDisableLoading(false)
    }
  }

  function copySecret() {
    if (!totpSetup) return
    navigator.clipboard.writeText(totpSetup.secret).then(() => {
      setSecretCopied(true)
      setTimeout(() => setSecretCopied(false), 2000)
    })
  }

  function doSignOut() {
    setLogoutOpen(false)
    signOut({ redirectUrl: '/login' })
  }

  return (
    <>
      {/* Mobile sidebar overlay */}
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

          {isPending ? (
            <span className="sb-link sb-link--locked" aria-disabled="true" title="Available once your record is verified">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
                <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/>
                <path d="M16 6l-4-4-4 4M12 2v13"/>
              </svg>
              <span>Share with clinic</span>
              <svg className="sb-lock" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                <rect x="3" y="11" width="18" height="11" rx="2"/>
                <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
              </svg>
            </span>
          ) : (
            <a className="sb-link" href="/patients/share" title="Share with clinic">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
                <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/>
                <path d="M16 6l-4-4-4 4M12 2v13"/>
              </svg>
              <span>Share with clinic</span>
            </a>
          )}

          {isPending ? (
            <span className="sb-link sb-link--locked" aria-disabled="true" title="Available once your record is verified">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
                <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20M4 19.5A2.5 2.5 0 0 0 6.5 22H20V2H6.5A2.5 2.5 0 0 0 4 4.5v15z"/>
              </svg>
              <span>Documents &amp; manuals</span>
              <svg className="sb-lock" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                <rect x="3" y="11" width="18" height="11" rx="2"/>
                <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
              </svg>
            </span>
          ) : (
            <a className="sb-link" href="#" title="Documents &amp; manuals">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
                <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20M4 19.5A2.5 2.5 0 0 0 6.5 22H20V2H6.5A2.5 2.5 0 0 0 4 4.5v15z"/>
              </svg>
              <span>Documents &amp; manuals</span>
            </a>
          )}

          <span className="sb-section">Find care</span>
          <a className="sb-link" href="/patients/find-care" title="Find a clinic">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
              <circle cx="12" cy="10" r="3"/>
            </svg>
            <span>Find a clinic</span>
          </a>

          <span className="sb-section">Account</span>
          <a className="sb-link active" href="/patients/account" title="Account settings">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
              <circle cx="12" cy="12" r="3"/>
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33h0a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51h0a1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82v0a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
            </svg>
            <span>Account settings</span>
          </a>

          {/* Notifications button */}
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
            <span className="count">2</span>
          </button>

          {/* Profile bottom */}
          <div ref={sbBotRef} className="sb-bot" onClick={() => setProfileOpen(v => !v)}>
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

        {/* ── App main ─────────────────────────────────────────────────────── */}
        <div className="app-main">

          {/* Mobile top header */}
          <div className="mob-header">
            <a href="/patients/dashboard" className="mob-header-logo">
              <img src="/icon.svg" alt="" />
              <span className="logo-text"><b>Implant</b><span>ID</span></span>
            </a>
            <div ref={mobProfileRef} className="mob-hdr-profile">
              <button className="mob-hdr-av" aria-label="Profile menu"
                onClick={() => setMobProfileOpen(v => !v)}>
                {initials}
              </button>
              <div className={`mob-hdr-menu${mobProfileOpen ? ' open' : ''}`}>
                <div className="mob-hdr-info">
                  <strong>{fullName}</strong>
                  <span>Patient · {iidCode}</span>
                </div>
                <hr />
                <a href="/patients/account">My account</a>
                <a href="#">Help &amp; docs</a>
                <button className="danger" onClick={() => { setMobProfileOpen(false); setLogoutOpen(true) }}>
                  Sign out
                </button>
              </div>
            </div>
          </div>

          {/* ── Page content ─────────────────────────────────────────────── */}
          <div className="acc-wrap">
            <div className="acc-hd">
              <h1>Account settings</h1>
              <p>Manage your profile, preferences, and privacy.</p>
            </div>

            {/* ── Profile photo ─────────────────────────────────────────── */}
            <div className="acc-card">
              <h2>Profile photo</h2>
              <div className="sub">This appears on your Implant ID profile and Wallet pass.</div>
              <div className="photo-area">
                <div className="photo-av">
                  {photoUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={photoUrl} alt={fullName} />
                  ) : (
                    <div className="initials">{initials}</div>
                  )}
                </div>
                <div>
                  <div className="photo-hint" style={{ marginTop: 0, marginBottom: 8, fontSize: 13, color: 'var(--muted)' }}>
                    JPG or PNG · square crops best · max 5 MB
                  </div>
                  {photoErr && (
                    <div className="sec-err" style={{ marginBottom: 10 }}>{photoErr}</div>
                  )}
                  <div className="photo-actions">
                    <input
                      ref={photoInputRef}
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      style={{ display: 'none' }}
                      onChange={handlePhotoChange}
                    />
                    <button
                      className="btn btn-s"
                      type="button"
                      onClick={() => photoInputRef.current?.click()}
                      disabled={photoUploading}
                      style={{ fontSize: 13, padding: '8px 16px' }}
                    >
                      {photoUploading ? 'Uploading…' : 'Change photo'}
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* ── Personal details ──────────────────────────────────────── */}
            <div className="acc-card">
              <h2>Personal details</h2>
              <div className="sub">
                Your name and date of birth identify your implant record and cannot be changed
                without re-verification. Contact{' '}
                <a href="mailto:support@implantid.io" style={{ color: 'var(--accent)' }}>
                  support@implantid.io
                </a>{' '}
                to request changes.
              </div>
              <div className="f-grid">
                <div className="f-group">
                  <label className="f-label">First name</label>
                  <input type="text" className="f-input" value={firstName} disabled readOnly />
                </div>
                <div className="f-group">
                  <label className="f-label">Last name</label>
                  <input type="text" className="f-input" value={lastName} disabled readOnly />
                </div>
                {email && (
                  <div className="f-group">
                    <label className="f-label">Email</label>
                    <input type="email" className="f-input" value={email} disabled readOnly />
                  </div>
                )}
                {phone && (
                  <div className="f-group">
                    <label className="f-label">Phone</label>
                    <input type="tel" className="f-input" value={phone} disabled readOnly />
                    <span style={{ fontSize: 12, color: 'var(--muted2)', lineHeight: 1.5 }}>
                      Your phone number is linked to your Implant ID. To change it, contact{' '}
                      <a href="mailto:support@implantid.io" style={{ color: 'var(--accent)' }}>support@implantid.io</a>.
                    </span>
                  </div>
                )}
                {dobFormatted && (
                  <div className="f-group">
                    <label className="f-label">Date of birth</label>
                    <input type="text" className="f-input" value={dobFormatted} disabled readOnly />
                  </div>
                )}
                <div className="f-group">
                  <label className="f-label">Implant ID</label>
                  <button
                    type="button"
                    className="f-input"
                    onClick={copyIid}
                    title="Click to copy your Implant ID"
                    aria-label={`Implant ID ${iidCode} — click to copy`}
                    style={{
                      textAlign: 'left',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: 8,
                      width: '100%',
                      background: iidCopied ? 'color-mix(in srgb,var(--ok) 8%,var(--bg))' : undefined,
                      borderColor: iidCopied ? 'var(--ok)' : undefined,
                      color: iidCopied ? 'var(--ok)' : 'var(--text)',
                      transition: 'background .2s,border-color .2s,color .2s',
                    }}
                  >
                    <span style={{ fontFamily: 'var(--fb)', letterSpacing: '.05em' }}>{iidCode}</span>
                    <span style={{ fontSize: 11.5, fontFamily: 'var(--ff)', fontWeight: 500, opacity: .65, flexShrink: 0, letterSpacing: '.02em' }}>
                      {iidCopied ? '✓ Copied!' : 'Copy'}
                    </span>
                  </button>
                </div>
              </div>
            </div>

            {/* ── Security ──────────────────────────────────────────────── */}
            <div className="acc-card">
              <h2>Security</h2>
              <div className="sub">Manage passkeys and two-factor authentication to keep your account secure.</div>

              {/* Passkeys */}
              <div className="sec-section">
                <div className="sec-section-hd">
                  <div>
                    <b style={{ fontFamily: 'var(--ff)', fontSize: 14.5, display: 'block', marginBottom: 3 }}>Passkeys</b>
                    <span style={{ fontSize: 13, color: 'var(--muted)' }}>
                      Sign in with Face ID, Touch ID, or Windows Hello instead of a password.
                    </span>
                  </div>
                  <button
                    className="btn btn-s"
                    onClick={addPasskey}
                    disabled={passkeyLoading}
                    style={{ flexShrink: 0, fontSize: 13, padding: '8px 14px' }}
                  >
                    {passkeyLoading ? 'Adding…' : '+ Add passkey'}
                  </button>
                </div>

                {(!user?.passkeys || user.passkeys.length === 0) && (
                  <div className="sec-empty">No passkeys added yet.</div>
                )}

                {user?.passkeys && user.passkeys.length > 0 && (
                  <div className="sec-list">
                    {user.passkeys.map(pk => (
                      <div key={pk.id} className="sec-row">
                        <div className="sec-row-ic">
                          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                            <path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0 3 3L22 7l-3-3m-3.5 3.5L19 4"/>
                          </svg>
                        </div>
                        <div className="sec-row-info">
                          <b>{pk.name || 'Passkey'}</b>
                          {pk.createdAt && (
                            <span>Added {new Date(pk.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                          )}
                        </div>
                        <button
                          className="btn"
                          onClick={() => removePasskey(pk.id)}
                          style={{ fontSize: 12, padding: '5px 12px', color: 'var(--err)', borderColor: 'color-mix(in srgb, var(--err) 30%, var(--border))' }}
                        >
                          Remove
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {passkeyErr && <div className="sec-err">{passkeyErr}</div>}
              </div>

              <div className="sec-divider" />

              {/* Two-factor authentication */}
              <div className="sec-section">
                <div className="sec-section-hd">
                  <div>
                    <b style={{ fontFamily: 'var(--ff)', fontSize: 14.5, display: 'block', marginBottom: 3 }}>Two-factor authentication</b>
                    <span style={{ fontSize: 13, color: 'var(--muted)' }}>
                      Require a one-time code from Google Authenticator or Authy on each login.
                    </span>
                  </div>
                  {!totpSetup && (
                    user?.twoFactorEnabled ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
                        <span className="sec-badge sec-badge--on">Enabled</span>
                        <button
                          className="btn"
                          onClick={disableTotp}
                          disabled={totpDisableLoading}
                          style={{ fontSize: 12, padding: '5px 12px', color: 'var(--err)', borderColor: 'color-mix(in srgb, var(--err) 30%, var(--border))' }}
                        >
                          {totpDisableLoading ? 'Removing…' : 'Remove'}
                        </button>
                      </div>
                    ) : (
                      <button
                        className="btn btn-s"
                        onClick={startTotpSetup}
                        style={{ flexShrink: 0, fontSize: 13, padding: '8px 14px' }}
                      >
                        Set up
                      </button>
                    )
                  )}
                </div>

                {!user?.twoFactorEnabled && !totpSetup && (
                  <div className="sec-empty">Not enabled. Add an authenticator app for an extra layer of security.</div>
                )}

                {/* TOTP setup flow */}
                {totpSetup && (
                  <div className="totp-setup">
                    <div className="totp-step">
                      <div className="totp-step-num">1</div>
                      <div style={{ minWidth: 0, width: '100%' }}>
                        <b>Scan the QR code</b>
                        <p>Open Google Authenticator, Authy, or any TOTP app. Tap <b>+</b> then <b>Scan QR code</b>.</p>
                        {totpQr && (
                          <div style={{ margin: '12px 0 8px', display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 10 }}>
                            <img
                              src={totpQr}
                              alt="TOTP QR code"
                              width={164} height={164}
                              style={{ borderRadius: 10, border: '1px solid var(--border)', display: 'block' }}
                            />
                            <button
                              className="link-btn"
                              style={{ fontSize: 12.5, color: 'var(--muted)' }}
                              onClick={() => setTotpShowKey(v => !v)}
                            >
                              {totpShowKey ? 'Hide setup key' : "Can't scan? Enter key manually"}
                            </button>
                            {totpShowKey && (
                              <div style={{ width: '100%' }}>
                                <div className="totp-secret-row">
                                  <code className="totp-secret">{totpSetup.secret}</code>
                                  <button className="btn" style={{ fontSize: 12, padding: '5px 12px', flexShrink: 0 }} onClick={copySecret}>
                                    {secretCopied ? 'Copied ✓' : 'Copy'}
                                  </button>
                                </div>
                                <p style={{ marginTop: 5, fontSize: 12, color: 'var(--muted2)' }}>
                                  Account: Implant ID · Type: Time-based
                                </p>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="totp-step">
                      <div className="totp-step-num">2</div>
                      <div style={{ width: '100%', minWidth: 0 }}>
                        <b>Enter the 6-digit code</b>
                        <p style={{ marginBottom: 10 }}>Type the code shown in your authenticator app to confirm setup.</p>
                        {totpVerifyErr && <div className="sec-err" style={{ marginBottom: 10 }}>{totpVerifyErr}</div>}
                        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                          <input
                            type="tel"
                            inputMode="numeric"
                            className="f-input"
                            placeholder="000000"
                            value={totpCode}
                            onChange={e => setTotpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                            style={{ fontFamily: 'var(--ff)', letterSpacing: '0.15em', maxWidth: 150, fontSize: 18 }}
                          />
                          <button
                            className="btn btn-s"
                            onClick={verifyTotpSetup}
                            disabled={totpVerifyLoading || totpCode.length < 6}
                            style={{ fontSize: 13, padding: '8px 16px' }}
                          >
                            {totpVerifyLoading ? 'Verifying…' : 'Verify'}
                          </button>
                          <button
                            className="btn"
                            onClick={() => { setTotpSetup(null); setTotpCode(''); setTotpVerifyErr(''); setTotpQr(''); setTotpShowKey(false) }}
                            style={{ fontSize: 13, padding: '8px 16px' }}
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {totpDisableErr && <div className="sec-err" style={{ marginTop: 8 }}>{totpDisableErr}</div>}
              </div>
            </div>

            {/* ── Notification preferences ──────────────────────────────── */}
            <div className="acc-card">
              <h2>Notification preferences</h2>
              <div className="sub">Choose what updates you'd like to receive from Implant ID.</div>
              <div className="toggle-row">
                <div className="toggle-label">
                  <b>Record updates</b>
                  <span>When your implant record is verified or updated</span>
                </div>
                <label className="toggle">
                  <input type="checkbox" checked={notifRecord} onChange={e => setNotifRecord(e.target.checked)} />
                  <span className="slider" />
                </label>
              </div>
              <div className="toggle-row">
                <div className="toggle-label">
                  <b>Wallet pass sync</b>
                  <span>When your Wallet pass is refreshed with new data</span>
                </div>
                <label className="toggle">
                  <input type="checkbox" checked={notifWallet} onChange={e => setNotifWallet(e.target.checked)} />
                  <span className="slider" />
                </label>
              </div>
              <div className="toggle-row">
                <div className="toggle-label">
                  <b>Tips &amp; guidance</b>
                  <span>Helpful tips about managing your implant record</span>
                </div>
                <label className="toggle">
                  <input type="checkbox" checked={notifTips} onChange={e => setNotifTips(e.target.checked)} />
                  <span className="slider" />
                </label>
              </div>
              <div className="toggle-row">
                <div className="toggle-label">
                  <b>Network updates</b>
                  <span>New clinics in your area joining the Implant ID network</span>
                </div>
                <label className="toggle">
                  <input type="checkbox" checked={notifNetwork} onChange={e => setNotifNetwork(e.target.checked)} />
                  <span className="slider" />
                </label>
              </div>
            </div>

            {/* ── Privacy & sharing ─────────────────────────────────────── */}
            <div className="acc-card">
              <h2>Privacy &amp; sharing</h2>
              <div className="sub">Control who can access your implant record.</div>
              <div className="f-grid">
                <div className="f-group full">
                  <label className="f-label">Profile visibility</label>
                  <CustomSelect
                    value={visibility}
                    onChange={setVisibility}
                    options={VISIBILITY_OPTIONS}
                  />
                </div>
              </div>
              <div className="toggle-row" style={{ marginTop: 8 }}>
                <div className="toggle-label">
                  <b>Emergency access</b>
                  <span>Allow paramedics to see critical implant info without login</span>
                </div>
                <label className="toggle">
                  <input type="checkbox" checked={emergencyAccess} onChange={e => setEmergencyAccess(e.target.checked)} />
                  <span className="slider" />
                </label>
              </div>
              <div className="toggle-row">
                <div className="toggle-label">
                  <b>Share location with clinics</b>
                  <span>Helps nearby clinics prepare for your visit</span>
                </div>
                <label className="toggle">
                  <input type="checkbox" checked={shareLocation} onChange={e => setShareLocation(e.target.checked)} />
                  <span className="slider" />
                </label>
              </div>
              <div className="save-bar">
                <button className="btn btn-s" onClick={() => {/* TODO Phase 3: persist to Convex */}}>
                  Save preferences
                </button>
              </div>
            </div>

            {/* ── Danger zone ───────────────────────────────────────────── */}
            <div className="acc-card danger-zone">
              <h2>Delete account</h2>
              <div className="sub">
                Permanently delete your Implant ID account. For medical record-keeping compliance,
                your implant data is retained for up to 7 years, then permanently deleted.
              </div>
              <a href="/patients/offboard" className="danger-btn">Delete my account →</a>
            </div>

          </div>{/* /acc-wrap */}

          {/* Mobile bottom navigation */}
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
              {isPending ? (
                <span className="mob-nav-tab mob-nav-tab--locked" aria-disabled="true" aria-label="Share — available once verified">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
                    <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/>
                    <path d="M16 6l-4-4-4 4M12 2v13"/>
                  </svg>
                  <span className="t">Share</span>
                </span>
              ) : (
                <a href="/patients/share" className="mob-nav-tab" aria-label="Share with clinic">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
                    <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/>
                    <path d="M16 6l-4-4-4 4M12 2v13"/>
                  </svg>
                  <span className="t">Share</span>
                </a>
              )}
              <a href="/patients/find-care" className="mob-nav-tab" aria-label="Find a clinic">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
                  <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
                  <circle cx="12" cy="10" r="3"/>
                </svg>
                <span className="t">Find</span>
              </a>
              <a href="/patients/account" className="mob-nav-tab active" aria-label="Account">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
                  <circle cx="12" cy="7" r="4"/>
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                </svg>
                <span className="t">Account</span>
              </a>
              <button className="mob-nav-tab mob-nav-menu-btn" aria-label="Toggle menu"
                onClick={() => setSbOpen(v => !v)}>
                <div className="ham-ic"><span/><span/><span/></div>
                <span className="t">Menu</span>
              </button>
            </div>
          </nav>

        </div>{/* /app-main */}
      </div>{/* /app */}

      {/* ── Notification drawer ────────────────────────────────────────────── */}
      <div className={`notif-back${notifOpen ? ' open' : ''}`} onClick={() => setNotifOpen(false)} />
      <aside className={`notif-drawer${notifOpen ? ' open' : ''}`} aria-label="Notifications">
        <div className="notif-h">
          <h3>Updates</h3>
          <button className="x" onClick={() => setNotifOpen(false)}>✕</button>
        </div>
        <div className="notif-list">
          <div className="notif-item unread">
            <div className="notif-ic ok">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                <path d="m9 12 2 2 4-4"/>
              </svg>
            </div>
            <div>
              <b>Welcome to Implant ID</b>
              <p>Your patient record is set up and your unique ID is ready.</p>
              <div className="t">Just now · Implant ID</div>
            </div>
          </div>
          <div className="notif-item unread">
            <div className="notif-ic">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
                <rect x="3" y="6" width="18" height="14" rx="2"/>
                <path d="M3 10h18M7 15h3"/>
              </svg>
            </div>
            <div>
              <b>Tip: share before appointments</b>
              <p>Sharing your Implant ID with a clinic before you arrive means they can prepare in advance.</p>
              <div className="t">Today · Implant ID</div>
            </div>
          </div>
        </div>
        <div className="notif-foot">
          <a href="#">Mark all as read</a>
          <a href="#">Settings</a>
        </div>
      </aside>

      {/* ── Logout modal ───────────────────────────────────────────────────── */}
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

      <style>{`
        /* Locked nav items */
        .sb-link--locked{opacity:.45;cursor:not-allowed;pointer-events:none;display:flex;align-items:center;gap:10px}
        .sb-lock{width:12px;height:12px;margin-left:auto;flex-shrink:0;opacity:.7}
        .mob-nav-tab--locked{opacity:.35;cursor:not-allowed;pointer-events:none}
        /* Strip default field margin from CustomSelect inside f-group */
        .f-group .field{margin:0}
      `}</style>
    </>
  )
}
