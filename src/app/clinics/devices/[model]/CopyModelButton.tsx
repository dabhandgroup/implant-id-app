'use client'

import { useState } from 'react'

export default function CopyModelButton({ modelNumbers }: { modelNumbers: string[] }) {
  const [copied, setCopied] = useState(false)
  const primary = modelNumbers[0] ?? ''

  function handleCopy() {
    navigator.clipboard.writeText(primary).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  return (
    <button
      onClick={handleCopy}
      className="qa-model-copy"
      aria-label={`Copy model number ${primary}`}
      title="Click to copy model number"
    >
      <div className="qa-model-copy-label">Model number</div>
      <div className="qa-model-copy-row">
        <span className="qa-model-copy-value">
          {modelNumbers.map((mn, i) => (
            <span key={mn}>
              {i > 0 && <span style={{ color: 'var(--muted2)', margin: '0 5px' }}>·</span>}
              {mn}
            </span>
          ))}
        </span>
        {copied ? (
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--ok)" strokeWidth="2.5" className="qa-model-copy-ic">
            <polyline points="20 6 9 17 4 12"/>
          </svg>
        ) : (
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="qa-model-copy-ic">
            <rect x="9" y="9" width="13" height="13" rx="2"/>
            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
          </svg>
        )}
      </div>
    </button>
  )
}
