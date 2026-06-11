import { query } from './_generated/server'
import { v }     from 'convex/values'

/**
 * Platform-wide search for the master admin.
 * Uses Convex search indexes for fast, indexed lookups instead of full table scans.
 * Returns up to 6 results per category.
 */
export const masterSearch = query({
  args: { query: v.string() },
  handler: async (ctx, args) => {
    const raw = args.query.trim()
    if (raw.length < 2) return { patients: [], clinics: [], devices: [] }

    // ── Patients ────────────────────────────────────────────────────────────
    // Search by first name and last name in parallel; also check for exact
    // implant code match via the by_implant_code index.
    const [byFirst, byLast, byCode] = await Promise.all([
      ctx.db
        .query('patients')
        .withSearchIndex('search_first_name', (q) => q.search('firstName', raw))
        .take(8),
      ctx.db
        .query('patients')
        .withSearchIndex('search_last_name', (q) => q.search('lastName', raw))
        .take(8),
      // Exact implant code lookup (e.g. IID-SMIJO2311XK)
      ctx.db
        .query('patients')
        .withIndex('by_implant_code', (q) => q.eq('implantIdCode', raw.toUpperCase()))
        .take(1),
    ])

    // Deduplicate by _id, keep insertion order (first wins)
    const seen = new Set<string>()
    const patients = [...byFirst, ...byLast, ...byCode]
      .filter(p => { if (seen.has(p._id)) return false; seen.add(p._id); return true })
      .slice(0, 6)
      .map(p => ({
        _id:                p._id,
        name:               `${p.firstName} ${p.lastName}`,
        implantIdCode:      p.implantIdCode,
        verificationStatus: p.verificationStatus,
        device:             p.selfReportedDevice ?? null,
      }))

    // ── Clinics ─────────────────────────────────────────────────────────────
    const clinicResults = await ctx.db
      .query('clinics')
      .withSearchIndex('search_name', (q) => q.search('name', raw))
      .take(6)

    const clinics = clinicResults.map(c => ({
      _id:    c._id,
      name:   c.name,
      email:  c.email ?? null,
      status: c.status,
    }))

    // Pending applications (no search index — small table, take 50 is fine)
    const allApps = await ctx.db.query('clinicApplications').take(50)
    const q = raw.toLowerCase()
    const pendingClinics = allApps
      .filter(a =>
        a.status === 'pending' &&
        (a.facilityName.toLowerCase().includes(q) || a.contactEmail.toLowerCase().includes(q)),
      )
      .slice(0, 3)
      .map(a => ({
        _id:           a._id,
        name:          a.facilityName,
        email:         a.contactEmail,
        status:        'pending' as const,
        isApplication: true,
      }))

    // ── Devices ─────────────────────────────────────────────────────────────
    const [byMfr, byModel] = await Promise.all([
      ctx.db
        .query('devices')
        .withSearchIndex('search_manufacturer', (q) => q.search('manufacturer', raw))
        .take(8),
      ctx.db
        .query('devices')
        .withSearchIndex('search_model', (q) => q.search('model', raw))
        .take(8),
    ])

    const seenDevices = new Set<string>()
    const devices = [...byMfr, ...byModel]
      .filter(d => { if (seenDevices.has(d._id)) return false; seenDevices.add(d._id); return true })
      .slice(0, 6)
      .map(d => ({
        _id:          d._id,
        manufacturer: d.manufacturer,
        model:        d.model,
        deviceType:   d.deviceType,
        mriStatus:    d.mriStatus,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        deviceCode:   (d as any).deviceCode ?? null,
      }))

    return {
      patients,
      clinics:  [...clinics, ...pendingClinics].slice(0, 6),
      devices,
    }
  },
})
