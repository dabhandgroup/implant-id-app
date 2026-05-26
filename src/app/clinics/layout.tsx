import { headers }      from 'next/headers'
import { requireRole } from '@/lib/requireRole'

/**
 * All /clinics/* pages require clinic_staff or admin.
 * Exception: /clinics/onboarding is a public application form — no login needed.
 * Patients hitting any other clinic URL are silently redirected to /patients/dashboard.
 */
export default async function ClinicsLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = (await headers()).get('x-pathname') ?? ''
  if (!pathname.startsWith('/clinics/onboarding')) {
    await requireRole('clinic_staff', 'admin')
  }
  return <>{children}</>
}
