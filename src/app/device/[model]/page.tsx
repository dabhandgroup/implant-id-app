import './page.css'
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { getDeviceByModel, getManufacturer, getDocuments } from '@/data/devices'
import { currentUser } from '@clerk/nextjs/server'

// ── Metadata ───────────────────────────────────────────────────────────────

export async function generateMetadata(
  { params }: { params: Promise<{ model: string }> }
): Promise<Metadata> {
  const { model } = await params
  const device = getDeviceByModel(model)
  if (!device) return { title: 'Device not found · Implant ID' }
  return { title: `${device.device_name} · Implant ID` }
}

// ── Helpers ────────────────────────────────────────────────────────────────

function mriStatusClass(classification: string): string {
  if (classification === 'MR Unsafe') return 'dv-badge dv-badge-mri-unsafe'
  if (classification === 'MR Safe') return 'dv-badge dv-badge-mri-safe'
  return 'dv-badge dv-badge-mri-conditional'
}

function classificationClass(category: string): string {
  if (category === 'active') return 'dv-badge dv-badge-class-active'
  if (category === 'passive') return 'dv-badge dv-badge-class-passive'
  return 'dv-badge dv-badge-class-legacy'
}

function mfrInitials(name: string): string {
  return name
    .split(/[\s/]+/)
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase()
}

function fmt(val: number | null | undefined, unit = ''): string {
  if (val === null || val === undefined) return '—'
  return `${val}${unit}`
}

function fmtDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
  } catch {
    return iso
  }
}

// ── Page ───────────────────────────────────────────────────────────────────

