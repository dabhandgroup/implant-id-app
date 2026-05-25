import './page.css'
import type { Metadata } from 'next'
import ClinicOnboardingClient from './ClinicOnboardingClient'

export const metadata: Metadata = {
  title: 'Register your clinic · Implant ID',
  description: 'Apply to join the Implant ID network. We verify every clinic before granting access to protect patient data.',
}

export default function Page() {
  return <ClinicOnboardingClient />
}
