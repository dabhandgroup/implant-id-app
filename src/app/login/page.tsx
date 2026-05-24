import './page.css'
import { html } from './content'
import ScriptLoader from '@/components/ScriptLoader'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: "Log in \u00b7 Implant ID",
}

export default function Page() {
  return (
    <>
      <div dangerouslySetInnerHTML={{ __html: html }} />
      <ScriptLoader scripts={["/scripts/login-0.js"]} />
    </>
  )
}
