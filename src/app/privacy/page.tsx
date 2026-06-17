import type { Metadata } from 'next'
import LegalFooter from '@/components/LegalFooter'

export const metadata: Metadata = {
  title: 'Privacy Policy · Implant ID',
}

const S = {
  page: {
    minHeight: '100vh',
    background: 'var(--bg)',
    fontFamily: 'var(--fb)',
  } as React.CSSProperties,
  wrap: {
    maxWidth: 760,
    margin: '0 auto',
    padding: '60px 24px 80px',
  } as React.CSSProperties,
  logo: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 7,
    textDecoration: 'none',
    color: 'var(--text)',
    fontFamily: 'var(--ff)',
    fontSize: 14,
    fontWeight: 500,
    letterSpacing: '-0.02em',
    marginBottom: 40,
  } as React.CSSProperties,
  eyebrow: {
    fontSize: 11.5,
    fontWeight: 600,
    letterSpacing: '0.06em',
    textTransform: 'uppercase' as const,
    color: 'var(--accent)',
    marginBottom: 10,
  },
  h1: {
    fontFamily: 'var(--ff)',
    fontSize: 32,
    fontWeight: 700,
    color: 'var(--text)',
    letterSpacing: '-0.03em',
    margin: '0 0 10px',
    lineHeight: 1.2,
  } as React.CSSProperties,
  updated: {
    fontSize: 13,
    color: 'var(--muted)',
    margin: '0 0 40px',
  } as React.CSSProperties,
  divider: {
    border: 'none',
    borderTop: '1px solid var(--border)',
    margin: '40px 0',
  } as React.CSSProperties,
  h2: {
    fontFamily: 'var(--ff)',
    fontSize: 16,
    fontWeight: 600,
    color: 'var(--text)',
    margin: '32px 0 10px',
    letterSpacing: '-0.01em',
  } as React.CSSProperties,
  p: {
    fontSize: 14.5,
    color: 'var(--muted)',
    lineHeight: 1.75,
    margin: '0 0 14px',
  } as React.CSSProperties,
  ul: {
    paddingLeft: 20,
    margin: '0 0 14px',
  } as React.CSSProperties,
  li: {
    fontSize: 14.5,
    color: 'var(--muted)',
    lineHeight: 1.75,
    marginBottom: 6,
  } as React.CSSProperties,
  table: {
    width: '100%',
    borderCollapse: 'collapse' as const,
    fontSize: 13.5,
    margin: '0 0 20px',
  } as React.CSSProperties,
  th: {
    fontFamily: 'var(--ff)',
    fontWeight: 600,
    fontSize: 12,
    textAlign: 'left' as const,
    color: 'var(--muted)',
    borderBottom: '1px solid var(--border)',
    padding: '8px 12px',
    letterSpacing: '0.03em',
    textTransform: 'uppercase' as const,
  } as React.CSSProperties,
  td: {
    color: 'var(--muted)',
    padding: '10px 12px',
    borderBottom: '1px solid var(--border)',
    verticalAlign: 'top' as const,
    lineHeight: 1.5,
  } as React.CSSProperties,
  highlight: {
    background: 'color-mix(in srgb,var(--accent) 8%,transparent)',
    border: '1px solid color-mix(in srgb,var(--accent) 20%,transparent)',
    borderRadius: 10,
    padding: '14px 18px',
    marginBottom: 20,
  } as React.CSSProperties,
  highlightText: {
    fontSize: 13.5,
    color: 'var(--accent-deep)',
    lineHeight: 1.6,
    margin: 0,
  } as React.CSSProperties,
  contact: {
    background: 'var(--bg2)',
    border: '1px solid var(--border)',
    borderRadius: 12,
    padding: '18px 22px',
    marginTop: 40,
  } as React.CSSProperties,
  contactLabel: {
    fontSize: 11.5,
    fontWeight: 600,
    letterSpacing: '0.05em',
    textTransform: 'uppercase' as const,
    color: 'var(--muted)',
    marginBottom: 6,
  },
  contactLink: {
    fontSize: 14,
    color: 'var(--accent)',
    textDecoration: 'none',
  } as React.CSSProperties,
}

