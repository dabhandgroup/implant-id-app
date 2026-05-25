'use client'

import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { useUser, useClerk } from '@clerk/nextjs'

const navHTML = `<nav class="site-nav">
  <div class="nav-inner">
    <div class="nav-l">
      <a href="/" class="logo"><img src="/icon.svg" alt=""><span class="logo-text"><b>Implant</b><span>ID</span></span></a>
      <ul class="nav-c" id="nav-c">
        <li><button class="mega-trigger" data-mega="mega-patients">Patients</button>
          <div class="mega" id="mega-patients">
            <div class="mega-g">
              <a href="/patients"><div class="mi"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><circle cx="12" cy="7" r="4"/><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/></svg></div><div class="mt"><b>For patients</b><span>Be prepared for your appointment</span></div></a>
              <a href="/patients/wallet"><div class="mi"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><rect x="3" y="6" width="18" height="14" rx="2"/><path d="M3 10h18"/></svg></div><div class="mt"><b>Apple Wallet pass</b><span>Your record on your phone</span></div></a>
              <a href="/patients/testimonials"><div class="mi"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg></div><div class="mt"><b>Patient testimonials</b><span>Real stories from real patients</span></div></a>
              <a href="/login"><div class="mi"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/><polyline points="10 17 15 12 10 7"/><line x1="15" y1="12" x2="3" y2="12"/></svg></div><div class="mt"><b>Patient log in</b><span>Sign in to your account</span></div></a>
            </div>
            <div class="mega-foot"><span>Free forever for every patient · <b>Apple Wallet + Google Wallet</b></span><a href="/patients/register" class="btn btn-s">Get my pass →</a></div>
          </div>
        </li>
        <li><button class="mega-trigger" data-mega="mega-clinics">Clinics</button>
          <div class="mega" id="mega-clinics">
            <div class="mega-g">
              <a href="/clinics"><div class="mi"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><path d="M3 21V8l9-5 9 5v13"/><path d="M9 21V12h6v9"/></svg></div><div class="mt"><b>For clinics</b><span>Save hours every day</span></div></a>
              <a href="/library"><div class="mi"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/></svg></div><div class="mt"><b>Implant library</b><span>9 verified devices</span></div></a>
              <a href="/scan"><div class="mi"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><path d="M3 7V5a2 2 0 0 1 2-2h2M17 3h2a2 2 0 0 1 2 2v2M21 17v2a2 2 0 0 1-2 2h-2M7 21H5a2 2 0 0 1-2-2v-2M7 12h10"/></svg></div><div class="mt"><b>Scan-to-profile</b><span>Full record in under 2s</span></div></a>
              <a href="/clinics#pricing"><div class="mi"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><path d="M13 2 3 14h9l-1 8 10-12h-9z"/></svg></div><div class="mt"><b>Pricing</b><span>Book a demo</span></div></a>
              <a href="/clinics/dashboard"><div class="mi"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg></div><div class="mt"><b>Clinic dashboard</b><span>See the product</span></div></a>
              <a href="/clinics/onboarding"><div class="mi"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><circle cx="9" cy="7" r="4"/><path d="M3 21v-2a4 4 0 0 1 4-4h4M19 8v6M16 11h6"/></svg></div><div class="mt"><b>Register a clinic</b><span>Book a demo to get started</span></div></a>
            </div>
            <div class="mega-foot"><span>Unlimited users · unlimited scanners · <b>HIPAA-grade</b></span><a href="/demo" class="btn btn-s">Book a demo →</a></div>
          </div>
        </li>
        <li><a href="/news">News</a></li>
        <li><a href="/about">About</a></li>
      </ul>
    </div>
    <div class="nav-r">
      <span id="nav-auth-slot"></span>
      <a href="/contact" class="btn btn-s">Contact</a>
      <button class="nav-hamb" aria-label="Menu">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
      </button>
    </div>
  </div>
</nav>

<!-- Mobile menu -->
<div class="mob-back" id="mob-back"></div>
<aside class="mob-panel" id="mob-panel">
  <div class="mob-h">
    <a href="/" class="logo"><img src="/icon.svg" alt=""><span class="logo-text"><b>Implant</b><span>ID</span></span></a>
    <button class="x" aria-label="Close">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6 6 18M6 6l12 12"/></svg>
    </button>
  </div>
  <div class="mob-acc">
    <div class="mob-sec">
      <button class="mob-sec-hd">Patients<span class="chev"></span></button>
      <div class="mob-sec-body">
        <a href="/patients"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><circle cx="12" cy="7" r="4"/><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/></svg> For patients</a>
        <a href="/patients/wallet"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><rect x="3" y="6" width="18" height="14" rx="2"/><path d="M3 10h18"/></svg> Apple Wallet pass</a>
        <a href="/patients/dashboard"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/></svg> My implant record</a>
        <a href="/login"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/><polyline points="10 17 15 12 10 7"/></svg> Patient log in</a>
      </div>
    </div>
    <div class="mob-sec">
      <button class="mob-sec-hd">Clinics<span class="chev"></span></button>
      <div class="mob-sec-body">
        <a href="/clinics"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><path d="M3 21V8l9-5 9 5v13"/></svg> For clinics</a>
        <a href="/library"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/></svg> Implant library</a>
        <a href="/scan"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><path d="M3 7V5a2 2 0 0 1 2-2h2M17 3h2a2 2 0 0 1 2 2v2M21 17v2a2 2 0 0 1-2 2h-2M7 21H5a2 2 0 0 1-2-2v-2M7 12h10"/></svg> Scan-to-profile</a>
        <a href="/clinics#pricing"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><path d="M13 2 3 14h9l-1 8 10-12h-9z"/></svg> Pricing</a>
        <a href="/clinics/dashboard"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg> Clinic dashboard</a>
        <a href="/clinics/onboarding"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><circle cx="9" cy="7" r="4"/><path d="M3 21v-2a4 4 0 0 1 4-4h4M19 8v6M16 11h6"/></svg> Register a clinic</a>
      </div>
    </div>
    <a class="mob-direct" href="/news">News</a>
    <a class="mob-direct" href="/manufacturer-login">Manufacturer / admin</a>
    <a class="mob-direct" href="/about">About</a>
  </div>
  <div class="mob-foot">
    <a href="/login" class="btn">Sign in</a>
    <a href="/contact" class="btn btn-s">Contact</a>
  </div>
</aside>`

