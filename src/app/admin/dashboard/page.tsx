import './page.css'
import { html } from './content'
import ScriptLoader from '@/components/ScriptLoader'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: "Manufacturer dashboard \u00b7 Implant ID",
}

export default function Page() {
  return (
    <>
      <div dangerouslySetInnerHTML={{ __html: html }} />
      <ScriptLoader scripts={["/implants.js", "/scripts/admin-dashboard-0.js", "/scripts/admin-dashboard-1.js", "/scripts/admin-dashboard-2.js"]} />
    </>
  )
}
