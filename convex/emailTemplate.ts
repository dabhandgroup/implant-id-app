/**
 * Shared HTML email template builder for Implant ID.
 * Pure function — no Convex runtime needed, no 'use node'.
 *
 * All styles are inline-only for maximum email client compatibility.
 */

export interface EmailContent {
  /** Short descriptor shown in header as small muted label above the heading */
  title: string
  /** Main heading (rendered as a large h1-style block) */
  heading: string
  /** Main body content as an HTML string — paragraphs, etc. */
  body: string
  /** Optional primary CTA button */
  cta?: {
    label: string
    url: string
  }
  /** Optional teal-tinted highlight box (e.g. for displaying an ID code) */
  highlightBox?: {
    content: string
  }
  /** Optional key-value table rows (label on left, value on right) */
  tableRows?: {
    label: string
    value: string
  }[]
  /** Small muted note below the CTA (e.g. security / fraud warning) */
  footerNote?: string
  /** Whether to include the unsubscribe link in the footer (default true; set false for admin-only emails) */
  includeUnsubscribe?: boolean
}

const LOGO_URL  = 'https://portal.implantid.io/images/email-logo.png'
const PRIMARY   = '#29869F'
const DEEP      = '#1a6a80'
const TEXT      = '#0e2a33'
const MUTED     = '#64748b'
const BORDER    = '#e2e8f0'
const BG        = '#f8fafc'
const CARD      = '#ffffff'
const FOOTER_C  = '#94a3b8'
const LEGAL_C   = '#94a3b8'

