'use client'
import { useState, useRef }         from 'react'
import { useQuery, useMutation }    from 'convex/react'
import { useRouter }                from 'next/navigation'
import { api as apiBase }           from '../../../../convex/_generated/api'
import { CustomSelect }             from '@/components/ui/CustomSelect'

const api = apiBase as any

type Tab = 'pending' | 'active' | 'all'

const DOC_TYPES = [
  { value: 'surgical_notes', label: 'Surgical notes'   },
  { value: 'implant_card',   label: 'Implant card scan' },
  { value: 'consent',        label: 'Consent form'     },
  { value: 'other',          label: 'Other'             },
]

function formatDate(ts: number) {
  return new Date(ts).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
}

// ── Sign-off confirmation modal ────────────────────────────────────────────────

function SignOffModal({
  patient,
  onConfirm,
  onClose,
  loading,
}: {
  patient: any
  onConfirm: () => void
  onClose: () => void
  loading: boolean
}) {
  return (
    <div
      className="logout-back open"
      onClick={() => !loading && onClose()}
      role="dialog"
      aria-modal="true"
      aria-label="Sign off patient"
    >
      <div className="logout-modal" onClick={(e) => e.stopPropagation()}>
        <div className="logout-body">
          <div style={{
            width: 44, height: 44, borderRadius: '50%',
            background: 'rgba(var(--ok-rgb),0.12)',
            display: 'grid', placeItems: 'center', margin: '0 auto 14px',
          }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--ok)" strokeWidth="2" aria-hidden="true">
              <path d="m9 12 2 2 4-4"/><circle cx="12" cy="12" r="9"/>
            </svg>
          </div>
          <h3 style={{ fontFamily: 'var(--ff)', fontSize: 17, fontWeight: 600, marginBottom: 6, color: 'var(--text)' }}>
            Sign off patient record
          </h3>
          <p style={{ fontSize: 13.5, color: 'var(--muted)', margin: '0 auto', maxWidth: 300, lineHeight: 1.5 }}>
            Confirm that <strong>{patient.firstName} {patient.lastName}</strong>&apos;s implant
            record has been reviewed and verified. This will mark the record as <strong>Active</strong>.
          </p>
        </div>
        <div className="logout-actions">
          <button className="btn" onClick={onClose} disabled={loading}>Cancel</button>
          <button className="btn btn-s" onClick={onConfirm} disabled={loading}>
            {loading ? 'Signing off…' : 'Confirm sign-off'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Document upload modal ──────────────────────────────────────────────────────

function DocsModal({
  patient,
  onClose,
}: {
  patient: any
  onClose: () => void
}) {
  const fileRef                          = useRef<HTMLInputElement>(null)
  const [docType,    setDocType]         = useState<string>('surgical_notes')
  const [notes,      setNotes]           = useState('')
  const [uploading,  setUploading]       = useState(false)
  const [error,      setError]           = useState<string | null>(null)
  const [deleting,   setDeleting]        = useState<string | null>(null)

  const docs           = useQuery(api.surgeonDocuments.listDocuments, { patientId: patient._id })
  const generateUrl    = useMutation(api.surgeonDocuments.generateUploadUrl)
  const saveDocument   = useMutation(api.surgeonDocuments.saveDocument)
  const deleteDocument = useMutation(api.surgeonDocuments.deleteDocument)

  async function handleUpload() {
    const file = fileRef.current?.files?.[0]
    if (!file) return
    setUploading(true)
    setError(null)
    try {
      const uploadUrl = await generateUrl()
      const resp      = await fetch(uploadUrl, {
        method:  'POST',
        headers: { 'Content-Type': file.type },
        body:    file,
      })
      if (!resp.ok) throw new Error('Upload failed')
      const { storageId } = await resp.json()
      await saveDocument({
        patientId: patient._id,
        storageId,
        docType:   docType as any,
        fileName:  file.name,
        notes:     notes.trim() || undefined,
      })
      if (fileRef.current) fileRef.current.value = ''
      setNotes('')
    } catch {
      setError('Upload failed. Please try again.')
    } finally {
      setUploading(false)
    }
  }

  async function handleDelete(docId: string) {
    setDeleting(docId)
    try {
      await deleteDocument({ documentId: docId as any })
    } finally {
      setDeleting(null)
    }
  }

  function docTypeLabel(type: string) {
    return DOC_TYPES.find((d) => d.value === type)?.label ?? type
  }

  return (
    <div
      className="logout-back open"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Patient documents"
    >
      <div
        className="logout-modal"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: 520, width: '100%' }}
      >
        {/* Header */}
        <div style={{ padding: '20px 24px 16px', borderBottom: '1px solid var(--border)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontFamily: 'var(--ff)', fontSize: 15, fontWeight: 600, color: 'var(--text)', marginBottom: 2 }}>
                Documents — {patient.firstName} {patient.lastName}
              </div>
              <div style={{ fontSize: 12.5, color: 'var(--muted)', fontFamily: 'var(--ff)' }}>
                {patient.implantIdCode}
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)', padding: 4 }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                <line x1="18" y1="6" x2="6" y2="18"/>
                <line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>
          </div>
        </div>

        {/* Existing docs */}
        <div style={{ padding: '16px 24px', maxHeight: 260, overflowY: 'auto' }}>
          {docs === undefined && (
            <div style={{ color: 'var(--muted)', fontSize: 13.5, fontFamily: 'var(--ff)' }}>Loading&hellip;</div>
          )}
          {docs !== undefined && docs.length === 0 && (
            <div style={{ color: 'var(--muted2)', fontSize: 13.5, fontFamily: 'var(--ff)', textAlign: 'center', padding: '16px 0' }}>
              No documents uploaded yet.
            </div>
          )}
          {docs && docs.map((doc: any) => (
            <div
              key={doc._id}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                gap: 12, padding: '10px 0',
                borderBottom: '1px solid var(--border)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
                <div style={{
                  width: 34, height: 34, borderRadius: 8, flexShrink: 0,
                  background: 'rgba(var(--accent-rgb),0.10)',
                  display: 'grid', placeItems: 'center',
                }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="1.7" aria-hidden="true">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                    <polyline points="14 2 14 8 20 8"/>
                  </svg>
                </div>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontFamily: 'var(--ff)', fontSize: 13, fontWeight: 500, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {doc.fileName}
                  </div>
                  <div style={{ fontSize: 11.5, color: 'var(--muted)', fontFamily: 'var(--ff)' }}>
                    {docTypeLabel(doc.docType)} &middot; {formatDate(doc.uploadedAt)}
                  </div>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                {doc.url && (
                  <a
                    href={doc.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn"
                    style={{ fontSize: 12, padding: '4px 10px', textDecoration: 'none' }}
                    aria-label={`Download ${doc.fileName}`}
                  >
                    Download
                  </a>
                )}
                <button
                  type="button"
                  className="btn btn-danger"
                  style={{ fontSize: 12, padding: '4px 10px' }}
                  onClick={() => handleDelete(doc._id)}
                  disabled={deleting === doc._id}
                  aria-label={`Delete ${doc.fileName}`}
                >
                  {deleting === doc._id ? '…' : 'Delete'}
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Upload form */}
        <div style={{ padding: '16px 24px 20px', borderTop: '1px solid var(--border)' }}>
          <div style={{ fontFamily: 'var(--ff)', fontSize: 12.5, fontWeight: 600, color: 'var(--muted)', marginBottom: 10, letterSpacing: '.2px', textTransform: 'uppercase' as const }}>
            Upload document
          </div>

          {error && (
            <div style={{
              background: 'rgba(var(--err-rgb),0.08)',
              border: '1px solid rgba(var(--err-rgb),0.20)',
              borderRadius: 8, padding: '8px 12px',
              fontFamily: 'var(--ff)', fontSize: 13, color: 'var(--err)',
              marginBottom: 10,
            }}>
              {error}
            </div>
          )}

          <CustomSelect
            label="Document type"
            value={docType}
            onChange={setDocType}
            options={DOC_TYPES.map((t) => ({ label: t.label, value: t.value }))}
          />

          <div className="field" style={{ marginBottom: 10 }}>
            <label style={{ fontFamily: 'var(--ff)', fontSize: 12.5, fontWeight: 500, color: 'var(--muted)', display: 'block', marginBottom: 4 }}>
              File <span style={{ color: 'var(--err)', marginLeft: 3 }}>*</span>
            </label>
            <input
              ref={fileRef}
              type="file"
              accept=".pdf,.jpg,.jpeg,.png,.webp"
              className="input"
              style={{ fontFamily: 'var(--ff)', fontSize: 13, cursor: 'pointer' }}
              aria-label="Choose file to upload"
            />
          </div>

          <div className="field" style={{ marginBottom: 14 }}>
            <label style={{ fontFamily: 'var(--ff)', fontSize: 12.5, fontWeight: 500, color: 'var(--muted)', display: 'block', marginBottom: 4 }}>
              Notes (optional)
            </label>
            <input
              type="text"
              className="input"
              placeholder="e.g. Pre-op consent signed 12 Jun 2026"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              style={{ fontFamily: 'var(--ff)', fontSize: 13.5 }}
            />
          </div>

          <button
            type="button"
            className="btn btn-s btn-block"
            onClick={handleUpload}
            disabled={uploading}
          >
            {uploading ? 'Uploading…' : 'Upload document'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Main patients list ─────────────────────────────────────────────────────────

export default function SurgeonPatientsClient() {
  const router   = useRouter()
  const patients = useQuery(api.patients.getSurgeonPatients)

  const [search,     setSearch]     = useState('')
  const [activeTab,  setActiveTab]  = useState<Tab>('pending')
  const [signOffFor, setSignOffFor] = useState<any | null>(null)
  const [docsFor,    setDocsFor]    = useState<any | null>(null)
  const [signing,    setSigning]    = useState(false)
  const [signErr,    setSignErr]    = useState<string | null>(null)

  const verifyPatient = useMutation(api.patients.verifyPatient)

  const searched = (patients ?? []).filter((p: any) =>
    !search.trim() ||
    `${p.firstName} ${p.lastName}`.toLowerCase().includes(search.toLowerCase()) ||
    p.implantIdCode.toLowerCase().includes(search.toLowerCase()) ||
    p.selfReportedDevice?.toLowerCase().includes(search.toLowerCase())
  )

  const pendingCount = (patients ?? []).filter((p: any) => p.verificationStatus !== 'active').length
  const activeCount  = (patients ?? []).filter((p: any) => p.verificationStatus === 'active').length

  const tabFiltered =
    activeTab === 'pending' ? searched.filter((p: any) => p.verificationStatus !== 'active') :
    activeTab === 'active'  ? searched.filter((p: any) => p.verificationStatus === 'active') :
    searched

  async function handleSignOff() {
    if (!signOffFor) return
    setSigning(true)
    setSignErr(null)
    try {
      await verifyPatient({ patientId: signOffFor._id })
      setSignOffFor(null)
    } catch {
      setSignErr('Sign-off failed. Please try again.')
    } finally {
      setSigning(false)
    }
  }

  const TABS: { key: Tab; label: string; count: number | null }[] = [
    { key: 'pending', label: 'Awaiting review', count: pendingCount },
    { key: 'active',  label: 'Verified',        count: activeCount  },
    { key: 'all',     label: 'All patients',    count: null         },
  ]

  return (
    <div className="m-content">

      {/* Header */}
      <div className="m-h">
        <div>
          <h2>My Patients</h2>
          <div className="sub">Patients who have shared their record with your clinic.</div>
        </div>
        <a href="/surgeons/scan" className="btn btn-s" style={{ textDecoration: 'none' }}>
          Look up patient
        </a>
      </div>

      {/* Search */}
      <div style={{ position: 'relative', marginBottom: 16, maxWidth: 400 }}>
        <svg
          style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', width: 15, height: 15, color: 'var(--muted2)', pointerEvents: 'none' }}
          viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"
          aria-hidden="true"
        >
          <circle cx="11" cy="11" r="8"/>
          <line x1="21" y1="21" x2="16.65" y2="16.65"/>
        </svg>
        <input
          className="input"
          type="text"
          placeholder="Search by name or Implant ID…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ paddingLeft: 40 }}
          aria-label="Search patients"
        />
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 2, marginBottom: 20, borderBottom: '1px solid var(--border)' }}>
        {TABS.map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setActiveTab(tab.key)}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              fontFamily: 'var(--ff)',
              fontSize: 13.5,
              fontWeight: activeTab === tab.key ? 600 : 400,
              color: activeTab === tab.key ? 'var(--text)' : 'var(--muted)',
              padding: '10px 16px',
              borderBottom: activeTab === tab.key ? '2px solid var(--accent)' : '2px solid transparent',
              marginBottom: '-1px',
              transition: 'color .12s',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
            }}
          >
            {tab.label}
            {tab.count !== null && tab.count > 0 && (
              <span style={{
                fontFamily: 'var(--ff)',
                fontSize: 11,
                fontWeight: 600,
                padding: '1px 6px',
                borderRadius: 99,
                background: tab.key === 'pending'
                  ? 'rgba(245,158,11,0.15)'
                  : 'rgba(var(--ok-rgb),0.12)',
                color: tab.key === 'pending' ? '#92400e' : 'var(--ok)',
              }}>
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Loading */}
      {patients === undefined && (
        <div style={{ color: 'var(--muted)', fontSize: 14, padding: '32px 0', fontFamily: 'var(--ff)' }}>
          Loading&hellip;
        </div>
      )}

      {/* Empty */}
      {patients !== undefined && tabFiltered.length === 0 && (
        <div style={{
          background: 'var(--bg2)',
          border: '1px solid var(--border)',
          borderRadius: 14,
          padding: '48px 24px',
          textAlign: 'center',
        }}>
          <div style={{ fontFamily: 'var(--ff)', fontSize: 15, fontWeight: 500, color: 'var(--text)', marginBottom: 6 }}>
            {search
              ? 'No patients found'
              : activeTab === 'pending'
                ? 'No patients awaiting review'
                : activeTab === 'active'
                  ? 'No verified patients yet'
                  : 'No patients yet'}
          </div>
          <p style={{ color: 'var(--muted)', fontSize: 13.5, margin: 0 }}>
            {search
              ? 'Try a different search term.'
              : 'Patients will appear here when they share their record with your clinic.'}
          </p>
        </div>
      )}

      {/* Table */}
      {tabFiltered.length > 0 && (
        <div className="m-tbl-wrap">
          <table className="m-tbl">
            <thead>
              <tr>
                <th>Implant ID</th>
                <th>Name</th>
                <th>Device</th>
                <th>Status</th>
                <th>Shared</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {tabFiltered.map((p: any) => (
                <tr key={p._id}>
                  <td
                    style={{ fontFamily: 'SF Mono,Monaco,monospace', fontWeight: 600, color: 'var(--accent)', fontSize: 13, cursor: 'pointer' }}
                    onClick={() => router.push('/surgeons/scan?code=' + p.implantIdCode)}
                    tabIndex={0}
                    onKeyDown={(e) => { if (e.key === 'Enter') router.push('/surgeons/scan?code=' + p.implantIdCode) }}
                    aria-label={`Look up ${p.implantIdCode}`}
                  >
                    {p.implantIdCode}
                  </td>
                  <td style={{ fontWeight: 500 }}>{p.firstName} {p.lastName}</td>
                  <td style={{ color: 'var(--muted)' }}>{p.selfReportedDevice ?? '—'}</td>
                  <td>
                    <span style={{
                      fontFamily: 'var(--ff)',
                      fontSize: 11.5,
                      fontWeight: 600,
                      padding: '2px 8px',
                      borderRadius: 5,
                      background: p.verificationStatus === 'active'
                        ? 'rgba(var(--ok-rgb),0.10)'
                        : 'rgba(245,158,11,0.10)',
                      color: p.verificationStatus === 'active' ? 'var(--ok)' : '#92400e',
                      border: p.verificationStatus === 'active'
                        ? '1px solid rgba(var(--ok-rgb),0.25)'
                        : '1px solid rgba(245,158,11,0.25)',
                    }}>
                      {p.verificationStatus === 'active' ? 'Verified' : 'Awaiting review'}
                    </span>
                  </td>
                  <td style={{ color: 'var(--muted)', fontSize: 12, whiteSpace: 'nowrap' }}>
                    {p.lastAccessed ? formatDate(p.lastAccessed) : '—'}
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                      <button
                        type="button"
                        className="btn"
                        style={{ fontSize: 12, padding: '4px 10px', whiteSpace: 'nowrap' }}
                        onClick={() => setDocsFor(p)}
                        aria-label={`Documents for ${p.firstName} ${p.lastName}`}
                      >
                        Documents
                      </button>
                      {p.verificationStatus !== 'active' && (
                        <button
                          type="button"
                          className="btn btn-s"
                          style={{ fontSize: 12, padding: '4px 10px', whiteSpace: 'nowrap' }}
                          onClick={() => { setSignOffFor(p); setSignErr(null) }}
                          aria-label={`Sign off ${p.firstName} ${p.lastName}`}
                        >
                          Sign off
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Sign-off error banner (shown if modal was dismissed after error) */}
      {signErr && !signOffFor && (
        <div style={{
          marginTop: 16,
          background: 'rgba(var(--err-rgb),0.08)',
          border: '1px solid rgba(var(--err-rgb),0.20)',
          borderRadius: 8, padding: '10px 14px',
          fontFamily: 'var(--ff)', fontSize: 13.5, color: 'var(--err)',
        }}>
          {signErr}
        </div>
      )}

      {/* Modals */}
      {signOffFor && (
        <SignOffModal
          patient={signOffFor}
          onConfirm={handleSignOff}
          onClose={() => { setSignOffFor(null); setSignErr(null) }}
          loading={signing}
        />
      )}

      {docsFor && (
        <DocsModal
          patient={docsFor}
          onClose={() => setDocsFor(null)}
        />
      )}

    </div>
  )
}
