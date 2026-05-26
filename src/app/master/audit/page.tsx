export const metadata = { title: 'Audit Log · Master Admin · Implant ID' }
export const dynamic = 'force-dynamic'

import AuditClient from './AuditClient'

export default function MasterAuditPage() {
  return <AuditClient />
}
