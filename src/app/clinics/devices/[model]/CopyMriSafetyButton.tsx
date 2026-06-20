'use client'

import { useState } from 'react'

interface Props {
  deviceName: string
  modelNumbers: string[]
  mriClassification: string
  fieldStrength1t5: boolean
  fieldStrength3t: boolean
  fieldStrength7t: boolean
  fieldStrengthNotes?: string | null
  rfTransmitMode?: string | null
  rfReceiveCoil?: string | null
  scannerConfiguration?: string | null
  isocentreRestriction?: string | null
  scanRegionPermitted?: string | null
  orientationRestriction?: string | null
  boreContactRestriction?: string | null
  maxScanTimeMins?: number | null
  cooloffPeriodMins?: number | null
  scanRegionNotes?: string | null
  regionAMaxSarWb?: number | null
  regionAMaxSarHead?: number | null
  regionAMaxB1Rms?: number | null
  maxSlewRate?: number | null
  repRequired?: boolean | null
}

export default function CopyMriSafetyButton(props: Props) {
  const [copied, setCopied] = useState(false)

  function buildText(): string {
    const lines: string[] = []

    lines.push(`MRI Safety Information — ${props.deviceName}`)
    lines.push(`Model: ${props.modelNumbers.join(' / ')}`)
    lines.push(`Classification: ${props.mriClassification}`)
    lines.push('')

    const strengths: string[] = []
    if (props.fieldStrength1t5) strengths.push('1.5T')
    if (props.fieldStrength3t)  strengths.push('3T')
    if (props.fieldStrength7t)  strengths.push('7T')
    lines.push(`Approved field strengths: ${strengths.length ? strengths.join(', ') : 'None approved'}`)
    if (props.fieldStrengthNotes) lines.push(props.fieldStrengthNotes)
    lines.push('')

    lines.push('RF Conditions:')
    const rf: Array<[string, string | number | null | undefined]> = [
      ['Transmit mode',         props.rfTransmitMode],
      ['Receive coil',          props.rfReceiveCoil],
      ['Scanner configuration', props.scannerConfiguration],
      ['Isocentre restriction', props.isocentreRestriction],
      ['Permitted scan region', props.scanRegionPermitted],
      ['Orientation',           props.orientationRestriction],
      ['Bore contact',          props.boreContactRestriction],
      ['Max scan time',         props.maxScanTimeMins != null ? `${props.maxScanTimeMins} minutes` : null],
      ['Cooloff period',        props.cooloffPeriodMins != null ? `${props.cooloffPeriodMins} minutes` : null],
    ]
    rf.filter(([, v]) => v != null).forEach(([label, val]) => lines.push(`  ${label}: ${val}`))
    if (props.scanRegionNotes) {
      lines.push('')
      lines.push(`Note: ${props.scanRegionNotes}`)
    }
    lines.push('')

    lines.push('Technical Parameters:')
    if (props.regionAMaxSarWb   != null) lines.push(`  Whole body SAR limit: ${props.regionAMaxSarWb} W/kg`)
    if (props.regionAMaxSarHead != null) lines.push(`  Head SAR limit: ${props.regionAMaxSarHead} W/kg`)
    if (props.regionAMaxB1Rms   != null) lines.push(`  B1+rms: ${props.regionAMaxB1Rms} µT`)
    if (props.maxSlewRate       != null) lines.push(`  Max slew rate: ${props.maxSlewRate} T/m/s`)

    if (props.repRequired) {
      lines.push('')
      lines.push('⚠ Manufacturer representative must be present for MRI scan.')
    }

    lines.push('')
    lines.push('Source: Implant ID — portal.implantid.io')

    return lines.join('\n')
  }

  function handleCopy() {
    navigator.clipboard.writeText(buildText()).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  return (
    <button
      onClick={handleCopy}
      className="qa-model-copy"
      aria-label="Copy MRI safety information"
      title="Copy MRI safety info to clipboard"
    >
      <div className="qa-model-copy-label">MRI safety info</div>
      <div className="qa-model-copy-row">
        <span className="qa-model-copy-value">Copy all conditions</span>
        {copied ? (
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--ok)" strokeWidth="2.5" className="qa-model-copy-ic">
            <polyline points="20 6 9 17 4 12"/>
          </svg>
        ) : (
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="qa-model-copy-ic">
            <rect x="9" y="9" width="13" height="13" rx="2"/>
            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
          </svg>
        )}
      </div>
    </button>
  )
}
