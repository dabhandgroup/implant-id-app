import { currentUser } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'

/**
 * Role-aware redirect hub.
 * Used after login / password reset so we don't have to hardcode a destination.
 * Reads Clerk publicMetadata to route each user to their section.
 */
export default async function Dashboard() {
  const user = await currentUser()
  if (!user) redirect('/login')

  const role = user.publicMetadata?.role as string | undefined

  if (role === 'patient')      redirect('/patients/dashboard')
  if (role === 'admin')        redirect('/admin/dashboard')
  if (role === 'surgeon')      redirect('/surgeons/dashboard')
  if (role === 'manufacturer') redirect('/manufacturer/dashboard')
  redirect('/clinics/dashboard')  // clinic_staff or role not yet set
}
