'use client'
import { useState, useEffect, useRef } from 'react'
import { useUser, useClerk }           from '@clerk/nextjs'
import { useQuery, useMutation }        from 'convex/react'
import { api }                         from '../../../../convex/_generated/api'
import { useRouter, useSearchParams }   from 'next/navigation'
import QRCode                          from 'qrcode'
import { CustomSelect }               from '@/components/ui/CustomSelect'


// ── Confetti fall from top ────────────────────────────────────────────────────
const CONFETTI_COLORS = ['#29869f','#29a8cc','#2f9e72','#d97d2c','#8b5cf6','#ec4899','#f59e0b']
function ConfettiBurst({ onDone }: { onDone: () => void }) {
  useEffect(() => {
    const t = setTimeout(onDone, 3600)
    return () => clearTimeout(t)
  }, [onDone])
  const pieces = Array.from({ length: 90 }, (_, i) => ({
    id: i,
    x:     Math.random() * 100,
    color: CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)],
    size:  6 + Math.random() * 7,
    dur:   1.4 + Math.random() * 1.6,
    del:   Math.random() * 0.7,
    dx:    (Math.random() - 0.5) * 80,
    rot:   Math.random() * 720 - 360,
    round: Math.random() > 0.5,
  }))
  return (
    <>
      <style>{`
        @keyframes cf-fall {
          0%   { transform: translateY(-20px) rotate(0deg); opacity:1; }
          100% { transform: translateY(100vh) translateX(var(--cfdx)) rotate(var(--cfr)); opacity:0; }
        }
      `}</style>
      <div style={{ position:'fixed', inset:0, pointerEvents:'none', zIndex:9999, overflow:'hidden' }}>
        {pieces.map(p => (
          <div key={p.id} style={{
            position: 'absolute',
            left: `${p.x}%`, top: 0,
            width: p.size, height: p.size,
            background: p.color,
            borderRadius: p.round ? '50%' : '2px',
            ['--cfr'  as string]: `${p.rot}deg`,
            ['--cfdx' as string]: `${p.dx}px`,
            animation: `cf-fall ${p.dur}s ${p.del}s ease-in forwards`,
          }} />
        ))}
      </div>
    </>
  )
}

