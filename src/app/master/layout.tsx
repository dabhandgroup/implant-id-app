import { headers } from 'next/headers'
import { requireRole } from '@/lib/requireRole'

export default async function MasterLayout({ children }: { children: React.ReactNode }) {
  const pathname = (await headers()).get('x-pathname') ?? ''

  // Login page is public — skip role guard
  if (!pathname.startsWith('/master/login')) {
    await requireRole('admin')
  }

  return <>{children}</>
}
