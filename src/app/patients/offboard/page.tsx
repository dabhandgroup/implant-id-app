import type { Metadata } from 'next'
import OffboardClient from './OffboardClient'

export const metadata: Metadata = {
  title: 'Delete account · Implant ID',
}

export const dynamic = 'force-dynamic'

export default function Page() {
  return <OffboardClient />
}