export default function PrivacyPage() {
  return (
    <div style={S.page}>
      <div style={S.wrap}>
        <a href="/" style={S.logo}>
          <img src="/icon.svg" alt="" width={18} height={18} style={{ opacity: 0.75 }} />
          <span><b>Implant</b>ID</span>
        </a>

        <p style={S.eyebrow}>Legal</p>
        <h1 style={S.h1}>Privacy Policy</h1>
        <p style={S.updated}>Last updated: 17 June 2026 · Effective: 17 June 2026</p>

        <div style={S.highlight}>
          <p style={S.highlightText}>
            We take your privacy seriously. This policy explains what data we collect, why we collect it, how long we keep it, and your rights under UK GDPR. If you have any questions, contact us at privacy@implantid.io.
          </p>
        </div>

        <hr style={S.divider} />

        <h2 style={S.h2}>1. Who We Are</h2>
        <p style={S.p}>
          Implant ID Ltd (&ldquo;we&rdquo;, &ldquo;us&rdquo;, &ldquo;our&rdquo;) is the data controller for personal data processed on the Implant ID platform (implantid.io). We are registered in England and Wales.
        </p>
        <p style={S.p}>
          <strong>Data Protection contact:</strong> <a href="mailto:privacy@implantid.io" style={{ color: 'var(--accent)' }}>privacy@implantid.io</a>
        </p>

        <h2 style={S.h2}>2. Information We Collect</h2>
        <p style={S.p}>We collect the following categories of personal data:</p>
        <table style={S.table}>
          <thead>
            <tr>
              <th style={S.th}>Category</th>
              <th style={S.th}>Examples</th>
              <th style={S.th}>Who</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style={S.td}><strong>Identity data</strong></td>
              <td style={S.td}>Full name, date of birth, patient ID</td>
              <td style={S.td}>Patients</td>
            </tr>
            <tr>
              <td style={S.td}><strong>Contact data</strong></td>
              <td style={S.td}>Phone number, email address</td>
              <td style={S.td}>All users</td>
            </tr>
            <tr>
              <td style={S.td}><strong>Health / implant data</strong></td>
              <td style={S.td}>Device name, manufacturer, model number, serial number, implant date, hospital, surgeon, medications, allergies</td>
              <td style={S.td}>Patients</td>
            </tr>
            <tr>
              <td style={S.td}><strong>Professional data</strong></td>
              <td style={S.td}>Clinic name, role, professional credentials</td>
              <td style={S.td}>Healthcare professionals</td>
            </tr>
            <tr>
              <td style={S.td}><strong>Usage data</strong></td>
              <td style={S.td}>Login timestamps, features accessed, session information</td>
              <td style={S.td}>All users</td>
            </tr>
          </tbody>
        </table>

        <h2 style={S.h2}>3. How We Use Your Information</h2>
        <p style={S.p}>We use your personal data to:</p>
        <ul style={S.ul}>
          <li style={S.li}>Operate and provide the Platform, including creating and managing your account;</li>
          <li style={S.li}>Verify your identity and secure your account;</li>
          <li style={S.li}>Enable authorised clinicians to view your implant record with your consent;</li>
          <li style={S.li}>Send account notifications, security codes, and service updates;</li>
          <li style={S.li}>Comply with our legal and regulatory obligations;</li>
          <li style={S.li}>Protect the safety and security of the Platform and its users.</li>
        </ul>

        <h2 style={S.h2}>4. Legal Basis (UK GDPR)</h2>
        <p style={S.p}>We process your personal data under the following lawful bases:</p>
        <ul style={S.ul}>
          <li style={S.li}><strong>Contract</strong> (Article 6(1)(b)) — processing necessary to provide the service you signed up for;</li>
          <li style={S.li}><strong>Legal obligation</strong> (Article 6(1)(c)) — to comply with healthcare data regulations and record-keeping requirements;</li>
          <li style={S.li}><strong>Legitimate interests</strong> (Article 6(1)(f)) — platform security, fraud prevention, and service improvement;</li>
          <li style={S.li}><strong>Vital interests</strong> (Article 6(1)(d)) — in emergency medical situations where immediate access to implant information is necessary to protect life.</li>
        </ul>
        <p style={S.p}>
          For special category health data, we rely on Article 9(2)(h) (medical purposes, preventive medicine) and Article 9(2)(i) (public health) of the UK GDPR, as well as Schedule 1 Part 1 of the Data Protection Act 2018.
        </p>

        <h2 style={S.h2}>5. Data Retention</h2>
        <p style={S.p}>
          Health and medical implant data is retained for a minimum of <strong>8 years</strong> from your last activity on the Platform, in line with NHS Records Management Code of Practice guidance for health records. This ensures that safety-critical implant information remains accessible for the duration required by UK healthcare law.
        </p>
        <p style={S.p}>
          Account and contact data is retained for the duration of your account plus 2 years after account deletion.
        </p>
        <p style={S.p}>
          You may request deletion of your account at any time via your account settings. Deleting your account will immediately remove your access to the Platform. However, your underlying health data may be retained for the legally required period. To submit a formal data deletion or erasure request, contact <a href="mailto:privacy@implantid.io" style={{ color: 'var(--accent)' }}>privacy@implantid.io</a>.
        </p>

        <h2 style={S.h2}>6. Your Rights (UK GDPR)</h2>
        <p style={S.p}>Under UK GDPR, you have the following rights:</p>
        <ul style={S.ul}>
          <li style={S.li}><strong>Right of access</strong> — request a copy of the personal data we hold about you;</li>
          <li style={S.li}><strong>Right to rectification</strong> — request correction of inaccurate data;</li>
          <li style={S.li}><strong>Right to erasure</strong> — request deletion of your data, subject to medical data retention obligations;</li>
          <li style={S.li}><strong>Right to restrict processing</strong> — request that we limit how we use your data;</li>
          <li style={S.li}><strong>Right to data portability</strong> — receive your data in a structured, machine-readable format;</li>
          <li style={S.li}><strong>Right to object</strong> — object to processing based on legitimate interests.</li>
        </ul>
        <p style={S.p}>
          To exercise any of these rights, contact us at <a href="mailto:privacy@implantid.io" style={{ color: 'var(--accent)' }}>privacy@implantid.io</a>. We will respond within 30 days. You also have the right to lodge a complaint with the Information Commissioner&rsquo;s Office (ICO) at <a href="https://ico.org.uk" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accent)' }}>ico.org.uk</a>.
        </p>

        <h2 style={S.h2}>7. Data Sharing</h2>
        <p style={S.p}>We share personal data only as necessary to operate the Platform:</p>
        <table style={S.table}>
          <thead>
            <tr>
              <th style={S.th}>Third Party</th>
              <th style={S.th}>Purpose</th>
              <th style={S.th}>Location</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style={S.td}><strong>Clerk</strong></td>
              <td style={S.td}>Identity verification and authentication</td>
              <td style={S.td}>United States</td>
            </tr>
            <tr>
              <td style={S.td}><strong>Convex</strong></td>
              <td style={S.td}>Secure database and real-time data sync</td>
              <td style={S.td}>United States</td>
            </tr>
            <tr>
              <td style={S.td}><strong>Resend</strong></td>
              <td style={S.td}>Transactional email delivery</td>
              <td style={S.td}>United States</td>
            </tr>
            <tr>
              <td style={S.td}><strong>Vercel</strong></td>
              <td style={S.td}>Platform hosting and infrastructure</td>
              <td style={S.td}>United States / EEA</td>
            </tr>
          </tbody>
        </table>
        <p style={S.p}>
          We do not sell your data. We do not share your data with advertisers. Authorised healthcare professionals may access your implant record only with your consent, granted by you sharing your Patient ID or QR code.
        </p>

        <h2 style={S.h2}>8. Security</h2>
        <p style={S.p}>
          We implement industry-standard security measures including encryption in transit (TLS 1.3), encrypted data storage at rest, role-based access controls, and multi-factor authentication for professional accounts. We conduct regular security reviews and penetration testing.
        </p>

        <h2 style={S.h2}>9. International Transfers</h2>
        <p style={S.p}>
          Your data is processed by third-party infrastructure providers primarily based in the United States. All transfers are protected by appropriate safeguards under UK GDPR, including Standard Contractual Clauses (SCCs) and the UK International Data Transfer Agreement (IDTA) where required.
        </p>

        <h2 style={S.h2}>10. Cookies</h2>
        <p style={S.p}>
          We use essential cookies to operate the Platform securely. These cookies are strictly necessary for authentication and session management and cannot be disabled without affecting Platform functionality. We do not use advertising or tracking cookies.
        </p>

        <h2 style={S.h2}>11. Changes to This Policy</h2>
        <p style={S.p}>
          We may update this Privacy Policy from time to time. We will notify you of material changes by posting a notice on the Platform or by email. The &ldquo;last updated&rdquo; date at the top of this page reflects when the policy was last revised.
        </p>

        <div style={S.contact}>
          <p style={S.contactLabel}>Privacy enquiries &amp; data requests</p>
          <a href="mailto:privacy@implantid.io" style={S.contactLink}>privacy@implantid.io</a>
          <p style={{ fontSize: 12.5, color: 'var(--muted2)', marginTop: 6, marginBottom: 0, lineHeight: 1.5 }}>
            We aim to respond to all requests within 30 days. For urgent matters, please mark your email as &ldquo;URGENT: Data Request&rdquo;.
          </p>
        </div>
      </div>

      <LegalFooter />
    </div>
  )
}
