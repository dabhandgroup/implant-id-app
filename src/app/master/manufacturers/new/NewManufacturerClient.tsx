'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useMutation } from 'convex/react'
import { api as apiBase } from '../../../../../convex/_generated/api'
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const api = apiBase as any

export default function NewManufacturerClient() {
  const router = useRouter()
  const addMfr = useMutation(api.manufacturers.adminAddManufacturer)

  const [form, setForm] = useState({
    companyName: '', contactName: '', contactEmail: '',
    country: '', regNumber: '', website: '', logoUrl: '',
  })
  const [saving, setSaving] = useState(false)
  const [error,  setError]  = useState('')
  const [done,   setDone]   = useState(false)

  function set(k: keyof typeof form) {
    return (e: React.ChangeEvent<HTMLInputElement>) =>
      setForm(f => ({ ...f, [k]: e.target.value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.companyName.trim() || !form.contactName.trim() || !form.contactEmail.trim() || !form.country.trim()) {
      setError('Company name, contact name, email and country are required.')
      return
    }
    setSaving(true); setError('')
    try {
      await addMfr({
        companyName:  form.companyName.trim(),
        contactName:  form.contactName.trim(),
        contactEmail: form.contactEmail.trim(),
        country:      form.country.trim(),
        regNumber:    form.regNumber.trim() || undefined,
        website:      form.website.trim() || undefined,
        logoUrl:      form.logoUrl.trim() || undefined,
      })
      setDone(true)
    } catch (e) {
      setError((e as { message?: string })?.message ?? 'Failed to add manufacturer — please try again.')
    } finally {
      setSaving(false)
    }
  }

  const canSubmit = form.companyName.trim() && form.contactName.trim() && form.contactEmail.trim() && form.country.trim()

  return (
    <div className="m-content">
      <button
        className="m-back"
        onClick={() => router.push('/master/manufacturers')}
        style={{ background:'none', border:0, cursor:'pointer', color:'var(--muted)', fontFamily:'var(--ff)', fontSize:13.5, padding:0, marginBottom:24, display:'inline-flex', alignItems:'center', gap:6 }}
      >
        ← Manufacturers
      </button>

      <div className="m-h" style={{ marginBottom: 28 }}>
        <div>
          <h2>Add Manufacturer</h2>
          <div className="sub">Creates an approved manufacturer account immediately. No invitation email is sent.</div>
        </div>
      </div>

      {done ? (
        <div style={{ background:'rgba(var(--ok-rgb),0.10)', border:'1px solid rgba(var(--ok-rgb),0.25)', borderRadius:14, padding:'32px 28px', textAlign:'center', maxWidth:520 }}>
          <div style={{ width:48, height:48, borderRadius:'50%', background:'rgba(var(--ok-rgb),0.15)', display:'grid', placeItems:'center', margin:'0 auto 14px' }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--ok)" strokeWidth="2.2"><path d="M20 6L9 17l-5-5"/></svg>
          </div>
          <div style={{ fontFamily:'var(--ff)', fontSize:18, fontWeight:600, color:'var(--ok)', marginBottom:8 }}>Manufacturer added</div>
          <div style={{ fontFamily:'var(--fb)', fontSize:14, color:'var(--muted)', marginBottom:24 }}>
            <strong style={{ color:'var(--text)' }}>{form.companyName}</strong> is now an approved manufacturer on Implant ID.
          </div>
          <div style={{ display:'flex', gap:10, justifyContent:'center' }}>
            <button className="btn btn-s" onClick={() => router.push('/master/manufacturers')}>Back to manufacturers</button>
            <button className="btn" onClick={() => { setDone(false); setForm({ companyName:'', contactName:'', contactEmail:'', country:'', regNumber:'', website:'', logoUrl:'' }) }}>
              Add another
            </button>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} style={{ maxWidth: 560 }}>
          <div style={{ background:'var(--bg2)', border:'1px solid var(--border)', borderRadius:14, padding:'24px 24px 8px' }}>

            <div className="field">
              <label>Company name <span style={{ color:'var(--err)', marginLeft:3 }}>*</span></label>
              <input className="input" type="text" placeholder="e.g. Medtronic" autoFocus
                value={form.companyName} onChange={set('companyName')} />
            </div>

            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
              <div className="field">
                <label>Contact name <span style={{ color:'var(--err)', marginLeft:3 }}>*</span></label>
                <input className="input" type="text" placeholder="Full name"
                  value={form.contactName} onChange={set('contactName')} />
              </div>
              <div className="field">
                <label>Country <span style={{ color:'var(--err)', marginLeft:3 }}>*</span></label>
                <input className="input" type="text" placeholder="e.g. United Kingdom"
                  value={form.country} onChange={set('country')} />
              </div>
            </div>

            <div className="field">
              <label>Contact email <span style={{ color:'var(--err)', marginLeft:3 }}>*</span></label>
              <input className="input" type="email" placeholder="contact@manufacturer.com"
                value={form.contactEmail} onChange={set('contactEmail')} />
            </div>

            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
              <div className="field">
                <label>Reg. / FDA number <span style={{ color:'var(--muted)', fontWeight:400 }}>(optional)</span></label>
                <input className="input" type="text" placeholder="ISO / FDA number"
                  value={form.regNumber} onChange={set('regNumber')} />
              </div>
              <div className="field">
                <label>Website <span style={{ color:'var(--muted)', fontWeight:400 }}>(optional)</span></label>
                <input className="input" type="url" placeholder="https://…"
                  value={form.website} onChange={set('website')} />
              </div>
            </div>

            <div className="field" style={{ marginBottom:16 }}>
              <label>Logo URL <span style={{ color:'var(--muted)', fontWeight:400 }}>(optional)</span></label>
              <input className="input" type="url" placeholder="https://logo.clearbit.com/medtronic.com"
                value={form.logoUrl} onChange={set('logoUrl')} />
              {form.logoUrl.trim() && (
                <div style={{ marginTop:8, display:'flex', alignItems:'center', gap:10 }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={form.logoUrl.trim()} alt="Logo preview" style={{ width:32, height:32, objectFit:'contain', borderRadius:6, border:'1px solid var(--border)', background:'#fff', padding:4 }} onError={e => { (e.target as HTMLImageElement).style.display='none' }} />
                  <span style={{ fontSize:12, color:'var(--muted)' }}>Logo preview</span>
                </div>
              )}
            </div>
          </div>

          {error && (
            <div style={{ margin:'14px 0', background:'rgba(var(--err-rgb),0.08)', border:'1px solid rgba(var(--err-rgb),0.20)', borderRadius:8, padding:'10px 14px', fontSize:13.5, color:'var(--err)' }}>
              {error}
            </div>
          )}

          <div style={{ display:'flex', gap:10, marginTop:16 }}>
            <button type="button" className="btn" onClick={() => router.push('/master/manufacturers')} disabled={saving}>
              Cancel
            </button>
            <button type="submit" className="btn btn-s btn-block" disabled={saving || !canSubmit}>
              {saving ? 'Adding…' : 'Add manufacturer →'}
            </button>
          </div>
        </form>
      )}
    </div>
  )
}
