import { requireRole } from '@/lib/requireRole'
import SurgeonShell    from '@/components/SurgeonShell'
import '@/app/master/master.css'

export default async function SurgeonsLayout({
  children,
}: {
  children: React.ReactNode
}) {
  await requireRole('surgeon', 'admin')
  return <SurgeonShell>{children}</SurgeonShell>
}
