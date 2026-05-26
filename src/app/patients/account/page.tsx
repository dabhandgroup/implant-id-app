import './page.css'
import type { Metadata } from 'next'
import AccountClient from './AccountClient'

export const metadata: Metadata = {
  title: 'Account settings · Implant ID',
}

// Prevent static pre-rendering — AccountClient uses Clerk hooks at runtime
export const dynamic = 'force-dynamic'

export default function Page() {
  return <AccountClient />
}
