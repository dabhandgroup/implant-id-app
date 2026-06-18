'use client'
import { useState, useEffect, useRef } from 'react'
import { useUser, useClerk }          from '@clerk/nextjs'
import { useQuery, useMutation }      from 'convex/react'
import { api }                        from '../../../../convex/_generated/api'
import { useRouter }                  from 'next/navigation'
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const apiAny = api as any

type Notif = {
  _id: string
  title: string
  body: string
  type: string
  read: boolean
  createdAt: number
}

function notifIconClass(type: string) {
  if (type === 'record_viewed') return 'notif-item-icon--viewed'
  if (type === 'access_request') return 'notif-item-icon--share'
  if (type === 'device_recall') return 'notif-item-icon--alert'
  return 'notif-item-icon--default'
}

function NotifIcon({ type }: { type: string }) {
  if (type === 'record_viewed') {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
        <circle cx="12" cy="12" r="3"/>
      </svg>
    )
  }
  if (type === 'access_request') {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
        <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/>
        <path d="M16 6l-4-4-4 4M12 2v13"/>
      </svg>
    )
  }
  if (type === 'device_recall') {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
        <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
        <line x1="12" y1="9" x2="12" y2="13"/>
        <line x1="12" y1="17" x2="12.01" y2="17"/>
      </svg>
    )
  }
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
      <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
    </svg>
  )
}

