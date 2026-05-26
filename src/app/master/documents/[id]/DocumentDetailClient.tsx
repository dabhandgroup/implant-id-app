'use client'

import { useState } from 'react'

interface DocRecord {
  id: string
  name: string
  type: string
  manufacturer: string
  device: string
  uploaded: string
  uploadedBy: string
  pages: number
  size: string
  refNumber: string
  description: string
}

const docData: Record<string, DocRecord> = {
  '1': {
    id: '1',
    name: 'Medtronic_Micra_AV_MRI_Conditions.pdf',
    type: 'MRI Conditions',
    manufacturer: 'Medtronic plc',
    device: 'Micra AV Pacemaker',
    uploaded: '12 Jan 2026',
    uploadedBy: 'James Thornton',
    pages: 14,
    size: '2.1 MB',
    refNumber: 'DOC-MDT-MICRA-AV-MRI-001',
    description:
      'MRI conditional parameters for the Micra AV Pacemaker including field strength limits, SAR thresholds, and approved scan orientations. Applicable to model MDT-MICRA-AV2 only.',
  },
  '2': {
    id: '2',
    name: 'ZimmerBiomet_Oxford_Knee_IFU.pdf',
    type: 'Instructions for Use',
    manufacturer: 'Zimmer Biomet',
    device: 'Oxford Knee System',
    uploaded: '16 Jan 2026',
    uploadedBy: 'Sarah Mitchell',
    pages: 42,
    size: '5.8 MB',
    refNumber: 'DOC-ZB-OX-IFU-2026',
    description:
      'Complete instructions for use for the Oxford Partial Knee unicompartmental replacement system. Includes surgical technique, implant sizing guide, and post-operative care instructions.',
  },
  '3': {
    id: '3',
    name: 'Stryker_Tritanium_PL_ProductLeaflet.pdf',
    type: 'Product Leaflet',
    manufacturer: 'Stryker Orthopaedics',
    device: 'Tritanium PL Cage',
    uploaded: '22 Feb 2026',
    uploadedBy: 'David Chen',
    pages: 8,
    size: '1.3 MB',
    refNumber: 'DOC-STR-TT-PL-LEAF-002',
    description:
      'Product leaflet for the Tritanium PL Posterior Lumbar Cage detailing design features, materials, and intended use. For surgeon and hospital reference only.',
  },
  '4': {
    id: '4',
    name: 'Medtronic_RevealLINQ_IFU.pdf',
    type: 'Instructions for Use',
    manufacturer: 'Medtronic plc',
    device: 'Reveal LINQ ICM',
    uploaded: '12 Jan 2026',
    uploadedBy: 'James Thornton',
    pages: 28,
    size: '3.4 MB',
    refNumber: 'DOC-MDT-LINQ-IFU-2026',
    description:
      'Full instructions for use for the Reveal LINQ Insertable Cardiac Monitor. Covers implantation procedure, remote monitoring setup, and patient guidance materials.',
  },
  '5': {
    id: '5',
    name: 'Zimmer_PersonaKnee_MRI_Cert.pdf',
    type: 'MRI Conditions',
    manufacturer: 'Zimmer Biomet',
    device: 'Persona Knee System',
    uploaded: '18 Jan 2026',
    uploadedBy: 'Sarah Mitchell',
    pages: 10,
    size: '1.7 MB',
    refNumber: 'DOC-ZB-PK-MRI-CERT-001',
    description:
      'MRI certification document for the Persona Total Knee System confirming MR safe classification. No scan restrictions apply; all field strengths and orientations permitted.',
  },
  '6': {
    id: '6',
    name: 'Stryker_Accolade2_DeviceContract.pdf',
    type: 'Device Contract',
    manufacturer: 'Stryker Orthopaedics',
    device: 'Accolade II Hip Stem',
    uploaded: '22 Feb 2026',
    uploadedBy: 'David Chen',
    pages: 6,
    size: '0.9 MB',
    refNumber: 'DOC-STR-ACD2-CONTRACT-001',
    description:
      'Signed device submission contract for the Accolade II Hip Stem. Contains full device record, manufacturer attestation, and electronic signature of the authorised submitter.',
  },
}

interface Comment {
  id: number
  author: string
  initials: string
  role: string
  time: string
  text: string
}

