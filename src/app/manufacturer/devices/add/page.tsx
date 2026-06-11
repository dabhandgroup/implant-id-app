import type { Metadata } from 'next'
import { Suspense }      from 'react'
import AddMfrDeviceClient from './AddMfrDeviceClient'

export const metadata: Metadata = { title: 'Submit Device · Manufacturer Portal · Implant ID' }
export const dynamic = 'force-dynamic'

export default function Page() {
  return <Suspense><AddMfrDeviceClient /></Suspense>
}
