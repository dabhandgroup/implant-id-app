import './page.css'
import FindCareClient from './FindCareClient'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Find a clinic · Implant ID' }
export const dynamic = 'force-dynamic'

export default function Page() {
  return <FindCareClient />
}
