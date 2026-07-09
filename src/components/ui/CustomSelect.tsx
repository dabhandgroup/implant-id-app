'use client'
import { useState, useRef, useEffect } from 'react'

// ── Types ─────────────────────────────────────────────────────────────────────

export type SelectOption = string | { label: string; value: string }

function normalise(options: SelectOption[]): { label: string; value: string }[] {
  return options.map(o => typeof o === 'string' ? { label: o, value: o } : o)
}

// ── CustomSelect — full-width labelled dropdown ───────────────────────────────

interface CustomSelectProps {
  label?: string
  hint?: string
  value: string
  onChange: (v: string) => void
  options: SelectOption[]
  placeholder?: string
  required?: boolean
  /** Optional extra class on the trigger button */
  className?: string
}

export function CustomSelect({
  label, hint, value, onChange, options, placeholder, required, className,
}: CustomSelectProps) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const items = normalise(options)
  const selectedLabel = items.find(o => o.value === value)?.label ?? ''

  useEffect(() => {
    if (!open) return
    function onDown(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  return (
    <div className="field">
      {label && (
        <label>
          {label}
          {required && <span style={{ color: 'var(--err)', marginLeft: 3 }}>*</span>}
        </label>
      )}
      <div ref={ref} style={{ position: 'relative' }}>
        <button
          type="button"
          className={`select cs-trigger${className ? ` ${className}` : ''}`}
          onClick={() => setOpen(v => !v)}
          aria-haspopup="listbox"
          aria-expanded={open}
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            width: '100%', textAlign: 'left', cursor: 'pointer',
            color: value ? 'var(--text)' : 'var(--muted2)',
          }}
        >
          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {selectedLabel || (placeholder ?? 'Select…')}
          </span>
          <svg
            width="14" height="14" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" strokeWidth="2" aria-hidden="true"
            style={{ flexShrink: 0, transition: 'transform .2s', transform: open ? 'rotate(180deg)' : 'none' }}
          >
            <polyline points="6 9 12 15 18 9"/>
          </svg>
        </button>

        {open && (
          <ul
            role="listbox"
            style={{
              position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0, zIndex: 999,
              background: 'var(--bg2)', border: '1px solid var(--border)',
              borderRadius: 12, overflow: 'hidden', listStyle: 'none', margin: 0, padding: 0,
              boxShadow: '0 12px 40px -8px rgba(14,42,51,.18)',
            }}
          >
            {items.map(o => (
              <li key={o.value} role="option" aria-selected={o.value === value}>
                <button
                  type="button"
                  onClick={() => { onChange(o.value); setOpen(false) }}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 8,
                    width: '100%', textAlign: 'left', padding: '10px 14px',
                    fontFamily: 'var(--ff)', fontSize: 14,
                    background: o.value === value
                      ? 'rgba(var(--accent-rgb),0.10)'
                      : 'transparent',
                    color: o.value === value ? 'var(--accent-deep)' : 'var(--text)',
                    border: 'none', cursor: 'pointer',
                  }}
                  onMouseEnter={e => {
                    if (o.value !== value)
                      (e.currentTarget as HTMLButtonElement).style.background = 'var(--bg)'
                  }}
                  onMouseLeave={e => {
                    if (o.value !== value)
                      (e.currentTarget as HTMLButtonElement).style.background = 'transparent'
                  }}
                >
                  {o.value === value && (
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none"
                      stroke="currentColor" strokeWidth="2.5" aria-hidden="true" style={{ flexShrink: 0 }}>
                      <path d="M20 6 9 17l-5-5"/>
                    </svg>
                  )}
                  {o.label}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
      {hint && <span className="hint">{hint}</span>}
    </div>
  )
}

// ── InlineSelect — compact version for grid rows (DOB, date pickers) ──────────

interface InlineSelectProps {
  value: string
  onChange: (v: string) => void
  placeholder: string
  options: SelectOption[]
}

export function InlineSelect({ value, onChange, placeholder, options }: InlineSelectProps) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const items = normalise(options)
  const selectedLabel = items.find(o => o.value === value)?.label ?? ''

  useEffect(() => {
    if (!open) return
    function onDown(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [open])

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        type="button"
        className="select cs-trigger"
        onClick={() => setOpen(v => !v)}
        aria-haspopup="listbox"
        aria-expanded={open}
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          width: '100%', textAlign: 'left', cursor: 'pointer',
          color: value ? 'var(--text)' : 'var(--muted2)',
        }}
      >
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {selectedLabel || placeholder}
        </span>
        <svg
          width="12" height="12" viewBox="0 0 24 24" fill="none"
          stroke="currentColor" strokeWidth="2" aria-hidden="true"
          style={{ flexShrink: 0, marginLeft: 4, transition: 'transform .2s', transform: open ? 'rotate(180deg)' : 'none' }}
        >
          <polyline points="6 9 12 15 18 9"/>
        </svg>
      </button>

      {open && (
        <ul
          role="listbox"
          style={{
            position: 'absolute', top: 'calc(100% + 4px)', left: 0, minWidth: '100%', zIndex: 999,
            background: 'var(--bg2)', border: '1px solid var(--border)',
            borderRadius: 10, overflow: 'auto', maxHeight: 200,
            listStyle: 'none', margin: 0, padding: 0,
            boxShadow: '0 12px 40px -8px rgba(14,42,51,.18)',
          }}
        >
          {items.map(o => (
            <li key={o.value} role="option" aria-selected={o.value === value}>
              <button
                type="button"
                onClick={() => { onChange(o.value); setOpen(false) }}
                style={{
                  display: 'block', width: '100%', textAlign: 'left', padding: '9px 12px',
                  fontFamily: 'var(--ff)', fontSize: 13.5,
                  background: o.value === value
                    ? 'rgba(var(--accent-rgb),0.10)'
                    : 'transparent',
                  color: o.value === value ? 'var(--accent-deep)' : 'var(--text)',
                  border: 'none', cursor: 'pointer', whiteSpace: 'nowrap',
                }}
              >
                {o.label}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

// ── Shared trigger styles (inject once via a global CSS import if needed) ──────
// These match the .select class already in globals but ensure the trigger button
// sits flush and styled correctly without a native select appearance.
