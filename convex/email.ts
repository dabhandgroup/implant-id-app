'use node'
import { internalAction }  from './_generated/server'
import { internal }        from './_generated/api'
import { v }               from 'convex/values'
import { Resend }          from 'resend'
import { buildEmail }      from './emailTemplate'
import QRCode              from 'qrcode'
const FROM        = 'Implant ID <noreply@implantid.io>'
const SUPPORT     = 'support@implantid.io'
const BOOK_URL    = 'https://calendly.com/implantid'   // ← update to your booking page URL

function resend() {
  const key = process.env.RESEND_API_KEY
  if (!key) throw new Error('RESEND_API_KEY not set in Convex environment')
  return new Resend(key)
}

// ── Clinic application notification ──────────────────────────────────────────

export const sendClinicApplicationEmail = internalAction({
  args: {
    applicationId:   v.string(),
    facilityName:    v.string(),
    contactName:     v.string(),
    contactEmail:    v.string(),
    facilityType:    v.string(),
    facilityCity:    v.optional(v.string()),
    facilityCountry: v.string(),
    services:        v.array(v.string()),
  },
  handler: async (ctx, args) => {
    const adminEmails = await ctx.runQuery(
      internal.adminSettings.getAdminEmailsForNotificationType,
      { type: 'newClinicApplication' },
    )
    if (adminEmails.length === 0) return
    const r = resend()
    const location = args.facilityCity
      ? `${args.facilityCity}, ${args.facilityCountry}`
      : args.facilityCountry
    await r.emails.send({
      from:    FROM,
      to:      adminEmails,
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
          { label: 'Location',  value: location },
          { label: 'Contact',   value: args.contactName },
          { label: 'Email',     value: args.contactEmail },
          { label: 'Services',  value: args.services.join(', ') || '—' },
        ],
        cta: {
          label: 'Review application →',
          url:   `https://portal.implantid.io/master/clinics/${args.applicationId}`,
        },
        footerNote: 'This is an automated system notification.',
        includeUnsubscribe: false,
      }),
    })
  },
})

// ── Clinic application confirmation (sent to clinic on submission) ────────────

export const sendClinicApplicationConfirmationEmail = internalAction({
  args: {
    contactName:     v.string(),
    contactEmail:    v.string(),
    facilityName:    v.string(),
    facilityType:    v.string(),
    facilityAddress: v.string(),
    facilityCity:    v.optional(v.string()),
    facilityCountry: v.string(),
    facilityWebsite: v.optional(v.string()),
    facilityPhone:   v.optional(v.string()),
    contactPhone:    v.optional(v.string()),
    jobTitle:        v.optional(v.string()),
    regulatoryBody:  v.optional(v.string()),
    registrationNum: v.optional(v.string()),
    services:        v.array(v.string()),
    additionalInfo:  v.optional(v.string()),
  },
  handler: async (_ctx, args) => {
    const r         = resend()
    const firstName = args.contactName.split(' ')[0]
    const location  = args.facilityCity
      ? `${args.facilityCity}, ${args.facilityCountry}`
      : args.facilityCountry

    const rows: { label: string; value: string }[] = [
      { label: 'Facility name',    value: args.facilityName },
      { label: 'Facility type',    value: args.facilityType },
      { label: 'Address',          value: args.facilityAddress },
      { label: 'Location',         value: location },
      ...(args.facilityWebsite ? [{ label: 'Website',         value: args.facilityWebsite }] : []),
      ...(args.facilityPhone   ? [{ label: 'Facility phone',  value: args.facilityPhone }]   : []),
      { label: 'Contact name',     value: args.contactName },
      { label: 'Contact email',    value: args.contactEmail },
      ...(args.contactPhone    ? [{ label: 'Contact phone',   value: args.contactPhone }]    : []),
      ...(args.jobTitle        ? [{ label: 'Job title',       value: args.jobTitle }]        : []),
      ...(args.regulatoryBody  ? [{ label: 'Regulatory body', value: args.regulatoryBody }]  : []),
      ...(args.registrationNum ? [{ label: 'Reg. number',     value: args.registrationNum }] : []),
      { label: 'Services',         value: args.services.join(', ') || '—' },
      ...(args.additionalInfo  ? [{ label: 'Additional info', value: args.additionalInfo }]  : []),
    ]

    await r.emails.send({
      from:    FROM,
      to:      args.contactEmail,
      subject: `Application received — ${args.facilityName}`,
      html: buildEmail({
        title:   'Application Received',
        heading: `Thanks for applying, ${firstName}`,
        body: `
          <p style="margin:0 0 16px;color:#64748b;font-size:15px;line-height:1.65;">
            We've received the application for
            <strong style="color:#0e2a33;">${args.facilityName}</strong>
            to join the Implant ID network. Our team will review it and be in touch shortly.
          </p>
          <p style="margin:0 0 24px;color:#64748b;font-size:15px;line-height:1.65;">
            For reference, here is a copy of everything you submitted:
          </p>
        `,
        tableRows: rows,
        footerNote: `Questions? Contact <a href="mailto:${SUPPORT}" style="color:#94a3b8;text-decoration:underline;">${SUPPORT}</a>.`,
        includeUnsubscribe: false,
      }),
    })
  },
})

