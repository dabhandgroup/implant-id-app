import { headers } from 'next/headers'
import { requireRole } from '@/lib/requireRole'
import MasterShell from './MasterShell'
import './master.css'

export default async function MasterLayout({ children }: { children: React.ReactNode }) {
  const pathname = (await headers()).get('x-pathname') ?? ''

  if (!pathname.startsWith('/master/login')) {
    await requireRole('admin')
  }

  if (pathname.startsWith('/master/login')) {
    return <>{children}</>
  }

  return <MasterShell pathname={pathname}>{children}</MasterShell>
}
