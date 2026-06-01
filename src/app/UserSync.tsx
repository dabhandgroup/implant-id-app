'use client'
import { useEffect } from 'react'
import { useUser } from '@clerk/nextjs'
import { useMutation } from 'convex/react'
import { api } from '../../convex/_generated/api'

/**
 * Runs inside ClerkProvider + ConvexProviderWithClerk.
 * After every sign-in, syncs the user's profile into Convex so getMe() works.
 * Passes the role from Clerk publicMetadata so new users get the right role
 * on first insert. Existing users' roles are never overwritten (enforced in
 * the upsertUser mutation).
 * Renders nothing — purely a side-effect component.
 */
export default function UserSync() {
  const { user, isLoaded } = useUser()
  const upsertUser = useMutation(api.users.upsertUser)

  useEffect(() => {
    if (!isLoaded || !user) return

    // Read role from Clerk publicMetadata — includes all platform roles
    const clerkRole = user.publicMetadata?.role as
      | 'patient' | 'clinic_staff' | 'surgeon' | 'admin'
      | undefined

    upsertUser({
      email: user.primaryEmailAddress?.emailAddress ?? '',
      name:  user.fullName ?? user.username ?? user.id,
      role:  clerkRole, // upsertUser promotes existing 'patient' rows if role is higher
    }).catch(console.error)
  }, [isLoaded, user?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  return null
}
