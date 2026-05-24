import './page.css'
import { html } from './content'
import MarketingLayout from '@/components/MarketingLayout'
import ScriptLoader from '@/components/ScriptLoader'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: "Wallet pass \u00b7 Implant ID",
}

export default function Page() {
  return (
    <MarketingLayout>
      <div dangerouslySetInnerHTML={{ __html: html }} />
      <ScriptLoader scripts={["/scripts/patients-wallet-0.js"]} />
    </MarketingLayout>
  )
}
