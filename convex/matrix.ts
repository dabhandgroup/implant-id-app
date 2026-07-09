import { query }    from './_generated/server'
import { v }         from 'convex/values'
import { Doc, Id }   from './_generated/dataModel'

// ── Controlled vocab map ──────────────────────────────────────────────────────
// Maps source-verbatim coil descriptions from condition leaves to the shared
// transmit_coil_type controlled vocabulary used by siteCoils.coilType.

const COIL_VOCAB_MAP: Record<string, string> = {
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

const REGION_ISOCENTRE: Record<string, 'superior' | 'between' | 'inferior'> = {
  'Brain/Head':            'superior',
  'Neck/C-spine':          'between',    // at C7 — conservative: treat as in-zone
  'Chest/T-spine':         'between',    // T1–T12 includes T1–T8
  'Abdomen/L-spine':       'inferior',
  'Pelvis':                'inferior',
  'Knee/lower extremity':  'inferior',
}

// ── Type definitions ──────────────────────────────────────────────────────────

type GateRow = {
  gate:         string
  patientInput: string
  conditionReq: string
  result:       'PASS' | 'FAIL' | 'UNRESOLVED' | 'CHECK' | 'CONSTRAINT' | 'INFO'
}

type SystemResult = {
  label:               string
  verdict:             'PASS' | 'FAIL' | 'UNRESOLVED'
  deviceName:          string
  mriClassification:   string
  gates:               GateRow[]
  constraints:         string[]
  reasons:             string[]
  resolvedConditionIds: string[]
}

type SystemInput = {
  label:           string
  device:          Doc<'devices'>
  conditions:      Doc<'deviceConditions'>[]
  leadDevices:     Doc<'devices'>[]
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

function makeFailResult(label: string, device: Doc<'devices'>, reason: string, gates: GateRow[]): SystemResult {
  return {
    label,
    verdict:             'FAIL',
    deviceName:          device.deviceName ?? device.model,
    mriClassification:   device.mriClassification ?? device.mriStatus,
    gates,
    constraints:         [],
    reasons:             [reason],
    resolvedConditionIds: [],
  }
}

function makeUnresolvedResult(label: string, device: Doc<'devices'>, reason: string, gates: GateRow[]): SystemResult {
  return {
    label,
    verdict:             'UNRESOLVED',
    deviceName:          device.deviceName ?? device.model,
    mriClassification:   device.mriClassification ?? device.mriStatus,
    gates,
    constraints:         [],
    reasons:             [reason],
    resolvedConditionIds: [],
  }
}

// ── Gate walk ─────────────────────────────────────────────────────────────────

function resolveSystem(
  data:       SystemInput,
  scanner:    Doc<'scanners'>,
  coil:       Doc<'siteCoils'> | null,
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
      deviceName:          device.deviceName ?? device.model,
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
      const desc = (c.exclusionZoneDescription ?? '').toLowerCase()
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
    deviceName:          device.deviceName ?? device.model,
    mriClassification:   cls || (device.mriStatus === 'conditional' ? 'MR Conditional' : 'Unknown'),
    gates,
    constraints,
    reasons,
    resolvedConditionIds: candidates.map((c) => c._id as string),
  }
}

// ── Main resolver query ───────────────────────────────────────────────────────

export const resolveMatrix = query({
  args: {
    mode:                  v.union(v.literal('registry'), v.literal('manual')),
    // Registry mode
    patientId:             v.optional(v.id('patients')),
    // Manual mode
    manualDeviceId:        v.optional(v.id('devices')),
    manualLeadIds:         v.optional(v.array(v.id('devices'))),
    manualImplantLocation: v.optional(v.string()),
    manualIntegrityState:  v.optional(v.string()),
    // Hardware (both modes) — either from DB or manual entry
    scannerId:             v.optional(v.id('scanners')),
    coilId:                v.optional(v.id('siteCoils')),
    // Manual scanner entry (used when clinic has no scanner in DB)
    manualFieldStrength:   v.optional(v.string()),
    manualScannerType:     v.optional(v.string()),
    manualSpatialGradient: v.optional(v.float64()),
    manualSlewRate:        v.optional(v.float64()),
    // Manual coil entry
    manualCoilType:        v.optional(v.string()),
    bodyRegion:            v.string(),
  },
  handler: async (ctx, args) => {
    // 1. Fetch scanner from DB, or build from manual entry
    const dbScanner = args.scannerId ? await ctx.db.get(args.scannerId) : null
    if (!dbScanner && !args.manualFieldStrength) throw new Error('Either scannerId or manualFieldStrength is required')
    const scanner = (dbScanner ?? {
      fieldStrength:       args.manualFieldStrength!,
      maxSpatialGradient:  args.manualSpatialGradient,
      maxSlewRate:         args.manualSlewRate,
      scannerType:         args.manualScannerType ?? 'Closed-bore',
      fieldOrientation:    undefined,
      tableLimitKg:        undefined,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    }) as any

    // 2. Fetch coil from DB, or build from manual coil type
    const dbCoil = args.coilId ? await ctx.db.get(args.coilId) : null
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const coil = (dbCoil ?? (args.manualCoilType ? { coilType: args.manualCoilType, coilDisplayName: args.manualCoilType } : null)) as any

    const preflightWarnings: string[] = []
    const systems: SystemInput[] = []

    // 3. Assemble systems
    if (args.mode === 'registry') {
      if (!args.patientId) throw new Error('patientId required in registry mode')

      const patient = await ctx.db.get(args.patientId)

      // Weight pre-check
      if (patient?.weightKg && scanner.tableLimitKg && patient.weightKg > scanner.tableLimitKg) {
        preflightWarnings.push(`Patient weight ${patient.weightKg} kg may exceed this scanner's rated table limit of ${scanner.tableLimitKg} kg. Confirm with site engineering before positioning.`)
      }

      const patientDeviceRows = await ctx.db
        .query('patientDevices')
        .withIndex('by_patient', (q) => q.eq('patientId', args.patientId!))
        .collect()
      const active = patientDeviceRows.filter((pd) => pd.status === 'active')

      // Group by systemGroupId (or individual device if no group)
      const systemMap = new Map<string, typeof active>()
      for (const pd of active) {
        const key = pd.systemGroupId ?? pd._id
        const existing = systemMap.get(key) ?? []
        existing.push(pd)
        systemMap.set(key, existing)
      }

      for (const [, group] of systemMap) {
        // Fetch device records for this group
        const deviceDocs = (await Promise.all(group.map((pd) => ctx.db.get(pd.deviceId)))).filter(Boolean) as Doc<'devices'>[]

        // Primary device: prefer Generator/System role, fallback to first
        const primary = group.find((pd) => {
          const dev = deviceDocs.find((d) => d._id === pd.deviceId)
          return dev?.componentRole && ['Generator', 'System', 'IPG'].includes(dev.componentRole)
        }) ?? group[0]

        const primaryDevice = deviceDocs.find((d) => d._id === primary.deviceId)
        if (!primaryDevice) continue

        // Post-implant wait check
        const postWaitWeeks = (primaryDevice as unknown as { postImplantWaitWeeks?: number }).postImplantWaitWeeks
        const implantDate   = (primary as unknown as { implantDate?: string }).implantDate
        if (postWaitWeeks && implantDate) {
          const implantMs  = new Date(implantDate).getTime()
          const nowMs      = Date.now()
          const weeksSince = (nowMs - implantMs) / (7 * 24 * 60 * 60 * 1000)
          if (weeksSince < postWaitWeeks) {
            const daysLeft = Math.ceil((postWaitWeeks - weeksSince) * 7)
            preflightWarnings.push(
              `${primaryDevice.deviceName ?? primaryDevice.model}: manufacturer requires ${postWaitWeeks} weeks post-implant before MRI. Approximately ${daysLeft} day${daysLeft !== 1 ? 's' : ''} remaining.`
            )
          }
        }

        // Leads = all group members that are not the primary
        const leadRows = group.filter((pd) => pd._id !== primary._id)
        const leadDevices = (await Promise.all(leadRows.map((pd) => ctx.db.get(pd.deviceId)))).filter(Boolean) as Doc<'devices'>[]

        // Fetch conditions for the primary device
        const conditions = await ctx.db
          .query('deviceConditions')
          .withIndex('by_parent', (q) => q.eq('parentId', primaryDevice._id as string))
          .collect()

        const systemLabel = primaryDevice.deviceName ?? primaryDevice.model

        systems.push({
          label:           systemLabel,
          device:          primaryDevice,
          conditions,
          leadDevices,
          integrityState:  primary.deviceIntegrityState ?? 'Not Stated',
          implantLocation: primary.implantLocation,
        })
      }
    } else {
      // Manual mode — single device (+ optional leads)
      if (!args.manualDeviceId) throw new Error('manualDeviceId required in manual mode')

      const device = await ctx.db.get(args.manualDeviceId)
      if (!device) throw new Error('Device not found')

      const conditions = await ctx.db
        .query('deviceConditions')
        .withIndex('by_parent', (q) => q.eq('parentId', args.manualDeviceId as string))
        .collect()

      const leadDevices = args.manualLeadIds
        ? ((await Promise.all(args.manualLeadIds.map((id) => ctx.db.get(id)))).filter(Boolean) as Doc<'devices'>[])
        : []

      systems.push({
        label:           device.deviceName ?? device.model,
        device,
        conditions,
        leadDevices,
        integrityState:  args.manualIntegrityState ?? 'Not Stated',
        implantLocation: args.manualImplantLocation,
      })
    }

    // 4. Resolve each system
    const results = systems.map((s) => resolveSystem(s, scanner as Doc<'scanners'>, coil as Doc<'siteCoils'> | null, args.bodyRegion))

    // 5. Combine verdicts — most restrictive wins
    const verdict: 'PASS' | 'FAIL' | 'UNRESOLVED' =
      results.some((r) => r.verdict === 'FAIL')       ? 'FAIL' :
      results.some((r) => r.verdict === 'UNRESOLVED') ? 'UNRESOLVED' :
      'PASS'

    // Combine and deduplicate constraints across all systems
    const combinedConstraints = [...new Set(results.flatMap((r) => r.constraints))]

    return {
      verdict,
      systems:             results,
      combinedConstraints,
      weightAlert: preflightWarnings.length > 0 ? preflightWarnings.join('\n') : null,
    }
  },
})
