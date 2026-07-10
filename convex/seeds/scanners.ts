import { mutation } from '../_generated/server'
import { v }         from 'convex/values'

// Run with:
//   npx convex run seeds/scanners:seedClinicalScanners
//
// Creates ~25 common clinical MRI scanners in 'approved' state.
// Optionally pass a clinicId to automatically link all scanners to that clinic:
//   npx convex run seeds/scanners:seedClinicalScanners '{"clinicId":"<id>"}'
//
// Sources:
//   - Siemens: https://www.siemens-healthineers.com/magnetic-resonance-imaging
//   - GE:      https://www.gehealthcare.com/products/magnetic-resonance-imaging
//   - Philips: https://www.philips.co.uk/healthcare/product/MR
//   - Canon:   https://global.medical.canon/products/magnetic-resonance
//   - Hitachi: https://www.hitachimed.com/products/mri
//
// NOTE: maxSpatialGradient and maxSlewRate are NOT included here.
// These values must be obtained from each scanner's official MRI Safety or
// Physical Environment document and entered in the admin scanner edit form.
// Without them, the matrix will still run but will skip Gates 3 & 4.

const SCANNERS: {
  manufacturer:    string
  model:           string
  fieldStrength:   string
  scannerType:     string
  fieldOrientation: string
  boreDiameter:    number
  tableLimitKg:    number
  notes?:          string
  sourceUrls:      Array<{ url: string; label: string }>
}[] = [

  // ── Siemens Healthineers — 1.5T ─────────────────────────────────────────────
  {
    manufacturer:    'Siemens Healthineers',
    model:           'MAGNETOM Altea',
    fieldStrength:   '1.5T',
    scannerType:     'Closed-bore',
    fieldOrientation: 'Horizontal',
    boreDiameter:    70,
    tableLimitKg:    250,
    notes:           'Wide-bore 70 cm. BioMatrix sensors. Launched 2021.',
    sourceUrls: [{ url: 'https://www.siemens-healthineers.com/en-us/magnetic-resonance-imaging/1-5t-mri-scanner/magnetom-altea', label: 'Siemens – MAGNETOM Altea product page' }],
  },
  {
    manufacturer:    'Siemens Healthineers',
    model:           'MAGNETOM Sola',
    fieldStrength:   '1.5T',
    scannerType:     'Closed-bore',
    fieldOrientation: 'Horizontal',
    boreDiameter:    70,
    tableLimitKg:    250,
    notes:           'Wide-bore 70 cm. BioMatrix technology. Launched 2019.',
    sourceUrls: [{ url: 'https://www.siemens-healthineers.com/en-us/magnetic-resonance-imaging/1-5t-mri-scanner/magnetom-sola', label: 'Siemens – MAGNETOM Sola product page' }],
  },
  {
    manufacturer:    'Siemens Healthineers',
    model:           'MAGNETOM Avanto Fit',
    fieldStrength:   '1.5T',
    scannerType:     'Closed-bore',
    fieldOrientation: 'Horizontal',
    boreDiameter:    60,
    tableLimitKg:    200,
    notes:           'Standard bore 60 cm. Very common in UK NHS estates.',
    sourceUrls: [{ url: 'https://www.siemens-healthineers.com/en-us/magnetic-resonance-imaging/1-5t-mri-scanner/magnetom-avanto-fit', label: 'Siemens – MAGNETOM Avanto Fit product page' }],
  },
  {
    manufacturer:    'Siemens Healthineers',
    model:           'MAGNETOM Aera',
    fieldStrength:   '1.5T',
    scannerType:     'Closed-bore',
    fieldOrientation: 'Horizontal',
    boreDiameter:    70,
    tableLimitKg:    250,
    notes:           'Wide-bore 70 cm. 2011–2018 production. Widespread in NHS.',
    sourceUrls: [{ url: 'https://www.siemens-healthineers.com/en-us/magnetic-resonance-imaging/1-5t-mri-scanner', label: 'Siemens – 1.5T MRI systems overview' }],
  },

  // ── Siemens Healthineers — 3T ────────────────────────────────────────────────
  {
    manufacturer:    'Siemens Healthineers',
    model:           'MAGNETOM Vida',
    fieldStrength:   '3T',
    scannerType:     'Closed-bore',
    fieldOrientation: 'Horizontal',
    boreDiameter:    70,
    tableLimitKg:    250,
    notes:           'Wide-bore 70 cm. BioMatrix sensors. Launched 2017.',
    sourceUrls: [{ url: 'https://www.siemens-healthineers.com/en-us/magnetic-resonance-imaging/3t-mri-scanner/magnetom-vida', label: 'Siemens – MAGNETOM Vida product page' }],
  },
  {
    manufacturer:    'Siemens Healthineers',
    model:           'MAGNETOM Lumina',
    fieldStrength:   '3T',
    scannerType:     'Closed-bore',
    fieldOrientation: 'Horizontal',
    boreDiameter:    70,
    tableLimitKg:    250,
    notes:           'Wide-bore 70 cm. AI-enhanced. Launched 2020.',
    sourceUrls: [{ url: 'https://www.siemens-healthineers.com/en-us/magnetic-resonance-imaging/3t-mri-scanner/magnetom-lumina', label: 'Siemens – MAGNETOM Lumina product page' }],
  },
  {
    manufacturer:    'Siemens Healthineers',
    model:           'MAGNETOM Prisma',
    fieldStrength:   '3T',
    scannerType:     'Closed-bore',
    fieldOrientation: 'Horizontal',
    boreDiameter:    60,
    tableLimitKg:    200,
    notes:           'High-performance research/clinical. 80 mT/m gradients.',
    sourceUrls: [{ url: 'https://www.siemens-healthineers.com/en-us/magnetic-resonance-imaging/3t-mri-scanner/magnetom-prisma', label: 'Siemens – MAGNETOM Prisma product page' }],
  },
  {
    manufacturer:    'Siemens Healthineers',
    model:           'MAGNETOM Skyra',
    fieldStrength:   '3T',
    scannerType:     'Closed-bore',
    fieldOrientation: 'Horizontal',
    boreDiameter:    70,
    tableLimitKg:    250,
    notes:           'Wide-bore 70 cm. 2010–2018. Still widely installed.',
    sourceUrls: [{ url: 'https://www.siemens-healthineers.com/en-us/magnetic-resonance-imaging/3t-mri-scanner', label: 'Siemens – 3T MRI systems overview' }],
  },

  // ── Siemens Healthineers — 0.55T ─────────────────────────────────────────────
  {
    manufacturer:    'Siemens Healthineers',
    model:           'MAGNETOM Free.Max',
    fieldStrength:   '0.55T',
    scannerType:     'Closed-bore',
    fieldOrientation: 'Horizontal',
    boreDiameter:    80,
    tableLimitKg:    227,
    notes:           '80 cm ultrawide bore. Lightweight, portable-friendly. Launched 2021.',
    sourceUrls: [{ url: 'https://www.siemens-healthineers.com/en-us/magnetic-resonance-imaging/0-55t-low-field-mri-scanner/magnetom-free-max', label: 'Siemens – MAGNETOM Free.Max product page' }],
  },

  // ── GE HealthCare — 1.5T ─────────────────────────────────────────────────────
  {
    manufacturer:    'GE HealthCare',
    model:           'SIGNA Artist',
    fieldStrength:   '1.5T',
    scannerType:     'Closed-bore',
    fieldOrientation: 'Horizontal',
    boreDiameter:    60,
    tableLimitKg:    227,
    notes:           'AIR technology. 33 mT/m gradients. Launched 2022.',
    sourceUrls: [{ url: 'https://www.gehealthcare.com/products/magnetic-resonance-imaging/15t-mri-systems/signa-artist', label: 'GE HealthCare – SIGNA Artist product page' }],
  },
  {
    manufacturer:    'GE HealthCare',
    model:           'SIGNA Voyager',
    fieldStrength:   '1.5T',
    scannerType:     'Closed-bore',
    fieldOrientation: 'Horizontal',
    boreDiameter:    70,
    tableLimitKg:    227,
    notes:           'Wide-bore 70 cm. AIR coil technology. Launched 2019.',
    sourceUrls: [{ url: 'https://www.gehealthcare.com/products/magnetic-resonance-imaging/15t-mri-systems/signa-voyager', label: 'GE HealthCare – SIGNA Voyager product page' }],
  },
  {
    manufacturer:    'GE HealthCare',
    model:           'SIGNA Explorer',
    fieldStrength:   '1.5T',
    scannerType:     'Closed-bore',
    fieldOrientation: 'Horizontal',
    boreDiameter:    60,
    tableLimitKg:    204,
    notes:           'Mid-range 1.5T. Common in UK imaging centres.',
    sourceUrls: [{ url: 'https://www.gehealthcare.com/products/magnetic-resonance-imaging/15t-mri-systems', label: 'GE HealthCare – 1.5T MRI systems overview' }],
  },

  // ── GE HealthCare — 3T ───────────────────────────────────────────────────────
  {
    manufacturer:    'GE HealthCare',
    model:           'SIGNA Architect',
    fieldStrength:   '3T',
    scannerType:     'Closed-bore',
    fieldOrientation: 'Horizontal',
    boreDiameter:    60,
    tableLimitKg:    227,
    notes:           'AIR technology. 44 mT/m gradients. Launched 2020.',
    sourceUrls: [{ url: 'https://www.gehealthcare.com/products/magnetic-resonance-imaging/3t-mri-systems/signa-architect', label: 'GE HealthCare – SIGNA Architect product page' }],
  },
  {
    manufacturer:    'GE HealthCare',
    model:           'SIGNA Premier',
    fieldStrength:   '3T',
    scannerType:     'Closed-bore',
    fieldOrientation: 'Horizontal',
    boreDiameter:    60,
    tableLimitKg:    227,
    notes:           'Latest GE 3T platform. AIR Recon DL. Launched 2022.',
    sourceUrls: [{ url: 'https://www.gehealthcare.com/products/magnetic-resonance-imaging/3t-mri-systems/signa-premier', label: 'GE HealthCare – SIGNA Premier product page' }],
  },
  {
    manufacturer:    'GE HealthCare',
    model:           'SIGNA Pioneer',
    fieldStrength:   '3T',
    scannerType:     'Closed-bore',
    fieldOrientation: 'Horizontal',
    boreDiameter:    60,
    tableLimitKg:    227,
    notes:           'High-performance 3T. Used in academic medical centres.',
    sourceUrls: [{ url: 'https://www.gehealthcare.com/products/magnetic-resonance-imaging/3t-mri-systems', label: 'GE HealthCare – 3T MRI systems overview' }],
  },

  // ── Philips Healthcare — 1.5T ────────────────────────────────────────────────
  {
    manufacturer:    'Philips Healthcare',
    model:           'Ingenia Ambition S 1.5T',
    fieldStrength:   '1.5T',
    scannerType:     'Closed-bore',
    fieldOrientation: 'Horizontal',
    boreDiameter:    70,
    tableLimitKg:    250,
    notes:           'Wide-bore 70 cm. Heliox-free (no liquid helium refill). Launched 2021.',
    sourceUrls: [{ url: 'https://www.philips.co.uk/healthcare/product/HCNMRI2068/ingenia-ambition-15t', label: 'Philips – Ingenia Ambition 1.5T product page' }],
  },
  {
    manufacturer:    'Philips Healthcare',
    model:           'Ingenia CX 1.5T',
    fieldStrength:   '1.5T',
    scannerType:     'Closed-bore',
    fieldOrientation: 'Horizontal',
    boreDiameter:    60,
    tableLimitKg:    250,
    notes:           'dStream architecture. Launched 2016.',
    sourceUrls: [{ url: 'https://www.philips.co.uk/healthcare/product/HCNMRI2059/ingenia-15t-cx', label: 'Philips – Ingenia CX 1.5T product page' }],
  },
  {
    manufacturer:    'Philips Healthcare',
    model:           'Achieva dStream 1.5T',
    fieldStrength:   '1.5T',
    scannerType:     'Closed-bore',
    fieldOrientation: 'Horizontal',
    boreDiameter:    60,
    tableLimitKg:    200,
    notes:           'Older model (2010–2016). Still common in UK NHS.',
    sourceUrls: [{ url: 'https://www.philips.co.uk/healthcare/resources/landing/mri', label: 'Philips – MRI overview' }],
  },

  // ── Philips Healthcare — 3T ──────────────────────────────────────────────────
  {
    manufacturer:    'Philips Healthcare',
    model:           'Elition X 3T',
    fieldStrength:   '3T',
    scannerType:     'Closed-bore',
    fieldOrientation: 'Horizontal',
    boreDiameter:    70,
    tableLimitKg:    250,
    notes:           'Wide-bore 70 cm. ComforTone noise reduction. Launched 2021.',
    sourceUrls: [{ url: 'https://www.philips.co.uk/healthcare/product/HCNMRI2071/elition-x-30t', label: 'Philips – Elition X 3T product page' }],
  },
  {
    manufacturer:    'Philips Healthcare',
    model:           'Ingenia CX 3T',
    fieldStrength:   '3T',
    scannerType:     'Closed-bore',
    fieldOrientation: 'Horizontal',
    boreDiameter:    60,
    tableLimitKg:    250,
    notes:           'dStream architecture. 3T clinical workhorse.',
    sourceUrls: [{ url: 'https://www.philips.co.uk/healthcare/product/HCNMRI2060/ingenia-30t-cx', label: 'Philips – Ingenia CX 3T product page' }],
  },

  // ── Canon Medical Systems — 1.5T ─────────────────────────────────────────────
  {
    manufacturer:    'Canon Medical Systems',
    model:           'VANTAGE Elan',
    fieldStrength:   '1.5T',
    scannerType:     'Closed-bore',
    fieldOrientation: 'Horizontal',
    boreDiameter:    71,
    tableLimitKg:    250,
    notes:           '71 cm bore. AiCE deep learning reconstruction. Launched 2022.',
    sourceUrls: [{ url: 'https://global.medical.canon/products/magnetic-resonance/vantage-elan', label: 'Canon Medical – VANTAGE Elan product page' }],
  },
  {
    manufacturer:    'Canon Medical Systems',
    model:           'VANTAGE Orian',
    fieldStrength:   '1.5T',
    scannerType:     'Closed-bore',
    fieldOrientation: 'Horizontal',
    boreDiameter:    71,
    tableLimitKg:    250,
    notes:           '71 cm bore. Launched 2019.',
    sourceUrls: [{ url: 'https://global.medical.canon/products/magnetic-resonance/vantage-orian', label: 'Canon Medical – VANTAGE Orian product page' }],
  },

  // ── Canon Medical Systems — 3T ───────────────────────────────────────────────
  {
    manufacturer:    'Canon Medical Systems',
    model:           'VANTAGE Galan',
    fieldStrength:   '3T',
    scannerType:     'Closed-bore',
    fieldOrientation: 'Horizontal',
    boreDiameter:    71,
    tableLimitKg:    250,
    notes:           '71 cm bore. Launched 2022.',
    sourceUrls: [{ url: 'https://global.medical.canon/products/magnetic-resonance/vantage-galan', label: 'Canon Medical – VANTAGE Galan product page' }],
  },
  {
    manufacturer:    'Canon Medical Systems',
    model:           'VANTAGE Centurian',
    fieldStrength:   '3T',
    scannerType:     'Closed-bore',
    fieldOrientation: 'Horizontal',
    boreDiameter:    71,
    tableLimitKg:    250,
    notes:           '71 cm wide-bore. Launched 2018.',
    sourceUrls: [{ url: 'https://global.medical.canon/products/magnetic-resonance/vantage-centurian', label: 'Canon Medical – VANTAGE Centurian product page' }],
  },

  // ── Hitachi — 1.5T ───────────────────────────────────────────────────────────
  {
    manufacturer:    'Fujifilm Healthcare (formerly Hitachi)',
    model:           'ECHELON Oval',
    fieldStrength:   '1.5T',
    scannerType:     'Closed-bore',
    fieldOrientation: 'Horizontal',
    boreDiameter:    71,
    tableLimitKg:    200,
    notes:           '71 cm oval bore. Patient-friendly design. Used across UK.',
    sourceUrls: [{ url: 'https://www.fujifilm.com/fbsc/products/medical-image-diagnostics/mri/echelon-oval', label: 'Fujifilm Healthcare – ECHELON Oval product page' }],
  },
]

