import ScanPatientClient from './ScanPatientClient'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Look up patient · Implant ID' }
export const dynamic = 'force-dynamic'

export default function Page() {
  return <ScanPatientClient />
}
