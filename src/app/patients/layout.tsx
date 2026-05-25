import { requireRole } from '@/lib/requireRole'

/**
 * All /patients/* pages require patient or admin.
 * Clinic staff hitting any patient URL are redirected to /clinics/dashboard.
 */
export default async function PatientsLayout({
  children,
}: {
  children: React.ReactNode
}) {
  await requireRole('patient', 'admin')
  return <>{children}</>
}
