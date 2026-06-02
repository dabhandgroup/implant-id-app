import type { Metadata } from 'next'
import { Suspense }      from 'react'
import MfrDashboardClient from './MfrDashboardClient'
import './page.css'

export const metadata: Metadata = { title: 'Manufacturer dashboard · Implant ID' }
export const dynamic = 'force-dynamic'

export default function Page() {
  return <Suspense><MfrDashboardClient /></Suspense>
}