// ── Clinic approval email ─────────────────────────────────────────────────────

export const sendClinicApprovalEmail = internalAction({
  args: {
    contactName:  v.string(),
    contactEmail: v.string(),
    facilityName: v.string(),
    inviteUrl:    v.optional(v.string()),
  },
  handler: async (_ctx, args) => {
    const r         = resend()
    const firstName = args.contactName.split(' ')[0]
    const isNew     = !!args.inviteUrl

    await r.emails.send({
      from:    FROM,
      to:      args.contactEmail,
      subject: `You're approved — welcome to Implant ID`,
      html: buildEmail({
        title:   'Clinic Approved',
        heading: `You're in, ${firstName}!`,
        body: isNew ? `
          <p style="margin:0 0 16px;color:#64748b;font-size:15px;line-height:1.65;">
            Great news — your application for
            <strong style="color:#0e2a33;">${args.facilityName}</strong>
            has been reviewed and approved. Your clinic account is ready on
            the Implant ID platform.
          </p>
          <p style="margin:0;color:#64748b;font-size:15px;line-height:1.65;">
            Click the button below to activate your account and sign in instantly.
            This is a one-time activation link — if it has expired, contact your
            administrator to resend it.
          </p>
        ` : `
          <p style="margin:0 0 16px;color:#64748b;font-size:15px;line-height:1.65;">
            Great news — your application for
            <strong style="color:#0e2a33;">${args.facilityName}</strong>
            has been reviewed and approved. Your clinic account is now active on
            the Implant ID platform.
          </p>
          <p style="margin:0;color:#64748b;font-size:15px;line-height:1.65;">
            Click the button below to sign in. Enter your email address and we'll send you
            a one-time verification code — no password needed.
          </p>
        `,
        highlightBox: {
          content: `
            <p style="margin:0 0 6px;font-size:11px;font-weight:700;letter-spacing:1.4px;
                       text-transform:uppercase;color:#29869F;">${isNew ? 'Activate with' : 'Sign in with'}</p>
            <p style="margin:0;font-size:20px;font-weight:600;color:#1a6a80;
                       letter-spacing:0.2px;">${args.contactEmail}</p>
          `,
        },
        cta: {
          label: isNew ? 'Activate your clinic account →' : 'Sign in to your clinic portal →',
          url:   isNew ? args.inviteUrl! : `https://portal.implantid.io/login?email=${encodeURIComponent(args.contactEmail)}`,
        },
        footerNote: `If you didn't apply to join Implant ID, please contact
          <a href="mailto:${SUPPORT}" style="color:#94a3b8;text-decoration:underline;">${SUPPORT}</a> immediately.`,
        includeUnsubscribe: true,
      }),
    })
  },
})

// ── Clinic rejection email ────────────────────────────────────────────────────

export const sendClinicRejectionEmail = internalAction({
  args: {
    contactName:  v.string(),
    contactEmail: v.string(),
    facilityName: v.string(),
    reviewNotes:  v.optional(v.string()),
  },
  handler: async (_ctx, args) => {
    const r         = resend()
    const firstName = args.contactName.split(' ')[0]

    const notesBlock = args.reviewNotes
      ? `
        <div style="background:#fef9ec;border-left:3px solid #f0c040;border-radius:0 8px 8px 0;
                    padding:16px 20px;margin:24px 0;">
          <p style="margin:0 0 6px;font-size:11px;font-weight:700;letter-spacing:1.2px;
                     text-transform:uppercase;color:#92700a;">Reviewer note</p>
          <p style="margin:0;font-size:14px;color:#5a4a0a;line-height:1.6;">${args.reviewNotes}</p>
        </div>`
      : ''

    await r.emails.send({
      from:    FROM,
      to:      args.contactEmail,
      subject: `Your Implant ID application — next steps`,
      html: buildEmail({
        title:   'Application Update',
        heading: `Thank you for applying, ${firstName}`,
        body: `
          <p style="margin:0 0 16px;color:#64748b;font-size:15px;line-height:1.65;">
            Thank you for taking the time to apply to join the Implant ID network.
            We've carefully reviewed the application for
            <strong style="color:#0e2a33;">${args.facilityName}</strong>
            and, unfortunately, we're unable to approve it at this stage.
          </p>
          <p style="margin:0 0 16px;color:#64748b;font-size:15px;line-height:1.65;">
            This doesn't mean the door is closed. We'd love to understand your situation
            better and explore whether there's a path forward. Book a free call with our
            team and we'll walk through your application together.
          </p>
          ${notesBlock}
        `,
        cta: {
          label: 'Book a call with us →',
          url:   BOOK_URL,
        },
        footerNote: `If you believe this decision was made in error or have any questions,
          please reach out at <a href="mailto:${SUPPORT}" style="color:#94a3b8;text-decoration:underline;">${SUPPORT}</a>.`,
        includeUnsubscribe: false,
      }),
    })
  },
})

