import { mutation, query, internalMutation } from './_generated/server'
import { internal }         from './_generated/api'
import { v }                from 'convex/values'
import type { Id }          from './_generated/dataModel'

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
    const rows = await ctx.db
      .query('devices')
      .withIndex('by_status', (q) => q.eq('status', 'live'))
      .order('asc')
      .take(args.limit ?? 500)
    return rows.filter((d) => d.verified === true)
  },
})

/** List all devices regardless of status (master admin only), excluding trash. */
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
    const all = await ctx.db
      .query('devices')
      .order('desc')
      .take(args.limit ?? 200)
    return all.filter((d) => d.status !== 'trash')
  },
})

/** List devices in trash (master admin only). */
export const listTrashDevices = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) return []
    const user = await ctx.db.query('users').withIndex('by_clerk', q => q.eq('clerkId', identity.subject)).unique()
    if (!user || user.role !== 'admin') return []
    return ctx.db
      .query('devices')
      .withIndex('by_status', (q) => q.eq('status', 'trash'))
      .order('desc')
      .take(200)
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
    const isAdmin = user.role === 'admin'

    // Manufacturer: look up record for submittedByManufacturerId + email notification
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let mfrRecord: any = null
    if (!isAdmin) {
      mfrRecord = await ctx.db
        .query('manufacturers')
        .filter(q => q.eq(q.field('contactEmail'), user.email ?? ''))
        .first()
    }

    const ids: string[] = []
    for (const d of args.devices) {
      const id = await ctx.db.insert('devices', {
        manufacturer:             d.manufacturer,
        model:                    d.model,
        deviceType:               d.deviceType,
        classification:           d.classification ?? 'active',
        mriStatus:                d.mriStatus,
        fieldStrengths:           d.fieldStrengths,
        sarLimit:                 d.sarLimit,
        b1RmsLimit:               d.b1RmsLimit,
        slewRateLimit:            d.slewRateLimit,
        gradientLimit:            d.gradientLimit,
        maxScanTime:              d.maxScanTime,
        contraindications:        d.contraindications,
        oem_ownedNotes:           d.notes,
        sourceUrl:                d.sourceUrl,
        status:                   isAdmin ? 'live' : 'pending_review',
        verified:                 isAdmin,
        publishedAt:              now,
        ...(mfrRecord ? { submittedByManufacturerId: mfrRecord._id } : {}),
      })
      ids.push(String(id))
    }

    // Email: bulk pending notification for manufacturer
    if (!isAdmin && mfrRecord) {
      await ctx.scheduler.runAfter(0, internal.email.sendDeviceBulkPendingEmail, {
        contactName:  mfrRecord.contactName,
        contactEmail: mfrRecord.contactEmail,
        companyName:  mfrRecord.companyName,
        count:        ids.length,
      })
    }

    return { inserted: ids.length }
  },
})

/** Admin: immediately publish a pending-review device. */
export const approvePendingDevice = mutation({
  args: { id: v.id('devices') },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) throw new Error('Not authenticated')
    const user = await ctx.db.query('users').withIndex('by_clerk', q => q.eq('clerkId', identity.subject)).unique()
    if (!user || user.role !== 'admin') throw new Error('Admin access required')
    await ctx.db.patch(args.id, { status: 'live', verified: true })
  },
})

/**
 * Cancel a pending-review device: admin can cancel any, manufacturer can cancel only their own.
 * Returns the device to draft so the submitter can edit and re-submit.
 */
export const cancelPendingDevice = mutation({
  args: { id: v.id('devices') },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) throw new Error('Not authenticated')
    const user = await ctx.db.query('users').withIndex('by_clerk', q => q.eq('clerkId', identity.subject)).unique()
    if (!user || !['admin', 'manufacturer'].includes(user.role)) throw new Error('Insufficient permissions')

    const device = await ctx.db.get(args.id)
    if (!device) throw new Error('Device not found')
    if (device.status !== 'pending_review') throw new Error('Device is not pending review')

    if (user.role === 'manufacturer') {
      const mfr = await ctx.db.query('manufacturers').filter(q => q.eq(q.field('contactEmail'), user.email ?? '')).first()
      if (!mfr || device.manufacturer !== mfr.companyName) throw new Error('Not authorised to cancel this device')
    }

    await ctx.db.patch(args.id, { status: 'draft', verified: false })
  },
})

