import { Suspense } from 'react'
import SearchClient from './SearchClient'

export const metadata = { title: 'Search · Master Admin · Implant ID' }
export const dynamic = 'force-dynamic'

export default function MasterSearchPage() {
  return (
    <Suspense>
      <SearchClient />
    </Suspense>
  )
}
