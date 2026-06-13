import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'

const isPublicRoute = createRouteMatcher([
  '/login(.*)',
  '/master/login(.*)',             // master portal login — no prior auth required
  '/admin/login(.*)',              // legacy admin login
  '/manufacturer/login(.*)',       // manufacturer login — approval email links here
  '/manufacturer/onboarding(.*)',  // manufacturer application form — no auth required
  '/manufacturer/sign-up(.*)',     // manufacturer sign-up flow
  '/patients/register(.*)',        // full sign-up flow lives here — handles its own auth
  '/sign-up(.*)',                  // kept only to redirect legacy links → /patients/register
  '/forgot(.*)',
  '/sso-callback(.*)',             // OAuth return leg — must be public
  '/api/webhooks/(.*)',            // Clerk webhook delivery — no browser session
  '/clinics/onboarding(.*)',       // clinic application form — no auth required to apply
  '/activate(.*)',                 // clinic account activation — linked from approval email
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
  const role = (sessionClaims as { role?: string } | null)?.role
  const path = req.nextUrl.pathname

  if (role) {
    // Clinic routes — clinic_staff, surgeon, and admin (except the public onboarding form)
    // Surgeons can access clinic routes so they can reach the shared implant library, etc.
    if (path.startsWith('/clinics') && !path.startsWith('/clinics/onboarding')
        && role !== 'clinic_staff' && role !== 'surgeon' && role !== 'admin') {
      return NextResponse.redirect(new URL('/patients/dashboard', req.url))
    }
    // Patient routes — only patient and admin; register is public so skip it
    if (path.startsWith('/patients') && !path.startsWith('/patients/register')
        && role !== 'patient' && role !== 'admin') {
      return NextResponse.redirect(new URL('/clinics/dashboard', req.url))
    }
    // Admin routes — only admin
    if (path.startsWith('/admin') && role !== 'admin') {
      return NextResponse.redirect(new URL('/login', req.url))
    }
    // Master portal — only admin; login page is already in publicRoutes above
    if (path.startsWith('/master') && !path.startsWith('/master/login') && role !== 'admin') {
      return NextResponse.redirect(new URL('/login', req.url))
    }
  }

  // 3. Forward the request pathname as a header so server layouts can read it
  //    (Next.js server components don't have direct access to the URL otherwise)
  const requestHeaders = new Headers(req.headers)
  requestHeaders.set('x-pathname', path)
  return NextResponse.next({
    request: { headers: requestHeaders },
  })
})

export const config = {
  matcher: [
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    '/(api|trpc)(.*)',
    '/__clerk/(.*)',
  ],
}