/** Cron target: auto-publish pending devices older than 24 hours. */
export const autoPublishPendingDevices = internalMutation({
  args: {},
  handler: async (ctx) => {
    const cutoff = Date.now() - 24 * 60 * 60 * 1000
    const pending = await ctx.db
      .query('devices')
      .withIndex('by_status', q => q.eq('status', 'pending_review'))
      .collect()

    // Collect published devices grouped by manufacturer for batch live emails
    type MfrGroup = { contactName: string; contactEmail: string; companyName: string; deviceNames: string[] }
    const byMfr = new Map<string, MfrGroup>()

    let published = 0
    for (const d of pending) {
      if (d._creationTime <= cutoff) {
        await ctx.db.patch(d._id, { status: 'live', verified: true })
        published++

        if (d.submittedByManufacturerId) {
          const key = String(d.submittedByManufacturerId)
          if (!byMfr.has(key)) {
            const mfr = await ctx.db.get(d.submittedByManufacturerId)
            if (mfr) {
              byMfr.set(key, {
                contactName: mfr.contactName,
                contactEmail: mfr.contactEmail,
                companyName: mfr.companyName,
                deviceNames: [],
              })
            }
          }
          byMfr.get(key)?.deviceNames.push(`${d.manufacturer} ${d.model}`)
        }
      }
    }

    // Schedule one live email per manufacturer (batched)
    for (const group of byMfr.values()) {
      await ctx.scheduler.runAfter(0, internal.email.sendDeviceLiveEmail, {
        contactName:  group.contactName,
        contactEmail: group.contactEmail,
        companyName:  group.companyName,
        deviceNames:  group.deviceNames,
      })
    }

    return { published }
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
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) throw new Error('Not authenticated')
    const user = await ctx.db.query('users').withIndex('by_clerk', q => q.eq('clerkId', identity.subject)).first()
    if (!user || user.role !== 'admin') throw new Error('Admin access required')
    await ctx.db.patch(args.id, {
      mriStatus:   args.mriStatus,
      recalled:    args.recalled,
      recallNotes: args.recallNotes,
    })
    if (args.recalled === true) {
      await ctx.scheduler.runAfter(0, internal.devices.sendRecallNotifications, {
        deviceId:    args.id,
        recallNotes: args.recallNotes ?? '',
      })
    }
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

/** Move a device to trash — removes from all public views. Safe even if patients are linked. */
export const moveDeviceToTrash = mutation({
  args: { id: v.id('devices') },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) throw new Error('Not authenticated')
    const user = await ctx.db.query('users').withIndex('by_clerk', q => q.eq('clerkId', identity.subject)).unique()
    if (!user || user.role !== 'admin') throw new Error('Admin access required')
    await ctx.db.patch(args.id, { status: 'trash' })
  },
})

/** Restore a trashed device back to its previous status (live). */
export const restoreDevice = mutation({
  args: { id: v.id('devices') },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) throw new Error('Not authenticated')
    const user = await ctx.db.query('users').withIndex('by_clerk', q => q.eq('clerkId', identity.subject)).unique()
    if (!user || user.role !== 'admin') throw new Error('Admin access required')
    const device = await ctx.db.get(args.id)
    if (!device || device.status !== 'trash') throw new Error('Device is not in trash')
    await ctx.db.patch(args.id, { status: 'live' })
  },
})

/** Permanently delete a trashed device. Cascades patientDevices links. */
export const permanentlyDeleteDevice = mutation({
  args: { id: v.id('devices') },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) throw new Error('Not authenticated')
    const user = await ctx.db.query('users').withIndex('by_clerk', q => q.eq('clerkId', identity.subject)).unique()
    if (!user || user.role !== 'admin') throw new Error('Admin access required')
    const device = await ctx.db.get(args.id)
    if (!device || device.status !== 'trash') throw new Error('Device must be in trash before permanent deletion')
    // Cascade-delete all patient device links
    const links = await ctx.db
      .query('patientDevices')
      .withIndex('by_device', (q) => q.eq('deviceId', args.id))
      .collect()
    await Promise.all(links.map((l) => ctx.db.delete(l._id)))
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

/** Return the full list of patients linked to a device, for the master admin detail view. */
export const getPatientsForDevice = query({
  args: { deviceId: v.id('devices') },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) return []
    const user = await ctx.db.query('users').withIndex('by_clerk', q => q.eq('clerkId', identity.subject)).first()
    if (!user || user.role !== 'admin') return []

    const links = await ctx.db
      .query('patientDevices')
      .withIndex('by_device', q => q.eq('deviceId', args.deviceId))
      .filter(q => q.eq(q.field('status'), 'active'))
      .collect()

    const patients = await Promise.all(
      links.map(async (link) => {
        const p = await ctx.db.get(link.patientId)
        if (!p) return null
        return {
          _id:                p._id,
          firstName:          p.firstName,
          lastName:           p.lastName,
          implantIdCode:      p.implantIdCode,
          verificationStatus: p.verificationStatus,
          linkedAt:           link._creationTime,
        }
      })
    )
    return patients.filter(Boolean)
  },
})

