'use client'

import { useState } from 'react'

// ── Shared MRI Matrix result display components ───────────────────────────────
// Used by both the standalone MVP matrix (src/app/clinics/matrix/) and the
// registry-linked matrix (src/app/clinics/matrix-registry/) — same verdict UI,
// different data sources feeding it.

export function VerdictCard({
  verdict,
  weightAlert,
}: {
  verdict: string
  weightAlert?: string | null
}) {
  const isPass        = verdict === 'PASS'
  const isFail        = verdict === 'FAIL'
  const isUnresolved  = verdict === 'UNRESOLVED'

  const cfg = isPass
    ? { bg: 'rgba(var(--ok-rgb),0.10)', border: 'rgba(var(--ok-rgb),0.30)', text: 'var(--ok)', label: 'PASS' }
    : isFail
    ? { bg: 'rgba(var(--err-rgb),0.10)', border: 'rgba(var(--err-rgb),0.35)', text: 'var(--err)', label: 'FAIL' }
    : { bg: 'rgba(215,83,9,0.08)', border: 'rgba(215,83,9,0.30)', text: '#b45309', label: 'UNRESOLVED' }

  return (
    <div style={{ background: cfg.bg, border: `2px solid ${cfg.border}`, borderRadius: 14, padding: '20px 24px', display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
      <div style={{ fontFamily: 'var(--ff)', fontSize: 32, fontWeight: 800, color: cfg.text, letterSpacing: '-.02em', lineHeight: 1 }}>
        {cfg.label}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontFamily: 'var(--ff)', fontSize: 14, fontWeight: 600, color: cfg.text }}>
          {isPass && 'Scanning is permitted under the stated conditions'}
          {isFail && 'Scanning is not permitted for this configuration'}
          {isUnresolved && 'Cannot determine — missing data required for a ruling'}
        </div>
        {weightAlert && weightAlert.split('\n').map((line, i) => (
          <div key={i} style={{ fontFamily: 'var(--ff)', fontSize: 13, color: '#b45309', marginTop: 6, background: 'rgba(215,83,9,0.08)', border: '1px solid rgba(215,83,9,0.25)', borderRadius: 6, padding: '6px 10px' }}>
            ⚠ {line}
          </div>
        ))}
      </div>
    </div>
  )
}

export function SystemRow({ system }: { system: { label: string; verdict: string; reason?: string; constraints?: string[] } }) {
  const [expanded, setExpanded] = useState(false)
  const isPass = system.verdict === 'PASS'
  const isFail = system.verdict === 'FAIL'
  const col = isPass ? 'var(--ok)' : isFail ? 'var(--err)' : '#b45309'

  return (
    <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 10, overflow: 'hidden' }}>
      <button
        type="button"
        style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', background: 'none', border: 0, cursor: 'pointer', textAlign: 'left' }}
        onClick={() => setExpanded(e => !e)}
        aria-expanded={expanded}
      >
        <span style={{ fontFamily: 'var(--ff)', fontSize: 11.5, fontWeight: 700, padding: '3px 8px', borderRadius: 6, background: `${col}22`, color: col, flexShrink: 0 }}>
          {system.verdict}
        </span>
        <span style={{ flex: 1, fontFamily: 'var(--ff)', fontSize: 13.5, fontWeight: 500, color: 'var(--text)' }}>
          {system.label}
        </span>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--muted2)" strokeWidth="2" style={{ flexShrink: 0, transition: 'transform .15s', transform: expanded ? 'rotate(180deg)' : 'none' }} aria-hidden="true">
          <polyline points="6 9 12 15 18 9"/>
        </svg>
      </button>
      {expanded && (
        <div style={{ padding: '0 16px 14px', borderTop: '1px solid var(--border)' }}>
          {system.reason && (
            <p style={{ fontFamily: 'var(--fb)', fontSize: 13, color: 'var(--muted)', margin: '10px 0 0', lineHeight: 1.6 }}>
              {system.reason}
            </p>
          )}
          {system.constraints && system.constraints.length > 0 && (
            <div style={{ marginTop: 10 }}>
              <div style={{ fontFamily: 'var(--ff)', fontSize: 11, fontWeight: 700, letterSpacing: '1px', textTransform: 'uppercase', color: 'var(--muted2)', marginBottom: 6 }}>
                Constraints
              </div>
              <ul style={{ margin: 0, paddingLeft: 18 }}>
                {system.constraints.map((c, i) => (
                  <li key={i} style={{ fontFamily: 'var(--fb)', fontSize: 13, color: 'var(--text)', marginBottom: 4, lineHeight: 1.55 }}>{c}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export function ConstraintsPanel({ constraints }: { constraints: string[] }) {
  if (constraints.length === 0) return null
  return (
    <div style={{ background: 'rgba(var(--accent-rgb),0.05)', border: '1px solid rgba(var(--accent-rgb),0.20)', borderRadius: 12, padding: '16px 20px' }}>
      <div style={{ fontFamily: 'var(--ff)', fontSize: 11, fontWeight: 700, letterSpacing: '1px', textTransform: 'uppercase', color: 'var(--accent-deep)', marginBottom: 10 }}>
        Combined scan constraints
      </div>
      <ul style={{ margin: 0, paddingLeft: 18 }}>
        {constraints.map((c, i) => (
          <li key={i} style={{ fontFamily: 'var(--fb)', fontSize: 13.5, color: 'var(--text)', marginBottom: 5, lineHeight: 1.6 }}>{c}</li>
        ))}
      </ul>
    </div>
  )
}
