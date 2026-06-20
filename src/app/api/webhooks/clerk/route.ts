import { Webhook } from 'svix'
import { headers } from 'next/headers'
import { NextResponse } from 'next/server'
import { Resend } from 'resend'

// Route must be dynamic — it reads env vars and request body at runtime
export const dynamic = 'force-dynamic'

// ─── Branded email wrapper ────────────────────────────────────────────────────
// Wraps Clerk's generated content in Implant ID styling.
// The OTP code is already embedded in `body` by Clerk — we just present it
// inside our own branded shell.

function brandedEmail(body: string, subject: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${subject}</title>
  <style>
    body { margin: 0; padding: 40px 16px 48px; background: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; }
    .wrap { max-width: 560px; margin: 0 auto; }
    .head { background: #ffffff; padding: 20px 40px; text-align: center; }
    .head img { width: 180px; height: auto; display: block; margin: 0 auto; }
    .divider { background: #e2e8f0; height: 1px; margin: 0; }
    .body { background: #ffffff; padding: 36px 40px; color: #1a1a1a; font-size: 15px; line-height: 1.6; }
    .body p { margin: 0 0 16px; color: #64748b; font-size: 15px; line-height: 24px; }
    .body h1 { margin: 0 0 24px; color: #0e2a33; font-size: 26px; line-height: 32px; font-weight: 700; }
    .code-box { background: #e8f5f9; border-radius: 12px; padding: 28px; text-align: center; margin: 0 0 28px; }
    .code-label { font-size: 12px; color: #29869f; margin: 0 0 12px; text-transform: uppercase; letter-spacing: 1px; }
    .code { font-size: 40px; font-weight: 700; color: #1a6a80; letter-spacing: 6px; font-family: 'SF Mono', 'Fira Code', monospace; margin: 0; }
    .muted { font-size: 12px; color: #94a3b8; line-height: 20px; margin: 0 0 28px; }
    .footer { background: transparent; padding: 20px 40px 16px; text-align: center; font-size: 11px; color: #94a3b8; line-height: 1.5; }
    .footer a { color: #94a3b8; text-decoration: underline; }
  </style>
</head>
<body>
  <div class="wrap">
    <div class="head">
      <a href="https://portal.implantid.io">
        <img src="https://portal.implantid.io/images/email-logo.png" alt="Implant ID" />
      </a>
    </div>
    <div class="divider"></div>
    <div class="body">
      ${body}
    </div>
    <div class="footer">
      <p style="margin:0 0 6px;">Questions? Contact <a href="mailto:support@implantid.io">support@implantid.io</a></p>
      <p style="margin:0;">© ${new Date().getFullYear()} ImplantID.io · All rights reserved.</p>
    </div>
  </div>
</body>
</html>`
}

// ─── Slug → friendly subject line ─────────────────────────────────────────────

function subjectFor(slug: string, clerkSubject: string): string {
  const map: Record<string, string> = {
    verification_code:          'Your Implant ID verification code',
    reset_password_code:        'Reset your Implant ID password',
    invitation:                 "You've been invited to Implant ID",
    magic_link_sign_in:         'Your Implant ID sign-in link',
    magic_link_sign_up:         'Your Implant ID sign-up link',
    magic_link_user_profile:    'Confirm your email — Implant ID',
    email_code:                 'Your Implant ID verification code',
    password_changed:           'Your Implant ID password was changed',
    primary_email_address_changed: 'Your Implant ID email address was updated',
    account_locked:             'Your Implant ID account has been locked',
    sign_in_from_new_device:    'New sign-in to your Implant ID account',
  }
  return map[slug] ?? clerkSubject
}

// ─── Webhook POST handler ─────────────────────────────────────────────────────

export async function POST(req: Request) {
  const secret = process.env.CLERK_WEBHOOK_SECRET
  if (!secret) {
    console.error('CLERK_WEBHOOK_SECRET is not set — Clerk emails will not be delivered')
    return NextResponse.json({ error: 'Server misconfiguration' }, { status: 500 })
  }

  const resendKey = process.env.RESEND_API_KEY
  if (!resendKey) {
    console.error('RESEND_API_KEY is not set — Clerk emails will not be delivered')
    return NextResponse.json({ error: 'Server misconfiguration' }, { status: 500 })
  }

  // Read raw body (needed for svix signature verification)
  const rawBody = await req.text()

  // Read svix headers
  const hdrs = await headers()
  const svixId        = hdrs.get('svix-id')
  const svixTimestamp = hdrs.get('svix-timestamp')
  const svixSignature = hdrs.get('svix-signature')

  if (!svixId || !svixTimestamp || !svixSignature) {
    return NextResponse.json({ error: 'Missing svix headers' }, { status: 400 })
  }

  // Verify signature — rejects forged or replayed webhooks
  let evt: {
    type: string
    data: {
      body:             string
      subject:          string
      to_email_address: string
      slug:             string
      status:           string
      delivered_by_clerk: boolean
    }
  }

  try {
    const wh = new Webhook(secret)
    evt = wh.verify(rawBody, {
      'svix-id':        svixId,
      'svix-timestamp': svixTimestamp,
      'svix-signature': svixSignature,
    }) as typeof evt
  } catch {
    return NextResponse.json({ error: 'Invalid webhook signature' }, { status: 400 })
  }

  // Only handle email.created events where Clerk isn't delivering itself
  if (evt.type !== 'email.created') {
    return NextResponse.json({ received: true })
  }

  const { to_email_address, subject, body, slug, delivered_by_clerk } = evt.data

  // If Clerk is still delivering (template not toggled off), skip
  if (delivered_by_clerk) {
    return NextResponse.json({ received: true, note: 'delivered_by_clerk=true, skipping' })
  }

  const friendlySubject = subjectFor(slug, subject)
  const html            = brandedEmail(body, friendlySubject)

  // Initialise Resend at request time so the build doesn't need the env var
  const resend = new Resend(process.env.RESEND_API_KEY)

  try {
    const { error } = await resend.emails.send({
      from:    'Implant ID <noreply@implantid.io>',
      to:      [to_email_address],
      subject: friendlySubject,
      html,
    })

    if (error) {
      console.error('Resend error:', error)
      return NextResponse.json({ error: 'Email delivery failed' }, { status: 500 })
    }

    return NextResponse.json({ sent: true })
  } catch (e) {
    console.error('Unexpected Resend error:', e)
    return NextResponse.json({ error: 'Unexpected error' }, { status: 500 })
  }
}
