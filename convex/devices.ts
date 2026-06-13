import { mutation, query } from './_generated/server'
import { v }              from 'convex/values'
import type { Id }        from './_generated/dataModel'

// ── Device code generator ──────────────────────────────────────────────────
// Format: DID-[3 MFR][3 MODEL]-[4 ID tail]
// e.g. Medtronic Azure XT → DID-MDTAZU-J7K2
function makeDeviceCode(manufacturer: string, model: string, id: string): string {
  const mfr3 = manufacturer.replace(/[^A-Z0-9]/gi, '').toUpperCase().slice(0, 3).padEnd(3, 'X')
  const mod3 = model.replace(/[^A-Z0-9]/gi, '').toUpperCase().slice(0, 3).padEnd(3, 'X')
  // Last 4 alphanumeric chars of Convex ID (guaranteed unique)
  const tail = id.replace(/[^A-Z0-9]/gi, '').toUpperCase().slice(-4).padStart(4, '0')
  return `DID-${mfr3}${mod3}-${tail}`
}

/** Generate a one-time upload URL for a device source document (master/manufacturer). */
export const generateDeviceDocUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) throw new Error('Not authenticated')
    return ctx.storage.generateUploadUrl()
  },
})

/** List all LIVE devices in the catalogue (patient/clinic facing). */
export const listDevices = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    return ctx.db
      .query('devices')
      .withIndex('by_status', (q) => q.eq('status', 'live'))
      .order('asc')
      .take(args.limit ?? 200)
  },
})

/** List all devices regardless of status (master admin only). */
export const listAllDevices = query({
  args: { limit: v.optional(v.number()), status: v.optional(v.union(v.literal('draft'), v.literal('pending_review'), v.literal('live'), v.literal('recalled'))) },
  handler: async (ctx, args) => {
    if (args.status) {
      return ctx.db
        .query('devices')
        .withIndex('by_status', (q) => q.eq('status', args.status))
        .order('desc')
        .take(args.limit ?? 200)
    }
    return ctx.db
      .query('devices')
      .order('desc')
      .take(args.limit ?? 200)
  },
})

/** List devices for a specific manufacturer (by manufacturer name string). */
export const listMyDevices = query({
  args: { manufacturerName: v.string() },
  handler: async (ctx, args) => {
    return ctx.db
      .query('devices')
      .withIndex('by_manufacturer', (q) => q.eq('manufacturer', args.manufacturerName))
      .order('desc')
      .take(200)
  },
})

/** List devices pending review (24h auto-publish window). */
export const listPendingDevices = query({
  args: {},
  handler: async (ctx) => {
    return ctx.db
      .query('devices')
      .withIndex('by_status', (q) => q.eq('status', 'pending_review'))
      .order('asc')
      .take(100)
  },
})

/** Get a single device by its Convex ID. */
export const getDeviceById = query({
  args: { id: v.id('devices') },
  handler: async (ctx, args) => {
    return ctx.db.get(args.id)
  },
})

/** Add a new device to the catalogue (platform admin use). */
export const addDevice = mutation({
  args: {
    manufacturer:       v.string(),
    model:              v.string(),
    deviceType:         v.string(),
    classification:     v.union(v.literal('active'), v.literal('passive'), v.literal('legacy')),
    mriStatus:          v.union(v.literal('conditional'), v.literal('safe'), v.literal('unsafe'), v.literal('unknown')),
    fieldStrengths:     v.optional(v.string()),   // e.g. "1.5T, 3.0T"
    sarLimit:           v.optional(v.string()),   // whole-body SAR, W/kg
    b1RmsLimit:         v.optional(v.string()),   // µT
    slewRateLimit:      v.optional(v.string()),   // T/m/s
    gradientLimit:      v.optional(v.string()),   // mT/m
    maxScanTime:        v.optional(v.string()),   // minutes per sequence
    contraindications:  v.optional(v.string()),
    approvedRegions:    v.optional(v.array(v.string())),
    lotNumber:          v.optional(v.string()),
    regionalRep:        v.optional(v.array(v.object({
      country: v.string(),
      name: v.string(),
      email: v.string(),
    }))),
    oem_ownedNotes:     v.optional(v.string()),
    sourceUrl:          v.optional(v.string()),
    pdfLinks:           v.optional(v.array(v.string())),
    sourcesRaw:         v.optional(v.string()),
    sourceUrls:         v.optional(v.array(v.object({ url: v.string(), label: v.optional(v.string()) }))),
    sourceDocs:         v.optional(v.array(v.object({ storageId: v.id('_storage'), label: v.optional(v.string()) }))),
  },
  handler: async (ctx, args) => {
    const id = await ctx.db.insert('devices', {
      manufacturer:     args.manufacturer,
      model:            args.model,
      deviceType:       args.deviceType,
      classification:   args.classification,
      mriStatus:        args.mriStatus,
      fieldStrengths:   args.fieldStrengths,
      sarLimit:         args.sarLimit,
      b1RmsLimit:       args.b1RmsLimit,
      slewRateLimit:    args.slewRateLimit,
      gradientLimit:    args.gradientLimit,
      maxScanTime:      args.maxScanTime,
      contraindications: args.contraindications,
      approvedRegions:  args.approvedRegions,
      lotNumber:        args.lotNumber,
      regionalRep:      args.regionalRep,
      oem_ownedNotes:   args.oem_ownedNotes,
      sourceUrl:        args.sourceUrl,
      pdfLinks:         args.pdfLinks,
      sourcesRaw:       args.sourcesRaw,
      sourceUrls:       args.sourceUrls,
      sourceDocs:       args.sourceDocs,
      status:           'live',
      publishedAt:      Date.now(),
      verified:         false,
    })
    // Auto-generate human-readable device code from the Convex ID
    const deviceCode = makeDeviceCode(args.manufacturer, args.model, String(id))
    await ctx.db.patch(id, { deviceCode })
    return { id: String(id), deviceCode }
  },
})

