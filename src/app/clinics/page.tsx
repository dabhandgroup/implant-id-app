import { redirect } from 'next/navigation'

// /clinics has no UI of its own — redirect to the dashboard.
// Unauthenticated users will be caught by the clinic layout's auth guard.
export default function ClinicsIndexPage() {
  redirect('/clinics/dashboard')
}
