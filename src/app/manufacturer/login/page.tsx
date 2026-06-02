/**
 * /manufacturer/login
 * Renders the same login UI as /login but with the "Clinic" tab pre-selected
 * and the email pre-filled from the ?email= query param (set in approval emails).
 * After a successful sign-in the login page redirects to /manufacturer/dashboard.
 */
import { Suspense } from 'react'
import LoginClient  from '../../login/LoginClient'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Manufacturer Sign In · Implant ID' }

export default function ManufacturerLoginPage() {
  // LoginClient reads ?email from the URL and auto-triggers OTP if present.
  // The Clinic tab is used for manufacturer accounts (same email-OTP flow).
  return (
    <Suspense>
      <LoginClient />
    </Suspense>
  )
}
