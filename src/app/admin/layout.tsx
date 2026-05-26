import { headers } from 'next/headers'
import { requireRole } from '@/lib/requireRole'

/**
 * All /admin/* pages require admin role.
 * /admin/login is public — the role guard is skipped for it.
 */
export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = (await headers()).get('x-pathname') ?? ''
  if (!pathname.startsWith('/admin/login')) {
    await requireRole('admin')
  }
  return <>{children}</>
}
