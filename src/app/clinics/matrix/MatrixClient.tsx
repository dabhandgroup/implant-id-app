'use client'

import { useState }            from 'react'
import { useQuery, useMutation } from 'convex/react'
import { api as apiBase }      from '../../../../convex/_generated/api'
import { InlineSelect }        from '@/components/ui/CustomSelect'
import RiskBenefitForm         from './RiskBenefitForm'
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const api = apiBase as any

// ── Constants ─────────────────────────────────────────────────────────────────

const BODY_REGIONS = [
  'Brain/Head',
  'Neck / C-spine',
  'Chest / T-spine',
  'Abdomen / L-spine',
  'Pelvis',
  'Upper extremity',
  'Lower extremity / Knee',
]

// ── Verdict display ────────────────────────────────────────────────────────────

function VerdictCard({
  verdict,
  weightAlert,
}: {
  verdict: string
  weightAlert?: string | null
}) {
  const isPass        = verdict === 'PASS'
  const isFail        = verdict === 'FAIL'
  const isUnresolved  = verdict === 'UNRESOLVED'

  const cfg = isPass
    ? { bg: 'rgba(var(--ok-rgb),0.10)', border: 'rgba(var(--ok-rgb),0.30)', text: 'var(--ok)', label: 'PASS' }
    : isFail
    ? { bg: 'rgba(var(--err-rgb),0.10)', border: 'rgba(var(--err-rgb),0.35)', text: 'var(--err)', label: 'FAIL' }
    : { bg: 'rgba(215,83,9,0.08)', border: 'rgba(215,83,9,0.30)', text: '#b45309', label: 'UNRESOLVED' }

  return (
    <div style={{ background: cfg.bg, border: `2px solid ${cfg.border}`, borderRadius: 14, padding: '20px 24px', display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
      <div style={{ fontFamily: 'var(--ff)', fontSize: 32, fontWeight: 800, color: cfg.text, letterSpacing: '-.02em', lineHeight: 1 }}>
        {cfg.label}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontFamily: 'var(--ff)', fontSize: 14, fontWeight: 600, color: cfg.text }}>
          {isPass && 'Scanning is permitted under the stated conditions'}
          {isFail && 'Scanning is not permitted for this configuration'}
          {isUnresolved && 'Cannot determine — missing data required for a ruling'}
        </div>
        {weightAlert && weightAlert.split('\n').map((line, i) => (
          <div key={i} style={{ fontFamily: 'var(--ff)', fontSize: 13, color: '#b45309', marginTop: 6, background: 'rgba(215,83,9,0.08)', border: '1px solid rgba(215,83,9,0.25)', borderRadius: 6, padding: '6px 10px' }}>
            ⚠ {line}
          </div>
        ))}
      </div>
    </div>
  )
}

// ── System result row ─────────────────────────────────────────────────────────

