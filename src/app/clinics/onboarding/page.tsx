import './page.css'
import { html } from './content'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: "Register your clinic · Implant ID",
  description: "Apply to join the Implant ID network. We verify every clinic before granting access to protect patient data.",
}

export default function Page() {
  return (
    <>
      <div dangerouslySetInnerHTML={{ __html: html }} />
    </>
  )
}
