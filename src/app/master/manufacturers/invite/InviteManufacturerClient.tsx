'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useMutation } from 'convex/react'
import { api as apiBase } from '../../../../../convex/_generated/api'
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const api = apiBase as any

export default function InviteManufacturerClient() {
  const router  = useRouter()
  const invite  = useMutation(api.manufacturers.inviteManufacturer)

  const [form, setForm] = useState({
    companyName:  '',
    contactName:  '',
    contactEmail: '',
    country:      '',
    regNumber:    '',
    website:      '',
  })
  const [inviting, setInviting] = useState(false)
  const [error,    setError]    = useState('')
  const [done,     setDone]     = useState(false)

  function set(k: keyof typeof form) {
    return (e: React.ChangeEvent<HTMLInputElement>) =>
      setForm(f => ({ ...f, [k]: e.target.value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setInviting(true)
    try {
      await invite({
        companyName:  form.companyName.trim(),
        contactName:  form.contactName.trim(),
        contactEmail: form.contactEmail.trim(),
        country:      form.country.trim(),
        regNumber:    form.regNumber.trim() || undefined,
        website:      form.website.trim() || undefined,
      })
      setDone(true)
    } catch (e) {
      setError((e as { message?: string })?.message ?? 'Failed to send invite — please try again.')
    } finally {
      setInviting(false)
    }
  }

  const canSubmit = form.companyName.trim() && form.contactName.trim() && form.contactEmail.trim() && form.country.trim()

  return (
    <div className="m-content">
      {/* Back */}
      <button
        className="m-back"
        onClick={() => router.push('/master/manufacturers')}
        style={{ background:'none', border:0, cursor:'pointer', color:'var(--muted)', fontFamily:'var(--ff)', fontSize:13.5, padding:0, marginBottom:24, display:'inline-flex', alignItems:'center', gap:6 }}
      >
        ← Manufacturers
      </button>

      <div className="m-h" style={{ marginBottom: 28 }}>
        <div>
          <h2>Invite Manufacturer</h2>
          <div className="sub">Send an onboarding invitation to a medical device manufacturer.</div>
        </div>
      </div>

      {done ? (
        <div style={{ background:'color-mix(in srgb,var(--ok) 10%,transparent)', border:'1px solid color-mix(in srgb,var(--ok) 25%,transparent)', borderRadius:14, padding:'32px 28px', textAlign:'center', maxWidth:520 }}>
          <div style={{ fontSize:36, marginBottom:12 }}>✓</div>
          <div style={{ fontFamily:'var(--ff)', fontSize:18, fontWeight:600, color:'var(--ok)', marginBottom:8 }}>Invite sent</div>
          <div style={{ fontFamily:'var(--fb)', fontSize:14, color:'var(--muted)', marginBottom:24 }}>
            {form.contactName} at <strong>{form.companyName}</strong> has been invited to create their manufacturer account on Implant ID.
          </div>
          <div style={{ display:'flex', gap:10, justifyContent:'center' }}>
            <button className="btn btn-s" onClick={() => router.push('/master/manufacturers')}>Back to manufacturers</button>
            <button className="btn" onClick={() => { setDone(false); setForm({ companyName:'', contactName:'', contactEmail:'', country:'', regNumber:'', website:'' }) }}>
              Invite another
            </button>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} style={{ maxWidth: 520 }}>
          <div style={{ background:'var(--bg2)', border:'1px solid var(--border)', borderRadius:14, padding:'24px 24px 8px' }}>

            <div className="field">
              <label>Company Name <span style={{ color:'var(--err)', marginLeft:3 }}>*</span></label>
              <input className="input" type="text" placeholder="e.g. Acme Medical Devices"
                value={form.companyName} onChange={set('companyName')} />
            </div>

            <div className="field">
              <label>Contact Name <span style={{ color:'var(--err)', marginLeft:3 }}>*</span></label>
              <input className="input" type="text" placeholder="e.g. John Smith"
                value={form.contactName} onChange={set('contactName')} />
            </div>

            <div className="field">
              <label>Contact Email <span style={{ color:'var(--err)', marginLeft:3 }}>*</span></label>
              <input className="input" type="email" placeholder="john@acme.com"
                value={form.contactEmail} onChange={set('contactEmail')} />
            </div>

            <div className="field">
              <label>Country <span style={{ color:'var(--err)', marginLeft:3 }}>*</span></label>
              <input className="input" type="text" placeholder="e.g. Australia"
                value={form.country} onChange={set('country')} />
            </div>

            <div className="field">
              <label>Regulatory Number <span style={{ color:'var(--muted)', fontWeight:400, marginLeft:4 }}>(optional)</span></label>
              <input className="input" type="text" placeholder="e.g. FDA1234567"
                value={form.regNumber} onChange={set('regNumber')} />
            </div>

            <div className="field" style={{ marginBottom:16 }}>
              <label>Website <span style={{ color:'var(--muted)', fontWeight:400, marginLeft:4 }}>(optional)</span></label>
              <input className="input" type="url" placeholder="https://acme.com"
                value={form.website} onChange={set('website')} />
            </div>
          </div>

          {error && (
            <div style={{ margin:'14px 0', background:'color-mix(in srgb,var(--err) 8%,transparent)', border:'1px solid color-mix(in srgb,var(--err) 20%,transparent)', borderRadius:8, padding:'10px 14px', fontSize:13.5, color:'var(--err)' }}>
              {error}
            </div>
          )}

          <div style={{ display:'flex', gap:10, marginTop:16 }}>
            <button type="button" className="btn" onClick={() => router.push('/master/manufacturers')} disabled={inviting}>
              Cancel
            </button>
            <button type="submit" className="btn btn-s btn-block" disabled={inviting || !canSubmit}>
              {inviting ? 'Sending…' : 'Send invite →'}
            </button>
          </div>
        </form>
      )}
    </div>
  )
}
