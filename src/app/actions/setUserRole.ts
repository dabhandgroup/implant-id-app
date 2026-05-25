'use server'
import { auth, clerkClient } from '@clerk/nextjs/server'

/**
 * Stamps a role onto the authenticated user's Clerk publicMetadata.
 * Only runs if they don't already have one — so a patient can't accidentally
 * pick up clinic_staff by using the wrong login tab on a repeat visit.
 *
 * The role flows into the JWT (once the Clerk JWT template includes it),
 * which lets the middleware enforce route separation without a DB call.
 */
export async function setUserRoleIfNew(
  role: 'patient' | 'clinic_staff',
): Promise<void> {
  const { userId } = await auth()
  if (!userId) throw new Error('Not authenticated')

  const clerk = await clerkClient()
  const user  = await clerk.users.getUser(userId)

  // Already has a role — never downgrade or change
  if (user.publicMetadata?.role) return

  await clerk.users.updateUserMetadata(userId, {
    publicMetadata: { role },
  })
}
