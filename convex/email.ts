'use node'
import { internalAction } from './_generated/server'
import { v } from 'convex/values'
import { Resend } from 'resend'

const ADMIN_EMAIL = 'harry@dabhandmarketing.com'
const FROM        = 'Implant ID <noreply@implantid.com>'

function resend() {
  const key = process.env.RESEND_API_KEY
  if (!key) throw new Error('RESEND_API_KEY not set in Convex environment')
  return new Resend(key)
}

// ── Clinic application notification ──────────────────────────────────────────

export const sendClinicApplicationEmail = internalAction({
  args: {
    facilityName:  v.string(),
    contactName:   v.string(),
    contactEmail:  v.string(),
    facilityType:  v.string(),
    facilityCity:  v.string(),
    facilityCountry: v.string(),
    services:      v.array(v.string()),
  },
  handler: async (_ctx, args) => {
    const r = resend()
    await r.emails.send({
      from:    FROM,
      to:      ADMIN_EMAIL,
      subject: `New clinic application — ${args.facilityName}`,
      html: `
        <div style="font-family:system-ui,sans-serif;max-width:600px;margin:0 auto;padding:40px 20px">
          <div style="margin-bottom:28px">
            <span style="font-size:22px;font-weight:700;color:#0e2a33">Implant<span style="color:#2ab4e8">ID</span></span>
          </div>
          <h2 style="font-size:20px;font-weight:600;color:#0e2a33;margin:0 0 6px">New clinic application received</h2>
          <p style="color:#64748b;font-size:14px;margin:0 0 28px">A new clinic has applied to join the Implant ID network.</p>

          <table style="width:100%;border-collapse:collapse;font-size:14px">
            <tr style="border-bottom:1px solid #e2e8f0">
              <td style="padding:10px 0;color:#64748b;width:40%">Facility</td>
              <td style="padding:10px 0;font-weight:500;color:#0e2a33">${args.facilityName}</td>
            </tr>
            <tr style="border-bottom:1px solid #e2e8f0">
              <td style="padding:10px 0;color:#64748b">Type</td>
              <td style="padding:10px 0;color:#0e2a33">${args.facilityType}</td>
            </tr>
            <tr style="border-bottom:1px solid #e2e8f0">
              <td style="padding:10px 0;color:#64748b">Location</td>
              <td style="padding:10px 0;color:#0e2a33">${args.facilityCity}, ${args.facilityCountry}</td>
            </tr>
            <tr style="border-bottom:1px solid #e2e8f0">
              <td style="padding:10px 0;color:#64748b">Contact</td>
              <td style="padding:10px 0;color:#0e2a33">${args.contactName}</td>
            </tr>
            <tr style="border-bottom:1px solid #e2e8f0">
              <td style="padding:10px 0;color:#64748b">Email</td>
              <td style="padding:10px 0;color:#0e2a33">${args.contactEmail}</td>
            </tr>
            <tr>
              <td style="padding:10px 0;color:#64748b">Services</td>
              <td style="padding:10px 0;color:#0e2a33">${args.services.join(', ') || '—'}</td>
            </tr>
          </table>

          <p style="margin-top:28px;color:#64748b;font-size:13px">
            Log into the Implant ID admin panel to review and approve or reject this application.
          </p>
        </div>
      `,
    })
  },
})

// ── Patient welcome email ─────────────────────────────────────────────────────

export const sendPatientWelcomeEmail = internalAction({
  args: {
    firstName:     v.string(),
    lastName:      v.string(),
    email:         v.string(),
    implantIdCode: v.string(),
  },
  handler: async (_ctx, args) => {
    const r = resend()
    await r.emails.send({
      from:    FROM,
      to:      args.email,
      subject: `Welcome to Implant ID — your record is being set up`,
      html: `
        <div style="font-family:system-ui,sans-serif;max-width:560px;margin:0 auto;padding:40px 20px">
          <div style="margin-bottom:28px">
            <span style="font-size:22px;font-weight:700;color:#0e2a33">Implant<span style="color:#2ab4e8">ID</span></span>
          </div>

          <h2 style="font-size:20px;font-weight:600;color:#0e2a33;margin:0 0 6px">Welcome, ${args.firstName} 👋</h2>
          <p style="color:#64748b;font-size:15px;line-height:1.6;margin:0 0 24px">
            Your Implant ID patient record has been created. Your unique ID is shown below —
            keep this safe as clinicians may ask for it.
          </p>

          <div style="background:#f0f9ff;border:1px solid #bae6fd;border-radius:12px;padding:18px 22px;margin-bottom:24px;text-align:center">
            <div style="font-size:11px;letter-spacing:1.4px;text-transform:uppercase;color:#64748b;font-weight:600;margin-bottom:6px">Your Implant ID</div>
            <div style="font-size:26px;font-weight:700;color:#0369a1;letter-spacing:.5px">${args.implantIdCode}</div>
          </div>

          <p style="color:#64748b;font-size:14px;line-height:1.6;margin:0 0 12px">
            <strong style="color:#0e2a33">What happens next?</strong><br/>
            Your clinical team will verify your implant details with your hospital. Once confirmed,
            your full digital wallet pass will be activated.
          </p>

          <p style="color:#64748b;font-size:14px;line-height:1.6;margin:0 0 28px">
            In the meantime you can log in to your dashboard to update your emergency contact,
            add notes, or check your verification status.
          </p>

          <a href="https://app.implantid.com/patients/dashboard"
            style="display:inline-block;background:#2ab4e8;color:#fff;font-weight:600;font-size:14px;border-radius:10px;padding:12px 24px;text-decoration:none">
            Go to my dashboard →
          </a>

          <p style="color:#94a3b8;font-size:12px;margin-top:32px">
            If you didn't create this account, please ignore this email.
          </p>
        </div>
      `,
    })
  },
})
