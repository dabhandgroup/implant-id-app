'use client'

import { useEffect }             from 'react'
import { useQuery }              from 'convex/react'
import { api }                   from '../../../convex/_generated/api'
import { usePathname, useRouter } from 'next/navigation'
import { useClerk }              from '@clerk/nextjs'
import Link                      from 'next/link'

type Application = {
  _id:             string
  facilityName:    string
  contactEmail:    string
  status:          'pending' | 'approved' | 'rejected'
  submittedAt:     number
  reviewNotes?:    string
}

// ─── Loading screen ───────────────────────────────────────────────────────────

function ClinicLoadingScreen() {
  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'var(--bg)',
      fontFamily: 'var(--ff)',
    }}>
      <Link href="/" style={{ textDecoration: 'none', marginBottom: 32 }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          color: 'var(--text)',
          fontFamily: 'var(--ff)',
          fontSize: 18,
          fontWeight: 600,
          letterSpacing: '-.02em',
        }}>
          <div style={{
            width: 32,
            height: 32,
            borderRadius: 8,
            background: 'var(--accent)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
            </svg>
          </div>
          Implant ID
        </div>
      </Link>
      <div style={{ color: 'var(--muted)', fontSize: 14 }}>Loading your account…</div>
    </div>
  )
}

// ─── Pending screen ───────────────────────────────────────────────────────────

function ClinicPendingScreen({ application, signOut }: { application: Application; signOut: () => void }) {
  return (
    <div style={{
      minHeight: '100vh',
      background: 'var(--bg)',
      fontFamily: 'var(--ff)',
      display: 'flex',
      flexDirection: 'column',
    }}>
      {/* Top bar */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '14px 32px',
        background: 'var(--bg2)',
        borderBottom: '1px solid var(--border)',
      }}>
        <Link href="/" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 28,
            height: 28,
            borderRadius: 7,
            background: 'var(--accent)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
            </svg>
          </div>
          <span style={{ fontWeight: 600, color: 'var(--text)', fontSize: 16, letterSpacing: '-.02em' }}>
            Implant ID
          </span>
        </Link>
        <button
          onClick={signOut}
          style={{
            background: 'transparent',
            border: 0,
            color: 'var(--muted)',
            fontFamily: 'var(--ff)',
            fontSize: 13,
            cursor: 'pointer',
            padding: '4px 8px',
          }}
        >
          Sign out
        </button>
      </div>

      {/* Main content */}
      <div style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '48px 24px',
      }}>
        <div style={{ maxWidth: 520, width: '100%' }}>
          {/* Status badge */}
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            background: 'color-mix(in srgb, var(--warn) 12%, transparent)',
            color: 'var(--warn)',
            fontFamily: 'var(--ff)',
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: '1.2px',
            textTransform: 'uppercase',
            padding: '4px 10px',
            borderRadius: 6,
            marginBottom: 20,
          }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--warn)', display: 'inline-block' }} />
            Awaiting Review
          </div>

          <h1 style={{
            fontFamily: 'var(--ff)',
            fontSize: 28,
            fontWeight: 600,
            letterSpacing: '-.025em',
            color: 'var(--text)',
            margin: '0 0 12px',
          }}>
            Your application is being reviewed
          </h1>

          <p style={{
            color: 'var(--muted)',
            fontSize: 15,
            lineHeight: 1.65,
            margin: '0 0 28px',
          }}>
            We&rsquo;ve received your application for{' '}
            <strong style={{ color: 'var(--text)', fontWeight: 600 }}>{application.facilityName}</strong>.
            Our team reviews all applications within 2 working days. You&rsquo;ll be notified once
            a decision is made.
          </p>

          {/* Summary card */}
          <div style={{
            background: 'var(--bg2)',
            border: '1px solid var(--border)',
            borderRadius: 14,
            padding: '20px 22px',
            marginBottom: 28,
          }}>
            <div style={{
              fontFamily: 'var(--ff)',
              fontSize: 11,
              fontWeight: 600,
              letterSpacing: '1.2px',
              textTransform: 'uppercase',
              color: 'var(--muted2)',
              marginBottom: 14,
            }}>
              Application Summary
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              <SummaryField label="Facility" value={application.facilityName} />
              <SummaryField label="Contact" value={application.contactEmail} />
              <SummaryField
                label="Submitted"
                value={new Date(application.submittedAt).toLocaleDateString('en-GB', {
                  day: '2-digit', month: 'short', year: 'numeric',
                })}
              />
              <SummaryField label="Status" value="Under review" />
            </div>
          </div>

          {/* Library link */}
          <div style={{ marginBottom: 24 }}>
            <div style={{ color: 'var(--muted)', fontSize: 14, marginBottom: 12 }}>
              While you wait, you can browse our device library.
            </div>
            <Link href="/clinics/library" className="btn btn-s">
              Browse Device Library
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}