/** Check which manufacturer+model pairs already exist in the catalogue (case-insensitive). */
export const findDuplicates = query({
  args: {
    pairs: v.array(v.object({ manufacturer: v.string(), model: v.string() })),
  },
  handler: async (ctx, args) => {
    if (args.pairs.length === 0) return []
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) return []
    const user = await ctx.db.query('users').withIndex('by_clerk', q => q.eq('clerkId', identity.subject)).unique()
    if (!user || user.role !== 'admin') return []

    const allDevices = await ctx.db.query('devices').collect()
    return args.pairs.map(pair => {
      const mfr = pair.manufacturer.toLowerCase().trim()
      const mod = pair.model.toLowerCase().trim()
      const match = allDevices.find(d =>
        d.manufacturer.toLowerCase().trim() === mfr &&
        d.model.toLowerCase().trim() === mod
      )
      return {
        manufacturer: pair.manufacturer,
        model: pair.model,
        exists: !!match,
        status: match?.status ?? null,
      }
    })
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

/** Maps Convex devices to the LibDevice shape expected by LibraryClient. */
export const listVerifiedLibraryDevices = query({
  args: {},
  handler: async (ctx) => {
    const rows = await ctx.db
      .query('devices')
      .withIndex('by_status', (q) => q.eq('status', 'live'))
      .order('asc')
      .take(500)

    const live = rows.filter((d) => d.verified === true && !d.recalled)

    function mriClassFromStatus(status: string): 'MR Conditional' | 'MR Safe' | 'MR Unsafe' {
      if (status === 'safe') return 'MR Safe'
      if (status === 'unsafe') return 'MR Unsafe'
      return 'MR Conditional'
    }

    function parseFieldStrength(fieldStrengths: string | undefined, target: '1.5' | '3'): boolean {
      if (!fieldStrengths) return false
      const lower = fieldStrengths.toLowerCase()
      return lower.includes(`${target}t`) || lower.includes(`${target}.0t`)
    }

    return live.map((d) => ({
      device_id:          d.deviceCode ?? (d._id as string),
      device_name:        d.deviceName ?? d.model,
      model_number:       d.modelNumber ?? d.model,
      device_type:        d.deviceType,
      component_role:     d.componentRole,
      mri_classification: (d.mriClassification as 'MR Conditional' | 'MR Safe' | 'MR Unsafe' | undefined)
                          ?? mriClassFromStatus(d.mriStatus),
      field_strength_1t5: d.fieldStrength1t5 ?? parseFieldStrength(d.fieldStrengths, '1.5'),
      field_strength_3t:  d.fieldStrength3t  ?? parseFieldStrength(d.fieldStrengths, '3'),
      manufacturer_id:    d.manufacturer,
      manufacturer_name:  d.manufacturer,
      _category:          d.classification,
    }))
  },
})

/** Internal: fan out recall notifications to all surgeons associated with patients who have this device. */
export const sendRecallNotifications = internalMutation({
  args: {
    deviceId:    v.id('devices'),
    recallNotes: v.string(),
  },
  handler: async (ctx, args) => {
    const device = await ctx.db.get(args.deviceId)
    if (!device) return

    const title = `Device recall: ${device.deviceName ?? device.model}`
    const body  = args.recallNotes
      ? `${device.manufacturer} has recalled this device. ${args.recallNotes}`
      : `${device.manufacturer} has recalled the ${device.deviceName ?? device.model}. Review affected patients immediately.`

    const patientDeviceLinks = await ctx.db
      .query('patientDevices')
      .withIndex('by_device', (q) => q.eq('deviceId', args.deviceId))
      .collect()

    const surgeonUserIds = new Set<string>()

    for (const link of patientDeviceLinks) {
      const patient = await ctx.db.get(link.patientId)
      if (!patient) continue

      // Self-reported surgeon on the patient record
      if (patient.selfReportedSurgeonUserId) {
        surgeonUserIds.add(patient.selfReportedSurgeonUserId as string)
      }

      // Surgeons at clinics with approved access to this patient
      const approvedRequests = await ctx.db
        .query('accessRequests')
        .withIndex('by_patient', (q) => q.eq('patientId', link.patientId))
        .filter((q) => q.eq(q.field('status'), 'approved'))
        .collect()

      for (const req of approvedRequests) {
        const surgeonStaff = await ctx.db
          .query('staff')
          .withIndex('by_clinic', (q) => q.eq('clinicId', req.clinicId))
          .filter((q) => q.eq(q.field('jobType'), 'surgeon'))
          .filter((q) => q.eq(q.field('status'), 'active'))
          .collect()

        for (const s of surgeonStaff) {
          surgeonUserIds.add(s.userId as string)
        }
      }
    }

    for (const userId of surgeonUserIds) {
      await ctx.db.insert('notifications', {
        userId:    userId as Id<'users'>,
        type:      'device_recall',
        title,
        body,
        read:      false,
        relatedId: args.deviceId as string,
        createdAt: Date.now(),
      })
    }
  },
})
