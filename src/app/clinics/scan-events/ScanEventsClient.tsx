'use client'

import { useState }    from 'react'
import { useQuery }              from 'convex/react'
import { api as apiBase }        from '../../../../convex/_generated/api'
import { InlineSelect }          from '@/components/ui/CustomSelect'
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const api = apiBase as any

// ── Types ──────────────────────────────────────────────────────────────────────

interface Scanner {
  _id:          string
  manufacturer: string
  modelNumber?: string
  fieldStrength: string
}

interface ScanEvent {
  _id:                     string
  patientId?:              string
  scannerId:               string
  bodyRegion:              string
  fieldStrengthUsed:       string
  outcome:                 'Completed' | 'Early Termination' | 'Aborted' | 'Not Performed'
  resolvedOutcomeCache:    string
  resolvedConstraintsJson: string
  clinicianName?:          string
  adverseEvents?:          string
  earlyTerminationReason?: string
  scanTimeMins?:           number
  createdAt:               number
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatDate(ts: number) {
  return new Date(ts).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

function outcomeColour(outcome: string) {
  if (outcome === 'Completed')         return 'var(--ok)'
  if (outcome === 'Early Termination') return '#b45309'
  if (outcome === 'Aborted')           return 'var(--err)'
  return 'var(--muted)'
}

function verdictColour(v: string) {
  if (v === 'PASS') return 'var(--ok)'
  if (v === 'FAIL') return 'var(--err)'
  return '#b45309'
}

const PAGE_SIZE = 20

// ── Detail Modal ──────────────────────────────────────────────────────────────

function EventDetailModal({ event, onClose }: { event: ScanEvent; onClose: () => void }) {
  let constraints: string[] = []
  try { constraints = JSON.parse(event.resolvedConstraintsJson) } catch { /**/ }

  return (
    <div
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.50)', zIndex: 500, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div
        style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 16, width: '100%', maxWidth: 560, maxHeight: '85vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}
        role="dialog" aria-modal="true" aria-label="Scan event detail"
        onClick={e => e.stopPropagation()}
      >
        <div style={{ padding: '18px 24px 14px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
          <div>
            <div style={{ fontFamily: 'var(--ff)', fontSize: 16, fontWeight: 700, color: 'var(--text)' }}>Scan event</div>
            <div style={{ fontFamily: 'var(--ff)', fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>{formatDate(event.createdAt)}</div>
          </div>
          <button onClick={onClose} aria-label="Close" style={{ background: 'none', border: 0, cursor: 'pointer', color: 'var(--muted)', fontSize: 20, lineHeight: 1, padding: 4 }}>✕</button>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '16px 24px 24px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
            <div style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 10, padding: '10px 14px' }}>
              <div style={{ fontFamily: 'var(--ff)', fontSize: 11, fontWeight: 700, letterSpacing: '1px', textTransform: 'uppercase', color: 'var(--muted2)', marginBottom: 4 }}>Outcome</div>
              <div style={{ fontFamily: 'var(--ff)', fontSize: 14, fontWeight: 700, color: outcomeColour(event.outcome) }}>{event.outcome}</div>
            </div>
            <div style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 10, padding: '10px 14px' }}>
              <div style={{ fontFamily: 'var(--ff)', fontSize: 11, fontWeight: 700, letterSpacing: '1px', textTransform: 'uppercase', color: 'var(--muted2)', marginBottom: 4 }}>Matrix verdict</div>
              <div style={{ fontFamily: 'var(--ff)', fontSize: 14, fontWeight: 700, color: verdictColour(event.resolvedOutcomeCache) }}>{event.resolvedOutcomeCache}</div>
            </div>
          </div>

          <div style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 10, padding: '12px 14px', marginBottom: 14 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              <Row label="Body region"       value={event.bodyRegion} />
              <Row label="Field strength"    value={event.fieldStrengthUsed} />
              {event.scanTimeMins != null && <Row label="Scan time"  value={`${event.scanTimeMins} min`} />}
            </div>
          </div>

          {constraints.length > 0 && (
            <div style={{ marginBottom: 14 }}>
              <div style={{ fontFamily: 'var(--ff)', fontSize: 11, fontWeight: 700, letterSpacing: '1px', textTransform: 'uppercase', color: 'var(--muted2)', marginBottom: 6 }}>Frozen constraints snapshot</div>
              <ul style={{ margin: 0, padding: '0 0 0 18px', display: 'flex', flexDirection: 'column', gap: 4 }}>
                {constraints.map((c, i) => (
                  <li key={i} style={{ fontFamily: 'var(--ff)', fontSize: 12.5, color: 'var(--muted)', lineHeight: 1.5 }}>{c}</li>
                ))}
              </ul>
            </div>
          )}

          {event.earlyTerminationReason && (
            <Notice label="Early termination reason" value={event.earlyTerminationReason} colour="var(--err)" />
          )}
          {event.adverseEvents && (
            <Notice label="Adverse events" value={event.adverseEvents} colour="var(--err)" />
          )}
        </div>

        <div style={{ padding: '14px 24px', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'flex-end', flexShrink: 0 }}>
          <button className="btn btn-s" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div style={{ fontFamily: 'var(--ff)', fontSize: 11, color: 'var(--muted2)', marginBottom: 2 }}>{label}</div>
      <div style={{ fontFamily: 'var(--ff)', fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>{value}</div>
    </div>
  )
}

function Notice({ label, value, colour }: { label: string; value: string; colour: string }) {
  return (
    <div style={{ border: `1px solid ${colour}40`, background: `${colour}0a`, borderRadius: 9, padding: '10px 14px', marginBottom: 10 }}>
      <div style={{ fontFamily: 'var(--ff)', fontSize: 11, fontWeight: 700, color: colour, letterSpacing: '0.8px', textTransform: 'uppercase', marginBottom: 3 }}>{label}</div>
      <div style={{ fontFamily: 'var(--ff)', fontSize: 13, color: 'var(--text)', lineHeight: 1.5 }}>{value}</div>
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

export default function ScanEventsClient() {
  const [scannerFilter,  setScannerFilter]  = useState('')
  const [cursor,         setCursor]         = useState<string | null>(null)
  const [cursorHistory,  setCursorHistory]  = useState<Array<string | null>>([null])
  const [detailEvent,    setDetailEvent]    = useState<ScanEvent | null>(null)

  const scanners = useQuery(api.scanners.getMyClinicScanners as never) as Scanner[] | undefined
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const resultArgs: any = {
    paginationOpts: { numItems: PAGE_SIZE, cursor },
    ...(scannerFilter ? { scannerId: scannerFilter } : {}),
  }
  const result = useQuery(
    api.scanEvents.listScanEventsByClinic as never,
    resultArgs,
  ) as { page: ScanEvent[]; isDone: boolean; continueCursor: string } | undefined

  const events  = result?.page ?? []
  const isDone  = result?.isDone ?? true
  const loading = result === undefined

  function nextPage() {
    if (!result?.continueCursor || result.isDone) return
    setCursorHistory(h => [...h, cursor])
    setCursor(result.continueCursor)
  }
  function prevPage() {
    if (cursorHistory.length <= 1) return
    const prev = cursorHistory[cursorHistory.length - 1]
    setCursorHistory(h => h.slice(0, -1))
    setCursor(prev ?? null)
  }

  function changeScannerFilter(v: string) {
    setScannerFilter(v === 'All scanners' ? '' : v)
    setCursor(null)
    setCursorHistory([null])
  }

  const scannerOptions = [
    'All scanners',
    ...((scanners ?? []).map((s: Scanner) => ({ value: s._id, label: `${s.manufacturer}${s.modelNumber ? ` ${s.modelNumber}` : ''} (${s.fieldStrength})` }))),
  ]

  const isFirstPage = cursorHistory.length <= 1

  return (
    <div className="m-content">
      <div className="m-h">
        <h1 style={{ margin: 0 }}>Scan log</h1>
      </div>

      {/* Filter bar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20, flexWrap: 'wrap' }}>
        <div style={{ width: 280 }}>
          <InlineSelect
            value={scannerFilter || 'All scanners'}
            onChange={changeScannerFilter}
            options={scannerOptions}
            placeholder="Filter by scanner"
          />
        </div>
        <span style={{ fontFamily: 'var(--ff)', fontSize: 13, color: 'var(--muted)' }}>
          {loading ? 'Loading…' : `${events.length} event${events.length !== 1 ? 's' : ''} on this page`}
        </span>
      </div>

      {/* Table */}
      <div className="m-tbl-wrap">
        <table className="m-tbl">
          <thead>
            <tr>
              <th>Date</th>
              <th>Body region</th>
              <th>Strength</th>
              <th>Matrix</th>
              <th>Outcome</th>
              <th>Adverse events</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr><td colSpan={7} style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--muted)', fontFamily: 'var(--ff)', fontSize: 13 }}>Loading…</td></tr>
            )}
            {!loading && events.length === 0 && (
              <tr>
                <td colSpan={7} style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--muted)', fontFamily: 'var(--ff)', fontSize: 13 }}>
                  No scan events recorded yet.
                </td>
              </tr>
            )}
            {events.map(ev => (
              <tr key={ev._id}>
                <td style={{ whiteSpace: 'nowrap', fontFamily: 'var(--ff)', fontSize: 12.5 }}>{formatDate(ev.createdAt)}</td>
                <td style={{ fontFamily: 'var(--ff)', fontSize: 13 }}>{ev.bodyRegion}</td>
                <td style={{ fontFamily: 'var(--ff)', fontSize: 13 }}>{ev.fieldStrengthUsed}</td>
                <td>
                  <span style={{ fontFamily: 'var(--ff)', fontSize: 12.5, fontWeight: 700, color: verdictColour(ev.resolvedOutcomeCache) }}>{ev.resolvedOutcomeCache}</span>
                </td>
                <td>
                  <span style={{ fontFamily: 'var(--ff)', fontSize: 12.5, fontWeight: 600, color: outcomeColour(ev.outcome) }}>{ev.outcome}</span>
                </td>
                <td style={{ fontFamily: 'var(--ff)', fontSize: 12.5, color: ev.adverseEvents ? 'var(--err)' : 'var(--muted2)' }}>
                  {ev.adverseEvents ? 'Yes' : '—'}
                </td>
                <td className="m-act">
                  <button className="btn" style={{ fontSize: 12.5, padding: '4px 12px' }} onClick={() => setDetailEvent(ev)}>View</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 14 }}>
        <button className="btn" onClick={prevPage} disabled={isFirstPage}>← Previous</button>
        <button className="btn" onClick={nextPage} disabled={isDone || events.length < PAGE_SIZE}>Next →</button>
      </div>

      {detailEvent && <EventDetailModal event={detailEvent} onClose={() => setDetailEvent(null)} />}
    </div>
  )
}
