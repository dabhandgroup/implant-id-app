import './page.css'
import Image from 'next/image'
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { getDeviceByModel, getManufacturer, getDocuments } from '@/data/devices'
import CopyModelButton from './CopyModelButton'

// ── Metadata ──────────────────────────────────────────────────────────────

export async function generateMetadata(
  { params }: { params: Promise<{ model: string }> }
): Promise<Metadata> {
  const { model } = await params
  const device = getDeviceByModel(decodeURIComponent(model))
  if (!device) return { title: 'Device not found · Implant ID' }
  return { title: `${device.device_name} · Implant ID` }
}

// ── Helpers ───────────────────────────────────────────────────────────────

function mriStatusClass(classification: string): string {
  if (classification === 'MR Unsafe') return 'dv-badge dv-badge-mri-unsafe'
  if (classification === 'MR Safe')   return 'dv-badge dv-badge-mri-safe'
  return 'dv-badge dv-badge-mri-conditional'
}

function classificationClass(category: string): string {
  if (category === 'active')  return 'dv-badge dv-badge-class-active'
  if (category === 'passive') return 'dv-badge dv-badge-class-passive'
  return 'dv-badge dv-badge-class-legacy'
}

function mfrInitials(name: string): string {
  return name.split(/[\s/]+/).slice(0, 2).map((w) => w[0]).join('').toUpperCase()
}

function fmt(val: number | null | undefined, unit = ''): string {
  if (val === null || val === undefined) return '—'
  return `${val}${unit}`
}

function fmtDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
  } catch { return iso }
}

// ── Page ──────────────────────────────────────────────────────────────────

