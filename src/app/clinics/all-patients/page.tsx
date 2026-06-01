import AllPatientsClient from './AllPatientsClient'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Patients · Implant ID' }
export const dynamic = 'force-dynamic'

export default function Page() {
  return <AllPatientsClient />
}
