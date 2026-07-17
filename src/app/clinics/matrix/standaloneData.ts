// ── Standalone MVP Matrix — hardcoded reference dataset ───────────────────────
// Launch dataset for the clinic-only MVP: no Convex, no live device catalogue,
// no clinic-registered hardware. Just enough real, cited devices and scanners
// to run the full 10-gate resolver end to end.
//
// Every device/scanner here is real and every numeric safety limit is sourced
// from published manufacturer documentation — never invented. Where a source
// could not be confirmed publicly, the field is left undefined so the
// closed-world resolver treats it as unknown rather than showing a fabricated
// number. See inline citations.
//
// Device condition data is carried over verbatim from convex/seeds/conditions.ts
// (the same LEAVES the live registry-mode matrix uses for these 3 devices) so
// both matrices agree on the same safety data.

import type { MatrixDevice, MatrixCondition } from '../../../../convex/matrixCore'

export type StandaloneScanner = {
  id:                 string
  manufacturer:       string
  model:              string
  fieldStrength:       string
  scannerType:         string
  fieldOrientation:    string
  maxSpatialGradient?: number
  maxSlewRate?:        number
  sourceLabel:         string
}

// ── Devices ────────────────────────────────────────────────────────────────────
// Same 3 devices as convex/seeds/conditions.ts PROTOTYPE_DEVICES — the only
// devices in the current catalogue with complete condition-leaf data.

export const STANDALONE_DEVICES: (MatrixDevice & { id: string; manufacturer: string })[] = [
  {
    id:                'A-DBS-0001',
    manufacturer:      'Medtronic',
    model:             'Percept PC DBS System',
    deviceName:        'Medtronic Percept PC DBS System',
    mriClassification: 'MR Conditional',
    componentRole:     'System',
  },
  {
    id:                'A-VNS-0001',
    manufacturer:      'LivaNova',
    model:             'VNS Therapy System Model 105',
    deviceName:        'LivaNova VNS Therapy Model 105 Generator',
    mriClassification: 'MR Conditional',
    componentRole:     'Generator',
  },
  {
    id:                'A-CIED-0001',
    manufacturer:      'Medtronic',
    model:             'Azure DR MRI SureScan Pacemaker',
    deviceName:        'Medtronic Azure DR MRI SureScan',
    mriClassification: 'MR Conditional',
    componentRole:     'Generator',
  },
]

// ── Condition leaves ───────────────────────────────────────────────────────────
// Carried over verbatim from convex/seeds/conditions.ts LEAVES — do not hand-edit
// without updating that seed too, they must stay in sync.

export const STANDALONE_CONDITIONS: Record<string, MatrixCondition[]> = {
  'A-DBS-0001': [
    {
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
      maxScanTimeMins:       30,
      scanTimeWindowMins:    60,
      cooloffPeriodMins:     60,
      patientPreconditions:  'SureScan mode enabled; device programmed to MRI mode; rep present',
    },
    {
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
      maxScanTimeMins:       30,
      scanTimeWindowMins:    60,
      cooloffPeriodMins:     60,
      patientPreconditions:  'SureScan mode enabled; device programmed to MRI mode; rep present',
    },
    {
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
      requiresVisualReview:  true,
    },
    {
      fieldStrength:         '1.5T',
      eligibilityTier:       'Not Eligible',
      deviceIntegrityState:  'Abandoned-Fragment',
      contextStatus:         'Not Permitted',
    },
    {
      fieldStrength:         '3T',
      eligibilityTier:       'Not Eligible',
      deviceIntegrityState:  'Abandoned-Fragment',
      contextStatus:         'Not Permitted',
    },
  ],
  'A-VNS-0001': [
    {
      fieldStrength:         '1.5T',
      eligibilityTier:       'Full Body',
      implantLocationCond:   'Upper Left Chest (above rib 4)',
      transmitCoilType:      'Head transmit/receive',
      operatingMode:         'Normal',
      maxB1RmsVal:           1.5,
      maxB1Rms:              '≤1.5 µT',
      exclusionZoneApplies:  false,
      maxScanTimeMins:       30,
      patientPreconditions:  'Generator implanted in upper-left chest above rib 4 — confirm location; device output set to 0 mA before scan',
    },
    {
      fieldStrength:         '1.5T',
      eligibilityTier:       'Head-Only',
      transmitCoilType:      'Head transmit/receive',
      operatingMode:         'Normal',
      maxB1RmsVal:           1.0,
      maxB1Rms:              '≤1.0 µT',
      exclusionZoneApplies:  false,
      maxScanTimeMins:       20,
      patientPreconditions:  'Device output set to 0 mA before scan; confirm lead integrity',
    },
    {
      fieldStrength:         '3T',
      eligibilityTier:       'N-A',
      contextStatus:         'Not Tested',
    },
    {
      fieldStrength:         '1.5T',
      eligibilityTier:       'Not Eligible',
      deviceIntegrityState:  'Abandoned-Fragment',
      contextStatus:         'Not Permitted',
    },
  ],
  'A-CIED-0001': [
    {
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
      patientPreconditions:  'SureScan mode programmed; pacing threshold tested; follow-up check within 1 week post-scan',
    },
    {
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
      patientPreconditions:  'SureScan mode programmed; pacing threshold tested; follow-up check within 1 week post-scan',
    },
    {
      fieldStrength:         '1.5T',
      eligibilityTier:       'Not Eligible',
      contextStatus:         'Not Permitted',
    },
    {
      fieldStrength:         '3T',
      eligibilityTier:       'Not Eligible',
      contextStatus:         'Not Permitted',
    },
    {
      fieldStrength:         '7T',
      eligibilityTier:       'N-A',
      contextStatus:         'Not Tested',
    },
  ],
}