export function buildEmail(opts: EmailContent): string {
  const {
    title,
    heading,
    body,
    cta,
    highlightBox,
    tableRows,
    footerNote,
    includeUnsubscribe = true,
  } = opts

  // ── Table rows section ──────────────────────────────────────────────────────
  const tableSection = tableRows && tableRows.length > 0
    ? `
      <table role="presentation" cellpadding="0" cellspacing="0" width="100%"
             style="border-collapse:collapse;font-size:15px;margin:28px 0;">
        ${tableRows.map((row, i) => `
        <tr style="${i < tableRows.length - 1 ? `border-bottom:1px solid ${BORDER};` : ''}">
          <td style="padding:11px 0;color:${MUTED};width:38%;vertical-align:top;font-size:14px;">${row.label}</td>
          <td style="padding:11px 0;color:${TEXT};font-weight:500;font-size:14px;vertical-align:top;">${row.value}</td>
        </tr>`).join('')}
      </table>`
    : ''

  // ── Highlight box ───────────────────────────────────────────────────────────
  const highlightSection = highlightBox
    ? `
      <div style="background:#e8f5f9;border:1.5px solid #a8d5e2;border-radius:12px;
                  padding:24px 28px;margin:28px 0;text-align:center;">
        ${highlightBox.content}
      </div>`
    : ''

  // ── CTA button ──────────────────────────────────────────────────────────────
  const ctaSection = cta
    ? `
      <div style="margin:32px 0 0;">
        <a href="${cta.url}"
           style="display:inline-block;background:${PRIMARY};color:#ffffff;
                  font-weight:700;font-size:15px;letter-spacing:0.2px;
                  border-radius:8px;padding:14px 28px;text-decoration:none;
                  border:none;mso-padding-alt:0;line-height:1;">
          ${cta.label}
        </a>
      </div>`
    : ''

  // ── Footer note (security/fraud notice) ────────────────────────────────────
  const footerNoteSection = footerNote
    ? `<p style="color:${FOOTER_C};font-size:12px;margin:28px 0 0;line-height:1.6;">${footerNote}</p>`
    : ''

  // ── Legal compliance section ────────────────────────────────────────────────
  const legalSection = `
          <tr>
            <td style="padding:20px 40px 0;text-align:center;border-top:1px solid ${BORDER};">
              <p style="margin:0 0 8px;font-size:11px;color:${LEGAL_C};line-height:1.75;">
                You are receiving this email because you, or your clinic, opted in to receive
                notifications from Implant ID.
              </p>
              ${includeUnsubscribe ? `
              <p style="margin:0;font-size:11px;color:${LEGAL_C};line-height:1.75;">
                To opt out of email alerts, log in to your account and
                <a href="https://portal.implantid.io/settings/notifications"
                   style="color:${LEGAL_C};text-decoration:underline;">manage your notification preferences</a>,
                or contact
                <a href="mailto:support@implantid.io"
                   style="color:${LEGAL_C};text-decoration:underline;">support@implantid.io</a>.
              </p>` : `
              <p style="margin:0;font-size:11px;color:${LEGAL_C};line-height:1.75;">
                This is an automated system notification sent to Implant ID administrators.
              </p>`}
            </td>
          </tr>`

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <meta http-equiv="X-UA-Compatible" content="IE=edge" />
  <title>${title}</title>
</head>
<body style="margin:0;padding:0;background-color:${BG};font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">

  <!-- Email wrapper -->
  <table role="presentation" cellpadding="0" cellspacing="0" width="100%"
         style="background-color:${BG};min-height:100%;">
    <tr>
      <td align="center" style="padding:40px 16px 48px;">

        <!-- Main container: max 600px -->
        <table role="presentation" cellpadding="0" cellspacing="0" width="600"
               style="max-width:600px;width:100%;">

          <!-- ── HEADER ─────────────────────────────────────────────────── -->
          <tr>
            <td style="background-color:${CARD};border-radius:12px 12px 0 0;
                        padding:32px 40px 28px;text-align:left;
                        border-bottom:1px solid ${BORDER};">
              <a href="https://portal.implantid.io" style="display:inline-block;text-decoration:none;">
                <img src="${LOGO_URL}"
                     alt="Implant ID"
                     width="200"
                     style="width:200px;max-width:200px;height:auto;display:block;margin:0;border:0;" />
              </a>
            </td>
          </tr>

          <!-- ── BODY CARD ──────────────────────────────────────────────── -->
          <tr>
            <td style="background-color:${CARD};padding:40px 40px 36px;
                        border-radius:0 0 12px 12px;">

              <!-- Title label -->
              <p style="margin:0 0 10px;font-size:12px;font-weight:600;letter-spacing:1.2px;
                         text-transform:uppercase;color:${MUTED};">${title}</p>

              <!-- Heading -->
              <h1 style="margin:0 0 20px;font-size:26px;font-weight:700;color:${TEXT};
                          line-height:1.25;letter-spacing:-0.3px;">${heading}</h1>

              <!-- Divider -->
              <div style="height:1px;background-color:${BORDER};margin:0 0 24px;"></div>

              <!-- Body -->
              <div style="font-size:15px;line-height:1.65;color:${MUTED};">
                ${body}
              </div>

              ${tableSection}
              ${highlightSection}
              ${ctaSection}
              ${footerNoteSection}

            </td>
          </tr>

          <!-- ── LEGAL COMPLIANCE ───────────────────────────────────────── -->
          ${legalSection}

          <!-- ── FOOTER ─────────────────────────────────────────────────── -->
          <tr>
            <td style="padding:24px 40px 0;text-align:center;">

              <!-- Medical disclaimer -->
              <p style="margin:0 0 10px;font-size:11px;color:${FOOTER_C};line-height:1.7;">
                Implant ID is an information management platform for medical implant records.
                It is not a substitute for professional medical advice, diagnosis, or treatment.
                Always consult a qualified healthcare provider regarding any medical decisions.
              </p>

              <!-- Data / legal -->
              <p style="margin:0 0 10px;font-size:11px;color:${FOOTER_C};line-height:1.7;">
                Your data is handled in accordance with our
                <a href="https://implantid.io/privacy" style="color:${FOOTER_C};text-decoration:underline;">Privacy Policy</a>
                and applicable data-protection legislation, including UK GDPR.
                For data queries contact
                <a href="mailto:support@implantid.io" style="color:${FOOTER_C};text-decoration:underline;">support@implantid.io</a>.
              </p>

              <!-- Nav links -->
              <p style="margin:0 0 10px;font-size:12px;color:${FOOTER_C};line-height:1.6;">
                <a href="https://implantid.io/help" style="color:${FOOTER_C};text-decoration:underline;">Help</a>
                &nbsp;&middot;&nbsp;
                <a href="https://implantid.io/privacy" style="color:${FOOTER_C};text-decoration:underline;">Privacy Policy</a>
                &nbsp;&middot;&nbsp;
                <a href="https://implantid.io/terms" style="color:${FOOTER_C};text-decoration:underline;">Terms of Service</a>
                ${includeUnsubscribe ? `&nbsp;&middot;&nbsp;
                <a href="https://portal.implantid.io/settings/notifications" style="color:${FOOTER_C};text-decoration:underline;">Unsubscribe</a>` : ''}
              </p>

              <!-- Copyright -->
              <p style="margin:0;font-size:11px;color:${FOOTER_C};line-height:1.6;">
                &copy; ${new Date().getFullYear()} Implant ID &nbsp;&middot;&nbsp;
                <a href="https://implantid.io" style="color:${FOOTER_C};text-decoration:none;">implantid.io</a>
              </p>

            </td>
          </tr>

        </table>
        <!-- /Main container -->

      </td>
    </tr>
  </table>

</body>
</html>`
}
