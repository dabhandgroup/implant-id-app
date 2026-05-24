'use client'

import { useEffect } from 'react'

const announceHTML = `<div class="announce-wrap"><div class="announce">
  <div class="announce-l">
    <a href="mailto:hello@implantid.io"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M4 4h16a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z"/><path d="m22 6-10 7L2 6"/></svg> hello@implantid.io</a>
    <span class="announce-pipe"></span>
    <a href="https://wa.me/447700900123" target="_blank"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M17.5 14.4c-.3-.1-1.6-.8-1.9-.9-.3-.1-.4-.1-.6.1-.2.3-.7.9-.8 1-.2.2-.3.2-.6.1-.3-.1-1.2-.4-2.3-1.4-.9-.8-1.4-1.7-1.6-2-.2-.3 0-.5.1-.6l.4-.5c.1-.2.2-.3.3-.5.1-.2 0-.4 0-.5s-.6-1.5-.8-2c-.2-.5-.4-.5-.6-.5h-.5c-.2 0-.5.1-.7.3-.3.3-1 1-1 2.4s1 2.7 1.1 2.9c.1.2 2 3.1 4.9 4.3.7.3 1.2.5 1.7.6.7.2 1.3.2 1.8.1.6-.1 1.6-.6 1.8-1.3.2-.6.2-1.2.2-1.3-.1-.1-.3-.2-.6-.3zM12 2C6.5 2 2 6.5 2 12c0 1.8.5 3.5 1.3 4.9L2 22l5.3-1.4C8.6 21.5 10.3 22 12 22c5.5 0 10-4.5 10-10S17.5 2 12 2z"/></svg> WhatsApp</a>
  </div>
  <div class="announce-slider">
    <div class="announce-slides">
      <div class="announce-slide"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M13 2 3 14h9l-1 8 10-12h-9z"/></svg> <b>Book a demo</b> &mdash; see Implant ID in action</div>
      <div class="announce-slide"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="3" y="6" width="18" height="14" rx="2"/></svg> Patients: <b>get your free Apple Wallet pass</b></div>
      <div class="announce-slide"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg> <b>HIPAA-grade infra</b> &middot; SOC 2 in progress</div>
      <div class="announce-slide"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg> <b>New:</b> 164 implants indexed across Medtronic &amp; Boston Sci.</div>
      <div class="announce-slide"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="7" r="4"/><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/></svg> Now live at <b>Northside, Radiant, Mercy &amp; Axis</b></div>
    </div>
  </div>
  <div class="announce-r">
    <span class="ann-admin"><a href="/manufacturer-login" title="Admin"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg> Admin</a><span class="announce-pipe"></span>
    </span><button class="mini-lang-btn" id="lang-trigger"><span class="flag-circle">🇬🇧</span> EN <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="6 9 12 15 18 9"/></svg></button>
  </div>
</div></div>

<!-- Language sidebar -->
<div class="lang-back" id="lang-back"></div>
<aside class="lang-sidebar" id="lang-sidebar">
  <div class="lang-h">
    <h3>Language</h3>
    <button class="lang-x" id="lang-x">✕</button>
  </div>
  <div class="lang-search">
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/></svg>
    <input id="lang-q" placeholder="Search languages…" autocomplete="off">
  </div>
  <div class="lang-list" id="lang-list">
    <button class="lang-item active" data-lang="en-gb"><span class="flag-circle">🇬🇧</span><div><b>English</b><span>United Kingdom</span></div></button>
    <button class="lang-item" data-lang="en-us"><span class="flag-circle">🇺🇸</span><div><b>English (US)</b><span>United States</span></div></button>
    <button class="lang-item" data-lang="en-au"><span class="flag-circle">🇦🇺</span><div><b>English</b><span>Australia</span></div></button>
    <button class="lang-item" data-lang="es"><span class="flag-circle">🇪🇸</span><div><b>Español</b><span>Spain</span></div></button>
    <button class="lang-item" data-lang="fr"><span class="flag-circle">🇫🇷</span><div><b>Français</b><span>France</span></div></button>
    <button class="lang-item" data-lang="de"><span class="flag-circle">🇩🇪</span><div><b>Deutsch</b><span>Germany</span></div></button>
    <button class="lang-item" data-lang="it"><span class="flag-circle">🇮🇹</span><div><b>Italiano</b><span>Italy</span></div></button>
    <button class="lang-item" data-lang="nl"><span class="flag-circle">🇳🇱</span><div><b>Nederlands</b><span>Netherlands</span></div></button>
    <button class="lang-item" data-lang="pt"><span class="flag-circle">🇵🇹</span><div><b>Português</b><span>Portugal</span></div></button>
    <button class="lang-item" data-lang="pt-br"><span class="flag-circle">🇧🇷</span><div><b>Português</b><span>Brazil</span></div></button>
    <button class="lang-item" data-lang="ar"><span class="flag-circle">🇸🇦</span><div><b>العربية</b><span>Arabic</span></div></button>
    <button class="lang-item" data-lang="zh"><span class="flag-circle">🇨🇳</span><div><b>中文</b><span>Chinese</span></div></button>
    <button class="lang-item" data-lang="ja"><span class="flag-circle">🇯🇵</span><div><b>日本語</b><span>Japanese</span></div></button>
    <button class="lang-item" data-lang="ko"><span class="flag-circle">🇰🇷</span><div><b>한국어</b><span>Korean</span></div></button>
    <button class="lang-item" data-lang="hi"><span class="flag-circle">🇮🇳</span><div><b>हिन्दी</b><span>Hindi</span></div></button>
    <button class="lang-item" data-lang="tr"><span class="flag-circle">🇹🇷</span><div><b>Türkçe</b><span>Turkish</span></div></button>
    <button class="lang-item" data-lang="pl"><span class="flag-circle">🇵🇱</span><div><b>Polski</b><span>Polish</span></div></button>
    <button class="lang-item" data-lang="ru"><span class="flag-circle">🇷🇺</span><div><b>Русский</b><span>Russian</span></div></button>
    <button class="lang-item" data-lang="sv"><span class="flag-circle">🇸🇪</span><div><b>Svenska</b><span>Swedish</span></div></button>
    <button class="lang-item" data-lang="da"><span class="flag-circle">🇩🇰</span><div><b>Dansk</b><span>Danish</span></div></button>
    <button class="lang-item" data-lang="fi"><span class="flag-circle">🇫🇮</span><div><b>Suomi</b><span>Finnish</span></div></button>
    <button class="lang-item" data-lang="el"><span class="flag-circle">🇬🇷</span><div><b>Ελληνικά</b><span>Greek</span></div></button>
    <button class="lang-item" data-lang="th"><span class="flag-circle">🇹🇭</span><div><b>ไทย</b><span>Thai</span></div></button>
    <button class="lang-item" data-lang="vi"><span class="flag-circle">🇻🇳</span><div><b>Tiếng Việt</b><span>Vietnamese</span></div></button>
    <button class="lang-item" data-lang="ms"><span class="flag-circle">🇲🇾</span><div><b>Bahasa Melayu</b><span>Malay</span></div></button>
  </div>
</aside>`

