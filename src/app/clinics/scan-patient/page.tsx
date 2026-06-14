import './page.css'
import { Suspense }        from 'react'
import ScanPatientClient   from './ScanPatientClient'
import type { Metadata }   from 'next'

export const metadata: Metadata = { title: 'Scan patient card · Implant ID' }
export const dynamic = 'force-dynamic'

export default function Page() {
  return (
    <Suspense fallback={null}>
      <ScanPatientClient />
    </Suspense>
  )
}
