import './page.css'
import { Suspense }      from 'react'
import type { Metadata } from 'next'
import { currentUser }   from '@clerk/nextjs/server'
import ScanPatientClient from './ScanPatientClient'

export const metadata: Metadata = { title: 'Scan patient card · Implant ID' }
export const dynamic = 'force-dynamic'

export default async function ScanPatientPage() {
  const clerkUser = await currentUser()

  const firstName    = clerkUser?.firstName ?? ''
  const lastName     = clerkUser?.lastName  ?? ''
  const userName     = clerkUser?.fullName
    ?? clerkUser?.emailAddresses?.[0]?.emailAddress
    ?? 'Clinic staff'
  const userInitials = firstName && lastName
    ? `${firstName[0]}${lastName[0]}`.toUpperCase()
    : firstName
    ? firstName[0].toUpperCase()
    : 'CS'

  return (
    <>
      <div className="sb-back" id="sb-back" />
      <div className="app" id="app">

        {/* ── Sidebar ── */}
        <aside className="sidebar">

          <div className="sb-logo">
            <a href="/" className="logo">
              <img src="/icon.svg" alt="Implant ID" />
              <span className="logo-text"><b>Implant</b><span>ID</span></span>
            </a>
            <button className="sb-toggle" aria-label="Collapse sidebar">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="15 18 9 12 15 6" />
              </svg>
            </button>
          </div>

          <span className="sb-section">Lookup</span>
          <a className="sb-link active" href="/clinics/scan-patient" title="Scan patient card" aria-current="page">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
              <rect x="3" y="3" width="7" height="7" rx="1.5"/>
              <rect x="5" y="5" width="3" height="3"/>
              <rect x="14" y="3" width="7" height="7" rx="1.5"/>
              <rect x="16" y="5" width="3" height="3"/>
              <rect x="3" y="14" width="7" height="7" rx="1.5"/>
              <rect x="5" y="16" width="3" height="3"/>
              <rect x="14" y="14" width="2.5" height="2.5" rx=".5"/>
              <rect x="18" y="14" width="3" height="3" rx=".5"/>
              <rect x="14" y="18" width="3" height="3" rx=".5"/>
              <rect x="19" y="19" width="2" height="2" rx=".5"/>
            </svg>
            <span>Scan card</span>
          </a>
          <a className="sb-link" href="/clinics/library" title="Implant library">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
              <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20M4 19.5A2.5 2.5 0 0 0 6.5 22H20V2H6.5A2.5 2.5 0 0 0 4 4.5v15z" />
            </svg>
            <span>Implant library</span>
          </a>
          <a className="sb-link" href="/clinics/manufacturers" title="Manufacturers">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
              <path d="M3 21V8l9-5 9 5v13" />
              <path d="M9 9h6M9 13h6M9 17h6" />
            </svg>
            <span>Manufacturers</span>
          </a>

          <span className="sb-section">Patients</span>
          <a className="sb-link" href="/clinics/all-patients" title="All patients">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
              <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
            </svg>
            <span>All patients</span>
          </a>
          <a className="sb-link" href="/clinics/add-patient" title="Add patient">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
              <circle cx="9" cy="7" r="4" />
              <path d="M3 21v-2a4 4 0 0 1 4-4h4M19 8v6M16 11h6" />
            </svg>
            <span>Add patient</span>
          </a>

          <span className="sb-section">Clinic</span>
          <a className="sb-link" href="/clinics/staff" title="Staff">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
            </svg>
            <span>Staff</span>
          </a>
          <a className="sb-link" href="/clinics/audit" title="Audit log">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <path d="M14 2v6h6" />
            </svg>
            <span>Audit log</span>
          </a>
          <a className="sb-link" href="/clinics/settings" title="Settings">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
              <circle cx="12" cy="12" r="3" />
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33h0a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51h0a1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82v0a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
            </svg>
            <span>Settings</span>
          </a>

          <button className="sb-notif" aria-label="Notifications" title="Notifications">
            <span className="sb-notif-ic">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                <path d="M13.73 21a2 2 0 0 1-3.46 0" />
              </svg>
              <span className="dot" />
            </span>
            <span className="label">Notifications</span>
          </button>

          <div className="sb-bot">
            <div className="av">{userInitials}</div>
            <div>
              <div className="name">{userName}</div>
              <div className="role">Clinic staff</div>
            </div>
            <span className="chev">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="18 15 12 9 6 15" />
              </svg>
            </span>
          </div>
          <div className="profile-menu" id="profile-menu">
            <a href="/clinics/settings">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
                <circle cx="12" cy="7" r="4" />
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
              </svg>
              My account
            </a>
            <hr />
            <button className="danger">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                <polyline points="16 17 21 12 16 7" />
                <line x1="21" y1="12" x2="9" y2="12" />
              </svg>
              Sign out
            </button>
          </div>
        </aside>

        {/* ── Main content ── */}
        <main className="app-main">
          <Suspense fallback={null}>
            <ScanPatientClient />
          </Suspense>
        </main>
      </div>
    </>
  )
}
