import { html } from './content'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: "Reset password \u00b7 Implant ID",
}

export default function Page() {
  return (
    <>
      <div dangerouslySetInnerHTML={{ __html: html }} />
    </>
  )
}