export default function AnnounceBar() {
  useEffect(() => {
    function openLang() {
      document.getElementById('lang-sidebar')?.classList.add('open')
      document.getElementById('lang-back')?.classList.add('open')
      document.body.style.overflow = 'hidden'
    }
    function closeLang() {
      document.getElementById('lang-sidebar')?.classList.remove('open')
      document.getElementById('lang-back')?.classList.remove('open')
      document.body.style.overflow = ''
    }

    const trigger = document.getElementById('lang-trigger')
    if (trigger) trigger.addEventListener('click', openLang)
    const back = document.getElementById('lang-back')
    if (back) back.addEventListener('click', closeLang)
    const closeBtn = document.getElementById('lang-x')
    if (closeBtn) closeBtn.addEventListener('click', closeLang)

    // Language search filter
    const langQ = document.getElementById('lang-q') as HTMLInputElement
    if (langQ) {
      langQ.addEventListener('input', () => {
        const q = langQ.value.toLowerCase()
        document.querySelectorAll('.lang-item').forEach((item) => {
          const text = (item as HTMLElement).textContent?.toLowerCase() || ''
          ;(item as HTMLElement).style.display = text.includes(q) ? 'flex' : 'none'
        })
      })
    }

    // Language selection
    document.querySelectorAll('.lang-item').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.lang-item.active').forEach(b => b.classList.remove('active'))
        btn.classList.add('active')
        closeLang()
      })
    })

    return () => {}
  }, [])

  return <div style={{ display: 'contents' }} dangerouslySetInnerHTML={{ __html: announceHTML }} />
}
