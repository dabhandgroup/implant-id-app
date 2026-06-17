'use client'
import { useState, useEffect } from 'react'
import './CookieBanner.css'

export default function CookieBanner() {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (!localStorage.getItem('iid_cookies')) setVisible(true)
  }, [])

  function accept() {
    localStorage.setItem('iid_cookies', '1')
    setVisible(false)
  }

  function dismiss() {
    localStorage.setItem('iid_cookies', 'dismissed')
    setVisible(false)
  }

  if (!visible) return null

  return (
    <div className="cookie-banner" role="banner" aria-label="Cookie notice">
      <p>
        We use essential cookies to keep the platform secure and functional.{' '}
        <a href="/privacy">Privacy Policy</a>
      </p>
      <div className="cookie-actions">
        <button className="btn" onClick={dismiss}>Dismiss</button>
        <button className="btn btn-s" onClick={accept}>Accept</button>
      </div>
    </div>
  )
}
