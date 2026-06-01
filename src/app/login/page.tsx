import './page.css'
import { Suspense } from 'react'
import LoginClient from './LoginClient'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Log in · Implant ID',
}

// Prevent static pre-rendering — LoginClient uses Clerk hooks at runtime
export const dynamic = 'force-dynamic'

// Suspense is required because LoginClient calls useSearchParams()
export default function Page() {
  return (
    <Suspense>
      <LoginClient />
    </Suspense>
  )
}
