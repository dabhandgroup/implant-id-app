import { mutation, query } from './_generated/server'
import { v }              from 'convex/values'

/** List all devices in the catalogue, ordered by creation time ascending. */
export const listDevices = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    return ctx.db
      .query('devices')
      .order('asc')
      .take(args.limit ?? 200)
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
    manufacturer:     v.string(),
    model:            v.string(),
    deviceType:       v.string(),
    classification:   v.union(v.literal('active'), v.literal('passive'), v.literal('legacy')),
    mriStatus:        v.union(v.literal('conditional'), v.literal('safe'), v.literal('unsafe'), v.literal('unknown')),
    fieldStrengths:   v.optional(v.string()),
    sarLimit:         v.optional(v.string()),
    b1RmsLimit:       v.optional(v.string()),
    contraindications: v.optional(v.string()),
    approvedRegions:  v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    return ctx.db.insert('devices', {
      manufacturer:     args.manufacturer,
      model:            args.model,
      deviceType:       args.deviceType,
      classification:   args.classification,
      mriStatus:        args.mriStatus,
      fieldStrengths:   args.fieldStrengths,
      sarLimit:         args.sarLimit,
      b1RmsLimit:       args.b1RmsLimit,
      contraindications: args.contraindications,
      approvedRegions:  args.approvedRegions,
      verified:         false,
    })
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