/**
 * Bulk-insert devices from a parsed CSV/Excel upload.
 * Devices are inserted with status='pending_review' and verified=false.
 * Each row must have manufacturer, model, deviceType, mriStatus at minimum.
 */
export const bulkInsertDevices = mutation({
  args: {
    devices: v.array(v.object({
      name:             v.string(),
      manufacturer:     v.string(),
      model:            v.string(),
      deviceType:       v.string(),
      classification:   v.optional(v.union(v.literal('active'), v.literal('passive'), v.literal('legacy'))),
      mriStatus:        v.union(v.literal('conditional'), v.literal('safe'), v.literal('unsafe'), v.literal('unknown')),
      fieldStrengths:   v.optional(v.string()),
      sarLimit:         v.optional(v.string()),
      b1RmsLimit:       v.optional(v.string()),
      slewRateLimit:    v.optional(v.string()),
      gradientLimit:    v.optional(v.string()),
      maxScanTime:      v.optional(v.string()),
      contraindications:v.optional(v.string()),
      sourceUrl:        v.optional(v.string()),
      notes:            v.optional(v.string()),
    })),
    submitterName:  v.string(),
    submitterTitle: v.string(),
    source:         v.optional(v.string()), // 'admin' | 'manufacturer'
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) throw new Error('Not authenticated')
    const user = await ctx.db.query('users').withIndex('by_clerk', q => q.eq('clerkId', identity.subject)).unique()
    if (!user || !['admin', 'manufacturer'].includes(user.role)) throw new Error('Insufficient permissions')

    const now = Date.now()
    const ids: string[] = []
    for (const d of args.devices) {
      const id = await ctx.db.insert('devices', {
        manufacturer:      d.manufacturer,
        model:             d.model,
        deviceType:        d.deviceType,
        classification:    d.classification ?? 'active',
        mriStatus:         d.mriStatus,
        fieldStrengths:    d.fieldStrengths,
        sarLimit:          d.sarLimit,
        b1RmsLimit:        d.b1RmsLimit,
        slewRateLimit:     d.slewRateLimit,
        gradientLimit:     d.gradientLimit,
        maxScanTime:       d.maxScanTime,
        contraindications: d.contraindications,
        oem_ownedNotes:    d.notes,
        status:            'pending_review',
        verified:          false,
        publishedAt:       now,
      })
      ids.push(String(id))
    }
    return { inserted: ids.length }
  },
})

/** Get a single device with a count of patients currently linked to it. */
export const getDeviceWithUsage = query({
  args: { id: v.id('devices') },
  handler: async (ctx, args) => {
    const device = await ctx.db.get(args.id)
    if (!device) return null
    const links = await ctx.db
      .query('patientDevices')
      .withIndex('by_device', (q) => q.eq('deviceId', args.id))
      .filter((q) => q.eq(q.field('status'), 'active'))
      .collect()
    return { ...device, patientCount: links.length }
  },
})

/** Update the MRI status (and optional recall flags) for a device. */
export const updateDeviceMriStatus = mutation({
  args: {
    id:          v.id('devices'),
    mriStatus:   v.union(v.literal('conditional'), v.literal('safe'), v.literal('unsafe'), v.literal('unknown')),
    recalled:    v.optional(v.boolean()),
    recallNotes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, {
      mriStatus:   args.mriStatus,
      recalled:    args.recalled,
      recallNotes: args.recallNotes,
    })
  },
})

