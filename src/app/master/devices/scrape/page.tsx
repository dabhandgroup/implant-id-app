import type { Metadata } from 'next'
import ScrapeClient from './ScrapeClient'

export const metadata: Metadata = { title: 'Scrape device — Implant ID' }
export const dynamic = 'force-dynamic'

export default function Page() {
  return <ScrapeClient />
}
