export const metadata = { title: 'Patients · Master Admin · Implant ID' }
export const dynamic = 'force-dynamic'

import PatientsClient from './PatientsClient'

export default function MasterPatientsPage() {
  return <PatientsClient />
}
