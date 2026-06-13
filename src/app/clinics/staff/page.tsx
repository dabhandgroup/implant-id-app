import type { Metadata } from 'next'
import './page.css'
import StaffClient from './StaffClient'

export const metadata: Metadata = { title: 'Staff · Implant ID' }
export const dynamic = 'force-dynamic'

export default function Page() {
  return <StaffClient />
}
