import { redirect } from 'next/navigation'

// /clinics/add-patient → canonical route is /clinics/patient/add
export default function Page() {
  redirect('/clinics/patient/add')
}
