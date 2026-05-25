import { requireRole } from '@/lib/requireRole'

/**
 * All /clinics/* pages require clinic_staff or admin.
 * Patients hitting any clinic URL are silently redirected to /patients/dashboard.
 */
export default async function ClinicsLayout({
  children,
}: {
  children: React.ReactNode
}) {
  await requireRole('clinic_staff', 'admin')
  return <>{children}</>
}