function SummaryField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: '1px', textTransform: 'uppercase', color: 'var(--muted2)', marginBottom: 4 }}>
        {label}
      </div>
      <div style={{ fontSize: 14, color: 'var(--text)', fontFamily: 'var(--fb)' }}>
        {value}
      </div>
    </div>
  )
}

// ─── Rejected screen ──────────────────────────────────────────────────────────

function ClinicRejectedScreen({ application, signOut }: { application: Application; signOut: () => void }) {
  return (
    <div style={{
      minHeight: '100vh',
      background: 'var(--bg)',
      fontFamily: 'var(--ff)',
      display: 'flex',
      flexDirection: 'column',
    }}>
      {/* Top bar */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '14px 32px',
        background: 'var(--bg2)',
        borderBottom: '1px solid var(--border)',
      }}>
        <Link href="/" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 28,
            height: 28,
            borderRadius: 7,
            background: 'var(--accent)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
            </svg>
          </div>
          <span style={{ fontWeight: 600, color: 'var(--text)', fontSize: 16, letterSpacing: '-.02em' }}>
            Implant ID
          </span>
        </Link>
        <button
          onClick={signOut}
          style={{
            background: 'transparent',
            border: 0,
            color: 'var(--muted)',
            fontFamily: 'var(--ff)',
            fontSize: 13,
            cursor: 'pointer',
            padding: '4px 8px',
          }}
        >
          Sign out
        </button>
      </div>

      {/* Main content */}
      <div style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '48px 24px',
      }}>
        <div style={{ maxWidth: 520, width: '100%' }}>
          {/* Status badge */}
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            background: 'color-mix(in srgb, var(--err) 12%, transparent)',
            color: 'var(--err)',
            fontFamily: 'var(--ff)',
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: '1.2px',
            textTransform: 'uppercase',
            padding: '4px 10px',
            borderRadius: 6,
            marginBottom: 20,
          }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--err)', display: 'inline-block' }} />
            Not Approved
          </div>

          <h1 style={{
            fontFamily: 'var(--ff)',
            fontSize: 28,
            fontWeight: 600,
            letterSpacing: '-.025em',
            color: 'var(--text)',
            margin: '0 0 12px',
          }}>
            Application not approved
          </h1>

          <p style={{
            color: 'var(--muted)',
            fontSize: 15,
            lineHeight: 1.65,
            margin: '0 0 16px',
          }}>
            Unfortunately your application for{' '}
            <strong style={{ color: 'var(--text)', fontWeight: 600 }}>{application.facilityName}</strong>{' '}
            was not approved.
          </p>

          {application.reviewNotes && (
            <div style={{
              background: 'color-mix(in srgb, var(--err) 6%, transparent)',
              border: '1px solid color-mix(in srgb, var(--err) 20%, transparent)',
              borderRadius: 10,
              padding: '14px 18px',
              marginBottom: 16,
              color: 'var(--text)',
              fontSize: 14,
              lineHeight: 1.55,
            }}>
              {application.reviewNotes}
            </div>
          )}

          <p style={{
            color: 'var(--muted)',
            fontSize: 14,
            lineHeight: 1.6,
            margin: '0 0 28px',
          }}>
            Please contact{' '}
            <a
              href="mailto:support@implantid.io"
              style={{ color: 'var(--accent)', textDecoration: 'none' }}
            >
              support@implantid.io
            </a>{' '}
            if you have any questions.
          </p>

          <button onClick={signOut} className="btn">
            Sign out
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Gate ─────────────────────────────────────────────────────────────────────

export default function ClinicGate({ children }: { children: React.ReactNode }) {
  // ALL hooks at the top, unconditionally
  const pathname      = usePathname()
  const router        = useRouter()
  const myApplication = useQuery(api.clinics.getMyApplication) as Application | null | undefined
  const myClinic      = useQuery(api.clinics.getMyClinic)
  const { signOut }   = useClerk()

  // Redirect to onboarding if no application found (after data loads)
  useEffect(() => {
    if (myApplication === null && !pathname.startsWith('/clinics/onboarding')) {
      router.push('/clinics/onboarding')
    }
  }, [myApplication, pathname, router])

  // Public clinic paths: allow through without account checks
  if (pathname.startsWith('/clinics/onboarding') || pathname.startsWith('/clinics/activate')) {
    return <>{children}</>
  }

  // Still loading
  if (myApplication === undefined || myClinic === undefined) {
    return <ClinicLoadingScreen />
  }

  // No application yet — redirect is firing via useEffect, show loading
  if (myApplication === null) {
    return <ClinicLoadingScreen />
  }

  // Application pending
  if (myApplication.status === 'pending') {
    return (
      <ClinicPendingScreen
        application={myApplication}
        signOut={() => signOut({ redirectUrl: '/' })}
      />
    )
  }

  // Application rejected
  if (myApplication.status === 'rejected') {
    return (
      <ClinicRejectedScreen
        application={myApplication}
        signOut={() => signOut({ redirectUrl: '/' })}
      />
    )
  }

  // Approved — allow access
  return <>{children}</>
}
