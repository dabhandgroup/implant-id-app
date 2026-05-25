import { mutation } from './_generated/server'
import { v } from 'convex/values'

// Run once to seed the device catalogue into Convex.
// Usage (after npx convex dev is running):
//   npx convex run seed:seedDevices
//
// The library page will then query this table instead of loading implants.js.

export const seedDevices = mutation({
  args: {},
  handler: async (ctx) => {
    // Only admins may re-seed the catalogue
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) throw new Error('Unauthenticated')

    const caller = await ctx.db
      .query('users')
      .withIndex('by_clerk', (q) => q.eq('clerkId', identity.subject))
      .unique()
    if (!caller || caller.role !== 'admin') throw new Error('Forbidden: admin only')

    // Clear existing devices first (idempotent re-run)
    const existing = await ctx.db.query('devices').collect()
    await Promise.all(existing.map((d) => ctx.db.delete(d._id)))

    const devices = [
      // ── Medtronic ──────────────────────────────────────────────────────────
      {
        manufacturer: 'Medtronic',
        model: 'Azure XT DR W3DR01',
        deviceType: 'Dual-chamber pacemaker',
        classification: 'active' as const,
        mriStatus: 'conditional' as const,
        fieldStrengths: '1.5T, 3.0T',
        sarLimit: '2.0 W/kg',
        b1RmsLimit: '2.0 µT',
        slewRateLimit: '200 T/m/s',
        contraindications: 'Do not scan with lead extensions',
        verified: true,
        verifiedAt: Date.now(),
      },
      {
        manufacturer: 'Medtronic',
        model: 'Micra AV MC1AVR1',
        deviceType: 'Leadless pacemaker',
        classification: 'active' as const,
        mriStatus: 'conditional' as const,
        fieldStrengths: '1.5T, 3.0T',
        sarLimit: '2.0 W/kg',
        verified: true,
        verifiedAt: Date.now(),
      },
      {
        manufacturer: 'Medtronic',
        model: 'Evoque Tricuspid Valve',
        deviceType: 'Transcatheter tricuspid valve',
        classification: 'passive' as const,
        mriStatus: 'conditional' as const,
        fieldStrengths: '1.5T',
        contraindications: 'Not tested at 3T',
        verified: true,
        verifiedAt: Date.now(),
      },

      // ── Abbott ─────────────────────────────────────────────────────────────
      {
        manufacturer: 'Abbott',
        model: 'Aveir DR i2i',
        deviceType: 'Dual-chamber leadless pacemaker',
        classification: 'active' as const,
        mriStatus: 'conditional' as const,
        fieldStrengths: '1.5T, 3.0T',
        sarLimit: '2.0 W/kg',
        verified: true,
        verifiedAt: Date.now(),
      },
      {
        manufacturer: 'Abbott',
        model: 'Gallant HF ICD',
        deviceType: 'High-voltage ICD',
        classification: 'active' as const,
        mriStatus: 'conditional' as const,
        fieldStrengths: '1.5T',
        contraindications: 'Scan head/extremities only',
        verified: true,
        verifiedAt: Date.now(),
      },

      // ── Boston Scientific ──────────────────────────────────────────────────
      {
        manufacturer: 'Boston Scientific',
        model: 'EMBLEM S-ICD A219',
        deviceType: 'Subcutaneous ICD',
        classification: 'active' as const,
        mriStatus: 'conditional' as const,
        fieldStrengths: '1.5T',
        sarLimit: '1.5 W/kg',
        verified: true,
        verifiedAt: Date.now(),
      },
      {
        manufacturer: 'Boston Scientific',
        model: 'Evia HF-T D274TRG',
        deviceType: 'CRT-P (biventricular pacemaker)',
        classification: 'active' as const,
        mriStatus: 'conditional' as const,
        fieldStrengths: '1.5T, 3.0T',
        verified: true,
        verifiedAt: Date.now(),
      },

      // ── Biotronik ──────────────────────────────────────────────────────────
      {
        manufacturer: 'Biotronik',
        model: 'Edora 8 DR-T',
        deviceType: 'Dual-chamber pacemaker',
        classification: 'active' as const,
        mriStatus: 'conditional' as const,
        fieldStrengths: '1.5T, 3.0T',
        verified: true,
        verifiedAt: Date.now(),
      },

      // ── Orthopedic passives ────────────────────────────────────────────────
      {
        manufacturer: 'Stryker',
        model: 'Triathlon Total Knee System',
        deviceType: 'Total knee replacement',
        classification: 'passive' as const,
        mriStatus: 'conditional' as const,
        fieldStrengths: '1.5T, 3.0T',
        verified: true,
        verifiedAt: Date.now(),
      },
      {
        manufacturer: 'Zimmer Biomet',
        model: 'Persona Total Knee',
        deviceType: 'Total knee replacement',
        classification: 'passive' as const,
        mriStatus: 'safe' as const,
        verified: true,
        verifiedAt: Date.now(),
      },
      {
        manufacturer: 'DePuy Synthes',
        model: 'ATTUNE Knee System',
        deviceType: 'Total knee replacement',
        classification: 'passive' as const,
        mriStatus: 'conditional' as const,
        fieldStrengths: '1.5T, 3.0T',
        verified: true,
        verifiedAt: Date.now(),
      },
      {
        manufacturer: 'Smith+Nephew',
        model: 'BIRMINGHAM HIP Resurfacing',
        deviceType: 'Hip resurfacing implant',
        classification: 'passive' as const,
        mriStatus: 'conditional' as const,
        fieldStrengths: '1.5T',
        contraindications: 'Significant image artefact expected',
        verified: true,
        verifiedAt: Date.now(),
      },

      // ── Neurostimulation ───────────────────────────────────────────────────
      {
        manufacturer: 'Medtronic',
        model: 'Percept PC DBS G780',
        deviceType: 'Deep brain stimulator',
        classification: 'active' as const,
        mriStatus: 'conditional' as const,
        fieldStrengths: '1.5T',
        sarLimit: '0.1 W/kg (head coil)',
        contraindications: '3T not cleared. Brain only.',
        verified: true,
        verifiedAt: Date.now(),
      },
      {
        manufacturer: 'Abbott',
        model: 'Proclaim XR SCS',
        deviceType: 'Spinal cord stimulator',
        classification: 'active' as const,
        mriStatus: 'conditional' as const,
        fieldStrengths: '1.5T',
        contraindications: 'Full-body transmit coil not permitted',
        verified: true,
        verifiedAt: Date.now(),
      },

      // ── Cochlear ───────────────────────────────────────────────────────────
      {
        manufacturer: 'Cochlear',
        model: 'Nucleus CI622',
        deviceType: 'Cochlear implant',
        classification: 'active' as const,
        mriStatus: 'conditional' as const,
        fieldStrengths: '1.5T, 3.0T',
        contraindications: 'Magnet must be removed or head bandaged for 3T',
        verified: true,
        verifiedAt: Date.now(),
      },
      {
        manufacturer: 'MED-EL',
        model: 'SYNCHRONY 2',
        deviceType: 'Cochlear implant',
        classification: 'active' as const,
        mriStatus: 'conditional' as const,
        fieldStrengths: '1.5T, 3.0T',
        verified: true,
        verifiedAt: Date.now(),
      },

      // ── Vascular ───────────────────────────────────────────────────────────
      {
        manufacturer: 'Abbott',
        model: 'Xience Sierra Drug-Eluting Stent',
        deviceType: 'Coronary stent',
        classification: 'passive' as const,
        mriStatus: 'safe' as const,
        verified: true,
        verifiedAt: Date.now(),
      },
      {
        manufacturer: 'Medtronic',
        model: 'Endurant II Stent Graft',
        deviceType: 'Aortic stent graft',
        classification: 'passive' as const,
        mriStatus: 'conditional' as const,
        fieldStrengths: '1.5T, 3.0T',
        verified: true,
        verifiedAt: Date.now(),
      },
    ]

    const ids = await Promise.all(devices.map((d) => ctx.db.insert('devices', d)))
    return { seeded: ids.length }
  },
})