export default function Nav() {
  useEffect(() => {
    // Mega menu toggle
    document.querySelectorAll('.mega-trigger').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const target = e.currentTarget as HTMLElement
        const li = target.parentElement!
        const isOpen = li.classList.contains('open')
        document.querySelectorAll('.nav-c > li.open').forEach(x => x.classList.remove('open'))
        if (!isOpen) li.classList.add('open')
      })
    })

    // Login dropdown toggle — delegated so it works after portal renders
    function handleLoginDd(e: MouseEvent) {
      if ((e.target as Element).closest('.login-dd-btn')) {
        document.getElementById('login-dd')?.classList.toggle('open')
      }
    }
    document.addEventListener('click', handleLoginDd)

    // Mobile menu open/close
    const hamb = document.querySelector('.nav-hamb')
    if (hamb) {
      hamb.addEventListener('click', () => {
        document.getElementById('mob-panel')?.classList.add('open')
        document.getElementById('mob-back')?.classList.add('open')
        document.body.style.overflow = 'hidden'
      })
    }

    function closeMob() {
      document.getElementById('mob-panel')?.classList.remove('open')
      document.getElementById('mob-back')?.classList.remove('open')
      document.body.style.overflow = ''
    }

    const mobBack = document.getElementById('mob-back')
    if (mobBack) mobBack.addEventListener('click', closeMob)

    const closeBtn = document.querySelector('.mob-panel .x')
    if (closeBtn) closeBtn.addEventListener('click', closeMob)

    // Mobile accordion sections
    document.querySelectorAll('.mob-sec-hd').forEach(btn => {
      btn.addEventListener('click', (e) => {
        (e.currentTarget as HTMLElement).parentElement?.classList.toggle('open')
      })
    })

    // Click-outside handlers
    function handleDocClick(e: MouseEvent) {
      const loginDd = document.getElementById('login-dd')
      if (loginDd && !loginDd.contains(e.target as Node)) loginDd.classList.remove('open')
      if (!(e.target as HTMLElement).closest('.nav-c > li')) {
        document.querySelectorAll('.nav-c > li.open').forEach(x => x.classList.remove('open'))
      }
    }

    function handleKeydown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        closeMob()
        document.querySelectorAll('.nav-c > li.open').forEach(x => x.classList.remove('open'))
      }
    }

    document.addEventListener('click', handleDocClick)
    document.addEventListener('click', handleLoginDd)
    document.addEventListener('keydown', handleKeydown)

    return () => {
      document.removeEventListener('click', handleDocClick)
      document.removeEventListener('click', handleLoginDd)
      document.removeEventListener('keydown', handleKeydown)
    }
  }, [])

  return (
    <>
      <div style={{ display: 'contents' }} dangerouslySetInnerHTML={{ __html: navHTML }} />
      <NavAuthPortal />
    </>
  )
}

