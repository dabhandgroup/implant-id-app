'use client'

import { useEffect } from 'react'

export default function ComingSoon({ open, feature, onClose }: { open: boolean; feature: string; onClose: () => void }) {
  useEffect(() => {
    if (!open) return
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null

  return (
    <div className="cs-back open" onClick={onClose}>
      <div className="cs-modal" onClick={e => e.stopPropagation()}>
        <div className="cs-body">
          <div className="cs-ic">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"><circle cx="12" cy="12" r="9"/><polyline points="12 7 12 12 15.5 14"/></svg>
          </div>
          <h3>{feature} is coming soon</h3>
          <p>We&apos;re still building this out. It&apos;ll be ready soon - reach out to hello@implantid.io if you need it sooner.</p>
        </div>
        <div className="cs-actions">
          <button className="btn btn-s btn-lg" onClick={onClose}>Got it</button>
        </div>
      </div>
    </div>
  )
}
