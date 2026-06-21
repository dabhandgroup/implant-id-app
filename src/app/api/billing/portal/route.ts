import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { stripe } from '@/lib/stripe'
import { fetchQuery } from 'convex/nextjs'
import { api } from '../../../../../convex/_generated/api'

export async function POST(req: NextRequest) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const authHeader = req.headers.get('authorization') ?? ''
  const convexToken = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : authHeader
  const billing = await fetchQuery(api.clinics.getBillingStatus, {}, convexToken ? { token: convexToken } : undefined)
  if (!billing?.stripeCustomerId) {
    return NextResponse.json({ error: 'No Stripe customer found' }, { status: 404 })
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3333'

  const session = await stripe.billingPortal.sessions.create({
    customer: billing.stripeCustomerId,
    return_url: `${appUrl}/clinics/settings?tab=billing`,
  })

  return NextResponse.json({ url: session.url })
}
