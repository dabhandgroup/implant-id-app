'use client'
/**
 * ClinicNotificationsOverlay
 *
 * Mounts alongside static clinic HTML pages to wire the notification
 * count badge and drawer contents to real Convex data. It patches the
 * DOM count element and, when the drawer opens, replaces the static list
 * with live notifications from the database.
 */
import { useEffect, useState } from 'react'
import { useQuery, useMutation } from 'convex/react'
import { api as apiBase } from '../../convex/_generated/api'
const api = apiBase as any

function timeAgo(ts: number): string {
  const diff = Date.now() - ts
  const mins  = Math.floor(diff / 60_000)
  const hours = Math.floor(diff / 3_600_000)
  const days  = Math.floor(diff / 86_400_000)
  if (mins < 1)   return 'just now'
  if (mins < 60)  return `${mins}m ago`
  if (hours < 24) return `${hours}h ago`
  if (days < 7)   return `${days}d ago`
  return new Date(ts).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })
}

const TYPE_ICON: Record<string, string> = {
  patient_share: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 11v6M19 14h6"/></svg>`,
  record_viewed: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><circle cx="12" cy="12" r="3"/><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/></svg>`,
  device_recall: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0zM12 9v4M12 17h.01"/></svg>`,
  expiry:        `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>`,
}

const TYPE_COLOR: Record<string, string> = {
  patient_share: 'ok',
  record_viewed: 'ok',
  device_recall: 'err',
  expiry:        'warn',
}

export default function ClinicNotificationsOverlay() {
  const notifications = useQuery(api.patients.getMyNotifications)
  const markRead      = useMutation(api.patients.markAllNotificationsRead)
  const [drawerOpen,  setDrawerOpen]  = useState(false)

  const unreadCount = notifications?.filter((n: any) => !n.read).length ?? 0

  // ── Patch DOM count badge on the static HTML bell button ──────────────────
  useEffect(() => {
    // Update sidebar count badge
    const countEls = document.querySelectorAll('.count, .sb-notif .count')
    countEls.forEach((el) => {
      if (el.closest('.sb-notif') || el.closest('.notif-btn')) {
        el.textContent = String(unreadCount)
      }
    })
    // Show/hide dot indicator
    const dots = document.querySelectorAll('.sb-notif .dot')
    dots.forEach((dot) => {
      ;(dot as HTMLElement).style.display = unreadCount > 0 ? '' : 'none'
    })
  }, [unreadCount])

  // ── Wire the static notification button to open our React drawer ──────────
  useEffect(() => {
    // Expose openNotif / closeNotif on window so the static JS can call them
    ;(window as any).__clinicNotifOpen  = () => setDrawerOpen(true)
    ;(window as any).__clinicNotifClose = () => setDrawerOpen(false)

    // Override openNotif / closeNotif if they exist (set by static scripts)
    const origOpen  = (window as any).openNotif
    const origClose = (window as any).closeNotif
    ;(window as any).openNotif  = () => { setDrawerOpen(true); origOpen?.() }
    ;(window as any).closeNotif = () => { setDrawerOpen(false); origClose?.() }

    return () => {
      if (origOpen)  (window as any).openNotif  = origOpen
      if (origClose) (window as any).closeNotif = origClose
    }
  }, [])

  // Close drawer on Escape key
  useEffect(() => {
    if (!drawerOpen) return
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') setDrawerOpen(false) }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [drawerOpen])

  async function handleMarkAllRead() {
    try { await markRead({}) } catch { /* silent */ }
  }

  if (!drawerOpen) return null

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={() => setDrawerOpen(false)}
        style={{
          position: 'fixed', inset: 0, zIndex: 1199,
          background: 'rgba(0,0,0,.32)',
        }}
        aria-hidden="true"
      />

      {/* Drawer */}
      <aside
        role="dialog"
        aria-modal="true"
        aria-label="Notifications"
        style={{
          position: 'fixed', top: 0, right: 0, bottom: 0, zIndex: 1200,
          width: '100%', maxWidth: 380,
          background: 'var(--bg2)',
          borderLeft: '1px solid var(--border)',
          display: 'flex', flexDirection: 'column',
          boxShadow: '-8px 0 32px rgba(0,0,0,.12)',
        }}
      >
        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '20px 20px 16px',
          borderBottom: '1px solid var(--border)',
          flexShrink: 0,
        }}>
          <h3 style={{ margin: 0, fontSize: 16, fontWeight: 600, fontFamily: 'var(--ff)', color: 'var(--text)' }}>
            Notifications
            {unreadCount > 0 && (
              <span style={{
                marginLeft: 8,
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                width: 20, height: 20, borderRadius: '50%',
                background: 'var(--accent)', color: '#fff',
                fontSize: 11, fontWeight: 700,
              }}>
                {unreadCount}
              </span>
            )}
          </h3>
          <button
            type="button"
            onClick={() => setDrawerOpen(false)}
            aria-label="Close notifications"
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)', padding: 4 }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        {/* List */}
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {notifications === undefined && (
            <div style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--muted)', fontFamily: 'var(--ff)', fontSize: 14 }}>
              Loading…
            </div>
          )}
          {notifications !== undefined && notifications.length === 0 && (
            <div style={{ padding: '48px 20px', textAlign: 'center' }}>
              <div style={{ fontFamily: 'var(--ff)', fontSize: 14, fontWeight: 500, color: 'var(--text)', marginBottom: 6 }}>
                No notifications yet
              </div>
              <p style={{ color: 'var(--muted)', fontSize: 13, margin: 0 }}>
                You&rsquo;ll see updates here when patients share their records or access requests are made.
              </p>
            </div>
          )}
          {notifications?.map((n: any) => {
            const icon  = TYPE_ICON[n.type]  ?? TYPE_ICON.expiry
            const color = TYPE_COLOR[n.type] ?? 'ok'
            return (
              <div
                key={n._id}
                style={{
                  display: 'flex', gap: 14,
                  padding: '16px 20px',
                  borderBottom: '1px solid var(--border)',
                  background: n.read ? 'transparent' : 'color-mix(in srgb,var(--accent) 4%,transparent)',
                }}
              >
                {/* Icon */}
                <div style={{
                  width: 34, height: 34, borderRadius: 9, flexShrink: 0,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: `color-mix(in srgb,var(--${color}) 12%,transparent)`,
                  color: `var(--${color})`,
                }} dangerouslySetInnerHTML={{ __html: icon }} />

                {/* Text */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontFamily: 'var(--ff)', fontSize: 13.5, fontWeight: 600, color: 'var(--text)', marginBottom: 3 }}>
                    {n.title}
                  </div>
                  <div style={{ fontSize: 12.5, color: 'var(--muted)', lineHeight: 1.45, marginBottom: 5 }}>
                    {n.body}
                  </div>
                  <div style={{ fontSize: 11.5, color: 'var(--muted2)', fontFamily: 'var(--ff)' }}>
                    {timeAgo(n.createdAt)}
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        {/* Footer */}
        <div style={{
          padding: '14px 20px',
          borderTop: '1px solid var(--border)',
          display: 'flex', gap: 16,
          flexShrink: 0,
        }}>
          <button
            type="button"
            onClick={handleMarkAllRead}
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              fontFamily: 'var(--ff)', fontSize: 13, color: 'var(--accent)',
              fontWeight: 500, padding: 0,
            }}
          >
            Mark all as read
          </button>
        </div>
      </aside>
    </>
  )
}
