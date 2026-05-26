'use client'
import { AuthenticateWithRedirectCallback } from '@clerk/nextjs'

// Prevent static pre-rendering — Clerk components require runtime context
export const dynamic = 'force-dynamic'

// Clerk redirects back here after Google/Microsoft OAuth.
// AuthenticateWithRedirectCallback completes the flow, then
// redirects to redirectUrlComplete set in authenticateWithRedirect().
export default function SSOCallback() {
  return <AuthenticateWithRedirectCallback />
}
