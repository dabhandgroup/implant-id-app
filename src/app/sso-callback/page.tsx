import SSOCallbackClient from './SSOCallbackClient'

// Prevent static pre-rendering — Clerk OAuth callback requires runtime context.
// force-dynamic stops build-time pre-render; ClerkProvider is present at request time.
export const dynamic = 'force-dynamic'

// Clerk redirects back here after Google/Microsoft OAuth.
// SSOCallbackClient completes the flow, then redirects to
// redirectUrlComplete set in authenticateWithRedirect().
export default function Page() {
  return <SSOCallbackClient />
}
