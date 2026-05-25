'use client'
import { AuthenticateWithRedirectCallback } from '@clerk/nextjs'

// Clerk redirects back here after Google/Microsoft OAuth.
// AuthenticateWithRedirectCallback completes the flow, then
// redirects to redirectUrlComplete set in authenticateWithRedirect().
export default function SSOCallback() {
  return <AuthenticateWithRedirectCallback />
}
