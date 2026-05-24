import './page.css'
import { html } from './content'
import ScriptLoader from '@/components/ScriptLoader'
import type { Metadata } from 'next'
export const metadata: Metadata = { title: "Settings · Implant ID" }
export default function Page() {
  return (
    <>
      <div dangerouslySetInnerHTML={{ __html: html }} />
      <ScriptLoader scripts={["/scripts/clinics-dashboard-0.js", "/scripts/clinics-dashboard-1.js", "/scripts/clinics-dashboard-2.js", "/scripts/clinics-pages-0.js"]} />
    </>
  )
}
