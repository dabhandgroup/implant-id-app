'use client'
import { useRouter, usePathname } from 'next/navigation'
import { useEffect } from 'react'

// All app routes — prefetched on load so every click is instant
const APP_ROUTES = [
  '/clinics/dashboard',
  '/clinics/all-patients',
  '/clinics/patient-view',
  '/clinics/patient/add',
  '/clinics/staff',
  '/clinics/settings',
  '/clinics/audit',
  '/clinics/library',
  '/clinics/manufacturers',
  '/clinics/onboarding',
  '/clinics/scan-patient',
  '/patients/dashboard',
  '/patients/account',
  '/patients/find-care',
  '/patients/share',
  '/patients/wallet',
  '/patients/offboard',
  '/admin/dashboard',
  '/admin/internal',
  '/login',
  '/forgot',
]

export default function AppNav() {
  const router = useRouter()
  const pathname = usePathname()

  // Prefetch every route the moment the app loads
  useEffect(() => {
    APP_ROUTES.forEach((route) => router.prefetch(route))
  }, [router])

  // Intercept all <a> clicks inside dangerouslySetInnerHTML and route them
  // through Next.js so navigation is client-side (no full reload, URL still updates)
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      const a = (e.target as Element).closest('a')
      if (!a) return

      const href = a.getAttribute('href')
      if (!href) return

      // Let external links, anchors, mail, tel behave normally
      if (
        href.startsWith('http') ||
        href.startsWith('//') ||
        href === '#' ||
        href.startsWith('#') ||
        href.startsWith('mailto:') ||
        href.startsWith('tel:') ||
        a.target === '_blank' ||
        a.hasAttribute('download')
      ) return

      // Already on this page — skip
      if (href === pathname) {
        e.preventDefault()
        return
      }

      e.preventDefault()
      router.push(href)
    }

    document.addEventListener('click', handleClick)
    return () => document.removeEventListener('click', handleClick)
  }, [router, pathname])

  return null
}
