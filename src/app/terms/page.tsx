import type { Metadata } from 'next'
import LegalFooter from '@/components/LegalFooter'

export const metadata: Metadata = {
  title: 'Terms of Service · Implant ID',
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
  back: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 5,
    fontSize: 13,
    color: 'var(--muted)',
    textDecoration: 'none',
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

export default function TermsPage() {
  return (
    <div style={S.page}>
      <div style={S.wrap}>
        <a href="/" style={S.logo}>
          <img src="/icon.svg" alt="" width={18} height={18} style={{ opacity: 0.75 }} />
          <span><b>Implant</b>ID</span>
        </a>

        <p style={S.eyebrow}>Legal</p>
        <h1 style={S.h1}>Terms of Service</h1>
        <p style={S.updated}>Last updated: 17 June 2026 · Effective: 17 June 2026</p>

        <hr style={S.divider} />

        <h2 style={S.h2}>1. Acceptance of Terms</h2>
        <p style={S.p}>
          By accessing or using the Implant ID platform at implantid.io (the &ldquo;Platform&rdquo;), you agree to be bound by these Terms of Service (&ldquo;Terms&rdquo;). If you do not agree to these Terms in their entirety, you must not use the Platform.
        </p>

        <h2 style={S.h2}>2. About Implant ID</h2>
        <p style={S.p}>
          Implant ID is operated by Implant ID Ltd, a company registered in England and Wales. The Platform provides a digital record-keeping system for medical implant information, enabling patients to store implant details and share them securely with authorised healthcare professionals.
        </p>

        <h2 style={S.h2}>3. Eligibility</h2>
        <p style={S.p}>
          You must be 18 years or older to create an account on the Platform. By using the Platform, you represent and warrant that:
        </p>
        <ul style={S.ul}>
          <li style={S.li}>You are at least 18 years of age;</li>
          <li style={S.li}>All information you provide is accurate, current, and complete;</li>
          <li style={S.li}>You have the legal capacity to enter into a binding agreement.</li>
        </ul>

        <h2 style={S.h2}>4. Patient Accounts</h2>
        <p style={S.p}>
          Patients may register to store information about their medical implants. You are responsible for maintaining the accuracy and completeness of your records. Implant ID is not responsible for errors or omissions in information you enter. You must keep your login credentials confidential and notify us immediately of any unauthorised access to your account.
        </p>

        <h2 style={S.h2}>5. Healthcare Professional Accounts</h2>
        <p style={S.p}>
          Clinic, hospital, and healthcare professional accounts require application and approval by Implant ID. By applying for a professional account, you represent that:
        </p>
        <ul style={S.ul}>
          <li style={S.li}>You are a registered healthcare professional acting within your scope of practice;</li>
          <li style={S.li}>Access is granted solely for viewing patient-consented implant records in connection with clinical care;</li>
          <li style={S.li}>You will comply with all applicable professional and regulatory obligations regarding patient data.</li>
        </ul>

        <h2 style={S.h2}>6. Permitted Use</h2>
        <p style={S.p}>The Platform may only be used for its intended medical record-keeping purpose. You must not:</p>
        <ul style={S.ul}>
          <li style={S.li}>Access another person&rsquo;s record without their express consent;</li>
          <li style={S.li}>Provide false, misleading, or fraudulent information;</li>
          <li style={S.li}>Attempt to reverse-engineer, exploit, or circumvent any security measure of the Platform;</li>
          <li style={S.li}>Use the Platform for any unlawful purpose or in a manner that infringes any third-party rights;</li>
          <li style={S.li}>Scrape, harvest, or systematically extract data from the Platform.</li>
        </ul>

        <h2 style={S.h2}>7. Clinical Disclaimer</h2>
        <p style={S.p}>
          <strong>Implant ID is an information platform only.</strong> Nothing on this Platform constitutes medical advice, diagnosis, or treatment. All clinical decisions must be made by a qualified, registered healthcare professional. Implant ID is not liable for any clinical outcome arising directly or indirectly from use of the Platform.
        </p>
        <p style={S.p}>
          Device specifications, compatibility information, and safety data displayed on the Platform are provided for reference only. Always consult the device&rsquo;s official Instructions for Use (IFU) and the treating clinical team before any medical procedure.
        </p>

        <h2 style={S.h2}>8. Intellectual Property</h2>
        <p style={S.p}>
          All content, design, software, trademarks, and other intellectual property on the Platform are owned by or licensed to Implant ID Ltd. Nothing in these Terms grants you any right to use our intellectual property without our prior written permission.
        </p>

        <h2 style={S.h2}>9. Disclaimers and Limitation of Liability</h2>
        <p style={S.p}>
          The Platform is provided &ldquo;as is&rdquo; without warranty of any kind, express or implied. To the fullest extent permitted by applicable law, Implant ID Ltd excludes all implied warranties, including merchantability, fitness for a particular purpose, and non-infringement.
        </p>
        <p style={S.p}>
          To the fullest extent permitted by law, Implant ID Ltd shall not be liable for any indirect, incidental, special, or consequential loss or damage arising out of or in connection with your use of the Platform. Our total aggregate liability to you shall not exceed the greater of £100 or the amounts you have paid to us in the preceding 12 months.
        </p>

        <h2 style={S.h2}>10. Privacy and Data Protection</h2>
        <p style={S.p}>
          Your use of the Platform is governed by our <a href="/privacy" style={{ color: 'var(--accent)' }}>Privacy Policy</a>, which forms part of and is incorporated into these Terms. By using the Platform, you acknowledge that you have read and understood our Privacy Policy.
        </p>

        <h2 style={S.h2}>11. Termination</h2>
        <p style={S.p}>
          We may suspend or terminate your access to the Platform at any time for breach of these Terms or for any other reason at our sole discretion, with or without notice. You may delete your account at any time via your account settings, subject to our data retention obligations under applicable law.
        </p>

        <h2 style={S.h2}>12. Changes to These Terms</h2>
        <p style={S.p}>
          We may update these Terms from time to time. We will notify you of material changes by posting a notice on the Platform or by email. Your continued use of the Platform after the effective date of any changes constitutes your acceptance of the revised Terms.
        </p>

        <h2 style={S.h2}>13. Governing Law</h2>
        <p style={S.p}>
          These Terms are governed by and construed in accordance with the laws of England and Wales. Any disputes arising under or in connection with these Terms shall be subject to the exclusive jurisdiction of the courts of England and Wales.
        </p>

        <div style={S.contact}>
          <p style={S.contactLabel}>Questions about these Terms?</p>
          <a href="mailto:legal@implantid.io" style={S.contactLink}>legal@implantid.io</a>
        </div>
      </div>

      <LegalFooter />
    </div>
  )
}
