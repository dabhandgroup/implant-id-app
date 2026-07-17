// ── MRI Matrix — pure gate-walk resolver ──────────────────────────────────────
// Framework-agnostic. No ctx.db calls, no Convex imports. Used by both the live
// Convex resolver (convex/matrix.ts, real device/scanner data) and the
// standalone MVP matrix (src/app/clinics/matrix/, hardcoded dataset) so the
// safety logic itself is identical in both places — never duplicate this gate
// walk, only the data-assembly layer around it differs.
//
// Closed-world principle: unknown/missing data defaults to FAIL, never PASS.
// This is a non-negotiable clinical requirement — see project CLAUDE.md.

// ── Controlled vocab map ──────────────────────────────────────────────────────
// Maps source-verbatim coil descriptions from condition leaves to the shared
// transmit_coil_type controlled vocabulary used by siteCoils.coilType.

export const COIL_VOCAB_MAP: Record<string, string> = {
  // Body / whole-body transmit
  'Whole Body + any receive':       'Body transmit/receive',
  'Whole body':                     'Body transmit/receive',
  'Body + any receive':             'Body transmit/receive',
  'Body transmit + any receive':    'Body transmit/receive',
  'Body transmit/receive':          'Body transmit/receive',
  'Body transmit coil':             'Body transmit coil',
  'Body transmit only':             'Body transmit coil',
  // Head transmit
  'Head transmit/receive':          'Head transmit/receive',
  'Head coil':                      'Head transmit/receive',
  'Head only':                      'Head transmit/receive',
  'Head transmit + any receive':    'Head transmit/receive',
  'Head transmit coil':             'Head transmit coil',
  'Head transmit only':             'Head transmit coil',
  // Lower extremity
  'Lower extremity transmit/receive': 'Lower extremity transmit/receive',
  'Lower extremity':                'Lower extremity transmit/receive',
  // Local transmit
  'Local transmit coil':            'Local transmit coil',
  'Local transmit':                 'Local transmit coil',
  // Receive-only coils: treated as Body transmit context (no additional restriction)
  'Receive only':                   'Body transmit/receive',
  'Any receive':                    'Body transmit/receive',
}

// ── Body region → isocentre position mapping ──────────────────────────────────
// Used for Gate 8 — exclusion zone checking.
// 'superior' = above C7, 'between' = C7 to T8 level, 'inferior' = below T8

export const REGION_ISOCENTRE: Record<string, 'superior' | 'between' | 'inferior'> = {
  'Brain/Head':            'superior',
  'Neck/C-spine':          'between',    // at C7 — conservative: treat as in-zone
  'Chest/T-spine':         'between',    // T1–T12 includes T1–T8
  'Abdomen/L-spine':       'inferior',
  'Pelvis':                'inferior',
  'Knee/lower extremity':  'inferior',
}

// ── Type definitions ──────────────────────────────────────────────────────────
// Structural (not Convex Doc<>-based) so the standalone hardcoded-data matrix
// can build plain objects without needing real Convex document IDs.

export type MatrixDevice = {
  _id?: string
  deviceName?: string
  model?: string
  mriClassification?: string
  mriStatus?: string
  componentRole?: string
  postImplantWaitWeeks?: number
}

export type MatrixCondition = {
  _id?: string
  eligibilityTier?: string
  contextStatus?: string
  deviceIntegrityState?: string
  tierPrecondition?: string
  fieldStrength?: string
  maxSpatialGradientCond?: number
  maxSlewRateCond?: number
  boreTypeRequired?: string
  fieldOrientationRequired?: string
  transmitCoilType?: string
  implantLocationCond?: string
  qualifierDeviceIds?: string[]
  operatingMode?: string
  exclusionZoneApplies?: boolean
  exclusionZoneDescription?: string
  maxB1RmsVal?: number
  maxB1Rms?: string
  maxSarWhole?: number
  maxSarHead?: number
  maxScanTimeMins?: number
  scanTimeWindowMins?: number
  cooloffPeriodMins?: number
  patientPreconditions?: string
  requiresVisualReview?: boolean
}

export type MatrixScanner = {
  fieldStrength: string
  scannerType: string
  maxSpatialGradient?: number
  maxSlewRate?: number
  fieldOrientation?: string
  tableLimitKg?: number
}

export type MatrixCoil = {
  coilType: string
  coilDisplayName: string
} | null