const initialComments: Comment[] = [
  {
    id: 1,
    author: 'Eleanor Fawcett',
    initials: 'EF',
    role: 'Compliance Lead',
    time: '2 days ago',
    text: 'MRI parameters reviewed and confirmed against the manufacturer\'s published labelling. SAR limits are within acceptable range for clinical use.',
  },
  {
    id: 2,
    author: 'Marcus Webb',
    initials: 'MW',
    role: 'Master Admin',
    time: '1 day ago',
    text: 'Cross-referenced with the TGA database entry. Document version matches the current regulatory clearance. Approved for publication.',
  },
]

function typeColour(type: string) {
  if (type === 'MRI Conditions')
    return {
      bg: 'color-mix(in srgb,#3b82f6 10%,transparent)',
      border: 'color-mix(in srgb,#3b82f6 25%,transparent)',
      text: '#3b82f6',
    }
  if (type === 'Instructions for Use')
    return {
      bg: 'color-mix(in srgb,var(--ok) 10%,transparent)',
      border: 'color-mix(in srgb,var(--ok) 25%,transparent)',
      text: 'var(--ok)',
    }
  if (type === 'Device Contract')
    return {
      bg: 'color-mix(in srgb,var(--accent) 10%,transparent)',
      border: 'color-mix(in srgb,var(--accent) 25%,transparent)',
      text: 'var(--accent)',
    }
  return {
    bg: 'color-mix(in srgb,var(--muted) 10%,transparent)',
    border: 'color-mix(in srgb,var(--muted) 25%,transparent)',
    text: 'var(--muted)',
  }
}

