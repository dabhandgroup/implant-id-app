export const dynamic = 'force-dynamic'

import EditDeviceClient from './EditDeviceClient'

export default async function MasterDeviceEditPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return <EditDeviceClient id={id} />
}
