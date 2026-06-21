import { NextRequest, NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe'
import { fetchMutation, fetchQuery } from 'convex/nextjs'
// eslint-disable-next-line @typescript-eslint/no-explicit-any
import { api } from '../../../../../convex/_generated/api'
import type Stripe from 'stripe'
import { Id } from '../../../../../convex/_generated/dataModel'
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const anyApi = api as any

const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET!

// Map Stripe price ID back to our plan name
function planFromPriceId(priceId: string): 'per_user' | 'clinics' | null {
  const env = process.env
  const perUserPrices = [
    env.STRIPE_PRICE_PER_USER_AUD_MONTHLY, env.STRIPE_PRICE_PER_USER_AUD_ANNUAL,
    env.STRIPE_PRICE_PER_USER_GBP_MONTHLY, env.STRIPE_PRICE_PER_USER_GBP_ANNUAL,
    env.STRIPE_PRICE_PER_USER_USD_MONTHLY, env.STRIPE_PRICE_PER_USER_USD_ANNUAL,
    env.STRIPE_PRICE_PER_USER_EUR_MONTHLY, env.STRIPE_PRICE_PER_USER_EUR_ANNUAL,
    env.STRIPE_PRICE_PER_USER_CAD_MONTHLY, env.STRIPE_PRICE_PER_USER_CAD_ANNUAL,
    env.STRIPE_PRICE_PER_USER_NZD_MONTHLY, env.STRIPE_PRICE_PER_USER_NZD_ANNUAL,
  ]
  const clinicsPrices = [
    env.STRIPE_PRICE_CLINICS_AUD_MONTHLY, env.STRIPE_PRICE_CLINICS_AUD_ANNUAL,
    env.STRIPE_PRICE_CLINICS_GBP_MONTHLY, env.STRIPE_PRICE_CLINICS_GBP_ANNUAL,
    env.STRIPE_PRICE_CLINICS_USD_MONTHLY, env.STRIPE_PRICE_CLINICS_USD_ANNUAL,
    env.STRIPE_PRICE_CLINICS_EUR_MONTHLY, env.STRIPE_PRICE_CLINICS_EUR_ANNUAL,
    env.STRIPE_PRICE_CLINICS_CAD_MONTHLY, env.STRIPE_PRICE_CLINICS_CAD_ANNUAL,
    env.STRIPE_PRICE_CLINICS_NZD_MONTHLY, env.STRIPE_PRICE_CLINICS_NZD_ANNUAL,
  ]
  if (perUserPrices.includes(priceId)) return 'per_user'
  if (clinicsPrices.includes(priceId)) return 'clinics'
  return null
}

const SERVICE_KEY = process.env.STRIPE_CONVEX_SERVICE_KEY ?? ''

async function getClinicId(customerId: string): Promise<Id<'clinics'> | null> {
  const clinic = await fetchQuery(api.clinics.getClinicByStripeCustomer, {
    serviceKey: SERVICE_KEY,
    stripeCustomerId: customerId,
  }) as any
  return clinic?._id ?? null
}

async function patchBilling(clinicId: Id<'clinics'>, patch: Record<string, unknown>) {
  await fetchMutation(api.clinics.updateBillingFromStripe, {
    serviceKey: SERVICE_KEY,
    clinicId,
    ...patch,
  } as any)
}

export async function POST(req: NextRequest) {
  const body = await req.text()
  const sig  = req.headers.get('stripe-signature')

  if (!sig || !STRIPE_WEBHOOK_SECRET) {
    return NextResponse.json({ error: 'Missing signature' }, { status: 400 })
  }

  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(body, sig, STRIPE_WEBHOOK_SECRET)
  } catch (err: any) {
    console.error('[stripe webhook] signature verification failed:', err.message)
    return NextResponse.json({ error: 'Webhook signature invalid' }, { status: 400 })
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session
        if (session.mode !== 'subscription') break
        const clinicId  = session.metadata?.clinicId as Id<'clinics'>
        const plan      = session.metadata?.plan as 'per_user' | 'clinics'
        const subId     = session.subscription as string
        const customerId = session.customer as string
        if (!clinicId) break

        // Fetch the subscription to get period end
        const sub = await stripe.subscriptions.retrieve(subId)
        await patchBilling(clinicId, {
          billingPlan:          plan,
          billingStatus:        'active',
          stripeCustomerId:     customerId,
          stripeSubscriptionId: subId,
          currentPeriodEnd:     sub.items.data[0]?.billing_thresholds ? undefined : (sub as any).current_period_end * 1000,
        })
        break
      }

      case 'invoice.paid': {
        const invoice    = event.data.object as Stripe.Invoice & { subscription?: string }
        const customerId = invoice.customer as string
        const clinicId   = await getClinicId(customerId)
        if (!clinicId) break
        const sub = invoice.subscription
          ? await stripe.subscriptions.retrieve(invoice.subscription)
          : null
        const priceId = (invoice.lines.data[0] as any)?.price?.id ?? null
        const plan = priceId ? planFromPriceId(priceId) : null
        await patchBilling(clinicId, {
          billingStatus:     'active',
          currentPeriodEnd:  sub ? (sub as any).current_period_end * 1000 : undefined,
          gracePeriodEndsAt: undefined,
          ...(plan ? { billingPlan: plan } : {}),
        })
        break
      }

      case 'invoice.payment_failed': {
        const invoice    = event.data.object as Stripe.Invoice & { subscription?: string }
        const customerId = invoice.customer as string
        const clinicId   = await getClinicId(customerId)
        if (!clinicId) break
        // 7-day grace period from now
        await patchBilling(clinicId, {
          billingStatus:     'past_due',
          gracePeriodEndsAt: Date.now() + 7 * 24 * 60 * 60 * 1000,
        })
        break
      }

      case 'customer.subscription.deleted': {
        const sub        = event.data.object as Stripe.Subscription
        const customerId = sub.customer as string
        const clinicId   = await getClinicId(customerId)
        if (!clinicId) break
        await patchBilling(clinicId, { billingStatus: 'canceled' })
        break
      }

      case 'customer.subscription.updated': {
        const sub        = event.data.object as Stripe.Subscription
        const customerId = sub.customer as string
        const clinicId   = await getClinicId(customerId)
        if (!clinicId) break
        const priceId = sub.items.data[0]?.price?.id
        const plan = priceId ? planFromPriceId(priceId) : null
        const statusMap: Record<string, 'trialing' | 'active' | 'past_due' | 'canceled'> = {
          active:   'active',
          trialing: 'trialing',
          past_due: 'past_due',
          canceled: 'canceled',
          unpaid:   'past_due',
        }
        await patchBilling(clinicId, {
          billingStatus:    statusMap[sub.status] ?? 'active',
          currentPeriodEnd: (sub as any).current_period_end * 1000,
          ...(plan ? { billingPlan: plan } : {}),
        })
        break
      }
    }
  } catch (err) {
    console.error('[stripe webhook] handler error:', event.type, err)
    return NextResponse.json({ error: 'Handler failed' }, { status: 500 })
  }

  return NextResponse.json({ received: true })
}
