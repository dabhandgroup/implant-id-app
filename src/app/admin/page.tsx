import './page.css'
import { html } from './content'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: "Admin \u00b7 Implant ID",
}

export default function Page() {
  return (
    <>
      <div dangerouslySetInnerHTML={{ __html: html }} />
    </>
  )
}
