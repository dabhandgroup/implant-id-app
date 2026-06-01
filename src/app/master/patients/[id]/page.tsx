import { Suspense }          from 'react'
import PatientDetailClient  from './PatientDetailClient'

export const dynamic = 'force-dynamic'

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return (
    <Suspense fallback={<div style={{ padding: 32, color: 'var(--muted)' }}>Loading…</div>}>
      <PatientDetailClient id={id} />
    </Suspense>
  )
}
