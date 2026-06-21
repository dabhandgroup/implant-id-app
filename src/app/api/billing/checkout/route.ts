import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { stripe, STRIPE_PRICE_IDS } from '@/lib/stripe'
import { fetchMutation, fetchQuery } from 'convex/nextjs'
import { api } from '../../../../../convex/_generated/api'

export async function POST(req: NextRequest) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { plan, interval, currency } = await req.json() as {
    plan: 'per_user' | 'clinics'
    interval: 'monthly' | 'annual'
    currency: string
  }

  const priceId = STRIPE_PRICE_IDS[plan]?.[currency]?.[interval]
  if (!priceId) {
    return NextResponse.json({ error: 'Invalid plan/currency/interval combination' }, { status: 400 })
  }

  const authHeader = req.headers.get('authorization') ?? ''
  const convexToken = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : authHeader
  const billing = await fetchQuery(api.clinics.getBillingStatus, {}, convexToken ? { token: convexToken } : undefined)
  if (!billing) return NextResponse.json({ error: 'Clinic not found' }, { status: 404 })

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3333'

  // Re-use existing Stripe customer if the clinic already has one
  let customerId = billing.stripeCustomerId ?? undefined

  const session = await stripe.checkout.sessions.create({
    mode: 'subscription',
    payment_method_types: ['card'],
    line_items: [{ price: priceId, quantity: 1 }],
    customer: customerId,
    ...(customerId ? {} : { customer_creation: 'always' }),
    metadata: { clinicId: billing.clinicId, plan },
    subscription_data: { metadata: { clinicId: billing.clinicId, plan } },
    success_url: `${appUrl}/clinics/settings?tab=billing&success=1`,
    cancel_url:  `${appUrl}/clinics/settings?tab=billing`,
  })

  return NextResponse.json({ url: session.url })
}
