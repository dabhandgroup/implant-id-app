'use client'

import Link       from 'next/link'
import { useUser }  from '@clerk/nextjs'
import { useQuery } from 'convex/react'
import { api }      from '../../../../convex/_generated/api'

const JOB_LABELS: Record<string, string> = {
  admin:        'Admin',
  surgeon:      'Surgeon',
  radiographer: 'Radiographer',
}

function initials(name: string) {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('')
}

export default function ClinicDashboardClient() {
  // ── All hooks unconditionally at top ────────────────────────────────────────
  const { user }  = useUser()
  const stats     = useQuery(api.clinics.getClinicStats)
  const staffList = useQuery(api.clinics.listClinicStaff)

  const firstName = user?.firstName ?? 'there'

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div className="m-content">

      {/* Header */}
      <div className="m-h">
        <div>
          <h2>Welcome back, {firstName}</h2>
          <div className="sub">Here's a snapshot of your clinic activity.</div>
        </div>
        <Link href="/clinics/scan-patient" className="btn btn-s">
          Look up patient
        </Link>
      </div>

      {/* Stat cards */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
        gap: 14,
        marginBottom: 28,
      }}>
        <StatCard
          label="Total patients"
          value={stats === undefined ? '…' : String(stats?.total ?? 0)}
          accent="var(--accent)"
        />
        <StatCard
          label="Verified"
          value={stats === undefined ? '…' : String(stats?.verified ?? 0)}
          accent="var(--ok)"
        />
        <StatCard
          label="Pending verification"
          value={stats === undefined ? '…' : String(stats?.pending ?? 0)}
          accent="#f59e0b"
        />
        <StatCard
          label="Team members"
          value={stats === undefined ? '…' : String(stats?.teamCount ?? 0)}
          accent="var(--muted)"
        />
      </div>

      {/* Quick actions */}
      <div style={{
        background: 'var(--bg2)', border: '1px solid var(--border)',
        borderRadius: 14, padding: '20px 24px', marginBottom: 24,
      }}>
        <div style={{
          fontFamily: 'var(--ff)', fontWeight: 700, fontSize: 13,
          color: 'var(--muted)', textTransform: 'uppercase',
          letterSpacing: '0.06em', marginBottom: 14,
        }}>
          Quick actions
        </div>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <Link href="/clinics/scan-patient" className="btn btn-s">
            Look up patient
          </Link>
          <Link href="/clinics/staff" className="btn">
            Manage team
          </Link>
        </div>
      </div>

      {/* Team preview */}
      <div style={{
        background: 'var(--bg2)', border: '1px solid var(--border)',
        borderRadius: 14, padding: '20px 24px',
      }}>
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          marginBottom: 16,
        }}>
          <div style={{
            fontFamily: 'var(--ff)', fontWeight: 700, fontSize: 13,
            color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.06em',
          }}>
            Team
          </div>
          <Link
            href="/clinics/staff"
            style={{ fontFamily: 'var(--ff)', fontSize: 13, color: 'var(--accent)', textDecoration: 'none', fontWeight: 600 }}
          >
            View all
          </Link>
        </div>

        {staffList === undefined ? (
          <div style={{ fontFamily: 'var(--ff)', fontSize: 14, color: 'var(--muted)', padding: '12px 0' }}>
            Loading…
          </div>
        ) : staffList.length === 0 ? (
          <div style={{ fontFamily: 'var(--ff)', fontSize: 14, color: 'var(--muted)', padding: '12px 0' }}>
            No staff members yet. <Link href="/clinics/staff" style={{ color: 'var(--accent)' }}>Invite your team.</Link>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {staffList.slice(0, 5).map((s) => (
              <div
                key={s._id}
                style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  padding: '8px 0',
                  borderBottom: '1px solid var(--border)',
                }}
              >
                {/* Initials avatar */}
                <div style={{
                  width: 32, height: 32, borderRadius: '50%', flexShrink: 0,
                  background: 'var(--accent)',
                  display: 'grid', placeItems: 'center',
                  fontFamily: 'var(--ff)', fontWeight: 700, fontSize: 12,
                  color: '#fff',
                }}>
                  {initials(s.userName || s.userEmail || '?')}
                </div>

                {/* Name + role */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontFamily: 'var(--ff)', fontWeight: 600, fontSize: 14, color: 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {s.userName || s.userEmail || '—'}
                  </div>
                  <div style={{ fontFamily: 'var(--ff)', fontSize: 12.5, color: 'var(--muted)', marginTop: 1 }}>
                    {JOB_LABELS[s.jobType] ?? s.jobType.charAt(0).toUpperCase() + s.jobType.slice(1)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// ── Stat card ─────────────────────────────────────────────────────────────────
function StatCard({ label, value, accent }: { label: string; value: string; accent: string }) {
  return (
    <div style={{
      background: 'var(--bg2)',
      border: '1px solid var(--border)',
      borderRadius: 14,
      padding: '18px 20px',
    }}>
      <div style={{
        fontFamily: 'var(--ff)', fontSize: 11.5, fontWeight: 700,
        color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.06em',
        marginBottom: 8,
      }}>
        {label}
      </div>
      <div style={{
        fontFamily: 'var(--ff)', fontSize: 30, fontWeight: 800,
        color: accent, letterSpacing: '-0.02em', lineHeight: 1,
      }}>
        {value}
      </div>
    </div>
  )
}
