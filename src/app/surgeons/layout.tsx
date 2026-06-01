import { requireRole } from '@/lib/requireRole'

export default async function SurgeonsLayout({
  children,
}: {
  children: React.ReactNode
}) {
  await requireRole('surgeon', 'admin')
  return <>{children}</>
}
