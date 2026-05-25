import { requireRole } from '@/lib/requireRole'

/**
 * All /admin/* pages require admin role only.
 * Anyone else is redirected to their own dashboard.
 */
export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  await requireRole('admin')
  return <>{children}</>
}
