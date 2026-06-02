'use client'

import { useQuery }  from 'convex/react'
import { useUser }   from '@clerk/nextjs'
import { api as apiBase } from '../../../../convex/_generated/api'

const api = apiBase as any

export default function SurgeonDashboardClient() {
  const { user } = useUser()

  // All hooks unconditionally at top
  const patients = useQuery(api.clinics.listClinicPatients)

  // Derived stats
  const total    = patients?.length ?? '—'
  const verified = patients ? patients.filter((p: any) => p.verificationStatus === 'active').length   : '—'
  const pending  = patients ? patients.filter((p: any) => p.verificationStatus !== 'active').length   : '—'

  const firstName = user?.firstName ?? 'Surgeon'

  const stats = [
    { label: 'Total Patients',        value: total,   color: 'var(--accent)' },
    { label: 'Verified',              value: verified, color: 'var(--ok)'    },
    { label: 'Awaiting Verification', value: pending,  color: '#f59e0b'      },
    { label: 'Pending Review',        value: '—',      color: 'var(--err)'   },
  ]

  return (
    <div className="m-content">

      {/* Header */}
      <div className="m-h" style={{ marginBottom: 28 }}>
        <div>
          <h2 style={{ fontSize: 26, fontWeight: 600, letterSpacing: '-.025em' }}>
            Good to see you, {firstName}
          </h2>
          <div className="sub">
            Surgeon portal — manage your patients and implant records.
          </div>
        </div>
      </div>

      {/* Stat cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 14, marginBottom: 28 }}>
        {stats.map(stat => (
          <div
            key={stat.label}
            style={{
              background: 'var(--bg2)',
              border: '1px solid var(--border)',
              borderRadius: 14,
              padding: '20px 22px',
            }}
          >
            <div style={{
              fontSize: 28,
              fontWeight: 700,
              color: stat.color,
              fontFamily: 'var(--ff)',
              letterSpacing: '-.02em',
              lineHeight: 1,
            }}>
              {stat.value}
            </div>
            <div style={{ fontSize: 12.5, color: 'var(--muted)', marginTop: 6, fontFamily: 'var(--ff)' }}>
              {stat.label}
            </div>
          </div>
        ))}
      </div>

      {/* Quick actions */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 28 }}>
        <a
          href="/surgeons/scan"
          style={{
            display: 'flex', alignItems: 'center', gap: 14,
            background: 'var(--bg2)',
            border: '1px solid var(--border)',
            borderRadius: 14,
            padding: '20px 22px',
            textDecoration: 'none',
            color: 'var(--text)',
            transition: 'border-color .15s, box-shadow .15s',
          }}
          onMouseOver={(e) => (e.currentTarget.style.borderColor = 'var(--accent)')}
          onMouseOut={(e)  => (e.currentTarget.style.borderColor = 'var(--border)')}
        >
          <div style={{
            width: 40, height: 40, borderRadius: 10,
            background: 'color-mix(in srgb,var(--accent) 10%,transparent)',
            display: 'grid', placeItems: 'center', flexShrink: 0,
          }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="1.7" aria-hidden="true">
              <circle cx="11" cy="11" r="7"/>
              <path d="m21 21-4.3-4.3"/>
            </svg>
          </div>
          <div>
            <div style={{ fontFamily: 'var(--ff)', fontWeight: 600, fontSize: 14, marginBottom: 2 }}>
              Look Up Patient
            </div>
            <div style={{ fontSize: 12.5, color: 'var(--muted)' }}>
              Search by Implant ID code
            </div>
          </div>
        </a>

        <a
          href="/surgeons/patients"
          style={{
            display: 'flex', alignItems: 'center', gap: 14,
            background: 'var(--bg2)',
            border: '1px solid var(--border)',
            borderRadius: 14,
            padding: '20px 22px',
            textDecoration: 'none',
            color: 'var(--text)',
            transition: 'border-color .15s',
          }}
          onMouseOver={(e) => (e.currentTarget.style.borderColor = 'var(--accent)')}
          onMouseOut={(e)  => (e.currentTarget.style.borderColor = 'var(--border)')}
        >
          <div style={{
            width: 40, height: 40, borderRadius: 10,
            background: 'color-mix(in srgb,var(--ok) 10%,transparent)',
            display: 'grid', placeItems: 'center', flexShrink: 0,
          }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--ok)" strokeWidth="1.7" aria-hidden="true">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
              <circle cx="9" cy="7" r="4"/>
              <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/>
            </svg>
          </div>
          <div>
            <div style={{ fontFamily: 'var(--ff)', fontWeight: 600, fontSize: 14, marginBottom: 2 }}>
              View All Patients
            </div>
            <div style={{ fontSize: 12.5, color: 'var(--muted)' }}>
              Patients shared with your clinic
            </div>
          </div>
        </a>
      </div>

      {/* Recent patients */}
      <div style={{
        background: 'var(--bg2)',
        border: '1px solid var(--border)',
        borderRadius: 14,
        overflow: 'hidden',
      }}>
        <div style={{
          padding: '16px 20px',
          borderBottom: '1px solid var(--border)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <h3 style={{ fontFamily: 'var(--ff)', fontSize: 14, fontWeight: 600, color: 'var(--text)', margin: 0 }}>
            Recent Patients
          </h3>
          <a href="/surgeons/patients" style={{ fontSize: 12.5, color: 'var(--accent)', fontFamily: 'var(--ff)', fontWeight: 500 }}>
            View all
          </a>
        </div>

        {patients === undefined && (
          <div style={{ padding: '32px 20px', textAlign: 'center', color: 'var(--muted)', fontFamily: 'var(--ff)', fontSize: 14 }}>
            Loading&hellip;
          </div>
        )}

        {patients !== undefined && patients.length === 0 && (
          <div style={{ padding: '48px 24px', textAlign: 'center' }}>
            <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="var(--muted2)" strokeWidth="1.4" style={{ marginBottom: 12, display: 'block', margin: '0 auto 12px' }} aria-hidden="true">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
              <circle cx="9" cy="7" r="4"/>
              <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/>
            </svg>
            <div style={{ fontFamily: 'var(--ff)', fontSize: 14, fontWeight: 500, color: 'var(--text)', marginBottom: 6 }}>
              No patients yet
            </div>
            <p style={{ fontSize: 13, color: 'var(--muted)', maxWidth: 340, margin: '0 auto' }}>
              Patients will appear here once they share their record with your clinic.
            </p>
          </div>
        )}

        {patients !== undefined && patients.length > 0 && (
          <table className="m-tbl" style={{ width: '100%' }}>
            <thead>
              <tr>
                <th>Implant ID</th>
                <th>Name</th>
                <th>Device</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {patients.slice(0, 5).map((p: any) => (
                <tr
                  key={p._id}
                  style={{ cursor: 'pointer' }}
                  onClick={() => window.location.href = '/surgeons/scan?code=' + p.implantIdCode}
                  tabIndex={0}
                  onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') window.location.href = '/surgeons/scan?code=' + p.implantIdCode }}
                  aria-label={`View record for ${p.firstName} ${p.lastName}`}
                >
                  <td style={{ fontFamily: 'SF Mono,Monaco,monospace', fontWeight: 600, color: 'var(--accent)', fontSize: 13 }}>
                    {p.implantIdCode}
                  </td>
                  <td style={{ fontWeight: 500 }}>{p.firstName} {p.lastName}</td>
                  <td style={{ color: 'var(--muted)' }}>{p.selfReportedDevice ?? '—'}</td>
                  <td>
                    <span style={{
                      fontFamily: 'var(--ff)',
                      fontSize: 11.5,
                      fontWeight: 600,
                      padding: '2px 8px',
                      borderRadius: 5,
                      background: p.verificationStatus === 'active'
                        ? 'color-mix(in srgb,var(--ok) 10%,transparent)'
                        : 'color-mix(in srgb,#f59e0b 10%,transparent)',
                      color: p.verificationStatus === 'active' ? 'var(--ok)' : '#92400e',
                      border: p.verificationStatus === 'active'
                        ? '1px solid color-mix(in srgb,var(--ok) 25%,transparent)'
                        : '1px solid color-mix(in srgb,#f59e0b 25%,transparent)',
                    }}>
                      {p.verificationStatus === 'active' ? 'Verified' : 'Pending'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

    </div>
  )
}
