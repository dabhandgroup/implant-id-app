import { headers }    from 'next/headers'
import { requireRole } from '@/lib/requireRole'
import ClinicShell     from './ClinicShell'
import '../master/master.css'
import './clinic.css'

/**
 * All /clinics/* pages require clinic_staff, surgeon, or admin.
 * Exception: /clinics/onboarding and /clinics/activate are public.
 */
export default async function ClinicsLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = (await headers()).get('x-pathname') ?? ''
  const isPublic = (
    pathname.startsWith('/clinics/onboarding') ||
    pathname.startsWith('/clinics/activate')
  )

  if (!isPublic) {
    await requireRole('clinic_staff', 'surgeon', 'admin')
  }

  if (isPublic) {
    return <>{children}</>
  }

  return <ClinicShell>{children}</ClinicShell>
}