function formatDate(ts: number) {
  const now  = Date.now()
  const diff = now - ts
  const day  = 1000 * 60 * 60 * 24
  if (diff < 1000 * 60 * 60) {
    const mins = Math.max(1, Math.floor(diff / (1000 * 60)))
    return `${mins} minute${mins === 1 ? '' : 's'} ago`
  }
  if (diff < day) {
    const hrs = Math.floor(diff / (1000 * 60 * 60))
    return `${hrs} hour${hrs === 1 ? '' : 's'} ago`
  }
  if (diff < day * 2) return 'Yesterday'
  return new Date(ts).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

export default function NotificationsClient() {
  const { user, isLoaded }  = useUser()
  const { signOut }         = useClerk()
  const router              = useRouter()

  // All hooks unconditionally at top
  const patient             = useQuery(api.patients.getMyPatient)
  const notifications       = useQuery(api.patients.getMyNotifications)
  const markAllRead         = useMutation(apiAny.patients.markAllNotificationsRead)
  const markOneRead         = useMutation(apiAny.patients.markNotificationRead)

  const [sbCollapsed,    setSbCollapsed]    = useState(false)
  const [sbOpen,         setSbOpen]         = useState(false)
  const [profileOpen,    setProfileOpen]    = useState(false)
  const [mobProfileOpen, setMobProfileOpen] = useState(false)
  const [logoutOpen,     setLogoutOpen]     = useState(false)
  const [markingAll,     setMarkingAll]     = useState(false)
  const [markingOne,     setMarkingOne]     = useState<string | null>(null)

  const sbBotRef      = useRef<HTMLDivElement>(null)
  const mobProfileRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handle(e: MouseEvent) {
      const t = e.target as HTMLElement
      if (sbBotRef.current      && !sbBotRef.current.contains(t))      setProfileOpen(false)
      if (mobProfileRef.current && !mobProfileRef.current.contains(t)) setMobProfileOpen(false)
    }
    document.addEventListener('mousedown', handle)
    return () => document.removeEventListener('mousedown', handle)
  }, [])

  useEffect(() => {
    function handle(e: KeyboardEvent) {
      if (e.key === 'Escape') setLogoutOpen(false)
    }
    document.addEventListener('keydown', handle)
    return () => document.removeEventListener('keydown', handle)
  }, [])

  useEffect(() => {
    if (patient === null) router.replace('/patients/register')
  }, [patient, router])

  // ── Guards ────────────────────────────────────────────────────────────────
  if (!isLoaded || patient === undefined) {
    return <div style={{ minHeight: '100vh', background: 'var(--bg)' }} />
  }
  if (patient === null) return null

  // ── Derived data ──────────────────────────────────────────────────────────
  const firstName  = patient.firstName
  const lastName   = patient.lastName
  const fullName   = `${firstName} ${lastName}`
  const initials   = `${firstName[0] ?? ''}${lastName[0] ?? ''}`.toUpperCase()
  const iidCode    = patient.implantIdCode
  const isPending  = !patient.verificationStatus || patient.verificationStatus === 'pending'

  const notifs      = (notifications ?? []) as Notif[]
  const unread      = notifs.filter(n => !n.read)
  const read        = notifs.filter(n => n.read)
  const unreadCount = unread.length

  async function doMarkAllRead() {
    setMarkingAll(true)
    try { await markAllRead() } finally { setMarkingAll(false) }
  }

  async function doMarkOneRead(id: string) {
    setMarkingOne(id)
    try { await markOneRead({ notificationId: id as any }) } finally { setMarkingOne(null) }
  }

  function doSignOut() {
    signOut({ redirectUrl: '/' })
  }

  return (
    <>
      <div className={`sb-back${sbOpen ? ' open' : ''}`} onClick={() => setSbOpen(false)} />

      <div className={`app${sbCollapsed ? ' collapsed' : ''}`}>

        {/* ── Sidebar ──────────────────────────────────────────────────── */}
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
              <span>Documents</span>
              <svg className="sb-lock" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                <rect x="3" y="11" width="18" height="11" rx="2"/>
                <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
              </svg>
            </span>
          ) : (
            <button type="button" className="sb-link" onClick={() => router.push('/patients/dashboard?section=documents')} title="Documents" style={{ background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'none' }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
                <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20M4 19.5A2.5 2.5 0 0 0 6.5 22H20V2H6.5A2.5 2.5 0 0 0 4 4.5v15z"/>
              </svg>
              <span>Documents</span>
            </button>
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
          <a className="sb-link" href="/patients/account" title="Account settings">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
              <circle cx="12" cy="12" r="3"/>
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33h0a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51h0a1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82v0a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
            </svg>
            <span>Account settings</span>
          </a>
          <a className="sb-link" href="/patients/emergency" title="Emergency info">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
              <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.8 19.8 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.8 19.8 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.91.34 1.85.57 2.81.7A2 2 0 0 1 22 16.92z"/>
            </svg>
            <span>Emergency info</span>
          </a>

          {/* Notifications — active on this page */}
          <a className="sb-link active" href="/patients/notifications" aria-label="Notifications" title="Notifications">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
              <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
            </svg>
            <span>Notifications</span>
            {unreadCount > 0 && (
              <span className="pill">{unreadCount}</span>
            )}
          </a>

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
            <div className="pm-user">
              <div style={{ width:34,height:34,borderRadius:'50%',background:'var(--accent)',color:'#fff',display:'grid',placeItems:'center',fontFamily:'var(--ff)',fontWeight:600,fontSize:13,flexShrink:0 }}>
                {initials}
              </div>
              <div>
                <div style={{ fontFamily:'var(--ff)',fontSize:13,fontWeight:600,color:'var(--text)',lineHeight:1.2 }}>{fullName}</div>
                <div style={{ fontSize:11,color:'var(--muted2)',lineHeight:1.2,marginTop:2 }}>Patient</div>
              </div>
            </div>
            <hr />
            <a href="/patients/account">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"><circle cx="12" cy="7" r="4"/><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/></svg>
              My account
            </a>
            <a href="/patients/notifications">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
              Notifications
            </a>
            <a href="mailto:hello@implantid.io">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"><circle cx="12" cy="12" r="9"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3M12 17h.01"/></svg>
              Help &amp; docs
            </a>
            <div className="pm-label">Legal</div>
            <a href="https://implantid.io/legal/privacy" target="_blank" rel="noopener noreferrer">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
              Privacy Policy
            </a>
            <a href="https://implantid.io/legal/terms" target="_blank" rel="noopener noreferrer">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>
              Terms of Service
            </a>
            <hr />
            <button className="danger" onClick={() => { setProfileOpen(false); setLogoutOpen(true) }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
              Sign out
            </button>
          </div>

        </aside>

        {/* ── App main ─────────────────────────────────────────────────── */}
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
                <a href="/patients/notifications">Notifications</a>
                <a href="mailto:hello@implantid.io">Help &amp; docs</a>
                <hr />
                <a href="https://implantid.io/legal/privacy" target="_blank" rel="noopener noreferrer">Privacy Policy</a>
                <a href="https://implantid.io/legal/terms" target="_blank" rel="noopener noreferrer">Terms of Service</a>
                <hr />
                <button className="danger" onClick={() => { setMobProfileOpen(false); setLogoutOpen(true) }}>
                  Sign out
                </button>
              </div>
            </div>
          </div>

          {/* ── Page content ─────────────────────────────────────────── */}
          <div className="notifs-wrap">
            <div className="notifs-hd">
              <div>
                <h1>Notifications</h1>
                <p>Updates about your implant record and account activity.</p>
              </div>
              <div className="notifs-hd-actions">
                {unreadCount > 0 && (
                  <button
                    className="btn btn-s"
                    onClick={doMarkAllRead}
                    disabled={markingAll}
                    style={{ fontSize: 13, padding: '9px 18px' }}
                  >
                    {markingAll ? 'Marking…' : 'Mark all as read'}
                  </button>
                )}
              </div>
            </div>

            {notifications === undefined ? (
              // Loading skeleton
              <div className="notif-page-list">
                {[...Array(4)].map((_, i) => (
                  <div key={i} style={{ padding: '16px 20px', borderBottom: i < 3 ? '1px solid var(--border)' : undefined, display: 'flex', gap: 14, alignItems: 'flex-start' }}>
                    <div style={{ width: 36, height: 36, borderRadius: 10, background: 'var(--border)', flexShrink: 0 }} />
                    <div style={{ flex: 1 }}>
                      <div style={{ height: 14, width: '45%', borderRadius: 6, background: 'var(--border)', marginBottom: 8 }} />
                      <div style={{ height: 12, width: '75%', borderRadius: 6, background: 'var(--border)' }} />
                    </div>
                  </div>
                ))}
              </div>
            ) : notifs.length === 0 ? (
              <div className="notifs-empty">
                <div className="notifs-empty-ic">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
                    <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
                    <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
                  </svg>
                </div>
                <h3>You&apos;re all caught up</h3>
                <p>Notifications will appear here when there&apos;s activity on your implant record.</p>
              </div>
            ) : (
              <div className="notif-page-list">
                {unread.length > 0 && (
                  <>
                    <div className="notif-section-label">Unread · {unread.length}</div>
                    {unread.map(n => (
                      <div key={n._id} className="notif-item notif-item--unread">
                        <div className={`notif-item-icon ${notifIconClass(n.type)}`}>
                          <NotifIcon type={n.type} />
                        </div>
                        <div className="notif-item-body">
                          <div className="notif-item-top">
                            <span className="notif-item-title">{n.title}</span>
                            <span className="notif-new-badge">New</span>
                          </div>
                          <div className="notif-item-body-text">{n.body}</div>
                          <div className="notif-item-time">{formatDate(n.createdAt)}</div>
                        </div>
                        <div className="notif-item-actions">
                          <button
                            className="notif-mark-read"
                            onClick={() => doMarkOneRead(n._id)}
                            disabled={markingOne === n._id}
                            aria-label={`Mark "${n.title}" as read`}
                          >
                            {markingOne === n._id ? '…' : 'Mark read'}
                          </button>
                        </div>
                      </div>
                    ))}
                  </>
                )}

                {read.length > 0 && (
                  <>
                    {unread.length > 0 && (
                      <div className="notif-section-label" style={{ borderTop: '1px solid var(--border)' }}>
                        Earlier
                      </div>
                    )}
                    {read.map(n => (
                      <div key={n._id} className="notif-item notif-item--read">
                        <div className={`notif-item-icon ${notifIconClass(n.type)}`} style={{ opacity: 0.6 }}>
                          <NotifIcon type={n.type} />
                        </div>
                        <div className="notif-item-body">
                          <div className="notif-item-top">
                            <span className="notif-item-title">{n.title}</span>
                          </div>
                          <div className="notif-item-body-text">{n.body}</div>
                          <div className="notif-item-time">{formatDate(n.createdAt)}</div>
                        </div>
                      </div>
                    ))}
                  </>
                )}
              </div>
            )}

            <div style={{ marginTop: 20, fontSize: 12.5, color: 'var(--muted2)', textAlign: 'center' }}>
              Showing up to 20 most recent notifications. Manage notification preferences in{' '}
              <a href="/patients/account" style={{ color: 'var(--accent)' }}>Account settings</a>.
            </div>
          </div>

          {/* Mobile bottom nav */}
          <nav className="mob-nav">
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
              <a href="/patients/account" className="mob-nav-tab" aria-label="Account">
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

      {/* ── Logout modal ─────────────────────────────────────────────────── */}
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
            <p>You&apos;ll need to sign back in to access your implant record and wallet pass. Your data stays safe either way.</p>
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
