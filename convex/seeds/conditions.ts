import { mutation } from '../_generated/server'
import { Id }        from '../_generated/dataModel'

// Run with:  npx convex run seeds/conditions:seedPrototypeConditions
//
// Seeds the 14 condition leaves from ImplantID_Matrix_Prototype_v1.html
// covering three test devices:
//   A-DBS-0001  Medtronic Percept PC DBS System
//   A-VNS-0001  LivaNova VNS Therapy Model 105
//   A-CIED-0001 Medtronic Azure DR MRI (pacemaker)
//
// The seed is idempotent: devices are looked up by manufacturer + model;
// conditions are checked before insertion. Run repeatedly without side effects.

// ── Prototype leaf data (directly from LEAVES constant in the prototype) ───────

const PROTOTYPE_DEVICES = [
  {
    key:              'A-DBS-0001',
    manufacturer:     'Medtronic',
    model:            'Percept PC DBS System',
    deviceName:       'Medtronic Percept PC DBS System',
    deviceType:       'DBS System',
    classification:   'active' as const,
    mriStatus:        'conditional' as const,
    mriClassification: 'MR Conditional',
    deviceCategory:   'Neuromodulation',
    componentRole:    'System',
    prescanProgrammingRequired: 'TRUE',
    deviceRepresentativeRequired: 'TRUE',
    verified:         false,
  },
  {
    key:              'A-VNS-0001',
    manufacturer:     'LivaNova',
    model:            'VNS Therapy System Model 105',
    deviceName:       'LivaNova VNS Therapy Model 105 Generator',
    deviceType:       'VNS System',
    classification:   'active' as const,
    mriStatus:        'conditional' as const,
    mriClassification: 'MR Conditional',
    deviceCategory:   'Neuromodulation',
    componentRole:    'Generator',
    prescanProgrammingRequired: 'TRUE',
    deviceRepresentativeRequired: 'FALSE',
    verified:         false,
  },
  {
    key:              'A-CIED-0001',
    manufacturer:     'Medtronic',
    model:            'Azure DR MRI SureScan Pacemaker',
    deviceName:       'Medtronic Azure DR MRI SureScan',
    deviceType:       'Dual-chamber pacemaker',
    classification:   'active' as const,
    mriStatus:        'conditional' as const,
    mriClassification: 'MR Conditional',
    deviceCategory:   'Cardiac — CIED',
    componentRole:    'Generator',
    chamberCount:     'dual',
    mriModeType:      'SureScan',
    prescanProgrammingRequired: 'TRUE',
    deviceRepresentativeRequired: 'FALSE',
    verified:         false,
  },
] as const

// ── Condition leaves ───────────────────────────────────────────────────────────

type ConditionLeaf = {
  deviceKey:             string
  zoneLabel?:            string
  fieldStrength:         string
  eligibilityTier?:      string
  deviceIntegrityState?: string
  contextStatus?:        string
  transmitCoilType?:     string
  implantLocationCond?:  string
  operatingMode?:        string
  maxSpatialGradientCond?: number
  maxSlewRateCond?:      number
  maxB1RmsVal?:          number
  maxB1Rms?:             string
  maxSarWhole?:          number
  maxSarHead?:           number
  exclusionZoneApplies?: boolean
  exclusionZoneDescription?: string
  regionExcluded?:       string
  maxScanTimeMins?:      number
  scanTimeWindowMins?:   number
  cooloffPeriodMins?:    number
  mriClassification?:    string
  verificationStatus?:   string
  conditionNotes?:       string
  zoneIndex?:            number
  patientPreconditions?: string
  requiresVisualReview?: boolean
}

