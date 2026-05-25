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
    body { margin: 0; padding: 0; background: #f5f5f7; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; }
    .wrap { max-width: 560px; margin: 40px auto; background: #fff; border-radius: 16px; overflow: hidden; box-shadow: 0 1px 4px rgba(0,0,0,.08); }
    .head { background: #0a0a0a; padding: 24px 32px; display: flex; align-items: center; gap: 10px; }
    .head-logo { display: flex; align-items: center; gap: 8px; text-decoration: none; }
    .head-mark { width: 28px; height: 28px; }
    .head-name { color: #fff; font-size: 17px; font-weight: 700; letter-spacing: -.3px; }
    .head-name span { color: #4f8ef7; font-weight: 400; }
    .body { padding: 36px 32px 28px; color: #1a1a1a; font-size: 15px; line-height: 1.6; }
    .body p { margin: 0 0 16px; }
    .code-box { background: #f0f4ff; border: 1.5px solid #c7d7fd; border-radius: 12px; padding: 20px; text-align: center; margin: 24px 0; }
    .code-box .code { font-size: 36px; font-weight: 700; letter-spacing: 8px; color: #1a1a1a; font-family: 'SF Mono', 'Fira Code', monospace; }
    .code-box .expires { font-size: 12px; color: #666; margin-top: 8px; }
    .footer { border-top: 1px solid #f0f0f0; padding: 20px 32px; font-size: 12px; color: #999; line-height: 1.5; }
    .footer a { color: #4f8ef7; text-decoration: none; }
  </style>
</head>
<body>
  <div class="wrap">
    <div class="head">
      <div class="head-logo">
        <svg class="head-mark" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect width="32" height="32" rx="8" fill="#4f8ef7"/>
          <path d="M10 22V10h4v12h-4zm8-12h4v12h-4V10z" fill="#fff"/>
        </svg>
        <span class="head-name">Implant<span>ID</span></span>
      </div>
    </div>
    <div class="body">
      ${body}
    </div>
    <div class="footer">
      <p>You received this email because an action was taken on your Implant ID account. If you did not request this, you can safely ignore this email.</p>
      <p>Implant ID · <a href="https://implantid.io">implantid.io</a></p>
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
    console.error('CLERK_WEBHOOK_SECRET is not set')
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

    console.log(`Email sent via Resend: ${slug} → ${to_email_address}`)
    return NextResponse.json({ sent: true })
  } catch (e) {
    console.error('Unexpected Resend error:', e)
    return NextResponse.json({ error: 'Unexpected error' }, { status: 500 })
  }
}
