import { SignUp } from '@clerk/nextjs'
import { redirect } from 'next/navigation'

/**
 * /sign-up handles two cases:
 *  1. Clinic invitation link — Clerk puts __clerk_ticket in the URL.
 *     Let Clerk's <SignUp /> process the ticket automatically; on completion
 *     it redirects to /clinics/dashboard (via the redirect_url in the invitation).
 *  2. Everything else — redirect to /patients/register (the patient sign-up flow).
 */
export default async function SignUpPage({
  searchParams,
}: {
  searchParams: Promise<{ __clerk_ticket?: string }>
}) {
  const params = await searchParams

  if (params.__clerk_ticket) {
    return (
      <main style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'var(--bg)',
        fontFamily: 'var(--ff)',
      }}>
        <SignUp forceRedirectUrl="/clinics/dashboard" />
      </main>
    )
  }

  redirect('/patients/register')
}