export default function DashboardClient() {
  const { user, isLoaded }  = useUser()
  const { signOut }         = useClerk()
  const router              = useRouter()
  const searchParams        = useSearchParams()
  const patient             = useQuery(api.patients.getMyPatient)
  const implantSafety       = useQuery(api.patients.getMyImplantSafety)
  const linkedDevices       = useQuery(api.patients.getMyLinkedDevices)
  const notifications       = useQuery(api.patients.getMyNotifications)
  const allClinics          = useQuery(api.clinics.listClinics)
  const markWelcomeSeen        = useMutation(api.patients.markWelcomeSeen)
  const markRead               = useMutation(api.patients.markAllNotificationsRead)
  const shareRecordWithClinic  = useMutation(api.patients.shareRecordWithClinic)
  const clinicAccess           = useQuery((api as any).patients.getMyClinicAccess)
  const addImplantMut          = useMutation((api as any).patients.addSelfReportedImplant)
  const revokeAccessMut        = useMutation((api as any).patients.revokeClinicAccess)

  // ── UI state ──────────────────────────────────────────────────────────────
  const [qrDataUrl,     setQrDataUrl]     = useState<string>('')
  const [clinicSearch,  setClinicSearch]  = useState('')
  const [sharing,       setSharing]       = useState(false)
  const [shareError,    setShareError]    = useState('')
  const [sbCollapsed,   setSbCollapsed]   = useState(false)
  const [sbOpen,        setSbOpen]        = useState(false)
  const [profileOpen,   setProfileOpen]   = useState(false)
  const [mobProfileOpen,setMobProfileOpen]= useState(false)
  const [notifOpen,     setNotifOpen]     = useState(false)
  const [logoutOpen,    setLogoutOpen]    = useState(false)
  const [wallOpen,      setWallOpen]      = useState(false)
  const [wallMode,      setWallMode]      = useState<'wallet' | 'email'>('wallet')
  const [emailSent,     setEmailSent]     = useState(false)
  const [linkCopied,    setLinkCopied]    = useState(false)
  const [clinicEmail,   setClinicEmail]   = useState('')
  const [showConfetti,  setShowConfetti]  = useState(false)
  const [welcomeOpen,     setWelcomeOpen]     = useState(false)
  const [welcomeStep,     setWelcomeStep]     = useState<'welcome' | 'verify-email'>('welcome')
  const [wEmailSent,        setWEmailSent]        = useState(false)
  const [wEmailSending,     setWEmailSending]     = useState(false)
  const [wEmailCode,        setWEmailCode]        = useState(['','','','','',''])
  const [wEmailErr,         setWEmailErr]         = useState('')
  const [wEmailLoading,     setWEmailLoading]     = useState(false)
  const [wEmailResent,      setWEmailResent]      = useState(false)
  const [wResendAt,         setWResendAt]         = useState(0)
  const [wResendCountdown,  setWResendCountdown]  = useState(0)
  const [wEmailDone,        setWEmailDone]        = useState(false)

  // Phase 2 — add another implant modal
  const [implantOpen,    setImplantOpen]    = useState(false)
  const [implantSaving,  setImplantSaving]  = useState(false)
  const [implantErr,     setImplantErr]     = useState('')
  const [implantForm,    setImplantForm]    = useState({ device: '', manufacturer: '', deviceType: '', modelNumber: '', implantMonth: '', implantYear: '' })

  // Phase 4 — revoke clinic access confirmation
  const [revokeId,    setRevokeId]    = useState<string | null>(null)
  const [revoking,    setRevoking]    = useState(false)

  const [photoUploading, setPhotoUploading] = useState(false)
  const photoInputRef   = useRef<HTMLInputElement>(null)
  const sbBotRef        = useRef<HTMLDivElement>(null)
  const mobProfileRef   = useRef<HTMLDivElement>(null)
  const wCodeRefs       = useRef<(HTMLInputElement | null)[]>([])
  // Prevents the welcome init effect from re-running when Clerk updates the user object mid-flow
  const welcomeShownRef = useRef(false)

  // Generate QR code data URL for the pass card
  useEffect(() => {
    if (!patient?.implantIdCode) return
    QRCode.toDataURL(`https://portal.implantid.io/scan/${patient.implantIdCode}`, { width: 280, margin: 1, color: { dark: '#0e2a33', light: '#ffffff' } })
      .then((url: string) => setQrDataUrl(url))
      .catch(() => {})
  }, [patient?.implantIdCode])

  // Scroll to section if specified in query params
  useEffect(() => {
    const section = searchParams.get('section')
    if (section === 'documents') {
      setTimeout(() => {
        document.getElementById('documents-section')?.scrollIntoView({ behavior: 'smooth' })
      }, 100)
    }
  }, [searchParams])

  // Close dropdowns when clicking outside
  useEffect(() => {
    function handle(e: MouseEvent) {
      const t = e.target as HTMLElement
      if (sbBotRef.current && !sbBotRef.current.contains(t)) setProfileOpen(false)
      if (mobProfileRef.current && !mobProfileRef.current.contains(t)) setMobProfileOpen(false)
    }
    document.addEventListener('mousedown', handle)
    return () => document.removeEventListener('mousedown', handle)
  }, [])

  // Escape key closes modals/drawers
  useEffect(() => {
    function handle(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        setLogoutOpen(false); setWallOpen(false); setNotifOpen(false)
      }
    }
    document.addEventListener('keydown', handle)
    return () => document.removeEventListener('keydown', handle)
  }, [])

  // Redirect to registration if no patient record
  // Only redirect to register when genuinely logged-in with no patient record.
  // Do NOT redirect during logout — Convex returns null as the session clears,
  // which would race against signOut's own redirectUrl and flash /patients/register.
  useEffect(() => {
    if (patient === null && isLoaded && user) router.replace('/patients/register')
  }, [patient, router, isLoaded, user])

  // Confetti on first visit after registration
  useEffect(() => {
    if (patient && typeof sessionStorage !== 'undefined') {
      const flag = sessionStorage.getItem('iid_just_registered')
      if (flag) {
        sessionStorage.removeItem('iid_just_registered')
        setShowConfetti(true)
      }
    }
  }, [patient])

  // Welcome overlay — shown once per patient (tracked in Convex so it persists across devices).
  // welcomeShownRef prevents this from re-running when Clerk updates the user object mid-flow
  // (e.g. after prepareVerification), which would otherwise reset the current step.
  useEffect(() => {
    if (!patient || !user || welcomeShownRef.current) return
    if (!(patient as Record<string, unknown>).welcomeSeen) {
      welcomeShownRef.current = true
      const emailAddr = user.primaryEmailAddress ?? user.emailAddresses?.[0] ?? null
      const emailVerified = emailAddr?.verification?.status === 'verified'
      // If email already verified (or no email in Clerk), skip the popup entirely
      if (!emailAddr || emailVerified) { markWelcomeSeen(); return }
      setWelcomeStep('welcome')
      setWelcomeOpen(true)
    }
  }, [patient, user])

  // Auto-send email verification code when entering verify-email screen
  useEffect(() => {
    if (welcomeStep !== 'verify-email' || wEmailSent || !user) return
    async function send() {
      setWEmailSending(true)
      setWEmailErr('')
      // Use primary email, or first email address on the account (handles phone-signup users)
      const emailAddr = user!.primaryEmailAddress ?? user!.emailAddresses?.[0] ?? null
      if (!emailAddr) {
        setWEmailErr('No email address is linked to your Clerk account. Please add one in Account Settings.')
        setWEmailSending(false)
        return
      }
      try {
        await emailAddr.prepareVerification({ strategy: 'email_code' })
        setWEmailSent(true)
        setWResendAt(Date.now())
      } catch (ex: unknown) {
        const e = ex as { errors?: Array<{ message: string }> }
        setWEmailErr(e?.errors?.[0]?.message ?? (ex instanceof Error ? ex.message : 'Could not send code — please try again'))
      } finally {
        setWEmailSending(false)
      }
    }
    send()
  }, [welcomeStep, wEmailSent, user])

  // 30-second resend countdown
  useEffect(() => {
    if (wResendAt === 0) return
    const COOLDOWN = 30
    const tick = () => {
      const remaining = Math.max(0, COOLDOWN - Math.floor((Date.now() - wResendAt) / 1000))
      setWResendCountdown(remaining)
    }
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [wResendAt])

  // ── Loading / redirect states ─────────────────────────────────────────────
  // Wait for BOTH patient AND implantSafety before rendering the card.
  // This prevents the flash where the card briefly shows the wrong colour
  // (e.g. default teal → orange for MR Conditional).
  if (!isLoaded || patient === undefined) {
    return <div style={{ minHeight: '100vh', background: 'var(--bg)' }} />
  }
  if (patient === null) return null // redirecting
  // If verified, wait for both implantSafety AND linkedDevices to avoid colour/content flash
  const cardReady = patient.verificationStatus !== 'active' || (implantSafety !== undefined && linkedDevices !== undefined)

  // ── Derived data ──────────────────────────────────────────────────────────
  const firstName   = patient.firstName
  const lastName    = patient.lastName
  const fullName    = `${firstName} ${lastName}`
  const initials    = `${firstName[0] ?? ''}${lastName[0] ?? ''}`.toUpperCase()
  const iidCode     = patient.implantIdCode
  const isPending   = !patient.verificationStatus || patient.verificationStatus === 'pending'
  const passUrl     = `${typeof window !== 'undefined' ? window.location.origin : 'https://implantid.io'}/pass/${iidCode}`

  function doSignOut() {
    setLogoutOpen(false)
    signOut({ redirectUrl: '/login' })
  }

  async function handlePhotoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file || !user) return
    setPhotoUploading(true)
    try {
      await user.setProfileImage({ file })
    } catch { /* non-fatal */ } finally {
      setPhotoUploading(false)
      if (photoInputRef.current) photoInputRef.current.value = ''
    }
  }

  function copyLink() {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(passUrl)
    }
    setLinkCopied(true)
    setTimeout(() => setLinkCopied(false), 1800)
  }

  const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']

  function doneWelcome() {
    markWelcomeSeen()
    setWelcomeOpen(false)
  }

  // Accepts the code string directly so callers (auto-submit or button) never read stale state
  async function doVerifyEmail(codeStr: string) {
    if (codeStr.length < 6) { setWEmailErr('Enter the full 6-digit code'); return }
    const emailAddr = user?.primaryEmailAddress ?? user?.emailAddresses?.[0] ?? null
    if (!emailAddr) { setWEmailErr('No email address found on your account'); return }
    setWEmailLoading(true)
    setWEmailErr('')
    try {
      await emailAddr.attemptVerification({ code: codeStr })
      setWEmailDone(true)
      // Email verified — close the popup after showing success state
      setTimeout(() => doneWelcome(), 1800)
    } catch (ex: unknown) {
      const e = ex as { errors?: Array<{ message: string }> }
      const raw = e?.errors?.[0]?.message ?? (ex instanceof Error ? ex.message : '')
      // Clerk returns "is incorrect" verbatim — make it readable
      setWEmailErr(raw === 'is incorrect' ? 'Incorrect code — check your email and try again' : (raw || 'Verification failed — please try again'))
    } finally {
      setWEmailLoading(false)
    }
  }

  function resendWelcomeEmail() {
    if (wResendCountdown > 0) return
    setWEmailSent(false)  // triggers auto-send useEffect
    setWEmailCode(['','','','','',''])
    setWEmailErr('')
    setWEmailDone(false)
    setWEmailResent(true)
    setTimeout(() => setWEmailResent(false), 2500)
  }

  async function doAddImplant(e: React.FormEvent) {
    e.preventDefault()
    if (!implantForm.device.trim()) { setImplantErr('Device name is required'); return }
    setImplantSaving(true); setImplantErr('')
    try {
      await addImplantMut({
        device:       implantForm.device.trim(),
        manufacturer: implantForm.manufacturer.trim() || undefined,
        deviceType:   implantForm.deviceType.trim() || undefined,
        modelNumber:  implantForm.modelNumber.trim() || undefined,
        implantMonth: implantForm.implantMonth || undefined,
        implantYear:  implantForm.implantYear || undefined,
      })
      setImplantOpen(false)
      setImplantForm({ device: '', manufacturer: '', deviceType: '', modelNumber: '', implantMonth: '', implantYear: '' })
    } catch { setImplantErr('Failed to save — please try again') }
    finally   { setImplantSaving(false) }
  }

  async function doRevoke() {
    if (!revokeId) return
    setRevoking(true)
    try {
      await revokeAccessMut({ requestId: revokeId as any })
      setRevokeId(null)
    } catch { /* non-fatal — query will refresh */ }
    finally { setRevoking(false) }
  }

  // Parse additional self-reported implants from JSON
  const extraImplants: Array<{ device: string; manufacturer?: string; deviceType?: string; modelNumber?: string; implantMonth?: string; implantYear?: string; addedAt?: number }> = (() => {
    try { return JSON.parse((patient as any).selfReportedImplants ?? '[]') }
    catch { return [] }
  })()

  const DEVICE_TYPES = ['Pacemaker','ICD (Defibrillator)','CRT device','Neurostimulator / DBS','Cochlear implant','Retinal implant','Hip replacement','Knee replacement','Shoulder replacement','Spinal implant','Breast implant','Stent','Heart valve','Other']
  const MONTH_NAMES  = ['January','February','March','April','May','June','July','August','September','October','November','December']
  const DEVICE_TYPE_OPTIONS = [{ label: '— None —', value: '' }, ...DEVICE_TYPES.map(t => ({ label: t, value: t }))]
  const MONTH_OPTIONS       = [{ label: '— None —', value: '' }, ...MONTH_NAMES.map((m, i) => ({ label: m, value: String(i+1).padStart(2, '0') }))]

  return (
    <>
      {showConfetti && <ConfettiBurst onDone={() => setShowConfetti(false)} />}

      {/* ── Welcome overlay ────────────────────────────────────────────────── */}
      {welcomeOpen && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 2000,
          background: 'rgba(10,20,30,.6)',
          backdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: 16,
        }}>
          <div style={{
            background: 'var(--bg2)', borderRadius: 18,
            width: '100%', maxWidth: 380,
            boxShadow: '0 24px 60px rgba(0,0,0,.28)',
          }}>

            {/* Step dots */}
            <div style={{ display:'flex', gap:5, justifyContent:'center', padding:'20px 28px 0' }}>
              {(['welcome','verify-email'] as const).map(s => (
                <div key={s} style={{
                  height: 3, flex: 1, borderRadius: 99,
                  background: welcomeStep === s || (s === 'welcome' && welcomeStep === 'verify-email')
                    ? 'var(--accent)' : 'var(--border2)',
                  transition: 'background .2s',
                }} />
              ))}
            </div>

            {/* Screen 1: Welcome */}
            {welcomeStep === 'welcome' && (
              <div style={{ padding: '24px 28px 28px' }}>
                <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:20 }}>
                  <div style={{
                    width:40, height:40, borderRadius:12, flexShrink:0,
                    background: 'color-mix(in srgb,var(--accent) 10%,transparent)',
                    display:'grid', placeItems:'center',
                  }}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="1.7">
                      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                      <path d="m9 12 2 2 4-4"/>
                    </svg>
                  </div>
                  <div>
                    <div style={{ fontFamily:'var(--ff)', fontWeight:700, fontSize:16, color:'var(--text)', lineHeight:1.2 }}>Welcome, {firstName}!</div>
                    <div style={{ fontSize:12.5, color:'var(--muted)', marginTop:2 }}>Here&apos;s what happens next</div>
                  </div>
                </div>

                {/* Steps — single vertical line behind all circles */}
                <div style={{ position:'relative', marginBottom:24 }}>
                  {/* Line runs from centre of circle 1 down to centre of circle 3 */}
                  <div style={{ position:'absolute', left:15, top:16, bottom:16, width:2, background:'var(--border2)', zIndex:0 }} />

                  {/* 1 — Verify email */}
                  <div style={{ display:'flex', gap:12, alignItems:'flex-start', marginBottom:14 }}>
                    <div style={{ width:32, height:32, borderRadius:'50%', flexShrink:0, zIndex:1, position:'relative', background:'color-mix(in srgb,var(--accent) 10%,transparent)', border:'1.5px solid var(--accent)', display:'grid', placeItems:'center' }}>
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2.2">
                        <path d="M4 4h16a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z"/>
                        <path d="m22 6-10 7L2 6"/>
                      </svg>
                    </div>
                    <div style={{ paddingTop:4 }}>
                      <div style={{ fontFamily:'var(--ff)', fontWeight:600, fontSize:14, color:'var(--text)' }}>Verify your email</div>
                      <div style={{ fontSize:12.5, color:'var(--muted)', marginTop:2 }}>Confirm your address — takes 30 seconds</div>
                    </div>
                  </div>

                  {/* 2 — Approval */}
                  <div style={{ display:'flex', gap:12, alignItems:'flex-start', marginBottom:14 }}>
                    <div style={{ width:32, height:32, borderRadius:'50%', flexShrink:0, zIndex:1, position:'relative', background:'var(--bg2)', border:'1.5px solid var(--border2)', display:'grid', placeItems:'center' }}>
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="var(--muted2)" strokeWidth="2.2">
                        <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
                      </svg>
                    </div>
                    <div style={{ paddingTop:4 }}>
                      <div style={{ fontFamily:'var(--ff)', fontWeight:600, fontSize:14, color:'var(--muted)' }}>Implant ID approved</div>
                      <div style={{ fontSize:12.5, color:'var(--muted2)', marginTop:2 }}>1–3 working days · your clinic verifies your implant details</div>
                    </div>
                  </div>

                  {/* 3 — Unlock */}
                  <div style={{ display:'flex', gap:12, alignItems:'flex-start' }}>
                    <div style={{ width:32, height:32, borderRadius:'50%', flexShrink:0, zIndex:1, position:'relative', background:'var(--bg2)', border:'1.5px solid var(--border2)', display:'grid', placeItems:'center' }}>
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="var(--muted2)" strokeWidth="2.2">
                        <rect x="3" y="11" width="18" height="11" rx="2"/>
                        <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                      </svg>
                    </div>
                    <div style={{ paddingTop:4 }}>
                      <div style={{ fontFamily:'var(--ff)', fontWeight:600, fontSize:14, color:'var(--muted)' }}>Start using Implant ID</div>
                      <div style={{ fontSize:12.5, color:'var(--muted2)', marginTop:2 }}>Wallet pass, clinic sharing &amp; more unlock</div>
                    </div>
                  </div>

                </div>

                <button className="btn btn-s btn-block btn-lg" onClick={() => setWelcomeStep('verify-email')}>
                  Verify email →
                </button>
              </div>
            )}

            {/* Screen 2: Verify email */}
            {welcomeStep === 'verify-email' && (
              <div style={{ padding: '24px 28px 28px' }}>
                <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:14 }}>
                  <div style={{
                    width:40, height:40, borderRadius:12, flexShrink:0,
                    background: 'color-mix(in srgb,var(--accent) 10%,transparent)',
                    display:'grid', placeItems:'center',
                  }}>
                    <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="1.7">
                      <path d="M4 4h16a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z"/>
                      <path d="m22 6-10 7L2 6"/>
                    </svg>
                  </div>
                  <div>
                    <div style={{ fontFamily:'var(--ff)', fontWeight:700, fontSize:16, color:'var(--text)', lineHeight:1.2 }}>Verify your email</div>
                    <div style={{ fontSize:12.5, color:'var(--muted)', marginTop:2 }}>
                      {(user?.primaryEmailAddress ?? user?.emailAddresses?.[0])?.emailAddress}
                    </div>
                  </div>
                </div>
                {/* Status line */}
                <p style={{ color: wEmailResent ? 'var(--ok)' : 'var(--muted)', fontSize:13.5, marginBottom:16, transition:'color .2s' }}>
                  {wEmailResent
                    ? '✓ Code resent — check your inbox.'
                    : wEmailSending
                    ? 'Sending your code…'
                    : wEmailSent
                    ? 'Enter the 6-digit code we just sent you.'
                    : 'Preparing…'}
                </p>

                {/* Success state */}
                {wEmailDone ? (
                  <div style={{ textAlign:'center', padding:'16px 0 20px' }}>
                    <div style={{
                      width:52, height:52, borderRadius:'50%', margin:'0 auto 12px',
                      background:'color-mix(in srgb,var(--ok) 12%,transparent)',
                      display:'grid', placeItems:'center',
                    }}>
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--ok)" strokeWidth="2.2">
                        <path d="M20 6 9 17l-5-5"/>
                      </svg>
                    </div>
                    <div style={{ fontFamily:'var(--ff)', fontWeight:600, fontSize:15, color:'var(--text)', marginBottom:4 }}>Email verified!</div>
                    <div style={{ fontSize:13, color:'var(--muted)', lineHeight:1.5 }}>
                      You can now browse your record. Your clinic will verify your implant details shortly.
                    </div>
                  </div>
                ) : (
                  <>
                    {/* OTP inputs */}
                    <div style={{ display:'flex', justifyContent:'center', gap:6, marginBottom: wEmailErr ? 10 : 16 }}>
                      {[0,1,2,3,4,5].map(i => (
                        <input
                          key={i}
                          ref={el => { wCodeRefs.current[i] = el }}
                          type="tel"
                          inputMode="numeric"
                          autoComplete={i === 0 ? 'one-time-code' : 'off'}
                          value={wEmailCode[i]}
                          className="code-input"
                          style={{ width:42, height:50, fontSize:22 }}
                          onKeyDown={e => {
                            if (e.key === 'Backspace') {
                              e.preventDefault()
                              if (wEmailCode[i]) {
                                const next = [...wEmailCode]; next[i] = ''; setWEmailCode(next)
                              } else if (i > 0) {
                                const next = [...wEmailCode]; next[i-1] = ''; setWEmailCode(next)
                                wCodeRefs.current[i-1]?.focus()
                              }
                            } else if (e.key === 'ArrowLeft' && i > 0) {
                              e.preventDefault(); wCodeRefs.current[i-1]?.focus()
                            } else if (e.key === 'ArrowRight' && i < 5) {
                              e.preventDefault(); wCodeRefs.current[i+1]?.focus()
                            }
                          }}
                          onChange={e => {
                            const raw = e.target.value.replace(/\D/g,'')
                            if (!raw) return
                            if (raw.length >= 6) {
                              // iOS/Android autofill delivers full code at once
                              const next = raw.slice(0,6).split('')
                              setWEmailCode(next)
                              wCodeRefs.current[5]?.focus()
                              doVerifyEmail(raw.slice(0,6))
                            } else {
                              // Single digit typed — take the last char (handles replace on non-empty input)
                              const digit = raw[raw.length - 1]
                              const next = [...wEmailCode]; next[i] = digit; setWEmailCode(next)
                              if (i < 5) {
                                wCodeRefs.current[i+1]?.focus()
                              } else {
                                const full = next.join('')
                                if (full.length === 6) doVerifyEmail(full)
                              }
                            }
                          }}
                          onPaste={e => {
                            e.preventDefault()
                            const pasted = e.clipboardData.getData('text').replace(/\D/g,'').slice(0,6)
                            if (!pasted) return
                            const next = ['','','','','','']
                            pasted.split('').forEach((c,j) => { next[j] = c })
                            setWEmailCode(next)
                            wCodeRefs.current[Math.min(pasted.length - 1, 5)]?.focus()
                            if (pasted.length === 6) doVerifyEmail(pasted)
                          }}
                          onFocus={e => e.target.select()}
                        />
                      ))}
                    </div>

                    {wEmailErr && (
                      <div style={{
                        background: 'color-mix(in srgb,var(--err) 8%,transparent)',
                        border: '1px solid color-mix(in srgb,var(--err) 20%,transparent)',
                        borderRadius: 10, padding: '10px 14px',
                        color:'var(--err)', fontSize:13, marginBottom:12, lineHeight:1.4,
                      }}>{wEmailErr}</div>
                    )}
                    <button
                      className="btn btn-s btn-block btn-lg"
                      onClick={() => doVerifyEmail(wEmailCode.join(''))}
                      disabled={wEmailLoading || wEmailCode.join('').length < 6}
                      style={{ marginBottom:10 }}
                    >
                      {wEmailLoading ? 'Verifying…' : 'Verify email'}
                    </button>
                    <p style={{ textAlign:'center', fontSize:12.5, color:'var(--muted)' }}>
                      Didn&apos;t get it?{' '}
                      {wResendCountdown > 0
                        ? <span style={{ color:'var(--muted2)' }}>Resend in {wResendCountdown}s</span>
                        : <button className="link-btn" style={{ fontSize:'inherit' }} onClick={resendWelcomeEmail}>Resend</button>
                      }
                    </p>
                  </>
                )}
              </div>
            )}

          </div>
        </div>
      )}

      {/* Mobile sidebar overlay */}
      <div
        className={`sb-back${sbOpen ? ' open' : ''}`}
        onClick={() => setSbOpen(false)}
      />

      <div className={`app${sbCollapsed ? ' collapsed' : ''}`}>

        {/* ── Sidebar ──────────────────────────────────────────────────────── */}
        <aside className={`sidebar${sbOpen ? ' open' : ''}`}>

          {/* Logo + collapse toggle */}
          <div className="sb-logo">
            <a href="/" className="logo">
              <img src="/icon.svg" alt="" />
              <span className="logo-text"><b>Implant</b><span>ID</span></span>
            </a>
            <button
              className="sb-toggle"
              aria-label="Collapse sidebar"
              onClick={() => setSbCollapsed(v => !v)}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="15 18 9 12 15 6"/>
              </svg>
            </button>
          </div>

          <div className="sb-scroll">

          {/* Nav */}
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
          {isPending ? (
            <span className="sb-link sb-link--locked" aria-disabled="true" title="Available once your record is verified">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
                <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/>
                <path d="M16 6l-4-4-4 4M12 2v13"/>
              </svg>
              <span>Share with clinic</span>
              <svg className="sb-lock" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                <rect x="3" y="11" width="18" height="11" rx="2"/>
                <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
              </svg>
            </span>
          ) : (
            <a className="sb-link" href="/patients/share" title="Share with clinic">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
                <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/>
                <path d="M16 6l-4-4-4 4M12 2v13"/>
              </svg>
              <span>Share with clinic</span>
            </a>
          )}
          {isPending ? (
            <span className="sb-link sb-link--locked" aria-disabled="true" title="Available once your record is verified">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
                <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20M4 19.5A2.5 2.5 0 0 0 6.5 22H20V2H6.5A2.5 2.5 0 0 0 4 4.5v15z"/>
              </svg>
              <span>Documents</span>
              <svg className="sb-lock" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                <rect x="3" y="11" width="18" height="11" rx="2"/>
                <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
              </svg>
            </span>
          ) : (
            <button type="button" className="sb-link" title="Documents" onClick={() => document.getElementById('documents-section')?.scrollIntoView({ behavior: 'smooth' })} style={{ background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'none' }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
                <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20M4 19.5A2.5 2.5 0 0 0 6.5 22H20V2H6.5A2.5 2.5 0 0 0 4 4.5v15z"/>
              </svg>
              <span>Documents</span>
            </button>
          )}

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

          {/* Notifications button */}
          <button
            className="sb-notif"
            aria-label="Notifications"
            title="Notifications"
            onClick={(e) => { e.stopPropagation(); setNotifOpen(true) }}
          >
            <span className="sb-notif-ic">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
                <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
              </svg>
              <span className="dot" />
            </span>
            <span className="label">Notifications</span>
            <span className="count">{notifications?.filter((n: {read: boolean}) => !n.read).length || 0}</span>
          </button>

          <div className="sb-spacer" />

          <div className={`profile-menu${profileOpen ? ' open' : ''}`}>
              <a href="/patients/account" className="sb-link">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"><circle cx="12" cy="7" r="4"/><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/></svg>
                <span>My account</span>
              </a>
              <a href="/patients/notifications" className="sb-link">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
                <span>Notifications</span>
              </a>
              <a href="mailto:hello@implantid.io" className="sb-link">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"><circle cx="12" cy="12" r="9"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3M12 17h.01"/></svg>
                <span>Help &amp; docs</span>
              </a>
              <span className="sb-section">Legal</span>
              <a href="https://implantid.io/legal/privacy" target="_blank" rel="noopener noreferrer" className="sb-link">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
                <span>Privacy Policy</span>
              </a>
              <a href="https://implantid.io/legal/terms" target="_blank" rel="noopener noreferrer" className="sb-link">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>
                <span>Terms of Service</span>
              </a>
              <a href="https://implantid.io/legal/gdpr" target="_blank" rel="noopener noreferrer" className="sb-link">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><polyline points="9 12 11 14 15 10"/></svg>
                <span>GDPR</span>
              </a>
              <button className="sb-link pm-signout" onClick={() => { setProfileOpen(false); setLogoutOpen(true) }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
                <span>Sign out</span>
              </button>
          </div>

          </div>

          <div className="sb-profile-wrap">
            <div
              ref={sbBotRef}
              className={`sb-bot${profileOpen ? ' open' : ''}`}
              onClick={() => setProfileOpen(v => !v)}
            >
              <div className="av" style={{ background: 'var(--accent)', color: '#fff', fontFamily: 'var(--ff)', fontSize: 13, fontWeight: 600 }}>
                {initials}
              </div>
              <div>
                <div className="name">{fullName}</div>
                <div className="role">Patient</div>
              </div>
              <span className="chev">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="18 15 12 9 6 15"/>
                </svg>
              </span>
            </div>
          </div>

        </aside>{/* /sidebar */}

        {/* ── App main ─────────────────────────────────────────────────────── */}
        <div className="app-main">

          {/* ── Pending verification banner (content column only) ─────────── */}
          {isPending && (
            <div style={{
              background: 'linear-gradient(90deg,#f97316,#ea580c)',
              color: '#fff',
              padding: '11px 24px',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 9,
              fontFamily: 'var(--ff)', fontSize: 13, fontWeight: 500, lineHeight: 1.4,
              boxShadow: '0 2px 16px rgba(234,88,12,.22)',
            }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ flexShrink: 0 }}>
                <circle cx="12" cy="12" r="10"/><path d="M12 8v4M12 16h.01"/>
              </svg>
              Your implant record is currently pending. A clinician will confirm your records before you can use your Implant ID.
            </div>
          )}

          {/* Mobile top header */}
          <div className="mob-header">
            <a href="/patients/dashboard" className="mob-header-logo">
              <img src="/icon.svg" alt="" />
              <span className="logo-text"><b>Implant</b><span>ID</span></span>
            </a>
            <div ref={mobProfileRef} className="mob-hdr-profile">
              <button
                className="mob-hdr-av"
                aria-label="Profile menu"
                onClick={() => setMobProfileOpen(v => !v)}
              >
                {initials}
              </button>
              <div className={`mob-hdr-menu${mobProfileOpen ? ' open' : ''}`}>
                <div className="mob-hdr-info">
                  <strong>{fullName}</strong>
                  <span>Patient · {iidCode}</span>
                </div>
                <hr />
                <a href="/patients/account">My account</a>
                <a href="/patients/notifications">Notifications</a>
                <a href="mailto:hello@implantid.io">Help &amp; docs</a>
                <hr />
                <a href="https://implantid.io/legal/privacy" target="_blank" rel="noopener noreferrer">Privacy Policy</a>
                <a href="https://implantid.io/legal/terms" target="_blank" rel="noopener noreferrer">Terms of Service</a>
                <a href="https://implantid.io/legal/gdpr" target="_blank" rel="noopener noreferrer">GDPR</a>
                <hr />
                <button className="danger" onClick={() => { setMobProfileOpen(false); setLogoutOpen(true) }}>
                  Sign out
                </button>
              </div>
            </div>
          </div>

          {/* ── Page content ─────────────────────────────────────────────── */}
          <div className="pt-wrap">

            {/* Patient header */}
            <div className="pt-header">
              <div
                className="pt-av"
                style={{ background: 'var(--accent)', color: '#fff', display: 'grid', placeItems: 'center', fontFamily: 'var(--ff)', fontSize: 24, fontWeight: 600 }}
                onClick={() => photoInputRef.current?.click()}
                title="Click to upload photo"
              >
                {user?.imageUrl
                  ? <img src={user.imageUrl} alt={initials} />
                  : photoUploading
                    ? <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="22" height="22" style={{ animation: 'dash-spin 0.8s linear infinite' }}><circle cx="12" cy="12" r="9" strokeDasharray="28" strokeDashoffset="10"/></svg>
                    : initials}
                <div className="pt-av-overlay">
                  <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" width="20" height="20"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>
                </div>
                <input ref={photoInputRef} type="file" accept="image/png,image/jpeg,image/webp" style={{ display: 'none' }} onChange={handlePhotoUpload} />
              </div>
              <div>
                <h1>Hi {firstName}</h1>
                <p className="sub">Everything about your implant, in one place. Share it at any clinic with one tap.</p>
              </div>
            </div>

            {/* ── Implant pass card — skeleton while MRI safety status loads ─ */}
            {!cardReady ? (
              <div className="pass-big" style={{ background: 'linear-gradient(155deg,#e8edf2,#d4dce6)', minHeight: 240, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div style={{ display: 'flex', gap: 10, alignItems: 'center', opacity: 0.45 }}>
                  <div style={{ width: 22, height: 22, borderRadius: '50%', border: '3px solid #64748b', borderTopColor: 'transparent', animation: 'dash-spin 0.8s linear infinite' }} />
                  <span style={{ fontFamily: 'var(--ff)', fontSize: 13, color: '#64748b' }}>Loading your record…</span>
                </div>
              </div>
            ) : (
            /* Card background is colour-coded by MRI safety status:
               grey = pending/unverified, teal = verified/unknown,
               green = MR Safe, amber = MR Conditional, red = MR Unsafe */
            <div
              className="pass-big"
              style={
                isPending ? {
                  background: 'linear-gradient(155deg,#e8edf2 0%,#d4dce6 55%,#eef1f5 100%)',
                  color: '#1e293b',
                  boxShadow: '0 20px 50px -20px rgba(0,0,0,.10)',
                  overflow: 'visible',
                }
                : implantSafety === 'unsafe' ? {
                  background: 'linear-gradient(155deg,#991b1b 0%,#b91c1c 55%,#dc2626 100%)',
                }
                : implantSafety === 'conditional' ? {
                  background: 'linear-gradient(155deg,#c2410c 0%,#ea580c 55%,#f97316 100%)',
                }
                : implantSafety === 'safe' ? {
                  background: 'linear-gradient(155deg,#166534 0%,#15803d 55%,#16a34a 100%)',
                }
                : undefined   // default teal gradient from .pass-big CSS
              }
            >
              <div className="pb-top">
                {/* Brand + label stacked on the left */}
                <div>
                  <div className="pb-brand">
                    <img src="/icon.svg" alt="" style={isPending ? { filter: 'brightness(0) opacity(0.4)' } : undefined}/>
                    <span style={isPending ? { color: '#475569' } : undefined}>Implant ID</span>
                  </div>
                </div>

                {/* MRI status — top right. Layout is IDENTICAL across all statuses.
                    Only the icon image changes. Same white circle, same size, same label. */}
                {!isPending && implantSafety ? (
                  <div className="pb-mri">
                    <span style={{ fontFamily:'var(--ff)', fontSize:12, fontWeight:700, color:'rgba(255,255,255,0.92)', letterSpacing:'.3px', whiteSpace:'nowrap' }}>
                      {implantSafety === 'safe' ? 'MR Safe' : implantSafety === 'conditional' ? 'MR Conditional' : 'MR Unsafe'}
                    </span>
                    {/* Icons have white outline border built in — no wrapper needed */}
                    <img
                      src={implantSafety === 'safe' ? '/mr-safe.svg' : implantSafety === 'conditional' ? '/mr-conditional.svg' : '/mr-unsafe.svg'}
                      alt={implantSafety === 'safe' ? 'MR Safe' : implantSafety === 'conditional' ? 'MR Conditional' : 'MR Unsafe'}
                      style={{ width:42, height:42, display:'block', flexShrink:0 }}
                    />
                  </div>
                ) : !isPending ? (
                  <div style={{ display:'inline-flex', alignItems:'center', gap:5, background:'rgba(34,197,94,0.20)', border:'1px solid rgba(34,197,94,0.4)', borderRadius:999, padding:'5px 12px', fontFamily:'var(--ff)', fontSize:11, fontWeight:700, color:'#bbf7d0', letterSpacing:'.3px', flexShrink:0 }}>
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M20 6L9 17l-5-5"/></svg>
                    Verified by Implant ID
                  </div>
                ) : null}
              </div>

              {/* Pending badge with tooltip — block-level so it has its own line */}
              {isPending && (
                <div className="pending-badge-wrap" style={{ display: 'block', marginBottom: 14 }}>
                  <span style={{
                    display: 'inline-flex', alignItems: 'center', gap: 7,
                    background: 'rgba(251,191,36,0.14)',
                    border: '1.5px solid rgba(251,191,36,0.55)',
                    borderRadius: 999, padding: '6px 14px',
                    fontFamily: 'var(--ff)', fontSize: 12.5, fontWeight: 700,
                    letterSpacing: '.4px', color: '#92400e',
                    cursor: 'default',
                  }}>
                    <span style={{
                      width: 8, height: 8, borderRadius: '50%', background: '#f59e0b',
                      boxShadow: '0 0 8px #f59e0b', flexShrink: 0,
                      animation: 'pending-pulse 2s ease-in-out infinite',
                    }}/>
                    Pending verification
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ opacity:.6, marginLeft: 1 }}>
                      <circle cx="12" cy="12" r="10"/><path d="M12 8v4M12 16h.01"/>
                    </svg>
                  </span>
                  <div className="pending-tooltip">
                    Your implant details are being verified by your clinical team.
                    Once confirmed, your Apple Wallet pass will activate and the card will show your MRI safety status in the correct colour.
                  </div>
                </div>
              )}

              {/* Device type label — uses verified devices if available, else self-reported */}
              <div
                className={`pb-status${isPending ? ' pb-status--pending' : ''}`}
                style={{ color: isPending ? '#64748b' : undefined }}
              >
                {linkedDevices && linkedDevices.length > 1
                  ? `${linkedDevices.length} implants`
                  : linkedDevices && linkedDevices.length === 1
                    ? (linkedDevices[0] as any).deviceType
                    : patient.selfReportedDeviceType ?? 'No device type recorded'}
              </div>

              {/* Device name(s) */}
              {linkedDevices && linkedDevices.length > 0 ? (
                <div style={{ marginBottom: 4 }}>
                  {(linkedDevices as any[]).map((d, i) => (
                    <div key={String(d._id)} className="pb-name" style={{ fontSize: 22, color: isPending ? '#334155' : undefined, marginBottom: i < linkedDevices.length - 1 ? 4 : 0, display: 'flex', alignItems: 'center', gap: 8 }}>
                      {linkedDevices.length > 1 && (
                        <img src={d.mriStatus === 'safe' ? '/mr-safe.svg' : d.mriStatus === 'conditional' ? '/mr-conditional.svg' : '/mr-unsafe.svg'} alt={d.mriStatus} style={{ width: 18, height: 18, flexShrink: 0 }} />
                      )}
                      {d.manufacturer} {d.name}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="pb-name" style={{
                  fontSize: patient.selfReportedDevice ? 26 : 20,
                  color: isPending ? '#334155' : undefined,
                }}>
                  {patient.selfReportedDevice ?? 'Awaiting verification'}
                </div>
              )}

              {/* MRI status now lives in top-right of pb-top — no duplicate here */}

              {isPending && (
                <p style={{ fontFamily:'var(--ff)', fontSize:12, color:'#64748b', marginBottom:10, position:'relative', zIndex:2, lineHeight:1.5 }}>
                  Your clinical team will verify these details with your hospital.
                </p>
              )}

              {/* Data grid — Name + Implanted inline; Implant ID moves below QR */}
              <div className="pb-grid" style={{ gridTemplateColumns: 'auto auto', gap: '8px 24px', width: 'fit-content', marginBottom: 0 }}>
                <div>
                  <div className="k" style={{ color: isPending ? '#94a3b8' : undefined }}>Name</div>
                  <div className="v" style={{ color: isPending ? '#334155' : undefined }}>{fullName}</div>
                </div>
                {patient.selfReportedImplantYear && (
                  <div>
                    <div className="k" style={{ color: isPending ? '#94a3b8' : undefined }}>Implanted</div>
                    <div className="v" style={{ color: isPending ? '#334155' : undefined }}>
                      {patient.selfReportedImplantMonth
                        ? `${MONTHS[parseInt(patient.selfReportedImplantMonth)-1]?.slice(0,3)} ${patient.selfReportedImplantYear}`
                        : patient.selfReportedImplantYear}
                    </div>
                  </div>
                )}
              </div>

              {/* Actions + QR — buttons left, QR pinned to far right */}
              <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginTop: 16 }}>
              <div className="pb-actions" style={{ marginTop: 0, flex: 'none' }}>

                {/* Add to Apple Wallet */}
                {isPending ? (
                  /* Pending — card is light grey, so use dark slate buttons */
                  <button
                    className="btn"
                    disabled
                    title="Available once your record is verified"
                    style={{
                      background: 'rgba(71,85,105,0.12)',
                      borderColor: 'rgba(71,85,105,0.35)',
                      color: '#475569',
                      cursor: 'not-allowed', opacity: 1,
                      display: 'flex', alignItems: 'center', gap: 6,
                      fontWeight: 500,
                    }}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                      <rect x="3" y="11" width="18" height="11" rx="2"/>
                      <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                    </svg>
                    Wallet — pending
                  </button>
                ) : (
                  /* Verified — direct .pkpass download, no popup */
                  <a
                    href="/api/wallet/pass"
                    download
                    style={{
                      display: 'inline-flex', alignItems: 'center', gap: 6,
                      background: 'rgba(255,255,255,0.22)', border: '1.5px solid rgba(255,255,255,0.5)',
                      color: '#fff', borderRadius: 8, padding: '9px 16px',
                      fontFamily: 'var(--ff)', fontSize: 13, fontWeight: 600, cursor: 'pointer',
                      textDecoration: 'none', transition: 'background .15s',
                    }}
                  >
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                      <rect x="3" y="6" width="18" height="14" rx="2"/><path d="M3 10h18M7 15h3"/>
                    </svg>
                    Add to Wallet
                  </a>
                )}

                {/* Share with clinic — locked when pending */}
                {isPending ? (
                  <button
                    className="btn"
                    disabled
                    title="Available once your record is verified"
                    style={{
                      background: 'rgba(71,85,105,0.08)',
                      borderColor: 'rgba(71,85,105,0.25)',
                      color: '#64748b',
                      cursor: 'not-allowed', opacity: 1,
                      display: 'flex', alignItems: 'center', gap: 6,
                    }}
                  >
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                      <rect x="3" y="11" width="18" height="11" rx="2"/>
                      <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                    </svg>
                    Share — pending
                  </button>
                ) : (
                  /* Verified — white outline button on dark card */
                  <button
                    onClick={() => setWallOpen(true)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 6,
                      background: 'rgba(255,255,255,0.12)', border: '1.5px solid rgba(255,255,255,0.4)',
                      color: '#fff', borderRadius: 8, padding: '9px 16px',
                      fontFamily: 'var(--ff)', fontSize: 13, fontWeight: 500, cursor: 'pointer',
                      transition: 'background .15s',
                    }}
                  >
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                      <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/>
                      <path d="M16 6l-4-4-4 4M12 2v13"/>
                    </svg>
                    Share with clinic
                  </button>
                )}

              </div>{/* /pb-actions */}

              {/* QR code — bottom right, inline with buttons */}
              {!isPending && (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0 }}>
                  <span style={{ fontFamily: 'var(--ff)', fontSize: 9, marginBottom: 4, letterSpacing: '.8px', textTransform: 'uppercase', color: 'rgba(255,255,255,0.7)', fontWeight: 600 }}>Scan at clinic</span>
                  {qrDataUrl ? (
                    <img
                      src={qrDataUrl}
                      alt="Scan at clinic to access this record"
                      style={{ width: 113, height: 113, borderRadius: 9, background: 'rgba(255,255,255,0.92)', padding: 5, display: 'block' }}
                    />
                  ) : (
                    <div style={{ width: 113, height: 113, borderRadius: 9, background: 'rgba(255,255,255,0.12)', display: 'grid', placeItems: 'center' }}>
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.4)" strokeWidth="1.4">
                        <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/>
                        <rect x="3" y="14" width="7" height="7"/><path d="M14 14h2v2h-2zM18 14h2v2h-2zM14 18h2v2h-2z"/>
                      </svg>
                    </div>
                  )}
                </div>
              )}

              </div>{/* /actions + QR row */}

              {/* Implant ID — below QR/buttons, close to the scan code */}
              {!isPending && (
                <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid rgba(255,255,255,0.15)', display: 'flex', alignItems: 'center', gap: 8, position: 'relative', zIndex: 2 }}>
                  <div className="k" style={{ opacity: 0.7 }}>Implant ID</div>
                  <div style={{ fontFamily: 'SF Mono,Monaco,monospace', fontSize: 13, fontWeight: 600, letterSpacing: '.05em' }}>{iidCode}</div>
                </div>
              )}

            </div>
            )}{/* end cardReady ternary */}

            {/* Quick access */}
            <div className="sec">
              <h2>Quick access</h2>
              <div className="q-grid">
                <a href="/patients/find-care" className="q">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
                    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
                    <circle cx="12" cy="10" r="3"/>
                  </svg>
                  <b>Find a clinic</b>
                  <p>Search the Implant ID network for clinics near you.</p>
                </a>
                <a href="/patients/emergency" className="q">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
                    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.8 19.8 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.8 19.8 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.91.34 1.85.57 2.81.7A2 2 0 0 1 22 16.92z"/>
                  </svg>
                  <b>Emergency info</b>
                  <p>Everything a paramedic or A&amp;E team needs — one tap.</p>
                </a>
                <div className="q" style={{ opacity: 0.55, cursor: 'default' }}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
                    <rect x="3" y="4" width="18" height="16" rx="2"/>
                    <path d="M8 2v4M16 2v4M3 10h18"/>
                  </svg>
                  <b>Upcoming appointments</b>
                  <p>Coming soon — your booked appointments will appear here.</p>
                </div>
              </div>
            </div>

            {/* ── Your implants (Phase 2) ────────────────────────────── */}
            <div className="sec">
              <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:16 }}>
                <h2 style={{ margin:0 }}>Your implants</h2>
                <button
                  className="btn"
                  onClick={() => setImplantOpen(true)}
                  style={{ display:'flex', alignItems:'center', gap:6 }}
                >
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden="true">
                    <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
                  </svg>
                  Add another
                </button>
              </div>

              {/* Verified linked devices */}
              {linkedDevices && (linkedDevices as any[]).length > 0 && (linkedDevices as any[]).map((d: any) => (
                <div key={String(d._id)} style={{
                  background:'var(--bg2)', border:'1px solid var(--border)', borderRadius:12,
                  padding:'14px 18px', marginBottom:10, display:'flex', alignItems:'flex-start', gap:12,
                }}>
                  <div style={{
                    width:38, height:38, borderRadius:10, flexShrink:0,
                    background:'color-mix(in srgb,var(--ok) 10%,transparent)',
                    border:'1px solid color-mix(in srgb,var(--ok) 22%,transparent)',
                    display:'grid', placeItems:'center',
                  }}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--ok)" strokeWidth="1.7" aria-hidden="true">
                      <path d="m9 12 2 2 4-4"/><circle cx="12" cy="12" r="9"/>
                    </svg>
                  </div>
                  <div style={{ flex:1 }}>
                    <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:3 }}>
                      <span style={{ fontFamily:'var(--ff)', fontWeight:600, fontSize:14, color:'var(--text)' }}>
                        {d.manufacturer} {d.name}
                      </span>
                      <span style={{ fontFamily:'var(--ff)', fontSize:11, fontWeight:600, color:'var(--ok)', background:'color-mix(in srgb,var(--ok) 10%,transparent)', border:'1px solid color-mix(in srgb,var(--ok) 22%,transparent)', borderRadius:5, padding:'2px 7px' }}>
                        Verified
                      </span>
                    </div>
                    <div style={{ fontSize:12.5, color:'var(--muted)', display:'flex', gap:12, flexWrap:'wrap' }}>
                      {d.deviceType && <span>{d.deviceType}</span>}
                      {d.serialNumber && <span>S/N: {d.serialNumber}</span>}
                      {d.implantDate && <span>Implanted: {d.implantDate}</span>}
                    </div>
                  </div>
                </div>
              ))}

              {/* Primary self-reported device (if not already in linkedDevices) */}
              {patient.selfReportedDevice && (!linkedDevices || (linkedDevices as any[]).length === 0) && (
                <div style={{
                  background:'var(--bg2)', border:'1px solid var(--border)', borderRadius:12,
                  padding:'14px 18px', marginBottom:10, display:'flex', alignItems:'flex-start', gap:12,
                }}>
                  <div style={{
                    width:38, height:38, borderRadius:10, flexShrink:0,
                    background: isPending ? 'color-mix(in srgb,#f59e0b 10%,transparent)' : 'color-mix(in srgb,var(--accent) 10%,transparent)',
                    border: isPending ? '1px solid color-mix(in srgb,#f59e0b 22%,transparent)' : '1px solid color-mix(in srgb,var(--accent) 22%,transparent)',
                    display:'grid', placeItems:'center',
                  }}>
                    {isPending ? (
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#b45309" strokeWidth="1.7" aria-hidden="true">
                        <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
                      </svg>
                    ) : (
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="1.7" aria-hidden="true">
                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                      </svg>
                    )}
                  </div>
                  <div style={{ flex:1 }}>
                    <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:3 }}>
                      <span style={{ fontFamily:'var(--ff)', fontWeight:600, fontSize:14, color:'var(--text)' }}>
                        {patient.selfReportedDevice}
                      </span>
                      {isPending ? (
                        <span style={{ fontFamily:'var(--ff)', fontSize:11, fontWeight:600, color:'#92400e', background:'color-mix(in srgb,#f59e0b 10%,transparent)', border:'1px solid color-mix(in srgb,#f59e0b 22%,transparent)', borderRadius:5, padding:'2px 7px' }}>
                          Pending verification
                        </span>
                      ) : (
                        <span style={{ fontFamily:'var(--ff)', fontSize:11, fontWeight:600, color:'var(--muted)', background:'var(--bg)', border:'1px solid var(--border)', borderRadius:5, padding:'2px 7px' }}>
                          Self-reported
                        </span>
                      )}
                    </div>
                    <div style={{ fontSize:12.5, color:'var(--muted)', display:'flex', gap:12, flexWrap:'wrap' }}>
                      {(patient as any).selfReportedManufacturer && <span>{(patient as any).selfReportedManufacturer}</span>}
                      {(patient as any).selfReportedModelNumber && <span>Model: {(patient as any).selfReportedModelNumber}</span>}
                    </div>
                  </div>
                </div>
              )}

              {/* Additional self-reported implants */}
              {extraImplants.map((imp, i) => (
                <div key={i} style={{
                  background:'var(--bg2)', border:'1px solid var(--border)', borderRadius:12,
                  padding:'14px 18px', marginBottom:10, display:'flex', alignItems:'flex-start', gap:12,
                }}>
                  <div style={{
                    width:38, height:38, borderRadius:10, flexShrink:0,
                    background: isPending ? 'color-mix(in srgb,#f59e0b 10%,transparent)' : 'color-mix(in srgb,var(--accent) 10%,transparent)',
                    border: isPending ? '1px solid color-mix(in srgb,#f59e0b 22%,transparent)' : '1px solid color-mix(in srgb,var(--accent) 22%,transparent)',
                    display:'grid', placeItems:'center',
                  }}>
                    {isPending ? (
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#b45309" strokeWidth="1.7" aria-hidden="true">
                        <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
                      </svg>
                    ) : (
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="1.7" aria-hidden="true">
                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                      </svg>
                    )}
                  </div>
                  <div style={{ flex:1 }}>
                    <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:3 }}>
                      <span style={{ fontFamily:'var(--ff)', fontWeight:600, fontSize:14, color:'var(--text)' }}>{imp.device}</span>
                      {isPending ? (
                        <span style={{ fontFamily:'var(--ff)', fontSize:11, fontWeight:600, color:'#92400e', background:'color-mix(in srgb,#f59e0b 10%,transparent)', border:'1px solid color-mix(in srgb,#f59e0b 22%,transparent)', borderRadius:5, padding:'2px 7px' }}>
                          Pending verification
                        </span>
                      ) : (
                        <span style={{ fontFamily:'var(--ff)', fontSize:11, fontWeight:600, color:'var(--muted)', background:'var(--bg)', border:'1px solid var(--border)', borderRadius:5, padding:'2px 7px' }}>
                          Self-reported
                        </span>
                      )}
                    </div>
                    <div style={{ fontSize:12.5, color:'var(--muted)', display:'flex', gap:12, flexWrap:'wrap' }}>
                      {imp.manufacturer && <span>{imp.manufacturer}</span>}
                      {imp.deviceType && <span>{imp.deviceType}</span>}
                      {imp.modelNumber && <span>Model: {imp.modelNumber}</span>}
                      {imp.implantYear && <span>Implanted: {imp.implantMonth ? `${MONTH_NAMES[parseInt(imp.implantMonth)-1]?.slice(0,3)} ` : ''}{imp.implantYear}</span>}
                    </div>
                  </div>
                </div>
              ))}

              {/* Empty state — no devices at all */}
              {(!patient.selfReportedDevice) && (!linkedDevices || (linkedDevices as any[]).length === 0) && extraImplants.length === 0 && (
                <div style={{
                  background:'var(--bg2)', border:'1px dashed var(--border2)', borderRadius:12,
                  padding:'28px 24px', textAlign:'center', color:'var(--muted2)', fontFamily:'var(--ff)', fontSize:14,
                }}>
                  No implants recorded yet.{' '}
                  <button className="link-btn" onClick={() => setImplantOpen(true)}>Add your first implant →</button>
                </div>
              )}
            </div>

            {/* ── Who has access (Phase 4) — verified patients only ──── */}
            {!isPending && (
              <div className="sec">
                <h2>Clinic access</h2>
                <p className="sub" style={{ marginTop:-6, marginBottom:16 }}>
                  Clinics you have shared your record with. You can revoke access at any time.
                </p>

                {clinicAccess === undefined && (
                  <div style={{ color:'var(--muted)', fontSize:14 }}>Loading…</div>
                )}

                {clinicAccess !== undefined && (clinicAccess as any[]).length === 0 && (
                  <div style={{
                    background:'var(--bg2)', border:'1px dashed var(--border2)', borderRadius:12,
                    padding:'24px', textAlign:'center', color:'var(--muted2)', fontFamily:'var(--ff)', fontSize:14,
                  }}>
                    No clinics have access to your record yet.{' '}
                    <button className="link-btn" onClick={() => setWallOpen(true)}>Share with a clinic →</button>
                  </div>
                )}

                {clinicAccess !== undefined && (clinicAccess as any[]).length > 0 && (
                  <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
                    {(clinicAccess as any[]).map((a: any) => (
                      <div key={a._id} style={{
                        background:'var(--bg2)', border:'1px solid var(--border)', borderRadius:12,
                        padding:'14px 18px', display:'flex', alignItems:'center', gap:14,
                      }}>
                        <div style={{
                          width:36, height:36, borderRadius:9, flexShrink:0,
                          background:'color-mix(in srgb,var(--accent) 10%,transparent)',
                          display:'grid', placeItems:'center',
                          fontFamily:'var(--ff)', fontWeight:700, fontSize:12, color:'var(--accent)',
                        }}>
                          {(a.clinicName as string).slice(0,2).toUpperCase()}
                        </div>
                        <div style={{ flex:1 }}>
                          <div style={{ fontFamily:'var(--ff)', fontWeight:500, fontSize:14, color:'var(--text)' }}>{a.clinicName}</div>
                          {a.clinicCity && <div style={{ fontSize:12, color:'var(--muted)' }}>{a.clinicCity}</div>}
                          <div style={{ fontSize:12, color:'var(--muted2)', marginTop:1 }}>
                            Access granted {new Date(a.grantedAt).toLocaleDateString('en-GB', { day:'numeric', month:'short', year:'numeric' })}
                          </div>
                        </div>
                        <button
                          className="btn btn-danger"
                          onClick={() => setRevokeId(a._id)}
                          style={{ fontSize:12.5 }}
                          aria-label={`Revoke ${a.clinicName} access`}
                        >
                          Revoke
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Documents placeholder */}
            <div id="documents-section" className="sec">
              <h2>Your documents</h2>
              <p className="sub">Documents will appear here once your clinical team adds your implant details.</p>
              <div style={{
                background: 'var(--bg2)',
                border: '1px dashed var(--border2)',
                borderRadius: 14,
                padding: '32px 24px',
                textAlign: 'center',
                color: 'var(--muted2)',
                fontFamily: 'var(--ff)',
                fontSize: 14,
              }}>
                <svg style={{ display: 'block', width: 32, height: 32, margin: '0 auto 12px', opacity: .4 }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                  <path d="M14 2v6h6"/>
                </svg>
                No documents yet
              </div>
            </div>

            {/* History placeholder */}
            <div className="sec">
              <h2>Your history</h2>
              <div className="card" style={{ padding: '24px', textAlign: 'center', color: 'var(--muted2)', fontFamily: 'var(--ff)', fontSize: 14 }}>
                <svg style={{ display: 'block', width: 28, height: 28, margin: '0 auto 10px', opacity: .4 }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <circle cx="12" cy="12" r="10"/>
                  <polyline points="12 6 12 12 16 14"/>
                </svg>
                Events will appear here as your record builds up.
              </div>
            </div>

          </div>{/* /pt-wrap */}

          {/* Mobile bottom navigation */}
          <nav className="mob-nav" aria-label="Mobile navigation">
            <div className="mob-nav-tabs">
              <a href="/patients/dashboard" className="mob-nav-tab active" aria-label="My record">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
                  <rect x="3" y="3" width="7" height="9" rx="1.5"/>
                  <rect x="14" y="3" width="7" height="5" rx="1.5"/>
                  <rect x="14" y="12" width="7" height="9" rx="1.5"/>
                  <rect x="3" y="16" width="7" height="5" rx="1.5"/>
                </svg>
                <span className="t">Record</span>
              </a>
              {isPending ? (
                <span className="mob-nav-tab mob-nav-tab--locked" aria-disabled="true" aria-label="Share with clinic — available once verified">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
                    <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/>
                    <path d="M16 6l-4-4-4 4M12 2v13"/>
                  </svg>
                  <span className="t">Share</span>
                </span>
              ) : (
                <a href="/patients/share" className="mob-nav-tab" aria-label="Share with clinic">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
                    <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/>
                    <path d="M16 6l-4-4-4 4M12 2v13"/>
                  </svg>
                  <span className="t">Share</span>
                </a>
              )}
              <a href="/patients/find-care" className="mob-nav-tab" aria-label="Find a clinic">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
                  <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
                  <circle cx="12" cy="10" r="3"/>
                </svg>
                <span className="t">Find</span>
              </a>
              <a href="/patients/account" className="mob-nav-tab" aria-label="Account">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
                  <circle cx="12" cy="7" r="4"/>
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                </svg>
                <span className="t">Account</span>
              </a>
              <button
                className="mob-nav-tab mob-nav-menu-btn"
                aria-label="Toggle menu"
                onClick={() => setSbOpen(v => !v)}
              >
                <div className="ham-ic">
                  <span/><span/><span/>
                </div>
                <span className="t">Menu</span>
              </button>
            </div>
          </nav>

        </div>{/* /app-main */}
      </div>{/* /app */}

      {/* ── Share with clinic modal ───────────────────────────────────────────── */}
      <div
        className={`wall-back${wallOpen ? ' open' : ''}`}
        onClick={e => { if (e.target === e.currentTarget) { setWallOpen(false); setEmailSent(false); setClinicEmail(''); setClinicSearch(''); setShareError('') } }}
      >
        <div className="wall-modal">
          <div className="wall-h">
            <div>
              <h3 style={{ margin: 0 }}>Share with clinic</h3>
              <p style={{ fontFamily: 'var(--fb)', fontSize: 13, color: 'var(--muted)', margin: '3px 0 0' }}>
                Your record + QR code will be sent to the clinic
              </p>
            </div>
            <button onClick={() => { setWallOpen(false); setEmailSent(false); setClinicEmail(''); setClinicSearch(''); setShareError('') }} aria-label="Close">✕</button>
          </div>
          <div className="wall-body">

            {!emailSent ? (
              <form onSubmit={async e => {
                e.preventDefault()
                if (!clinicEmail) return
                setSharing(true); setShareError('')
                try {
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  const matchedClinic = (allClinics ?? []).find((c: any) => c.email === clinicEmail)
                  await shareRecordWithClinic({
                    clinicEmail,
                    clinicName: (matchedClinic?.name ?? clinicSearch.trim()) || undefined,
                  })
                  setEmailSent(true)
                } catch {
                  setShareError('Failed to send — please try again.')
                } finally {
                  setSharing(false)
                }
              }}>
                {/* Combined search + results in one block */}
                <div style={{ position: 'relative', marginBottom: 10 }}>
                  <svg style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', width: 15, height: 15, color: 'var(--muted2)', pointerEvents: 'none', zIndex: 1 }}
                    viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
                    <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
                  </svg>
                  <input className="input" type="text" placeholder="Search clinic name…"
                    value={clinicSearch}
                    onChange={e => { setClinicSearch(e.target.value); setClinicEmail('') }}
                    autoFocus
                    style={{ paddingLeft: 42 }}
                  />
                </div>

                {/* Clinic results dropdown */}
                {clinicSearch.trim().length >= 2 && (() => {
                  const q = clinicSearch.toLowerCase()
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  const matches = (allClinics ?? []).filter((c: any) =>
                    c.name.toLowerCase().includes(q) || c.email?.toLowerCase().includes(q)
                  ).slice(0, 5)
                  return matches.length > 0 ? (
                    <div style={{ border: '1px solid var(--border)', borderRadius: 10, marginBottom: 12, overflow: 'hidden', boxShadow: '0 4px 12px rgba(0,0,0,.06)' }}>
                      {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                      {matches.map((c: any, i: number) => (
                        <button key={c._id} type="button"
                          onClick={() => { setClinicEmail(c.email ?? ''); setClinicSearch(c.name) }}
                          style={{ display: 'flex', alignItems: 'center', gap: 12, width: '100%', padding: '12px 16px', background: clinicEmail === c.email ? 'color-mix(in srgb,var(--accent) 7%,transparent)' : 'transparent', border: 'none', cursor: 'pointer', textAlign: 'left', borderBottom: i < matches.length - 1 ? '1px solid var(--border)' : 'none' }}
                        >
                          <div style={{ width: 32, height: 32, borderRadius: 8, background: 'color-mix(in srgb,var(--accent) 10%,transparent)', display: 'grid', placeItems: 'center', flexShrink: 0, fontFamily: 'var(--ff)', fontWeight: 700, fontSize: 12, color: 'var(--accent)' }}>
                            {c.name.slice(0,2).toUpperCase()}
                          </div>
                          <div style={{ flex: 1 }}>
                            <div style={{ fontFamily: 'var(--ff)', fontSize: 14, fontWeight: 500, color: 'var(--text)' }}>{c.name}</div>
                            {c.city && <div style={{ fontFamily: 'var(--fb)', fontSize: 12, color: 'var(--muted)' }}>{c.city}{c.country ? `, ${c.country}` : ''}</div>}
                          </div>
                          {clinicEmail === c.email && (
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2.5"><path d="M20 6L9 17l-5-5"/></svg>
                          )}
                        </button>
                      ))}
                    </div>
                  ) : (
                    <div style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 12, padding: '10px 14px', background: 'color-mix(in srgb,#f59e0b 7%,transparent)', border: '1px solid color-mix(in srgb,#f59e0b 20%,transparent)', borderRadius: 8, lineHeight: 1.55 }}>
                      Clinic not found — enter their email below and we&apos;ll invite them to join Implant ID.
                    </div>
                  )
                })()}

                {/* Email field */}
                <div style={{ marginBottom: 14 }}>
                  <input className="input" type="email" placeholder="Or enter clinic email directly…" required
                    value={clinicEmail} onChange={e => setClinicEmail(e.target.value)}
                    style={{ fontSize: 14 }}
                  />
                </div>

                {shareError && <div style={{ color: 'var(--err)', fontSize: 13, marginBottom: 12 }}>{shareError}</div>}

                <button type="submit" className="btn btn-s btn-block btn-lg" disabled={!clinicEmail || sharing} style={{ fontSize: 14, height: 46 }}>
                  {sharing ? 'Sending…' : (
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    clinicEmail && (allClinics ?? []).find((c: any) => c.email === clinicEmail)
                      ? 'Send my record →'
                      : 'Send record + invite clinic →'
                  )}
                </button>
              </form>
            ) : (
              <div style={{ textAlign: 'center', padding: '20px 0' }}>
                <div style={{ width: 52, height: 52, borderRadius: '50%', background: 'color-mix(in srgb,var(--ok) 12%,transparent)', color: 'var(--ok)', display: 'grid', placeItems: 'center', margin: '0 auto 14px' }}>
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M20 6 9 17l-5-5"/>
                  </svg>
                </div>
                <h3 style={{ fontFamily: 'var(--ff)', fontSize: 18, marginBottom: 8 }}>Sent!</h3>
                <p style={{ color: 'var(--muted)', fontSize: 14, marginBottom: 6 }}>
                  Your implant record has been sent to <strong>{clinicEmail}</strong>.
                </p>
                <p style={{ color: 'var(--muted)', fontSize: 13, marginBottom: 20 }}>
                  A confirmation has also been sent to your email address.
                </p>
                <button className="btn btn-lg" onClick={() => { setWallOpen(false); setEmailSent(false); setClinicEmail(''); setClinicSearch('') }}>Done</button>
              </div>
            )}

          </div>
          <div className="wall-foot">Encrypted · Signed · Safe to share with any clinic</div>
        </div>
      </div>

      {/* ── Notification drawer ────────────────────────────────────────────── */}
      <div className={`notif-back${notifOpen ? ' open' : ''}`} onClick={() => setNotifOpen(false)} />
      <aside className={`notif-drawer${notifOpen ? ' open' : ''}`} aria-label="Notifications">
        <div className="notif-h">
          <h3>Updates</h3>
          <button className="x" onClick={() => setNotifOpen(false)}>✕</button>
        </div>
        <div className="notif-list">
          {!notifications || notifications.length === 0 ? (
            <div style={{ padding: '20px 16px', textAlign: 'center', color: 'var(--muted)', fontSize: 13 }}>No notifications</div>
          ) : (notifications as {_id: string, title: string, body: string, read: boolean, createdAt: number}[]).map(n => (
            <div key={n._id} style={{ padding: '14px 16px', borderBottom: '1px solid var(--border)', borderLeft: n.read ? '3px solid transparent' : '3px solid var(--accent)', background: n.read ? 'transparent' : 'color-mix(in srgb,var(--accent) 5%,transparent)', display: 'flex', alignItems: 'flex-start', gap: 10 }}>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
                  <span style={{ fontFamily: 'var(--ff)', fontSize: 13.5, fontWeight: n.read ? 400 : 600, color: 'var(--text)' }}>{n.title}</span>
                  {!n.read && <span style={{ fontFamily: 'var(--ff)', fontSize: 10, fontWeight: 700, letterSpacing: '.4px', textTransform: 'uppercase', color: 'var(--accent)', background: 'color-mix(in srgb,var(--accent) 12%,transparent)', borderRadius: 4, padding: '2px 6px' }}>New</span>}
                </div>
                <div style={{ fontSize: 12.5, color: 'var(--muted)', lineHeight: 1.5 }}>{n.body}</div>
                <div style={{ fontSize: 11.5, color: 'var(--muted2)', marginTop: 4 }}>{new Date(n.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</div>
              </div>
            </div>
          ))}
        </div>
        <div className="notif-foot">
          <a href="#" onClick={e => { e.preventDefault(); markRead() }}>Mark all as read</a>
          <a href="/patients/notifications">View all →</a>
        </div>
      </aside>

      {/* ── Logout modal ───────────────────────────────────────────────────── */}
      <div
        className={`logout-back${logoutOpen ? ' open' : ''}`}
        onClick={e => { if (e.target === e.currentTarget) setLogoutOpen(false) }}
      >
        <div className="logout-modal">
          <div className="logout-body">
            <div className="logout-ic">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
                <polyline points="16 17 21 12 16 7"/>
                <line x1="21" y1="12" x2="9" y2="12"/>
              </svg>
            </div>
            <h3>Log out of Implant ID?</h3>
            <p>You'll need to sign back in to access your implant record and wallet pass. Your data stays safe either way.</p>
          </div>
          <div className="logout-actions">
            <button className="btn btn-lg" onClick={() => setLogoutOpen(false)}>← Back</button>
            <button className="btn btn-danger btn-lg" onClick={doSignOut}>Yes, log out</button>
          </div>
        </div>
      </div>

      {/* ── Add another implant modal (Phase 2) ──────────────────────── */}
      {implantOpen && (
        <div
          style={{ position:'fixed', inset:0, background:'rgba(8,19,23,.6)', backdropFilter:'blur(4px)', zIndex:999, display:'flex', alignItems:'center', justifyContent:'center', padding:20 }}
          onClick={e => { if (e.target === e.currentTarget) { setImplantOpen(false); setImplantErr('') } }}
        >
          <div style={{ width:'100%', maxWidth:440, background:'var(--bg2)', border:'1px solid var(--border)', borderRadius:18, overflow:'hidden', boxShadow:'0 40px 80px -20px rgba(0,0,0,.4)' }}>
            <div style={{ padding:'22px 24px 18px', borderBottom:'1px solid var(--border)', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
              <div>
                <h3 style={{ fontFamily:'var(--ff)', fontSize:17, fontWeight:700, margin:0, letterSpacing:'-.015em' }}>Add another implant</h3>
                <p style={{ fontFamily:'var(--ff)', fontSize:13, color:'var(--muted)', margin:'3px 0 0' }}>Self-reported — will be verified by your clinic</p>
              </div>
              <button onClick={() => { setImplantOpen(false); setImplantErr('') }} aria-label="Close" style={{ background:'none', border:'none', cursor:'pointer', color:'var(--muted)', fontSize:18, padding:4, lineHeight:1 }}>✕</button>
            </div>
            <form onSubmit={doAddImplant} style={{ padding:'20px 24px 24px' }}>
              <div className="field" style={{ marginBottom:14 }}>
                <label htmlFor="imp-device" style={{ fontFamily:'var(--ff)', fontSize:12.5, fontWeight:500, color:'var(--muted)', display:'block', marginBottom:6 }}>
                  Device name <span style={{ color:'var(--err)', marginLeft:3 }}>*</span>
                </label>
                <input id="imp-device" className="input" type="text" placeholder="e.g. Medtronic Micra AV"
                  value={implantForm.device} onChange={e => setImplantForm(f => ({ ...f, device: e.target.value }))}
                  autoFocus required />
              </div>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, marginBottom:14 }}>
                <div className="field">
                  <label htmlFor="imp-mfr" style={{ fontFamily:'var(--ff)', fontSize:12.5, fontWeight:500, color:'var(--muted)', display:'block', marginBottom:6 }}>Manufacturer</label>
                  <input id="imp-mfr" className="input" type="text" placeholder="e.g. Medtronic"
                    value={implantForm.manufacturer} onChange={e => setImplantForm(f => ({ ...f, manufacturer: e.target.value }))} />
                </div>
                <div className="field">
                  <label htmlFor="imp-model" style={{ fontFamily:'var(--ff)', fontSize:12.5, fontWeight:500, color:'var(--muted)', display:'block', marginBottom:6 }}>Model number</label>
                  <input id="imp-model" className="input" type="text" placeholder="e.g. MC1VR01"
                    value={implantForm.modelNumber} onChange={e => setImplantForm(f => ({ ...f, modelNumber: e.target.value }))} />
                </div>
              </div>
              <div className="field" style={{ marginBottom:14 }}>
                <label style={{ fontFamily:'var(--ff)', fontSize:12.5, fontWeight:500, color:'var(--muted)', display:'block', marginBottom:6 }}>Device type</label>
                <CustomSelect
                  value={implantForm.deviceType}
                  onChange={v => setImplantForm(f => ({ ...f, deviceType: v }))}
                  options={DEVICE_TYPE_OPTIONS}
                  placeholder="Select type (optional)"
                />
              </div>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, marginBottom:20 }}>
                <div className="field">
                  <label style={{ fontFamily:'var(--ff)', fontSize:12.5, fontWeight:500, color:'var(--muted)', display:'block', marginBottom:6 }}>Implant month</label>
                  <CustomSelect
                    value={implantForm.implantMonth}
                    onChange={v => setImplantForm(f => ({ ...f, implantMonth: v }))}
                    options={MONTH_OPTIONS}
                    placeholder="Month (optional)"
                  />
                </div>
                <div className="field">
                  <label htmlFor="imp-year" style={{ fontFamily:'var(--ff)', fontSize:12.5, fontWeight:500, color:'var(--muted)', display:'block', marginBottom:6 }}>Implant year</label>
                  <input id="imp-year" className="input" type="number" placeholder="e.g. 2021" min="1980" max="2030"
                    value={implantForm.implantYear} onChange={e => setImplantForm(f => ({ ...f, implantYear: e.target.value }))} />
                </div>
              </div>
              {implantErr && (
                <div style={{ background:'color-mix(in srgb,var(--err) 8%,transparent)', border:'1px solid color-mix(in srgb,var(--err) 20%,transparent)', borderRadius:10, padding:'10px 14px', color:'var(--err)', fontSize:13, marginBottom:14 }}>{implantErr}</div>
              )}
              <div style={{ display:'flex', gap:10 }}>
                <button type="button" className="btn btn-lg" style={{ flex:1, justifyContent:'center' }} onClick={() => { setImplantOpen(false); setImplantErr('') }}>Cancel</button>
                <button type="submit" className="btn btn-s btn-lg" style={{ flex:1, justifyContent:'center' }} disabled={implantSaving || !implantForm.device.trim()}>
                  {implantSaving ? 'Saving…' : 'Save implant'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Revoke clinic access confirmation (Phase 4) ───────────────── */}
      {revokeId && (
        <div
          style={{ position:'fixed', inset:0, background:'rgba(8,19,23,.6)', backdropFilter:'blur(4px)', zIndex:999, display:'flex', alignItems:'center', justifyContent:'center', padding:20 }}
          onClick={e => { if (e.target === e.currentTarget && !revoking) setRevokeId(null) }}
        >
          <div style={{ width:'100%', maxWidth:400, background:'var(--bg2)', border:'1px solid var(--border)', borderRadius:18, overflow:'hidden', boxShadow:'0 40px 80px -20px rgba(0,0,0,.4)' }}>
            <div style={{ padding:'28px 28px 20px', textAlign:'center' }}>
              <div style={{ width:48, height:48, borderRadius:'50%', background:'color-mix(in srgb,var(--err) 10%,transparent)', border:'1px solid color-mix(in srgb,var(--err) 22%,transparent)', display:'grid', placeItems:'center', margin:'0 auto 14px' }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--err)" strokeWidth="1.7" aria-hidden="true">
                  <rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                </svg>
              </div>
              <h3 style={{ fontFamily:'var(--ff)', fontSize:18, fontWeight:700, marginBottom:8 }}>Revoke clinic access?</h3>
              <p style={{ fontFamily:'var(--ff)', fontSize:14, color:'var(--muted)', lineHeight:1.55, marginBottom:0 }}>
                This clinic will no longer be able to view your implant record. You can re-share at any time from the Share with clinic option.
              </p>
            </div>
            <div style={{ padding:'0 22px 22px', display:'flex', gap:10 }}>
              <button className="btn btn-lg" style={{ flex:1, justifyContent:'center' }} onClick={() => setRevokeId(null)} disabled={revoking}>Keep access</button>
              <button className="btn btn-danger btn-lg" style={{ flex:1, justifyContent:'center' }} onClick={doRevoke} disabled={revoking}>
                {revoking ? 'Revoking…' : 'Yes, revoke'}
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .wtab{background:transparent;border:0;font-family:var(--ff);font-size:12.5px;font-weight:500;color:var(--muted);padding:8px 14px;border-radius:999px;cursor:pointer;transition:all .15s}
        .wtab.active{background:var(--text);color:var(--bg)}
        @keyframes pending-pulse{0%,100%{opacity:1;box-shadow:0 0 8px #f59e0b}50%{opacity:.4;box-shadow:0 0 3px #f59e0b}}
        @keyframes dash-spin{to{transform:rotate(360deg)}}
        /* Hide green status dot when pending */
        .pb-status--pending::before{display:none !important}
        /* Locked nav items */
        .sb-link--locked{opacity:.45;cursor:not-allowed;pointer-events:none;display:flex;align-items:center;gap:10px}
        .sb-lock{width:12px;height:12px;margin-left:auto;flex-shrink:0;opacity:.7}
        .mob-nav-tab--locked{opacity:.35;cursor:not-allowed;pointer-events:none}
        /* Pending tooltip — appears below badge so it's never clipped by banner */
        .pending-badge-wrap{position:relative;display:inline-block}
        .pending-tooltip{
          display:none;position:absolute;top:calc(100% + 8px);left:0;
          background:rgba(15,23,42,.92);color:#fff;font-family:var(--ff);font-size:12px;line-height:1.55;
          padding:9px 13px;border-radius:9px;width:240px;text-align:left;
          white-space:normal;pointer-events:none;z-index:200;
          box-shadow:0 8px 24px rgba(0,0,0,.2);
        }
        .pending-tooltip::before{
          content:"";position:absolute;bottom:100%;left:18px;
          border:6px solid transparent;border-bottom-color:rgba(15,23,42,.92);
        }
        .pending-badge-wrap:hover .pending-tooltip{display:block}
      `}</style>
    </>
  )
}
