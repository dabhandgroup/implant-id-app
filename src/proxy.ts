import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server'

const isPublicRoute = createRouteMatcher([
  '/login(.*)',
  '/forgot(.*)',
  '/sso-callback(.*)',   // OAuth return leg — must be public
  // /sign-in and /sign-up redirect to /login — no Clerk UI served there
])

// Hard-fail at startup if Clerk isn't configured — never silently open all routes
if (!process.env.CLERK_SECRET_KEY) {
  throw new Error(
    'CLERK_SECRET_KEY is not set. Add it to .env.local (dev) or Vercel env vars (prod).'
  )
}

export default clerkMiddleware(async (auth, req) => {
  if (!isPublicRoute(req)) {
    await auth.protect()
  }
})

export const config = {
  matcher: [
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    '/(api|trpc)(.*)',
    '/__clerk/(.*)',
  ],
}
