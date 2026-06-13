import AddClinicClient from './AddClinicClient'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Add Clinic · Implant ID' }

export default function AddClinicPage() {
  return <AddClinicClient />
}
