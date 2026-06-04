'use client'

import { useState }    from 'react'
import { useQuery, useMutation } from 'convex/react'
import { useRouter }   from 'next/navigation'
import { api as apiBase } from '../../../../../convex/_generated/api'
import { Id }             from '../../../../../convex/_generated/dataModel'
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const api = apiBase as any

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
  const device            = useQuery(api.devices.getDeviceWithUsage, { id: id as Id<'devices'> })
  const updateMriStatus   = useMutation(api.devices.updateDeviceMriStatus)

  const [editingStatus,   setEditingStatus]   = useState(false)
  const [newStatus,       setNewStatus]       = useState<MriStatus>('conditional')
  const [saving,          setSaving]          = useState(false)
  const [saveError,       setSaveError]       = useState('')
  const [justSaved,       setJustSaved]       = useState(false)

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

  const status = device.mriStatus as MriStatus

  async function handleSaveStatus() {
    setSaving(true); setSaveError('')
    try {
      await updateMriStatus({ id: id as Id<'devices'>, mriStatus: newStatus })
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
          <h2 style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            {device.manufacturer} {device.model}
            {justSaved && (
              <span style={{ fontFamily: 'var(--ff)', fontSize: 12, fontWeight: 600, color: 'var(--ok)', background: 'color-mix(in srgb,var(--ok) 10%,transparent)', padding: '3px 10px', borderRadius: 6 }}>
                ✓ Saved
              </span>
            )}
          </h2>
          <div className="sub">{device.deviceType} · {device.classification}</div>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {/* Patient count badge */}
          <div style={{ fontFamily: 'var(--ff)', fontSize: 12.5, color: device.patientCount > 0 ? 'var(--accent)' : 'var(--muted)', background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 8, padding: '6px 12px' }}>
            {device.patientCount} patient{device.patientCount !== 1 ? 's' : ''} linked
          </div>
          <button className="btn btn-s" onClick={() => { setNewStatus(status); setEditingStatus(true) }}>
            Edit MRI status
          </button>
        </div>
      </div>

      {/* MRI status hero card */}
      <div style={{ background: MRI_BG[status], borderRadius: 16, padding: '28px 32px', marginBottom: 24, display: 'flex', alignItems: 'center', gap: 20 }}>
        {/* Icon with white circle background */}
        <div style={{ width: 72, height: 72, borderRadius: '50%', background: 'rgba(255,255,255,0.18)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <img
            src={status === 'safe' ? '/mr-safe.svg' : status === 'conditional' ? '/mr-conditional.svg' : status === 'unsafe' ? '/mr-unsafe.svg' : '/mr-conditional.svg'}
            alt={MRI_LABEL[status]}
            style={{ width: 52, height: 52 }}
          />
        </div>
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

      {/* Sources — PDF links + web sources consulted during scrape */}
      {((device as any).pdfLinks?.length > 0 || (device as any).sourceUrl || (device as any).sourcesRaw) && (() => {
        const pdfLinks: string[]  = (device as any).pdfLinks ?? []
        const sourceUrl: string   = (device as any).sourceUrl ?? ''
        const webSources: Array<{ id: string; type?: string; title?: string; url?: string; accessible?: boolean }> =
          (() => { try { return JSON.parse((device as any).sourcesRaw ?? '[]') } catch { return [] } })()

        return (
          <div style={{ marginBottom: 24 }}>
            <div style={{ fontFamily: 'var(--ff)', fontSize: 11, fontWeight: 700, letterSpacing: '1px', textTransform: 'uppercase', color: 'var(--muted2)', marginBottom: 12 }}>Sources</div>

            {/* PDF / primary source */}
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

            {/* Web sources consulted */}
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

      {/* Patient linkage warning */}
      {device.patientCount > 0 && (
        <div style={{ background: 'color-mix(in srgb,var(--accent) 6%,transparent)', border: '1px solid color-mix(in srgb,var(--accent) 20%,transparent)', borderRadius: 10, padding: '12px 16px', marginBottom: 24, fontFamily: 'var(--ff)', fontSize: 13, color: 'var(--accent)', lineHeight: 1.6 }}>
          ℹ <strong>{device.patientCount} patient{device.patientCount !== 1 ? 's' : ''}</strong> currently have this device linked to their record.
          Changing the MRI status will immediately affect their wallet passes and dashboard card colour.
          This device cannot be deleted while patients are linked.
        </div>
      )}

      {/* Edit MRI status modal */}
      {editingStatus && (
        <div className="logout-back open" onClick={() => setEditingStatus(false)}>
          <div className="logout-modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 480 }}>
            <div className="logout-body">
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
            <div className="logout-actions">
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
