import './page.css'
import { html } from './content'
import ScriptLoader from '@/components/ScriptLoader'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: "Look up an implant \u00b7 Implant ID",
}

export default function Page() {
  return (
    <>
      <div dangerouslySetInnerHTML={{ __html: html }} />
      <ScriptLoader scripts={["/scripts/clinics-patient-add-0.js", "/scripts/clinics-patient-add-1.js", "/scripts/clinics-patient-add-2.js"]} />
    </>
  )
}
