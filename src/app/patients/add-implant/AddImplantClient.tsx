'use client'
import { useState, useEffect, useRef } from 'react'
import { useUser, useClerk }           from '@clerk/nextjs'
import { useQuery, useMutation }        from 'convex/react'
import { api }                         from '../../../../convex/_generated/api'
import { useRouter }                   from 'next/navigation'
import { CustomSelect }                from '@/components/ui/CustomSelect'

const DEVICE_TYPES = ['Pacemaker','ICD (Defibrillator)','CRT device','Neurostimulator / DBS','Cochlear implant','Retinal implant','Hip replacement','Knee replacement','Shoulder replacement','Spinal implant','Breast implant','Stent','Heart valve','Other']
const MONTH_NAMES  = ['January','February','March','April','May','June','July','August','September','October','November','December']
const DEVICE_TYPE_OPTIONS = [{ label: '— None —', value: '' }, ...DEVICE_TYPES.map(t => ({ label: t, value: t }))]
const MONTH_OPTIONS = [{ label: '— None —', value: '' }, ...MONTH_NAMES.map((m, i) => ({ label: m, value: String(i+1).padStart(2, '0') }))]

type SurgeonResult = { userId: string; name: string; email: string }
type ClinicResult  = { _id: string; name: string; city?: string; country?: string }

