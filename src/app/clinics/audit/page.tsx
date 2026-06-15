import './page.css'
import AuditClient from './AuditClient'
import type { Metadata } from 'next'
export const metadata: Metadata = { title: "Audit log · Implant ID" }
export default function Page() {
  return <AuditClient />
}
