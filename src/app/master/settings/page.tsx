import MasterSettingsClient from './MasterSettingsClient'

export const metadata = { title: 'Settings · Master Admin · Implant ID' }

// Prevent static pre-rendering — MasterSettingsClient uses Clerk hooks at runtime
export const dynamic = 'force-dynamic'

export default function MasterSettingsPage() {
  return <MasterSettingsClient />
}
