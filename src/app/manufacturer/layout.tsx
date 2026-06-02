import type { ReactNode }  from 'react'
import { headers }         from 'next/headers'

// The manufacturer layout applies the shell only to authenticated portal pages.
// Sign-up and onboarding are public — they have their own layouts.
export const dynamic = 'force-dynamic'

export default async function ManufacturerLayout({ children }: { children: ReactNode }) {
  const hdrs = await headers()
  const pathname = hdrs.get('x-pathname') ?? hdrs.get('x-invoke-path') ?? ''

  // Public routes — no shell, no auth check
  const isPublic = pathname.includes('/sign-up') || pathname.includes('/onboarding') || pathname.includes('/login')
  if (isPublic) return <>{children}</>

  // Authenticated portal pages — apply shell + role guard
  const { requireRole } = await import('@/lib/requireRole')
  await requireRole('manufacturer', 'admin')

  const { default: ManufacturerShell } = await import('./ManufacturerShell')
  return <ManufacturerShell>{children}</ManufacturerShell>
}
