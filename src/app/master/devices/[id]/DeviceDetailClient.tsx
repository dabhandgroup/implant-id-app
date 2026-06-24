'use client'

import { useState }    from 'react'
import { useQuery, useMutation } from 'convex/react'
import { useRouter }   from 'next/navigation'
import { api as apiBase } from '../../../../../convex/_generated/api'
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const api = apiBase as any

// Click-to-copy badge for the device code
function CopyBadge({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)
  return (
    <button
      onClick={() => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 1800) }}
      title="Copy Implant ID device code"
      aria-label={`Copy device code ${text}`}
      style={{ display:'inline-flex', alignItems:'center', gap:8, fontFamily:'SF Mono,Monaco,monospace', fontSize:15, fontWeight:700, letterSpacing:'.08em', color:'var(--accent-deep)', background:'color-mix(in srgb,var(--accent) 10%,transparent)', border:'1px solid color-mix(in srgb,var(--accent) 22%,transparent)', borderRadius:10, padding:'8px 14px', cursor:'pointer', transition:'all .15s' }}
    >
      {text}
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true">
        {copied
          ? <><path d="m9 12 2 2 4-4"/><circle cx="12" cy="12" r="9"/></>
          : <><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></>}
      </svg>
      <span style={{ fontFamily:'var(--ff)', fontSize:12, fontWeight:500, color: copied ? 'var(--ok)' : 'var(--muted)', marginLeft:2 }}>
        {copied ? 'Copied!' : 'Copy'}
      </span>
    </button>
  )
}

type MriStatus = 'safe' | 'conditional' | 'unsafe' | 'unknown'

const MRI_COLOUR: Record<MriStatus, string> = {
  safe:        'var(--ok)',
  conditional: '#b45309',
  unsafe:      'var(--err)',
  unknown:     'var(--muted)',
}
const MRI_LABEL: Record<MriStatus, string> = {
  safe:        'MR Safe',
  conditional: 'MR Conditional',
  unsafe:      'MR Unsafe',
  unknown:     'Unknown',
}
const MRI_BG: Record<MriStatus, string> = {
  safe:        'linear-gradient(135deg,#14532d,#16a34a)',
  conditional: 'linear-gradient(135deg,#c2410c,#f97316)',
  unsafe:      'linear-gradient(135deg,#7f1d1d,#dc2626)',
  unknown:     'linear-gradient(135deg,#334155,#64748b)',
}

