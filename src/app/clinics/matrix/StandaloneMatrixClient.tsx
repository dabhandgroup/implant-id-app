'use client'

import { useMemo, useState } from 'react'
import { InlineSelect } from '@/components/ui/CustomSelect'
import { VerdictCard, SystemRow, ConstraintsPanel } from '../MatrixDisplay'
import { resolveSystem, combineVerdicts, type SystemInput } from '../../../../convex/matrixCore'
import {
  STANDALONE_DEVICES,
  STANDALONE_CONDITIONS,
  STANDALONE_SCANNERS,
  STANDALONE_COIL_OPTIONS,
  STANDALONE_BODY_REGIONS,
  STANDALONE_INTEGRITY_OPTIONS,
  STANDALONE_LOCATION_OPTIONS,
} from './standaloneData'

// ── Standalone MVP Matrix ──────────────────────────────────────────────────────
// Clinic-only MVP launch: no Convex, no clinic-registered patients/hardware.
// Resolves against a small hardcoded, cited dataset (see standaloneData.ts)
// using the exact same 10-gate resolver (convex/matrixCore.ts) as the
// registry-linked matrix at /clinics/matrix-registry — same safety logic,
// different data source.

export default function StandaloneMatrixClient() {
  // ── All hooks unconditionally at top ─────────────────────────────────────────
  const [deviceId,      setDeviceId]      = useState('')
  const [scannerId,     setScannerId]     = useState('')
  const [coilType,      setCoilType]      = useState('')
  const [bodyRegion,    setBodyRegion]    = useState('')
  const [integrity,     setIntegrity]     = useState('Complete')
  const [implantLocation, setImplantLocation] = useState('')

  const deviceOpts  = useMemo(() => STANDALONE_DEVICES.map(d => ({ value: d.id, label: `${d.manufacturer} — ${d.deviceName}` })), [])
  const scannerOpts = useMemo(() => STANDALONE_SCANNERS.map(s => ({ value: s.id, label: `${s.manufacturer} ${s.model} (${s.fieldStrength})` })), [])

  const canResolve = !!deviceId && !!scannerId && !!bodyRegion

  const result = useMemo(() => {
    if (!canResolve) return null
    const device   = STANDALONE_DEVICES.find(d => d.id === deviceId)
    const scanner  = STANDALONE_SCANNERS.find(s => s.id === scannerId)
    if (!device || !scanner) return null
    const conditions = STANDALONE_CONDITIONS[deviceId] ?? []
    const coil = coilType ? { coilType, coilDisplayName: coilType } : null

    const systemInput: SystemInput = {
      label:           device.deviceName ?? device.model ?? device.id,
      device,
      conditions,
      leadDevices:     [],
      integrityState:  integrity,
      implantLocation: implantLocation || undefined,
    }

    const systemResult = resolveSystem(systemInput, scanner, coil, bodyRegion)
    const verdict = combineVerdicts([systemResult])
    return { verdict, systems: [systemResult], combinedConstraints: [...new Set(systemResult.constraints)] }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canResolve, deviceId, scannerId, coilType, bodyRegion, integrity, implantLocation])

  const selectedScanner = STANDALONE_SCANNERS.find(s => s.id === scannerId)

  return (
    <div className="m-content">
      <div className="m-h" style={{ marginBottom: 24 }}>
        <div>
          <h2>MRI Matrix</h2>
          <p className="sub">Resolve MRI safety for a device against scanner hardware.</p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '340px 1fr', gap: 24, alignItems: 'start' }}>

        {/* ── Left column: selectors ──────────────────────────────────────────── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

          {/* Device */}
          <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 12, padding: '14px 16px' }}>
            <div style={{ fontFamily: 'var(--ff)', fontSize: 11, fontWeight: 700, letterSpacing: '1px', textTransform: 'uppercase', color: 'var(--muted2)', marginBottom: 10 }}>Device</div>
            <div className="field" style={{ margin: 0 }}>
              <InlineSelect value={deviceId} onChange={setDeviceId} options={deviceOpts} placeholder="Select device…" />
            </div>
          </div>

          {/* Device / lead integrity */}
          <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 12, padding: '14px 16px' }}>
            <div style={{ fontFamily: 'var(--ff)', fontSize: 11, fontWeight: 700, letterSpacing: '1px', textTransform: 'uppercase', color: 'var(--muted2)', marginBottom: 10 }}>Device / lead integrity</div>
            <div className="field" style={{ margin: 0 }}>
              <InlineSelect value={integrity} onChange={setIntegrity} options={STANDALONE_INTEGRITY_OPTIONS} placeholder="Complete" />
            </div>
          </div>

          {/* Implant location — only meaningful for location-scoped devices (e.g. VNS) */}
          <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 12, padding: '14px 16px' }}>
            <div style={{ fontFamily: 'var(--ff)', fontSize: 11, fontWeight: 700, letterSpacing: '1px', textTransform: 'uppercase', color: 'var(--muted2)', marginBottom: 10 }}>Implant location</div>
            <div className="field" style={{ margin: 0 }}>
              <InlineSelect value={implantLocation} onChange={setImplantLocation} options={STANDALONE_LOCATION_OPTIONS} placeholder="Not recorded" />
            </div>
          </div>

          {/* Scanner */}
          <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 12, padding: '14px 16px' }}>
            <div style={{ fontFamily: 'var(--ff)', fontSize: 11, fontWeight: 700, letterSpacing: '1px', textTransform: 'uppercase', color: 'var(--muted2)', marginBottom: 10 }}>Scanner</div>
            <div className="field" style={{ margin: 0 }}>
              <InlineSelect value={scannerId} onChange={setScannerId} options={scannerOpts} placeholder="Select scanner…" />
            </div>
            {selectedScanner && (
              <div style={{ marginTop: 8, fontFamily: 'var(--fb)', fontSize: 11.5, color: 'var(--muted2)', lineHeight: 1.5 }}>
                Source: {selectedScanner.sourceLabel}
              </div>
            )}
          </div>

          {/* Coil */}
          <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 12, padding: '14px 16px' }}>
            <div style={{ fontFamily: 'var(--ff)', fontSize: 11, fontWeight: 700, letterSpacing: '1px', textTransform: 'uppercase', color: 'var(--muted2)', marginBottom: 10 }}>RF Coil</div>
            <div className="field" style={{ margin: 0 }}>
              <InlineSelect value={coilType} onChange={setCoilType} options={STANDALONE_COIL_OPTIONS} placeholder="Body transmit/receive (default)" />
            </div>
          </div>

          {/* Body region */}
          <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 12, padding: '14px 16px' }}>
            <div style={{ fontFamily: 'var(--ff)', fontSize: 11, fontWeight: 700, letterSpacing: '1px', textTransform: 'uppercase', color: 'var(--muted2)', marginBottom: 10 }}>Body region to scan</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {STANDALONE_BODY_REGIONS.map(r => (
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
                Select a device, scanner, and body region to run the matrix resolver
              </div>
            </div>
          )}

          {/* Result */}
          {canResolve && result && (
            <>
              <VerdictCard verdict={result.verdict} />

              {result.systems.length > 0 && (
                <div>
                  <div style={{ fontFamily: 'var(--ff)', fontSize: 11, fontWeight: 700, letterSpacing: '1px', textTransform: 'uppercase', color: 'var(--muted2)', marginBottom: 8 }}>
                    Systems ({result.systems.length})
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {result.systems.map((s, i) => (
                      <SystemRow key={i} system={{ label: s.label, verdict: s.verdict, reason: s.reasons.join(' '), constraints: s.constraints }} />
                    ))}
                  </div>
                </div>
              )}

              {result.combinedConstraints.length > 0 && <ConstraintsPanel constraints={result.combinedConstraints} />}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
