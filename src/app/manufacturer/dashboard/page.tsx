import type { Metadata } from 'next'
import { Suspense }      from 'react'
import MfrDashboardClient from './MfrDashboardClient'

export const metadata: Metadata = { title: 'Dashboard · Manufacturer Portal · Implant ID' }
export const dynamic = 'force-dynamic'

export default function Page() {
  return <Suspense><MfrDashboardClient /></Suspense>
}
