'use client'
import { useEffect } from 'react'
import { usePathname } from 'next/navigation'

// Demo data — will be replaced with Convex queries once backend is live
const PATIENTS = [
  { name: 'Trevor Hughes',   sub: 'TH-4821-IID · Medtronic Azure XT DR',       href: '/clinics/patient-view' },
  { name: 'Laura McMahon',   sub: 'LM-1193-IID · Abbott Aveir DR i2i',          href: '/clinics/patient-view' },
  { name: 'Kieran Patel',    sub: 'KP-7742-IID · Boston Scientific EMBLEM',     href: '/clinics/patient-view' },
  { name: 'Sofia Bernardi',  sub: 'SB-3310-IID · Medtronic Percept PC DBS',     href: '/clinics/patient-view' },
  { name: 'James Okafor',    sub: 'JO-9981-IID · Cochlear Nucleus CI622',       href: '/clinics/patient-view' },
]
const DEVICES = [
  { name: 'Medtronic Azure XT DR',        sub: 'Dual-chamber pacemaker · MRI Conditional 1.5T/3T', href: '/clinics/library' },
  { name: 'Abbott Aveir DR i2i',          sub: 'Leadless pacemaker · MRI Conditional 1.5T/3T',     href: '/clinics/library' },
  { name: 'Boston Scientific EMBLEM S-ICD', sub: 'Subcutaneous ICD · MRI Conditional 1.5T',        href: '/clinics/library' },
  { name: 'Medtronic Percept PC DBS',     sub: 'Deep brain stimulator · MRI Conditional 1.5T',     href: '/clinics/library' },
  { name: 'Cochlear Nucleus CI622',       sub: 'Cochlear implant · MRI Conditional 1.5T/3T',       href: '/clinics/library' },
  { name: 'Stryker Triathlon Knee',       sub: 'Total knee replacement · MRI Conditional',          href: '/clinics/library' },
  { name: 'Biotronik Edora 8 DR-T',       sub: 'Dual-chamber pacemaker · MRI Conditional 1.5T/3T', href: '/clinics/library' },
]
const PAGES = [
  { name: 'All patients',    href: '/clinics/all-patients' },
  { name: 'Scan patient card', href: '/clinics/scan-patient' },
  { name: 'Implant library', href: '/clinics/library' },
  { name: 'Manufacturers',   href: '/clinics/manufacturers' },
  { name: 'Staff',           href: '/clinics/staff' },
  { name: 'Audit log',       href: '/clinics/audit' },
  { name: 'Settings',        href: '/clinics/settings' },
]

function hl(text: string, q: string) {
  if (!q) return text
  const i = text.toLowerCase().indexOf(q.toLowerCase())
  if (i < 0) return text
  return text.slice(0, i) + '<em>' + text.slice(i, i + q.length) + '</em>' + text.slice(i + q.length)
}

