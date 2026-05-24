import './page.css'
import { html } from './content'
import ScriptLoader from '@/components/ScriptLoader'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: "Find a clinic \u00b7 Implant ID",
}

export default function Page() {
  return (
    <>
      <div dangerouslySetInnerHTML={{ __html: html }} />
      <ScriptLoader scripts={["/scripts/patients-find-care-0.js", "/scripts/patients-find-care-1.js"]} />
    </>
  )
}
