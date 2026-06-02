import { Suspense }       from 'react'
import SurgeonScanClient  from './SurgeonScanClient'
import type { Metadata }  from 'next'

export const metadata: Metadata = { title: 'Look Up Patient · Surgeon Portal · Implant ID' }
export const dynamic = 'force-dynamic'

export default function Page() {
  return (
    <Suspense fallback={null}>
      <SurgeonScanClient />
    </Suspense>
  )
}
