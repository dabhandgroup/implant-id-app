import './page.css'
import type { Metadata } from 'next'
import ShareClient from './ShareClient'

export const metadata: Metadata = {
  title: 'Share with clinic · Implant ID',
}

// Prevent static pre-rendering — ShareClient uses Clerk hooks at runtime
export const dynamic = 'force-dynamic'

export default function Page() {
  return <ShareClient />
}
