import './page.css'
import MasterLoginClient from './MasterLoginClient'

export const metadata = { title: 'Master Portal — Implant ID' }

// Prevent static pre-rendering — MasterLoginClient uses Clerk hooks at runtime
export const dynamic = 'force-dynamic'

export default function MasterLoginPage() {
  return <MasterLoginClient />
}