export default function DocumentDetailClient({ id }: { id: string }) {
  const [comments, setComments] = useState<Comment[]>(initialComments)
  const [newComment, setNewComment] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const doc = docData[id]

  if (!doc) {
    return (
      <div className="m-content">
        <a href="/master/documents" className="m-back">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="15 18 9 12 15 6" />
          </svg>
          Back to Documents
        </a>
        <div className="m-h">
          <div>
            <h2>Document</h2>
            <div className="sub">ID: {id}</div>
          </div>
        </div>
        <p style={{ color: 'var(--muted)', fontFamily: 'var(--fb)', fontSize: 14 }}>
          Document not found.
        </p>
      </div>
    )
  }

  const colours = typeColour(doc.type)

  async function handleAddComment() {
    if (!newComment.trim()) return
    setSubmitting(true)
    await new Promise(r => setTimeout(r, 600))
    const next: Comment = {
      id: Date.now(),
      author: 'Master Admin',
      initials: 'MA',
      role: 'Master Admin',
      time: 'Just now',
      text: newComment.trim(),
    }
    setComments(prev => [...prev, next])
    setNewComment('')
    setSubmitting(false)
  }

  return (
    <div className="m-content">
      <a href="/master/documents" className="m-back">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <polyline points="15 18 9 12 15 6" />
        </svg>
        Back to Documents
      </a>

      {/* ── Header card ── */}
      <div
        style={{
          background: 'var(--bg2)',
          border: '1px solid var(--border)',
          borderRadius: 16,
          padding: '24px 28px',
          marginBottom: 16,
          display: 'flex',
          alignItems: 'flex-start',
          gap: 18,
        }}
      >
        {/* PDF icon */}
        <div
          style={{
            width: 52,
            height: 52,
            borderRadius: 13,
            background: 'color-mix(in srgb,var(--err) 10%,transparent)',
            border: '1.5px solid color-mix(in srgb,var(--err) 22%,transparent)',
            display: 'grid',
            placeItems: 'center',
            flexShrink: 0,
          }}
        >
          <svg
            width="22"
            height="22"
            viewBox="0 0 24 24"
            fill="none"
            stroke="var(--err)"
            strokeWidth="1.7"
          >
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <polyline points="14 2 14 8 20 8" />
            <line x1="16" y1="13" x2="8" y2="13" />
            <line x1="16" y1="17" x2="8" y2="17" />
            <polyline points="10 9 9 9 8 9" />
          </svg>
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              fontFamily: 'var(--ff)',
              fontSize: 17,
              fontWeight: 600,
              color: 'var(--text)',
              marginBottom: 8,
              wordBreak: 'break-all',
            }}
          >
            {doc.name}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
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
              }}
            >
              {doc.type}
            </span>
            <span style={{ fontFamily: 'var(--fb)', fontSize: 13, color: 'var(--muted)' }}>
              {doc.manufacturer}
            </span>
            <span style={{ color: 'var(--muted2)', fontSize: 13 }}>·</span>
            <span style={{ fontFamily: 'var(--fb)', fontSize: 13, color: 'var(--muted)' }}>
              {doc.device}
            </span>
          </div>
        </div>
      </div>

      {/* ── Two-column layout ── */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 320px',
          gap: 16,
          alignItems: 'start',
        }}
      >
        {/* Left: PDF placeholder + comments */}
        <div>
          {/* PDF viewer placeholder */}
          <div
            style={{
              background: 'var(--bg2)',
              border: '1px solid var(--border)',
              borderRadius: 14,
              marginBottom: 16,
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                padding: '12px 18px',
                borderBottom: '1px solid var(--border)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <div
                style={{
                  fontFamily: 'var(--ff)',
                  fontSize: 12,
                  fontWeight: 600,
                  color: 'var(--muted)',
                  letterSpacing: '0.8px',
                  textTransform: 'uppercase',
                }}
              >
                Document Preview
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <span
                  style={{ fontFamily: 'var(--ff)', fontSize: 12, color: 'var(--muted2)' }}
                >
                  {doc.pages} pages · {doc.size}
                </span>
              </div>
            </div>

            {/* PDF viewer body */}
            <div
              style={{
                height: 480,
                background:
                  'repeating-linear-gradient(0deg, color-mix(in srgb,var(--border) 40%,transparent) 0px, color-mix(in srgb,var(--border) 40%,transparent) 1px, transparent 1px, transparent 32px), var(--bg)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 14,
              }}
            >
              <div
                style={{
                  width: 64,
                  height: 64,
                  borderRadius: 16,
                  background: 'color-mix(in srgb,var(--err) 10%,transparent)',
                  border: '1.5px solid color-mix(in srgb,var(--err) 22%,transparent)',
                  display: 'grid',
                  placeItems: 'center',
                }}
              >
                <svg
                  width="30"
                  height="30"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="var(--err)"
                  strokeWidth="1.5"
                >
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                  <polyline points="14 2 14 8 20 8" />
                  <line x1="16" y1="13" x2="8" y2="13" />
                  <line x1="16" y1="17" x2="8" y2="17" />
                </svg>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div
                  style={{
                    fontFamily: 'var(--ff)',
                    fontSize: 14,
                    fontWeight: 600,
                    color: 'var(--text)',
                    marginBottom: 4,
                  }}
                >
                  {doc.name}
                </div>
                <div
                  style={{ fontFamily: 'var(--fb)', fontSize: 13, color: 'var(--muted)' }}
                >
                  PDF · {doc.pages} pages · {doc.size}
                </div>
              </div>
              <div
                style={{
                  fontFamily: 'var(--fb)',
                  fontSize: 12.5,
                  color: 'var(--muted2)',
                  textAlign: 'center',
                  maxWidth: 300,
                  lineHeight: 1.6,
                }}
              >
                In-browser PDF preview will be available once documents are connected to cloud storage.
              </div>
            </div>
          </div>

          {/* ── Review comments ── */}
          <div
            style={{
              background: 'var(--bg2)',
              border: '1px solid var(--border)',
              borderRadius: 14,
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                padding: '14px 20px',
                borderBottom: '1px solid var(--border)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <div
                style={{ fontFamily: 'var(--ff)', fontSize: 14, fontWeight: 600, color: 'var(--text)' }}
              >
                Review Comments
              </div>
              <span
                style={{
                  fontFamily: 'var(--ff)',
                  fontSize: 11,
                  fontWeight: 600,
                  background: 'color-mix(in srgb,var(--accent) 10%,transparent)',
                  color: 'var(--accent)',
                  borderRadius: 5,
                  padding: '2px 8px',
                }}
              >
                {comments.length}
              </span>
            </div>

            {/* Comments list */}
            <div>
              {comments.map(c => (
                <div
                  key={c.id}
                  style={{
                    padding: '16px 20px',
                    borderBottom: '1px solid var(--border)',
                    display: 'flex',
                    gap: 12,
                    alignItems: 'flex-start',
                  }}
                >
                  <div
                    style={{
                      width: 34,
                      height: 34,
                      borderRadius: '50%',
                      background: 'linear-gradient(140deg,var(--accent),var(--accent2))',
                      display: 'grid',
                      placeItems: 'center',
                      color: '#fff',
                      fontFamily: 'var(--ff)',
                      fontSize: 11,
                      fontWeight: 700,
                      flexShrink: 0,
                    }}
                  >
                    {c.initials}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                      <span
                        style={{ fontFamily: 'var(--ff)', fontSize: 13.5, fontWeight: 600, color: 'var(--text)' }}
                      >
                        {c.author}
                      </span>
                      <span
                        style={{
                          fontFamily: 'var(--ff)',
                          fontSize: 10.5,
                          fontWeight: 600,
                          background: 'color-mix(in srgb,var(--text) 5%,transparent)',
                          color: 'var(--muted)',
                          borderRadius: 4,
                          padding: '1px 6px',
                        }}
                      >
                        {c.role}
                      </span>
                      <span
                        style={{ fontFamily: 'var(--fb)', fontSize: 12, color: 'var(--muted2)', marginLeft: 'auto' }}
                      >
                        {c.time}
                      </span>
                    </div>
                    <p
                      style={{
                        fontFamily: 'var(--fb)',
                        fontSize: 13.5,
                        color: 'var(--text)',
                        lineHeight: 1.6,
                        margin: 0,
                      }}
                    >
                      {c.text}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            {/* Add comment */}
            <div style={{ padding: '16px 20px', display: 'flex', gap: 12, alignItems: 'flex-start' }}>
              <div
                style={{
                  width: 34,
                  height: 34,
                  borderRadius: '50%',
                  background: 'linear-gradient(140deg,var(--accent),var(--accent2))',
                  display: 'grid',
                  placeItems: 'center',
                  color: '#fff',
                  fontFamily: 'var(--ff)',
                  fontSize: 11,
                  fontWeight: 700,
                  flexShrink: 0,
                }}
              >
                MA
              </div>
              <div style={{ flex: 1 }}>
                <textarea
                  className="input"
                  placeholder="Add a review comment…"
                  value={newComment}
                  onChange={e => setNewComment(e.target.value)}
                  rows={3}
                  style={{ resize: 'vertical', marginBottom: 8 }}
                />
                <button
                  className="btn btn-s"
                  onClick={handleAddComment}
                  disabled={!newComment.trim() || submitting}
                >
                  {submitting ? 'Adding…' : 'Add Comment'}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Right: metadata cards */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {/* Document info */}
          <div
            style={{
              background: 'var(--bg2)',
              border: '1px solid var(--border)',
              borderRadius: 13,
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                padding: '12px 16px',
                borderBottom: '1px solid var(--border)',
                fontFamily: 'var(--ff)',
                fontSize: 11,
                fontWeight: 700,
                letterSpacing: '1.1px',
                textTransform: 'uppercase',
                color: 'var(--muted2)',
              }}
            >
              Document Info
            </div>
            <div style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 12 }}>
              {[
                { k: 'Reference Number', v: doc.refNumber },
                { k: 'Manufacturer', v: doc.manufacturer },
                { k: 'Device', v: doc.device },
                { k: 'Uploaded', v: doc.uploaded },
                { k: 'Uploaded By', v: doc.uploadedBy },
                { k: 'Pages', v: String(doc.pages) },
                { k: 'File Size', v: doc.size },
              ].map(row => (
                <div key={row.k}>
                  <div
                    style={{ fontFamily: 'var(--ff)', fontSize: 10.5, color: 'var(--muted2)', marginBottom: 2 }}
                  >
                    {row.k}
                  </div>
                  <div style={{ fontFamily: 'var(--fb)', fontSize: 13.5, color: 'var(--text)' }}>
                    {row.v}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Description */}
          <div
            style={{
              background: 'var(--bg2)',
              border: '1px solid var(--border)',
              borderRadius: 13,
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                padding: '12px 16px',
                borderBottom: '1px solid var(--border)',
                fontFamily: 'var(--ff)',
                fontSize: 11,
                fontWeight: 700,
                letterSpacing: '1.1px',
                textTransform: 'uppercase',
                color: 'var(--muted2)',
              }}
            >
              Description
            </div>
            <p
              style={{
                padding: '14px 16px',
                fontFamily: 'var(--fb)',
                fontSize: 13,
                color: 'var(--text)',
                lineHeight: 1.65,
                margin: 0,
              }}
            >
              {doc.description}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
