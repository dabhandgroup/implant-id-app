import { NextResponse } from 'next/server'
import { Resend }       from 'resend'
import { auth }         from '@clerk/nextjs/server'

export const dynamic = 'force-dynamic'

function welcomeEmail(firstName: string, implantIdCode: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Your Implant ID record is ready</title>
  <style>
    body { margin: 0; padding: 40px 16px 48px; background: #f0f4f8; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; }
    .wrap { max-width: 560px; margin: 0 auto; }
    .head { background: #ffffff; padding: 24px 40px; text-align: center; border-radius: 16px 16px 0 0; }
    .head img { width: 180px; height: auto; display: block; margin: 0 auto; }
    .divider { background: #e2e8f0; height: 1px; }
    .body { background: #ffffff; padding: 40px; color: #1a1a1a; font-size: 15px; line-height: 1.6; }
    .body h1 { margin: 0 0 8px; color: #0e2a33; font-size: 24px; font-weight: 700; }
    .body .sub { color: #64748b; font-size: 15px; margin: 0 0 28px; }
    .id-box { background: #e8f5f9; border: 2px dashed #29869f; border-radius: 14px; padding: 28px; text-align: center; margin: 0 0 28px; }
    .id-label { font-size: 11px; color: #29869f; letter-spacing: 1.5px; text-transform: uppercase; font-weight: 600; margin: 0 0 10px; }
    .id-code { font-size: 32px; font-weight: 700; color: #1a6a80; letter-spacing: 4px; font-family: 'SF Mono', 'Fira Code', 'Courier New', monospace; margin: 0; }
    .id-note { font-size: 12px; color: #64748b; margin: 10px 0 0; }
    .body p { color: #475569; font-size: 14px; line-height: 1.7; margin: 0 0 16px; }
    .cta-wrap { text-align: center; margin: 32px 0; }
    .cta { display: inline-block; background: #1a9ebe; color: #ffffff !important; text-decoration: none; padding: 14px 32px; border-radius: 999px; font-size: 15px; font-weight: 600; letter-spacing: .01em; }
    .features { background: #f8fafc; border-radius: 12px; padding: 20px 24px; margin: 0 0 24px; }
    .features-title { font-size: 11px; color: #94a3b8; text-transform: uppercase; letter-spacing: 1.2px; font-weight: 600; margin: 0 0 12px; }
    .feature { display: flex; align-items: flex-start; gap: 10px; margin: 0 0 10px; font-size: 13.5px; color: #475569; }
    .feature:last-child { margin: 0; }
    .bullet { width: 18px; height: 18px; border-radius: 50%; background: #e8f5f9; color: #1a9ebe; font-size: 10px; font-weight: 700; display: flex; align-items: center; justify-content: center; flex-shrink: 0; margin-top: 1px; }
    .footer { background: transparent; padding: 20px 40px 0; text-align: center; font-size: 11px; color: #94a3b8; line-height: 1.5; }
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
      <h1>Hi ${firstName},</h1>
      <p class="sub">Your implant record has been created. Your unique Implant ID is below.</p>

      <div class="id-box">
        <p class="id-label">Your Implant ID</p>
        <p class="id-code">${implantIdCode}</p>
        <p class="id-note">Keep this safe — it's how clinicians identify your implant record.</p>
      </div>

      <p>Your clinic has registered your implant details in the Implant ID system.
         To access your full patient portal — including your MRI safety status,
         digital wallet card, and the ability to share your record with any clinic —
         complete your account setup below.</p>

      <div class="cta-wrap">
        <a href="https://portal.implantid.io/patients/register" class="cta">
          Complete your account →
        </a>
      </div>

      <div class="features">
        <p class="features-title">What you get with your account</p>
        <div class="feature">
          <div class="bullet">✓</div>
          <span>Apple Wallet &amp; Google Wallet implant card — always with you</span>
        </div>
        <div class="feature">
          <div class="bullet">✓</div>
          <span>MRI safety status, always up to date with manufacturer data</span>
        </div>
        <div class="feature">
          <div class="bullet">✓</div>
          <span>Share your record instantly with any clinic or hospital</span>
        </div>
        <div class="feature">
          <div class="bullet">✓</div>
          <span>Emergency QR card — accessible even without phone signal</span>
        </div>
      </div>

      <p style="font-size:13px;color:#94a3b8;">
        If you believe this was sent in error or have any questions,
        contact <a href="mailto:support@implantid.io" style="color:#1a9ebe;">support@implantid.io</a>
      </p>
    </div>
    <div class="footer">
      <p style="margin:0 0 6px;">Questions? <a href="mailto:support@implantid.io">support@implantid.io</a></p>
      <p style="margin:0;">© ${new Date().getFullYear()} ImplantID.io · All rights reserved.</p>
    </div>
  </div>
</body>
</html>`
}

export async function POST(req: Request) {
  const { userId } = await auth()
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json() as {
    email:         string
    firstName:     string
    implantIdCode: string
  }

  const { email, firstName, implantIdCode } = body

  if (!email || !firstName || !implantIdCode) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) {
    return NextResponse.json({ error: 'Email service not configured' }, { status: 500 })
  }

  const resend  = new Resend(apiKey)
  const html    = welcomeEmail(firstName, implantIdCode)
  const subject = `Your Implant ID record is ready — ${implantIdCode}`

  try {
    const { error } = await resend.emails.send({
      from:    'Implant ID <noreply@implantid.io>',
      to:      [email],
      subject,
      html,
    })

    if (error) {
      console.error('Resend error (patient invite):', error)
      return NextResponse.json({ error: 'Email delivery failed' }, { status: 500 })
    }

    return NextResponse.json({ sent: true })
  } catch (e) {
    console.error('Unexpected error (patient invite):', e)
    return NextResponse.json({ error: 'Unexpected error' }, { status: 500 })
  }
}
