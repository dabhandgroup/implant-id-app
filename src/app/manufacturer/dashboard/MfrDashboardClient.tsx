'use client'

import { useQuery }    from 'convex/react'
import { useUser }     from '@clerk/nextjs'
import { useRouter }   from 'next/navigation'
import { api as apiBase } from '../../../../convex/_generated/api'
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const api = apiBase as any

const MRI_COLOUR: Record<string, string> = {
  safe: 'var(--ok)', conditional: '#d97706', unsafe: 'var(--err)', unknown: 'var(--muted)',
}
const MRI_LABEL: Record<string, string> = {
  safe: 'MR Safe', conditional: 'MR Conditional', unsafe: 'MR Unsafe', unknown: 'Unknown',
}
const STATUS_STYLE: Record<string, { bg: string; color: string; label: string }> = {
  live:           { bg: 'color-mix(in srgb,var(--ok) 10%,transparent)',   color: 'var(--ok)',  label: 'Live' },
  pending_review: { bg: 'color-mix(in srgb,var(--warn) 10%,transparent)', color: '#d97706',    label: 'Pending review' },
  draft:          { bg: 'var(--bg)',                                       color: 'var(--muted)', label: 'Draft' },
  recalled:       { bg: 'color-mix(in srgb,var(--err) 10%,transparent)',  color: 'var(--err)', label: 'Recalled' },
}

