import Stripe from 'stripe'

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error('STRIPE_SECRET_KEY is not set')
}

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2026-05-27.dahlia',
})

// Plan → Stripe price ID mapping (set these after creating products in Stripe dashboard)
// Format: PLAN_CURRENCY_INTERVAL
export const STRIPE_PRICE_IDS: Record<string, Record<string, Record<string, string>>> = {
  per_user: {
    AUD: { monthly: process.env.STRIPE_PRICE_PER_USER_AUD_MONTHLY ?? '', annual: process.env.STRIPE_PRICE_PER_USER_AUD_ANNUAL ?? '' },
    GBP: { monthly: process.env.STRIPE_PRICE_PER_USER_GBP_MONTHLY ?? '', annual: process.env.STRIPE_PRICE_PER_USER_GBP_ANNUAL ?? '' },
    USD: { monthly: process.env.STRIPE_PRICE_PER_USER_USD_MONTHLY ?? '', annual: process.env.STRIPE_PRICE_PER_USER_USD_ANNUAL ?? '' },
    EUR: { monthly: process.env.STRIPE_PRICE_PER_USER_EUR_MONTHLY ?? '', annual: process.env.STRIPE_PRICE_PER_USER_EUR_ANNUAL ?? '' },
    CAD: { monthly: process.env.STRIPE_PRICE_PER_USER_CAD_MONTHLY ?? '', annual: process.env.STRIPE_PRICE_PER_USER_CAD_ANNUAL ?? '' },
    NZD: { monthly: process.env.STRIPE_PRICE_PER_USER_NZD_MONTHLY ?? '', annual: process.env.STRIPE_PRICE_PER_USER_NZD_ANNUAL ?? '' },
  },
  clinics: {
    AUD: { monthly: process.env.STRIPE_PRICE_CLINICS_AUD_MONTHLY ?? '', annual: process.env.STRIPE_PRICE_CLINICS_AUD_ANNUAL ?? '' },
    GBP: { monthly: process.env.STRIPE_PRICE_CLINICS_GBP_MONTHLY ?? '', annual: process.env.STRIPE_PRICE_CLINICS_GBP_ANNUAL ?? '' },
    USD: { monthly: process.env.STRIPE_PRICE_CLINICS_USD_MONTHLY ?? '', annual: process.env.STRIPE_PRICE_CLINICS_USD_ANNUAL ?? '' },
    EUR: { monthly: process.env.STRIPE_PRICE_CLINICS_EUR_MONTHLY ?? '', annual: process.env.STRIPE_PRICE_CLINICS_EUR_ANNUAL ?? '' },
    CAD: { monthly: process.env.STRIPE_PRICE_CLINICS_CAD_MONTHLY ?? '', annual: process.env.STRIPE_PRICE_CLINICS_CAD_ANNUAL ?? '' },
    NZD: { monthly: process.env.STRIPE_PRICE_CLINICS_NZD_MONTHLY ?? '', annual: process.env.STRIPE_PRICE_CLINICS_NZD_ANNUAL ?? '' },
  },
}

export const PLAN_NAMES: Record<string, string> = {
  per_user: 'Per User',
  clinics:  'Clinics',
  large_team: 'Large Team',
}

export const SEAT_LIMITS: Record<string, number> = {
  per_user: 1,
  clinics:  10,
  large_team: Infinity,
}
