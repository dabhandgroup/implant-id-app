import './page.css'
import AddPatientClient from './AddPatientClient'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Add patient · Implant ID',
}

export default function Page() {
  return <AddPatientClient />
}
