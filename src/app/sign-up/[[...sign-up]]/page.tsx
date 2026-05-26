import { redirect } from 'next/navigation'

/**
 * Legacy /sign-up route — permanently redirect to the patient registration flow.
 * All new sign-ups happen at /patients/register which handles the full Clerk flow inline.
 */
export default function SignUpPage() {
  redirect('/patients/register')
}
