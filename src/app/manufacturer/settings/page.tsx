import type { Metadata } from 'next'
import { Suspense }      from 'react'
import MfrSettingsClient from './MfrSettingsClient'

export const metadata: Metadata = { title: 'Settings · Manufacturer Portal · Implant ID' }
export const dynamic = 'force-dynamic'

export default function Page() {
  return <Suspense><MfrSettingsClient /></Suspense>
}