export default function DeviceDetailClient({ id }: { id: string }) {
  const router = useRouter()

  // ── All hooks unconditionally at top ──────────────────────────────────────
  // id may be a DID- code or a Convex _id — the slug query handles both
  const device              = useQuery(api.devices.getDeviceWithUsageBySlug, { slug: id })
  const updateMriStatus     = useMutation(api.devices.updateDeviceMriStatus)
  const moveToTrash         = useMutation(api.devices.moveDeviceToTrash)
  const restoreDevice       = useMutation(api.devices.restoreDevice)
  const permanentlyDelete   = useMutation(api.devices.permanentlyDeleteDevice)

  const linkedPatients = useQuery(api.devices.getPatientsForDevice, device ? { deviceId: device._id } : 'skip')

  const [editingStatus,    setEditingStatus]   = useState(false)
  const [newStatus,        setNewStatus]       = useState<MriStatus>('conditional')
  const [saving,           setSaving]          = useState(false)
  const [saveError,        setSaveError]       = useState('')
  const [justSaved,        setJustSaved]       = useState(false)
  const [trashConfirm,     setTrashConfirm]    = useState(false)
  const [deleteConfirm,    setDeleteConfirm]   = useState(false)
  const [deleting,         setDeleting]        = useState(false)
  const [deleteError,      setDeleteError]     = useState('')
  const [showPatients,     setShowPatients]    = useState(false)

  // ── Guards ────────────────────────────────────────────────────────────────
  if (device === undefined) {
    return (
      <div className="m-content">
        <div style={{ color: 'var(--muted)', fontSize: 14, padding: '48px 0', fontFamily: 'var(--ff)' }}>Loading…</div>
      </div>
    )
  }
  if (device === null) {
    return (
      <div className="m-content">
        <button className="m-back" onClick={() => router.push('/master/devices')} style={{ background: 'none', border: 0, cursor: 'pointer', color: 'var(--muted)', fontFamily: 'var(--ff)', fontSize: 13.5, padding: 0, marginBottom: 24 }}>
          ← All devices
        </button>
        <h2>Device not found</h2>
      </div>
    )
  }

  const status   = device.mriStatus as MriStatus
  const devCode  = (device as any).deviceCode as string | undefined
  // Use deviceCode as the slug for internal links, fall back to the raw param
  const slug     = devCode ?? id

  async function handleMoveToTrash() {
    setDeleting(true); setDeleteError('')
    try {
      await moveToTrash({ id: device._id })
      setTrashConfirm(false)
      setDeleting(false)
    } catch (e) {
      setDeleteError((e as { message?: string })?.message ?? 'Failed to move to trash')
      setDeleting(false)
    }
  }

  async function handleRestore() {
    setDeleting(true); setDeleteError('')
    try {
      await restoreDevice({ id: device._id })
      setDeleting(false)
    } catch (e) {
      setDeleteError((e as { message?: string })?.message ?? 'Failed to restore device')
      setDeleting(false)
    }
  }

  async function handlePermanentDelete() {
    setDeleting(true); setDeleteError('')
    try {
      await permanentlyDelete({ id: device._id })
      window.location.assign('/master/devices')
    } catch (e) {
      setDeleteError((e as { message?: string })?.message ?? 'Failed to delete device')
      setDeleting(false)
    }
  }

  async function handleSaveStatus() {
    setSaving(true); setSaveError('')
    try {
      await updateMriStatus({ id: device._id, mriStatus: newStatus })
      setEditingStatus(false)
      setJustSaved(true)
      setTimeout(() => setJustSaved(false), 3000)
    } catch (e) {
      setSaveError((e as { message?: string })?.message ?? 'Failed to update')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="m-content">
      {/* Back */}
      <button className="m-back" onClick={() => router.push('/master/devices')}
        style={{ background: 'none', border: 0, cursor: 'pointer', color: 'var(--muted)', fontFamily: 'var(--ff)', fontSize: 13.5, padding: 0, marginBottom: 24, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
        ← All devices
      </button>

      {/* Header */}
      <div className="m-h" style={{ marginBottom: 24 }}>
        <div>
          <h2 style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
            {device.manufacturer} {device.model}
            {justSaved && (
              <span style={{ fontFamily: 'var(--ff)', fontSize: 12, fontWeight: 600, color: 'var(--ok)', background: 'color-mix(in srgb,var(--ok) 10%,transparent)', padding: '3px 10px', borderRadius: 6 }}>
                ✓ Saved
              </span>
            )}
          </h2>
          <div className="sub" style={{ margin: 0, marginTop: 4 }}>{device.deviceType} · {device.classification}</div>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          {/* Trash badge */}
          {(device as any).status === 'trash' && (
            <span style={{ fontFamily: 'var(--ff)', fontSize: 12, fontWeight: 700, color: 'var(--err)', background: 'color-mix(in srgb,var(--err) 10%,transparent)', border: '1px solid color-mix(in srgb,var(--err) 25%,transparent)', padding: '4px 10px', borderRadius: 6 }}>
              In trash
            </span>
          )}
          {/* Patient count — clickable when > 0 */}
          {device.patientCount > 0 && (
            <button
              onClick={() => setShowPatients(true)}
              aria-label={`View ${device.patientCount} linked patient${device.patientCount !== 1 ? 's' : ''}`}
              style={{ fontFamily: 'var(--ff)', fontSize: 12.5, color: 'var(--accent)', background: 'color-mix(in srgb,var(--accent) 8%,transparent)', border: '1px solid color-mix(in srgb,var(--accent) 20%,transparent)', borderRadius: 8, padding: '6px 12px', cursor: 'pointer', transition: 'all .15s' }}
            >
              {device.patientCount} patient{device.patientCount !== 1 ? 's' : ''} linked →
            </button>
          )}
          {(device as any).status !== 'trash' ? (
            <>
              <a href={`/master/devices/${slug}/edit`} className="btn">Edit device</a>
              <button className="btn btn-s" onClick={() => { setNewStatus(status); setEditingStatus(true) }}>
                Edit MRI status
              </button>
              <button className="btn btn-danger" onClick={() => setTrashConfirm(true)}>
                Move to trash
              </button>
            </>
          ) : (
            <>
              <button className="btn" onClick={handleRestore} disabled={deleting}>
                {deleting ? 'Restoring…' : 'Restore'}
              </button>
              <button className="btn btn-danger" onClick={() => setDeleteConfirm(true)} disabled={deleting}>
                Delete permanently
              </button>
            </>
          )}
        </div>
      </div>

      {/* MRI status hero card */}
      <div style={{ background: MRI_BG[status], borderRadius: 16, padding: '28px 32px', marginBottom: 24, display: 'flex', alignItems: 'center', gap: 20 }}>
        <img
          src={status === 'safe' ? '/mr-safe.svg' : status === 'conditional' ? '/mr-conditional.svg' : status === 'unsafe' ? '/mr-unsafe.svg' : '/mr-conditional.svg'}
          alt={MRI_LABEL[status]}
          style={{ width: 64, height: 64, display: 'block', flexShrink: 0 }}
        />
        <div>
          <div style={{ fontFamily: 'var(--ff)', fontSize: 11, fontWeight: 700, letterSpacing: '1.4px', textTransform: 'uppercase', color: 'rgba(255,255,255,0.7)', marginBottom: 6 }}>MRI Safety Status</div>
          <div style={{ fontFamily: 'var(--ff)', fontSize: 26, fontWeight: 700, color: '#fff' }}>{MRI_LABEL[status]}</div>
          {device.fieldStrengths && <div style={{ fontFamily: 'var(--fb)', fontSize: 14, color: 'rgba(255,255,255,0.8)', marginTop: 4 }}>Field strengths: {device.fieldStrengths}</div>}
        </div>
      </div>

      {/* Parameter grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(200px,1fr))', gap: 12, marginBottom: 24 }}>
        {[
          { label: 'SAR Limit',           value: device.sarLimit },
          { label: 'B1+rms Limit',        value: device.b1RmsLimit },
          { label: 'Slew Rate Limit',     value: device.slewRateLimit },
          { label: 'Gradient Limit',      value: device.gradientLimit },
          { label: 'Max Scan Time',       value: device.maxScanTime },
          { label: 'Classification',      value: device.classification },
          { label: 'Approved Regions',    value: device.approvedRegions?.join(', ') },
          { label: 'Patients linked',     value: String(device.patientCount), highlight: device.patientCount > 0 },
        ].filter(f => f.value).map(f => (
          <div key={f.label} style={{ background: 'var(--bg2)', border: `1px solid ${f.highlight ? 'color-mix(in srgb,var(--accent) 25%,transparent)' : 'var(--border)'}`, borderRadius: 12, padding: '14px 18px' }}>
            <div style={{ fontFamily: 'var(--ff)', fontSize: 11, fontWeight: 600, letterSpacing: '1px', textTransform: 'uppercase', color: 'var(--muted2)', marginBottom: 5 }}>{f.label}</div>
            <div style={{ fontFamily: 'var(--fb)', fontSize: 14, color: f.highlight ? 'var(--accent)' : 'var(--text)', fontWeight: f.highlight ? 600 : 400 }}>{f.value}</div>
          </div>
        ))}
      </div>

      {/* Contraindications */}
      {device.contraindications && (
        <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 14, padding: '18px 22px', marginBottom: 24 }}>
          <div style={{ fontFamily: 'var(--ff)', fontSize: 11, fontWeight: 700, letterSpacing: '1px', textTransform: 'uppercase', color: 'var(--muted2)', marginBottom: 10 }}>Contraindications / Special conditions</div>
          <div style={{ fontFamily: 'var(--fb)', fontSize: 14, color: 'var(--text)', lineHeight: 1.65 }}>{device.contraindications}</div>
        </div>
      )}

      {/* Sources — legacy scraped data (pdfLinks / sourceUrl / sourcesRaw) */}
      {((device as any).pdfLinks?.length > 0 || (device as any).sourceUrl || (device as any).sourcesRaw) && (() => {
        const pdfLinks: string[]  = (device as any).pdfLinks ?? []
        const sourceUrl: string   = (device as any).sourceUrl ?? ''
        const webSources: Array<{ id: string; type?: string; title?: string; url?: string; accessible?: boolean }> =
          (() => { try { return JSON.parse((device as any).sourcesRaw ?? '[]') } catch { return [] } })()

        return (
          <div style={{ marginBottom: 24 }}>
            <div style={{ fontFamily: 'var(--ff)', fontSize: 11, fontWeight: 700, letterSpacing: '1px', textTransform: 'uppercase', color: 'var(--muted2)', marginBottom: 12 }}>Sources</div>

            {(pdfLinks.length > 0 || sourceUrl) && (
              <div style={{ background: 'color-mix(in srgb,var(--accent) 6%,transparent)', border: '1px solid color-mix(in srgb,var(--accent) 20%,transparent)', borderRadius: 10, padding: '12px 14px', marginBottom: 10 }}>
                <div style={{ fontFamily: 'var(--ff)', fontSize: 11, fontWeight: 600, color: 'var(--accent-deep)', marginBottom: 8 }}>📄 Source documents (IFU / MRI Manual)</div>
                {(pdfLinks.length > 0 ? pdfLinks : [sourceUrl]).map((url, i) => (
                  <a key={i} href={url} target="_blank" rel="noopener noreferrer"
                    style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 10px', background: 'var(--bg2)', borderRadius: 6, marginBottom: 6, textDecoration: 'none', border: '1px solid var(--border)' }}>
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="var(--err)" strokeWidth="1.7" style={{ flexShrink: 0 }}>
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/>
                    </svg>
                    <span style={{ fontFamily: 'var(--ff)', fontSize: 12, color: 'var(--accent)', wordBreak: 'break-all' }}>{url}</span>
                  </a>
                ))}
              </div>
            )}

            {webSources.length > 0 && (
              <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 10, padding: '12px 14px' }}>
                <div style={{ fontFamily: 'var(--ff)', fontSize: 11, fontWeight: 600, color: 'var(--muted2)', marginBottom: 8 }}>Web sources consulted</div>
                {webSources.map((s, i) => (
                  <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 6, alignItems: 'flex-start' }}>
                    <span style={{ fontFamily: 'var(--ff)', fontSize: 10, fontWeight: 600, padding: '2px 6px', borderRadius: 4, flexShrink: 0,
                      background: s.accessible !== false ? 'color-mix(in srgb,var(--ok) 12%,transparent)' : 'color-mix(in srgb,var(--err) 10%,transparent)',
                      color: s.accessible !== false ? 'var(--ok)' : 'var(--err)' }}>
                      {s.accessible !== false ? '✓' : '⚠'} {s.type ?? 'src'}
                    </span>
                    <div style={{ minWidth: 0 }}>
                      {s.title && <div style={{ fontFamily: 'var(--ff)', fontSize: 12.5, color: 'var(--text)' }}>{s.title}</div>}
                      {s.url && <a href={s.url} target="_blank" rel="noopener noreferrer" style={{ fontSize: 11.5, color: 'var(--accent)', wordBreak: 'break-all' }}>{s.url}</a>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )
      })()}

      {/* Manually curated source URLs */}
      {(device as any).sourceUrls?.length > 0 && (
        <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 14, padding: '18px 22px', marginBottom: 24 }}>
          <div style={{ fontFamily: 'var(--ff)', fontSize: 11, fontWeight: 700, letterSpacing: '1px', textTransform: 'uppercase', color: 'var(--muted2)', marginBottom: 12 }}>Source Documents &amp; References</div>
          {((device as any).sourceUrls as { url: string; label?: string }[]).map((s, i) => (
            <a key={i} href={s.url} target="_blank" rel="noopener noreferrer"
              style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 8, marginBottom: 8, textDecoration: 'none' }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--err)" strokeWidth="1.7" style={{ flexShrink: 0 }} aria-hidden="true">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/>
              </svg>
              <span style={{ flex: 1, fontFamily: 'var(--ff)', fontSize: 12.5, color: 'var(--accent)', wordBreak: 'break-all' }}>
                {s.label ? <><strong style={{ color: 'var(--text)', marginRight: 6 }}>{s.label}</strong>{s.url}</> : s.url}
              </span>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--muted2)" strokeWidth="1.7" aria-hidden="true"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6M15 3h6v6M10 14 21 3"/></svg>
            </a>
          ))}
        </div>
      )}

      {/* ── Implant ID Device Code ─────────────────────────────────────────── */}
      {devCode && (
        <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 14, padding: '20px 24px', marginBottom: 24 }}>
          <div style={{ fontFamily: 'var(--ff)', fontSize: 11, fontWeight: 700, letterSpacing: '1px', textTransform: 'uppercase', color: 'var(--muted2)', marginBottom: 6 }}>
            Implant ID Device Code
          </div>
          <p style={{ fontFamily: 'var(--fb)', fontSize: 13, color: 'var(--muted)', margin: '0 0 14px', lineHeight: 1.55 }}>
            This is the internal reference code assigned by Implant ID. It is <strong>not</strong> a manufacturer part number or serial number — it is used to identify this device record within the Implant ID platform and as the permanent URL for this page.
          </p>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
            <CopyBadge text={devCode} />
            <span style={{ fontFamily: 'var(--fb)', fontSize: 12.5, color: 'var(--muted2)' }}>
              Permalink: <code style={{ fontFamily: 'SF Mono,Monaco,monospace', fontSize: 12, color: 'var(--muted)' }}>/master/devices/{devCode}</code>
            </span>
          </div>
        </div>
      )}

      {/* Patient linkage info */}
      {device.patientCount > 0 && (
        <div style={{ background: 'color-mix(in srgb,var(--accent) 6%,transparent)', border: '1px solid color-mix(in srgb,var(--accent) 20%,transparent)', borderRadius: 10, padding: '12px 16px', marginBottom: 24, fontFamily: 'var(--ff)', fontSize: 13, color: 'var(--accent)', lineHeight: 1.6 }}>
          ℹ <strong>{device.patientCount} patient{device.patientCount !== 1 ? 's' : ''}</strong> currently have this device linked to their record.
          Changing the MRI status will immediately affect their wallet passes and dashboard card colour.
          You can move this device to trash at any time — patient links are preserved until permanent deletion.
        </div>
      )}

      {/* Trash notice */}
      {(device as any).status === 'trash' && (
        <div style={{ background: 'color-mix(in srgb,var(--err) 6%,transparent)', border: '1px solid color-mix(in srgb,var(--err) 20%,transparent)', borderRadius: 10, padding: '12px 16px', marginBottom: 24, fontFamily: 'var(--ff)', fontSize: 13, color: 'var(--err)', lineHeight: 1.6 }}>
          This device is in the trash. It is hidden from all public views and the device catalogue.
          You can restore it or permanently delete it — permanent deletion also removes all linked patient records.
        </div>
      )}

      {/* ── Linked patients modal ─────────────────────────────────────────── */}
      {showPatients && (
        <div className="confirm-back open" onClick={() => setShowPatients(false)}>
          <div className="confirm-modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 520 }}>
            <div className="confirm-body" style={{ padding: '24px 24px 8px' }}>
              <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:20 }}>
                <div>
                  <h3 style={{ margin:0, fontFamily:'var(--ff)', fontSize:17, fontWeight:700, color:'var(--text)' }}>
                    Linked patients
                  </h3>
                  <p style={{ margin:'4px 0 0', fontFamily:'var(--ff)', fontSize:13, color:'var(--muted)' }}>
                    {device.manufacturer} {device.model}
                  </p>
                </div>
                <button onClick={() => setShowPatients(false)} aria-label="Close" style={{ background:'none', border:0, cursor:'pointer', color:'var(--muted)', fontSize:20, lineHeight:1, padding:4 }}>✕</button>
              </div>

              {linkedPatients === undefined ? (
                <div style={{ padding:'24px 0', textAlign:'center', fontFamily:'var(--ff)', fontSize:13, color:'var(--muted)' }}>Loading…</div>
              ) : linkedPatients.length === 0 ? (
                <div style={{ padding:'24px 0', textAlign:'center', fontFamily:'var(--ff)', fontSize:13, color:'var(--muted)' }}>No patients currently linked.</div>
              ) : (
                <div style={{ display:'flex', flexDirection:'column', gap:8, maxHeight:400, overflowY:'auto', paddingRight:4 }}>
                  {linkedPatients.map((p: NonNullable<typeof linkedPatients[number]>) => p && (
                    <a
                      key={p._id}
                      href={`/master/patients/${p._id}`}
                      onClick={() => setShowPatients(false)}
                      style={{ display:'flex', alignItems:'center', gap:14, padding:'12px 14px', background:'var(--bg2)', border:'1px solid var(--border)', borderRadius:10, textDecoration:'none', transition:'all .15s' }}
                    >
                      <div style={{ width:36, height:36, borderRadius:'50%', background:'color-mix(in srgb,var(--accent) 12%,transparent)', display:'grid', placeItems:'center', flexShrink:0 }}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="1.7" aria-hidden="true">
                          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
                        </svg>
                      </div>
                      <div style={{ flex:1, minWidth:0 }}>
                        <div style={{ fontFamily:'var(--ff)', fontSize:14, fontWeight:600, color:'var(--text)' }}>
                          {p.firstName} {p.lastName}
                        </div>
                        <div style={{ fontFamily:'var(--ff)', fontSize:12, color:'var(--muted)', marginTop:2 }}>
                          {p.implantIdCode}
                        </div>
                      </div>
                      <div style={{ display:'flex', alignItems:'center', gap:8, flexShrink:0 }}>
                        <span style={{ fontFamily:'var(--ff)', fontSize:11, fontWeight:600, padding:'3px 8px', borderRadius:6,
                          background: p.verificationStatus === 'active'
                            ? 'color-mix(in srgb,var(--ok) 12%,transparent)'
                            : 'color-mix(in srgb,var(--muted) 12%,transparent)',
                          color: p.verificationStatus === 'active' ? 'var(--ok)' : 'var(--muted)',
                        }}>
                          {p.verificationStatus === 'active' ? 'Verified' : 'Pending'}
                        </span>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--muted2)" strokeWidth="1.7" aria-hidden="true">
                          <polyline points="9 18 15 12 9 6"/>
                        </svg>
                      </div>
                    </a>
                  ))}
                </div>
              )}
            </div>
            <div className="confirm-actions">
              <button className="btn" onClick={() => setShowPatients(false)}>Close</button>
            </div>
          </div>
        </div>
      )}

      {/* Move to trash confirmation modal */}
      {trashConfirm && (
        <div className="confirm-back open" onClick={() => !deleting && setTrashConfirm(false)}>
          <div className="confirm-modal" onClick={e => e.stopPropagation()}>
            <div className="confirm-body">
              <div style={{ width:48, height:48, borderRadius:'50%', background:'color-mix(in srgb,var(--err) 12%,transparent)', display:'grid', placeItems:'center', margin:'0 auto 14px' }}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--err)" strokeWidth="1.8" aria-hidden="true">
                  <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
                </svg>
              </div>
              <h3>Move to trash?</h3>
              <p style={{ color: 'var(--muted)', fontSize: 14 }}>
                <strong style={{ color: 'var(--text)' }}>{device.manufacturer} {device.model}</strong><br/>
                This device will be hidden from the catalogue and all public views. Patient records remain intact. You can restore it or permanently delete it from the trash.
              </p>
              {deleteError && <p style={{ color: 'var(--err)', fontSize: 13, marginTop: 8 }}>{deleteError}</p>}
            </div>
            <div className="confirm-actions">
              <button className="btn" onClick={() => setTrashConfirm(false)} disabled={deleting}>Cancel</button>
              <button className="btn btn-danger" onClick={handleMoveToTrash} disabled={deleting}>
                {deleting ? 'Moving…' : 'Move to trash'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Permanent delete confirmation modal */}
      {deleteConfirm && (
        <div className="confirm-back open" onClick={() => !deleting && setDeleteConfirm(false)}>
          <div className="confirm-modal" onClick={e => e.stopPropagation()}>
            <div className="confirm-body">
              <div style={{ width:48, height:48, borderRadius:'50%', background:'color-mix(in srgb,var(--err) 12%,transparent)', display:'grid', placeItems:'center', margin:'0 auto 14px' }}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--err)" strokeWidth="1.8" aria-hidden="true">
                  <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
                </svg>
              </div>
              <h3>Delete permanently?</h3>
              <p style={{ color: 'var(--muted)', fontSize: 14 }}>
                <strong style={{ color: 'var(--text)' }}>{device.manufacturer} {device.model}</strong><br/>
                This will permanently remove the device and all linked patient records. This cannot be undone.
              </p>
              {deleteError && <p style={{ color: 'var(--err)', fontSize: 13, marginTop: 8 }}>{deleteError}</p>}
            </div>
            <div className="confirm-actions">
              <button className="btn" onClick={() => setDeleteConfirm(false)} disabled={deleting}>Cancel</button>
              <button className="btn btn-danger" onClick={handlePermanentDelete} disabled={deleting}>
                {deleting ? 'Deleting…' : 'Yes, delete permanently'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit MRI status modal */}
      {editingStatus && (
        <div className="confirm-back open" onClick={() => setEditingStatus(false)}>
          <div className="confirm-modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 480 }}>
            <div className="confirm-body">
              <h3>Update MRI status</h3>
              <p style={{ marginBottom: 20 }}>
                <strong>{device.manufacturer} {device.model}</strong>
                {device.patientCount > 0 && <><br/><span style={{ color: 'var(--err)', fontSize: 13 }}>⚠ {device.patientCount} patient{device.patientCount !== 1 ? 's' : ''} will be affected immediately.</span></>}
              </p>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 16 }}>
                {(['safe','conditional','unsafe','unknown'] as MriStatus[]).map(s => (
                  <button key={s} type="button"
                    onClick={() => setNewStatus(s)}
                    style={{ padding: '12px 10px', borderRadius: 10, cursor: 'pointer', fontFamily: 'var(--ff)', fontSize: 13, fontWeight: 600, transition: 'all .15s', display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'center',
                      background: newStatus === s ? `color-mix(in srgb,${MRI_COLOUR[s]} 12%,transparent)` : 'var(--bg)',
                      border: `2px solid ${newStatus === s ? MRI_COLOUR[s] : 'var(--border)'}`,
                      color: newStatus === s ? MRI_COLOUR[s] : 'var(--muted)',
                    }}
                  >
                    {s !== 'unknown' && <img src={`/mr-${s}.svg`} alt={MRI_LABEL[s]} style={{ width: 20, height: 20 }} />}
                    {MRI_LABEL[s]}
                  </button>
                ))}
              </div>
              {saveError && <div style={{ color: 'var(--err)', fontSize: 13, marginBottom: 8 }}>{saveError}</div>}
            </div>
            <div className="confirm-actions">
              <button className="btn" onClick={() => setEditingStatus(false)} disabled={saving}>Cancel</button>
              <button className="btn btn-s" onClick={handleSaveStatus} disabled={saving || newStatus === status}>
                {saving ? 'Saving…' : 'Update status'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
