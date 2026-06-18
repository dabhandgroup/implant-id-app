import './LegalFooter.css'

export default function LegalFooter() {
  return (
    <footer className="legal-footer">
      <div className="legal-footer-inner">
        <a href="/" className="legal-footer-brand" aria-label="Implant ID home">
          <img src="/icon.svg" alt="" width={27} height={27} />
          <span><b>Implant</b>ID</span>
        </a>
        <p className="legal-footer-copy">
          © 2026 Implant ID Ltd · All rights reserved
        </p>
        <nav className="legal-footer-links" aria-label="Legal">
          <a href="https://implantid.io/legal/privacy-policy" target="_blank" rel="noopener noreferrer">Privacy Policy</a>
          <span aria-hidden="true">·</span>
          <a href="https://implantid.io/legal/terms-and-conditions" target="_blank" rel="noopener noreferrer">Terms of Service</a>
          <span aria-hidden="true">·</span>
          <a href="https://implantid.io/legal/gdpr" target="_blank" rel="noopener noreferrer">GDPR</a>
        </nav>
        <p className="legal-footer-disclaimer">
          Implant ID is a medical information platform. All information is for reference only and does not constitute medical advice. Clinical decisions must be made by a qualified healthcare professional.
        </p>
      </div>
    </footer>
  )
}
