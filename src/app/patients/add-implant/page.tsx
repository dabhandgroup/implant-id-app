import type { Metadata } from 'next'
import AddImplantClient from './AddImplantClient'

export const metadata: Metadata = {
  title: 'Add another implant · Implant ID',
}

export const dynamic = 'force-dynamic'

export default function Page() {
  return <AddImplantClient />
}