export default async function DeviceDetailPage(
  { params }: { params: Promise<{ model: string }> }
) {
  const { model } = await params
  const device = getDeviceByModel(decodeURIComponent(model))
  if (!device) notFound()

  const manufacturer = getManufacturer(device.manufacturer_id)
  const docs         = getDocuments(device.device_id)
  const modelNumbers = device.model_number.split(';').map((s) => s.trim()).filter(Boolean)

  const mriLabel =
    device.mri_classification === 'MR Unsafe'   ? 'MR Unsafe' :
    device.field_strength_1t5 && device.field_strength_3t ? 'MR Conditional 1.5T / 3T' :
    device.field_strength_1t5                   ? 'MR Conditional 1.5T only' :
    'MR Conditional'

  const categoryLabel =
    device._category === 'active'  ? 'Active' :
    device._category === 'passive' ? 'Passive' :
    'Legacy'

  return (
    <div className="dv-wrap">

      {/* Breadcrumb */}
      <nav className="dv-breadcrumb" aria-label="Breadcrumb" style={{ marginBottom: 20 }}>
        <a href="/clinics/devices">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="15 18 9 12 15 6" />
          </svg>
          Device library
        </a>
        <span className="dv-breadcrumb-sep">/</span>
        <span style={{ color: 'var(--text)', fontWeight: 500 }}>{device.device_name}</span>
      </nav>

      {/* ── Hero card ── */}
      <div className="dv-hero">
        <div className="dv-hero-body">
          <div className="dv-hero-name">{device.device_name}</div>
          <div className="dv-hero-mfr">
            {manufacturer ? (
              <>
                <a href={`/clinics/devices?mfr=${device.manufacturer_id}`} className="dv-mfr-link">
                  {manufacturer.common_name}
                </a>
                {manufacturer.country_of_origin && (
                  <> &middot; {manufacturer.country_of_origin}</>
                )}
              </>
            ) : device.manufacturer_id}
            {device.implant_region && <> &middot; {device.implant_region}</>}
          </div>
          <div className="dv-hero-models">
            {modelNumbers.map((mn) => <span key={mn}>{mn}</span>)}
          </div>
          <div className="dv-hero-badges">
            <span className={mriStatusClass(device.mri_classification)}>
              {device.mri_classification === 'MR Unsafe' ? (
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              ) : device.mri_classification === 'MR Safe' ? (
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <polyline points="20 6 9 17 4 12"/>
                </svg>
              ) : (
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                </svg>
              )}
              {mriLabel}
            </span>
            <span className={classificationClass(device._category)}>{categoryLabel}</span>
            {device.device_type && (
              <span className="dv-badge" style={{ background: 'var(--bg)', border: '1px solid var(--border)', color: 'var(--muted)' }}>
                {device.device_type}
              </span>
            )}
            {device.component_role && (
              <span className="dv-badge" style={{ background: 'var(--bg)', border: '1px solid var(--border)', color: 'var(--muted)' }}>
                {device.component_role}
              </span>
            )}
          </div>
          <div className="dv-verified">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
              <path d="m9 12 2 2 4-4"/>
            </svg>
            Verified {fmtDate(device.last_verified_date)} &middot; {device.verified_by}
          </div>
        </div>

        {/* MRI status icon — top right of hero */}
        <div className="dv-hero-icon">
          <Image
            src={
              device.mri_classification === 'MR Safe'   ? '/mr-safe@2x.png'   :
              device.mri_classification === 'MR Unsafe' ? '/mr-unsafe@2x.png' :
              '/mr-conditional@2x.png'
            }
            alt={device.mri_classification}
            width={110}
            height={110}
            priority
            unoptimized
          />
          <div className="dv-hero-icon-label">{device.mri_classification}</div>
        </div>
      </div>

      {/* ── Two-column grid ── */}
      <div className="dv-grid">

        {/* LEFT — clinical info */}
        <div>

          {/* MRI Safety card */}
          <div className="dv-card" id="va-mri">
            <div className="dv-card-head">MRI Safety</div>

            {device.rep_required && (
              <div className="rep-required-notice">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ flexShrink: 0, marginTop: 1 }}>
                  <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0zM12 9v4M12 17h.01"/>
                </svg>
                Manufacturer representative must be present for MRI scan
              </div>
            )}

            <div className="dv-sub">Approved field strengths</div>
            <div className="fs-chips">
              {(['1.5T', '3T', '7T'] as const).map((t, i) => {
                const key = [device.field_strength_1t5, device.field_strength_3t, device.field_strength_7t][i]
                return (
                  <span key={t} className={key ? 'fs-chip' : 'fs-chip off'}>
                    <span className="fs-chip-icon">
                      {key ? (
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
                      ) : (
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                      )}
                    </span>
                    {t}
                  </span>
                )
              })}
            </div>

            {device.field_strength_notes && (
              <div className={`dv-notes${device.mri_classification === 'MR Unsafe' ? ' err' : ''}`}>
                {device.field_strength_notes}
              </div>
            )}

            <div className="dv-sub" style={{ marginTop: 20 }}>RF conditions</div>
            <div>
              {[
                ['Transmit mode',        device.rf_transmit_mode],
                ['Receive coil',         device.rf_receive_coil],
                ['Scanner configuration',device.scanner_configuration],
                ['Isocentre restriction',device.isocentre_restriction],
                ['Permitted scan region',device.scan_region_permitted],
                ['Orientation',          device.orientation_restriction],
                ['Bore contact',         device.bore_contact_restriction],
              ].filter(([, v]) => v).map(([label, val]) => (
                <div key={label as string} className="param-row">
                  <span className="param-label">{label}</span>
                  <span className={`param-val${(val as string).startsWith('NONE') ? ' err' : ''}`}
                    style={(val as string).startsWith('NONE') ? { color: 'var(--err)' } : {}}>{val}</span>
                </div>
              ))}
              {device.max_scan_time_mins != null && (
                <div className="param-row">
                  <span className="param-label">Max scan time</span>
                  <span className="param-val">{device.max_scan_time_mins} minutes</span>
                </div>
              )}
              {device.cooloff_period_mins != null && (
                <div className="param-row">
                  <span className="param-label">Cooloff period</span>
                  <span className="param-val">{device.cooloff_period_mins} minutes</span>
                </div>
              )}
            </div>

            {device.scan_region_notes && (
              <div className="dv-notes warn" style={{ marginTop: 14 }}>{device.scan_region_notes}</div>
            )}
          </div>

          {/* Technical Parameters card */}
          <div className="dv-card" id="va-tech">
            <div className="dv-card-head">Technical Parameters</div>
            <div>
              <div className="param-row">
                <span className="param-label">Whole body SAR limit (W/kg)</span>
                <span className={`param-val em${device.regionA_max_sar_wb == null ? ' muted' : ''}`}>{fmt(device.regionA_max_sar_wb)}</span>
              </div>
              <div className="param-row">
                <span className="param-label">Head SAR limit (W/kg)</span>
                <span className={`param-val em${device.regionA_max_sar_head == null ? ' muted' : ''}`}>{fmt(device.regionA_max_sar_head)}</span>
              </div>
              {device.regionA_max_b1_rms != null && (
                <div className="param-row">
                  <span className="param-label">B1+rms limit (µT)</span>
                  <span className="param-val em">{device.regionA_max_b1_rms}</span>
                </div>
              )}
              {device.max_slew_rate != null && (
                <div className="param-row">
                  <span className="param-label">Max slew rate (T/m/s)</span>
                  <span className="param-val">{device.max_slew_rate}</span>
                </div>
              )}
              {[
                ['MRI platform',      device.mri_platform_label],
                ['MRI mode',          device.mri_mode_label],
                ['Deflection angle',  device.deflection_angle],
                ['Heating (temp rise)',device.heating_temp_rise],
                ['Artefact type',     device.artifact_type ? `${device.artifact_type}${device.artifact_extent_mm != null ? ` (~${device.artifact_extent_mm}mm)` : ''}` : null],
              ].filter(([, v]) => v).map(([label, val]) => (
                <div key={label as string} className="param-row">
                  <span className="param-label">{label}</span>
                  <span className="param-val">{val}</span>
                </div>
              ))}
              {device.prescan_programming_required !== undefined && (
                <div className="param-row">
                  <span className="param-label">Pre-scan programming</span>
                  <span className="param-val" style={{ color: device.prescan_programming_required ? 'var(--warn)' : 'var(--ok)' }}>
                    {device.prescan_programming_required ? 'Required' : 'Not required'}
                  </span>
                </div>
              )}
              {device.magnet_removal_required !== undefined && (
                <div className="param-row">
                  <span className="param-label">Magnet removal</span>
                  <span className="param-val" style={{ color: device.magnet_removal_required ? 'var(--warn)' : 'var(--ok)' }}>
                    {device.magnet_removal_required ? 'May be required' : 'Not required'}
                  </span>
                </div>
              )}
              {device.post_implant_wait_weeks !== undefined && (
                <div className="param-row">
                  <span className="param-label">Post-implant wait</span>
                  <span className="param-val">{device.post_implant_wait_weeks === 0 ? 'None' : `${device.post_implant_wait_weeks} weeks`}</span>
                </div>
              )}
            </div>
            {device.artifact_notes && (
              <div className="dv-notes" style={{ marginTop: 14 }}>{device.artifact_notes}</div>
            )}
          </div>

          {/* Conditions & Contraindications */}
          {(device.prescan_checklist || device.postscan_checklist || device.entry_notes || device.patient_instructions) && (
            <div className="dv-card" id="va-conditions">
              <div className="dv-card-head">Conditions &amp; Contraindications</div>

              {device.entry_notes && (
                <>
                  <div className="dv-sub">Clinical notes</div>
                  <div className="dv-notes warn">{device.entry_notes}</div>
                </>
              )}
              {device.prescan_checklist && (
                <>
                  <div className="dv-sub" style={{ marginTop: 18 }}>Pre-scan checklist</div>
                  <div style={{ fontSize: 13.5, color: 'var(--text)', lineHeight: 1.7 }}>
                    {device.prescan_checklist.split('\n').map((step, i) => (
                      <div key={i} style={{ paddingBottom: 4 }}>{step}</div>
                    ))}
                  </div>
                </>
              )}
              {device.postscan_checklist && (
                <>
                  <div className="dv-sub" style={{ marginTop: 18 }}>Post-scan checklist</div>
                  <div style={{ fontSize: 13.5, color: 'var(--text)', lineHeight: 1.7 }}>
                    {device.postscan_checklist.split('\n').map((step, i) => (
                      <div key={i} style={{ paddingBottom: 4 }}>{step}</div>
                    ))}
                  </div>
                </>
              )}
              {device.patient_instructions && (
                <>
                  <div className="dv-sub" style={{ marginTop: 18 }}>Patient instructions</div>
                  <div className="dv-notes">{device.patient_instructions}</div>
                </>
              )}
            </div>
          )}
        </div>

        {/* RIGHT — sidebar info */}
        <div>

          {/* Quick actions */}
          <div className="dv-card">
            <div className="dv-card-head">Quick actions</div>
            <div className="qa-row">
              <a href="/clinics/add-patient" className="qa-btn primary">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
                  <circle cx="9" cy="7" r="4"/><path d="M3 21v-2a4 4 0 0 1 4-4h4M19 8v6M16 11h6"/>
                </svg>
                Add to patient
              </a>
              <a href="/clinics/devices" className="qa-btn">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
                  <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20M4 19.5A2.5 2.5 0 0 0 6.5 22H20V2H6.5A2.5 2.5 0 0 0 4 4.5v15z"/>
                </svg>
                Back to library
              </a>
            </div>
            <CopyModelButton modelNumbers={modelNumbers.length > 0 ? modelNumbers : [device.model_number]} />
          </div>

          {/* Manufacturer */}
          {manufacturer && (
            <div className="dv-card">
              <div className="dv-card-head">Manufacturer</div>
              <div className="mfr-row">
                <div className="mfr-avatar">{mfrInitials(manufacturer.common_name)}</div>
                <div>
                  <div className="mfr-name">{manufacturer.manufacturer_name}</div>
                  <div className="mfr-country">{manufacturer.country_of_origin}</div>
                </div>
              </div>
              <div className="reg-chips">
                <span className={manufacturer.tga_registered ? 'reg-chip' : 'reg-chip off'}>TGA</span>
                <span className={manufacturer.fda_registered ? 'reg-chip' : 'reg-chip off'}>FDA</span>
                <span className={manufacturer.mhra_registered ? 'reg-chip' : 'reg-chip off'}>MHRA</span>
              </div>
              {manufacturer.notes && (
                <div style={{ fontSize: 12.5, color: 'var(--muted)', lineHeight: 1.55, marginBottom: 12 }}>
                  {manufacturer.notes}
                </div>
              )}
              {manufacturer.website && (
                <a href={manufacturer.website} target="_blank" rel="noopener noreferrer" className="mfr-portal-btn" style={{ marginBottom: manufacturer.mri_safety_portal_url ? 8 : 0 }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
                    <circle cx="12" cy="12" r="10"/><path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
                  </svg>
                  Manufacturer website
                </a>
              )}
              {manufacturer.mri_safety_portal_url && (
                <a href={manufacturer.mri_safety_portal_url} target="_blank" rel="noopener noreferrer" className="mfr-portal-btn">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
                    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6M15 3h6v6M10 14 21 3"/>
                  </svg>
                  MRI safety portal
                </a>
              )}
            </div>
          )}

          {/* Sources & References */}
          {docs.length > 0 && (
            <div className="dv-card">
              <div className="dv-card-head">Sources &amp; References</div>
              <p className="src-desc">Verify this data directly on the manufacturer&apos;s website before any clinical decision.</p>
              {docs.map((doc) => {
                const isWeb = doc.source_type === 'Manufacturer product page' || doc.source_type === 'Manufacturer spec sheet'
                return (
                  <a
                    key={doc.doc_id}
                    href={doc.document_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="doc-row"
                    aria-label={`Open ${doc.document_title} (opens in new tab)`}
                  >
                    <div className={`doc-ic${isWeb ? ' doc-ic-web' : ''}`}>
                      {isWeb ? (
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
                          <circle cx="12" cy="12" r="10"/><path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
                        </svg>
                      ) : (
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
                          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                          <path d="M14 2v6h6M16 13H8M16 17H8M10 9H8"/>
                        </svg>
                      )}
                    </div>
                    <div className="doc-body">
                      <div className="doc-title">{doc.document_title}</div>
                      <div className="doc-meta">
                        {doc.source_type && <span className="src-type-tag">{doc.source_type}</span>}
                        {doc.document_version && <span> &middot; {doc.document_version}</span>}
                        {doc.document_date && <span> &middot; {fmtDate(doc.document_date)}</span>}
                      </div>
                    </div>
                    <svg className="doc-link-ic" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6M15 3h6v6M10 14 21 3"/>
                    </svg>
                  </a>
                )
              })}
              <p className="src-disclaimer">
                Implant ID aggregates publicly available manufacturer documentation. Always verify MRI safety conditions against the current manufacturer IFU before scanning.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
