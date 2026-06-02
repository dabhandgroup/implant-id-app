import { Suspense } from 'react'
import ManufacturerVerifyClient from './ManufacturerVerifyClient'

export const dynamic = 'force-dynamic'

export default function ManufacturerVerifyPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <ManufacturerVerifyClient />
    </Suspense>
  )
}
