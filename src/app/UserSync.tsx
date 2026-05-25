'use client'
import { useEffect } from 'react'
import { useUser } from '@clerk/nextjs'
import { useMutation } from 'convex/react'
import { api } from '../../convex/_generated/api'

/**
 * Runs inside ClerkProvider + ConvexProviderWithClerk.
 * After every sign-in, syncs the user's profile into Convex so getMe() works.
 * Renders nothing — purely a side-effect component.
 */
export default function UserSync() {
  const { user, isLoaded } = useUser()
  const upsertUser = useMutation(api.users.upsertUser)

  useEffect(() => {
    if (!isLoaded || !user) return
    upsertUser({
      email: user.primaryEmailAddress?.emailAddress ?? '',
      name: user.fullName ?? user.username ?? user.id,
    }).catch(console.error)
  }, [isLoaded, user?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  return null
}
