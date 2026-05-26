import '../login/page.css'
import ForgotClient from './ForgotClient'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Reset password · Implant ID',
}

// Prevent static pre-rendering — ForgotClient uses Clerk hooks at runtime
export const dynamic = 'force-dynamic'

export default function Page() {
  return <ForgotClient />
}
