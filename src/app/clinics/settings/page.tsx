import type { Metadata } from 'next'
import './page.css'
import ClinicSettingsClient from './ClinicSettingsClient'

export const metadata: Metadata = { title: 'Settings · Implant ID' }
export const dynamic = 'force-dynamic'

export default function Page() {
  return <ClinicSettingsClient />
}
