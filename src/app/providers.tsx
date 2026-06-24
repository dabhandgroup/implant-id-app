'use client'
import { useEffect } from 'react'
import { ClerkProvider, useAuth } from '@clerk/nextjs'
import { ConvexProviderWithClerk } from 'convex/react-clerk'
import { ConvexReactClient } from 'convex/react'
import UserSync from './UserSync'
import LogoutHandler from '@/components/LogoutHandler'

const clerkKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY
const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL

const convex = convexUrl ? new ConvexReactClient(convexUrl) : null

export default function Providers({ children }: { children: React.ReactNode }) {
  // iOS 15 fix: React's onClick delegation doesn't receive touch-synthesised clicks
  // reliably. Intercept tap at touchend, suppress the browser's synthetic click,
  // and dispatch a programmatic click() that React's root listener always catches.
  useEffect(() => {
    let startX = 0, startY = 0, hasMoved = false, touchTarget: Element | null = null

    function onStart(e: TouchEvent) {
      const t = e.touches[0]
      startX = t.clientX; startY = t.clientY; hasMoved = false
      touchTarget = e.target as Element
    }
    function onMove(e: TouchEvent) {
      if (!hasMoved) {
        const dx = Math.abs(e.touches[0].clientX - startX)
        const dy = Math.abs(e.touches[0].clientY - startY)
        if (dx > 8 || dy > 8) hasMoved = true
      }
    }
    function onEnd(e: TouchEvent) {
      if (hasMoved || !touchTarget) return
      const btn = (touchTarget as HTMLElement).closest('button') as HTMLButtonElement | null
      if (btn && !btn.disabled) {
        e.preventDefault()   // suppress iOS synthetic click
        btn.click()          // programmatic click reaches React's delegation
      }
      touchTarget = null
    }

    document.addEventListener('touchstart', onStart, { passive: true })
    document.addEventListener('touchmove', onMove, { passive: true })
    document.addEventListener('touchend', onEnd, { passive: false })
    return () => {
      document.removeEventListener('touchstart', onStart)
      document.removeEventListener('touchmove', onMove)
      document.removeEventListener('touchend', onEnd)
    }
  }, [])

  if (!clerkKey || !convex) return <>{children}</>

  return (
    <ClerkProvider publishableKey={clerkKey}>
      <ConvexProviderWithClerk client={convex} useAuth={useAuth}>
        <UserSync />
        <LogoutHandler />
        {children}
      </ConvexProviderWithClerk>
    </ClerkProvider>
  )
}
