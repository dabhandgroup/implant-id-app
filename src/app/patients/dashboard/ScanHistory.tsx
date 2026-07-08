'use client'

import { useState }        from 'react'
import { useQuery }        from 'convex/react'
import { api as apiBase }  from '../../../../convex/_generated/api'
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const api = apiBase as any

interface ScanEvent {
  _id:                     string
  bodyRegion:              string
  fieldStrengthUsed:       string
  outcome:                 string
  resolvedOutcomeCache:    string
  resolvedConstraintsJson: string
  adverseEvents?:          string
  scanTimeMins?:           number
  createdAt:               number
}

function formatDate(ts: number) {
  return new Date(ts).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
}

function OutcomeDot({ v }: { v: string }) {
  const c = v === 'Completed' ? 'var(--ok)' : v === 'PASS' ? 'var(--ok)' : v === 'FAIL' ? 'var(--err)' : '#b45309'
  return <span style={{ display:'inline-block', width:8, height:8, borderRadius:'50%', background:c, flexShrink:0, marginTop:3 }} />
}

export default function ScanHistory() {
  const [expanded,   setExpanded]   = useState(false)
  const [cursor,     setCursor]     = useState<string | null>(null)
  const [prevCursor, setPrevCursor] = useState<string | null>(null)

  const result = useQuery(
    api.scanEvents.listMyScanEvents,
    { paginationOpts: { numItems: 5, cursor } },
  ) as { page: ScanEvent[]; isDone: boolean; continueCursor: string } | undefined

  const events  = result?.page ?? []
  const isDone  = result?.isDone ?? true
  const loading = result === undefined

  if (!loading && events.length === 0 && !cursor) return null

  return (
    <div style={{ marginTop: 20 }}>
      <button
        onClick={() => setExpanded(e => !e)}
        style={{ width:'100%', background:'none', border:'none', cursor:'pointer', padding:0, textAlign:'left', display:'flex', alignItems:'center', justifyContent:'space-between' }}
        aria-expanded={expanded}
      >
        <div style={{ fontFamily:'var(--ff)', fontSize:13, fontWeight:700, color:'var(--text)', letterSpacing:'0.2px' }}>
          MRI scan history
        </div>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--muted)" strokeWidth="2" aria-hidden="true"
          style={{ transform: expanded ? 'rotate(180deg)' : 'none', transition:'transform .2s' }}>
          <polyline points="6 9 12 15 18 9"/>
        </svg>
      </button>

      {expanded && (
        <div style={{ marginTop: 10 }}>
          {loading && (
            <div style={{ fontFamily:'var(--ff)', fontSize:12.5, color:'var(--muted)', padding:'10px 0' }}>Loading…</div>
          )}

          {!loading && events.length === 0 && (
            <div style={{ fontFamily:'var(--ff)', fontSize:12.5, color:'var(--muted)', padding:'8px 0' }}>No MRI scans recorded yet.</div>
          )}

          {events.map(ev => {
            let constraints: string[] = []
            try { constraints = JSON.parse(ev.resolvedConstraintsJson) } catch { /**/ }
            return (
              <div key={ev._id} style={{ background:'var(--bg)', border:'1px solid var(--border)', borderRadius:10, padding:'10px 14px', marginBottom:8 }}>
                <div style={{ display:'flex', alignItems:'flex-start', gap:8, marginBottom:4 }}>
                  <OutcomeDot v={ev.resolvedOutcomeCache} />
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ display:'flex', alignItems:'center', gap:8, flexWrap:'wrap' }}>
                      <span style={{ fontFamily:'var(--ff)', fontSize:13, fontWeight:600, color:'var(--text)' }}>{ev.bodyRegion}</span>
                      <span style={{ fontFamily:'var(--ff)', fontSize:12, color:'var(--muted)' }}>{ev.fieldStrengthUsed}</span>
                      <span style={{ fontFamily:'var(--ff)', fontSize:11.5, color:'var(--muted2)' }}>{formatDate(ev.createdAt)}</span>
                    </div>
                    <div style={{ display:'flex', gap:10, marginTop:3, flexWrap:'wrap' }}>
                      <span style={{ fontFamily:'var(--ff)', fontSize:11.5, color: ev.outcome === 'Completed' ? 'var(--ok)' : ev.outcome === 'Aborted' ? 'var(--err)' : '#b45309' }}>
                        {ev.outcome}
                      </span>
                      {ev.adverseEvents && (
                        <span style={{ fontFamily:'var(--ff)', fontSize:11.5, color:'var(--err)' }}>Adverse event reported</span>
                      )}
                    </div>
                    {constraints.length > 0 && (
                      <ul style={{ margin:'6px 0 0', padding:'0 0 0 16px', display:'flex', flexDirection:'column', gap:2 }}>
                        {constraints.map((c, i) => (
                          <li key={i} style={{ fontFamily:'var(--ff)', fontSize:11.5, color:'var(--muted)', lineHeight:1.5 }}>{c}</li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>
              </div>
            )
          })}

          {/* Pagination */}
          {(cursor || !isDone) && (
            <div style={{ display:'flex', gap:8, marginTop:6 }}>
              {cursor && (
                <button className="btn" style={{ fontSize:12, padding:'4px 12px' }} onClick={() => { setCursor(prevCursor); setPrevCursor(null) }}>← Back</button>
              )}
              {!isDone && events.length === 5 && (
                <button className="btn" style={{ fontSize:12, padding:'4px 12px' }} onClick={() => { setPrevCursor(cursor); setCursor(result?.continueCursor ?? null) }}>More →</button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
