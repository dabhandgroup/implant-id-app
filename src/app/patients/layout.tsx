import { headers } from 'next/headers'
import { requireRole } from '@/lib/requireRole'

/**
 * All /patients/* pages require patient or admin.
 * Exception: /patients/register is publicly accessible — it handles its own
 * Clerk sign-up flow internally, so we skip the role guard there.
 * Clinic staff hitting any other patient URL are redirected to /clinics/dashboard.
 */
export default async function PatientsLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const headersList = await headers()
  const pathname    = headersList.get('x-pathname') ?? ''

  // Register page is public — Clerk auth happens inline within the page
  if (!pathname.startsWith('/patients/register')) {
    await requireRole('patient', 'admin')
  }

  return <>{children}</>
}
