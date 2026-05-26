import type { Metadata } from 'next'
import './page.css'
import RegisterClient from './RegisterClient'

export const metadata: Metadata = {
  title: 'Create your patient record · Implant ID',
}

// Prevent static pre-rendering — RegisterClient uses Clerk hooks at runtime
export const dynamic = 'force-dynamic'

export default function RegisterPage() {
  return <RegisterClient />
}