export default function AddImplantClient() {
  const { user }    = useUser()
  const { signOut } = useClerk()
  const router      = useRouter()
  const sidebarRef  = useRef<HTMLDivElement>(null)
  const sbBotRef    = useRef<HTMLDivElement>(null)

  // ── Sidebar state ─────────────────────────────────────────────────────────
  const [sbOpen,         setSbOpen]         = useState(false)
  const [sbCollapsed,    setSbCollapsed]    = useState(false)
  const [profileOpen,    setProfileOpen]    = useState(false)
  const [logoutOpen,     setLogoutOpen]     = useState(false)
  const [signingOut,     setSigningOut]     = useState(false)
  const [mobProfileOpen, setMobProfileOpen] = useState(false)

  // ── Device state ──────────────────────────────────────────────────────────
  const [deviceQuery,    setDeviceQuery]    = useState('')
  const [selectedDevice, setSelectedDevice] = useState<Record<string,string>|null>(null)
  const [deviceName,     setDeviceName]     = useState('')
  const [manufacturer,   setManufacturer]   = useState('')
  const [modelNumber,    setModelNumber]    = useState('')
  const [deviceType,     setDeviceType]     = useState('')

  // ── Date state ────────────────────────────────────────────────────────────
  const [implantMonth, setImplantMonth] = useState('')
  const [implantYear,  setImplantYear]  = useState('')

  // ── Surgeon state ─────────────────────────────────────────────────────────
  const [surgeonQuery,    setSurgeonQuery]    = useState('')
  const [selectedSurgeon, setSelectedSurgeon] = useState<SurgeonResult|null>(null)
  const [surgeonMode,     setSurgeonMode]     = useState<'search'|'manual'>('search')
  const [surgeonName,     setSurgeonName]     = useState('')
  const [surgeonEmail,    setSurgeonEmail]    = useState('')

  // ── Clinic state ──────────────────────────────────────────────────────────
  const [clinicQuery,        setClinicQuery]        = useState('')
  const [selectedClinic,     setSelectedClinic]     = useState<ClinicResult|null>(null)
  const [clinicMode,         setClinicMode]         = useState<'search'|'manual'>('search')
  const [clinicNameFallback, setClinicNameFallback] = useState('')

  // ── Submit state ──────────────────────────────────────────────────────────
  const [err,    setErr]    = useState('')
  const [saving, setSaving] = useState(false)

  // ── Convex queries / mutations ────────────────────────────────────────────
  const patient        = useQuery(api.patients.getMyPatient)
  const allDevices     = useQuery(api.devices.listDevices, {})
  const surgeonResults = useQuery(api.patients.searchSurgeonsForRegistration, { query: surgeonQuery })
  const clinicResults  = useQuery(api.clinics.listClinicsForPatients, { query: clinicQuery })
  const addImplant     = useMutation(api.patients.addSelfReportedImplant)

  // ── Effects ───────────────────────────────────────────────────────────────
  useEffect(() => {
    if (patient === null) router.replace('/patients/register')
  }, [patient, router])

  useEffect(() => {
    if (!profileOpen) return
    function onOutside(e: MouseEvent) {
      if (sbBotRef.current && !sbBotRef.current.contains(e.target as Node)) setProfileOpen(false)
    }
    document.addEventListener('mousedown', onOutside)
    return () => document.removeEventListener('mousedown', onOutside)
  }, [profileOpen])

  // ── Guards ────────────────────────────────────────────────────────────────
  if (patient === undefined || patient === null) return null

  // ── Derived ───────────────────────────────────────────────────────────────
  const fullName = `${user?.firstName ?? ''} ${user?.lastName ?? ''}`.trim() || user?.primaryEmailAddress?.emailAddress || ''
  const initials = fullName ? fullName.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase() : '?'

  const filteredDevices = (() => {
    if (!allDevices || deviceQuery.trim().length < 2 || selectedDevice) return []
    const q = deviceQuery.toLowerCase()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (allDevices as any[]).filter(d =>
      d.manufacturer?.toLowerCase().includes(q) ||
      d.model?.toLowerCase().includes(q) ||
      d.deviceType?.toLowerCase().includes(q)
    ).slice(0, 6)
  })()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function selectDevice(d: any) {
    setSelectedDevice(d)
    setDeviceName(`${d.manufacturer ?? ''} ${d.model ?? ''}`.trim())
    setManufacturer(d.manufacturer ?? '')
    setModelNumber(d.model ?? '')
    setDeviceType(d.deviceType ?? '')
    setDeviceQuery('')
  }

  function clearDevice() {
    setSelectedDevice(null)
    setDeviceName('')
    setManufacturer('')
    setModelNumber('')
    setDeviceType('')
  }

  function selectSurgeon(s: SurgeonResult) {
    setSelectedSurgeon(s)
    setSurgeonQuery('')
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function selectClinic(c: any) {
    setSelectedClinic({ _id: String(c._id), name: c.name, city: c.city, country: c.country })
    setClinicQuery('')
  }

  async function doSignOut() {
    setSigningOut(true)
    await signOut({ redirectUrl: '/login' })
  }

  async function doSubmit(e: React.FormEvent) {
    e.preventDefault()
    setErr('')
    if (!deviceName.trim()) { setErr('Please enter a device name.'); return }
    setSaving(true)
    try {
      await addImplant({
        device:       deviceName.trim(),
        manufacturer: manufacturer.trim() || undefined,
        deviceType:   deviceType || undefined,
        modelNumber:  modelNumber.trim() || undefined,
        implantMonth: implantMonth || undefined,
        implantYear:  implantYear.trim() || undefined,
        hospital:     selectedClinic?.name || clinicNameFallback.trim() || undefined,
        surgeonName:  (selectedSurgeon?.name || surgeonName.trim()) || undefined,
        surgeonEmail: (selectedSurgeon?.email || surgeonEmail.trim()) || undefined,
        clinicId:     selectedClinic?._id || undefined,
        clinicName:   selectedClinic?.name || clinicNameFallback.trim() || undefined,
      })
      router.push('/patients/dashboard')
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : 'Something went wrong. Please try again.')
      setSaving(false)
    }
  }

  const cardStyle: React.CSSProperties = {
    background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 16, padding: '22px 24px',
  }

  const sectionHeadStyle: React.CSSProperties = {
    fontFamily: 'var(--ff)', fontSize: 14, fontWeight: 700, margin: '0 0 16px',
    letterSpacing: '-.01em', color: 'var(--text)', display: 'flex', alignItems: 'center', gap: 8,
  }

  const labelStyle: React.CSSProperties = {
    fontFamily: 'var(--ff)', fontSize: 12.5, fontWeight: 500, color: 'var(--muted)', display: 'block', marginBottom: 6,
  }

  return (
    <>
      {/* Logout modal */}
      {logoutOpen && (
        <div className="logout-back open" onClick={() => !signingOut && setLogoutOpen(false)}>
          <div className="logout-modal" onClick={e => e.stopPropagation()}>
            <div className="logout-body">
              <div style={{ width:44, height:44, borderRadius:'50%', background:'color-mix(in srgb,var(--err) 10%,transparent)', border:'1px solid color-mix(in srgb,var(--err) 22%,transparent)', display:'grid', placeItems:'center', margin:'0 auto 14px' }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--err)" strokeWidth="1.7" aria-hidden="true">
                  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>
                </svg>
              </div>
              <h3>Log out of Implant ID?</h3>
              <p>You&apos;ll need to sign back in to access your implant record and wallet pass. Your data stays safe either way.</p>
            </div>
            <div className="logout-actions">
              <button className="btn btn-lg" onClick={() => setLogoutOpen(false)} disabled={signingOut}>← Back</button>
              <button className="btn btn-danger btn-lg" onClick={doSignOut} disabled={signingOut}>Yes, log out</button>
            </div>
          </div>
        </div>
      )}

      {/* Mobile sidebar overlay */}
      <div className={`sb-back${sbOpen ? ' open' : ''}`} onClick={() => setSbOpen(false)} />

      <div className={`app${sbCollapsed ? ' collapsed' : ''}`}>

        {/* ── Sidebar ──────────────────────────────────────────────────────── */}
        <aside className={`sidebar${sbOpen ? ' open' : ''}`}>
          <div className="sb-logo">
            <a href="/" className="logo">
              <img src="/icon.svg" alt="" />
              <span className="logo-text"><b>Implant</b><span>ID</span></span>
            </a>
            <button className="sb-toggle" aria-label="Collapse sidebar" onClick={() => setSbCollapsed(v => !v)}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="15 18 9 12 15 6"/>
              </svg>
            </button>
          </div>

          <div ref={sidebarRef} className="sb-scroll">
            <span className="sb-section">My record</span>
            <a className="sb-link active" href="/patients/dashboard" title="My record">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
                <rect x="3" y="3" width="7" height="9" rx="1.5"/>
                <rect x="14" y="3" width="7" height="5" rx="1.5"/>
                <rect x="14" y="12" width="7" height="9" rx="1.5"/>
                <rect x="3" y="16" width="7" height="5" rx="1.5"/>
              </svg>
              <span>My record</span>
            </a>
            <a className="sb-link" href="/patients/share" title="Share with clinic">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
                <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/>
                <path d="M16 6l-4-4-4 4M12 2v13"/>
              </svg>
              <span>Share with clinic</span>
            </a>

            <span className="sb-section">Find care</span>
            <a className="sb-link" href="/patients/find-care" title="Find a clinic">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
                <circle cx="12" cy="10" r="3"/>
              </svg>
              <span>Find a clinic</span>
            </a>

            <span className="sb-section">Account</span>
            <a className="sb-link" href="/patients/account" title="Account settings">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
                <circle cx="12" cy="12" r="3"/>
                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33h0a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51h0a1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82v0a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
              </svg>
              <span>Account settings</span>
            </a>
            <a className="sb-link" href="/patients/emergency" title="Emergency info">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.8 19.8 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.8 19.8 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.91.34 1.85.57 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
              <span>Emergency info</span>
            </a>

          </div>{/* /sb-scroll */}

          <div className="sb-profile-wrap">
            <div className="sb-bot" ref={sbBotRef}>
              <div className={`sb-profile-popup${profileOpen ? ' open' : ''}`} role="menu" aria-hidden={!profileOpen}>
                <div className="sb-pp-head">
                  <div className="sb-pp-name">{fullName}</div>
                  <div className="sb-pp-sub">Patient</div>
                </div>
                <a href="/patients/account" className="sb-pp-item" tabIndex={profileOpen ? 0 : -1}>My account</a>
                <a href="/patients/notifications" className="sb-pp-item" tabIndex={profileOpen ? 0 : -1}>Notifications</a>
                <a href="mailto:hello@implantid.io" className="sb-pp-item" tabIndex={profileOpen ? 0 : -1}>Help &amp; docs</a>
                <div className="sb-pp-divider" />
                <a href="https://implantid.io/legal/privacy" target="_blank" rel="noopener noreferrer" className="sb-pp-item" tabIndex={profileOpen ? 0 : -1}>Privacy Policy</a>
                <a href="https://implantid.io/legal/terms" target="_blank" rel="noopener noreferrer" className="sb-pp-item" tabIndex={profileOpen ? 0 : -1}>Terms of Service</a>
                <a href="https://implantid.io/legal/gdpr" target="_blank" rel="noopener noreferrer" className="sb-pp-item" tabIndex={profileOpen ? 0 : -1}>GDPR</a>
                <div className="sb-pp-divider" />
                <button className="sb-pp-item sb-pp-signout" onClick={() => { setProfileOpen(false); setLogoutOpen(true) }} tabIndex={profileOpen ? 0 : -1}>Sign out</button>
              </div>
              <div className={`sb-identity${profileOpen ? ' open' : ''}`} onClick={() => setProfileOpen(v => !v)} role="button" tabIndex={0} aria-expanded={profileOpen}>
                <div className="av">{initials}</div>
                <div>
                  <div className="name">{fullName}</div>
                  <div className="role">Patient</div>
                </div>
                <svg className="chev" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14"><polyline points="6 9 12 15 18 9"/></svg>
              </div>
            </div>
          </div>
        </aside>

        {/* ── App main ─────────────────────────────────────────────────────── */}
        <div className="app-main">

          {/* Mobile header */}
          <div className="mob-header">
            <a href="/patients/dashboard" className="mob-header-logo">
              <img src="/icon.svg" alt="" />
              <span className="logo-text"><b>Implant</b><span>ID</span></span>
            </a>
            <div className="mob-hdr-profile">
              <button className="mob-hdr-av" aria-label="Open profile menu" onClick={() => setMobProfileOpen(v => !v)}>
                {initials}
              </button>
            </div>
          </div>

          {/* Page content */}
          <div style={{ maxWidth: 680, margin: '0 auto', padding: '32px 24px 80px' }}>

            {/* Back nav */}
            <a
              href="/patients/dashboard"
              style={{ display:'inline-flex', alignItems:'center', gap:6, color:'var(--muted)', fontSize:13.5, fontFamily:'var(--ff)', textDecoration:'none', marginBottom:24, fontWeight:500 }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><polyline points="15 18 9 12 15 6"/></svg>
              Back to my record
            </a>

            <div style={{ marginBottom:28 }}>
              <h1 style={{ fontFamily:'var(--ff)', fontSize:'clamp(20px,2vw,26px)', fontWeight:700, letterSpacing:'-.025em', margin:'0 0 6px' }}>
                Add another implant
              </h1>
              <p style={{ fontFamily:'var(--ff)', fontSize:14, color:'var(--muted)', margin:0, lineHeight:1.5 }}>
                Self-reported records will be reviewed by your clinic. Fill in as much as you know.
              </p>
            </div>

            <form onSubmit={doSubmit} style={{ display:'flex', flexDirection:'column', gap:16 }}>

              {/* ── Section 1: Device ──────────────────────────────────────── */}
              <div style={cardStyle}>
                <h2 style={sectionHeadStyle}>
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2" aria-hidden="true"><rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8M12 17v4"/></svg>
                  Device
                </h2>

                {/* Catalogue search */}
                <div className="field" style={{ marginBottom: filteredDevices.length > 0 ? 0 : 12 }}>
                  <label style={labelStyle}>Search the catalogue</label>
                  {selectedDevice ? (
                    <div style={{ display:'flex', alignItems:'center', gap:10, background:'color-mix(in srgb,var(--accent) 8%,transparent)', border:'1px solid color-mix(in srgb,var(--accent) 25%,transparent)', borderRadius:10, padding:'10px 14px' }}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2.2" aria-hidden="true"><polyline points="20 6 9 17 4 12"/></svg>
                      <span style={{ fontFamily:'var(--ff)', fontSize:13.5, fontWeight:600, color:'var(--accent)', flex:1 }}>
                        {selectedDevice.manufacturer} {selectedDevice.model}
                        {selectedDevice.deviceType && <span style={{ fontWeight:400, color:'var(--accent-deep)', marginLeft:6 }}>· {selectedDevice.deviceType}</span>}
                      </span>
                      <button
                        type="button"
                        onClick={clearDevice}
                        aria-label="Clear selected device"
                        style={{ background:'none', border:'none', cursor:'pointer', color:'var(--muted)', fontSize:16, lineHeight:1, padding:'0 2px' }}
                      >×</button>
                    </div>
                  ) : (
                    <div style={{ position:'relative' }}>
                      <input
                        className="input"
                        type="text"
                        placeholder="Search published devices by name, manufacturer…"
                        value={deviceQuery}
                        onChange={e => setDeviceQuery(e.target.value)}
                        autoComplete="off"
                        style={{ paddingLeft: 36 }}
                      />
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--muted2)" strokeWidth="2" aria-hidden="true" style={{ position:'absolute', left:12, top:'50%', transform:'translateY(-50%)', pointerEvents:'none' }}>
                        <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
                      </svg>
                    </div>
                  )}
                </div>

                {/* Search results */}
                {filteredDevices.length > 0 && (
                  <div style={{ border:'1px solid var(--border)', borderRadius:10, overflow:'hidden', marginBottom:12, marginTop:4 }}>
                    {filteredDevices.map((d: Record<string,string>, i: number) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => selectDevice(d)}
                        style={{ width:'100%', display:'flex', alignItems:'center', gap:10, padding:'10px 14px', background:'var(--bg2)', border:'none', borderBottom: i < filteredDevices.length - 1 ? '1px solid var(--border)' : 'none', cursor:'pointer', textAlign:'left' }}
                        onMouseEnter={e => (e.currentTarget.style.background = 'color-mix(in srgb,var(--accent) 5%,var(--bg2))')}
                        onMouseLeave={e => (e.currentTarget.style.background = 'var(--bg2)')}
                      >
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="var(--muted2)" strokeWidth="2" aria-hidden="true"><rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8M12 17v4"/></svg>
                        <div style={{ flex:1 }}>
                          <div style={{ fontFamily:'var(--ff)', fontSize:13.5, fontWeight:600, color:'var(--text)' }}>
                            {d.manufacturer} {d.model}
                          </div>
                          {d.deviceType && <div style={{ fontSize:12, color:'var(--muted)', marginTop:1 }}>{d.deviceType}</div>}
                        </div>
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--muted2)" strokeWidth="2" aria-hidden="true"><polyline points="9 18 15 12 9 6"/></svg>
                      </button>
                    ))}
                  </div>
                )}
                {!selectedDevice && deviceQuery.trim().length >= 2 && allDevices && filteredDevices.length === 0 && (
                  <p style={{ fontFamily:'var(--ff)', fontSize:12.5, color:'var(--muted)', margin:'4px 0 12px' }}>
                    No matching devices found — enter details manually below.
                  </p>
                )}

                {/* Manual fields */}
                <div className="field" style={{ marginBottom:12 }}>
                  <label htmlFor="ai-device" style={labelStyle}>
                    Device name <span style={{ color:'var(--err)', marginLeft:3 }}>*</span>
                  </label>
                  <input
                    id="ai-device"
                    className="input"
                    type="text"
                    placeholder="e.g. Medtronic Micra AV"
                    value={deviceName}
                    onChange={e => setDeviceName(e.target.value)}
                    required
                  />
                </div>
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, marginBottom:12 }}>
                  <div className="field">
                    <label htmlFor="ai-mfr" style={labelStyle}>Manufacturer</label>
                    <input id="ai-mfr" className="input" type="text" placeholder="e.g. Medtronic" value={manufacturer} onChange={e => setManufacturer(e.target.value)} />
                  </div>
                  <div className="field">
                    <label htmlFor="ai-model" style={labelStyle}>Model number</label>
                    <input id="ai-model" className="input" type="text" placeholder="e.g. MC1VR01" value={modelNumber} onChange={e => setModelNumber(e.target.value)} />
                  </div>
                </div>
                <div className="field">
                  <label style={labelStyle}>Device type</label>
                  <CustomSelect value={deviceType} onChange={setDeviceType} options={DEVICE_TYPE_OPTIONS} placeholder="Select type (optional)" />
                </div>
              </div>

              {/* ── Section 2: Date ────────────────────────────────────────── */}
              <div style={cardStyle}>
                <h2 style={sectionHeadStyle}>
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2" aria-hidden="true"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>
                  When was it implanted?
                </h2>
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
                  <div className="field">
                    <label style={labelStyle}>Month</label>
                    <CustomSelect value={implantMonth} onChange={setImplantMonth} options={MONTH_OPTIONS} placeholder="Month (optional)" />
                  </div>
                  <div className="field">
                    <label htmlFor="ai-year" style={labelStyle}>Year</label>
                    <input id="ai-year" className="input" type="number" placeholder="e.g. 2021" min="1980" max="2030" value={implantYear} onChange={e => setImplantYear(e.target.value)} />
                  </div>
                </div>
              </div>

              {/* ── Section 3: Surgeon ─────────────────────────────────────── */}
              <div style={cardStyle}>
                <h2 style={sectionHeadStyle}>
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2" aria-hidden="true"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                  Who performed the procedure?
                </h2>
                <p style={{ fontFamily:'var(--ff)', fontSize:13, color:'var(--muted)', margin:'-8px 0 14px', lineHeight:1.4 }}>Optional — helps your clinic verify your record.</p>

                {surgeonMode === 'search' ? (
                  <>
                    {selectedSurgeon ? (
                      <div style={{ display:'flex', alignItems:'center', gap:10, background:'color-mix(in srgb,var(--accent) 8%,transparent)', border:'1px solid color-mix(in srgb,var(--accent) 25%,transparent)', borderRadius:10, padding:'10px 14px' }}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2.2" aria-hidden="true"><polyline points="20 6 9 17 4 12"/></svg>
                        <div style={{ flex:1 }}>
                          <div style={{ fontFamily:'var(--ff)', fontSize:13.5, fontWeight:600, color:'var(--accent)' }}>{selectedSurgeon.name}</div>
                          <div style={{ fontSize:12, color:'var(--muted)', marginTop:1 }}>{selectedSurgeon.email}</div>
                        </div>
                        <button
                          type="button"
                          onClick={() => setSelectedSurgeon(null)}
                          aria-label="Clear selected surgeon"
                          style={{ background:'none', border:'none', cursor:'pointer', color:'var(--muted)', fontSize:16, lineHeight:1, padding:'0 2px' }}
                        >×</button>
                      </div>
                    ) : (
                      <>
                        <div className="field" style={{ marginBottom: surgeonResults && surgeonResults.length > 0 ? 0 : 8 }}>
                          <label htmlFor="ai-surg-q" style={labelStyle}>Search by name or email</label>
                          <div style={{ position:'relative' }}>
                            <input
                              id="ai-surg-q"
                              className="input"
                              type="text"
                              placeholder="e.g. Dr. Sarah Jones"
                              value={surgeonQuery}
                              onChange={e => setSurgeonQuery(e.target.value)}
                              autoComplete="off"
                              style={{ paddingLeft: 36 }}
                            />
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--muted2)" strokeWidth="2" aria-hidden="true" style={{ position:'absolute', left:12, top:'50%', transform:'translateY(-50%)', pointerEvents:'none' }}>
                              <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
                            </svg>
                          </div>
                        </div>

                        {/* Surgeon results */}
                        {surgeonResults && surgeonResults.length > 0 && (
                          <div style={{ border:'1px solid var(--border)', borderRadius:10, overflow:'hidden', marginBottom:8, marginTop:4 }}>
                            {(surgeonResults as SurgeonResult[]).map((s, i) => (
                              <button
                                key={String(s.userId)}
                                type="button"
                                onClick={() => selectSurgeon(s)}
                                style={{ width:'100%', display:'flex', alignItems:'center', gap:10, padding:'10px 14px', background:'var(--bg2)', border:'none', borderBottom: i < surgeonResults.length - 1 ? '1px solid var(--border)' : 'none', cursor:'pointer', textAlign:'left' }}
                                onMouseEnter={e => (e.currentTarget.style.background = 'color-mix(in srgb,var(--accent) 5%,var(--bg2))')}
                                onMouseLeave={e => (e.currentTarget.style.background = 'var(--bg2)')}
                              >
                                <div style={{ width:30, height:30, borderRadius:'50%', background:'color-mix(in srgb,var(--accent) 12%,transparent)', display:'grid', placeItems:'center', flexShrink:0 }}>
                                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2" aria-hidden="true"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                                </div>
                                <div style={{ flex:1 }}>
                                  <div style={{ fontFamily:'var(--ff)', fontSize:13.5, fontWeight:600, color:'var(--text)' }}>{s.name}</div>
                                  <div style={{ fontSize:12, color:'var(--muted)', marginTop:1 }}>{s.email}</div>
                                </div>
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--muted2)" strokeWidth="2" aria-hidden="true"><polyline points="9 18 15 12 9 6"/></svg>
                              </button>
                            ))}
                          </div>
                        )}

                        {surgeonQuery.trim().length >= 2 && surgeonResults?.length === 0 && (
                          <p style={{ fontFamily:'var(--ff)', fontSize:12.5, color:'var(--muted)', margin:'4px 0 8px' }}>
                            No surgeon found with that name.
                          </p>
                        )}

                        <button
                          type="button"
                          onClick={() => setSurgeonMode('manual')}
                          style={{ background:'none', border:'none', cursor:'pointer', fontFamily:'var(--ff)', fontSize:13, color:'var(--accent)', padding:0, textDecoration:'underline', textUnderlineOffset:2 }}
                        >
                          Not listed? Enter their details →
                        </button>
                      </>
                    )}
                  </>
                ) : (
                  /* Manual surgeon entry */
                  <>
                    <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, marginBottom:12 }}>
                      <div className="field">
                        <label htmlFor="ai-surg-name" style={labelStyle}>Surgeon name</label>
                        <input id="ai-surg-name" className="input" type="text" placeholder="e.g. Dr. Sarah Jones" value={surgeonName} onChange={e => setSurgeonName(e.target.value)} />
                      </div>
                      <div className="field">
                        <label htmlFor="ai-surg-email" style={labelStyle}>Surgeon email (optional)</label>
                        <input id="ai-surg-email" className="input" type="email" placeholder="surgeon@clinic.com" value={surgeonEmail} onChange={e => setSurgeonEmail(e.target.value)} />
                      </div>
                    </div>
                    <div style={{ background:'color-mix(in srgb,var(--ok) 8%,transparent)', border:'1px solid color-mix(in srgb,var(--ok) 22%,transparent)', borderRadius:8, padding:'9px 12px', display:'flex', alignItems:'flex-start', gap:8, marginBottom:10 }}>
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="var(--ok)" strokeWidth="2" style={{ flexShrink:0, marginTop:1 }} aria-hidden="true"><circle cx="12" cy="12" r="10"/><path d="M12 8v4M12 16h.01"/></svg>
                      <p style={{ fontFamily:'var(--ff)', fontSize:12.5, color:'var(--ok)', margin:0, lineHeight:1.4 }}>
                        If you provide an email, we&apos;ll invite them to join Implant ID and link them to your record.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setSurgeonMode('search')}
                      style={{ background:'none', border:'none', cursor:'pointer', fontFamily:'var(--ff)', fontSize:13, color:'var(--muted)', padding:0, textDecoration:'underline', textUnderlineOffset:2 }}
                    >
                      ← Search instead
                    </button>
                  </>
                )}
              </div>

              {/* ── Section 4: Clinic ──────────────────────────────────────── */}
              <div style={cardStyle}>
                <h2 style={sectionHeadStyle}>
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2" aria-hidden="true"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
                  Where was it performed?
                </h2>
                <p style={{ fontFamily:'var(--ff)', fontSize:13, color:'var(--muted)', margin:'-8px 0 14px', lineHeight:1.4 }}>Optional — the clinic or hospital where you had the procedure.</p>

                {clinicMode === 'search' ? (
                  <>
                    {selectedClinic ? (
                      <div style={{ display:'flex', alignItems:'center', gap:10, background:'color-mix(in srgb,var(--accent) 8%,transparent)', border:'1px solid color-mix(in srgb,var(--accent) 25%,transparent)', borderRadius:10, padding:'10px 14px' }}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2.2" aria-hidden="true"><polyline points="20 6 9 17 4 12"/></svg>
                        <div style={{ flex:1 }}>
                          <div style={{ fontFamily:'var(--ff)', fontSize:13.5, fontWeight:600, color:'var(--accent)' }}>{selectedClinic.name}</div>
                          {(selectedClinic.city || selectedClinic.country) && (
                            <div style={{ fontSize:12, color:'var(--muted)', marginTop:1 }}>{[selectedClinic.city, selectedClinic.country].filter(Boolean).join(', ')}</div>
                          )}
                        </div>
                        <button
                          type="button"
                          onClick={() => setSelectedClinic(null)}
                          aria-label="Clear selected clinic"
                          style={{ background:'none', border:'none', cursor:'pointer', color:'var(--muted)', fontSize:16, lineHeight:1, padding:'0 2px' }}
                        >×</button>
                      </div>
                    ) : (
                      <>
                        <div className="field" style={{ marginBottom: clinicQuery.trim().length >= 2 && clinicResults && clinicResults.length > 0 ? 0 : 8 }}>
                          <label htmlFor="ai-clinic-q" style={labelStyle}>Search by clinic or hospital name</label>
                          <div style={{ position:'relative' }}>
                            <input
                              id="ai-clinic-q"
                              className="input"
                              type="text"
                              placeholder="e.g. Royal Edinburgh Hospital"
                              value={clinicQuery}
                              onChange={e => setClinicQuery(e.target.value)}
                              autoComplete="off"
                              style={{ paddingLeft: 36 }}
                            />
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--muted2)" strokeWidth="2" aria-hidden="true" style={{ position:'absolute', left:12, top:'50%', transform:'translateY(-50%)', pointerEvents:'none' }}>
                              <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
                            </svg>
                          </div>
                        </div>

                        {/* Clinic results */}
                        {clinicQuery.trim().length >= 2 && clinicResults && clinicResults.length > 0 && (
                          // eslint-disable-next-line @typescript-eslint/no-explicit-any
                          <div style={{ border:'1px solid var(--border)', borderRadius:10, overflow:'hidden', marginBottom:8, marginTop:4 }}>
                            {(clinicResults as any[]).slice(0, 6).map((c: any, i: number) => (
                              <button
                                key={String(c._id)}
                                type="button"
                                onClick={() => selectClinic(c)}
                                style={{ width:'100%', display:'flex', alignItems:'center', gap:10, padding:'10px 14px', background:'var(--bg2)', border:'none', borderBottom: i < Math.min(clinicResults.length, 6) - 1 ? '1px solid var(--border)' : 'none', cursor:'pointer', textAlign:'left' }}
                                onMouseEnter={e => (e.currentTarget.style.background = 'color-mix(in srgb,var(--accent) 5%,var(--bg2))')}
                                onMouseLeave={e => (e.currentTarget.style.background = 'var(--bg2)')}
                              >
                                <div style={{ width:30, height:30, borderRadius:'50%', background:'color-mix(in srgb,var(--accent) 12%,transparent)', display:'grid', placeItems:'center', flexShrink:0 }}>
                                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2" aria-hidden="true"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
                                </div>
                                <div style={{ flex:1 }}>
                                  <div style={{ fontFamily:'var(--ff)', fontSize:13.5, fontWeight:600, color:'var(--text)' }}>{c.name}</div>
                                  {(c.city || c.country) && (
                                    <div style={{ fontSize:12, color:'var(--muted)', marginTop:1 }}>{[c.city, c.country].filter(Boolean).join(', ')}</div>
                                  )}
                                </div>
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--muted2)" strokeWidth="2" aria-hidden="true"><polyline points="9 18 15 12 9 6"/></svg>
                              </button>
                            ))}
                          </div>
                        )}

                        {clinicQuery.trim().length >= 2 && clinicResults?.length === 0 && (
                          <p style={{ fontFamily:'var(--ff)', fontSize:12.5, color:'var(--muted)', margin:'4px 0 8px' }}>
                            No clinic found with that name.
                          </p>
                        )}

                        <button
                          type="button"
                          onClick={() => setClinicMode('manual')}
                          style={{ background:'none', border:'none', cursor:'pointer', fontFamily:'var(--ff)', fontSize:13, color:'var(--accent)', padding:0, textDecoration:'underline', textUnderlineOffset:2 }}
                        >
                          Not listed? Enter the name →
                        </button>
                      </>
                    )}
                  </>
                ) : (
                  /* Manual clinic entry */
                  <>
                    <div className="field" style={{ marginBottom:10 }}>
                      <label htmlFor="ai-clinic-name" style={labelStyle}>Clinic or hospital name</label>
                      <input id="ai-clinic-name" className="input" type="text" placeholder="e.g. Royal Edinburgh Hospital" value={clinicNameFallback} onChange={e => setClinicNameFallback(e.target.value)} />
                    </div>
                    <button
                      type="button"
                      onClick={() => setClinicMode('search')}
                      style={{ background:'none', border:'none', cursor:'pointer', fontFamily:'var(--ff)', fontSize:13, color:'var(--muted)', padding:0, textDecoration:'underline', textUnderlineOffset:2 }}
                    >
                      ← Search instead
                    </button>
                  </>
                )}
              </div>

              {/* ── Error banner ───────────────────────────────────────────── */}
              {err && (
                <div style={{ background:'color-mix(in srgb,var(--err) 8%,transparent)', border:'1px solid color-mix(in srgb,var(--err) 20%,transparent)', borderRadius:10, padding:'11px 15px', color:'var(--err)', fontFamily:'var(--ff)', fontSize:13.5, lineHeight:1.4 }}>
                  {err}
                </div>
              )}

              {/* ── Actions ────────────────────────────────────────────────── */}
              <div style={{ display:'flex', gap:12 }}>
                <a
                  href="/patients/dashboard"
                  className="btn btn-lg"
                  style={{ flex:1, justifyContent:'center', textDecoration:'none', display:'inline-flex', alignItems:'center' }}
                >
                  Cancel
                </a>
                <button
                  type="submit"
                  className="btn btn-s btn-lg"
                  style={{ flex:2, justifyContent:'center' }}
                  disabled={saving || !deviceName.trim()}
                >
                  {saving ? 'Saving…' : 'Add implant'}
                </button>
              </div>

            </form>
          </div>
        </div>
      </div>

      <div className={`mob-sheet-backdrop${mobProfileOpen ? ' open' : ''}`} onClick={() => setMobProfileOpen(false)} aria-hidden="true" />
      <div className={`mob-sheet${mobProfileOpen ? ' open' : ''}`} role="dialog" aria-modal={mobProfileOpen} aria-label="Profile menu">
        <div className="mob-sheet-handle" aria-hidden="true" />
        <div className="mob-sheet-info">
          <strong>{fullName}</strong>
          <span>Patient</span>
        </div>
        <a href="/patients/account" className="mob-sheet-item">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"><circle cx="12" cy="7" r="4"/><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/></svg>
          My account
        </a>
        <a href="/patients/notifications" className="mob-sheet-item">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
          Notifications
        </a>
        <a href="mailto:hello@implantid.io" className="mob-sheet-item">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"><circle cx="12" cy="12" r="9"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3M12 17h.01"/></svg>
          Help &amp; docs
        </a>
        <div className="mob-sheet-divider" />
        <span className="mob-sheet-section">Legal</span>
        <a href="https://implantid.io/legal/privacy" target="_blank" rel="noopener noreferrer" className="mob-sheet-item">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
          Privacy Policy
        </a>
        <a href="https://implantid.io/legal/terms" target="_blank" rel="noopener noreferrer" className="mob-sheet-item">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
          Terms of Service
        </a>
        <a href="https://implantid.io/legal/gdpr" target="_blank" rel="noopener noreferrer" className="mob-sheet-item">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><polyline points="9 12 11 14 15 10"/></svg>
          GDPR
        </a>
        <div className="mob-sheet-divider" />
        <button className="mob-sheet-item mob-sheet-danger" onClick={() => { setMobProfileOpen(false); setLogoutOpen(true) }}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
          Sign out
        </button>
      </div>
    </>
  )
}
