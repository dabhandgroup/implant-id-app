import type { Metadata } from 'next'
import { Suspense } from 'react'
import ManufacturerOnboardingClient from './ManufacturerOnboardingClient'
import './page.css'

export const metadata: Metadata = { title: 'Manufacturer Application · Implant ID' }

export default function Page() {
  return <Suspense><ManufacturerOnboardingClient /></Suspense>
}
