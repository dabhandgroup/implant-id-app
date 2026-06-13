import { headers }                  from 'next/headers'
import { requireRole }              from '@/lib/requireRole'
import ClinicNotificationsOverlay   from '@/components/ClinicNotificationsOverlay'

/**
 * All /clinics/* pages require clinic_staff, surgeon, or admin.
 * Exception: /clinics/onboarding is a public application form — no login needed.
 * Surgeons can access clinic routes (e.g. implant library) from their portal.
 * Patients hitting any other clinic URL are silently redirected to /patients/dashboard.
 *
 * The ClinicNotificationsOverlay mounts on every clinic page to wire
 * the notification bell and drawer to real Convex data.
 */
export default async function ClinicsLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = (await headers()).get('x-pathname') ?? ''
  const isPublic = pathname.startsWith('/clinics/onboarding') || pathname.startsWith('/clinics/activate')
  if (!isPublic) {
    await requireRole('clinic_staff', 'surgeon', 'admin')
  }
  return (
    <>
      {children}
      {!isPublic && <ClinicNotificationsOverlay />}
    </>
  )
}
