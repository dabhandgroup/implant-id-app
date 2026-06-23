'use client'
import { useQuery } from 'convex/react'
import { api } from '../../../convex/_generated/api'
import { useState } from 'react'
import { useAuth } from '@clerk/nextjs'

const STRIPE_PAYMENT_LINK = 'https://buy.stripe.com/eVqdR80wae9xbHSeS293y0s'

// ── helpers ───────────────────────────────────────────────────────────────────

function daysUntil(ts: number): number {
  return Math.max(0, Math.ceil((ts - Date.now()) / (1000 * 60 * 60 * 24)))
}

function dateStr(ts: number): string {
  return new Date(ts).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })
}

// ── Plan picker (shown when trial expired or canceled) ────────────────────────

const PLANS = [
  {
    key:   'per_user' as const,
    name:  'Per User',
    aud:   199,
    gbp:   99,
    usd:   129,
    desc:  'Single user · Full platform access',
    seats: 1,
  },
  {
    key:   'clinics' as const,
    name:  'Clinics',
    aud:   499,
    gbp:   249,
    usd:   329,
    desc:  'Up to 10 users · Role-based access',
    seats: 10,
    popular: true,
  },
]

export function PlanPicker({ reason, onSkip }: { reason: 'trial_expired' | 'canceled' | 'unpaid'; onSkip?: () => void }) {
  const [currency, setCurrency] = useState<'AUD' | 'GBP' | 'USD'>('AUD')
  const [interval, setInterval] = useState<'monthly' | 'annual'>('monthly')

  const currencySymbol = { AUD: 'A$', GBP: '£', USD: '$' }[currency]

  function startCheckout() {
    window.location.href = STRIPE_PAYMENT_LINK
  }

  const title = reason === 'trial_expired'
    ? 'Your free trial has ended'
    : reason === 'unpaid'
    ? 'Your account has been suspended'
    : 'Your subscription was cancelled'

  const subtitle = reason === 'trial_expired'
    ? 'Choose a plan to continue using Implant ID.'
    : reason === 'unpaid'
    ? 'Please update your payment to restore access.'
    : 'Subscribe to restore access to your clinic portal.'

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg)', padding: '32px 16px' }}>
      <div style={{ maxWidth: 680, width: '100%' }}>
        <div style={{ textAlign: 'center', marginBottom: 36 }}>
          <div style={{ width: 56, height: 56, borderRadius: '50%', background: reason === 'unpaid' ? 'rgba(var(--err-rgb,220,53,69),.1)' : 'rgba(var(--accent-rgb,0,150,136),.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
            {reason === 'unpaid'
              ? <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--err)" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
              : <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2"><rect x="1" y="4" width="22" height="16" rx="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg>
            }
          </div>
          <h1 style={{ fontSize: 26, fontWeight: 700, color: 'var(--text)', margin: '0 0 8px', letterSpacing: '-.02em' }}>{title}</h1>
          <p style={{ color: 'var(--muted)', fontSize: 15, margin: 0 }}>{subtitle}</p>
        </div>

        {/* Currency + interval toggles */}
        <div style={{ display: 'flex', gap: 10, justifyContent: 'center', marginBottom: 24, flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', border: '1px solid var(--border)', borderRadius: 8, overflow: 'hidden' }}>
            {(['AUD', 'GBP', 'USD'] as const).map(c => (
              <button key={c} onClick={() => setCurrency(c)} style={{ padding: '6px 14px', fontSize: 13, fontWeight: 500, background: currency === c ? 'var(--accent)' : 'transparent', color: currency === c ? '#fff' : 'var(--muted)', border: 'none', cursor: 'pointer' }}>{c}</button>
            ))}
          </div>
          <div style={{ display: 'flex', border: '1px solid var(--border)', borderRadius: 8, overflow: 'hidden' }}>
            {(['monthly', 'annual'] as const).map(i => (
              <button key={i} onClick={() => setInterval(i)} style={{ padding: '6px 14px', fontSize: 13, fontWeight: 500, background: interval === i ? 'var(--accent)' : 'transparent', color: interval === i ? '#fff' : 'var(--muted)', border: 'none', cursor: 'pointer' }}>
                {i === 'monthly' ? 'Monthly' : 'Annual (save 2 months)'}
              </button>
            ))}
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(260px,1fr))', gap: 16, marginBottom: 16 }}>
          {PLANS.map(p => {
            const price  = interval === 'monthly' ? p[currency.toLowerCase() as 'aud'] : Math.round(p[currency.toLowerCase() as 'aud'] * 10)
            const sym    = currencySymbol
            return (
              <div key={p.key} style={{ background: 'var(--bg2)', border: `2px solid ${p.popular ? 'var(--accent)' : 'var(--border)'}`, borderRadius: 16, padding: '24px 20px', position: 'relative' }}>
                {p.popular && <div style={{ position: 'absolute', top: -1, left: '50%', transform: 'translateX(-50%)', background: 'var(--accent)', color: '#fff', fontSize: 11, fontWeight: 600, padding: '3px 12px', borderRadius: '0 0 8px 8px', letterSpacing: '.04em' }}>MOST POPULAR</div>}
                <div style={{ fontSize: 17, fontWeight: 700, color: 'var(--text)', marginBottom: 4 }}>{p.name}</div>
                <div style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 16 }}>{p.desc}</div>
                <div style={{ fontSize: 32, fontWeight: 800, color: 'var(--text)', letterSpacing: '-.03em', marginBottom: 20 }}>
                  {sym}{interval === 'annual' ? price.toLocaleString() : price}
                  <span style={{ fontSize: 14, fontWeight: 400, color: 'var(--muted)' }}>/{interval === 'annual' ? 'yr' : 'mo'}</span>
                </div>
                <button
                  className="btn btn-s btn-block btn-lg"
                  style={p.popular ? {} : { background: 'transparent', color: 'var(--accent)', border: '1.5px solid var(--accent)' }}
                  onClick={startCheckout}
                >
                  Get started →
                </button>
              </div>
            )
          })}
        </div>

        {/* Large team CTA */}
        <div style={{ textAlign: 'center', color: 'var(--muted)', fontSize: 13 }}>
          Need unlimited users or multi-site?{' '}
          <a href="mailto:hello@implant-id.com" style={{ color: 'var(--accent-deep)', fontWeight: 500 }}>Talk to us about Large Team →</a>
        </div>

        {/* Skip for now */}
        {onSkip && (
          <div style={{ textAlign: 'center', marginTop: 28, paddingTop: 20, borderTop: '1px solid var(--border)' }}>
            <button
              onClick={onSkip}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted2)', fontSize: 13, textDecoration: 'underline', textUnderlineOffset: 3 }}
            >
              Skip for now
            </button>
          </div>
        )}

      </div>
    </div>
  )
}

