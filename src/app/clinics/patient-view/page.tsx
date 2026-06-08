import { Suspense } from 'react'
import PatientViewClient from './PatientViewClient'
import type { Metadata } from 'next'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Patient record · Implant ID',
}

export default function Page() {
  return (
    <Suspense fallback={<div style={{ minHeight: '60vh' }} />}>
      <PatientViewClient />
    </Suspense>
  )
}