export type GateRow = {
  gate:         string
  patientInput: string
  conditionReq: string
  result:       'PASS' | 'FAIL' | 'UNRESOLVED' | 'CHECK' | 'CONSTRAINT' | 'INFO'
}

export type SystemResult = {
  label:               string
  verdict:             'PASS' | 'FAIL' | 'UNRESOLVED'
  deviceName:          string
  mriClassification:   string
  gates:               GateRow[]
  constraints:         string[]
  reasons:             string[]
  resolvedConditionIds: string[]
}

export type SystemInput = {
  label:           string
  device:          MatrixDevice
  conditions:      MatrixCondition[]
  leadDevices:      MatrixDevice[]
  integrityState:  string
  implantLocation: string | undefined
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function normalizeCoil(raw: string | undefined | null): string {
  if (!raw) return 'Body transmit/receive'
  return COIL_VOCAB_MAP[raw] ?? raw
}

function scannerBoreType(scannerType: string): string {
  const t = scannerType.toLowerCase()
  if (t.includes('closed')) return 'Closed-cylindrical'
  if (t.includes('open') || t.includes('standing') || t.includes('upright')) return 'Open'
  return 'Not Stated'
}

function makeFailResult(label: string, device: MatrixDevice, reason: string, gates: GateRow[]): SystemResult {
  return {
    label,
    verdict:             'FAIL',
    deviceName:          device.deviceName ?? device.model ?? '(no name)',
    mriClassification:   device.mriClassification ?? device.mriStatus ?? 'Unknown',
    gates,
    constraints:         [],
    reasons:             [reason],
    resolvedConditionIds: [],
  }
}

function makeUnresolvedResult(label: string, device: MatrixDevice, reason: string, gates: GateRow[]): SystemResult {
  return {
    label,
    verdict:             'UNRESOLVED',
    deviceName:          device.deviceName ?? device.model ?? '(no name)',
    mriClassification:   device.mriClassification ?? device.mriStatus ?? 'Unknown',
    gates,
    constraints:         [],
    reasons:             [reason],
    resolvedConditionIds: [],
  }
}

// ── Gate walk ─────────────────────────────────────────────────────────────────

export function resolveSystem(
  data:       SystemInput,
  scanner:    MatrixScanner,
  coil:       MatrixCoil,
  bodyRegion: string,
): SystemResult {
  const { label, device, conditions, leadDevices, integrityState, implantLocation } = data
  const gates: GateRow[] = []
  const constraints: string[] = []
  const reasons: string[] = []

  // ── MR Unsafe hard stop ──────────────────────────────────────────────────
  // Never run the gate walk for MR Unsafe — it is never overridable.
  const cls = device.mriClassification ?? ''
  if (cls === 'MR Unsafe' || device.mriStatus === 'unsafe') {
    gates.push({
      gate:         'Classification',
      patientInput: 'Device: ' + (device.deviceName ?? device.model),
      conditionReq: 'MR Unsafe devices cannot be scanned',
      result:       'FAIL',
    })
    return makeFailResult(label, device, 'MR Unsafe — scanning is absolutely contraindicated.', gates)
  }

  // MR Safe short-circuit — no conditions needed
  if (cls === 'MR Safe' || device.mriStatus === 'safe') {
    gates.push({
      gate:         'Classification',
      patientInput: 'Device: ' + (device.deviceName ?? device.model),
      conditionReq: 'MR Safe — no conditional restrictions',
      result:       'PASS',
    })
    return {
      label,
      verdict:             'PASS',
      deviceName:          device.deviceName ?? device.model ?? '(no name)',
      mriClassification:   cls || 'MR Safe',
      gates,
      constraints:         ['Confirm current manufacturer documentation before proceeding'],
      reasons:             ['Device is MR Safe — no field-strength or coil restrictions apply'],
      resolvedConditionIds: [],
    }
  }

  // ── Gate 0 — Closed world ─────────────────────────────────────────────────
  // No condition records = cannot resolve.
  if (conditions.length === 0) {
    gates.push({
      gate:         '0. Closed world',
      patientInput: 'Device: ' + (device.deviceName ?? device.model),
      conditionReq: 'Condition records must exist in database',
      result:       'FAIL',
    })
    return makeFailResult(
      label, device,
      'No condition records found. Closed-world principle: absence of a record = FAIL. Consult current manufacturer documentation.',
      gates,
    )
  }

  let candidates = [...conditions]

  // ── Gate 1 — Global prohibition / eligibility ──────────────────────────────
  const globalProhibitions = conditions.filter(
    (c) => c.eligibilityTier === 'Not Eligible' || c.contextStatus === 'Not Permitted'
  )
  // If any prohibition applies to this integrity state (or applies globally)
  const applicableProhibitions = globalProhibitions.filter(
    (c) => !c.deviceIntegrityState || c.deviceIntegrityState === integrityState
  )
  if (applicableProhibitions.length > 0) {
    gates.push({
      gate:         '1. Eligibility',
      patientInput: `Integrity: ${integrityState}`,
      conditionReq: 'Not eligible — ' + (applicableProhibitions[0].tierPrecondition ?? 'device not eligible for MRI'),
      result:       'FAIL',
    })
    return makeFailResult(label, device, `Device is not eligible for MRI: ${applicableProhibitions[0].tierPrecondition ?? 'see manufacturer documentation'}`, gates)
  }

  // Remove prohibition leaves from candidates
  candidates = candidates.filter(
    (c) => c.eligibilityTier !== 'Not Eligible' && c.contextStatus !== 'Not Permitted'
  )

  // Filter by integrity state match (where specified on condition)
  const integrityFiltered = candidates.filter(
    (c) => !c.deviceIntegrityState || c.deviceIntegrityState === integrityState || c.deviceIntegrityState === 'Not Stated'
  )
  if (integrityFiltered.length > 0) {
    candidates = integrityFiltered
  }

  gates.push({
    gate:         '1. Eligibility',
    patientInput: `Integrity: ${integrityState}`,
    conditionReq: `Tier precondition met (${candidates[0]?.eligibilityTier ?? 'Active'})`,
    result:       'PASS',
  })

  // ── Gate 2 — Field strength ────────────────────────────────────────────────
  const byFs = candidates.filter(
    (c) => !c.fieldStrength || c.fieldStrength === scanner.fieldStrength
  )
  if (byFs.length === 0) {
    gates.push({
      gate:         '2. Field strength',
      patientInput: `Scanner: ${scanner.fieldStrength}`,
      conditionReq: 'No conditions at this field strength',
      result:       'FAIL',
    })
    return makeFailResult(label, device, `No conditions available at ${scanner.fieldStrength}. Device may not be tested at this field strength.`, gates)
  }
  candidates = byFs
  gates.push({
    gate:         '2. Field strength',
    patientInput: `Scanner: ${scanner.fieldStrength}`,
    conditionReq: `${candidates.length} condition(s) found at ${scanner.fieldStrength}`,
    result:       'PASS',
  })

  // ── Gate 3 — Spatial gradient ──────────────────────────────────────────────
  // Not a hard fail — adds a constraint if scanner exceeds the condition limit.
  const spatialGradConds = candidates.filter((c) => c.maxSpatialGradientCond !== undefined && c.maxSpatialGradientCond !== null)
  if (spatialGradConds.length > 0 && scanner.maxSpatialGradient !== undefined) {
    const minLimit = Math.min(...spatialGradConds.map((c) => c.maxSpatialGradientCond!))
    if (scanner.maxSpatialGradient > minLimit) {
      constraints.push(`Spatial gradient: confirm positional gradient ≤ ${minLimit} T/m at scan isocentre (scanner rated to ${scanner.maxSpatialGradient} T/m)`)
      gates.push({
        gate:         '3. Spatial gradient',
        patientInput: `Scanner max: ${scanner.maxSpatialGradient} T/m`,
        conditionReq: `Condition limit: ≤${minLimit} T/m`,
        result:       'CHECK',
      })
    } else {
      gates.push({
        gate:         '3. Spatial gradient',
        patientInput: `Scanner max: ${scanner.maxSpatialGradient} T/m`,
        conditionReq: `Condition limit: ≤${minLimit} T/m`,
        result:       'PASS',
      })
    }
  }

  // ── Gate 4 — Slew rate ────────────────────────────────────────────────────
  const slewConds = candidates.filter((c) => c.maxSlewRateCond !== undefined && c.maxSlewRateCond !== null)
  if (slewConds.length > 0 && scanner.maxSlewRate !== undefined) {
    const minSlew = Math.min(...slewConds.map((c) => c.maxSlewRateCond!))
    if (scanner.maxSlewRate > minSlew) {
      constraints.push(`Slew rate: confirm effective slew rate ≤ ${minSlew} T/m/s (scanner rated to ${scanner.maxSlewRate} T/m/s)`)
      gates.push({
        gate:         '4. Slew rate',
        patientInput: `Scanner max: ${scanner.maxSlewRate} T/m/s`,
        conditionReq: `Condition limit: ≤${minSlew} T/m/s`,
        result:       'CHECK',
      })
    } else {
      gates.push({
        gate:         '4. Slew rate',
        patientInput: `Scanner max: ${scanner.maxSlewRate} T/m/s`,
        conditionReq: `Condition limit: ≤${minSlew} T/m/s`,
        result:       'PASS',
      })
    }
  }

  // ── Gate 5 — Bore type + field orientation ─────────────────────────────────
  const scannerBore = scannerBoreType(scanner.scannerType)
  const byBore = candidates.filter(
    (c) => !c.boreTypeRequired || c.boreTypeRequired === 'Not Stated' || c.boreTypeRequired === scannerBore
  )
  if (byBore.length === 0) {
    gates.push({
      gate:         '5. Bore type',
      patientInput: `Scanner: ${scannerBore}`,
      conditionReq: `Required: ${candidates[0]?.boreTypeRequired ?? 'specific bore type'}`,
      result:       'FAIL',
    })
    return makeFailResult(label, device, `Scanner bore type (${scannerBore}) does not meet condition requirements.`, gates)
  }
  candidates = byBore

  const scannerOrientation = scanner.fieldOrientation ?? (scannerBore === 'Closed-cylindrical' ? 'Horizontal' : 'Not Stated')
  const byOrientation = candidates.filter(
    (c) => !c.fieldOrientationRequired || c.fieldOrientationRequired === 'Not Stated' || c.fieldOrientationRequired === scannerOrientation
  )
  if (byOrientation.length === 0) {
    gates.push({
      gate:         '5. Field orientation',
      patientInput: `Scanner: ${scannerOrientation}`,
      conditionReq: `Required: ${candidates[0]?.fieldOrientationRequired ?? 'specific orientation'}`,
      result:       'FAIL',
    })
    return makeFailResult(label, device, `Scanner field orientation (${scannerOrientation}) does not meet condition requirements.`, gates)
  }
  candidates = byOrientation
  gates.push({
    gate:         '5. Bore / orientation',
    patientInput: `${scannerBore} / ${scannerOrientation}`,
    conditionReq: 'Bore and orientation match',
    result:       'PASS',
  })

  // ── Gate 6 — Transmit coil ────────────────────────────────────────────────
  const coilVocab = coil ? normalizeCoil(coil.coilType) : 'Body transmit/receive'
  const coilLabel = coil ? coil.coilDisplayName : 'Body transmit (assumed)'

  const byCoil = candidates.filter((c) => {
    if (!c.transmitCoilType || c.transmitCoilType === 'Not Stated') return true
    return normalizeCoil(c.transmitCoilType) === coilVocab
  })

  if (byCoil.length === 0) {
    gates.push({
      gate:         '6. Transmit coil',
      patientInput: coilLabel,
      conditionReq: 'No conditions for this coil type',
      result:       'FAIL',
    })
    return makeFailResult(label, device, `Coil type "${coilVocab}" not covered by any condition. Check manufacturer documentation for coil restrictions.`, gates)
  }
  candidates = byCoil
  gates.push({
    gate:         '6. Transmit coil',
    patientInput: `${coilLabel} (${coilVocab})`,
    conditionReq: `${candidates.length} condition(s) match`,
    result:       'PASS',
  })

  // ── Gate 6b — Implant location ────────────────────────────────────────────
  const locationScopedConds = candidates.filter((c) => !!c.implantLocationCond)
  if (locationScopedConds.length > 0) {
    if (!implantLocation) {
      gates.push({
        gate:         '6b. Implant location',
        patientInput: 'Location: not recorded',
        conditionReq: 'Location-specific conditions exist — location required',
        result:       'UNRESOLVED',
      })
      return makeUnresolvedResult(label, device, 'Implant location not recorded. Record the implant location to resolve this condition set.', gates)
    }
    const byLocation = candidates.filter(
      (c) => !c.implantLocationCond || c.implantLocationCond === implantLocation
    )
    if (byLocation.length === 0) {
      gates.push({
        gate:         '6b. Implant location',
        patientInput: `Location: ${implantLocation}`,
        conditionReq: 'No conditions for this implant location',
        result:       'FAIL',
      })
      return makeFailResult(label, device, `No conditions found for implant location "${implantLocation}". Consult manufacturer documentation.`, gates)
    }
    candidates = byLocation
    gates.push({
      gate:         '6b. Implant location',
      patientInput: `Location: ${implantLocation}`,
      conditionReq: `${candidates.length} condition(s) match`,
      result:       'PASS',
    })
  }

  // ── Gate 6c — Lead device scope ───────────────────────────────────────────
  const leadScopedConds = candidates.filter(
    (c) => c.qualifierDeviceIds && c.qualifierDeviceIds.length > 0
  )
  if (leadScopedConds.length > 0 && leadDevices.length === 0) {
    gates.push({
      gate:         '6c. Lead scope',
      patientInput: 'Lead devices: unknown',
      conditionReq: 'Specific lead device IDs required',
      result:       'UNRESOLVED',
    })
    return makeUnresolvedResult(label, device, 'Conditions are lead-specific but no lead device records are present. Add the exact lead models to resolve.', gates)
  }

  if (leadScopedConds.length > 0) {
    const leadIds = leadDevices.map((d) => d._id as string)
    const byLead = candidates.filter((c) => {
      if (!c.qualifierDeviceIds || c.qualifierDeviceIds.length === 0) return true
      return c.qualifierDeviceIds.every((qid) => leadIds.includes(qid))
    })
    if (byLead.length === 0) {
      gates.push({
        gate:         '6c. Lead scope',
        patientInput: `Leads: ${leadDevices.map((d) => d.model).join(', ')}`,
        conditionReq: 'No conditions match this exact lead combination',
        result:       'FAIL',
      })
      return makeFailResult(label, device, 'No conditions found for this exact generator + lead combination. Consult manufacturer documentation.', gates)
    }
    candidates = byLead
    gates.push({
      gate:         '6c. Lead scope',
      patientInput: `Leads: ${leadDevices.map((d) => d.model).join(', ')}`,
      conditionReq: `${candidates.length} condition(s) match`,
      result:       'PASS',
    })
  }

  // ── Gate 7 — Operating mode ───────────────────────────────────────────────
  const modes = [...new Set(candidates.flatMap((c) => c.operatingMode ? [c.operatingMode] : []))]
  if (modes.length > 0) {
    const modeStr = modes.join(' / ')
    constraints.push(`Operating mode: ${modeStr}`)
    gates.push({
      gate:         '7. Operating mode',
      patientInput: 'Per condition leaf',
      conditionReq: modeStr,
      result:       'CONSTRAINT',
    })
  }

  // ── Gate 8 — Exclusion zone / isocentre ──────────────────────────────────
  const zoneConds = candidates.filter((c) => c.exclusionZoneApplies)
  if (zoneConds.length > 0) {
    const isoPosition = REGION_ISOCENTRE[bodyRegion] ?? 'between' // conservative default
    const blocked = zoneConds.filter((c) => {
      // If the condition excludes C7–T8 region and scanner position is 'between' → FAIL
      if (isoPosition === 'between') return true
      // Superior to C7 is always outside the DBS exclusion zone
      if (isoPosition === 'superior') return false
      // Inferior to T8 is also outside the DBS exclusion zone
      if (isoPosition === 'inferior') return false
      return false
    })

    if (blocked.length > 0) {
      const zoneDesc = zoneConds[0].exclusionZoneDescription ?? 'isocentre restriction applies'
      gates.push({
        gate:         '8. Exclusion zone',
        patientInput: `Body region: ${bodyRegion}`,
        conditionReq: zoneDesc,
        result:       'FAIL',
      })
      return makeFailResult(label, device, `Isocentre exclusion zone violation: "${zoneDesc}". Requested body region (${bodyRegion}) falls within the restricted zone.`, gates)
    }

    const zoneDesc = zoneConds[0].exclusionZoneDescription ?? 'exclusion zone noted'
    constraints.push(`Isocentre: ${zoneDesc}`)
    gates.push({
      gate:         '8. Exclusion zone',
      patientInput: `Body region: ${bodyRegion} (${isoPosition} of C7)`,
      conditionReq: zoneDesc,
      result:       'PASS',
    })
  }

  // ── Gate 9 — RF limits ────────────────────────────────────────────────────
  const b1Vals = candidates.filter((c) => c.maxB1RmsVal !== undefined && c.maxB1RmsVal !== null)
  if (b1Vals.length > 0) {
    const minB1 = Math.min(...b1Vals.map((c) => c.maxB1RmsVal!))
    constraints.push(`B1+RMS ≤ ${minB1} µT`)
    gates.push({
      gate:         '9. RF — B1+RMS',
      patientInput: 'Per condition leaf',
      conditionReq: `B1+RMS ≤ ${minB1} µT`,
      result:       'CONSTRAINT',
    })
  } else {
    const sarWbVals = candidates.filter((c) => c.maxSarWhole !== undefined && c.maxSarWhole !== null)
    if (sarWbVals.length > 0) {
      const minSar = Math.min(...sarWbVals.map((c) => c.maxSarWhole!))
      constraints.push(`Whole-body SAR ≤ ${minSar} W/kg`)
      gates.push({
        gate:         '9. RF — SAR',
        patientInput: 'Per condition leaf',
        conditionReq: `WB SAR ≤ ${minSar} W/kg`,
        result:       'CONSTRAINT',
      })
    }
    const sarHeadVals = candidates.filter((c) => c.maxSarHead !== undefined && c.maxSarHead !== null)
    if (sarHeadVals.length > 0) {
      const minHead = Math.min(...sarHeadVals.map((c) => c.maxSarHead!))
      constraints.push(`Head SAR ≤ ${minHead} W/kg`)
    }
  }

  // Fallback to string B1+RMS if no numeric value
  if (b1Vals.length === 0 && candidates.some((c) => c.maxB1Rms)) {
    const b1Strs = [...new Set(candidates.map((c) => c.maxB1Rms).filter(Boolean))]
    constraints.push(`B1+RMS limit: ${b1Strs.join(' / ')}`)
  }

  // ── Gate 10 — Time / thermal ──────────────────────────────────────────────
  const timeConds = candidates.filter((c) => c.maxScanTimeMins !== undefined && c.maxScanTimeMins !== null)
  if (timeConds.length > 0) {
    const minTime = Math.min(...timeConds.map((c) => c.maxScanTimeMins!))
    const windowMins = timeConds[0].scanTimeWindowMins
    const cooloff = timeConds[0].cooloffPeriodMins

    let timePart = `Maximum scan time: ${minTime} min`
    if (windowMins) timePart += ` per ${windowMins} min window`
    if (cooloff) timePart += ` — ${cooloff} min cooloff required between sessions`
    constraints.push(timePart)

    gates.push({
      gate:         '10. Time / thermal',
      patientInput: 'Per condition leaf',
      conditionReq: timePart,
      result:       'CONSTRAINT',
    })
  }

  // Patient preconditions
  const precondStrs = [...new Set(candidates.flatMap((c) => c.patientPreconditions ? [c.patientPreconditions] : []))]
  if (precondStrs.length > 0) {
    precondStrs.forEach((p) => constraints.push(`Precondition: ${p}`))
  }

  // Visual review required
  if (candidates.some((c) => c.requiresVisualReview)) {
    constraints.push('Diagram review required: consult manufacturer positioning diagram before scan')
    gates.push({
      gate:         'Visual review',
      patientInput: 'Per condition leaf',
      conditionReq: 'Positioning diagram must be reviewed',
      result:       'CHECK',
    })
  }

  // ── PASS ──────────────────────────────────────────────────────────────────
  reasons.push('All gates passed — scan permitted subject to constraints above')

  return {
    label,
    verdict:             'PASS',
    deviceName:          device.deviceName ?? device.model ?? '(no name)',
    mriClassification:   cls || (device.mriStatus === 'conditional' ? 'MR Conditional' : 'Unknown'),
    gates,
    constraints,
    reasons,
    resolvedConditionIds: candidates.map((c) => c._id as string),
  }
}

// ── Verdict combination ───────────────────────────────────────────────────────
// Shared by both the Convex query and the standalone resolver — most
// restrictive verdict across all systems wins.

export function combineVerdicts(results: SystemResult[]): 'PASS' | 'FAIL' | 'UNRESOLVED' {
  if (results.some((r) => r.verdict === 'FAIL')) return 'FAIL'
  if (results.some((r) => r.verdict === 'UNRESOLVED')) return 'UNRESOLVED'
  return 'PASS'
}