export const seedClinicalScanners = mutation({
  args: {
    clinicId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const now = Date.now()
    const created: string[] = []
    const skipped: string[] = []

    for (const s of SCANNERS) {
      // Idempotent: skip if manufacturer + model already exists
      const existing = await ctx.db
        .query('scanners')
        .withIndex('by_manufacturer', (q) => q.eq('manufacturer', s.manufacturer))
        .collect()
      const alreadyExists = existing.some((r) => r.model === s.model)
      if (alreadyExists) {
        skipped.push(`${s.manufacturer} ${s.model}`)
        continue
      }

      const id = await ctx.db.insert('scanners', {
        manufacturer:    s.manufacturer,
        model:           s.model,
        fieldStrength:   s.fieldStrength,
        scannerType:     s.scannerType,
        fieldOrientation: s.fieldOrientation,
        boreDiameter:    s.boreDiameter,
        tableLimitKg:    s.tableLimitKg,
        notes:           s.notes,
        sourceUrls:      s.sourceUrls,
        status:          'approved',
        submittedAt:     now,
      })
      created.push(`${s.manufacturer} ${s.model} (${id})`)
    }

    // If a clinicId was provided, link all newly created scanners
    if (args.clinicId && created.length > 0) {
      const clinic = await ctx.db.get(args.clinicId as never)
      if (clinic) {
        const newIds = created.map((c) => c.match(/\(([^)]+)\)$/)?.[1]).filter(Boolean)
        const existing: string[] = (clinic as { scannerIds?: string[] }).scannerIds ?? []
        const merged = [...new Set([...existing, ...newIds])]
        await ctx.db.patch(args.clinicId as never, { scannerIds: merged } as never)
      }
    }

    return {
      created: created.length,
      skipped: skipped.length,
      createdList: created,
      skippedList: skipped,
      note: 'maxSpatialGradient and maxSlewRate are not set — obtain from scanner MRI Safety / Physical Environment documents and enter via admin scanner edit form.',
    }
  },
})
