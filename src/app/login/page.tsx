import './page.css'
import LoginClient from './LoginClient'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Log in · Implant ID',
}

// Prevent static pre-rendering — LoginClient uses Clerk hooks at runtime
export const dynamic = 'force-dynamic'

export default function Page() {
  return <LoginClient />
}
