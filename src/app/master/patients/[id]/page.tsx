export const dynamic = 'force-dynamic'

import PatientDetailClient from './PatientDetailClient'

export default function MasterPatientDetailPage({ params }: { params: { id: string } }) {
  return <PatientDetailClient id={params.id} />
}
