'use client'

import { useState } from 'react'
import { useUser } from '@clerk/nextjs'
import { useQuery } from 'convex/react'
import { api } from '../../../../convex/_generated/api'

export default function SurgeonDashboardClient() {
  const { user } = useUser()
  const [, setNavOpen] = useState(false)
  const counts = useQuery(api.patients.getSurgeonPatientCounts)

  const firstName = user?.firstName ?? 'Surgeon'

  const navItems = [
    { label: 'Dashboard',   href: '/surgeons/dashboard', icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6' },
    { label: 'My Patients', href: '/surgeons/patients',  icon: 'M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75M9 7a4 4 0 100 8 4 4 0 000-8z' },
    { label: 'Devices',     href: '/surgeons/devices',   icon: 'M9 3H5a2 2 0 00-2 2v4m6-6h10a2 2 0 012 2v4M9 3v18m0 0h10a2 2 0 002-2V9M9 21H5a2 2 0 01-2-2V9m0 0h18' },
    { label: 'Settings',    href: '/surgeons/settings',  icon: 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 11-6 0 3 3 0 016 0z' },
  ]

  const stats = [
    { label: 'Total Patients',        value: counts === undefined ? '…' : String(counts.total),                color: 'var(--accent)' },
    { label: 'Verified',              value: counts === undefined ? '…' : String(counts.verified),             color: 'var(--ok)' },
    { label: 'Awaiting Verification', value: counts === undefined ? '…' : String(counts.awaitingVerification), color: '#f59e0b' },
    { label: 'Pending Review',        value: counts === undefined ? '…' : String(counts.pendingReview),        color: 'var(--err)' },
  ]

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--bg)', fontFamily: 'var(--ff)' }}>

      {/* ── Sidebar ────────────────────────────────────────────────────────── */}
      <aside style={{
        width: 240, background: 'var(--bg2)', borderRight: '1px solid var(--border)',
        display: 'flex', flexDirection: 'column', padding: '24px 0',
        position: 'fixed', top: 0, left: 0, height: '100vh', zIndex: 10,
      }}>
        {/* Logo */}
        <div style={{ padding: '0 20px 24px', borderBottom: '1px solid var(--border)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <img src="/icon.svg" alt="Implant ID" style={{ width: 28, height: 28 }} />
            <span style={{ fontWeight: 700, fontSize: 15, color: 'var(--text)' }}>
              <b>Implant</b><span style={{ color: 'var(--accent)' }}>ID</span>
            </span>
          </div>
          <div style={{ marginTop: 6, fontSize: 11, color: 'var(--muted2)', fontWeight: 600, letterSpacing: '1px', textTransform: 'uppercase' }}>
            Surgeon Portal
          </div>
        </div>

        {/* Nav */}
        <nav style={{ flex: 1, padding: '16px 12px' }}>
          {navItems.map(item => {
            const active = typeof window !== 'undefined' && window.location.pathname === item.href
            return (
              <a
                key={item.href}
                href={item.href}
                style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '10px 12px', borderRadius: 8, marginBottom: 2,
                  color: active ? 'var(--accent)' : 'var(--text)',
                  textDecoration: 'none', fontSize: 13.5, fontWeight: 500,
                  background: active
                    ? 'color-mix(in srgb,var(--accent) 10%,transparent)'
                    : 'transparent',
                }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                  <path d={item.icon} strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                {item.label}
              </a>
            )
          })}
        </nav>

        {/* User footer */}
        <div style={{ padding: '16px 20px', borderTop: '1px solid var(--border)' }}>
          <div style={{ fontSize: 12.5, color: 'var(--muted)', fontWeight: 500 }}>
            {user?.fullName ?? 'Surgeon'}
          </div>
          <div style={{ fontSize: 11, color: 'var(--muted2)', marginTop: 2 }}>Surgeon</div>
        </div>
      </aside>

      {/* ── Main content ───────────────────────────────────────────────────── */}
      <main style={{ marginLeft: 240, flex: 1, padding: '32px 40px' }}>
        {/* Header */}
        <div style={{ marginBottom: 28 }}>
          <h1 style={{ margin: 0, fontSize: 24, fontWeight: 700, color: 'var(--text)' }}>
            Good to see you, {firstName}
          </h1>
          <p style={{ margin: '6px 0 0', fontSize: 14, color: 'var(--muted)' }}>
            Manage your patients and implant records.
          </p>
        </div>

        {/* Stats row */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 16, marginBottom: 28 }}>
          {stats.map(s => (
            <div key={s.label} style={{
              background: 'var(--bg2)', border: '1px solid var(--border)',
              borderRadius: 14, padding: '20px 22px',
            }}>
              <div style={{ fontSize: 26, fontWeight: 700, color: s.color }}>{s.value}</div>
              <div style={{ fontSize: 12.5, color: 'var(--muted)', marginTop: 4 }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* Patients placeholder */}
        <div style={{
          background: 'var(--bg2)', border: '1px solid var(--border)',
          borderRadius: 14, padding: '48px 24px', textAlign: 'center',
        }}>
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="var(--muted2)" strokeWidth="1.4" style={{ marginBottom: 12 }}>
            <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/>
            <circle cx="9" cy="7" r="4"/>
            <path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/>
          </svg>
          <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)', marginBottom: 6 }}>
            No patients yet
          </div>
          <p style={{ fontSize: 13, color: 'var(--muted)', maxWidth: 340, margin: '0 auto' }}>
            Your patients will appear here once your clinic admin links them to your account.
          </p>
        </div>
      </main>
    </div>
  )
}
