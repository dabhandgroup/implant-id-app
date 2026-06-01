'use client'
import { useQuery } from 'convex/react'
import { useUser } from '@clerk/nextjs'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { api as apiBase } from '../../../../convex/_generated/api'
const api = apiBase as any

const MRI_COLOUR: Record<string,string> = { safe:'#166534', conditional:'#b45309', unsafe:'#b91c1c', unknown:'#64748b' }
const MRI_LABEL: Record<string,string> = { safe:'MR Safe', conditional:'MR Conditional', unsafe:'MR Unsafe — Do Not Scan', unknown:'Unknown' }
const MRI_BG: Record<string,string> = { safe:'color-mix(in srgb,#22c55e 8%,transparent)', conditional:'color-mix(in srgb,#f59e0b 8%,transparent)', unsafe:'color-mix(in srgb,#ef4444 8%,transparent)', unknown:'var(--bg2)' }
const MRI_BORDER: Record<string,string> = { safe:'color-mix(in srgb,#22c55e 20%,transparent)', conditional:'color-mix(in srgb,#f59e0b 20%,transparent)', unsafe:'color-mix(in srgb,#ef4444 20%,transparent)', unknown:'var(--border)' }

export default function ScanClient({ code }: { code: string }) {
  const { user, isLoaded } = useUser()
  const router = useRouter()
  const cleanCode = code.toUpperCase()

  const role = (user?.publicMetadata?.role as string | undefined) ?? null
  const canView = role === 'clinic_staff' || role === 'surgeon' || role === 'admin'

  const result = useQuery(api.patients.lookupByImplantId, canView ? { code: cleanCode } : 'skip')

  useEffect(() => {
    if (!isLoaded) return
    if (!user) {
      router.replace('/login?email=&next=/scan/' + cleanCode)
    }
  }, [isLoaded, user, router, cleanCode])

  if (!isLoaded) return <div style={{minHeight:'100vh',display:'grid',placeItems:'center',fontFamily:'var(--ff)',color:'var(--muted)',fontSize:14}}>Loading…</div>

  if (!user) return null

  if (role === 'patient') {
    return (
      <main style={{minHeight:'100vh',display:'flex',alignItems:'center',justifyContent:'center',background:'var(--bg)',padding:24,fontFamily:'var(--ff)'}}>
        <div style={{maxWidth:440,textAlign:'center'}}>
          <div style={{fontSize:40,marginBottom:16}}>🔒</div>
          <h2 style={{marginBottom:12,color:'var(--text)'}}>Access restricted</h2>
          <p style={{color:'var(--muted)',fontSize:15,lineHeight:1.65}}>This QR code is for clinical staff only. If you are a patient trying to view your own record, <a href="/patients/dashboard" style={{color:'var(--accent)'}}>go to your dashboard</a>.</p>
        </div>
      </main>
    )
  }

  if (!canView) {
    return (
      <main style={{minHeight:'100vh',display:'flex',alignItems:'center',justifyContent:'center',background:'var(--bg)',padding:24,fontFamily:'var(--ff)'}}>
        <div style={{maxWidth:440,textAlign:'center'}}>
          <h2 style={{marginBottom:12,color:'var(--text)'}}>Clinic login required</h2>
          <p style={{color:'var(--muted)',fontSize:15,marginBottom:24}}>This patient record is only accessible to verified clinic staff.</p>
          <a href={'/login?email=&next=/scan/'+cleanCode} className="btn btn-s" style={{textDecoration:'none',display:'inline-block'}}>Sign in as clinic</a>
        </div>
      </main>
    )
  }

  return (
    <main style={{minHeight:'100vh',background:'var(--bg)',padding:'32px 16px',fontFamily:'var(--ff)'}}>
      <div style={{maxWidth:560,margin:'0 auto'}}>
        <a href="/clinics/scan-patient" style={{display:'inline-flex',alignItems:'center',gap:6,color:'var(--muted)',fontSize:13.5,textDecoration:'none',marginBottom:24}}>
          ← Back to scan
        </a>

        {result === undefined && <div style={{color:'var(--muted)',fontSize:14}}>Looking up patient…</div>}

        {result === null && (
          <div style={{background:'var(--bg2)',border:'1px solid var(--border)',borderRadius:14,padding:'40px 24px',textAlign:'center'}}>
            <div style={{fontSize:15,fontWeight:600,color:'var(--text)',marginBottom:6}}>Patient not found</div>
            <p style={{fontSize:13.5,color:'var(--muted)'}}>No record found for <strong>{cleanCode}</strong>.</p>
          </div>
        )}

        {result && (
          <div style={{background:'var(--bg2)',border:'1px solid var(--border)',borderRadius:16,overflow:'hidden'}}>
            {result.overallMriStatus && (
              <div style={{padding:'18px 24px',background:MRI_BG[result.overallMriStatus]??'var(--bg)',borderBottom:'1px solid '+(MRI_BORDER[result.overallMriStatus]??'var(--border)'),display:'flex',alignItems:'center',gap:14}}>
                <img src={result.overallMriStatus==='safe'?'/mr-safe.svg':result.overallMriStatus==='conditional'?'/mr-conditional.svg':'/mr-unsafe.svg'} alt={MRI_LABEL[result.overallMriStatus]} style={{width:48,height:48,flexShrink:0}}/>
                <div>
                  <div style={{fontFamily:'var(--ff)',fontWeight:700,fontSize:16,color:MRI_COLOUR[result.overallMriStatus]}}>{MRI_LABEL[result.overallMriStatus]}</div>
                  <div style={{fontSize:12.5,color:'var(--muted)',marginTop:2}}>{result.verificationStatus==='active'?'Verified Implant ID record':'⚠ Unverified — self-reported only'}</div>
                </div>
              </div>
            )}
            <div style={{padding:'20px 24px'}}>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:14,marginBottom:14}}>
                {[
                  {label:'Patient',value:result.firstName+' '+result.lastName},
                  {label:'Implant ID',value:result.implantIdCode},
                  {label:'Date of birth',value:result.dob??'—'},
                  {label:'Height / Weight',value:[result.heightCm?result.heightCm+' cm':null,result.weightKg?result.weightKg+' kg':null].filter(Boolean).join(' · ')||'—'},
                ].map(f => (
                  <div key={f.label}>
                    <div style={{fontSize:11,color:'var(--muted2)',fontFamily:'var(--ff)',marginBottom:2}}>{f.label}</div>
                    <div style={{fontSize:14,fontWeight:500,color:'var(--text)'}}>{f.value}</div>
                  </div>
                ))}
              </div>
              {result.contrastAllergy && (
                <div style={{marginBottom:12,padding:'10px 14px',borderRadius:8,background:'color-mix(in srgb,var(--err) 8%,transparent)',border:'1px solid color-mix(in srgb,var(--err) 20%,transparent)',fontFamily:'var(--ff)',fontSize:13,color:'var(--err)',fontWeight:500}}>
                  ⚠ Contrast allergy{result.contrastAllergyNote?': '+result.contrastAllergyNote:''}
                </div>
              )}
              {result.devices && result.devices.length > 0 && result.devices.map((d:any,i:number) => d && (
                <div key={i} style={{display:'flex',alignItems:'center',gap:12,padding:'10px 0',borderTop:'1px solid var(--border)'}}>
                  {d.mriStatus&&<img src={d.mriStatus==='safe'?'/mr-safe.svg':d.mriStatus==='conditional'?'/mr-conditional.svg':'/mr-unsafe.svg'} alt={d.mriStatus} style={{width:28,height:28,flexShrink:0}}/>}
                  <div>
                    <div style={{fontFamily:'var(--ff)',fontSize:13.5,fontWeight:500,color:'var(--text)'}}>{d.manufacturer} {d.deviceName}</div>
                    <div style={{fontSize:12,color:'var(--muted)'}}>{d.deviceType}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </main>
  )
}
