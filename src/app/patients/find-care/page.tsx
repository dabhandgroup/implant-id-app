import './page.css'
import type { Metadata } from 'next'
import FindCareClient from './FindCareClient'

export const metadata: Metadata = { title: 'Find a clinic \u00b7 Implant ID' }
export const dynamic = 'force-dynamic'

export default function Page() {
  return <FindCareClient />
}
