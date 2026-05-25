import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'

const isPublicRoute = createRouteMatcher([
  '/login(.*)',
  '/sign-up(.*)',             // patient account creation — unauthenticated users land here
  '/forgot(.*)',
  '/sso-callback(.*)',        // OAuth return leg — must be public
  '/api/webhooks/(.*)',       // Clerk webhook delivery — no browser session
  '/clinics/onboarding(.*)', // clinic application form — no auth required to apply
])

// Hard-fail at startup if Clerk isn't configured — never silently open all routes
if (!process.env.CLERK_SECRET_KEY) {
  throw new Error(
    'CLERK_SECRET_KEY is not set. Add it to .env.local (dev) or Vercel env vars (prod).'
  )
}

export default clerkMiddleware(async (auth, req) => {
  // 1. Require authentication for all non-public routes
  if (!isPublicRoute(req)) {
    await auth.protect()
  }

  // 2. Role-based route enforcement (only when signed in)
  const { sessionClaims } = await auth()
  // Role lives in publicMetadata, surfaced via JWT template:
  // Clerk dashboard → Configure → Sessions → Customize session token
  // Add: { "role": "{{user.public_metadata.role}}" }
  const role = (sessionClaims as { role?: string } | null)?.role
  const path = req.nextUrl.pathname

  if (role) {
    // Clinic routes — only clinic_staff and admin (except the public onboarding form)
    if (path.startsWith('/clinics') && !path.startsWith('/clinics/onboarding')
        && role !== 'clinic_staff' && role !== 'admin') {
      return NextResponse.redirect(new URL('/patients/dashboard', req.url))
    }
    // Patient routes — only patient and admin
    if (path.startsWith('/patients') && role !== 'patient' && role !== 'admin') {
      return NextResponse.redirect(new URL('/clinics/dashboard', req.url))
    }
    // Admin routes — only admin
    if (path.startsWith('/admin') && role !== 'admin') {
      return NextResponse.redirect(new URL('/login', req.url))
    }
  }
})

export const config = {
  matcher: [
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    '/(api|trpc)(.*)',
    '/__clerk/(.*)',
  ],
}
