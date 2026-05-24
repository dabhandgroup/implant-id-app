'use client'

const footerHTML = `<footer>
  <div class="ft-wrap">
    <div class="ft-hero">
      <div class="ft-hero-l">
        <a href="/" class="logo"><img src="/icon.svg" alt=""><span class="logo-text" style="color:#fff"><b>Implant</b><span>ID</span></span></a>
        <p>The modern database for MRI implant safety. Built to give clinics — and patients — their time back.</p>
        <div class="ft-badges">
          <div class="ft-badge"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg> HIPAA-grade</div>
          <div class="ft-badge"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="9"/><path d="m9 12 2 2 4-4"/></svg> SOC 2 (Type I)</div>
          <div class="ft-badge"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="3"/></svg> ISO 27001</div>
          <div class="ft-badge"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="9"/></svg> GDPR</div>
        </div>
      </div>
      <div class="ft-news">
        <h4>MRI safety, in your inbox.</h4>
        <p>One short email a month — new devices added to the library, clinician field notes, the occasional product update. No fluff.</p>
        <form class="ft-news-form" onsubmit="event.preventDefault();this.querySelector('input').value='Subscribed ✓';this.querySelector('input').disabled=true">
          <input type="email" placeholder="you@clinic.com" required>
          <button type="submit">Subscribe</button>
        </form>
      </div>
    </div>

    <div class="ft-links">
      <div class="ft-col">
        <h5>Features</h5>
        <ul>
          <li><a href="/patients/wallet">Apple Wallet pass</a></li>
          <li><a href="/scan">Scan-to-profile</a></li>
          <li><a href="/library">60k+ implant library</a></li>
          <li><a href="#">Two-sided portal</a></li>
          <li><a href="#">Audit log</a></li>
          <li><a href="#">Integrations</a></li>
          <li><a href="#">API access</a></li>
        </ul>
      </div>
      <div class="ft-col">
        <h5>Solutions</h5>
        <ul>
          <li><a href="/clinics">For clinics</a></li>
          <li><a href="/patients">For patients</a></li>
          <li><a href="#">For hospitals</a></li>
          <li><a href="#">For imaging networks</a></li>
          <li><a href="#">For pacemaker clinics</a></li>
          <li><a href="#">For cochlear clinics</a></li>
          <li><a href="#">Enterprise</a></li>
        </ul>
      </div>
      <div class="ft-col">
        <h5>Resources</h5>
        <ul>
          <li><a href="/library">Implant library</a></li>
          <li><a href="#">MRI safety blog</a></li>
          <li><a href="#">Clinician guides</a></li>
          <li><a href="#">Patient handbook</a></li>
          <li><a href="#">Case studies</a></li>
          <li><a href="#">Whitepapers</a></li>
          <li><a href="#">Research papers</a></li>
        </ul>
      </div>
      <div class="ft-col">
        <h5>Company</h5>
        <ul>
          <li><a href="/about">About</a></li>
          <li><a href="#">Our team</a></li>
          <li><a href="#">Investors <span class="tag">Raising</span></a></li>
          <li><a href="#">Pitch deck</a></li>
          <li><a href="#">Investor updates</a></li>
          <li><a href="#">Partners</a></li>
          <li><a href="/contact">Contact</a></li>
        </ul>
      </div>
      <div class="ft-col">
        <h5>Trust &amp; security</h5>
        <ul>
          <li><a href="#">Security overview</a></li>
          <li><a href="#">HIPAA compliance</a></li>
          <li><a href="#">GDPR &amp; data</a></li>
          <li><a href="#">Subprocessors</a></li>
          <li><a href="#">Responsible disclosure</a></li>
          <li><a href="#">Status page</a></li>
          <li><a href="#">Uptime history</a></li>
        </ul>
      </div>
      <div class="ft-col">
        <h5>Support</h5>
        <ul>
          <li><a href="#">Help centre</a></li>
          <li><a href="/login">Log in</a></li>
          <li><a href="/demo">Book a demo</a></li>
          <li><a href="#">Book a demo</a></li>
          <li><a href="mailto:hello@implantid.io">hello@implantid.io</a></li>
          <li><a href="#">WhatsApp support</a></li>
          <li><a href="#">Emergency line</a></li>
        </ul>
      </div>
    </div>

    <div class="ft-showcase">
      <a class="ft-card" href="/patients/register">
        <div class="ic"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><circle cx="12" cy="7" r="4"/><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/></svg></div>
        <h6>For patients</h6>
        <p>Living with an implant? Create a free Implant ID profile so any clinic can find your device data instantly.</p>
        <span class="ft-cta">Create my profile →</span>
      </a>
      <a class="ft-card" href="/demo">
        <div class="ic"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><path d="M3 21V8l9-5 9 5v13"/><path d="M9 21V12h6v9"/></svg></div>
        <h6>For clinics</h6>
        <p>See how Implant ID can save your team hours every day. Book a demo and we'll walk you through the platform.</p>
        <span class="ft-cta">Book a demo →</span>
      </a>
      <a class="ft-card" href="/contact">
        <div class="ic"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><path d="M4 4h16a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z"/><path d="m22 6-10 7L2 6"/></svg></div>
        <h6>Get in touch</h6>
        <p>Questions, partnerships, manufacturer access, or press? We&rsquo;d love to hear from you.</p>
        <span class="ft-cta">Contact us →</span>
      </a>
    </div>

    <div class="ft-bot">
      <div class="ft-co">&copy; 2026 Implant ID Ltd &middot; implantid.io</div>
      <div class="ft-legal">
        <a href="#">Privacy</a><a href="#">Terms</a><a href="#">Cookies</a><a href="#">DPA</a><a href="#">HIPAA notice</a><a href="#">Accessibility</a>
      </div>
    </div>
  </div>
</footer>`

export default function Footer() {
  return <div style={{ display: 'contents' }} dangerouslySetInnerHTML={{ __html: footerHTML }} />
}
