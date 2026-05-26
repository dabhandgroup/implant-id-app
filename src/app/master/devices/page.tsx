export const metadata = { title: 'Devices · Master Admin · Implant ID' }
export const dynamic = 'force-dynamic'

import DevicesClient from './DevicesClient'

export default function MasterDevicesPage() {
  return <DevicesClient />
}