const LEAVES: ConditionLeaf[] = [
  // ── DBS — Percept PC ─────────────────────────────────────────────────────────
  {
    deviceKey:             'A-DBS-0001',
    zoneLabel:             'Full Body — 1.5T',
    fieldStrength:         '1.5T',
    eligibilityTier:       'Full Body',
    deviceIntegrityState:  'Complete',
    transmitCoilType:      'Body transmit/receive',
    operatingMode:         'Normal; First Level',
    maxSpatialGradientCond: 20,
    maxSlewRateCond:       200,
    maxB1RmsVal:           2.0,
    maxB1Rms:              '≤2.0 µT',
    exclusionZoneApplies:  true,
    exclusionZoneDescription: 'Isocentre must not fall within C7–T8 (inferior to C7)',
    regionExcluded:        'Chest/T-spine (T1–T8 region)',
    maxScanTimeMins:       30,
    scanTimeWindowMins:    60,
    cooloffPeriodMins:     60,
    mriClassification:     'MR Conditional',
    verificationStatus:    'Extracted',
    conditionNotes:        'Source: L01 from prototype. SureScan/programming mode required.',
    zoneIndex:             1,
    patientPreconditions:  'SureScan mode enabled; device programmed to MRI mode; rep present',
  },
  {
    deviceKey:             'A-DBS-0001',
    zoneLabel:             'Full Body — 3T',
    fieldStrength:         '3T',
    eligibilityTier:       'Full Body',
    deviceIntegrityState:  'Complete',
    transmitCoilType:      'Body transmit/receive',
    operatingMode:         'Normal; First Level',
    maxSpatialGradientCond: 20,
    maxSlewRateCond:       200,
    maxB1RmsVal:           2.0,
    maxB1Rms:              '≤2.0 µT',
    exclusionZoneApplies:  true,
    exclusionZoneDescription: 'Isocentre must not fall within C7–T8 (inferior to C7)',
    regionExcluded:        'Chest/T-spine (T1–T8 region)',
    maxScanTimeMins:       30,
    scanTimeWindowMins:    60,
    cooloffPeriodMins:     60,
    mriClassification:     'MR Conditional',
    verificationStatus:    'Extracted',
    conditionNotes:        'Source: L02 from prototype.',
    zoneIndex:             2,
    patientPreconditions:  'SureScan mode enabled; device programmed to MRI mode; rep present',
  },
  {
    deviceKey:             'A-DBS-0001',
    zoneLabel:             'Head Only — 1.5T (fractured lead)',
    fieldStrength:         '1.5T',
    eligibilityTier:       'Head-Only',
    deviceIntegrityState:  'Fractured-Suspected',
    transmitCoilType:      'Head transmit/receive',
    operatingMode:         'Normal',
    maxSpatialGradientCond: 20,
    maxSlewRateCond:       200,
    maxB1RmsVal:           2.0,
    maxB1Rms:              '≤2.0 µT',
    exclusionZoneApplies:  false,
    maxScanTimeMins:       20,
    scanTimeWindowMins:    60,
    mriClassification:     'MR Conditional',
    verificationStatus:    'Extracted',
    conditionNotes:        'Source: L03 from prototype. Head coil only when lead integrity suspected.',
    zoneIndex:             3,
    requiresVisualReview:  true,
  },
  {
    deviceKey:             'A-DBS-0001',
    zoneLabel:             'Not Eligible — abandoned fragment',
    fieldStrength:         '1.5T',
    eligibilityTier:       'Not Eligible',
    deviceIntegrityState:  'Abandoned-Fragment',
    contextStatus:         'Not Permitted',
    mriClassification:     'MR Conditional',
    verificationStatus:    'Extracted',
    conditionNotes:        'Source: L04 from prototype. No scanning if lead fragment present.',
    zoneIndex:             4,
  },
  {
    deviceKey:             'A-DBS-0001',
    zoneLabel:             'Not Eligible — abandoned fragment 3T',
    fieldStrength:         '3T',
    eligibilityTier:       'Not Eligible',
    deviceIntegrityState:  'Abandoned-Fragment',
    contextStatus:         'Not Permitted',
    mriClassification:     'MR Conditional',
    verificationStatus:    'Extracted',
    conditionNotes:        'Source: L05 from prototype.',
    zoneIndex:             5,
  },

  // ── VNS — LivaNova Model 105 ──────────────────────────────────────────────
  {
    deviceKey:             'A-VNS-0001',
    zoneLabel:             'Group A — upper left chest — 1.5T head only',
    fieldStrength:         '1.5T',
    eligibilityTier:       'Full Body',
    implantLocationCond:   'Upper Left Chest (above rib 4)',
    transmitCoilType:      'Head transmit/receive',
    operatingMode:         'Normal',
    maxB1RmsVal:           1.5,
    maxB1Rms:              '≤1.5 µT',
    exclusionZoneApplies:  false,
    maxScanTimeMins:       30,
    mriClassification:     'MR Conditional',
    verificationStatus:    'Extracted',
    conditionNotes:        'Source: L06. Group A: generator upper-left chest (above rib 4), head-only coil.',
    zoneIndex:             1,
    patientPreconditions:  'Generator implanted in upper-left chest above rib 4 — confirm location; device output set to 0 mA before scan',
  },
  {
    deviceKey:             'A-VNS-0001',
    zoneLabel:             'Group B — other location — 1.5T head only',
    fieldStrength:         '1.5T',
    eligibilityTier:       'Head-Only',
    transmitCoilType:      'Head transmit/receive',
    operatingMode:         'Normal',
    maxB1RmsVal:           1.0,
    maxB1Rms:              '≤1.0 µT',
    exclusionZoneApplies:  false,
    maxScanTimeMins:       20,
    mriClassification:     'MR Conditional',
    verificationStatus:    'Extracted',
    conditionNotes:        'Source: L07. Group B: any other generator location — head-only coil, reduced B1.',
    zoneIndex:             2,
    patientPreconditions:  'Device output set to 0 mA before scan; confirm lead integrity',
  },
  {
    deviceKey:             'A-VNS-0001',
    zoneLabel:             'Group A — upper left chest — 3T not tested',
    fieldStrength:         '3T',
    eligibilityTier:       'N-A',
    contextStatus:         'Not Tested',
    mriClassification:     'MR Conditional',
    verificationStatus:    'Extracted',
    conditionNotes:        'Source: L08. VNS Model 105 not tested at 3T. Risk-Benefit only.',
    zoneIndex:             3,
  },
  {
    deviceKey:             'A-VNS-0001',
    zoneLabel:             'Not Eligible — abandoned lead fragment',
    fieldStrength:         '1.5T',
    eligibilityTier:       'Not Eligible',
    deviceIntegrityState:  'Abandoned-Fragment',
    contextStatus:         'Not Permitted',
    mriClassification:     'MR Conditional',
    verificationStatus:    'Extracted',
    conditionNotes:        'Source: L09. Abandoned VNS lead = not eligible.',
    zoneIndex:             4,
  },

  // ── CIED — Medtronic Azure DR MRI ────────────────────────────────────────
  {
    deviceKey:             'A-CIED-0001',
    zoneLabel:             'SureScan — 1.5T full body',
    fieldStrength:         '1.5T',
    eligibilityTier:       'Full Body',
    deviceIntegrityState:  'Complete',
    transmitCoilType:      'Body transmit/receive',
    operatingMode:         'Normal',
    maxSpatialGradientCond: 20,
    maxSlewRateCond:       200,
    maxSarWhole:           2.0,
    maxSarHead:            3.2,
    exclusionZoneApplies:  false,
    maxScanTimeMins:       30,
    mriClassification:     'MR Conditional',
    verificationStatus:    'Extracted',
    conditionNotes:        'Source: L10. SureScan mode; whole-body SAR ≤2 W/kg, head SAR ≤3.2 W/kg.',
    zoneIndex:             1,
    patientPreconditions:  'SureScan mode programmed; pacing threshold tested; follow-up check within 1 week post-scan',
  },
  {
    deviceKey:             'A-CIED-0001',
    zoneLabel:             'SureScan — 3T full body',
    fieldStrength:         '3T',
    eligibilityTier:       'Full Body',
    deviceIntegrityState:  'Complete',
    transmitCoilType:      'Body transmit/receive',
    operatingMode:         'Normal',
    maxSpatialGradientCond: 20,
    maxSlewRateCond:       200,
    maxSarWhole:           2.0,
    maxSarHead:            3.2,
    exclusionZoneApplies:  false,
    maxScanTimeMins:       30,
    mriClassification:     'MR Conditional',
    verificationStatus:    'Extracted',
    conditionNotes:        'Source: L11.',
    zoneIndex:             2,
    patientPreconditions:  'SureScan mode programmed; pacing threshold tested; follow-up check within 1 week post-scan',
  },
  {
    deviceKey:             'A-CIED-0001',
    zoneLabel:             'Not Eligible — no SureScan leads',
    fieldStrength:         '1.5T',
    eligibilityTier:       'Not Eligible',
    contextStatus:         'Not Permitted',
    mriClassification:     'MR Conditional',
    verificationStatus:    'Extracted',
    conditionNotes:        'Source: L12. Azure DR requires SureScan-approved leads — without them, not eligible.',
    zoneIndex:             3,
  },
  {
    deviceKey:             'A-CIED-0001',
    zoneLabel:             'Not Eligible — no SureScan leads 3T',
    fieldStrength:         '3T',
    eligibilityTier:       'Not Eligible',
    contextStatus:         'Not Permitted',
    mriClassification:     'MR Conditional',
    verificationStatus:    'Extracted',
    conditionNotes:        'Source: L13.',
    zoneIndex:             4,
  },
  {
    deviceKey:             'A-CIED-0001',
    zoneLabel:             'Not tested at 7T',
    fieldStrength:         '7T',
    eligibilityTier:       'N-A',
    contextStatus:         'Not Tested',
    mriClassification:     'MR Conditional',
    verificationStatus:    'Extracted',
    conditionNotes:        'Source: L14.',
    zoneIndex:             5,
  },
]

