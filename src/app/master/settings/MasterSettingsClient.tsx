'use client'
import { useState, useEffect } from 'react'
import { useUser, useClerk, useReverification } from '@clerk/nextjs'
import { useRouter }           from 'next/navigation'
import { useQuery, useMutation, useAction } from 'convex/react'
import { api as apiBase }      from '../../../../convex/_generated/api'
import QRCode                  from 'qrcode'
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const api = apiBase as any

// ── OTP input row — module level (avoids React remount on state change) ────────
interface OtpProps { otp: string[]; setOtp: (v: string[]) => void; onComplete: (code: string) => void }
function OtpInputs({ otp, setOtp, onComplete }: OtpProps) {
  function handleChange(i: number, raw: string) {
    const digit = raw.replace(/\D/g, '').slice(-1)
    const next = [...otp]; next[i] = digit; setOtp(next)
    if (digit && i < 5) document.querySelectorAll<HTMLInputElement>('.ms-code-input')[i + 1]?.focus()
    if (i === 5 && digit) { const code = [...otp.slice(0, 5), digit].join(''); if (code.length === 6) onComplete(code) }
  }
  function handleKeyDown(i: number, e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Backspace' && !otp[i] && i > 0) {
      const next = [...otp]; next[i - 1] = ''; setOtp(next)
      document.querySelectorAll<HTMLInputElement>('.ms-code-input')[i - 1]?.focus()
    }
  }
  return (
    <div style={{ display: 'flex', gap: 8, marginTop: 12, marginBottom: 4 }}>
      {otp.map((v, i) => (
        <input key={i} className="ms-code-input" maxLength={2} inputMode="numeric" pattern="[0-9]*"
          value={v} onChange={e => handleChange(i, e.target.value)} onKeyDown={e => handleKeyDown(i, e)}
          onFocus={e => e.target.select()} style={{
            width: 46, height: 52, textAlign: 'center', fontSize: 22, fontWeight: 600,
            fontFamily: 'var(--ff)', border: '1.5px solid var(--border2)', borderRadius: 10,
            background: 'var(--bg)', color: 'var(--text)', outline: 'none', boxSizing: 'border-box',
          }} />
      ))}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────

export default function MasterSettingsClient() {
  const { user, isLoaded }  = useUser()
  const { signOut }         = useClerk()
  const router              = useRouter()

  const addPasskeySecure    = useReverification(async () => { await user?.createPasskey() })
  const removePasskeySecure = useReverification(async (id: string) => {
    const pk = (user?.passkeys ?? []).find((p: { id: string }) => p.id === id)
    await pk?.delete()
  })

  // ── Notification settings ─────────────────────────────────────────────────
  const notifSettings   = useQuery(api.adminSettings.getMyAdminNotificationSettings)
  const upsertNotif     = useMutation(api.adminSettings.upsertAdminNotificationSettings)
  const [notifSaving,   setNotifSaving]  = useState<string | null>(null)

  async function handleNotifToggle(field: 'newClinicApplication' | 'newManufacturerApplication' | 'newDevicePendingReview') {
    if (!notifSettings) return
    setNotifSaving(field)
    const patch = {
      newClinicApplication:       notifSettings.newClinicApplication,
      newManufacturerApplication: notifSettings.newManufacturerApplication,
      newDevicePendingReview:     notifSettings.newDevicePendingReview,
      [field]: !(notifSettings as Record<string, boolean>)[field],
    }
    try {
      await upsertNotif(patch)
    } finally {
      setNotifSaving(null)
    }
  }

  // ── Admin user management ─────────────────────────────────────────────────
  const admins             = useQuery(api.users.listAdmins)
  const inviteAdmin        = useMutation(api.users.inviteAdmin)
  const updateAdmin        = useMutation(api.users.updateAdmin)
  const removeAdmin        = useMutation(api.users.removeAdmin)
  const resendAdminInvite  = useMutation(api.users.resendAdminInvite)
  const notifyRemoval      = useAction(api.adminDeleteActions.adminNotifyAdminRemoval)
  const [inviteName,  setInviteName]  = useState('')
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviting,    setInviting]    = useState(false)
  const [inviteErr,   setInviteErr]   = useState('')
  const [inviteDone,  setInviteDone]  = useState(false)

  // Edit / remove state
  const [editingId,        setEditingId]        = useState<string | null>(null)
  const [editName,         setEditName]         = useState('')
  const [editSaving,       setEditSaving]       = useState(false)
  const [editErr,          setEditErr]          = useState('')
  const [removingId,       setRemovingId]       = useState<string | null>(null)
  const [resendingId,      setResendingId]      = useState<string | null>(null)
  const [resendDone,       setResendDone]       = useState<string | null>(null)
  const [confirmRemove,    setConfirmRemove]    = useState<{ id: string; name: string } | null>(null)

  async function handleInviteAdmin(e: React.FormEvent) {
    e.preventDefault()
    if (!inviteName.trim() || !inviteEmail.trim()) return
    setInviting(true); setInviteErr(''); setInviteDone(false)
    try {
      await inviteAdmin({ email: inviteEmail.trim().toLowerCase(), name: inviteName.trim() })
      setInviteDone(true); setInviteName(''); setInviteEmail('')
      setTimeout(() => setInviteDone(false), 4000)
    } catch (e) {
      setInviteErr((e as { message?: string })?.message ?? 'Failed — try again')
    } finally {
      setInviting(false)
    }
  }

  async function handleEditAdmin(id: string) {
    setEditSaving(true); setEditErr('')
    try {
      await updateAdmin({ userId: id as never, name: editName.trim() })
      setEditingId(null)
    } catch (e) {
      setEditErr((e as { message?: string })?.message ?? 'Failed — try again')
    } finally {
      setEditSaving(false)
    }
  }

  async function handleRemoveAdmin(id: string) {
    setRemovingId(id)
    const target = (admins ?? []).find((a: any) => a._id === id)
    try {
      await removeAdmin({ userId: id as never })
      // Non-fatal — send notification email after successful removal
      if (target?.email) {
        notifyRemoval({ removedEmail: target.email, removedName: target.name ?? target.email }).catch(() => {/* non-fatal */})
      }
    } catch (e) {
      alert((e as { message?: string })?.message ?? 'Failed to remove admin')
    } finally {
      setRemovingId(null)
    }
  }

  async function handleResendInvite(id: string) {
    setResendingId(id)
    try {
      await resendAdminInvite({ userId: id as never })
      setResendDone(id)
      setTimeout(() => setResendDone(null), 3000)
    } catch (e) {
      alert((e as { message?: string })?.message ?? 'Failed to resend')
    } finally {
      setResendingId(null)
    }
  }

  // ── Security — passkeys ───────────────────────────────────────────────────
  const [passkeyLoading, setPasskeyLoading] = useState(false)
  const [passkeyErr,     setPasskeyErr]     = useState('')

  // ── Security — TOTP ───────────────────────────────────────────────────────
  const [totpSetup,         setTotpSetup]         = useState<{ secret: string; uri: string } | null>(null)
  const [totpQr,            setTotpQr]            = useState('')
  const [totpShowKey,       setTotpShowKey]        = useState(false)
  const [totpCode,          setTotpCode]           = useState(['', '', '', '', '', ''])
  const [totpVerifyErr,     setTotpVerifyErr]      = useState('')
  const [totpVerifyLoading, setTotpVerifyLoading]  = useState(false)
  const [totpDisableLoading,setTotpDisableLoading] = useState(false)
  const [totpDisableErr,    setTotpDisableErr]     = useState('')
  const [secretCopied,      setSecretCopied]       = useState(false)
  const [activeSection,     setActiveSection]      = useState<'security' | 'profile' | 'notifications' | 'admins' | 'ai'>('security')
  const [apiKeyDraft,       setApiKeyDraft]        = useState('')
  const [apiKeySaved,       setApiKeySaved]        = useState(false)

  const storedApiKey  = useQuery(api.aiChats.getApiKey)
  const saveApiKeyMut = useMutation(api.aiChats.saveApiKey)
  const delApiKeyMut  = useMutation(api.aiChats.deleteApiKey)

  // Email change
  const updateMyEmail        = useAction(api.users.updateMyEmail)
  const [emailChangeOpen,    setEmailChangeOpen]    = useState(false)
  const [newEmailInput,      setNewEmailInput]      = useState('')
  const [emailChangeLoading, setEmailChangeLoading] = useState(false)
  const [emailChangeErr,     setEmailChangeErr]     = useState('')
  const [emailChangeDone,    setEmailChangeDone]    = useState(false)

  // Sign-out confirmation
  const [signOutConfirm, setSignOutConfirm] = useState(false)
  const [signingOut,     setSigningOut]     = useState(false)

  async function handleSignOut() {
    setSigningOut(true)
    await signOut({ redirectUrl: '/master/login' })
  }

  async function handleEmailChange(e: React.FormEvent) {
    e.preventDefault()
    if (!newEmailInput.trim()) return
    setEmailChangeLoading(true); setEmailChangeErr(''); setEmailChangeDone(false)
    try {
      await updateMyEmail({ newEmail: newEmailInput.trim() })
      setEmailChangeDone(true)
      setEmailChangeOpen(false)
      setNewEmailInput('')
      // Reload to pick up updated Clerk session
      setTimeout(() => window.location.reload(), 800)
    } catch (err: unknown) {
      setEmailChangeErr((err as { message?: string })?.message ?? 'Failed to update email — try again')
    } finally {
      setEmailChangeLoading(false)
    }
  }

  // Escape key
  useEffect(() => {
    function handle(e: KeyboardEvent) { if (e.key === 'Escape') setTotpSetup(null) }
    document.addEventListener('keydown', handle)
    return () => document.removeEventListener('keydown', handle)
  }, [])

  // Sync draft when stored key loads
  useEffect(() => {
    if (storedApiKey !== undefined) setApiKeyDraft(storedApiKey ?? '')
  }, [storedApiKey])

  // All hooks above — guard after all hooks
  if (!isLoaded) return <div className="m-content" />
  if (!user) { router.replace('/master/login'); return null }

  // ── Derived ───────────────────────────────────────────────────────────────
  const email    = user.primaryEmailAddress?.emailAddress ?? '—'
  const name     = user.fullName ?? user.firstName ?? 'Master Admin'
  const initials = ((user.firstName?.[0] ?? '') + (user.lastName?.[0] ?? '')).toUpperCase() || 'MA'
  const totpEnabled = !!(user.totpEnabled ?? (user as { twoFactorEnabled?: boolean }).twoFactorEnabled)
  const passkeys = user.passkeys ?? []

  // ── Passkey handlers ──────────────────────────────────────────────────────
  async function addPasskey() {
    if (!user) return
    setPasskeyErr('')
    setPasskeyLoading(true)
    try {
      await addPasskeySecure()
    } catch (err: unknown) {
      const e = err as { errors?: Array<{ message: string }> }
      setPasskeyErr(e?.errors?.[0]?.message ?? 'Failed to add passkey — try again.')
    } finally {
      setPasskeyLoading(false)
    }
  }

  async function removePasskey(id: string) {
    if (!user) return
    setPasskeyErr('')
    try {
      await removePasskeySecure(id)
    } catch (err: unknown) {
      const e = err as { errors?: Array<{ message: string }> }
      setPasskeyErr(e?.errors?.[0]?.message ?? 'Failed to remove passkey — try again.')
    }
  }

  // ── TOTP handlers ─────────────────────────────────────────────────────────
  async function startTotpSetup() {
    if (!user) return
    setTotpVerifyErr('')
    setTotpCode(['', '', '', '', '', ''])
    setTotpShowKey(false)
    try {
      const totp = await user.createTOTP()
      const uri = totp.uri ?? ''
      const secret = totp.secret ?? ''
      setTotpSetup({ secret, uri })
      if (uri) {
        const dataUrl = await QRCode.toDataURL(uri, { margin: 1, width: 160, color: { dark: '#0e2a33', light: '#ffffff' } })
        setTotpQr(dataUrl)
      }
    } catch (err: unknown) {
      const e = err as { errors?: Array<{ message: string }> }
      setTotpVerifyErr(e?.errors?.[0]?.message ?? 'Failed to start 2FA setup.')
    }
  }

  async function verifyTotpSetup(code?: string) {
    const c = code ?? totpCode.join('')
    if (!user || !totpSetup || c.length < 6) return
    setTotpVerifyErr('')
    setTotpVerifyLoading(true)
    try {
      await user.verifyTOTP({ code: c })
      setTotpSetup(null)
      setTotpCode(['', '', '', '', '', ''])
      setTotpQr('')
    } catch (err: unknown) {
      const e = err as { errors?: Array<{ message: string }> }
      setTotpVerifyErr(e?.errors?.[0]?.message ?? 'Incorrect code — check your app.')
    } finally {
      setTotpVerifyLoading(false)
    }
  }

  async function disableTotp() {
    if (!user) return
    setTotpDisableErr('')
    setTotpDisableLoading(true)
    try {
      await user.disableTOTP()
    } catch (err: unknown) {
      const e = err as { errors?: Array<{ message: string }> }
      setTotpDisableErr(e?.errors?.[0]?.message ?? 'Failed to disable 2FA — try again.')
    } finally {
      setTotpDisableLoading(false)
    }
  }

  function copySecret() {
    if (!totpSetup) return
    navigator.clipboard.writeText(totpSetup.secret).then(() => {
      setSecretCopied(true)
      setTimeout(() => setSecretCopied(false), 2000)
    })
  }

  // ─────────────────────────────────────────────────────────────────────────────

  return (
    <>
    <div className="m-content">
      <div className="m-h" style={{ marginBottom: 22 }}>
        <div>
          <div className="ey">Master admin</div>
          <h2 style={{ fontSize: 'clamp(20px,2vw,26px)', letterSpacing: '-.025em', marginTop: 6 }}>Settings</h2>
        </div>
        <button className="btn btn-danger btn-s" onClick={() => setSignOutConfirm(true)}
          style={{ background: 'color-mix(in srgb,var(--err) 12%,transparent)', border: '1px solid color-mix(in srgb,var(--err) 25%,transparent)', color: 'var(--err)', borderRadius: 999 }}>
          Sign out
        </button>
      </div>

      {/* Horizontal tab bar */}
      <div className="stab-bar">
        <button className={`stab-btn${activeSection === 'security' ? ' active' : ''}`} onClick={() => setActiveSection('security')} aria-selected={activeSection === 'security'}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
          Security
        </button>
        <button className={`stab-btn${activeSection === 'profile' ? ' active' : ''}`} onClick={() => setActiveSection('profile')} aria-selected={activeSection === 'profile'}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
          Profile
        </button>
        <button className={`stab-btn${activeSection === 'notifications' ? ' active' : ''}`} onClick={() => setActiveSection('notifications')} aria-selected={activeSection === 'notifications'}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
          Notifications
        </button>
        <button className={`stab-btn${activeSection === 'admins' ? ' active' : ''}`} onClick={() => setActiveSection('admins')} aria-selected={activeSection === 'admins'}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/></svg>
          Admin Users
        </button>
        <button className={`stab-btn${activeSection === 'ai' ? ' active' : ''}`} onClick={() => setActiveSection('ai')} aria-selected={activeSection === 'ai'}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true"><path d="M12 2a9 9 0 0 1 9 9c0 4.97-4.03 9-9 9s-9-4.03-9-9a9 9 0 0 1 9-9z"/><path d="M9 9h.01M15 9h.01M9.5 14.5s1 1.5 2.5 1.5 2.5-1.5 2.5-1.5"/></svg>
          AI Assistant
        </button>
      </div>

        {/* Content panel */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

          {/* ── SECURITY ─────────────────────────────────────────────────── */}
          {activeSection === 'security' && (
            <>
              {/* Passkeys card */}
              <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 14, overflow: 'hidden' }}>
                <div style={{ padding: '18px 22px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div>
                    <div style={{ fontFamily: 'var(--ff)', fontSize: 15, fontWeight: 600, color: 'var(--text)', marginBottom: 2 }}>
                      Passkeys &amp; Face ID
                    </div>
                    <div style={{ fontSize: 13, color: 'var(--muted)' }}>Sign in with biometrics — no password needed.</div>
                  </div>
                  <button className="btn btn-s" onClick={addPasskey} disabled={passkeyLoading}
                    style={{ fontSize: 13, padding: '9px 16px' }}>
                    {passkeyLoading ? 'Adding…' : '+ Add passkey'}
                  </button>
                </div>

                {passkeyErr && (
                  <div style={{ background: 'color-mix(in srgb,var(--err) 8%,transparent)', borderBottom: '1px solid color-mix(in srgb,var(--err) 20%,transparent)', padding: '10px 22px', fontSize: 13, color: 'var(--err)' }}>
                    {passkeyErr}
                  </div>
                )}

                {passkeys.length === 0 ? (
                  <div style={{ padding: '24px 22px', textAlign: 'center', color: 'var(--muted)', fontSize: 13.5 }}>
                    No passkeys registered yet. Click <strong style={{ color: 'var(--text)' }}>+ Add passkey</strong> to add Face ID or fingerprint.
                  </div>
                ) : (
                  passkeys.map((pk, i) => (
                    <div key={pk.id} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 22px', borderBottom: i < passkeys.length - 1 ? '1px solid var(--border)' : 'none' }}>
                      <div style={{ width: 36, height: 36, borderRadius: 10, background: 'color-mix(in srgb,var(--accent) 10%,transparent)', display: 'grid', placeItems: 'center', flexShrink: 0 }}>
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="1.7">
                          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                        </svg>
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontFamily: 'var(--ff)', fontSize: 13.5, fontWeight: 500, color: 'var(--text)' }}>
                          {(pk as { name?: string }).name ?? `Passkey ${i + 1}`}
                        </div>
                        <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>
                          Added {pk.createdAt ? new Date(pk.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : 'recently'}
                        </div>
                      </div>
                      <button onClick={() => removePasskey(pk.id)} aria-label="Remove passkey"
                        style={{ background: 'transparent', border: 0, color: 'var(--muted2)', cursor: 'pointer', padding: 4, fontSize: 13, fontFamily: 'var(--ff)', transition: 'color .15s' }}
                        onMouseEnter={e => (e.currentTarget.style.color = 'var(--err)')}
                        onMouseLeave={e => (e.currentTarget.style.color = 'var(--muted2)')}>
                        Remove
                      </button>
                    </div>
                  ))
                )}
              </div>

              {/* TOTP card */}
              <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 14, overflow: 'hidden' }}>
                <div style={{ padding: '18px 22px', borderBottom: totpSetup || totpEnabled ? '1px solid var(--border)' : 'none', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div>
                    <div style={{ fontFamily: 'var(--ff)', fontSize: 15, fontWeight: 600, color: 'var(--text)', marginBottom: 2, display: 'flex', alignItems: 'center', gap: 8 }}>
                      Authenticator app (TOTP)
                      {totpEnabled && (
                        <span style={{ background: 'color-mix(in srgb,var(--ok) 12%,transparent)', color: 'var(--ok)', fontSize: 10.5, fontWeight: 600, letterSpacing: '.6px', textTransform: 'uppercase', padding: '2px 7px', borderRadius: 4 }}>
                          Enabled
                        </span>
                      )}
                    </div>
                    <div style={{ fontSize: 13, color: 'var(--muted)' }}>
                      {totpEnabled ? 'Your account is protected with 2-step verification.' : 'Add an extra layer of security with Google Authenticator or similar.'}
                    </div>
                  </div>
                  {!totpSetup && (
                    totpEnabled ? (
                      <button onClick={disableTotp} disabled={totpDisableLoading}
                        style={{ background: 'color-mix(in srgb,var(--err) 8%,transparent)', border: '1px solid color-mix(in srgb,var(--err) 25%,transparent)', color: 'var(--err)', fontFamily: 'var(--ff)', fontSize: 13, fontWeight: 600, padding: '8px 14px', borderRadius: 8, cursor: 'pointer' }}>
                        {totpDisableLoading ? 'Disabling…' : 'Disable 2FA'}
                      </button>
                    ) : (
                      <button className="btn btn-s" onClick={startTotpSetup} style={{ fontSize: 13, padding: '9px 16px' }}>
                        Enable 2FA
                      </button>
                    )
                  )}
                </div>

                {totpDisableErr && (
                  <div style={{ padding: '10px 22px', fontSize: 13, color: 'var(--err)', background: 'color-mix(in srgb,var(--err) 8%,transparent)' }}>
                    {totpDisableErr}
                  </div>
                )}

                {/* TOTP Setup flow */}
                {totpSetup && (
                  <div style={{ padding: '22px' }}>
                    <p style={{ fontSize: 13.5, color: 'var(--muted)', marginBottom: 20, lineHeight: 1.6 }}>
                      Scan this QR code with <strong style={{ color: 'var(--text)' }}>Google Authenticator</strong>, <strong style={{ color: 'var(--text)' }}>Authy</strong>, or any TOTP app, then enter the 6-digit code below to confirm.
                    </p>
                    <div style={{ display: 'flex', gap: 24, alignItems: 'flex-start', flexWrap: 'wrap', marginBottom: 20 }}>
                      {totpQr && (
                        <div style={{ background: '#fff', padding: 10, borderRadius: 12, border: '1px solid var(--border)', flexShrink: 0 }}>
                          <img src={totpQr} alt="2FA QR code" width={160} height={160} />
                        </div>
                      )}
                      <div style={{ flex: 1, minWidth: 200 }}>
                        <div style={{ fontFamily: 'var(--ff)', fontSize: 12, fontWeight: 600, letterSpacing: '.5px', textTransform: 'uppercase', color: 'var(--muted2)', marginBottom: 6 }}>
                          Can't scan? Enter this key manually:
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <code style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 8, padding: '8px 12px', fontSize: totpShowKey ? 13 : 14, letterSpacing: totpShowKey ? '.06em' : 0, fontFamily: 'SF Mono,Monaco,monospace', color: 'var(--text)', flex: 1, filter: totpShowKey ? 'none' : 'blur(6px)', userSelect: totpShowKey ? 'text' : 'none', transition: 'filter .2s' }}>
                            {totpSetup.secret}
                          </code>
                          <button onClick={() => setTotpShowKey(v => !v)} style={{ background: 'none', border: 0, color: 'var(--muted)', cursor: 'pointer', fontSize: 12, fontFamily: 'var(--ff)', whiteSpace: 'nowrap', padding: 0 }}>
                            {totpShowKey ? 'Hide' : 'Reveal'}
                          </button>
                          {totpShowKey && (
                            <button onClick={copySecret} style={{ background: 'none', border: 0, color: secretCopied ? 'var(--ok)' : 'var(--muted)', cursor: 'pointer', fontSize: 12, fontFamily: 'var(--ff)', whiteSpace: 'nowrap', padding: 0 }}>
                              {secretCopied ? 'Copied!' : 'Copy'}
                            </button>
                          )}
                        </div>
                      </div>
                    </div>

                    <div style={{ fontFamily: 'var(--ff)', fontSize: 12, fontWeight: 600, letterSpacing: '.5px', textTransform: 'uppercase', color: 'var(--muted2)', marginBottom: 4 }}>
                      Enter the 6-digit code from your app
                    </div>
                    <OtpInputs otp={totpCode} setOtp={setTotpCode} onComplete={verifyTotpSetup} />
                    {totpVerifyErr && <div style={{ fontSize: 13, color: 'var(--err)', marginTop: 8 }}>{totpVerifyErr}</div>}
                    <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
                      <button className="btn btn-s" onClick={() => verifyTotpSetup()} disabled={totpVerifyLoading || totpCode.join('').length < 6}>
                        {totpVerifyLoading ? 'Verifying…' : 'Activate 2FA →'}
                      </button>
                      <button className="btn" onClick={() => { setTotpSetup(null); setTotpCode(['','','','','','']); setTotpQr('') }}>
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </>
          )}

          {/* ── PROFILE ──────────────────────────────────────────────────── */}
          {activeSection === 'profile' && (
            <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 14, overflow: 'hidden' }}>
              <div style={{ padding: '18px 22px', borderBottom: '1px solid var(--border)' }}>
                <div style={{ fontFamily: 'var(--ff)', fontSize: 15, fontWeight: 600, color: 'var(--text)' }}>Profile</div>
                <div style={{ fontSize: 13, color: 'var(--muted)', marginTop: 2 }}>Your master account details.</div>
              </div>
              <div style={{ padding: '24px 22px' }}>
                {/* Avatar */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 28 }}>
                  <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'linear-gradient(140deg,var(--accent),var(--accent2))', display: 'grid', placeItems: 'center', color: '#fff', fontFamily: 'var(--ff)', fontWeight: 700, fontSize: 18, flexShrink: 0 }}>
                    {user.imageUrl
                      ? <img src={user.imageUrl} alt={name} style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} />
                      : initials
                    }
                  </div>
                  <div>
                    <div style={{ fontFamily: 'var(--ff)', fontSize: 17, fontWeight: 600, color: 'var(--text)' }}>{name}</div>
                    <div style={{ fontSize: 13, color: 'var(--muted)', marginTop: 3 }}>Master Admin · Implant ID</div>
                  </div>
                </div>

                <div className="field" style={{ marginBottom: 16 }}>
                  <label>Email address</label>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <input className="input" type="email" value={email} readOnly
                      style={{ background: 'var(--bg)', cursor: 'default', color: 'var(--muted)', flex: 1 }} />
                    <button
                      type="button"
                      className="btn"
                      style={{ flexShrink: 0, fontSize: 13 }}
                      onClick={() => { setEmailChangeOpen(v => !v); setEmailChangeErr(''); setNewEmailInput('') }}
                    >
                      {emailChangeOpen ? 'Cancel' : 'Change'}
                    </button>
                  </div>
                  {emailChangeDone && (
                    <span style={{ fontSize: 12.5, color: 'var(--ok)', marginTop: 4, display: 'block' }}>
                      ✓ Email updated — reloading…
                    </span>
                  )}
                  {emailChangeOpen && (
                    <form onSubmit={handleEmailChange} style={{ marginTop: 10 }}>
                      <div className="field" style={{ marginBottom: 10 }}>
                        <label style={{ fontSize: 12, color: 'var(--muted2)' }}>New email address</label>
                        <input
                          className="input"
                          type="email"
                          placeholder="new@example.com"
                          value={newEmailInput}
                          onChange={e => { setNewEmailInput(e.target.value); setEmailChangeErr('') }}
                          autoFocus
                          autoComplete="off"
                          required
                        />
                        <span className="hint">Must not be used by any existing account.</span>
                      </div>
                      {emailChangeErr && (
                        <div style={{ fontSize: 13, color: 'var(--err)', marginBottom: 10 }}>{emailChangeErr}</div>
                      )}
                      <button
                        type="submit"
                        className="btn btn-s"
                        disabled={emailChangeLoading || !newEmailInput.trim()}
                      >
                        {emailChangeLoading ? 'Updating…' : 'Update email →'}
                      </button>
                    </form>
                  )}
                </div>

                <div className="field" style={{ marginBottom: 16 }}>
                  <label>Account role</label>
                  <input className="input" value="Master Admin" readOnly
                    style={{ background: 'var(--bg)', cursor: 'default', color: 'var(--muted)' }} />
                  <span className="hint">Account role cannot be changed here.</span>
                </div>

                <div style={{ padding: '14px 18px', background: 'color-mix(in srgb,var(--ok) 8%,transparent)', border: '1px solid color-mix(in srgb,var(--ok) 20%,transparent)', borderRadius: 10, display: 'flex', alignItems: 'center', gap: 10 }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--ok)" strokeWidth="1.7"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
                  <span style={{ fontSize: 13, color: 'var(--ok)', fontFamily: 'var(--ff)', fontWeight: 500 }}>Verified master account — full platform access</span>
                </div>
              </div>
            </div>
          )}

          {/* ── Notifications panel ── */}
          {activeSection === 'notifications' && (
            <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 14, overflow: 'hidden' }}>
              <div style={{ padding: '18px 22px', borderBottom: '1px solid var(--border)' }}>
                <div style={{ fontFamily: 'var(--ff)', fontSize: 15, fontWeight: 600, color: 'var(--text)' }}>Email notifications</div>
                <div style={{ fontSize: 13, color: 'var(--muted)', marginTop: 2 }}>Choose which platform events send you an email. All notifications are on by default.</div>
              </div>

              {notifSettings === undefined ? (
                <div style={{ padding: '24px 22px', color: 'var(--muted)', fontSize: 13 }}>Loading…</div>
              ) : notifSettings === null ? (
                <div style={{ padding: '24px 22px', color: 'var(--muted)', fontSize: 13 }}>Could not load notification settings.</div>
              ) : (
                <div>
                  {([
                    { field: 'newClinicApplication'       as const, label: 'New clinic application',       desc: 'When a clinic submits an application to join the platform.' },
                    { field: 'newManufacturerApplication' as const, label: 'New manufacturer application', desc: 'When a manufacturer applies to submit devices.' },
                    { field: 'newDevicePendingReview'     as const, label: 'Device pending review',        desc: 'When a manufacturer submits a device for approval.' },
                  ]).map(({ field, label, desc }, i, arr) => {
                    const enabled = (notifSettings as Record<string, boolean>)[field] ?? true
                    const saving  = notifSaving === field
                    return (
                      <div key={field} style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '16px 22px', borderBottom: i < arr.length - 1 ? '1px solid var(--border)' : 'none' }}>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontFamily: 'var(--ff)', fontSize: 14, fontWeight: 500, color: 'var(--text)' }}>{label}</div>
                          <div style={{ fontSize: 12.5, color: 'var(--muted)', marginTop: 2 }}>{desc}</div>
                        </div>
                        <button
                          onClick={() => handleNotifToggle(field)}
                          disabled={saving}
                          aria-label={`${enabled ? 'Disable' : 'Enable'} ${label} notifications`}
                          style={{
                            flexShrink: 0, width: 44, height: 24, borderRadius: 12, border: 'none',
                            background: enabled ? 'var(--accent)' : 'var(--border)',
                            position: 'relative', cursor: saving ? 'default' : 'pointer',
                            transition: 'background .2s', opacity: saving ? .6 : 1,
                          }}
                        >
                          <span style={{
                            position: 'absolute', top: 3, left: enabled ? 23 : 3,
                            width: 18, height: 18, borderRadius: '50%', background: '#fff',
                            transition: 'left .2s', boxShadow: '0 1px 3px rgba(0,0,0,.2)',
                          }} />
                        </button>
                      </div>
                    )
                  })}
                </div>
              )}

              <div style={{ padding: '14px 22px', background: 'color-mix(in srgb,var(--accent) 5%,transparent)', borderTop: '1px solid var(--border)' }}>
                <div style={{ fontSize: 12.5, color: 'var(--muted)', lineHeight: 1.5 }}>
                  These settings apply only to your account. Other admins manage their own notification preferences.
                </div>
              </div>
            </div>
          )}

          {/* ── Admin Users panel ── */}
          {activeSection === 'admins' && (
            <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 14, overflow: 'hidden' }}>
              <div style={{ padding: '18px 22px', borderBottom: '1px solid var(--border)' }}>
                <div style={{ fontFamily: 'var(--ff)', fontSize: 15, fontWeight: 600, color: 'var(--text)' }}>Admin Users</div>
                <div style={{ fontSize: 13, color: 'var(--muted)', marginTop: 2 }}>Manage who has master admin access to the platform.</div>
              </div>
              <div style={{ padding: '24px 22px' }}>

                {/* Invite form */}
                <div style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 12, padding: '20px 22px', marginBottom: 24 }}>
                  <div style={{ fontFamily: 'var(--ff)', fontSize: 14, fontWeight: 600, marginBottom: 16 }}>Invite new admin</div>
                  <form onSubmit={handleInviteAdmin}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
                      <div className="field" style={{ marginBottom: 0 }}>
                        <label>Full name <span style={{ color: 'var(--err)', marginLeft: 3 }}>*</span></label>
                        <input className="input" type="text" placeholder="Jane Smith" value={inviteName} onChange={e => setInviteName(e.target.value)} required />
                      </div>
                      <div className="field" style={{ marginBottom: 0 }}>
                        <label>Email address <span style={{ color: 'var(--err)', marginLeft: 3 }}>*</span></label>
                        <input className="input" type="email" placeholder="jane@implantid.io" value={inviteEmail} onChange={e => setInviteEmail(e.target.value)} required />
                      </div>
                    </div>
                    {inviteErr && <div style={{ marginBottom: 12, fontSize: 13, color: 'var(--err)' }}>{inviteErr}</div>}
                    {inviteDone && <div style={{ marginBottom: 12, fontSize: 13, color: 'var(--ok)', fontWeight: 600 }}>✓ Admin invited — they can sign in via email OTP</div>}
                    <button type="submit" className="btn btn-s" disabled={inviting || !inviteName.trim() || !inviteEmail.trim()}>
                      {inviting ? 'Inviting…' : '+ Invite admin'}
                    </button>
                  </form>
                </div>

                {/* Current admins */}
                <div style={{ fontFamily: 'var(--ff)', fontSize: 13, fontWeight: 600, color: 'var(--muted2)', marginBottom: 12, letterSpacing: '.5px', textTransform: 'uppercase' }}>Current admins</div>
                {admins === undefined ? (
                  <div style={{ color: 'var(--muted)', fontSize: 13 }}>Loading…</div>
                ) : admins.length === 0 ? (
                  <div style={{ color: 'var(--muted)', fontSize: 13 }}>No admins found.</div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {(admins as {_id:string; name:string; email:string; clerkId:string}[]).map((a) => {
                      const isMe      = a.email === email
                      const isPending = !a.clerkId
                      const isEditing = editingId === a._id
                      return (
                        <div key={a._id} style={{ border: '1px solid var(--border)', borderRadius: 10, overflow: 'hidden' }}>
                          {/* Main row */}
                          <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '12px 16px' }}>
                            <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'linear-gradient(140deg,var(--accent),var(--accent2))', display: 'grid', placeItems: 'center', color: '#fff', fontFamily: 'var(--ff)', fontWeight: 700, fontSize: 12, flexShrink: 0 }}>
                              {a.name.split(' ').map((w: string) => w[0]).join('').toUpperCase().slice(0, 2)}
                            </div>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ fontFamily: 'var(--ff)', fontSize: 14, fontWeight: 500, color: 'var(--text)' }}>{a.name}</div>
                              <div style={{ fontSize: 12.5, color: 'var(--muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.email}</div>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                              {isMe && (
                                <span style={{ fontFamily: 'var(--ff)', fontSize: 11, fontWeight: 600, color: 'var(--accent)', background: 'color-mix(in srgb,var(--accent) 10%,transparent)', padding: '2px 8px', borderRadius: 5 }}>You</span>
                              )}
                              <span style={{ fontFamily: 'var(--ff)', fontSize: 11, fontWeight: 600, color: isPending ? '#b45309' : 'var(--ok)', background: isPending ? 'color-mix(in srgb,#f59e0b 10%,transparent)' : 'color-mix(in srgb,var(--ok) 10%,transparent)', padding: '2px 8px', borderRadius: 5 }}>
                                {isPending ? 'Pending' : 'Active'}
                              </span>
                              {/* Edit button */}
                              <button
                                className="btn"
                                style={{ padding: '4px 10px', fontSize: 12 }}
                                onClick={() => { setEditingId(isEditing ? null : a._id); setEditName(a.name); setEditErr('') }}
                                aria-label="Edit admin"
                              >
                                {isEditing ? 'Cancel' : 'Edit'}
                              </button>
                              {/* Remove button — hidden for self */}
                              {!isMe && (
                                <button
                                  className="btn btn-danger"
                                  style={{ padding: '4px 10px', fontSize: 12 }}
                                  onClick={() => setConfirmRemove({ id: a._id, name: a.name })}
                                  disabled={removingId === a._id}
                                  aria-label="Remove admin"
                                >
                                  {removingId === a._id ? 'Removing…' : 'Remove'}
                                </button>
                              )}
                            </div>
                          </div>

                          {/* Expanded edit panel */}
                          {isEditing && (
                            <div style={{ borderTop: '1px solid var(--border)', padding: '14px 16px', background: 'var(--bg)' }}>
                              <div className="field" style={{ marginBottom: 10 }}>
                                <label>Display name</label>
                                <input
                                  className="input"
                                  value={editName}
                                  onChange={e => setEditName(e.target.value)}
                                  placeholder="Full name"
                                />
                              </div>
                              {editErr && <div style={{ fontSize: 13, color: 'var(--err)', marginBottom: 8 }}>{editErr}</div>}
                              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                                <button
                                  className="btn btn-s"
                                  onClick={() => handleEditAdmin(a._id)}
                                  disabled={editSaving || !editName.trim()}
                                >
                                  {editSaving ? 'Saving…' : 'Save name'}
                                </button>
                                {isPending && (
                                  <button
                                    className="btn"
                                    onClick={() => handleResendInvite(a._id)}
                                    disabled={resendingId === a._id}
                                  >
                                    {resendDone === a._id ? '✓ Invite sent' : resendingId === a._id ? 'Sending…' : 'Resend invite'}
                                  </button>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ── AI ASSISTANT ─────────────────────────────────────────────── */}
          {activeSection === 'ai' && (
            <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 14, overflow: 'hidden' }}>
              <div style={{ padding: '18px 22px', borderBottom: '1px solid var(--border)' }}>
                <div style={{ fontFamily: 'var(--ff)', fontSize: 15, fontWeight: 600, color: 'var(--text)', marginBottom: 2 }}>
                  Anthropic API Key
                </div>
                <div style={{ fontSize: 13, color: 'var(--muted)' }}>
                  Stored securely in your account — synced across all your devices.{' '}
                  <a href="https://platform.claude.com/settings/workspaces/default/keys" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accent-deep)', fontWeight: 500 }}>
                    Get a key at console.anthropic.com →
                  </a>
                </div>
              </div>
              <div style={{ padding: '20px 22px' }}>
                {storedApiKey === undefined ? (
                  <div style={{ color: 'var(--muted)', fontSize: 13 }}>Loading…</div>
                ) : (
                  <>
                    <div className="field" style={{ marginBottom: 14 }}>
                      <label>API Key</label>
                      <input
                        className="input"
                        type="password"
                        placeholder="sk-ant-…"
                        value={apiKeyDraft}
                        onChange={e => { setApiKeyDraft(e.target.value); setApiKeySaved(false) }}
                        autoComplete="off"
                        spellCheck={false}
                      />
                    </div>
                    <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                      <button
                        className="btn btn-s"
                        onClick={async () => {
                          await saveApiKeyMut({ key: apiKeyDraft.trim() })
                          setApiKeySaved(true)
                          setTimeout(() => setApiKeySaved(false), 3000)
                        }}
                        disabled={!apiKeyDraft.trim()}
                      >
                        {apiKeySaved ? '✓ Saved' : 'Save key'}
                      </button>
                      {storedApiKey && (
                        <button className="btn" style={{ fontSize: 13 }}
                          onClick={async () => {
                            setApiKeyDraft('')
                            await delApiKeyMut({})
                          }}>
                          Remove
                        </button>
                      )}
                      {storedApiKey && (
                        <a href="/master/devices/ai"
                          className="btn btn-s"
                          style={{ fontSize: 13, textDecoration: 'none' }}>
                          Open AI Assistant →
                        </a>
                      )}
                    </div>
                    <div style={{ marginTop: 18, background: 'color-mix(in srgb,var(--accent) 5%,transparent)', border: '1px solid color-mix(in srgb,var(--accent) 14%,transparent)', borderRadius: 10, padding: '12px 16px', fontFamily: 'var(--ff)', fontSize: 13, color: 'var(--muted)', lineHeight: 1.6 }}>
                      <strong style={{ color: 'var(--text)' }}>What it does:</strong> The AI Assistant lets you chat with Claude to
                      research medical devices, find MRI safety specs, and import device data from spreadsheets. Your key
                      is stored in your account and syncs across all devices — it is never logged or used outside of AI Assistant calls.
                    </div>
                  </>
                )}
              </div>
            </div>
          )}

        </div>
    </div>

    {/* ── Remove admin confirmation modal ── */}
    {confirmRemove && (
      <div className="confirm-back open" onClick={() => !removingId && setConfirmRemove(null)}>
        <div className="confirm-modal" onClick={e => e.stopPropagation()}>
          <div className="confirm-body">
            <div style={{ width:44, height:44, borderRadius:'50%', background:'color-mix(in srgb,var(--err) 12%,transparent)', display:'grid', placeItems:'center', margin:'0 auto 14px' }}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--err)" strokeWidth="2" aria-hidden="true">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                <circle cx="9" cy="7" r="4"/>
                <line x1="23" y1="11" x2="17" y2="11"/>
              </svg>
            </div>
            <h3>Remove admin?</h3>
            <p style={{ color:'var(--muted)', fontSize:14 }}>
              <strong style={{ color:'var(--text)' }}>{confirmRemove.name}</strong> will lose master admin access immediately. This cannot be undone.
            </p>
          </div>
          <div className="confirm-actions">
            <button className="btn" onClick={() => setConfirmRemove(null)} disabled={!!removingId}>Cancel</button>
            <button
              className="btn btn-danger"
              disabled={!!removingId}
              onClick={async () => {
                await handleRemoveAdmin(confirmRemove.id)
                setConfirmRemove(null)
              }}
            >
              {removingId ? 'Removing…' : 'Remove admin'}
            </button>
          </div>
        </div>
      </div>
    )}

    {/* ── Sign-out confirmation modal ── */}
    {signOutConfirm && (
      <div className="logout-back open" onClick={() => !signingOut && setSignOutConfirm(false)}>
        <div className="logout-modal" onClick={e => e.stopPropagation()}>
          <div className="logout-body">
            <div style={{ width:44, height:44, borderRadius:'50%', background:'color-mix(in srgb,var(--err) 12%,transparent)', display:'grid', placeItems:'center', margin:'0 auto 14px' }}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--err)" strokeWidth="2">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
                <polyline points="16 17 21 12 16 7"/>
                <line x1="21" y1="12" x2="9" y2="12"/>
              </svg>
            </div>
            <h3>Sign out?</h3>
            <p>You&apos;ll be returned to the master admin login screen.</p>
          </div>
          <div className="logout-actions">
            <button className="btn" onClick={() => setSignOutConfirm(false)} disabled={signingOut}>Cancel</button>
            <button className="btn btn-danger" onClick={handleSignOut} disabled={signingOut}>
              {signingOut ? 'Signing out…' : 'Sign out'}
            </button>
          </div>
        </div>
      </div>
    )}
    </>
  )
}
