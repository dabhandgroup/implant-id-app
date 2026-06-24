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
  // Signal to the debug overlay in layout.tsx that React has mounted successfully
  useEffect(() => { document.documentElement.dataset.r = '1' }, [])

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
