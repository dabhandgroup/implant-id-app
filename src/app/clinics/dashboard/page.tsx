import { redirect } from 'next/navigation'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Implant ID' }
export const dynamic = 'force-dynamic'

export default function Page() {
  redirect('/clinics/scan-patient')
}
