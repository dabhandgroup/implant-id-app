import type { Metadata } from 'next'
import { Suspense }      from 'react'
import ManufacturerLoginClient from './ManufacturerLoginClient'
import './page.css'

export const metadata: Metadata = {
  title: 'Manufacturer login · Implant ID',
  description: 'Manufacturer access for Implant ID — upload, verify and maintain MRI safety data for your devices.',
}
export const dynamic = 'force-dynamic'

export default function ManufacturerLoginPage() {
  return (
    <Suspense>
      <ManufacturerLoginClient />
    </Suspense>
  )
}
