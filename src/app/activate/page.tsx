import { Suspense } from 'react'
import ActivateClient from './ActivateClient'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Activate your account · Implant ID' }
export const dynamic = 'force-dynamic'

export default function ActivatePage() {
  return (
    <Suspense>
      <ActivateClient />
    </Suspense>
  )
}
