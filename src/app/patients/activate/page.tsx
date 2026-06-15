import { Suspense } from 'react'
import PatientActivateClient from './PatientActivateClient'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Activate your account · Implant ID' }
export const dynamic = 'force-dynamic'

export default function PatientActivatePage() {
  return (
    <Suspense>
      <PatientActivateClient />
    </Suspense>
  )
}