// ── Scanners ───────────────────────────────────────────────────────────────────
// Same models as convex/seeds/scanners.ts. maxSpatialGradient / maxSlewRate are
// NOT populated in that live seed (per its own header note); here they're filled
// in from each manufacturer's published site-planning / technical datasheet so
// this standalone tool can exercise gates 3 and 4. All closed-bore, horizontal
// field — matches every scanner currently in the live seed.

export const STANDALONE_SCANNERS: StandaloneScanner[] = [
  {
    id: 'aera-15t', manufacturer: 'Siemens Healthineers', model: 'MAGNETOM Aera',
    fieldStrength: '1.5T', scannerType: 'Closed-bore', fieldOrientation: 'Horizontal',
    maxSpatialGradient: 33, maxSlewRate: 125,
    sourceLabel: 'Siemens Healthineers product datasheet (MAGNETOM Aera, XJ gradient option)',
  },
  {
    id: 'sola-15t', manufacturer: 'Siemens Healthineers', model: 'MAGNETOM Sola',
    fieldStrength: '1.5T', scannerType: 'Closed-bore', fieldOrientation: 'Horizontal',
    maxSpatialGradient: 33, maxSlewRate: 125,
    sourceLabel: 'Siemens Healthineers product datasheet (MAGNETOM Sola)',
  },
  {
    id: 'skyra-3t', manufacturer: 'Siemens Healthineers', model: 'MAGNETOM Skyra',
    fieldStrength: '3T', scannerType: 'Closed-bore', fieldOrientation: 'Horizontal',
    maxSpatialGradient: 45, maxSlewRate: 200,
    sourceLabel: 'Siemens Healthineers doclib spec sheet (MAGNETOM Skyra, doc 412160)',
  },
  {
    id: 'voyager-15t', manufacturer: 'GE HealthCare', model: 'SIGNA Voyager',
    fieldStrength: '1.5T', scannerType: 'Closed-bore', fieldOrientation: 'Horizontal',
    maxSpatialGradient: 33, maxSlewRate: 120,
    sourceLabel: 'GE HealthCare SIGNA Voyager product specifications',
  },
  {
    id: 'premier-3t', manufacturer: 'GE HealthCare', model: 'SIGNA Premier',
    fieldStrength: '3T', scannerType: 'Closed-bore', fieldOrientation: 'Horizontal',
    maxSpatialGradient: 80, maxSlewRate: 200,
    sourceLabel: 'GE HealthCare SIGNA Premier FDA-cleared spec sheet (2017)',
  },
  {
    id: 'ingenia-cx-15t', manufacturer: 'Philips Healthcare', model: 'Ingenia CX 1.5T',
    fieldStrength: '1.5T', scannerType: 'Closed-bore', fieldOrientation: 'Horizontal',
    maxSpatialGradient: 33, maxSlewRate: 120,
    sourceLabel: 'Philips Ingenia 1.5T CX product documentation (Stellar HP gradients)',
  },
  {
    id: 'vantage-elan-15t', manufacturer: 'Canon Medical Systems', model: 'VANTAGE Elan',
    fieldStrength: '1.5T', scannerType: 'Closed-bore', fieldOrientation: 'Horizontal',
    maxSpatialGradient: 33, maxSlewRate: 125,
    sourceLabel: 'Canon Medical Systems VANTAGE Elan product specifications',
  },
]

// ── Coil options ───────────────────────────────────────────────────────────────
// Fixed controlled-vocab list — mirrors the manual-coil dropdown already used by
// the live registry matrix (src/app/clinics/matrix/MatrixClient.tsx manual mode).

export const STANDALONE_COIL_OPTIONS = [
  { value: '', label: 'Body transmit/receive (default)' },
  { value: 'Body transmit/receive', label: 'Body transmit/receive' },
  { value: 'Head transmit/receive', label: 'Head transmit/receive' },
  { value: 'Head receive-only',     label: 'Head receive-only (body TX)' },
  { value: 'Extremity receive-only', label: 'Extremity / local receive-only' },
  { value: 'Spine receive-only',    label: 'Spine receive-only' },
]

// ── Body regions ───────────────────────────────────────────────────────────────
// Kept identical to convex/matrixCore.ts REGION_ISOCENTRE keys so Gate 8
// (exclusion zone) actually resolves correctly — the live registry matrix's own
// BODY_REGIONS list uses spaced labels ("Neck / C-spine") that don't match
// REGION_ISOCENTRE's keys and silently fall through to the conservative
// 'between' default; this list avoids that mismatch.

export const STANDALONE_BODY_REGIONS = [
  'Brain/Head',
  'Neck/C-spine',
  'Chest/T-spine',
  'Abdomen/L-spine',
  'Pelvis',
  'Knee/lower extremity',
]

export const STANDALONE_INTEGRITY_OPTIONS = [
  { value: 'Complete',             label: 'Complete — no known lead issue' },
  { value: 'Fractured-Suspected',  label: 'Suspected lead fracture' },
  { value: 'Abandoned-Fragment',   label: 'Abandoned lead fragment' },
]

export const STANDALONE_LOCATION_OPTIONS = [
  { value: '',                                    label: 'Not recorded' },
  { value: 'Upper Left Chest (above rib 4)',       label: 'Upper left chest (above rib 4)' },
  { value: 'Other implant location',               label: 'Other location' },
]