// ── Past-due banner (grace period) ────────────────────────────────────────────

export function PastDueBanner({ gracePeriodEndsAt }: { gracePeriodEndsAt: number }) {
  const days = daysUntil(gracePeriodEndsAt)

  return (
    <div style={{ background: 'var(--err)', color: '#fff', padding: '10px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', flexShrink: 0 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 13.5, fontWeight: 500 }}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
        Payment failed — update your card by {dateStr(gracePeriodEndsAt)} ({days} day{days !== 1 ? 's' : ''} left) or your account will be suspended.
      </div>
      <a href={STRIPE_PAYMENT_LINK} style={{ background: 'rgba(255,255,255,.2)', color: '#fff', border: '1px solid rgba(255,255,255,.4)', borderRadius: 6, padding: '5px 14px', fontSize: 13, fontWeight: 500, cursor: 'pointer', flexShrink: 0, textDecoration: 'none' }}>
        Update payment →
      </a>
    </div>
  )
}

// ── Trial banner (shown in normal portal during trial) ────────────────────────

export function TrialBanner({ trialEndsAt }: { trialEndsAt: number }) {
  const days = daysUntil(trialEndsAt)

  if (days === 0) return null

  return (
    <div style={{ background: days <= 3 ? 'var(--err)' : 'var(--accent)', color: '#fff', padding: '9px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', flexShrink: 0 }}>
      <div style={{ fontSize: 13.5, fontWeight: 500 }}>
        {days <= 3
          ? `⚠ Only ${days} day${days !== 1 ? 's' : ''} left in your free trial — subscribe now to keep access.`
          : `Free trial: ${days} day${days !== 1 ? 's' : ''} remaining · Ends ${dateStr(trialEndsAt)}`
        }
      </div>
      <a href={STRIPE_PAYMENT_LINK} style={{ background: 'rgba(255,255,255,.2)', color: '#fff', border: '1px solid rgba(255,255,255,.4)', borderRadius: 6, padding: '5px 14px', fontSize: 13, fontWeight: 500, cursor: 'pointer', flexShrink: 0, textDecoration: 'none' }}>
        Choose a plan →
      </a>
    </div>
  )
}

// ── Main gate wrapper ─────────────────────────────────────────────────────────

export function BillingGate({ children }: { children: React.ReactNode }) {
  const billing  = useQuery(api.clinics.getBillingStatus)
  const [skipped, setSkipped] = useState(false)

  // Still loading — don't block
  if (billing === undefined) return <>{children}</>

  // No billing data (non-clinic user or not set up) — allow through
  if (billing === null) return <>{children}</>

  // Forever free — show portal with no billing UI at all
  if (billing.foreverFree) return <>{children}</>

  const now = Date.now()

  // Active subscription — show portal
  if (billing.billingStatus === 'active') return <>{children}</>

  // Trial active — show portal with trial banner
  if (billing.billingStatus === 'trialing' && billing.trialEndsAt && billing.trialEndsAt > now) {
    return (
      <>
        <TrialBanner trialEndsAt={billing.trialEndsAt} />
        {children}
      </>
    )
  }

  // Past due, within grace period — show portal with urgent red banner
  if (billing.billingStatus === 'past_due' && billing.gracePeriodEndsAt && billing.gracePeriodEndsAt > now) {
    return (
      <>
        <PastDueBanner gracePeriodEndsAt={billing.gracePeriodEndsAt} />
        {children}
      </>
    )
  }

  // Trial expired, past_due grace elapsed, or canceled — full block (skippable for now)
  if (skipped) return <>{children}</>

  const reason: 'trial_expired' | 'canceled' | 'unpaid' =
    billing.billingStatus === 'canceled' ? 'canceled' :
    billing.billingStatus === 'past_due' ? 'unpaid' :
    'trial_expired'

  return <PlanPicker reason={reason} onSkip={() => setSkipped(true)} />
}
