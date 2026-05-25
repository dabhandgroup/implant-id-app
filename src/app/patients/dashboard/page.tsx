import './page.css'
import type { Metadata } from 'next'
import DashboardClient from './DashboardClient'

export const metadata: Metadata = {
  title: 'My implant record \u00b7 Implant ID',
}

export default function Page() {
  return <DashboardClient />
}
