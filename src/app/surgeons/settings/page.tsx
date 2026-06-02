import SurgeonSettingsClient from './SurgeonSettingsClient'
import type { Metadata }      from 'next'

export const metadata: Metadata = { title: 'Settings · Surgeon Portal · Implant ID' }
export const dynamic = 'force-dynamic'

export default function Page() {
  return <SurgeonSettingsClient />
}
