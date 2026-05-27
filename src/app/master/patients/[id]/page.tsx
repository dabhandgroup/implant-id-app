export const dynamic = 'force-dynamic'

import PatientDetailClient from './PatientDetailClient'

export default async function MasterPatientDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return <PatientDetailClient id={id} />
}
