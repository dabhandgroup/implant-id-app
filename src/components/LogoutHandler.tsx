'use client'
import { useClerk } from '@clerk/nextjs'
import { useEffect } from 'react'

/**
 * Intercepts every "Yes, log out" button in the app's static HTML pages
 * and wires them to Clerk's real signOut() instead of just navigating to /login.
 *
 * Uses event delegation on the document so it catches buttons rendered by
 * dangerouslySetInnerHTML (which exist outside React's event system).
 *
 * Also exposes window.clerkSignOut() for any vanilla JS that needs it.
 */
export default function LogoutHandler() {
  const { signOut } = useClerk()

  useEffect(() => {
    // Expose for vanilla JS calls (e.g. onclick="clerkSignOut()")
    ;(window as { clerkSignOut?: () => void }).clerkSignOut = () =>
      signOut({ redirectUrl: '/login' })

    // Intercept clicks on .logout-actions .btn-danger (the "Yes, log out" buttons)
    function handleClick(e: MouseEvent) {
      const target = e.target as HTMLElement
      if (target.closest('.logout-actions .btn-danger')) {
        e.preventDefault()
        signOut({ redirectUrl: '/login' })
      }
    }

    document.addEventListener('click', handleClick)
    return () => {
      document.removeEventListener('click', handleClick)
      delete (window as { clerkSignOut?: () => void }).clerkSignOut
    }
  }, [signOut])

  return null
}
