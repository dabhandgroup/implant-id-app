import nextDynamic from 'next/dynamic'

// Prevent static pre-rendering — Clerk OAuth callback requires runtime context
export const dynamic = 'force-dynamic'

// Skip SSR entirely — AuthenticateWithRedirectCallback must run in the browser
const SSOCallbackClient = nextDynamic(() => import('./SSOCallbackClient'), { ssr: false })

// Clerk redirects back here after Google/Microsoft OAuth.
// SSOCallbackClient completes the flow, then redirects to
// redirectUrlComplete set in authenticateWithRedirect().
export default function Page() {
  return <SSOCallbackClient />
}