/** Renders Clerk auth controls into the #nav-auth-slot placeholder in the nav HTML. */
function NavAuthPortal() {
  const [slot, setSlot] = useState<HTMLElement | null>(null)

  useEffect(() => {
    setSlot(document.getElementById('nav-auth-slot'))
  }, [])

  if (!slot) return null

  const { user, isLoaded } = useUser()
  const { signOut } = useClerk()
  const [open, setOpen] = useState(false)

  // Close the user menu on outside click
  useEffect(() => {
    if (!open) return
    function handle(e: MouseEvent) {
      const el = document.getElementById('user-dd')
      if (el && !el.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('click', handle)
    return () => document.removeEventListener('click', handle)
  }, [open])

  // Show nothing until Clerk resolves auth state (avoids flash)
  if (!isLoaded) return createPortal(<div style={{ width: 80 }} />, slot)

  if (!user) {
    return createPortal(
      <div className="login-dd" id="login-dd">
        <button className="btn login-dd-btn">Sign in</button>
        <div className="login-menu">
          <a href="/login">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/><polyline points="10 17 15 12 10 7"/><line x1="15" y1="12" x2="3" y2="12"/></svg>
            <div><span>Log in</span><span className="sub">Already have an account</span></div>
          </a>
          <hr />
          <a href="/clinics/onboarding">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"><path d="M3 21V8l9-5 9 5v13"/></svg>
            <div><span>Register a clinic</span><span className="sub">Book a demo</span></div>
          </a>
          <a href="/patients/register">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"><circle cx="12" cy="7" r="4"/><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/></svg>
            <div><span>Register as a patient</span><span className="sub">Free forever · Apple Wallet pass</span></div>
          </a>
        </div>
      </div>,
      slot
    )
  }

  const initials = (user.firstName?.[0] ?? user.primaryEmailAddress?.emailAddress?.[0] ?? '?').toUpperCase()
  const displayName = user.firstName ? `${user.firstName} ${user.lastName ?? ''}`.trim() : (user.primaryEmailAddress?.emailAddress ?? '')

  return createPortal(
    <div className="login-dd" id="user-dd" style={{ position: 'relative' }}>
      <button
        className="nav-user-btn"
        onClick={() => setOpen(o => !o)}
        aria-label="Account menu"
      >
        <span className="nav-user-av">{initials}</span>
        <span className="nav-user-name">{displayName}</span>
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ opacity: 0.4, transition: 'transform .18s', transform: open ? 'rotate(180deg)' : 'none' }}><polyline points="6 9 12 15 18 9"/></svg>
      </button>
      {open && (
        <div className="login-menu" style={{ display: 'block' }}>
          <a href="/clinics/dashboard">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>
            <div><span>Dashboard</span><span className="sub">Go to your clinic</span></div>
          </a>
          <a href="/clinics/settings">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
            <div><span>Settings</span><span className="sub">Account &amp; clinic preferences</span></div>
          </a>
          <hr />
          <button
            style={{ background: 'none', border: 0, width: '100%', padding: 0, cursor: 'pointer' }}
            onClick={() => signOut({ redirectUrl: '/login' })}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
            <div><span>Sign out</span><span className="sub">{displayName}</span></div>
          </button>
        </div>
      )}
    </div>,
    slot
  )
}