export default async function DevicePage(
  { params }: { params: Promise<{ model: string }> }
) {
  const { model } = await params
  const device = getDeviceByModel(model)
  if (!device) notFound()

  // Real signed-in user for sidebar profile
  const clerkUser   = await currentUser()
  const userName    = clerkUser?.fullName ?? clerkUser?.emailAddresses?.[0]?.emailAddress ?? 'Clinic staff'
  const userInitials = clerkUser?.firstName?.[0] && clerkUser?.lastName?.[0]
    ? `${clerkUser.firstName[0]}${clerkUser.lastName[0]}`.toUpperCase()
    : (clerkUser?.firstName?.[0]?.toUpperCase() ?? 'CS')

  const manufacturer = getManufacturer(device.manufacturer_id)
  const docs = getDocuments(device.device_id)

  const modelNumbers = device.model_number.split(';').map((s) => s.trim()).filter(Boolean)

  // MRI status label
  const mriLabel =
    device.mri_classification === 'MR Unsafe'
      ? 'MR Unsafe'
      : device.field_strength_1t5 && device.field_strength_3t
      ? 'MR Conditional 1.5T / 3T'
      : device.field_strength_1t5
      ? 'MR Conditional 1.5T only'
      : 'MR Conditional'

  const categoryLabel =
    device._category === 'active'
      ? 'Active'
      : device._category === 'passive'
      ? 'Passive'
      : 'Legacy'

  return (
    <>
      {/* ── Sidebar backdrop (mobile) ── */}
      <div className="sb-back" id="sb-back" onClick={() => {}} />

      <div className="app" id="app">
        {/* ── Sidebar ── */}
        <aside className="sidebar">
          <div className="sb-logo">
            <a href="/" className="logo">
              <img src="/icon.svg" alt="" />
              <span className="logo-text"><b>Implant</b><span>ID</span></span>
            </a>
            <button className="sb-toggle" aria-label="Collapse sidebar">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="15 18 9 12 15 6" />
              </svg>
            </button>
          </div>

          <div className="sb-section">Lookup</div>
          <a className="sb-link" href="/clinics/dashboard" title="Dashboard">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
              <rect x="3" y="3" width="7" height="9" rx="1.5" />
              <rect x="14" y="3" width="7" height="5" rx="1.5" />
              <rect x="14" y="12" width="7" height="9" rx="1.5" />
              <rect x="3" y="16" width="7" height="5" rx="1.5" />
            </svg>
            <span>Dashboard</span>
          </a>
          <a className="sb-link" href="/clinics/devices" title="Implant library">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
              <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20M4 19.5A2.5 2.5 0 0 0 6.5 22H20V2H6.5A2.5 2.5 0 0 0 4 4.5v15z" />
            </svg>
            <span>Implant library</span>
          </a>
          <a className="sb-link" href="/clinics/scan-patient" title="Scan patient card">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
              <rect x="3" y="5" width="18" height="14" rx="2" />
              <path d="M3 10h18M8 15h2" />
            </svg>
            <span>Scan card</span>
          </a>
          <a className="sb-link" href="/clinics/manufacturers" title="Manufacturers">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
              <path d="M3 21V8l9-5 9 5v13" />
              <path d="M9 9h6M9 13h6M9 17h6" />
            </svg>
            <span>Manufacturers</span>
          </a>

          <div className="sb-section">Patients</div>
          <a className="sb-link" href="/clinics/all-patients" title="All patients">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
              <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
            </svg>
            <span>All patients</span>
          </a>
          <a className="sb-link" href="/clinics/add-patient" title="Add patient">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
              <circle cx="9" cy="7" r="4" />
              <path d="M3 21v-2a4 4 0 0 1 4-4h4M19 8v6M16 11h6" />
            </svg>
            <span>Add patient</span>
          </a>

          <div className="sb-section">Clinic</div>
          <a className="sb-link" href="/clinics/staff" title="Staff">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
            </svg>
            <span>Staff</span>
          </a>
          <a className="sb-link" href="/clinics/audit" title="Audit log">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <path d="M14 2v6h6" />
            </svg>
            <span>Audit log</span>
          </a>
          <a className="sb-link" href="/clinics/settings" title="Settings">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
              <circle cx="12" cy="12" r="3" />
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33h0a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51h0a1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82v0a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
            </svg>
            <span>Settings</span>
          </a>

          <button className="sb-notif" title="Notifications" aria-label="Notifications">
            <span className="sb-notif-ic">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                <path d="M13.73 21a2 2 0 0 1-3.46 0" />
              </svg>
              <span className="dot" />
            </span>
            <span className="label">Notifications</span>
          </button>

          <div className="sb-bot">
            <div className="av">{userInitials}</div>
            <div>
              <div className="name">{userName}</div>
              <div className="role">Clinic staff</div>
            </div>
            <span className="chev">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="18 15 12 9 6 15" />
              </svg>
            </span>
          </div>
          <div className="profile-menu" id="profile-menu">
            <a href="/clinics/settings">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
                <circle cx="12" cy="7" r="4" />
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
              </svg>
              My account
            </a>
            <a href="/clinics/settings">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
                <circle cx="12" cy="12" r="3" />
                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33h0a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51h0a1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82v0a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
              </svg>
              Settings
            </a>
            <hr />
            <button className="danger">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                <polyline points="16 17 21 12 16 7" />
                <line x1="21" y1="12" x2="9" y2="12" />
              </svg>
              Sign out
            </button>
          </div>
        </aside>

        {/* ── Main ── */}
        <main className="app-main">
          {/* Mobile header */}
          <div className="mob-header">
            <a href="/clinics/dashboard" className="mob-header-logo">
              <img src="/icon.svg" alt="" />
              <span className="logo-text"><b>Implant</b><span>ID</span></span>
            </a>
            <div className="mob-hdr-profile">
              <button className="mob-hdr-av" aria-label="Profile menu">DO</button>
              <div className="mob-hdr-menu">
                <div className="mob-hdr-info">
                  <strong>Dr Okafor</strong>
                  <span>Northside Imaging</span>
                </div>
                <hr />
                <a href="/clinics/settings">My account</a>
                <button className="danger">Sign out</button>
              </div>
            </div>
          </div>

          {/* Top bar with breadcrumb */}
          <header className="app-top">
            <div className="app-top-l">
              <nav className="dv-breadcrumb" aria-label="Breadcrumb">
                <a href="/clinics/devices">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginRight: 2 }}>
                    <polyline points="15 18 9 12 15 6" />
                  </svg>
                  Library
                </a>
                <span className="dv-breadcrumb-sep">/</span>
                <span style={{ color: 'var(--text)', fontWeight: 500 }}>{device.device_name}</span>
              </nav>
            </div>
            <div className="va-bar" id="va-bar">
              <span className="va-label">View as</span>
              <button className="va-tab" data-role="admin">Admin</button>
              <button className="va-tab" data-role="radiographer">Radiographer</button>
              <button className="va-tab" data-role="surgeon">Surgeon</button>
            </div>
            <div className="app-top-r">
              <button className="ibtn notif-btn" aria-label="Notifications">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
                  <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                  <path d="M13.73 21a2 2 0 0 1-3.46 0" />
                </svg>
              </button>
            </div>
          </header>

          {/* Content */}
          <section className="app-content">

            {/* ── Hero card ── */}
            <div className="dv-hero">
              <div className="dv-hero-body">
                <div className="dv-hero-name">{device.device_name}</div>
                <div className="dv-hero-mfr">
                  {manufacturer ? (
                    <>
                      {manufacturer.common_name}
                      {manufacturer.website && (
                        <> &middot; <a href={manufacturer.website} target="_blank" rel="noopener noreferrer">{manufacturer.country_of_origin}</a></>
                      )}
                    </>
                  ) : device.manufacturer_id}
                  {device.implant_region && (
                    <> &middot; {device.implant_region}</>
                  )}
                </div>
                <div className="dv-hero-models">
                  {modelNumbers.map((mn) => (
                    <span key={mn}>{mn}</span>
                  ))}
                </div>
                <div className="dv-hero-badges">
                  <span className={mriStatusClass(device.mri_classification)}>
                    {device.mri_classification === 'MR Unsafe' ? (
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                      </svg>
                    ) : (
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    )}
                    {mriLabel}
                  </span>
                  <span className={classificationClass(device._category)}>
                    {categoryLabel}
                  </span>
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
                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                    <path d="m9 12 2 2 4-4" />
                  </svg>
                  Verified {fmtDate(device.last_verified_date)} &middot; {device.verified_by}
                </div>
              </div>
            </div>

            {/* ── Two-column grid ── */}
            <div className="dv-grid">

              {/* LEFT — clinical info */}
              <div>

                {/* MRI Safety card */}
                <div className="dv-card" id="va-mri">
                  <div className="dv-card-head">MRI Safety</div>

                  {/* Rep required notice */}
                  {device.rep_required && (
                    <div className="rep-required-notice">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ flexShrink: 0, marginTop: 1 }}>
                        <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0zM12 9v4M12 17h.01" />
                      </svg>
                      Manufacturer representative must be present for MRI scan
                    </div>
                  )}

                  {/* Field strength chips */}
                  <div className="dv-sub">Approved field strengths</div>
                  <div className="fs-chips">
                    <span className={device.field_strength_1t5 ? 'fs-chip' : 'fs-chip off'}>
                      <span className="fs-chip-icon">
                        {device.field_strength_1t5 ? (
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12" /></svg>
                        ) : (
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
                        )}
                      </span>
                      1.5T
                    </span>
                    <span className={device.field_strength_3t ? 'fs-chip' : 'fs-chip off'}>
                      <span className="fs-chip-icon">
                        {device.field_strength_3t ? (
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12" /></svg>
                        ) : (
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
                        )}
                      </span>
                      3T
                    </span>
                    <span className={device.field_strength_7t ? 'fs-chip' : 'fs-chip off'}>
                      <span className="fs-chip-icon">
                        {device.field_strength_7t ? (
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12" /></svg>
                        ) : (
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
                        )}
                      </span>
                      7T
                    </span>
                  </div>

                  {device.field_strength_notes && (
                    <div className={`dv-notes${device.mri_classification === 'MR Unsafe' ? ' err' : ''}`}>
                      {device.field_strength_notes}
                    </div>
                  )}

                  {/* RF conditions */}
                  <div className="dv-sub" style={{ marginTop: 20 }}>RF conditions</div>
                  <div>
                    {device.rf_transmit_mode && (
                      <div className="param-row">
                        <span className="param-label">Transmit mode</span>
                        <span className="param-val">{device.rf_transmit_mode}</span>
                      </div>
                    )}
                    {device.rf_receive_coil && (
                      <div className="param-row">
                        <span className="param-label">Receive coil</span>
                        <span className="param-val">{device.rf_receive_coil}</span>
                      </div>
                    )}
                    {device.scanner_configuration && (
                      <div className="param-row">
                        <span className="param-label">Scanner configuration</span>
                        <span className="param-val">{device.scanner_configuration}</span>
                      </div>
                    )}
                    {device.isocentre_restriction && (
                      <div className="param-row">
                        <span className="param-label">Isocentre restriction</span>
                        <span className="param-val">{device.isocentre_restriction}</span>
                      </div>
                    )}
                    {device.scan_region_permitted && (
                      <div className="param-row">
                        <span className="param-label">Permitted scan region</span>
                        <span className={`param-val${device.scan_region_permitted.startsWith('NONE') ? ' err' : ''}`} style={device.scan_region_permitted.startsWith('NONE') ? { color: 'var(--err)' } : {}}>
                          {device.scan_region_permitted}
                        </span>
                      </div>
                    )}
                    {device.orientation_restriction && (
                      <div className="param-row">
                        <span className="param-label">Orientation</span>
                        <span className="param-val">{device.orientation_restriction}</span>
                      </div>
                    )}
                    {device.bore_contact_restriction && (
                      <div className="param-row">
                        <span className="param-label">Bore contact restriction</span>
                        <span className="param-val">{device.bore_contact_restriction}</span>
                      </div>
                    )}
                    {device.max_scan_time_mins !== null && device.max_scan_time_mins !== undefined && (
                      <div className="param-row">
                        <span className="param-label">Max scan time</span>
                        <span className="param-val">{device.max_scan_time_mins} minutes</span>
                      </div>
                    )}
                    {device.cooloff_period_mins !== null && device.cooloff_period_mins !== undefined && (
                      <div className="param-row">
                        <span className="param-label">Cooloff period</span>
                        <span className="param-val">{device.cooloff_period_mins} minutes</span>
                      </div>
                    )}
                  </div>

                  {device.scan_region_notes && (
                    <div className="dv-notes warn" style={{ marginTop: 14 }}>
                      {device.scan_region_notes}
                    </div>
                  )}
                </div>

                {/* Technical Parameters card */}
                <div className="dv-card" id="va-tech">
                  <div className="dv-card-head">Technical Parameters</div>

                  <div>
                    <div className="param-row">
                      <span className="param-label">Whole body SAR limit (W/kg)</span>
                      <span className={`param-val em${device.regionA_max_sar_wb === null ? ' muted' : ''}`}>
                        {fmt(device.regionA_max_sar_wb)}
                      </span>
                    </div>
                    <div className="param-row">
                      <span className="param-label">Head SAR limit (W/kg)</span>
                      <span className={`param-val em${device.regionA_max_sar_head === null ? ' muted' : ''}`}>
                        {fmt(device.regionA_max_sar_head)}
                      </span>
                    </div>
                    {(device.regionA_max_b1_rms !== null && device.regionA_max_b1_rms !== undefined) && (
                      <div className="param-row">
                        <span className="param-label">B1+rms limit (µT)</span>
                        <span className="param-val em">{device.regionA_max_b1_rms}</span>
                      </div>
                    )}
                    {(device.max_slew_rate !== null && device.max_slew_rate !== undefined) && (
                      <div className="param-row">
                        <span className="param-label">Max slew rate (T/m/s)</span>
                        <span className="param-val">{device.max_slew_rate}</span>
                      </div>
                    )}
                    {device.mri_platform_label && (
                      <div className="param-row">
                        <span className="param-label">MRI platform</span>
                        <span className="param-val">{device.mri_platform_label}</span>
                      </div>
                    )}
                    {device.mri_mode_label && (
                      <div className="param-row">
                        <span className="param-label">MRI mode</span>
                        <span className="param-val">{device.mri_mode_label}</span>
                      </div>
                    )}
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
                        <span className="param-val">
                          {device.post_implant_wait_weeks === 0 ? 'None' : `${device.post_implant_wait_weeks} weeks`}
                        </span>
                      </div>
                    )}
                    {/* Passive device specific */}
                    {device.deflection_angle && (
                      <div className="param-row">
                        <span className="param-label">Deflection angle</span>
                        <span className="param-val">{device.deflection_angle}</span>
                      </div>
                    )}
                    {device.heating_temp_rise && (
                      <div className="param-row">
                        <span className="param-label">Heating (temp rise)</span>
                        <span className="param-val">{device.heating_temp_rise}</span>
                      </div>
                    )}
                    {device.artifact_type && (
                      <div className="param-row">
                        <span className="param-label">Artefact type</span>
                        <span className="param-val">{device.artifact_type}{device.artifact_extent_mm !== null && device.artifact_extent_mm !== undefined ? ` (~${device.artifact_extent_mm}mm)` : ''}</span>
                      </div>
                    )}
                  </div>

                  {device.artifact_notes && (
                    <div className="dv-notes" style={{ marginTop: 14 }}>{device.artifact_notes}</div>
                  )}
                </div>

                {/* Conditions & Contraindications card */}
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

                {/* Quick actions card */}
                <div className="dv-card">
                  <div className="dv-card-head">Quick actions</div>
                  <a href="/clinics/add-patient" className="qa-btn primary">
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
                      <circle cx="9" cy="7" r="4" />
                      <path d="M3 21v-2a4 4 0 0 1 4-4h4M19 8v6M16 11h6" />
                    </svg>
                    Add to patient
                  </a>
                  <a href="/clinics/devices" className="qa-btn">
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
                      <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20M4 19.5A2.5 2.5 0 0 0 6.5 22H20V2H6.5A2.5 2.5 0 0 0 4 4.5v15z" />
                    </svg>
                    View in library
                  </a>
                  <button
                    className="qa-btn"
                    onClick={() => {
                      // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
                      if (typeof navigator !== 'undefined' && navigator.clipboard) {
                        navigator.clipboard.writeText(modelNumbers[0] ?? device.model_number)
                      }
                    }}
                  >
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
                      <rect x="9" y="9" width="13" height="13" rx="2" />
                      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                    </svg>
                    Copy model number
                  </button>
                </div>

                {/* Manufacturer card */}
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
                    {manufacturer.mri_safety_portal_url && (
                      <a
                        href={manufacturer.mri_safety_portal_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mfr-portal-btn"
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
                          <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6M15 3h6v6M10 14 21 3" />
                        </svg>
                        MRI safety portal
                      </a>
                    )}
                  </div>
                )}

                {/* Sources & References card */}
                {docs.length > 0 && (
                  <div className="dv-card">
                    <div className="dv-card-head">Sources &amp; References</div>
                    <p className="src-desc">Verify this data directly on the manufacturer&apos;s website before any clinical decision.</p>
                    {docs.map((doc) => {
                      const isProductPage = doc.source_type === 'Manufacturer product page' || doc.source_type === 'Manufacturer spec sheet'
                      return (
                        <a
                          key={doc.doc_id}
                          href={doc.document_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="doc-row"
                          aria-label={`Open ${doc.document_title} on manufacturer website (opens in new tab)`}
                        >
                          <div className={`doc-ic${isProductPage ? ' doc-ic-web' : ''}`}>
                            {isProductPage ? (
                              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
                                <circle cx="12" cy="12" r="10" />
                                <path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
                              </svg>
                            ) : (
                              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
                                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                                <path d="M14 2v6h6M16 13H8M16 17H8M10 9H8" />
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
                            <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6M15 3h6v6M10 14 21 3" />
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
          </section>

          {/* Mobile nav */}
          <nav className="mob-nav" aria-label="Mobile navigation">
            <div className="mob-nav-tabs">
              <a href="/clinics/dashboard" className="mob-nav-tab" aria-label="Dashboard">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
                  <rect x="3" y="3" width="7" height="9" rx="1.5" />
                  <rect x="14" y="3" width="7" height="5" rx="1.5" />
                  <rect x="14" y="12" width="7" height="9" rx="1.5" />
                  <rect x="3" y="16" width="7" height="5" rx="1.5" />
                </svg>
                <span className="t">Home</span>
              </a>
              <a href="/clinics/patient/add" className="mob-nav-tab" aria-label="Scan card">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
                  <rect x="3" y="5" width="18" height="14" rx="2" />
                  <path d="M3 10h18M8 15h2" />
                </svg>
                <span className="t">Scan</span>
              </a>
              <a href="/clinics/all-patients" className="mob-nav-tab" aria-label="Patients">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
                  <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                  <circle cx="9" cy="7" r="4" />
                  <path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
                </svg>
                <span className="t">Patients</span>
              </a>
              <a href="/clinics/devices" className="mob-nav-tab" aria-label="Library">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
                  <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20M4 19.5A2.5 2.5 0 0 0 6.5 22H20V2H6.5A2.5 2.5 0 0 0 4 4.5v15z" />
                </svg>
                <span className="t">Library</span>
              </a>
              <button className="mob-nav-tab mob-nav-menu-btn" aria-label="Toggle menu">
                <div className="ham-ic"><span /><span /><span /></div>
                <span className="t">Menu</span>
              </button>
            </div>
          </nav>
        </main>
      </div>

      {/* ── Notifications drawer ── */}
      <div className="notif-back" id="notif-back" />
      <aside className="notif-drawer" id="notif-drawer" aria-label="Notifications">
        <div className="notif-h">
          <h3>Notifications</h3>
          <button className="x">&#x2715;</button>
        </div>
        <div className="notif-list">
          <div className="notif-item unread">
            <div className="notif-ic err">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
                <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0zM12 9v4M12 17h.01" />
              </svg>
            </div>
            <div>
              <b>Class II recall &middot; Medtronic MiniMed 670G</b>
              <p>Check patients with this device.</p>
              <div className="t">2 hours ago &middot; FDA alert</div>
            </div>
          </div>
          <div className="notif-item unread">
            <div className="notif-ic warn">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
                <circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" />
              </svg>
            </div>
            <div>
              <b>Safety data expiring &middot; St Jude Riata</b>
              <p>14 days until re-verification needed from Abbott.</p>
              <div className="t">6 hours ago &middot; Library</div>
            </div>
          </div>
          <div className="notif-item">
            <div className="notif-ic ok">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                <path d="m9 12 2 2 4-4" />
              </svg>
            </div>
            <div>
              <b>SOC 2 audit complete</b>
              <p>Implant ID has passed its SOC 2 Type I audit.</p>
              <div className="t">2 days ago &middot; Company</div>
            </div>
          </div>
        </div>
        <div className="notif-foot">
          <a href="#">Mark all as read</a>
          <a href="#">Settings</a>
        </div>
      </aside>

      {/* ── View-as role toggle script ── */}
      <script dangerouslySetInnerHTML={{ __html: `
(function(){
  // Which cards each role can see
  var SHOW={
    admin:['va-mri','va-tech','va-conditions'],
    radiographer:['va-mri','va-tech'],
    surgeon:['va-tech','va-conditions']
  };
  var ALL=['va-mri','va-tech','va-conditions'];

  function applyRole(role){
    if(!SHOW[role]) role='admin';
    // Persist
    try{localStorage.setItem('iid-role',role);}catch(e){}
    // Update tab states
    document.querySelectorAll('.va-tab').forEach(function(t){
      t.classList.toggle('active',t.dataset.role===role);
    });
    // Show / hide cards
    var show=SHOW[role];
    ALL.forEach(function(id){
      var el=document.getElementById(id);
      if(el) el.style.display=(show.indexOf(id)>=0)?'':'none';
    });
  }

  // Read persisted role (default: admin)
  var saved;
  try{saved=localStorage.getItem('iid-role');}catch(e){}
  applyRole(saved||'admin');

  // Wire up tab buttons
  document.querySelectorAll('.va-tab').forEach(function(t){
    t.addEventListener('click',function(){applyRole(this.dataset.role);});
  });
})();
` }} />

      {/* ── Logout modal ── */}
      <div className="logout-back" id="logout-back">
        <div className="logout-modal">
          <div className="logout-body">
            <div className="logout-ic">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                <polyline points="16 17 21 12 16 7" />
                <line x1="21" y1="12" x2="9" y2="12" />
              </svg>
            </div>
            <h3>Log out of Implant ID?</h3>
            <p>You&rsquo;ll need to sign back in to access patient records and the implant library.</p>
          </div>
          <div className="logout-actions">
            <button className="btn btn-lg">&larr; Back</button>
            <a href="/login" className="btn btn-danger btn-lg">Yes, log out</a>
          </div>
        </div>
      </div>
    </>
  )
}
