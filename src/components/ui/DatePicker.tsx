'use client'
import { useState, useEffect, useRef } from 'react'

const MONTHS = ['January','February','March','April','May','June',
                'July','August','September','October','November','December']

function pad(n: number) { return n < 10 ? '0' + n : '' + n }

function parseYMD(s: string): Date | null {
  if (!s) return null
  const [y, m, d] = s.split('-').map(Number)
  if (!y || !m || !d) return null
  const dt = new Date(y, m - 1, d)
  if (isNaN(dt.getTime())) return null
  return dt
}

function toDisplay(s: string): string {
  const d = parseYMD(s)
  if (!d) return ''
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`
}

function toYMD(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

interface DatePickerProps {
  value: string          // yyyy-MM-dd or ''
  onChange: (v: string) => void
  placeholder?: string
  id?: string
}

export default function DatePicker({ value, onChange, placeholder = 'dd/mm/yyyy', id }: DatePickerProps) {
  const [open,       setOpen]       = useState(false)
  const [viewYear,   setViewYear]   = useState(new Date().getFullYear())
  const [viewMonth,  setViewMonth]  = useState(new Date().getMonth())

  const triggerRef = useRef<HTMLDivElement>(null)
  const panelRef   = useRef<HTMLDivElement>(null)

  const selected = parseYMD(value)
  const todayDate = new Date(); todayDate.setHours(0, 0, 0, 0)

  function positionPanel() {
    const tr = triggerRef.current
    const panel = panelRef.current
    if (!tr || !panel || window.innerWidth <= 640) return
    const r = tr.getBoundingClientRect()
    const pw = Math.max(r.width, 280)
    let left = r.left
    if (left + pw > window.innerWidth - 8) left = Math.max(8, window.innerWidth - pw - 8)
    panel.style.top   = `${r.bottom + 4}px`
    panel.style.left  = `${left}px`
    panel.style.width = `${pw}px`
  }

  function openPicker() {
    const anchor = selected ?? new Date()
    setViewYear(anchor.getFullYear())
    setViewMonth(anchor.getMonth())
    setOpen(true)
    setTimeout(positionPanel, 0)
  }

  function close() {
    setOpen(false)
    document.body.style.overflow = ''
  }

  function selectDate(d: Date) {
    onChange(toYMD(d))
    close()
  }

  useEffect(() => {
    if (!open) return
    function onDown(e: MouseEvent) {
      if (!triggerRef.current?.contains(e.target as Node) &&
          !panelRef.current?.contains(e.target as Node)) close()
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [open])

  useEffect(() => {
    if (!open) return
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') close() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open])

  useEffect(() => {
    if (open && window.innerWidth <= 640) document.body.style.overflow = 'hidden'
    else document.body.style.overflow = ''
  }, [open])

  function prevMonth() {
    if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y - 1) }
    else setViewMonth(m => m - 1)
  }
  function nextMonth() {
    if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y + 1) }
    else setViewMonth(m => m + 1)
  }

  function buildGrid() {
    const firstDow = new Date(viewYear, viewMonth, 1).getDay()
    const offset   = (firstDow + 6) % 7
    const prevDays = new Date(viewYear, viewMonth, 0).getDate()
    const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate()
    const cells = []
    for (let i = 0; i < 42; i++) {
      let day: number, d: Date, inMonth: boolean
      if (i < offset) {
        day = prevDays - offset + 1 + i
        d = new Date(viewYear, viewMonth - 1, day)
        inMonth = false
      } else if (i >= offset + daysInMonth) {
        day = i - offset - daysInMonth + 1
        d = new Date(viewYear, viewMonth + 1, day)
        inMonth = false
      } else {
        day = i - offset + 1
        d = new Date(viewYear, viewMonth, day)
        inMonth = true
      }
      const isToday    = inMonth && d.getTime() === todayDate.getTime()
      const isSelected = selected && inMonth && d.getTime() === selected.getTime()
      let cls = 'dp-day'
      if (!inMonth)   cls += ' dp-other'
      if (isToday)    cls += ' dp-today'
      if (isSelected) cls += ' dp-sel'
      cells.push(
        <button key={i} type="button" className={cls}
          onClick={() => inMonth && selectDate(d)}
          tabIndex={inMonth ? 0 : -1}
          aria-label={inMonth ? `${day} ${MONTHS[viewMonth]} ${viewYear}` : undefined}
        >{day}</button>
      )
    }
    return cells
  }

  return (
    <div className="dp-wrap">
      <div
        ref={triggerRef}
        className={`dp-trigger${open ? ' dp-open' : ''}`}
        tabIndex={0}
        role="button"
        aria-label="Pick a date"
        id={id}
        onClick={openPicker}
        onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openPicker() } }}
      >
        <svg className="dp-cal-ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="15" height="15">
          <rect x="3" y="4" width="18" height="18" rx="2"/>
          <line x1="16" y1="2" x2="16" y2="6"/>
          <line x1="8" y1="2" x2="8" y2="6"/>
          <line x1="3" y1="10" x2="21" y2="10"/>
        </svg>
        <span className="dp-inp">{toDisplay(value) || <span className="dp-ph">{placeholder}</span>}</span>
        {value && (
          <button type="button" className="dp-clear" aria-label="Clear date"
            onClick={e => { e.stopPropagation(); onChange('') }}>
            ×
          </button>
        )}
      </div>

      {open && <div className="dp-backdrop" onClick={close} />}

      {open && (
        <div ref={panelRef} className="dp-panel">
          <div className="dp-hdr">
            <button type="button" className="dp-nav" onClick={prevMonth} aria-label="Previous month">&#8249;</button>
            <span className="dp-hdr-label">{MONTHS[viewMonth]} {viewYear}</span>
            <button type="button" className="dp-nav" onClick={nextMonth} aria-label="Next month">&#8250;</button>
          </div>
          <div className="dp-dow-row">
            {['Mo','Tu','We','Th','Fr','Sa','Su'].map(d => (
              <div key={d} className="dp-dow">{d}</div>
            ))}
          </div>
          <div className="dp-grid">{buildGrid()}</div>
          <div className="dp-foot">
            <button type="button" className="dp-today-btn" onClick={() => selectDate(todayDate)}>Today</button>
            <button type="button" className="dp-cancel-btn" onClick={close}>Cancel</button>
          </div>
        </div>
      )}
    </div>
  )
}
