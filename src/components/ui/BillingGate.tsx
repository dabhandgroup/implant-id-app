'use client'
import { useQuery } from 'convex/react'
import { api } from '../../../convex/_generated/api'
import { useState, useEffect } from 'react'
import { useAuth, useClerk } from '@clerk/nextjs'

const STRIPE_PAYMENT_LINK = 'https://buy.stripe.com/eVqdR80wae9xbHSeS293y0s'

// ── helpers ───────────────────────────────────────────────────────────────────

function daysUntil(ts: number): number {
  return Math.max(0, Math.ceil((ts - Date.now()) / (1000 * 60 * 60 * 24)))
}

function dateStr(ts: number): string {
  return new Date(ts).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })
}

// ── Odometer digit — rolls old digit out (up) and new digit in (from below) ──

function OdometerDigit({ char }: { char: string }) {
  const [{ prev, cur, gen }, setState] = useState({ prev: char, cur: char, gen: 0 })

  useEffect(() => {
    if (char !== cur) {
      setState(s => ({ prev: s.cur, cur: char, gen: s.gen + 1 }))
    }
  }, [char, cur])

  return (
    <span style={{
      display: 'inline-block',
      overflow: 'hidden',
      height: '1em',
      lineHeight: 1,
      position: 'relative',
      verticalAlign: 'bottom',
    }}>
      <span
        key={gen}
        style={{
          display: 'block',
          lineHeight: 1,
          animation: gen > 0 ? 'odoOut 230ms cubic-bezier(.4,0,.6,1) forwards' : undefined,
        }}
      >
        {prev}
      </span>
      {gen > 0 && (
        <span
          key={`i${gen}`}
          style={{
            display: 'block',
            position: 'absolute',
            inset: 0,
            lineHeight: 1,
            animation: 'odoIn 230ms cubic-bezier(.4,0,.2,1) forwards',
          }}
        >
          {cur}
        </span>
      )}
    </span>
  )
}

// Splits a number into stable-keyed chars (aligned from the right so digit
// positions don't shift when the number gains/loses a digit).
function AnimatedPrice({ value, symbol, period }: { value: number; symbol: string; period: string }) {
  const reversed = String(value).split('').reverse()
  const chars: Array<{ char: string; key: string; isDigit: boolean }> = []
  reversed.forEach((d, i) => {
    chars.push({ char: d, key: `d${i}`, isDigit: true })
    if ((i + 1) % 3 === 0 && i < reversed.length - 1) {
      chars.push({ char: ',', key: `c${Math.floor((i + 1) / 3)}`, isDigit: false })
    }
  })
  chars.reverse()

  return (
    <span style={{ display: 'inline-flex', alignItems: 'flex-end', fontVariantNumeric: 'tabular-nums', lineHeight: 1 }}>
      <span style={{ lineHeight: 1 }}>{symbol}</span>
      {chars.map(({ char, key, isDigit }) =>
        isDigit
          ? <OdometerDigit key={key} char={char} />
          : <span key={key} style={{ lineHeight: 1 }}>{char}</span>
      )}
      <span style={{ fontSize: 14, fontWeight: 400, color: 'var(--muted)', marginLeft: 2 }}>/{period}</span>
    </span>
  )
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
  const { signOut } = useClerk()

  const currencySymbol = { AUD: 'A$', GBP: '£', USD: '$' }[currency]

  // TODO: remove onSkip bypass before launch — Stripe link: STRIPE_PAYMENT_LINK
  function startCheckout() {
    if (onSkip) { onSkip(); return }
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
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg)', padding: '32px 16px', position: 'relative' }}>
      {/* Log out — always visible top-left */}
      <button
        onClick={() => signOut({ redirectUrl: '/sign-in' })}
        aria-label="Log out"
        style={{
          position: 'fixed', top: 16, left: 16,
          display: 'flex', alignItems: 'center', gap: 6,
          background: 'var(--bg2)', border: '1px solid var(--border)',
          borderRadius: 8, padding: '6px 12px',
          cursor: 'pointer', color: 'var(--muted)', fontSize: 13, fontFamily: 'var(--ff)',
          zIndex: 50,
        }}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>
        </svg>
        Log out
      </button>

      {/* Always-visible dismiss button — fixed top-right */}
      {onSkip && (
        <button
          onClick={onSkip}
          aria-label="Skip for now"
          style={{
            position: 'fixed', top: 16, right: 16,
            width: 36, height: 36, borderRadius: '50%',
            background: 'var(--bg2)', border: '1px solid var(--border)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', color: 'var(--muted)', zIndex: 50,
          }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>
      )}
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
                <div style={{ marginBottom: 20 }}>
                  <div style={{ fontSize: 32, fontWeight: 800, color: 'var(--text)', letterSpacing: '-.03em', lineHeight: 1, marginBottom: 6 }}>
                    <AnimatedPrice
                      value={price}
                      symbol={sym}
                      period={interval === 'annual' ? 'yr' : 'mo'}
                    />
                  </div>
                  {interval === 'annual' && (
                    <span style={{
                      display: 'inline-block',
                      fontSize: 11,
                      fontWeight: 700,
                      padding: '3px 9px',
                      background: 'color-mix(in srgb,var(--accent) 14%,transparent)',
                      color: 'var(--accent-deep)',
                      borderRadius: 20,
                      letterSpacing: '.04em',
                      textTransform: 'uppercase',
                      animation: 'odoBadge 200ms cubic-bezier(.4,0,.2,1)',
                    }}>
                      2 months free
                    </span>
                  )}
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

        {/* Skip payment — testing escape hatch */}
        {onSkip && (
          <div style={{ marginTop: 20, borderTop: '1px solid var(--border)', paddingTop: 20 }}>
            <button
              onClick={onSkip}
              style={{
                display: 'block', width: '100%',
                background: 'none', border: '1px dashed var(--border2)',
                borderRadius: 10, padding: '12px 20px', cursor: 'pointer',
                color: 'var(--muted)', fontSize: 13, fontFamily: 'var(--ff)',
                textAlign: 'center', lineHeight: 1.4,
              }}
            >
              <span style={{ display: 'block', fontWeight: 600, marginBottom: 2, color: 'var(--text)' }}>Skip payment method</span>
              <span style={{ fontSize: 12, color: 'var(--muted2)' }}>For testing only — pricing not yet finalised</span>
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