export const seedPrototypeConditions = mutation({
  args: {},
  handler: async (ctx) => {
    // Soft auth
    const identity = await ctx.auth.getUserIdentity()
    if (identity) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const user = await (ctx.db as any).query('users').withIndex('by_clerk', (q: any) => q.eq('clerkId', identity.subject)).unique()
      if (user && user.role !== 'admin') throw new Error('Admin access required')
    }

    const now = Date.now()

    // 1. Ensure prototype devices exist
    const keyToDeviceId = new Map<string, Id<'devices'>>()

    for (const pd of PROTOTYPE_DEVICES) {
      const existing = await ctx.db
        .query('devices')
        .withIndex('by_manufacturer', (q) => q.eq('manufacturer', pd.manufacturer))
        .collect()
      const match = existing.find((d) => d.model === pd.model)

      if (match) {
        keyToDeviceId.set(pd.key, match._id)
        // Patch with any missing fields
        await ctx.db.patch(match._id, {
          mriClassification: pd.mriClassification,
          deviceCategory:    pd.deviceCategory,
          componentRole:     pd.componentRole,
          ...(('chamberCount' in pd) ? { chamberCount: pd.chamberCount } : {}),
          ...(('mriModeType' in pd) ? { mriModeType: pd.mriModeType } : {}),
          prescanProgrammingRequired:   pd.prescanProgrammingRequired,
          deviceRepresentativeRequired: pd.deviceRepresentativeRequired,
        } as never)
      } else {
        const { key, ...deviceFields } = pd
        const id = await ctx.db.insert('devices', {
          ...deviceFields,
          verifiedAt: now,
        } as never)
        keyToDeviceId.set(key, id as Id<'devices'>)
      }
    }

    // 2. Insert conditions, idempotent by (parentId + fieldStrength + zoneLabel)
    let inserted = 0
    let skipped  = 0

    for (const leaf of LEAVES) {
      const deviceId = keyToDeviceId.get(leaf.deviceKey)
      if (!deviceId) continue

      const parentId = deviceId as string

      // Check for existing condition with same label + fieldStrength
      const existingRows = await ctx.db
        .query('deviceConditions')
        .withIndex('by_parent', (q) => q.eq('parentId', parentId))
        .collect()
      const alreadyExists = existingRows.some(
        (r) => r.fieldStrength === leaf.fieldStrength && r.zoneLabel === leaf.zoneLabel
      )
      if (alreadyExists) { skipped++; continue }

      const { deviceKey, ...condFields } = leaf
      await ctx.db.insert('deviceConditions', { ...condFields, parentId })
      inserted++
    }

    return {
      inserted,
      skipped,
      devices: Object.fromEntries(keyToDeviceId),
    }
  },
})
