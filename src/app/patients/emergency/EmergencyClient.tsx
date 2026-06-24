'use client'

import { useState, useEffect, useRef }   from 'react'
import { useQuery, useMutation }   from 'convex/react'
import { useUser, useClerk } from '@clerk/nextjs'
import { useRouter }  from 'next/navigation'
import { api }        from '../../../../convex/_generated/api'
import QRCode         from 'qrcode'

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']

const MRI_COLOUR: Record<string, string> = {
  safe:        '#166534',
  conditional: '#b45309',
  unsafe:      '#991b1b',
  unknown:     '#64748b',
}
const MRI_BG: Record<string, string> = {
  safe:        'linear-gradient(135deg,#14532d,#15803d)',
  conditional: 'linear-gradient(135deg,#78350f,#d97706)',
  unsafe:      'linear-gradient(135deg,#7f1d1d,#dc2626)',
  unknown:     'linear-gradient(135deg,#1e293b,#334155)',
}
const MRI_LABEL: Record<string, string> = {
  safe:        'MR Safe',
  conditional: 'MR Conditional',
  unsafe:      'MR Unsafe — Do Not Scan',
  unknown:     'MRI Status Unknown',
}
const MRI_NOTE: Record<string, string> = {
  safe:        'This patient may enter the MRI environment. Device is safe under all standard MRI conditions.',
  conditional: 'Specific conditions apply before scanning. Review device parameters with the radiographer before proceeding.',
  unsafe:      'Do NOT allow this patient into the MRI environment. Risk of serious injury or death.',
  unknown:     'MRI safety status has not been verified. Do not scan until confirmed.',
}

