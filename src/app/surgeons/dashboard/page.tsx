import type { Metadata } from 'next'
import SurgeonDashboardClient from './SurgeonDashboardClient'

export const metadata: Metadata = {
  title: 'Surgeon Dashboard · Implant ID',
}

export const dynamic = 'force-dynamic'

export default function Page() {
  return <SurgeonDashboardClient />
}
