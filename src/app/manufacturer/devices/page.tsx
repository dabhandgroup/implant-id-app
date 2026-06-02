import type { Metadata } from 'next'
import { Suspense }      from 'react'
import MfrDevicesClient  from './MfrDevicesClient'

export const metadata: Metadata = { title: 'My Devices · Manufacturer Portal · Implant ID' }
export const dynamic = 'force-dynamic'

export default function Page() {
  return <Suspense><MfrDevicesClient /></Suspense>
}