/** Full device update (master admin). Accepts any subset of editable fields. */
export const updateDevice = mutation({
  args: {
    id:               v.id('devices'),
    manufacturer:     v.optional(v.string()),
    model:            v.optional(v.string()),
    deviceType:       v.optional(v.string()),
    classification:   v.optional(v.union(v.literal('active'), v.literal('passive'), v.literal('legacy'))),
    mriStatus:        v.optional(v.union(v.literal('conditional'), v.literal('safe'), v.literal('unsafe'), v.literal('unknown'))),
    fieldStrengths:   v.optional(v.string()),
    sarLimit:         v.optional(v.string()),
    b1RmsLimit:       v.optional(v.string()),
    slewRateLimit:    v.optional(v.string()),
    gradientLimit:    v.optional(v.string()),
    maxScanTime:      v.optional(v.string()),
    contraindications:v.optional(v.string()),
    approvedRegions:  v.optional(v.array(v.string())),
    sourceUrls:       v.optional(v.array(v.object({ url: v.string(), label: v.optional(v.string()) }))),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) throw new Error('Not authenticated')
    const user = await ctx.db.query('users').withIndex('by_clerk', q => q.eq('clerkId', identity.subject)).unique()
    if (!user || user.role !== 'admin') throw new Error('Admin access required')

    const { id, ...fields } = args
    // Filter out undefined so we don't overwrite with undefined
    const patch: Record<string, unknown> = {}
    for (const [k, val] of Object.entries(fields)) {
      if (val !== undefined) patch[k] = val
    }
    await ctx.db.patch(id, patch)
  },
})

/**
 * Delete a device. Only allowed when zero patients are linked (active OR historical).
 * Admin-only.
 */
export const deleteDevice = mutation({
  args: { id: v.id('devices') },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) throw new Error('Not authenticated')
    const user = await ctx.db.query('users').withIndex('by_clerk', q => q.eq('clerkId', identity.subject)).unique()
    if (!user || user.role !== 'admin') throw new Error('Admin access required')

    // Reject if any patient record (active or historical) references this device
    const links = await ctx.db
      .query('patientDevices')
      .withIndex('by_device', (q) => q.eq('deviceId', args.id))
      .take(1)
    if (links.length > 0) {
      throw new Error('Cannot delete: one or more patient records are linked to this device.')
    }

    await ctx.db.delete(args.id)
  },
})

/**
 * Get a device by its deviceCode slug (e.g. "DID-MDTAZU-J7K2") OR Convex ID.
 * Used for slug-based routing so URLs are human-readable.
 */
export const getDeviceBySlug = query({
  args: { slug: v.string() },
  handler: async (ctx, args) => {
    if (args.slug.startsWith('DID-')) {
      const d = await ctx.db.query('devices')
        .withIndex('by_device_code', (q) => q.eq('deviceCode', args.slug))
        .unique()
      if (d) return d
    }
    // Fallback: treat as Convex _id (handles old bookmarks / devices without a code)
    try { return await ctx.db.get(args.slug as Id<'devices'>) } catch { return null }
  },
})

/**
 * Same as getDeviceWithUsage but resolves by slug first, then Convex ID.
 * Used by DeviceDetailClient so the URL can be /master/devices/DID-MDTAZU-J7K2.
 */
export const getDeviceWithUsageBySlug = query({
  args: { slug: v.string() },
  handler: async (ctx, args) => {
    let device = null
    if (args.slug.startsWith('DID-')) {
      device = await ctx.db.query('devices')
        .withIndex('by_device_code', (q) => q.eq('deviceCode', args.slug))
        .unique()
    }
    if (!device) {
      try { device = await ctx.db.get(args.slug as Id<'devices'>) } catch { /* invalid id */ }
    }
    if (!device) return null
    const links = await ctx.db
      .query('patientDevices')
      .withIndex('by_device', (q) => q.eq('deviceId', device._id))
      .filter((q) => q.eq(q.field('status'), 'active'))
      .collect()
    return { ...device, patientCount: links.length }
  },
})

/** Total count of published (non-draft) devices in the library. */
export const getDeviceCount = query({
  args: {},
  handler: async (ctx) => {
    const devices = await ctx.db
      .query('devices')
      .filter((q) => q.neq(q.field('status'), 'draft'))
      .collect()
    return devices.length
  },
})
