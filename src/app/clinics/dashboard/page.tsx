import ClinicDashboardClient from './ClinicDashboardClient'
import type { Metadata } from 'next'
import './page.css'

export const metadata: Metadata = { title: 'Dashboard · Implant ID' }
export const dynamic = 'force-dynamic'

export default function Page() {
  return <ClinicDashboardClient />
}