export default function GlobalSearch() {
  const pathname = usePathname()

  useEffect(() => {
    const appTop = document.querySelector('.app-top') as HTMLElement | null
    if (!appTop) return

    // Remove any previous instance
    document.getElementById('gs-root')?.remove()

    // ── Build the search HTML ────────────────────────────────────────────────
    const wrap = document.createElement('div')
    wrap.id = 'gs-root'
    wrap.innerHTML = `
      <div id="gs-field">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/></svg>
        <input id="gs-input" type="text" placeholder="Search patients, devices, manufacturers…" autocomplete="off" spellcheck="false">
        <kbd id="gs-kbd">⌘K</kbd>
      </div>
      <div id="gs-drop"></div>
    `

    // Insert between .app-top-l and .app-top-r
    const right = appTop.querySelector('.app-top-r')
    appTop.insertBefore(wrap, right)

    // ── Style the top bar to flex properly ──────────────────────────────────
    appTop.style.cssText += ';display:flex;align-items:center;gap:12px'
    const topL = appTop.querySelector('.app-top-l') as HTMLElement | null
    if (topL) topL.style.flexShrink = '0'

    // ── Search logic ────────────────────────────────────────────────────────
    const input = document.getElementById('gs-input') as HTMLInputElement
    const drop  = document.getElementById('gs-drop')  as HTMLElement

    function navigate(href: string) {
      close()
      // Dispatch a custom event that AppNav's router.push picks up,
      // or fall back to a direct location change
      window.dispatchEvent(new CustomEvent('gs:nav', { detail: href }))
    }

    function renderDrop(q: string) {
      const lq = q.toLowerCase()
      const pts = PATIENTS.filter(p => p.name.toLowerCase().includes(lq) || p.sub.toLowerCase().includes(lq))
      const dvs = DEVICES.filter(d => d.name.toLowerCase().includes(lq) || d.sub.toLowerCase().includes(lq))
      const pgs = PAGES.filter(p => p.name.toLowerCase().includes(lq))

      if (!pts.length && !dvs.length && !pgs.length) {
        drop.innerHTML = '<div class="gs-empty">No results for <b>' + q + '</b></div>'
        return
      }

      let html = ''
      if (pts.length) {
        html += '<div class="gs-sec">Patients</div>'
        pts.forEach(p => {
          html += `<a class="gs-row" href="${p.href}" data-gs-href="${p.href}">
            <span class="gs-ic gs-ic-pt"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><circle cx="12" cy="8" r="4"/><path d="M20 21v-1a6 6 0 0 0-6-6H10a6 6 0 0 0-6 6v1"/></svg></span>
            <span class="gs-txt"><b>${hl(p.name, q)}</b><span>${hl(p.sub, q)}</span></span>
          </a>`
        })
      }
      if (dvs.length) {
        html += '<div class="gs-sec">Devices</div>'
        dvs.forEach(d => {
          html += `<a class="gs-row" href="${d.href}" data-gs-href="${d.href}">
            <span class="gs-ic gs-ic-dv"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><rect x="4" y="6" width="16" height="12" rx="2"/><path d="M8 6V4M16 6V4M4 10h16"/></svg></span>
            <span class="gs-txt"><b>${hl(d.name, q)}</b><span>${hl(d.sub, q)}</span></span>
          </a>`
        })
      }
      if (pgs.length) {
        html += '<div class="gs-sec">Pages</div>'
        pgs.forEach(p => {
          html += `<a class="gs-row" href="${p.href}" data-gs-href="${p.href}">
            <span class="gs-ic gs-ic-pg"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M9 21V9"/></svg></span>
            <span class="gs-txt"><b>${hl(p.name, q)}</b></span>
          </a>`
        })
      }
      drop.innerHTML = html

      // Wire clicks
      drop.querySelectorAll('[data-gs-href]').forEach(el => {
        el.addEventListener('mousedown', (e) => {
          e.preventDefault()
          navigate((el as HTMLElement).dataset.gsHref!)
        })
      })
    }

    function renderDefault() {
      let html = '<div class="gs-sec">Recent patients</div>'
      PATIENTS.slice(0, 3).forEach(p => {
        html += `<a class="gs-row" href="${p.href}" data-gs-href="${p.href}">
          <span class="gs-ic gs-ic-pt"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><circle cx="12" cy="8" r="4"/><path d="M20 21v-1a6 6 0 0 0-6-6H10a6 6 0 0 0-6 6v1"/></svg></span>
          <span class="gs-txt"><b>${p.name}</b><span>${p.sub}</span></span>
        </a>`
      })
      html += '<div class="gs-sec">Quick pages</div>'
      PAGES.slice(0, 4).forEach(p => {
        html += `<a class="gs-row" href="${p.href}" data-gs-href="${p.href}">
          <span class="gs-ic gs-ic-pg"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M9 21V9"/></svg></span>
          <span class="gs-txt"><b>${p.name}</b></span>
        </a>`
      })
      drop.innerHTML = html
      drop.querySelectorAll('[data-gs-href]').forEach(el => {
        el.addEventListener('mousedown', (e) => {
          e.preventDefault()
          navigate((el as HTMLElement).dataset.gsHref!)
        })
      })
    }

    function open() {
      drop.classList.add('gs-open')
      renderDefault()
    }
    function close() {
      drop.classList.remove('gs-open')
      input.value = ''
    }

    input.addEventListener('focus', open)
    input.addEventListener('blur', () => setTimeout(close, 150))
    input.addEventListener('input', () => {
      const q = input.value.trim()
      if (!q) { renderDefault(); return }
      renderDrop(q)
    })
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') { close(); input.blur() }
    })

    // ⌘K / Ctrl+K shortcut
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        input.focus()
      }
    }
    document.addEventListener('keydown', onKey)

    // AppNav listens for gs:nav and calls router.push
    // (no listener needed here — AppNav handles it)

    return () => {
      document.getElementById('gs-root')?.remove()
      document.removeEventListener('keydown', onKey)
    }
  }, [pathname])

  return null
}
