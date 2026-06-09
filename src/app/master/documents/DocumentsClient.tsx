'use client'

import { useRouter } from 'next/navigation'
import { useQuery } from 'convex/react'
import { api as apiBase } from '../../../../convex/_generated/api'

// Cast to any — the `documents` module will be in _generated/api after `npx convex deploy`
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const api = apiBase as any

// ── Helpers ───────────────────────────────────────────────────────────────────

function typeColour(type: string) {
  const t = type.toLowerCase()
  if (t.includes('mri') || t.includes('technical manual'))
    return {
      bg: 'color-mix(in srgb,#3b82f6 10%,transparent)',
      border: 'color-mix(in srgb,#3b82f6 25%,transparent)',
      text: '#3b82f6',
    }
  if (t.includes('ifu') || t.includes('instructions for use'))
    return {
      bg: 'color-mix(in srgb,var(--ok) 10%,transparent)',
      border: 'color-mix(in srgb,var(--ok) 25%,transparent)',
      text: 'var(--ok)',
    }
  if (t.includes('submission contract'))
    return {
      bg: 'color-mix(in srgb,var(--accent) 10%,transparent)',
      border: 'color-mix(in srgb,var(--accent) 25%,transparent)',
      text: 'var(--accent)',
    }
  if (t.includes('peer') || t.includes('publication'))
    return {
      bg: 'color-mix(in srgb,#8b5cf6 10%,transparent)',
      border: 'color-mix(in srgb,#8b5cf6 25%,transparent)',
      text: '#8b5cf6',
    }
  return {
    bg: 'color-mix(in srgb,var(--muted) 10%,transparent)',
    border: 'color-mix(in srgb,var(--muted) 25%,transparent)',
    text: 'var(--muted)',
  }
}

function formatDate(dateStr?: string) {
  if (!dateStr) return '—'
  // Accepts YYYY-MM-DD
  const d = new Date(dateStr + 'T00:00:00')
  if (isNaN(d.getTime())) return dateStr
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function DocumentsClient() {
  const router = useRouter()
  const docs = useQuery(api.documents.listDocuments, { limit: 200 })

  return (
    <div className="m-content">
      <div className="m-h">
        <div>
          <h2>Documents</h2>
          <div className="sub">
            Source documents (IFUs, MRI technical manuals, spec sheets) and platform-generated
            submission contracts. Submission contracts include the full device record and
            manufacturer&apos;s electronic signature.
          </div>
        </div>
      </div>

      <div className="m-tbl-toolbar">
        <div className="search">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input type="text" placeholder="Search documents, manufacturers…" />
        </div>
        <button className="m-act">Filter by type</button>
      </div>

      <div className="m-tbl-wrap">
        <table className="m-tbl">
          <thead>
            <tr>
              <th>Document</th>
              <th>Type</th>
              <th>Manufacturer</th>
              <th>Devices</th>
              <th>Date</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {/* Loading skeleton */}
            {docs === undefined && (
              Array.from({ length: 6 }).map((_, i) => (
                <tr key={i}>
                  <td colSpan={6}>
                    <div style={{ height: 18, borderRadius: 6, background: 'var(--border)', opacity: 0.5 }} />
                  </td>
                </tr>
              ))
            )}

            {/* Empty state */}
            {docs !== undefined && docs.length === 0 && (
              <tr>
                <td colSpan={6} style={{ textAlign: 'center', color: 'var(--muted)', padding: '32px 0', fontSize: 14 }}>
                  No documents yet. Run the seed to populate the document library.
                </td>
              </tr>
            )}

            {/* Real rows */}
            {docs && docs.map(doc => {
              const colours = typeColour(doc.docType)
              const deviceLabel = doc.deviceNames?.slice(0, 2).join(', ') +
                (doc.deviceNames?.length > 2 ? ` +${doc.deviceNames.length - 2}` : '')
              const dateLabel = formatDate(doc.documentDate || doc.dateRetrieved)

              return (
                <tr
                  key={doc._id}
                  onClick={() => router.push(`/master/documents/${doc._id}`)}
                  style={{ cursor: 'pointer' }}
                >
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div
                        style={{
                          width: 28,
                          height: 28,
                          borderRadius: 7,
                          background: 'color-mix(in srgb,var(--accent) 10%,transparent)',
                          display: 'grid',
                          placeItems: 'center',
                          flexShrink: 0,
                        }}
                      >
                        <svg
                          width="13"
                          height="13"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="var(--accent)"
                          strokeWidth="1.7"
                        >
                          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                          <polyline points="14 2 14 8 20 8" />
                        </svg>
                      </div>
                      <span
                        style={{
                          fontFamily: 'var(--ff)',
                          fontSize: 13,
                          fontWeight: 500,
                          color: 'var(--text)',
                        }}
                      >
                        {doc.title}
                      </span>
                    </div>
                  </td>
                  <td>
                    <span
                      style={{
                        fontFamily: 'var(--ff)',
                        fontSize: 11.5,
                        fontWeight: 600,
                        background: colours.bg,
                        border: `1px solid ${colours.border}`,
                        color: colours.text,
                        borderRadius: 7,
                        padding: '3px 9px',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {doc.docType}
                    </span>
                  </td>
                  <td style={{ color: 'var(--muted)' }}>{doc.manufacturer}</td>
                  <td style={{ color: 'var(--muted)', fontSize: 12 }}>{deviceLabel || '—'}</td>
                  <td style={{ color: 'var(--muted)' }}>{dateLabel}</td>
                  <td onClick={e => e.stopPropagation()}>
                    <a
                      href={`/master/documents/${doc._id}`}
                      className="m-act"
                      style={{ textDecoration: 'none', display: 'inline-block' }}
                    >
                      View →
                    </a>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