export default function EmergencyClient() {
  const { user }         = useUser()
  const { signOut }      = useClerk()
  const router           = useRouter()
  const patient          = useQuery(api.patients.getMyPatient)
  const implantSafety    = useQuery(api.patients.getMyImplantSafety)
  const notifications    = useQuery(api.patients.getMyNotifications)
  const markRead         = useMutation(api.patients.markAllNotificationsRead)
  const linkedDevices    = useQuery((api as any).patients.getMyLinkedDevices)
  const visibleNotes     = useQuery((api as any).clinicalNotes.getMyVisibleClinicalNotes)

  const [sbCollapsed,  setSbCollapsed]  = useState(false)
  const [logoutOpen,   setLogoutOpen]   = useState(false)
  const [profileOpen,  setProfileOpen]  = useState(false)
  const [notifOpen,    setNotifOpen]    = useState(false)
  const [linkCopied,   setLinkCopied]   = useState(false)
  const [qrDataUrl,    setQrDataUrl]    = useState('')

  const sbBotRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!profileOpen) return
    function onOutside(e: MouseEvent) {
      if (sbBotRef.current && !sbBotRef.current.contains(e.target as Node)) setProfileOpen(false)
    }
    document.addEventListener('mousedown', onOutside)
    return () => document.removeEventListener('mousedown', onOutside)
  }, [profileOpen])

  useEffect(() => {
    if (!patient?.implantIdCode) return
    QRCode.toDataURL(
      `https://portal.implantid.io/scan/${patient.implantIdCode}`,
      { width: 200, margin: 1, color: { dark: '#0e2a33', light: '#ffffff' } }
    ).then(setQrDataUrl).catch(() => {})
  }, [patient?.implantIdCode])

  const initials = user
    ? `${user.firstName?.[0] ?? ''}${user.lastName?.[0] ?? ''}`.toUpperCase() || 'P'
    : 'P'
  const fullNameUser = user?.fullName ?? 'Patient'

  if (patient === undefined) {
    return <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', background: 'var(--bg)', fontFamily: 'var(--ff)', color: 'var(--muted)', fontSize: 14 }}>Loading…</div>
  }
  if (patient === null) { router.replace('/patients/register'); return null }

  const status     = implantSafety ?? 'unknown'
  const isPending  = patient.verificationStatus !== 'active'
  const fullName   = `${patient.firstName} ${patient.lastName}`
  const hasAllergy = !!patient.contrastAllergy
  const scanUrl    = `https://portal.implantid.io/scan/${patient.implantIdCode}`

  function copyLink() {
    navigator.clipboard?.writeText(scanUrl)
    setLinkCopied(true)
    setTimeout(() => setLinkCopied(false), 2000)
  }

  return (
    <>
      <div className="sb-back" id="sb-back" />
      <div className={`app${sbCollapsed ? ' collapsed' : ''}`}>

        {/* ── Sidebar ── */}
        <aside className="sidebar">
          <div className="sb-logo">
            <a href="/" className="logo">
              <img src="/icon.svg" alt="" />
              <span className="logo-text"><b>Implant</b><span>ID</span></span>
            </a>
            <button className="sb-toggle" onClick={() => setSbCollapsed(c => !c)} aria-label="Collapse sidebar">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15 18 9 12 15 6"/></svg>
            </button>
          </div>

          <div className="sb-scroll">
          <span className="sb-section">My record</span>
          <a className="sb-link" href="/patients/dashboard" title="My record">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"><rect x="3" y="3" width="7" height="9" rx="1.5"/><rect x="14" y="3" width="7" height="5" rx="1.5"/><rect x="14" y="12" width="7" height="9" rx="1.5"/><rect x="3" y="16" width="7" height="5" rx="1.5"/></svg>
            <span>My record</span>
          </a>
          <a className="sb-link" href="/patients/share" title="Share with clinic">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><path d="M16 6l-4-4-4 4M12 2v13"/></svg>
            <span>Share with clinic</span>
          </a>
          <button type="button" className="sb-link" onClick={() => router.push('/patients/dashboard?section=documents')} title="Documents" style={{ background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'none' }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20M4 19.5A2.5 2.5 0 0 0 6.5 22H20V2H6.5A2.5 2.5 0 0 0 4 4.5v15z"/></svg>
            <span>Documents</span>
          </button>

          <span className="sb-section">Find care</span>
          <a className="sb-link" href="/patients/find-care" title="Find a clinic">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
            <span>Find a clinic</span>
          </a>

          <span className="sb-section">Account</span>
          <a className="sb-link" href="/patients/account" title="Account settings">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33h0a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51h0a1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82v0a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
            <span>Account settings</span>
          </a>
          <a className="sb-link active" href="/patients/emergency" title="Emergency info">
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

          </div>{/* /sb-scroll */}

          <div className="sb-profile-wrap">
            <div className="sb-bot" ref={sbBotRef}>
              <div className={`sb-profile-popup${profileOpen ? ' open' : ''}`} role="menu" aria-hidden={!profileOpen}>
                <div className="sb-pp-head">
                  <div className="sb-pp-name">{fullNameUser}</div>
                  <div className="sb-pp-sub">Patient</div>
                </div>
                <a href="/patients/account" className="sb-pp-item" tabIndex={profileOpen ? 0 : -1}>My account</a>
                <a href="/patients/notifications" className="sb-pp-item" tabIndex={profileOpen ? 0 : -1}>Notifications</a>
                <a href="mailto:hello@implantid.io" className="sb-pp-item" tabIndex={profileOpen ? 0 : -1}>Help &amp; docs</a>
                <div className="sb-pp-divider" />
                <a href="https://implantid.io/legal/privacy" target="_blank" rel="noopener noreferrer" className="sb-pp-item" tabIndex={profileOpen ? 0 : -1}>Privacy Policy</a>
                <a href="https://implantid.io/legal/terms" target="_blank" rel="noopener noreferrer" className="sb-pp-item" tabIndex={profileOpen ? 0 : -1}>Terms of Service</a>
                <a href="https://implantid.io/legal/gdpr" target="_blank" rel="noopener noreferrer" className="sb-pp-item" tabIndex={profileOpen ? 0 : -1}>GDPR</a>
                <div className="sb-pp-divider" />
                <button className="sb-pp-item sb-pp-signout" onClick={() => { setProfileOpen(false); setLogoutOpen(true) }} tabIndex={profileOpen ? 0 : -1}>Sign out</button>
              </div>
              <div className={`sb-identity${profileOpen ? ' open' : ''}`} onClick={() => setProfileOpen(v => !v)} role="button" tabIndex={0} aria-expanded={profileOpen}>
                <div className="av">{initials}</div>
                <div>
                  <div className="name">{fullNameUser}</div>
                  <div className="role">Patient</div>
                </div>
                <svg className="chev" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14"><polyline points="6 9 12 15 18 9"/></svg>
              </div>
            </div>
          </div>
        </aside>

        {/* ── Main content ── */}
        <div className="app-main">
          <div style={{ maxWidth: 640, margin: '0 auto', padding: '28px 20px 60px' }}>

            {/* Print-only header — hidden on screen */}
            <div className="em-print-header" style={{ display: 'none' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <img src="/icon.svg" alt="Implant ID" style={{ width: 28, height: 28 }} />
                <div>
                  <div style={{ fontWeight: 700, fontSize: 14, color: '#0e2a33' }}>Implant ID — Emergency Medical Record</div>
                  <div style={{ fontSize: 11, color: '#64748b' }}>portal.implantid.io · {new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}</div>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                {/* QR code for instant clinic scan — print-only */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=120x120&margin=4&data=${encodeURIComponent(scanUrl)}`}
                  alt="Scan to view full record"
                  style={{ width: 56, height: 56, border: '1px solid #e2e8f0', borderRadius: 4 }}
                />
                <div style={{ fontFamily: 'SF Mono,Monaco,monospace', fontSize: 11, fontWeight: 700, color: '#0e2a33', letterSpacing: '.05em', textAlign: 'center' }}>
                  {patient.implantIdCode}
                  <div style={{ fontFamily: 'sans-serif', fontSize: 9, fontWeight: 400, color: '#64748b', letterSpacing: 0, marginTop: 2 }}>Scan for full record</div>
                </div>
              </div>
            </div>

            {/* Page header — screen only */}
            <div className="em-print-hide" style={{ marginBottom: 24 }}>
              <div style={{ fontFamily: 'var(--ff)', fontSize: 11, fontWeight: 700, letterSpacing: '1.5px', textTransform: 'uppercase', color: 'var(--accent)', marginBottom: 6 }}>Emergency info</div>
              <h1 style={{ fontFamily: 'var(--ff)', fontSize: 26, fontWeight: 700, color: 'var(--text)', margin: '0 0 6px', letterSpacing: '-.02em' }}>{fullName}</h1>
              <p style={{ fontFamily: 'var(--fb)', fontSize: 14, color: 'var(--muted)', margin: 0 }}>
                Share this page with first responders or clinical staff in an emergency.
              </p>
            </div>

            {/* Action buttons — hidden on print */}
            <div className="em-actions" style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 24 }}>
              <button
                className="btn btn-s"
                onClick={copyLink}
                style={{ display: 'inline-flex', alignItems: 'center', gap: 7 }}
              >
                {linkCopied ? (
                  <><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14"><polyline points="20 6 9 17 4 12"/></svg>Copied!</>
                ) : (
                  <><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" width="14" height="14"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>Copy shareable link</>
                )}
              </button>
              <button
                className="btn"
                onClick={() => window.print()}
                style={{ display: 'inline-flex', alignItems: 'center', gap: 7 }}
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" width="14" height="14"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>
                Print / Save as PDF
              </button>
            </div>

            {/* Pass card — full orange dashboard card (screen only) */}
            <div
              className="pass-big em-print-hide"
              style={
                isPending ? {
                  background: 'linear-gradient(155deg,#e8edf2 0%,#d4dce6 55%,#eef1f5 100%)',
                  color: '#1e293b',
                  boxShadow: '0 20px 50px -20px rgba(0,0,0,.10)',
                }
                : status === 'unsafe' ? { background: 'linear-gradient(155deg,#991b1b 0%,#b91c1c 55%,#dc2626 100%)' }
                : status === 'conditional' ? { background: 'linear-gradient(155deg,#c2410c 0%,#ea580c 55%,#f97316 100%)' }
                : status === 'safe' ? { background: 'linear-gradient(155deg,#166534 0%,#15803d 55%,#16a34a 100%)' }
                : undefined
              }
            >
              {/* Brand top-left / MRI status top-right */}
              <div className="pb-top">
                <div className="pb-brand">
                  <img src="/icon.svg" alt="" style={isPending ? { filter: 'brightness(0) opacity(0.4)' } : undefined} />
                  <span style={isPending ? { color: '#475569' } : undefined}>Implant ID</span>
                </div>
                {!isPending && implantSafety ? (
                  <div className="pb-mri">
                    <span style={{ fontFamily: 'var(--ff)', fontSize: 12, fontWeight: 700, color: 'rgba(255,255,255,0.92)', letterSpacing: '.3px', whiteSpace: 'nowrap' }}>
                      {MRI_LABEL[status]}
                    </span>
                    <img
                      src={status === 'safe' ? '/mr-safe.svg' : status === 'conditional' ? '/mr-conditional.svg' : '/mr-unsafe.svg'}
                      alt={MRI_LABEL[status]}
                      style={{ width: 42, height: 42, display: 'block', flexShrink: 0 }}
                    />
                  </div>
                ) : null}
              </div>

              {/* Device type */}
              <div className="pb-status" style={{ color: isPending ? '#64748b' : undefined }}>
                {(linkedDevices as any[])?.length > 1
                  ? 'Multiple implants'
                  : (linkedDevices as any[])?.length === 1
                    ? (linkedDevices as any[])[0].deviceType
                    : (patient as any).selfReportedDeviceType ?? 'Implanted Device'}
              </div>

              {/* Device name */}
              <div className="pb-name" style={{ color: isPending ? '#334155' : undefined }}>
                {(linkedDevices as any[])?.length > 0
                  ? (linkedDevices as any[]).length === 1
                    ? `${(linkedDevices as any[])[0].manufacturer} ${(linkedDevices as any[])[0].name}`
                    : 'Multiple implants'
                  : (patient as any).selfReportedDevice ?? 'Awaiting verification'}
              </div>

              {/* Data grid — clinical detail for first responders */}
              <div className="pb-grid" style={{ display: 'grid', gridTemplateColumns: 'auto auto', gap: '8px 28px', width: 'fit-content', marginBottom: 16, position: 'relative', zIndex: 2 }}>
                <div>
                  <div className="k" style={{ color: isPending ? '#94a3b8' : undefined }}>Name</div>
                  <div className="v" style={{ color: isPending ? '#334155' : undefined }}>{fullName}</div>
                </div>
                {(patient as any).dob && (
                  <div>
                    <div className="k" style={{ color: isPending ? '#94a3b8' : undefined }}>Date of birth</div>
                    <div className="v" style={{ color: isPending ? '#334155' : undefined }}>{(patient as any).dob}</div>
                  </div>
                )}
                {(patient as any).heightCm && (
                  <div>
                    <div className="k" style={{ color: isPending ? '#94a3b8' : undefined }}>Height</div>
                    <div className="v" style={{ color: isPending ? '#334155' : undefined }}>{(patient as any).heightCm} cm</div>
                  </div>
                )}
                {(patient as any).weightKg && (
                  <div>
                    <div className="k" style={{ color: isPending ? '#94a3b8' : undefined }}>Weight</div>
                    <div className="v" style={{ color: isPending ? '#334155' : undefined }}>{(patient as any).weightKg} kg</div>
                  </div>
                )}
                {(patient as any).selfReportedImplantYear && (
                  <div>
                    <div className="k" style={{ color: isPending ? '#94a3b8' : undefined }}>Implanted</div>
                    <div className="v" style={{ color: isPending ? '#334155' : undefined }}>
                      {(patient as any).selfReportedImplantMonth
                        ? `${MONTHS[parseInt((patient as any).selfReportedImplantMonth) - 1]} ${(patient as any).selfReportedImplantYear}`
                        : (patient as any).selfReportedImplantYear}
                    </div>
                  </div>
                )}
                {(patient as any).selfReportedHospital && (
                  <div>
                    <div className="k" style={{ color: isPending ? '#94a3b8' : undefined }}>Clinic</div>
                    <div className="v" style={{ color: isPending ? '#334155' : undefined }}>{(patient as any).selfReportedHospital}</div>
                  </div>
                )}
                {(patient as any).selfReportedSurgeon && (
                  <div>
                    <div className="k" style={{ color: isPending ? '#94a3b8' : undefined }}>Surgeon</div>
                    <div className="v" style={{ color: isPending ? '#334155' : undefined }}>{(patient as any).selfReportedSurgeon}</div>
                  </div>
                )}
              </div>

              {/* MRI clinical guidance note */}
              {!isPending && (
                <div style={{ background: 'rgba(0,0,0,0.25)', borderRadius: 10, padding: '11px 14px', fontFamily: 'var(--fb)', fontSize: 13.5, color: 'rgba(255,255,255,0.9)', lineHeight: 1.55, marginBottom: 16, position: 'relative', zIndex: 2 }}>
                  {MRI_NOTE[status]}
                </div>
              )}

              {/* Bottom: implant code + QR */}
              <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', position: 'relative', zIndex: 2 }}>
                <div style={{ fontFamily: 'SF Mono,Monaco,monospace', fontSize: 13, fontWeight: 600, letterSpacing: '.05em', opacity: isPending ? 0.45 : 0.85 }}>
                  {patient.implantIdCode}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5 }}>
                  <span style={{ fontFamily: 'var(--ff)', fontSize: 9, letterSpacing: '.8px', textTransform: 'uppercase', color: isPending ? 'rgba(30,41,59,0.5)' : 'rgba(255,255,255,.72)', fontWeight: 600 }}>
                    Scan at clinic
                  </span>
                  {qrDataUrl ? (
                    <img src={qrDataUrl} alt="Scan to view full patient record" style={{ width: 90, height: 90, borderRadius: 8, background: 'rgba(255,255,255,.92)', padding: 4, display: 'block' }} />
                  ) : (
                    <div style={{ width: 90, height: 90, borderRadius: 8, background: isPending ? 'rgba(30,41,59,.08)' : 'rgba(255,255,255,.12)', display: 'grid', placeItems: 'center' }}>
                      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={isPending ? 'rgba(30,41,59,0.3)' : 'rgba(255,255,255,0.4)'} strokeWidth="1.4" aria-hidden="true">
                        <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/>
                        <rect x="3" y="14" width="7" height="7"/><path d="M14 14h2v2h-2zM18 14h2v2h-2zM14 18h2v2h-2z"/>
                      </svg>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* MRI status hero — print-only; shown in place of pass card when printing */}
            <div className="em-mri-hero em-print-only" style={{ background: MRI_BG[status], borderRadius: 16, padding: '22px 22px', marginBottom: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 14 }}>
                <img
                  src={status === 'safe' ? '/mr-safe.svg' : status === 'conditional' ? '/mr-conditional.svg' : '/mr-unsafe.svg'}
                  alt={MRI_LABEL[status]}
                  style={{ width: 52, height: 52, flexShrink: 0 }}
                />
                <div>
                  <div style={{ fontFamily: 'var(--ff)', fontSize: 11, fontWeight: 700, letterSpacing: '1.5px', textTransform: 'uppercase', color: 'rgba(255,255,255,0.7)', marginBottom: 4 }}>MRI Safety Status</div>
                  <div style={{ fontFamily: 'var(--ff)', fontSize: 20, fontWeight: 700, color: '#fff' }}>{MRI_LABEL[status]}</div>
                </div>
              </div>
              <div style={{ background: 'rgba(0,0,0,0.25)', borderRadius: 10, padding: '11px 14px', fontFamily: 'var(--fb)', fontSize: 13.5, color: 'rgba(255,255,255,0.9)', lineHeight: 1.55 }}>
                {MRI_NOTE[status]}
              </div>
            </div>

            {/* Contrast allergy */}
            {hasAllergy && (
              <div className="em-allergy" style={{ background: 'rgba(var(--err-rgb),0.08)', border: '2px solid rgba(var(--err-rgb),0.30)', borderRadius: 14, padding: '16px 18px', marginBottom: 16, display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--err)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginTop: 1 }}><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
                <div>
                  <div style={{ fontFamily: 'var(--ff)', fontSize: 12, fontWeight: 700, letterSpacing: '1.2px', textTransform: 'uppercase', color: 'var(--err)', marginBottom: 4 }}>Contrast Allergy</div>
                  <div style={{ fontFamily: 'var(--fb)', fontSize: 15, color: 'var(--err)', fontWeight: 600 }}>
                    {patient.contrastAllergyNote ?? 'Documented contrast allergy — do not administer contrast without specialist review.'}
                  </div>
                </div>
              </div>
            )}

            {/* Patient identity — print-only plain version */}
            <div className="em-card em-print-show" style={{ display: 'none', background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 14, padding: '18px 20px', marginBottom: 14 }}>
              <div style={{ fontFamily: 'var(--ff)', fontSize: 11, fontWeight: 700, letterSpacing: '1.1px', textTransform: 'uppercase', color: 'var(--muted2)', marginBottom: 10 }}>Patient</div>
              <div style={{ fontFamily: 'var(--ff)', fontSize: 22, fontWeight: 700, color: 'var(--text)', marginBottom: 4 }}>{fullName}</div>
              <div style={{ fontFamily: 'SF Mono,Monaco,monospace', fontSize: 14, color: 'var(--accent-deep)', letterSpacing: '.04em', marginBottom: patient.dob ? 10 : 0 }}>{patient.implantIdCode}</div>
              {patient.dob && (
                <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap' }}>
                  <span style={{ fontFamily: 'var(--fb)', fontSize: 13.5, color: 'var(--muted)' }}>Date of birth: <strong style={{ color: 'var(--text)' }}>{patient.dob}</strong></span>
                  {patient.heightCm && <span style={{ fontFamily: 'var(--fb)', fontSize: 13.5, color: 'var(--muted)' }}>Height: <strong style={{ color: 'var(--text)' }}>{patient.heightCm} cm</strong></span>}
                  {patient.weightKg && <span style={{ fontFamily: 'var(--fb)', fontSize: 13.5, color: 'var(--muted)' }}>Weight: <strong style={{ color: 'var(--text)' }}>{patient.weightKg} kg</strong></span>}
                </div>
              )}
            </div>

            {/* Implanted device */}
            {(patient.selfReportedDevice || patient.selfReportedDeviceType) && (
              <div className="em-card" style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 14, padding: '18px 20px', marginBottom: 14 }}>
                <div style={{ fontFamily: 'var(--ff)', fontSize: 11, fontWeight: 700, letterSpacing: '1.1px', textTransform: 'uppercase', color: 'var(--muted2)', marginBottom: 10 }}>Implanted Device</div>
                {patient.selfReportedDeviceType && <div style={{ fontFamily: 'var(--ff)', fontSize: 12.5, color: 'var(--muted)', marginBottom: 4 }}>{patient.selfReportedDeviceType}</div>}
                {patient.selfReportedDevice && <div style={{ fontFamily: 'var(--ff)', fontSize: 18, fontWeight: 700, color: 'var(--text)', marginBottom: 4 }}>{patient.selfReportedDevice}</div>}
                {patient.selfReportedManufacturer && <div style={{ fontFamily: 'var(--fb)', fontSize: 13.5, color: 'var(--muted)' }}>{patient.selfReportedManufacturer}</div>}
                {patient.selfReportedImplantYear && (
                  <div style={{ fontFamily: 'var(--fb)', fontSize: 13, color: 'var(--muted)', marginTop: 4 }}>
                    Implanted: {patient.selfReportedImplantMonth ? `${patient.selfReportedImplantMonth}/${patient.selfReportedImplantYear}` : patient.selfReportedImplantYear}
                    {patient.selfReportedHospital && ` · ${patient.selfReportedHospital}`}
                  </div>
                )}
              </div>
            )}

            {/* Self-reported notes */}
            {patient.additionalNotes && (
              <div className="em-card" style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 14, padding: '18px 20px', marginBottom: 14 }}>
                <div style={{ fontFamily: 'var(--ff)', fontSize: 11, fontWeight: 700, letterSpacing: '1.1px', textTransform: 'uppercase', color: 'var(--muted2)', marginBottom: 8 }}>Patient notes</div>
                <div style={{ fontFamily: 'var(--fb)', fontSize: 14, color: 'var(--text)', lineHeight: 1.6 }}>{patient.additionalNotes}</div>
              </div>
            )}

            {/* Clinical notes from care team — only notes shared with the patient */}
            {visibleNotes && visibleNotes.length > 0 && (
              <div className="em-card" style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 14, padding: '18px 20px', marginBottom: 14 }}>
                <div style={{ fontFamily: 'var(--ff)', fontSize: 11, fontWeight: 700, letterSpacing: '1.1px', textTransform: 'uppercase', color: 'var(--muted2)', marginBottom: 14 }}>Clinical notes</div>
                <div className="em-notes">
                  {(visibleNotes as any[]).map((note: any) => {
                    const initNote = `${note.authorName?.split(' ')[0]?.[0] ?? ''}${note.authorName?.split(' ')[1]?.[0] ?? ''}`.toUpperCase()
                    const roleLabel = note.authorRole === 'radiographer' ? 'Radiographer'
                      : note.authorRole === 'surgeon' ? 'Surgeon'
                      : note.authorRole === 'admin' ? 'Clinical admin'
                      : 'Clinic staff'
                    return (
                      <div key={note._id} className="em-note">
                        <div className="em-note-hd">
                          <div className="em-note-av">{initNote}</div>
                          <div className="em-note-info">
                            <div className="nm">{note.authorName}</div>
                            <div className="org">{roleLabel}{note.clinicName ? ` · ${note.clinicName}` : ''}</div>
                          </div>
                          <div className="em-note-date">
                            {new Date(note.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                          </div>
                        </div>
                        <div className="em-note-body">{note.content}</div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Emergency contact */}
            {patient.emergencyContactName && (
              <div className="em-card" style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 14, padding: '18px 20px', marginBottom: 14 }}>
                <div style={{ fontFamily: 'var(--ff)', fontSize: 11, fontWeight: 700, letterSpacing: '1.1px', textTransform: 'uppercase', color: 'var(--muted2)', marginBottom: 10 }}>Emergency Contact</div>
                <div style={{ fontFamily: 'var(--ff)', fontSize: 16, fontWeight: 600, color: 'var(--text)', marginBottom: 4 }}>{patient.emergencyContactName}</div>
                {patient.emergencyContactRelation && <div style={{ fontFamily: 'var(--fb)', fontSize: 13, color: 'var(--muted)', marginBottom: 6 }}>{patient.emergencyContactRelation}</div>}
                {patient.emergencyContactPhone && (
                  <a href={`tel:${patient.emergencyContactPhone}`} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontFamily: 'var(--ff)', fontSize: 16, fontWeight: 700, color: 'var(--accent)', textDecoration: 'none' }}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.8 19.8 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.8 19.8 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.91.34 1.85.57 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
                    {patient.emergencyContactPhone}
                  </a>
                )}
              </div>
            )}

            {/* Verification disclaimer */}
            <div style={{ background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.20)', borderRadius: 10, padding: '12px 16px', display: 'flex', alignItems: 'flex-start', gap: 8 }}>
              {patient.verificationStatus === 'active' ? (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#92400e" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginTop: 1 }}><polyline points="20 6 9 17 4 12"/></svg>
              ) : (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#92400e" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginTop: 1 }}><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
              )}
              <div style={{ fontFamily: 'var(--fb)', fontSize: 12.5, color: '#92400e', lineHeight: 1.6 }}>
                {patient.verificationStatus === 'active'
                  ? 'This record has been verified by the patient\'s clinical team on Implant ID.'
                  : 'This record has not yet been verified by a clinical team. Information is self-reported by the patient. Treat with caution.'}
              </div>
            </div>

          </div>
        </div>
      </div>

      {/* Notification drawer */}
      <div className={`notif-back${notifOpen ? ' open' : ''}`} onClick={() => setNotifOpen(false)} />
      <aside className={`notif-drawer${notifOpen ? ' open' : ''}`} aria-label="Notifications">
        <div className="notif-h">
          <h3>Updates</h3>
          <button className="x" onClick={() => setNotifOpen(false)}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>
        <div className="notif-list">
          {!notifications || notifications.length === 0 ? (
            <div style={{ padding: '20px 16px', textAlign: 'center', color: 'var(--muted)', fontSize: 13 }}>No notifications</div>
          ) : (notifications as {_id: string, title: string, body: string, read: boolean, createdAt: number}[]).map(n => (
            <div key={n._id} style={{ padding: '14px 16px', borderBottom: '1px solid var(--border)', borderLeft: n.read ? '3px solid transparent' : '3px solid var(--accent)', background: n.read ? 'transparent' : 'rgba(var(--accent-rgb),0.05)', display: 'flex', alignItems: 'flex-start', gap: 10 }}>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
                  <span style={{ fontFamily: 'var(--ff)', fontSize: 13.5, fontWeight: n.read ? 400 : 600, color: 'var(--text)' }}>{n.title}</span>
                  {!n.read && <span style={{ fontFamily: 'var(--ff)', fontSize: 10, fontWeight: 700, letterSpacing: '.4px', textTransform: 'uppercase', color: 'var(--accent)', background: 'rgba(var(--accent-rgb),0.12)', borderRadius: 4, padding: '2px 6px' }}>New</span>}
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
      {logoutOpen && (
        <div className="logout-back open" onClick={() => setLogoutOpen(false)}>
          <div className="logout-modal" onClick={e => e.stopPropagation()}>
            <div className="logout-body">
              <h3>Log out of Implant ID?</h3>
              <p>You&apos;ll need to sign back in to access your implant record.</p>
            </div>
            <div className="logout-actions">
              <button className="btn" onClick={() => setLogoutOpen(false)}>← Back</button>
              <button className="btn btn-danger" onClick={() => signOut({ redirectUrl: '/login' })}>Yes, log out</button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