function SystemRow({ system }: { system: { label: string; verdict: string; reason?: string; constraints?: string[] } }) {
  const [expanded, setExpanded] = useState(false)
  const isPass = system.verdict === 'PASS'
  const isFail = system.verdict === 'FAIL'
  const col = isPass ? 'var(--ok)' : isFail ? 'var(--err)' : '#b45309'

  return (
    <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 10, overflow: 'hidden' }}>
      <button
        type="button"
        style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', background: 'none', border: 0, cursor: 'pointer', textAlign: 'left' }}
        onClick={() => setExpanded(e => !e)}
        aria-expanded={expanded}
      >
        <span style={{ fontFamily: 'var(--ff)', fontSize: 11.5, fontWeight: 700, padding: '3px 8px', borderRadius: 6, background: `${col}22`, color: col, flexShrink: 0 }}>
          {system.verdict}
        </span>
        <span style={{ flex: 1, fontFamily: 'var(--ff)', fontSize: 13.5, fontWeight: 500, color: 'var(--text)' }}>
          {system.label}
        </span>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--muted2)" strokeWidth="2" style={{ flexShrink: 0, transition: 'transform .15s', transform: expanded ? 'rotate(180deg)' : 'none' }} aria-hidden="true">
          <polyline points="6 9 12 15 18 9"/>
        </svg>
      </button>
      {expanded && (
        <div style={{ padding: '0 16px 14px', borderTop: '1px solid var(--border)' }}>
          {system.reason && (
            <p style={{ fontFamily: 'var(--fb)', fontSize: 13, color: 'var(--muted)', margin: '10px 0 0', lineHeight: 1.6 }}>
              {system.reason}
            </p>
          )}
          {system.constraints && system.constraints.length > 0 && (
            <div style={{ marginTop: 10 }}>
              <div style={{ fontFamily: 'var(--ff)', fontSize: 11, fontWeight: 700, letterSpacing: '1px', textTransform: 'uppercase', color: 'var(--muted2)', marginBottom: 6 }}>
                Constraints
              </div>
              <ul style={{ margin: 0, paddingLeft: 18 }}>
                {system.constraints.map((c, i) => (
                  <li key={i} style={{ fontFamily: 'var(--fb)', fontSize: 13, color: 'var(--text)', marginBottom: 4, lineHeight: 1.55 }}>{c}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ── Constraints panel ─────────────────────────────────────────────────────────

function ConstraintsPanel({ constraints }: { constraints: string[] }) {
  if (constraints.length === 0) return null
  return (
    <div style={{ background: 'rgba(var(--accent-rgb),0.05)', border: '1px solid rgba(var(--accent-rgb),0.20)', borderRadius: 12, padding: '16px 20px' }}>
      <div style={{ fontFamily: 'var(--ff)', fontSize: 11, fontWeight: 700, letterSpacing: '1px', textTransform: 'uppercase', color: 'var(--accent-deep)', marginBottom: 10 }}>
        Combined scan constraints
      </div>
      <ul style={{ margin: 0, paddingLeft: 18 }}>
        {constraints.map((c, i) => (
          <li key={i} style={{ fontFamily: 'var(--fb)', fontSize: 13.5, color: 'var(--text)', marginBottom: 5, lineHeight: 1.6 }}>{c}</li>
        ))}
      </ul>
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

export default function MatrixClient() {
  // ── All hooks unconditionally at top ─────────────────────────────────────────
  const clinic   = useQuery(api.clinics.getMyClinic)
  const scanners = useQuery(api.scanners.getMyClinicScanners) as Array<{ _id: string; manufacturer: string; model: string; fieldStrength: string }> | undefined
  const patients = useQuery(api.clinics.listClinicPatients) as Array<{ _id: string; firstName: string; lastName: string; implantIdCode?: string }> | undefined

  const [mode,                setMode]              = useState<'registry' | 'manual'>('registry')
  const [patientId,           setPatientId]         = useState('')
  const [scannerId,           setScannerId]         = useState('')
  const [coilId,              setCoilId]            = useState('')
  const [bodyRegion,          setBodyRegion]        = useState('')
  const [showRvbForm,         setShowRvbForm]       = useState(false)
  const [useManualScanner,    setUseManualScanner]  = useState(false)
  const [manualFieldStrength, setManualFieldStrength] = useState('')
  const [manualCoilType,      setManualCoilType]    = useState('')

  // Coils depend on selected scanner
  const coils = useQuery(
    api.siteCoils.listCoilsByScanner,
    clinic && scannerId ? { siteId: clinic._id, scannerId: scannerId as never } : 'skip'
  ) as Array<{ _id: string; coilDisplayName: string; coilType: string }> | undefined

  // The resolver — runs reactively as selections change
  const hasScanner   = useManualScanner ? !!manualFieldStrength : !!scannerId
  const canResolve   = hasScanner && !!bodyRegion && (mode === 'manual' ? true : !!patientId)
  const resolution = useQuery(
    api.matrix.resolveMatrix,
    canResolve ? {
      mode,
      ...(mode === 'registry' && patientId ? { patientId: patientId as never } : {}),
      ...(useManualScanner ? {
        manualFieldStrength,
        ...(manualCoilType ? { manualCoilType } : {}),
      } : {
        scannerId: scannerId as never,
        ...(coilId ? { coilId: coilId as never } : {}),
      }),
      bodyRegion,
    } : 'skip'
  )

  const createRvb = useMutation(api.riskBenefit.createRvbRecord)

  // ── Derived data ──────────────────────────────────────────────────────────────
  const scannerOpts   = (scanners ?? []).map(s => ({ value: s._id, label: `${s.manufacturer} ${s.model} (${s.fieldStrength})` }))
  const coilOpts      = [{ value: '', label: 'No specific coil' }, ...(coils ?? []).map(c => ({ value: c._id, label: `${c.coilDisplayName} (${c.coilType})` }))]
  const patientOpts   = (patients ?? []).map(p => ({ value: p._id, label: `${p.firstName} ${p.lastName}${p.implantIdCode ? ` — ${p.implantIdCode}` : ''}` }))

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const result   = resolution as any
  const verdict  = result?.verdict
  const systems: Array<{ label: string; verdict: string; reason?: string; constraints?: string[] }> = result?.systems ?? []
  const combined: string[] = result?.combinedConstraints ?? []
  const weightAlert: string | null = result?.weightAlert ?? null

  return (
    <div className="m-content">
      <div className="m-h" style={{ marginBottom: 24 }}>
        <div>
          <h2>MRI Matrix</h2>
          <p className="sub">Resolve MRI safety for a patient or device against your scanner hardware.</p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '340px 1fr', gap: 24, alignItems: 'start' }}>

        {/* ── Left column: selectors ──────────────────────────────────────────── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

          {/* Mode */}
          <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 12, padding: '14px 16px' }}>
            <div style={{ fontFamily: 'var(--ff)', fontSize: 11, fontWeight: 700, letterSpacing: '1px', textTransform: 'uppercase', color: 'var(--muted2)', marginBottom: 10 }}>Mode</div>
            <div style={{ display: 'flex', gap: 8 }}>
              {(['registry', 'manual'] as const).map(m => (
                <button key={m} type="button"
                  onClick={() => setMode(m)}
                  aria-pressed={mode === m}
                  style={{ flex: 1, fontFamily: 'var(--ff)', fontSize: 13, fontWeight: 500, padding: '7px 10px', borderRadius: 8, cursor: 'pointer', transition: 'all .12s',
                    border: mode === m ? '1.5px solid var(--accent)' : '1px solid var(--border)',
                    background: mode === m ? 'rgba(var(--accent-rgb),0.10)' : 'var(--bg)',
                    color: mode === m ? 'var(--accent-deep)' : 'var(--muted)',
                  }}
                >
                  {m === 'registry' ? 'Patient registry' : 'Manual entry'}
                </button>
              ))}
            </div>
          </div>

          {/* Patient selector (registry mode) */}
          {mode === 'registry' && (
            <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 12, padding: '14px 16px' }}>
              <div style={{ fontFamily: 'var(--ff)', fontSize: 11, fontWeight: 700, letterSpacing: '1px', textTransform: 'uppercase', color: 'var(--muted2)', marginBottom: 10 }}>Patient</div>
              <div className="field" style={{ margin: 0 }}>
                <InlineSelect
                  value={patientId}
                  onChange={setPatientId}
                  options={patientOpts}
                  placeholder={patients === undefined ? 'Loading…' : patients.length === 0 ? 'No patients with access' : 'Select patient…'}
                />
              </div>
            </div>
          )}

          {/* Manual entry note */}
          {mode === 'manual' && (
            <div style={{ background: 'rgba(215,83,9,0.06)', border: '1px solid rgba(215,83,9,0.20)', borderRadius: 10, padding: '12px 14px', fontFamily: 'var(--ff)', fontSize: 12.5, color: '#b45309', lineHeight: 1.6 }}>
              Manual mode resolves the default conditions for a device without patient-specific data. Use Registry mode for a real patient scan decision.
            </div>
          )}

          {/* Scanner */}
          <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 12, padding: '14px 16px' }}>
            <div style={{ fontFamily: 'var(--ff)', fontSize: 11, fontWeight: 700, letterSpacing: '1px', textTransform: 'uppercase', color: 'var(--muted2)', marginBottom: 10 }}>Scanner</div>
            {!useManualScanner ? (
              <>
                <div className="field" style={{ margin: 0 }}>
                  <InlineSelect
                    value={scannerId}
                    onChange={v => { setScannerId(v); setCoilId('') }}
                    options={scannerOpts}
                    placeholder={scanners === undefined ? 'Loading…' : scanners.length === 0 ? 'No scanners registered' : 'Select scanner…'}
                  />
                </div>
                <button
                  type="button"
                  onClick={() => { setUseManualScanner(true); setScannerId(''); setCoilId('') }}
                  style={{ marginTop: 8, fontFamily: 'var(--ff)', fontSize: 12, color: 'var(--accent)', background: 'none', border: 'none', cursor: 'pointer', padding: 0, textDecoration: 'underline' }}
                >
                  Not in our database? Enter scanner specs manually →
                </button>
              </>
            ) : (
              <>
                <div style={{ fontFamily: 'var(--ff)', fontSize: 12, color: 'var(--muted)', marginBottom: 8 }}>Field strength</div>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 10 }}>
                  {['0.55T', '1.5T', '3T', '7T'].map(fs => (
                    <button key={fs} type="button"
                      onClick={() => setManualFieldStrength(manualFieldStrength === fs ? '' : fs)}
                      aria-pressed={manualFieldStrength === fs}
                      style={{ fontFamily: 'var(--ff)', fontSize: 13, fontWeight: 600, padding: '6px 14px', borderRadius: 8, cursor: 'pointer', transition: 'all .12s',
                        border: manualFieldStrength === fs ? '1.5px solid var(--accent)' : '1px solid var(--border)',
                        background: manualFieldStrength === fs ? 'rgba(var(--accent-rgb),0.10)' : 'var(--bg)',
                        color: manualFieldStrength === fs ? 'var(--accent-deep)' : 'var(--muted)',
                      }}
                    >{fs}</button>
                  ))}
                </div>
                {scanners && scanners.length > 0 && (
                  <button
                    type="button"
                    onClick={() => { setUseManualScanner(false); setManualFieldStrength(''); setManualCoilType('') }}
                    style={{ fontFamily: 'var(--ff)', fontSize: 12, color: 'var(--muted)', background: 'none', border: 'none', cursor: 'pointer', padding: 0, textDecoration: 'underline' }}
                  >
                    ← Back to scanner list
                  </button>
                )}
              </>
            )}
          </div>

          {/* Coil */}
          <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 12, padding: '14px 16px' }}>
            <div style={{ fontFamily: 'var(--ff)', fontSize: 11, fontWeight: 700, letterSpacing: '1px', textTransform: 'uppercase', color: 'var(--muted2)', marginBottom: 10 }}>RF Coil</div>
            {useManualScanner ? (
              <div className="field" style={{ margin: 0 }}>
                <InlineSelect
                  value={manualCoilType}
                  onChange={setManualCoilType}
                  options={[
                    { value: '', label: 'Body transmit/receive (default)' },
                    { value: 'Body transmit/receive', label: 'Body transmit/receive' },
                    { value: 'Head transmit/receive', label: 'Head transmit/receive' },
                    { value: 'Head receive-only', label: 'Head receive-only (body TX)' },
                    { value: 'Extremity receive-only', label: 'Extremity / local receive-only' },
                    { value: 'Spine receive-only', label: 'Spine receive-only' },
                  ]}
                  placeholder="Body transmit/receive (default)"
                />
              </div>
            ) : (
              <div className="field" style={{ margin: 0 }}>
                <InlineSelect
                  value={coilId}
                  onChange={setCoilId}
                  options={coilOpts}
                  placeholder={!scannerId ? 'Select scanner first' : 'Select coil…'}
                />
              </div>
            )}
          </div>

          {/* Body region */}
          <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 12, padding: '14px 16px' }}>
            <div style={{ fontFamily: 'var(--ff)', fontSize: 11, fontWeight: 700, letterSpacing: '1px', textTransform: 'uppercase', color: 'var(--muted2)', marginBottom: 10 }}>Body region to scan</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {BODY_REGIONS.map(r => (
                <button key={r} type="button"
                  onClick={() => setBodyRegion(bodyRegion === r ? '' : r)}
                  aria-pressed={bodyRegion === r}
                  style={{ textAlign: 'left', fontFamily: 'var(--ff)', fontSize: 13, fontWeight: 400, padding: '7px 12px', borderRadius: 8, cursor: 'pointer', transition: 'all .12s',
                    border: bodyRegion === r ? '1.5px solid var(--accent)' : '1px solid transparent',
                    background: bodyRegion === r ? 'rgba(var(--accent-rgb),0.10)' : 'none',
                    color: bodyRegion === r ? 'var(--accent-deep)' : 'var(--text)',
                  }}
                >{r}</button>
              ))}
            </div>
          </div>
        </div>

        {/* ── Right column: result ────────────────────────────────────────────── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

          {/* Incomplete state */}
          {!canResolve && (
            <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 14, padding: '48px 32px', textAlign: 'center' }}>
              <div style={{ fontFamily: 'var(--ff)', fontSize: 14, color: 'var(--muted)', marginBottom: 6 }}>
                {useManualScanner ? 'Select a field strength and body region to run the resolver' : 'Select a scanner and body region to run the matrix resolver'}
              </div>
              {mode === 'registry' && !patientId && (
                <div style={{ fontFamily: 'var(--ff)', fontSize: 13, color: 'var(--muted2)' }}>Also select a patient for registry-mode resolution</div>
              )}
            </div>
          )}

          {/* Loading */}
          {canResolve && resolution === undefined && (
            <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 14, padding: '48px 32px', textAlign: 'center', fontFamily: 'var(--ff)', fontSize: 13, color: 'var(--muted)' }}>
              Resolving…
            </div>
          )}

          {/* Result */}
          {canResolve && resolution !== undefined && result && (
            <>
              <VerdictCard verdict={verdict} weightAlert={weightAlert} />

              {systems.length > 0 && (
                <div>
                  <div style={{ fontFamily: 'var(--ff)', fontSize: 11, fontWeight: 700, letterSpacing: '1px', textTransform: 'uppercase', color: 'var(--muted2)', marginBottom: 8 }}>
                    Systems ({systems.length})
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {systems.map((s, i) => <SystemRow key={i} system={s} />)}
                  </div>
                </div>
              )}

              {combined.length > 0 && <ConstraintsPanel constraints={combined} />}

              {/* Actions */}
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                {verdict !== 'FAIL' && (
                  <button className="btn btn-s" onClick={() => setShowRvbForm(true)}>
                    Create Risk-Benefit record
                  </button>
                )}
                <a
                  href="/clinics/scan-events"
                  className="btn"
                  style={{ fontSize: 13 }}
                >View scan log</a>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Risk-Benefit form overlay */}
      {showRvbForm && canResolve && result && (
        <RiskBenefitForm
          patientId={mode === 'registry' ? patientId : undefined}
          scannerId={scannerId}
          coilId={coilId || undefined}
          bodyRegion={bodyRegion}
          resolution={result}
          onClose={() => setShowRvbForm(false)}
          createRvb={createRvb}
        />
      )}
    </div>
  )
}
