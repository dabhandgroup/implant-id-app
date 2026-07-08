import { mutation } from '../_generated/server'

// Run with:  npx convex run seeds/scannerModels:seedScannerModels

const SCANNER_MODELS = [
  { manufacturer: 'Siemens Healthineers', model: 'MAGNETOM Skyra',         fieldStrength: '3T',    scannerType: 'Closed-bore', maxSpatialGradient: 45, maxSlewRate: 200, fieldOrientation: 'Horizontal' as const },
  { manufacturer: 'Siemens Healthineers', model: 'MAGNETOM Aera',          fieldStrength: '1.5T',  scannerType: 'Closed-bore', maxSpatialGradient: 45, maxSlewRate: 200, fieldOrientation: 'Horizontal' as const },
  { manufacturer: 'Siemens Healthineers', model: 'MAGNETOM Free.Max',      fieldStrength: '0.55T', scannerType: 'Closed-bore', maxSpatialGradient: 26, maxSlewRate: 100, fieldOrientation: 'Horizontal' as const },
  { manufacturer: 'Siemens Healthineers', model: 'MAGNETOM Vida',          fieldStrength: '3T',    scannerType: 'Closed-bore', maxSpatialGradient: 45, maxSlewRate: 200, fieldOrientation: 'Horizontal' as const },
  { manufacturer: 'Siemens Healthineers', model: 'MAGNETOM Sola',          fieldStrength: '1.5T',  scannerType: 'Closed-bore', maxSpatialGradient: 45, maxSlewRate: 200, fieldOrientation: 'Horizontal' as const },
  { manufacturer: 'GE HealthCare',        model: 'SIGNA Artist',           fieldStrength: '1.5T',  scannerType: 'Closed-bore', maxSpatialGradient: 44, maxSlewRate: 200, fieldOrientation: 'Horizontal' as const },
  { manufacturer: 'GE HealthCare',        model: 'SIGNA Pioneer',          fieldStrength: '3T',    scannerType: 'Closed-bore', maxSpatialGradient: 50, maxSlewRate: 200, fieldOrientation: 'Horizontal' as const },
  { manufacturer: 'Philips',              model: 'Ingenia Elition X',      fieldStrength: '3T',    scannerType: 'Closed-bore', maxSpatialGradient: 45, maxSlewRate: 220, fieldOrientation: 'Horizontal' as const },
  { manufacturer: 'Philips',              model: 'Achieva 1.5T',           fieldStrength: '1.5T',  scannerType: 'Closed-bore', maxSpatialGradient: 33, maxSlewRate: 166, fieldOrientation: 'Horizontal' as const },
  { manufacturer: 'Philips',              model: 'Achieva 3T',             fieldStrength: '3T',    scannerType: 'Closed-bore', maxSpatialGradient: 40, maxSlewRate: 200, fieldOrientation: 'Horizontal' as const },
] as const

export const seedScannerModels = mutation({
  args: {},
  handler: async (ctx) => {
    // Soft auth — allows CLI calls without session
    const identity = await ctx.auth.getUserIdentity()
    if (identity) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const user = await (ctx.db as any).query('users').withIndex('by_clerk', (q: any) => q.eq('clerkId', identity.subject)).unique()
      if (user && user.role !== 'admin') throw new Error('Admin access required')
    }

    const now = Date.now()
    const inserted: string[] = []
    const skipped: string[] = []

    for (const m of SCANNER_MODELS) {
      // Idempotent: check if already exists
      const existing = await ctx.db
        .query('scanners')
        .withIndex('by_manufacturer', (q) => q.eq('manufacturer', m.manufacturer))
        .collect()
      const alreadyExists = existing.some(
        (s) => s.model === m.model && s.fieldStrength === m.fieldStrength
      )

      if (alreadyExists) {
        skipped.push(`${m.manufacturer} ${m.model} ${m.fieldStrength}`)
        continue
      }

      const id = await ctx.db.insert('scanners', {
        manufacturer:       m.manufacturer,
        model:              m.model,
        fieldStrength:      m.fieldStrength,
        scannerType:        m.scannerType,
        maxSpatialGradient: m.maxSpatialGradient,
        maxSlewRate:        m.maxSlewRate,
        fieldOrientation:   m.fieldOrientation,
        status:             'approved',
        submittedAt:        now,
      })
      inserted.push(id)
    }

    return { inserted: inserted.length, skipped: skipped.length, insertedIds: inserted }
  },
})