// ── Staff invite email ────────────────────────────────────────────────────────

export const sendStaffInviteEmail = internalAction({
  args: {
    contactName:  v.string(),
    contactEmail: v.string(),
    clinicName:   v.string(),
    jobType:      v.string(),   // 'radiographer' | 'surgeon' | 'admin'
    inviteUrl:    v.optional(v.string()),
  },
  handler: async (_ctx, args) => {
    const r         = resend()
    const firstName = args.contactName.split(' ')[0]
    const roleLabel = args.jobType === 'surgeon' ? 'Surgeon'
                    : args.jobType === 'admin'    ? 'Admin'
                    : 'Radiographer'
    const isSurgeon  = args.jobType === 'surgeon'
    const isNewUser  = !!args.inviteUrl
    const portalName = isSurgeon ? 'Surgeon Portal' : 'Clinic Portal'
    const ctaUrl     = args.inviteUrl
      ?? `https://portal.implantid.io/login?email=${encodeURIComponent(args.contactEmail)}`
    const bodyExtra  = isSurgeon
      ? `<p style="margin:12px 0 0;color:#64748b;font-size:14px;line-height:1.6;">
           As a Surgeon, you have your own dedicated <strong style="color:#0e2a33;">Surgeon Portal</strong>
           — a separate dashboard where you can view all patients linked to your practice,
           manage pre-operative implant checks, and receive alerts for MRI clearance requests.
           You&rsquo;ll be taken there automatically after signing in.
         </p>`
      : ''

    await r.emails.send({
      from:    FROM,
      to:      args.contactEmail,
      subject: `You've been added to ${args.clinicName} on Implant ID`,
      html: buildEmail({
        title:   'Platform Invitation',
        heading: `You've been added, ${firstName}!`,
        body: isNewUser ? `
          <p style="margin:0 0 16px;color:#64748b;font-size:15px;line-height:1.65;">
            <strong style="color:#0e2a33;">${args.clinicName}</strong> has added you to
            the Implant ID platform as a <strong style="color:#0e2a33;">${roleLabel}</strong>.
          </p>
          <p style="margin:0;color:#64748b;font-size:15px;line-height:1.65;">
            Click the button below to activate your account and access your
            <strong style="color:#0e2a33;">${portalName}</strong>. This is a one-time
            activation link — once activated, you sign in with a code sent to your email.
          </p>
          ${bodyExtra}
        ` : `
          <p style="margin:0 0 16px;color:#64748b;font-size:15px;line-height:1.65;">
            <strong style="color:#0e2a33;">${args.clinicName}</strong> has added you to
            the Implant ID platform as a <strong style="color:#0e2a33;">${roleLabel}</strong>.
            Your account is ready to use — no password needed.
          </p>
          <p style="margin:0;color:#64748b;font-size:15px;line-height:1.65;">
            Click the button below to access your <strong style="color:#0e2a33;">${portalName}</strong>.
            Enter your email and we&rsquo;ll send you a one-time sign-in code.
          </p>
          ${bodyExtra}
        `,
        highlightBox: {
          content: `
            <p style="margin:0 0 6px;font-size:11px;font-weight:700;letter-spacing:1.4px;
                       text-transform:uppercase;color:#29869F;">${isNewUser ? 'Activate with' : 'Sign in with'}</p>
            <p style="margin:0;font-size:20px;font-weight:600;color:#1a6a80;
                       letter-spacing:0.2px;">${args.contactEmail}</p>
          `,
        },
        cta: {
          label: isNewUser ? `Activate your ${portalName} →` : `Sign in to your ${portalName} →`,
          url:   ctaUrl,
        },
        footerNote: `If you weren&rsquo;t expecting this invitation, contact
          <a href="mailto:${SUPPORT}" style="color:#94a3b8;text-decoration:underline;">${SUPPORT}</a>.`,
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

// ── Patient verified email ────────────────────────────────────────────────────

export const sendPatientVerifiedEmail = internalAction({
  args: {
    firstName:     v.string(),
    email:         v.string(),
    implantIdCode: v.string(),
  },
  handler: async (_ctx, args) => {
    const r = resend()
    await r.emails.send({
      from:    FROM,
      to:      args.email,
      subject: `Your implant record is verified — Implant ID`,
      html: buildEmail({
        title:   'Record Verified',
        heading: `Great news, ${args.firstName} — your record is verified!`,
        body: `
          <p style="margin:0 0 16px;color:#64748b;font-size:15px;line-height:1.65;">
            Your clinical team has reviewed and verified your implant record on Implant ID.
            Your digital wallet pass is now active and ready to use.
          </p>
          <p style="margin:0;color:#64748b;font-size:15px;line-height:1.65;">
            Show your wallet pass at any MRI appointment so clinical staff can instantly
            access your implant safety information.
          </p>
        `,
        highlightBox: {
          content: `
            <p style="margin:0 0 8px;font-size:11px;font-weight:700;letter-spacing:1.4px;
                       text-transform:uppercase;color:#29869F;">Your Implant ID</p>
            <p style="margin:0;font-size:32px;font-weight:700;color:#1a6a80;
                       letter-spacing:0.5px;line-height:1.2;">${args.implantIdCode}</p>
          `,
        },
        cta: {
          label: 'View my verified record →',
          url:   'https://portal.implantid.io/patients/dashboard',
        },
        footerNote: `If you have any questions about your record, contact
          <a href="mailto:${SUPPORT}" style="color:#94a3b8;text-decoration:underline;">${SUPPORT}</a>.`,
        includeUnsubscribe: true,
      }),
    })
  },
})

// ── Patient shares record with a clinic ──────────────────────────────────────

export const sendPatientShareEmail = internalAction({
  args: {
    patientName:    v.string(),
    patientEmail:   v.optional(v.string()),  // for confirmation copy to patient
    implantIdCode:  v.string(),
    device:         v.optional(v.string()),
    clinicEmail:    v.string(),
    clinicName:     v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const r = resend()
    const scanUrl  = `https://portal.implantid.io/scan/${args.implantIdCode}`

    // Generate QR code PNG in this Node.js action, store it, get a public HTTPS URL
    // (data: URIs are blocked by Gmail — Convex storage returns a proper https:// URL)
    const qrBuffer = await QRCode.toBuffer(scanUrl, { width: 200, margin: 2 })
    const qrFileId = await ctx.storage.store(new Blob([new Uint8Array(qrBuffer)], { type: 'image/png' }))
    const qrUrl    = await ctx.storage.getUrl(qrFileId)

    // Email to clinic
    await r.emails.send({
      from:    FROM,
      to:      args.clinicEmail,
      subject: `${args.patientName} has shared their implant record with you`,
      html: buildEmail({
        title:   'Patient Record Shared',
        heading: `Patient record shared with ${args.clinicName ?? 'your clinic'}`,
        body: `
          <p style="margin:0 0 16px;color:#64748b;font-size:15px;line-height:1.65;">
            <strong style="color:#0e2a33;">${args.patientName}</strong> has shared their
            Implant ID record with you ahead of their appointment.
          </p>
          <p style="margin:0 0 16px;color:#64748b;font-size:15px;line-height:1.65;">
            Click the button below or scan the QR code on your clinic device to access their
            full verified implant record, including MRI safety status and device details.
          </p>
          <div style="margin:24px 0;">
            <img src="${qrUrl}" width="160" height="160"
              style="display:block;border-radius:8px;border:4px solid #f1f5f9;"
              alt="Scan to access patient record" />
            <p style="margin:8px 0 0;font-size:12px;color:#94a3b8;">
              Scan on your clinic device to open the patient record instantly
            </p>
          </div>
        `,
        tableRows: [
          { label: 'Patient',    value: args.patientName },
          { label: 'Implant ID', value: args.implantIdCode },
          ...(args.device ? [{ label: 'Device', value: args.device }] : []),
        ],
        cta: {
          label: 'View patient record →',
          url:   scanUrl,
        },
        footerNote: `This record was shared by the patient. For security questions contact
          <a href="mailto:${SUPPORT}" style="color:#94a3b8;text-decoration:underline;">${SUPPORT}</a>.`,
        includeUnsubscribe: false,
      }),
    })

    // Confirmation copy to patient
    if (args.patientEmail) {
      await r.emails.send({
        from:    FROM,
        to:      args.patientEmail,
        subject: `Your record was shared with ${args.clinicName ?? args.clinicEmail}`,
        html: buildEmail({
          title:   'Record Shared',
          heading: 'Your record has been shared',
          body: `
            <p style="margin:0 0 16px;color:#64748b;font-size:15px;line-height:1.65;">
              Your implant record has been shared with
              <strong style="color:#0e2a33;">${args.clinicName ?? args.clinicEmail}</strong>.
              They can now view your MRI safety status and implant details in advance of your appointment.
            </p>
            <p style="margin:0;color:#64748b;font-size:15px;line-height:1.65;">
              If you did not authorise this, please contact us immediately.
            </p>
          `,
          highlightBox: {
            content: `
              <p style="margin:0 0 6px;font-size:11px;font-weight:700;letter-spacing:1.4px;
                         text-transform:uppercase;color:#29869F;">Shared with</p>
              <p style="margin:0;font-size:18px;font-weight:600;color:#1a6a80;">${args.clinicName ?? args.clinicEmail}</p>
            `,
          },
          footerNote: `If you did not do this, contact
            <a href="mailto:${SUPPORT}" style="color:#94a3b8;text-decoration:underline;">${SUPPORT}</a> immediately.`,
          includeUnsubscribe: true,
        }),
      })
    }
  },
})

// ── Surgeon platform invite email ─────────────────────────────────────────────

export const sendSurgeonPlatformInviteEmail = internalAction({
  args: {
    surgeonEmail:     v.string(),
    surgeonName:      v.optional(v.string()),
    patientName:      v.string(),
    patientImplantId: v.string(),
  },
  handler: async (_ctx, args) => {
    const r         = resend()
    const greeting  = args.surgeonName ? args.surgeonName.split(' ')[0] : 'there'
    await r.emails.send({
      from:    FROM,
      to:      args.surgeonEmail,
      subject: `Your patient ${args.patientName} has registered on Implant ID`,
      html: buildEmail({
        title:   'Patient Registration',
        heading: `Hi ${greeting} — your patient is on Implant ID`,
        body: `
          <p style="margin:0 0 16px;color:#64748b;font-size:15px;line-height:1.65;">
            Your patient <strong style="color:#0e2a33;">${args.patientName}</strong> has registered
            their implant record on Implant ID and has listed you as their implanting surgeon.
          </p>
          <p style="margin:0;color:#64748b;font-size:15px;line-height:1.65;">
            Once you sign in to the platform you can verify their record — this activates their
            digital wallet pass and confirms their implant safety details for MRI teams.
          </p>
        `,
        highlightBox: {
          content: `
            <p style="margin:0 0 8px;font-size:11px;font-weight:700;letter-spacing:1.4px;
                       text-transform:uppercase;color:#29869F;">Patient Implant ID</p>
            <p style="margin:0;font-size:28px;font-weight:700;color:#1a6a80;
                       letter-spacing:0.5px;line-height:1.2;">${args.patientImplantId}</p>
          `,
        },
        cta: {
          label: 'Sign in to verify →',
          url:   `https://portal.implantid.io/login?email=${encodeURIComponent(args.surgeonEmail)}`,
        },
        footerNote: `If you don't recognise this patient, please contact
          <a href="mailto:${SUPPORT}" style="color:#94a3b8;text-decoration:underline;">${SUPPORT}</a>.`,
        includeUnsubscribe: false,
      }),
    })
  },
})

// ── Manufacturer application notification ─────────────────────────────────────

export const sendManufacturerApplicationEmail = internalAction({
  args: {
    manufacturerId: v.string(),
    companyName: v.string(),
    contactName: v.string(),
    contactEmail: v.string(),
    country: v.string(),
  },
  handler: async (ctx, args) => {
    const adminEmails = await ctx.runQuery(
      internal.adminSettings.getAdminEmailsForNotificationType,
      { type: 'newManufacturerApplication' },
    )
    if (adminEmails.length === 0) return
    const r = resend()
    await r.emails.send({
      from: FROM,
      to:   adminEmails,
      subject: `New manufacturer application — ${args.companyName}`,
      html: buildEmail({
        title: 'Manufacturer Application',
        heading: 'New manufacturer application received',
        body: `<p style="margin:0;color:#64748b;font-size:15px;line-height:1.65;">
          A new manufacturer has applied to submit devices to the Implant ID network.
          Review the details below and approve or reject the application from the admin panel.
        </p>`,
        tableRows: [
          { label: 'Company', value: args.companyName },
          { label: 'Contact', value: args.contactName },
          { label: 'Email', value: args.contactEmail },
          { label: 'Country', value: args.country },
        ],
        cta: {
          label: 'Review application →',
          url: `https://portal.implantid.io/master/manufacturers/${args.manufacturerId}`,
        },
        footerNote: 'This is an automated system notification.',
        includeUnsubscribe: false,
      }),
    })
  },
})

// ── Manufacturer approval email ───────────────────────────────────────────────

export const sendManufacturerApprovalEmail = internalAction({
  args: {
    contactName: v.string(),
    contactEmail: v.string(),
    companyName: v.string(),
  },
  handler: async (_ctx, args) => {
    const r = resend()
    const firstName = args.contactName.split(' ')[0]
    await r.emails.send({
      from: FROM,
      to: args.contactEmail,
      subject: `You're approved — welcome to Implant ID`,
      html: buildEmail({
        title: 'Manufacturer Approved',
        heading: `Welcome to Implant ID, ${firstName}!`,
        body: `
          <p style="margin:0 0 16px;color:#64748b;font-size:15px;line-height:1.65;">
            Great news — your application for
            <strong style="color:#0e2a33;">${args.companyName}</strong>
            has been reviewed and approved. Your manufacturer account is now active and
            you can start submitting devices to the Implant ID network.
          </p>
          <p style="margin:0;color:#64748b;font-size:15px;line-height:1.65;">
            To sign in, click the button below and enter your email address.
            We'll send you a one-time verification code — no password needed.
          </p>
        `,
        highlightBox: {
          content: `
            <p style="margin:0 0 6px;font-size:11px;font-weight:700;letter-spacing:1.4px;
                       text-transform:uppercase;color:#29869F;">Sign in with</p>
            <p style="margin:0;font-size:20px;font-weight:600;color:#1a6a80;
                       letter-spacing:0.2px;">${args.contactEmail}</p>
          `,
        },
        cta: {
          label: 'Sign in to your manufacturer portal →',
          url: `https://portal.implantid.io/login?email=${encodeURIComponent(args.contactEmail)}`,
        },
        footerNote: `If you didn't apply to join Implant ID, please contact
          <a href="mailto:${SUPPORT}" style="color:#94a3b8;text-decoration:underline;">${SUPPORT}</a> immediately.`,
        includeUnsubscribe: true,
      }),
    })
  },
})

// ── Manufacturer invite email ───────────────────────────────────────────────

export const sendManufacturerInviteEmail = internalAction({
  args: {
    contactName: v.string(),
    contactEmail: v.string(),
    companyName: v.string(),
  },
  handler: async (_ctx, args) => {
    const r = resend()
    const firstName = args.contactName.split(' ')[0]
    await r.emails.send({
      from: FROM,
      to: args.contactEmail,
      subject: `You've been invited to Implant ID`,
      html: buildEmail({
        title: 'Manufacturer Invitation',
        heading: `Welcome to Implant ID, ${firstName}!`,
        body: `
          <p style="margin:0 0 16px;color:#64748b;font-size:15px;line-height:1.65;">
            <strong style="color:#0e2a33;">${args.companyName}</strong> has invited you to join
            the Implant ID manufacturer network. Your account is ready to activate.
          </p>
          <p style="margin:0;color:#64748b;font-size:15px;line-height:1.65;">
            Click the button below to sign up and start submitting devices to the Implant ID
            network. You'll use this email address to sign in.
          </p>
        `,
        highlightBox: {
          content: `
            <p style="margin:0 0 6px;font-size:11px;font-weight:700;letter-spacing:1.4px;
                       text-transform:uppercase;color:#29869F;">Sign up with</p>
            <p style="margin:0;font-size:20px;font-weight:600;color:#1a6a80;
                       letter-spacing:0.2px;">${args.contactEmail}</p>
          `,
        },
        cta: {
          label: 'Sign in to your manufacturer portal →',
          url: `https://portal.implantid.io/login?email=${encodeURIComponent(args.contactEmail)}`,
        },
        footerNote: `If you weren't expecting this invitation, please contact
          <a href="mailto:${SUPPORT}" style="color:#94a3b8;text-decoration:underline;">${SUPPORT}</a> immediately.`,
        includeUnsubscribe: true,
      }),
    })
  },
})

// ── Manufacturer rejection email ──────────────────────────────────────────────

export const sendManufacturerRejectionEmail = internalAction({
  args: {
    contactName: v.string(),
    contactEmail: v.string(),
    companyName: v.string(),
    reviewNotes: v.optional(v.string()),
  },
  handler: async (_ctx, args) => {
    const r = resend()
    const firstName = args.contactName.split(' ')[0]

    const notesBlock = args.reviewNotes
      ? `
        <div style="background:#fef9ec;border-left:3px solid #f0c040;border-radius:0 8px 8px 0;
                    padding:16px 20px;margin:24px 0;">
          <p style="margin:0 0 6px;font-size:11px;font-weight:700;letter-spacing:1.2px;
                     text-transform:uppercase;color:#92700a;">Reviewer note</p>
          <p style="margin:0;font-size:14px;color:#5a4a0a;line-height:1.6;">${args.reviewNotes}</p>
        </div>`
      : ''

    await r.emails.send({
      from: FROM,
      to: args.contactEmail,
      subject: `Your Implant ID application — next steps`,
      html: buildEmail({
        title: 'Application Update',
        heading: `Thank you for applying, ${firstName}`,
        body: `
          <p style="margin:0 0 16px;color:#64748b;font-size:15px;line-height:1.65;">
            Thank you for taking the time to apply to join the Implant ID network.
            We've carefully reviewed your application for
            <strong style="color:#0e2a33;">${args.companyName}</strong>.
          </p>
          <p style="margin:0;color:#64748b;font-size:15px;line-height:1.65;">
            At this time, we're unable to move forward with your application.
            ${args.reviewNotes ? 'Please see the reviewer note below for more details.' : 'Please feel free to reapply in the future.'}
          </p>
          ${notesBlock}
        `,
        cta: {
          label: 'Learn more about Implant ID →',
          url: 'https://implantid.io',
        },
        footerNote: `If you have questions, please contact
          <a href="mailto:${SUPPORT}" style="color:#94a3b8;text-decoration:underline;">${SUPPORT}</a>.`,
        includeUnsubscribe: false,
      }),
    })
  },
})

// ── Device rejection email (sent to manufacturer when a submitted device is rejected) ──

export const sendDeviceRejectionEmail = internalAction({
  args: {
    contactName:  v.string(),
    contactEmail: v.string(),
    companyName:  v.string(),
    deviceModel:  v.string(),
    reason:       v.optional(v.string()),
  },
  handler: async (_ctx, args) => {
    const r = resend()
    const firstName = args.contactName.split(' ')[0]

    const reasonBlock = args.reason
      ? `<div style="background:#fef9ec;border-left:3px solid #f0c040;border-radius:0 8px 8px 0;
                     padding:16px 20px;margin:24px 0;">
           <p style="margin:0 0 6px;font-size:11px;font-weight:700;letter-spacing:1.2px;
                      text-transform:uppercase;color:#92700a;">Reviewer note</p>
           <p style="margin:0;font-size:14px;color:#5a4a0a;line-height:1.6;">${args.reason}</p>
         </div>`
      : ''

    await r.emails.send({
      from: FROM,
      to: args.contactEmail,
      subject: `Device submission update — ${args.deviceModel}`,
      html: buildEmail({
        title: 'Device Submission Update',
        heading: `Hi ${firstName},`,
        body: `
          <p style="margin:0 0 16px;color:#64748b;font-size:15px;line-height:1.65;">
            Thank you for submitting <strong style="color:#0e2a33;">${args.deviceModel}</strong>
            for listing on the Implant ID platform.
          </p>
          <p style="margin:0 0 16px;color:#64748b;font-size:15px;line-height:1.65;">
            After review, we are unable to approve this device submission at this time.
            ${args.reason ? 'Please see the reviewer note below.' : 'You are welcome to revise and resubmit with updated documentation.'}
          </p>
          ${reasonBlock}
        `,
        cta: {
          label: 'View your manufacturer portal →',
          url: 'https://portal.implantid.io/manufacturers',
        },
        footerNote: `Questions? Contact <a href="mailto:${SUPPORT}" style="color:#94a3b8;text-decoration:underline;">${SUPPORT}</a>.`,
        includeUnsubscribe: false,
      }),
    })
  },
})

// ── Master admin invitation email ─────────────────────────────────────────────

export const sendAdminInviteEmail = internalAction({
  args: {
    name:      v.string(),
    email:     v.string(),
    // When provided, the email includes an "Activate your account" button instead
    // of the regular sign-in button. Used for brand-new admins who haven't created
    // their Clerk account yet (via Clerk Invitations API).
    inviteUrl: v.optional(v.string()),
  },
  handler: async (_ctx, args) => {
    const r         = resend()
    const firstName = args.name.split(' ')[0]
    const isNewUser = !!args.inviteUrl

    await r.emails.send({
      from:    FROM,
      to:      args.email,
      subject: `You've been added as a master admin — Implant ID`,
      html: buildEmail({
        title:   'Master Admin Access',
        heading: `Welcome to the team, ${firstName}`,
        body: isNewUser ? `
          <p style="margin:0 0 16px;color:#64748b;font-size:15px;line-height:1.65;">
            You've been granted <strong style="color:#0e2a33;">master admin access</strong>
            to the Implant ID platform. You can now manage clinic applications, manufacturer
            onboarding, device records, and platform settings.
          </p>
          <p style="margin:0;color:#64748b;font-size:15px;line-height:1.65;">
            Click the button below to activate your account. This is a one-time link —
            once activated, you'll sign in using a one-time code sent to this email address.
          </p>
        ` : `
          <p style="margin:0 0 16px;color:#64748b;font-size:15px;line-height:1.65;">
            You've been granted <strong style="color:#0e2a33;">master admin access</strong>
            to the Implant ID platform. You can now manage clinic applications, manufacturer
            onboarding, device records, and platform settings.
          </p>
          <p style="margin:0;color:#64748b;font-size:15px;line-height:1.65;">
            Sign in using the email address this message was sent to.
            You'll receive a one-time verification code each time you log in —
            no password is required.
          </p>
        `,
        highlightBox: {
          content: `
            <p style="margin:0 0 6px;font-size:11px;font-weight:700;letter-spacing:1.4px;
                       text-transform:uppercase;color:#29869F;">${isNewUser ? 'Activate with' : 'Sign in with'}</p>
            <p style="margin:0;font-size:20px;font-weight:600;color:#1a6a80;
                       letter-spacing:0.2px;">${args.email}</p>
          `,
        },
        cta: {
          label: isNewUser ? 'Activate your admin account →' : 'Sign in to master admin →',
          url:   isNewUser ? args.inviteUrl! : 'https://portal.implantid.io/master/login',
        },
        footerNote: `If you weren't expecting this invitation, please contact
          <a href="mailto:${SUPPORT}" style="color:#94a3b8;text-decoration:underline;">${SUPPORT}</a> immediately.`,
        includeUnsubscribe: false,
      }),
    })
  },
})

// ── Clinic-created patient invite ────────────────────────────────────────────

export const sendClinicPatientInviteEmail = internalAction({
  args: {
    firstName:     v.string(),
    email:         v.string(),
    implantIdCode: v.string(),
    activationUrl: v.optional(v.string()),
    isActivation:  v.optional(v.boolean()),
  },
  handler: async (_ctx, args) => {
    const r = resend()
    const loginUrl = args.activationUrl ?? `https://portal.implantid.io/login?email=${encodeURIComponent(args.email)}&role=patient`
    await r.emails.send({
      from:    FROM,
      to:      args.email,
      subject: `Your Implant ID record is ready — ${args.implantIdCode}`,
      html: buildEmail({
        title:   'Your Implant ID record is ready',
        heading: `Hi ${args.firstName}, your implant record is ready`,
        body: `
          <p style="margin:0 0 16px;color:#64748b;font-size:15px;line-height:1.65;">
            Your clinic has registered your implant details in the Implant ID system.
            Your unique Implant ID is shown below — keep it safe, as clinicians may
            ask for it to access your record quickly.
          </p>
          <p style="margin:0;color:#64748b;font-size:15px;line-height:1.65;">
            Sign in to your patient portal to view your MRI safety status, add your
            implant card to Apple&nbsp;Wallet or Google&nbsp;Wallet, and share your
            record with any clinic or hospital.
          </p>
        `,
        highlightBox: {
          content: `
            <p style="margin:0 0 8px;font-size:11px;font-weight:700;letter-spacing:1.4px;
                       text-transform:uppercase;color:#29869F;">Your Implant ID</p>
            <p style="margin:0;font-size:32px;font-weight:700;color:#1a6a80;
                       letter-spacing:0.5px;line-height:1.2;">${args.implantIdCode}</p>
          `,
        },
        cta: {
          label: args.isActivation ? 'Activate my account →' : 'Sign in to your portal →',
          url:   loginUrl,
        },
        footerNote: `If you weren't expecting this email, please contact
          <a href="mailto:${SUPPORT}" style="color:#94a3b8;text-decoration:underline;">${SUPPORT}</a>.`,
        includeUnsubscribe: false,
      }),
    })
  },
})
