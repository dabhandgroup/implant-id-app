import type { Metadata } from 'next'
import { Suspense }      from 'react'
import EmergencyClient   from './EmergencyClient'

export const metadata: Metadata = { title: 'Emergency Info · Implant ID' }
export const dynamic = 'force-dynamic'

export default function Page() {
  return (
    <Suspense>
      <EmergencyClient />
    </Suspense>
  )
}
