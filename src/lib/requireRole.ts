import { currentUser } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'

type UserRole = 'patient' | 'clinic_staff' | 'clinic_pending' | 'surgeon' | 'admin' | 'manufacturer'

/**
 * Server-side role guard. Call at the top of any layout or page.
 *
 * - Redirects to /login if no session.
 * - Redirects to the user's own dashboard if they try to access a section
 *   they don't belong to — no dead-end error pages.
 *
 * Uses Clerk's currentUser() so it always reflects the latest publicMetadata
 * without needing a JWT template or Convex query.
 */
export async function requireRole(...allowed: UserRole[]) {
  const user = await currentUser()
  if (!user) redirect('/login')

  const role = (user.publicMetadata?.role ?? 'patient') as UserRole

  if (!allowed.includes(role)) {
    // Redirect to the section they actually belong to
    if (role === 'admin')          redirect('/master/dashboard')
    if (role === 'manufacturer')   redirect('/manufacturer/dashboard')
    if (role === 'clinic_staff')   redirect('/clinics/dashboard')
    if (role === 'clinic_pending') redirect('/clinics/pending')
    if (role === 'surgeon')        redirect('/surgeons/dashboard')
    redirect('/patients/dashboard')   // patient (or unknown — safest default)
  }

  return { user, role }
}