function formatDate(ts: number) {
  return new Date(ts).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

export default function MfrDashboardClient() {
  const { user }  = useUser()
  const router    = useRouter()
  const mfr       = useQuery(api.manufacturers.getMyManufacturer)
  const allDevices = useQuery(
    api.devices.listMyDevices,
    mfr?.companyName ? { manufacturerName: mfr.companyName } : 'skip',
  )

  if (mfr === undefined || allDevices === undefined) {
    return <div style={{ padding: '60px 40px', color: 'var(--muted)', fontFamily: 'var(--ff)', fontSize: 14 }}>Loading…</div>
  }

  if (mfr === null) {
    return (
      <div style={{ padding: '60px 40px', maxWidth: 520, fontFamily: 'var(--ff)' }}>
        <div style={{ fontSize: 24, fontWeight: 600, marginBottom: 10 }}>Account not linked</div>
        <p style={{ color: 'var(--muted)', fontSize: 14, lineHeight: 1.6 }}>
          Your Clerk account is active but hasn&apos;t been linked to a manufacturer profile yet.
          This usually means your application is still pending approval.
          Contact <a href="mailto:support@implantid.io" style={{ color: 'var(--accent)' }}>support@implantid.io</a> if you believe this is an error.
        </p>
      </div>
    )
  }

  const firstName   = user?.firstName ?? mfr.contactName.split(' ')[0]
  const devices     = allDevices ?? []
  const liveCount   = devices.filter((d: any) => d.status === 'live').length
  const pendingCount = devices.filter((d: any) => d.status === 'pending_review').length
  const recent      = [...devices].sort((a: any, b: any) => b.publishedAt - a.publishedAt).slice(0, 10)

  return (
    <div style={{ padding: '36px 40px', maxWidth: 1100, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 32 }}>
        <div>
          <div style={{ fontFamily: 'var(--ff)', fontSize: 13, color: 'var(--muted)', marginBottom: 4 }}>
            {mfr.companyName} · {mfr.status === 'approved' ? (
              <span style={{ color: 'var(--ok)', fontWeight: 600 }}>✓ Verified</span>
            ) : (
              <span style={{ color: '#d97706', fontWeight: 600 }}>Pending approval</span>
            )}
          </div>
          <h1 style={{ fontFamily: 'var(--ff)', fontSize: 28, fontWeight: 600, color: 'var(--text)', margin: 0, letterSpacing: '-.02em' }}>
            Welcome back, {firstName}.
          </h1>
          <p style={{ color: 'var(--muted)', fontSize: 14, marginTop: 4 }}>
            Here&apos;s how your {mfr.companyName} catalogue is performing on Implant ID.
          </p>
        </div>
        <a href="/manufacturer/devices/add" className="btn btn-s" style={{ display: 'inline-flex', alignItems: 'center', gap: 7, textDecoration: 'none' }}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          Add device
        </a>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 16, marginBottom: 36 }}>
        {[
          { label: 'Devices live',         value: liveCount,    sub: 'Active in catalogue' },
          { label: 'Pending review',        value: pendingCount, sub: 'Awaiting sign-off', warn: pendingCount > 0 },
          { label: 'Total submitted',       value: devices.length, sub: 'All time' },
          { label: 'Clinic lookups (30d)',  value: '—',          sub: 'Tracking in progress' },
        ].map(s => (
          <div key={s.label} style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 14, padding: '22px 24px' }}>
            <div style={{ fontFamily: 'var(--ff)', fontSize: 11, fontWeight: 700, letterSpacing: '1.2px', textTransform: 'uppercase', color: 'var(--muted2)', marginBottom: 10 }}>{s.label}</div>
            <div style={{ fontFamily: 'var(--ff)', fontSize: 32, fontWeight: 700, color: (s as any).warn ? '#d97706' : 'var(--text)', letterSpacing: '-.02em', marginBottom: 4 }}>{s.value}</div>
            <div style={{ fontSize: 12.5, color: (s as any).warn ? '#d97706' : 'var(--muted)' }}>{s.sub}</div>
          </div>
        ))}
      </div>

      {/* Recent devices table */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <h2 style={{ fontFamily: 'var(--ff)', fontSize: 18, fontWeight: 500, margin: 0 }}>Recently updated</h2>
        <a href="/manufacturer/devices" style={{ fontFamily: 'var(--ff)', fontSize: 13, color: 'var(--accent)', textDecoration: 'none' }}>View all devices →</a>
      </div>

      {recent.length === 0 ? (
        <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 14, padding: '48px', textAlign: 'center', color: 'var(--muted)', fontFamily: 'var(--ff)', fontSize: 14 }}>
          No devices yet. <a href="/manufacturer/devices/add" style={{ color: 'var(--accent)' }}>Add your first device</a> or use <a href="/manufacturer/devices/bulk" style={{ color: 'var(--accent)' }}>bulk upload</a>.
        </div>
      ) : (
        <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 14, overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: 'var(--ff)', fontSize: 13.5 }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)', background: 'color-mix(in srgb,var(--text) 2%,transparent)' }}>
                {['Device', 'Type', 'Field Strengths', 'MRI Status', 'Status', 'Submitted', ''].map(h => (
                  <th key={h} style={{ padding: '12px 16px', textAlign: 'left', fontFamily: 'var(--ff)', fontSize: 11, fontWeight: 600, letterSpacing: '.8px', textTransform: 'uppercase', color: 'var(--muted2)' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {(recent as any[]).map((d, i) => {
                const st = STATUS_STYLE[d.status ?? 'draft'] ?? STATUS_STYLE.draft
                return (
                  <tr key={d._id} style={{ borderBottom: i < recent.length - 1 ? '1px solid var(--border)' : 'none', cursor: 'pointer' }}
                    onClick={() => router.push(`/manufacturer/devices/${d._id}`)}>
                    <td style={{ padding: '14px 16px' }}>
                      <div style={{ fontWeight: 600, color: 'var(--text)', marginBottom: 2 }}>{d.deviceType || d.manufacturer}</div>
                      <div style={{ fontSize: 12, color: 'var(--muted)' }}>{d.model} · {d.manufacturer}</div>
                    </td>
                    <td style={{ padding: '14px 16px', color: 'var(--muted)' }}>{d.deviceType || '—'}</td>
                    <td style={{ padding: '14px 16px', color: 'var(--muted)', fontFamily: 'monospace', fontSize: 12 }}>{d.fieldStrengths || '—'}</td>
                    <td style={{ padding: '14px 16px' }}>
                      <span style={{ fontFamily: 'var(--ff)', fontSize: 12.5, fontWeight: 600, color: MRI_COLOUR[d.mriStatus ?? 'unknown'] }}>
                        {MRI_LABEL[d.mriStatus ?? 'unknown']}
                      </span>
                    </td>
                    <td style={{ padding: '14px 16px' }}>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, background: st.bg, color: st.color, fontFamily: 'var(--ff)', fontSize: 11.5, fontWeight: 600, padding: '3px 10px', borderRadius: 6 }}>
                        {d.status === 'pending_review' && <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="11" height="11"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>}
                        {d.status === 'live' && <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="11" height="11"><path d="M20 6L9 17l-5-5"/></svg>}
                        {st.label}
                      </span>
                    </td>
                    <td style={{ padding: '14px 16px', color: 'var(--muted)', fontSize: 12.5 }}>{formatDate(d.publishedAt)}</td>
                    <td style={{ padding: '14px 16px' }} onClick={e => e.stopPropagation()}>
                      <a href={`/manufacturer/devices/${d._id}`} style={{ fontFamily: 'var(--ff)', fontSize: 12.5, color: 'var(--accent)', textDecoration: 'none' }}>Edit</a>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
