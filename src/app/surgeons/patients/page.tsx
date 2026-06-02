import SurgeonPatientsClient from './SurgeonPatientsClient'
import type { Metadata }      from 'next'

export const metadata: Metadata = { title: 'My Patients · Surgeon Portal · Implant ID' }
export const dynamic = 'force-dynamic'

export default function Page() {
  return <SurgeonPatientsClient />
}
