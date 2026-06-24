import './page.css'
import NewPatientClient from './NewPatientClient'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Add Patient · Master Admin · Implant ID',
}

export default function Page() {
  return <NewPatientClient />
}
