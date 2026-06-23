'use node'
import { action }   from './_generated/server'
import { internal } from './_generated/api'
import { v }        from 'convex/values'
import { Resend }   from 'resend'

const ADMIN_EMAIL = 'harry@dabhandmarketing.com'
const FROM        = 'Implant ID <noreply@implantid.io>'

/** Public action callable from the browser: generate a 6-digit delete-confirmation
 *  code, store it in Convex, and email it to the admin. The code itself never
 *  reaches the browser — only { ok: true } is returned. */
export const adminRequestDeleteCode = action({
  args: { patientId: v.id('patients') },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) throw new Error('Not authenticated')

    const result = await ctx.runMutation(
      internal.patients.adminGenerateDeleteCode,
      { patientId: args.patientId },
    ) as { code: string; patientName: string }

    const { code, patientName } = result

    const key = process.env.RESEND_API_KEY
    if (!key) throw new Error('Email service not configured')

    const resend = new Resend(key)
    const { error } = await resend.emails.send({
      from:    FROM,
      to:      [ADMIN_EMAIL],
      subject: `Patient deletion code — ${patientName}`,
      html: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1.0"/>
  <title>Patient deletion code</title>
  <style>
    body{margin:0;padding:40px 16px;background:#f0f4f8;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif}
    .wrap{max-width:480px;margin:0 auto}
    .head{background:#fff;padding:20px 32px 16px;border-radius:16px 16px 0 0;border-bottom:1px solid #e2e8f0;text-align:center}
    .head img{height:36px}
    .body{background:#fff;padding:32px}
    .body h2{margin:0 0 8px;color:#0e2a33;font-size:20px;font-weight:700}
    .body p{color:#64748b;font-size:14px;line-height:1.6;margin:0 0 24px}
    .code-box{background:#fef2f2;border:2px dashed #fca5a5;border-radius:14px;padding:28px;text-align:center;margin-bottom:24px}
    .code-label{font-size:11px;letter-spacing:1.5px;text-transform:uppercase;color:#991b1b;font-weight:700;margin-bottom:12px}
    .code-value{font-size:44px;font-weight:800;color:#991b1b;letter-spacing:10px;font-family:'SF Mono',Monaco,monospace;line-height:1}
    .code-expiry{font-size:12px;color:#b91c1c;margin-top:12px;font-weight:500}
    .footer{background:#f8fafc;padding:16px 32px;border-top:1px solid #e2e8f0;border-radius:0 0 16px 16px;font-size:12px;color:#94a3b8;text-align:center}
    .warn{background:#fefce8;border:1px solid #fde68a;border-radius:10px;padding:12px 16px;font-size:13px;color:#92400e;line-height:1.5}
  </style>
</head>
<body>
  <div class="wrap">
    <div class="head">
      <img src="https://portal.implantid.io/images/email-logo.png" alt="Implant ID"/>
    </div>
    <div class="body">
      <h2>Patient deletion code</h2>
      <p>You requested permanent deletion of <strong>${patientName}</strong>. Enter the code below to confirm. This will permanently remove the patient&apos;s record and all associated data.</p>
      <div class="code-box">
        <div class="code-label">Verification code</div>
        <div class="code-value">${code}</div>
        <div class="code-expiry">Expires in 10 minutes</div>
      </div>
      <div class="warn">&#9888; This action is irreversible. All patient data, linked devices, clinical notes, and clinic access will be permanently deleted.</div>
    </div>
    <div class="footer">If you didn&apos;t request this, ignore this email. The code expires automatically.</div>
  </div>
</body>
</html>`,
    })

    if (error) throw new Error('Failed to send verification email')
  },
})
