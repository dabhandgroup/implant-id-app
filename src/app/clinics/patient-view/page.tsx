import './page.css'
import { html } from './content'
import ScriptLoader from '@/components/ScriptLoader'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: "Trevor Hughes \u00b7 Implant ID",
}

export default function Page() {
  return (
    <>
      <div dangerouslySetInnerHTML={{ __html: html }} />
      <ScriptLoader scripts={["/scripts/clinics-patient-view-0.js", "/scripts/clinics-patient-view-1.js", "/scripts/clinics-patient-view-2.js"]} />
    </>
  )
}
