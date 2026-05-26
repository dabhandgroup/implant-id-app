import './page.css'
import type { Metadata } from 'next'
import DashboardClient from './DashboardClient'

export const metadata: Metadata = {
  title: 'My implant record \u00b7 Implant ID',
}

// Prevent static pre-rendering \u2014 DashboardClient uses Clerk hooks at runtime
export const dynamic = 'force-dynamic'

export default function Page() {
  return <DashboardClient />
}
