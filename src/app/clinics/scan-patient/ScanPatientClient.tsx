'use client'

import { useState } from 'react'
import { useQuery }  from 'convex/react'
import { api }       from '../../../../convex/_generated/api'
import Image         from 'next/image'

const MRI_CONFIG = {
  safe:        { label: 'MR Safe',        colour: 'var(--ok)',  icon: '/mr-safe.svg' },
  conditional: { label: 'MR Conditional', colour: '#b45309',   icon: '/mr-conditional.svg' },
  unsafe:      { label: 'MR Unsafe',      colour: 'var(--err)', icon: '/mr-unsafe.svg' },
  unknown:     { label: 'MRI status unknown', colour: 'var(--muted)', icon: '/mr-conditional.svg' },
} as const

type MriKey = keyof typeof MRI_CONFIG

export default function ScanPatientClient() {
  // ── All hooks unconditionally at top ────────────────────────────────────────
  const [inputCode,  setInputCode]  = useState('')
  const [searchCode, setSearchCode] = useState<string | null>(null)

  const result = useQuery(
    api.patients.lookupByImplantId,
    searchCode ? { code: searchCode } : 'skip',
  )

  // ── Handlers ────────────────────────────────────────────────────────────────
  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const trimmed = inputCode.trim().toUpperCase()
    if (!trimmed) return
    setSearchCode(trimmed)
  }

  function handleClear() {
    setInputCode('')
    setSearchCode(null)
  }

  // ── Helpers ─────────────────────────────────────────────────────────────────
  function formatDob(dob?: string) {
    if (!dob) return '—'
    const [y, m, d] = dob.split('-')
    const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
    const mIdx = parseInt(m ?? '0', 10) - 1
    return `${d} ${months[mIdx] ?? ''} ${y}`
  }

  const mriKey: MriKey = (result && typeof result === 'object' && 'mriStatus' in result
    ? (result.mriStatus as MriKey)
    : 'unknown')
  const mriCfg = MRI_CONFIG[mriKey] ?? MRI_CONFIG.unknown

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div className="m-content">
      <div className="m-h">
        <div>
          <h2>Patient look-up</h2>
          <div className="sub">Enter a patient's Implant ID code to retrieve their record.</div>
        </div>
      </div>

      {/* Search form */}
      <form
        onSubmit={handleSubmit}
        style={{
          background: 'var(--bg2)',
          border: '1px solid var(--border)',
          borderRadius: 14,
          padding: '20px 24px',
          marginBottom: 24,
          display: 'flex',
          gap: 10,
          alignItems: 'flex-end',
          flexWrap: 'wrap',
        }}
      >
        <div className="field" style={{ flex: '1 1 220px', marginBottom: 0 }}>
          <label htmlFor="scan-input" style={{ fontFamily: 'var(--ff)', fontSize: 13, color: 'var(--muted)', marginBottom: 6, display: 'block' }}>
            Implant ID code
          </label>
          <input
            id="scan-input"
            className="input"
            type="text"
            placeholder="IID-XXXXXXXX"
            value={inputCode}
            onChange={e => setInputCode(e.target.value.toUpperCase())}
            autoComplete="off"
            spellCheck={false}
            style={{ fontFamily: 'var(--ff)', letterSpacing: '0.04em' }}
          />
        </div>
        <button
          type="submit"
          className="btn btn-s btn-lg"
          disabled={!inputCode.trim()}
          style={{ flexShrink: 0 }}
        >
          Look up
        </button>
        {searchCode && (
          <button
            type="button"
            className="btn btn-lg"
            onClick={handleClear}
            style={{ flexShrink: 0 }}
          >
            Clear
          </button>
        )}
      </form>

      {/* Loading state */}
      {searchCode && result === undefined && (
        <div style={{
          background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 14,
          padding: '40px 24px', textAlign: 'center',
          fontFamily: 'var(--ff)', fontSize: 15, color: 'var(--muted)',
        }}>
          Searching…
        </div>
      )}

      {/* Not found */}
      {searchCode && result === null && (
        <div style={{
          background: 'color-mix(in srgb,var(--err) 6%,transparent)',
          border: '1px solid color-mix(in srgb,var(--err) 25%,transparent)',
          borderRadius: 14,
          padding: '20px 24px',
        }}>
          <div style={{ fontFamily: 'var(--ff)', fontWeight: 700, fontSize: 15, color: 'var(--err)', marginBottom: 4 }}>
            No patient found
          </div>
          <div style={{ fontFamily: 'var(--ff)', fontSize: 13.5, color: 'var(--muted)' }}>
            No record matches <strong style={{ color: 'var(--text)' }}>{searchCode}</strong>. Check the code and try again.
          </div>
        </div>
      )}

      {/* Result card */}
      {result && typeof result === 'object' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

          {/* MRI status banner */}
          <div style={{
            background: `color-mix(in srgb,${mriCfg.colour} 10%,transparent)`,
            border: `1px solid color-mix(in srgb,${mriCfg.colour} 30%,transparent)`,
            borderRadius: 14,
            padding: '16px 20px',
            display: 'flex',
            alignItems: 'center',
            gap: 14,
          }}>
            <Image src={mriCfg.icon} alt={mriCfg.label} width={40} height={40} style={{ flexShrink: 0 }} />
            <div>
              <div style={{ fontFamily: 'var(--ff)', fontWeight: 800, fontSize: 18, color: mriCfg.colour, letterSpacing: '-0.01em' }}>
                {mriCfg.label}
              </div>
              <div style={{ fontFamily: 'var(--ff)', fontSize: 13, color: mriCfg.colour, opacity: 0.8, marginTop: 2 }}>
                Most restrictive status across all verified implants
              </div>
            </div>
          </div>

          {/* Unverified warning */}
          {result.verificationStatus !== 'active' && (
            <div style={{
              background: 'color-mix(in srgb,#b45309 8%,transparent)',
              border: '1px solid color-mix(in srgb,#b45309 28%,transparent)',
              borderRadius: 10,
              padding: '12px 16px',
              fontFamily: 'var(--ff)',
              fontSize: 13.5,
              color: '#b45309',
              fontWeight: 600,
            }}>
              Unverified — self-reported only. Data has not been independently confirmed by a clinician.
            </div>
          )}

          {/* Contrast allergy alert */}
          {result.contrastAllergy && (
            <div style={{
              background: 'color-mix(in srgb,var(--err) 8%,transparent)',
              border: '2px solid color-mix(in srgb,var(--err) 40%,transparent)',
              borderRadius: 10,
              padding: '14px 18px',
            }}>
              <div style={{ fontFamily: 'var(--ff)', fontWeight: 800, fontSize: 14.5, color: 'var(--err)', marginBottom: result.contrastAllergyNote ? 6 : 0 }}>
                CONTRAST ALLERGY — do NOT administer contrast agents
              </div>
              {result.contrastAllergyNote && (
                <div style={{ fontFamily: 'var(--ff)', fontSize: 13.5, color: 'var(--err)', opacity: 0.85 }}>
                  {result.contrastAllergyNote}
                </div>
              )}
            </div>
          )}

          {/* Patient info grid */}
          <div style={{
            background: 'var(--bg2)',
            border: '1px solid var(--border)',
            borderRadius: 14,
            padding: '20px 24px',
          }}>
            <div style={{ fontFamily: 'var(--ff)', fontWeight: 700, fontSize: 13, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 16 }}>
              Patient information
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '14px 24px' }}>
              <InfoRow label="Patient name"  value={`${result.firstName} ${result.lastName}`} />
              <InfoRow label="Implant ID"    value={result.implantIdCode} mono />
              <InfoRow label="Date of birth" value={formatDob(result.dob)} />
              <InfoRow
                label="Height / Weight"
                value={
                  result.heightCm || result.weightKg
                    ? [result.heightCm ? `${result.heightCm} cm` : null, result.weightKg ? `${result.weightKg} kg` : null].filter(Boolean).join(' / ')
                    : '—'
                }
              />
            </div>
          </div>

          {/* Devices */}
          <div style={{
            background: 'var(--bg2)',
            border: '1px solid var(--border)',
            borderRadius: 14,
            padding: '20px 24px',
          }}>
            <div style={{ fontFamily: 'var(--ff)', fontWeight: 700, fontSize: 13, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 16 }}>
              Implanted devices
            </div>

            {result.devices && result.devices.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {result.devices.map((d, i) => {
                  if (!d) return null
                  const dcfg = MRI_CONFIG[d.mriStatus as MriKey] ?? MRI_CONFIG.unknown
                  return (
                    <div key={i} style={{
                      display: 'flex', alignItems: 'center', gap: 14,
                      background: 'var(--bg)', border: '1px solid var(--border)',
                      borderRadius: 10, padding: '12px 16px',
                    }}>
                      <Image src={dcfg.icon} alt={dcfg.label} width={28} height={28} style={{ flexShrink: 0 }} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontFamily: 'var(--ff)', fontWeight: 600, fontSize: 14, color: 'var(--text)' }}>
                          {d.manufacturer} {d.model}
                        </div>
                        <div style={{ fontFamily: 'var(--fb)', fontSize: 12.5, color: 'var(--muted)', marginTop: 2 }}>
                          {d.deviceType}
                          {d.serialNumber ? ` · S/N ${d.serialNumber}` : ''}
                        </div>
                      </div>
                      <span style={{
                        fontFamily: 'var(--ff)', fontSize: 12, fontWeight: 700,
                        color: dcfg.colour,
                        background: `color-mix(in srgb,${dcfg.colour} 10%,transparent)`,
                        border: `1px solid color-mix(in srgb,${dcfg.colour} 25%,transparent)`,
                        borderRadius: 6, padding: '3px 9px', flexShrink: 0,
                      }}>
                        {dcfg.label}
                      </span>
                    </div>
                  )
                })}
              </div>
            ) : (
              <div style={{
                background: 'var(--bg)', border: '1px solid var(--border)',
                borderRadius: 10, padding: '16px', fontFamily: 'var(--ff)',
              }}>
                <div style={{ fontSize: 13.5, color: 'var(--muted)', marginBottom: result.selfReportedDevice ? 6 : 0 }}>
                  No verified device records on file.
                </div>
                {result.selfReportedDevice && (
                  <div style={{ fontSize: 13.5, color: 'var(--text)' }}>
                    Self-reported: <strong>{result.selfReportedDevice}</strong>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

// ── Small helper ─────────────────────────────────────────────────────────────
function InfoRow({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div>
      <div style={{ fontFamily: 'var(--ff)', fontSize: 11.5, fontWeight: 600, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>
        {label}
      </div>
      <div style={{
        fontFamily: mono ? 'monospace' : 'var(--ff)',
        fontSize: 14.5, fontWeight: 600, color: 'var(--text)',
        letterSpacing: mono ? '0.04em' : undefined,
      }}>
        {value || '—'}
      </div>
    </div>
  )
}
