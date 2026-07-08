import { mutation, query } from './_generated/server'
import { v }               from 'convex/values'

// ── Shared condition args ──────────────────────────────────────────────────────

const CONDITION_ARGS = {
  parentId:                  v.string(),
  zoneLabel:                 v.optional(v.string()),
  landmark:                  v.optional(v.string()),
  fieldStrength:             v.optional(v.string()),
  maxSarWb:                  v.optional(v.string()),
  maxB1Rms:                  v.optional(v.string()),
  qualifierText:             v.optional(v.string()),
  qualifierDeviceIds:        v.optional(v.array(v.string())),
  mriClassification:         v.optional(v.string()),
  notes:                     v.optional(v.string()),
  eligibilityTier:           v.optional(v.string()),
  tierPrecondition:          v.optional(v.string()),
  deviceIntegrityState:      v.optional(v.string()),
  contextStatus:             v.optional(v.string()),
  boreTypeRequired:          v.optional(v.string()),
  fieldOrientationRequired:  v.optional(v.string()),
  transmitCoilType:          v.optional(v.string()),
  implantLocationCond:       v.optional(v.string()),
  operatingMode:             v.optional(v.string()),
  rfExcitationMode:          v.optional(v.string()),
  maxSpatialGradientCond:    v.optional(v.number()),
  maxSlewRateCond:           v.optional(v.number()),
  maxDbDt:                   v.optional(v.number()),
  maxSarWhole:               v.optional(v.number()),
  maxSarHead:                v.optional(v.number()),
  maxB1RmsVal:               v.optional(v.number()),
  exclusionZoneApplies:      v.optional(v.boolean()),
  exclusionZoneDescription:  v.optional(v.string()),
  isocentreRestriction:      v.optional(v.string()),
  maxScanTimeMins:           v.optional(v.number()),
  scanTimeWindowMins:        v.optional(v.number()),
  cooloffPeriodMins:         v.optional(v.number()),
  patientPreconditions:      v.optional(v.string()),
  regionScope:               v.optional(v.string()),
  regionPermitted:           v.optional(v.string()),
  regionExcluded:            v.optional(v.string()),
  patientWeightBand:         v.optional(v.string()),
  serialNumberRange:         v.optional(v.string()),
  serialNote:                v.optional(v.string()),
  requiresVisualReview:      v.optional(v.boolean()),
  visualExtractionNotes:     v.optional(v.string()),
  verificationStatus:        v.optional(v.string()),
  sourceType:                v.optional(v.string()),
  docId:                     v.optional(v.string()),
  conditionNotes:            v.optional(v.string()),
  zoneIndex:                 v.optional(v.number()),
}

// ── Queries ───────────────────────────────────────────────────────────────────

/** All conditions for a device, sorted by zoneIndex then fieldStrength. */
export const listConditionsByDevice = query({
  args: { parentId: v.string() },
  handler: async (ctx, args) => {
    const rows = await ctx.db
      .query('deviceConditions')
      .withIndex('by_parent', (q) => q.eq('parentId', args.parentId))
      .collect()
    return rows.sort((a, b) => {
      const zi = (a.zoneIndex ?? 999) - (b.zoneIndex ?? 999)
      if (zi !== 0) return zi
      return (a.fieldStrength ?? '').localeCompare(b.fieldStrength ?? '')
    })
  },
})

/** Resolver-optimised: conditions for a parent at a specific field strength. */
export const listConditionsByParentAndFs = query({
  args: { parentId: v.string(), fieldStrength: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query('deviceConditions')
      .withIndex('by_parent_and_field_strength', (q) =>
        q.eq('parentId', args.parentId).eq('fieldStrength', args.fieldStrength)
      )
      .collect()
  },
})

/** Single condition fetch. */
export const getConditionById = query({
  args: { id: v.id('deviceConditions') },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id)
  },
})

// ── Mutations ─────────────────────────────────────────────────────────────────

function isAdmin(role: string) {
  return role === 'admin'
}

async function requireAdmin(ctx: { auth: { getUserIdentity(): Promise<{ subject: string } | null> }, db: { query(t: 'users'): { withIndex(n: string, fn: (q: never) => never): { unique(): Promise<{ role: string } | null> } } } }) {
  const identity = await ctx.auth.getUserIdentity()
  if (!identity) throw new Error('Not authenticated')
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const user = await (ctx.db as any)
    .query('users')
    .withIndex('by_clerk', (q: never) => (q as { eq(f: string, v: string): unknown }).eq('clerkId', identity.subject))
    .unique()
  if (!user || !isAdmin(user.role)) throw new Error('Admin access required')
  return user
}

/** Admin: create a new condition row. */
export const createCondition = mutation({
  args: CONDITION_ARGS,
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) throw new Error('Not authenticated')
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const user = await (ctx.db as any).query('users').withIndex('by_clerk', (q: any) => q.eq('clerkId', identity.subject)).unique()
    if (!user || user.role !== 'admin') throw new Error('Admin access required')
    return await ctx.db.insert('deviceConditions', args)
  },
})

/** Admin: update any fields on an existing condition. */
export const updateCondition = mutation({
  args: { id: v.id('deviceConditions'), ...CONDITION_ARGS },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) throw new Error('Not authenticated')
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const user = await (ctx.db as any).query('users').withIndex('by_clerk', (q: any) => q.eq('clerkId', identity.subject)).unique()
    if (!user || user.role !== 'admin') throw new Error('Admin access required')
    const { id, ...fields } = args
    await ctx.db.patch(id, fields)
  },
})

/** Admin: delete a condition row. */
export const deleteCondition = mutation({
  args: { id: v.id('deviceConditions') },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) throw new Error('Not authenticated')
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const user = await (ctx.db as any).query('users').withIndex('by_clerk', (q: any) => q.eq('clerkId', identity.subject)).unique()
    if (!user || user.role !== 'admin') throw new Error('Admin access required')
    await ctx.db.delete(args.id)
  },
})

/**
 * Admin: bulk-import conditions from an array of objects.
 * Processes up to 50 rows per call — call repeatedly for larger batches.
 */
export const bulkImportConditions = mutation({
  args: {
    conditions: v.array(v.object(CONDITION_ARGS)),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) throw new Error('Not authenticated')
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const user = await (ctx.db as any).query('users').withIndex('by_clerk', (q: any) => q.eq('clerkId', identity.subject)).unique()
    if (!user || user.role !== 'admin') throw new Error('Admin access required')
    if (args.conditions.length > 50) throw new Error('Maximum 50 conditions per bulk import call')
    const ids = await Promise.all(
      args.conditions.map((c) => ctx.db.insert('deviceConditions', c))
    )
    return { inserted: ids.length, ids }
  },
})
