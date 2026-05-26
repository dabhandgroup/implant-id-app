'use node'
import { internalAction } from './_generated/server'
import { v } from 'convex/values'
import { Resend } from 'resend'
import { buildEmail } from './emailTemplate'

const ADMIN_EMAIL = 'harry@dabhandmarketing.com'
const FROM        = 'Implant ID <noreply@implantid.io>'
const SUPPORT     = 'support@implantid.io'

function resend() {
  const key = process.env.RESEND_API_KEY
  if (!key) throw new Error('RESEND_API_KEY not set in Convex environment')
  return new Resend(key)
}

// ── Clinic application notification ──────────────────────────────────────────

export const sendClinicApplicationEmail = internalAction({
  args: {
    facilityName:    v.string(),
    contactName:     v.string(),
    contactEmail:    v.string(),
    facilityType:    v.string(),
    facilityCity:    v.string(),
    facilityCountry: v.string(),
    services:        v.array(v.string()),
  },
  handler: async (_ctx, args) => {
    const r = resend()
    await r.emails.send({
      from:    FROM,
      to:      ADMIN_EMAIL,
      subject: `New clinic application — ${args.facilityName}`,
      html: buildEmail({
        title:   'Clinic Application',
        heading: 'New clinic application received',
        body: `<p style="margin:0;color:#64748b;font-size:15px;line-height:1.65;">
          A new clinic has applied to join the Implant ID network. Review the details below
          and approve or reject the application from the admin panel.
        </p>`,
        tableRows: [
          { label: 'Facility',  value: args.facilityName },
          { label: 'Type',      value: args.facilityType },
          { label: 'Location',  value: `${args.facilityCity}, ${args.facilityCountry}` },
          { label: 'Contact',   value: args.contactName },
          { label: 'Email',     value: args.contactEmail },
          { label: 'Services',  value: args.services.join(', ') || '—' },
        ],
        cta: {
          label: 'Review in admin panel →',
          url:   'https://portal.implantid.io/admin',
        },
        footerNote: 'This is an automated system notification.',
        includeUnsubscribe: false,
      }),
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
      html: buildEmail({
        title:   'Welcome to Implant ID',
        heading: `Welcome to Implant ID, ${args.firstName}!`,
        body: `<p style="margin:0 0 16px;color:#64748b;font-size:15px;line-height:1.65;">
          Your Implant ID patient record has been created. Your unique ID is shown below —
          keep it safe, as clinicians may ask for it to access your implant details quickly.
        </p>
        <p style="margin:0;color:#64748b;font-size:15px;line-height:1.65;">
          <strong style="color:#0e2a33;">What happens next?</strong><br/>
          Your clinical team will verify your implant details with your hospital. Once confirmed,
          your full digital wallet pass will be activated and you'll receive a notification.
        </p>`,
        highlightBox: {
          content: `
            <p style="margin:0 0 8px;font-size:11px;font-weight:700;letter-spacing:1.4px;
                       text-transform:uppercase;color:#29869F;">Your Implant ID</p>
            <p style="margin:0;font-size:32px;font-weight:700;color:#1a6a80;
                       letter-spacing:0.5px;line-height:1.2;">${args.implantIdCode}</p>`,
        },
        cta: {
          label: 'Go to my dashboard →',
          url:   'https://portal.implantid.io/patients/dashboard',
        },
        footerNote: `If you didn't do this, please do not ignore this email —
          contact <a href="mailto:${SUPPORT}" style="color:#94a3b8;text-decoration:underline;">${SUPPORT}</a> urgently.`,
        includeUnsubscribe: true,
      }),
    })
  },
})
