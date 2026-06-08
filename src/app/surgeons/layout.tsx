import { requireRole } from '@/lib/requireRole'
import SurgeonShell    from '@/components/SurgeonShell'

export default async function SurgeonsLayout({
  children,
}: {
  children: React.ReactNode
}) {
  await requireRole('surgeon', 'admin')
  return <SurgeonShell>{children}</SurgeonShell>
}
