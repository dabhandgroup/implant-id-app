export const dynamic = 'force-dynamic'

import EditDeviceClient from './EditDeviceClient'

export default function MasterDeviceEditPage({ params }: { params: { id: string } }) {
  return <EditDeviceClient id={params.id} />
}
