import { mutation, query } from './_generated/server'
import { v }               from 'convex/values'

// ── Queries ───────────────────────────────────────────────────────────────────

/** Active coils for a clinic — used by the matrix scanner/coil picker. */
export const listCoilsBySite = query({
  args: { siteId: v.id('clinics') },
  handler: async (ctx, args) => {
    return await ctx.db
      .query('siteCoils')
      .withIndex('by_site_id_and_status', (q) =>
        q.eq('siteId', args.siteId).eq('status', 'active')
      )
      .collect()
  },
})

/** All coils (active + retired) for a clinic — for the management page. */
export const listAllCoilsBySite = query({
  args: { siteId: v.id('clinics') },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) return []
    return await ctx.db
      .query('siteCoils')
      .withIndex('by_site_id', (q) => q.eq('siteId', args.siteId))
      .collect()
  },
})

/** Coils compatible with a specific scanner (for resolver coil dropdown). */
export const listCoilsByScanner = query({
  args: { siteId: v.id('clinics'), scannerId: v.id('scanners') },
  handler: async (ctx, args) => {
    const allActive = await ctx.db
      .query('siteCoils')
      .withIndex('by_site_id_and_status', (q) =>
        q.eq('siteId', args.siteId).eq('status', 'active')
      )
      .collect()
    return allActive.filter((c) => c.compatibleScannerIds.includes(args.scannerId))
  },
})

/** Single coil fetch — used by the matrix resolver. */
export const getCoilById = query({
  args: { id: v.id('siteCoils') },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id)
  },
})

/** Admin: all coils across all clinics with pagination. */
export const listAllCoils = query({
  args: {
    paginationOpts: v.object({
      numItems: v.number(),
      cursor: v.union(v.string(), v.null()),
    }),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) return { page: [], isDone: true, continueCursor: '' }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const user = await (ctx.db as any).query('users').withIndex('by_clerk', (q: any) => q.eq('clerkId', identity.subject)).unique()
    if (!user || user.role !== 'admin') return { page: [], isDone: true, continueCursor: '' }
    return await ctx.db.query('siteCoils').paginate(args.paginationOpts)
  },
})

// ── Auth helpers ──────────────────────────────────────────────────────────────

async function getCallerClinicId(ctx: { auth: { getUserIdentity(): Promise<{ subject: string } | null> }, db: never }) {
  const identity = await (ctx.auth as { getUserIdentity(): Promise<{ subject: string } | null> }).getUserIdentity()
  if (!identity) throw new Error('Not authenticated')
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = ctx.db as any
  const user = await db.query('users').withIndex('by_clerk', (q: any) => q.eq('clerkId', identity.subject)).unique()
  if (!user) throw new Error('User not found')
  const staff = await db.query('staff').withIndex('by_user', (q: any) => q.eq('userId', user._id)).first()
  if (!staff) throw new Error('Not a clinic staff member')
  return { user, staff, clinicId: staff.clinicId }
}

// ── Mutations ─────────────────────────────────────────────────────────────────

const COIL_ARGS = {
  coilDisplayName:      v.string(),
  coilType:             v.string(),
  fieldStrength:        v.string(),
  compatibleScannerIds: v.array(v.id('scanners')),
  txCapable:            v.boolean(),
  rxCapable:            v.boolean(),
  channelCount:         v.optional(v.number()),
  manufacturer:         v.optional(v.string()),
  modelNumber:          v.optional(v.string()),
  entryDate:            v.optional(v.string()),
  notes:                v.optional(v.string()),
}

/**
 * Clinic admin or platform admin: register a new coil at a site.
 * Enforces S-3 calibration rule: all compatible scanners must match the coil's field strength.
 */
export const addCoil = mutation({
  args: { siteId: v.id('clinics'), ...COIL_ARGS },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) throw new Error('Not authenticated')
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = ctx.db as any
    const user = await db.query('users').withIndex('by_clerk', (q: any) => q.eq('clerkId', identity.subject)).unique()
    if (!user) throw new Error('User not found')

    // Allow admin or clinic admin/staff for this site
    if (user.role !== 'admin') {
      const staff = await db.query('staff').withIndex('by_user', (q: any) => q.eq('userId', user._id)).first()
      if (!staff || staff.clinicId !== args.siteId) throw new Error('Access denied')
      if (staff.accessLevel !== 'admin') throw new Error('Clinic admin access required')
    }

    // S-3 calibration rule: all compatible scanners must match coil field strength
    for (const scannerId of args.compatibleScannerIds) {
      const scanner = await ctx.db.get(scannerId)
      if (scanner && scanner.fieldStrength !== args.fieldStrength) {
        throw new Error(
          `Scanner "${scanner.model}" is ${scanner.fieldStrength} but coil is ${args.fieldStrength}. Field strengths must match.`
        )
      }
    }

    const { siteId, ...fields } = args
    return await ctx.db.insert('siteCoils', {
      ...fields,
      siteId,
      status:      'active',
      recordState: 'Unconfirmed',
    })
  },
})

/** Clinic admin or platform admin: update coil details. */
export const updateCoil = mutation({
  args: { id: v.id('siteCoils'), ...COIL_ARGS },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) throw new Error('Not authenticated')
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = ctx.db as any
    const user = await db.query('users').withIndex('by_clerk', (q: any) => q.eq('clerkId', identity.subject)).unique()
    if (!user) throw new Error('User not found')

    const coil = await ctx.db.get(args.id)
    if (!coil) throw new Error('Coil not found')

    if (user.role !== 'admin') {
      const staff = await db.query('staff').withIndex('by_user', (q: any) => q.eq('userId', user._id)).first()
      if (!staff || staff.clinicId !== coil.siteId) throw new Error('Access denied')
      if (staff.accessLevel !== 'admin') throw new Error('Clinic admin access required')
    }

    // S-3 calibration rule
    for (const scannerId of args.compatibleScannerIds) {
      const scanner = await ctx.db.get(scannerId)
      if (scanner && scanner.fieldStrength !== args.fieldStrength) {
        throw new Error(
          `Scanner "${scanner.model}" is ${scanner.fieldStrength} but coil is ${args.fieldStrength}. Field strengths must match.`
        )
      }
    }

    const { id, ...fields } = args
    await ctx.db.patch(id, fields)
  },
})

/** Clinic admin or platform admin: retire a coil (no hard delete). */
export const retireCoil = mutation({
  args: { id: v.id('siteCoils') },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) throw new Error('Not authenticated')
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = ctx.db as any
    const user = await db.query('users').withIndex('by_clerk', (q: any) => q.eq('clerkId', identity.subject)).unique()
    if (!user) throw new Error('User not found')

    const coil = await ctx.db.get(args.id)
    if (!coil) throw new Error('Coil not found')

    if (user.role !== 'admin') {
      const staff = await db.query('staff').withIndex('by_user', (q: any) => q.eq('userId', user._id)).first()
      if (!staff || staff.clinicId !== coil.siteId) throw new Error('Access denied')
      if (staff.accessLevel !== 'admin') throw new Error('Clinic admin access required')
    }

    await ctx.db.patch(args.id, { status: 'retired' })
  },
})

/** Clinic admin or platform admin: confirm a coil record. */
export const confirmCoil = mutation({
  args: { id: v.id('siteCoils') },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) throw new Error('Not authenticated')
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = ctx.db as any
    const user = await db.query('users').withIndex('by_clerk', (q: any) => q.eq('clerkId', identity.subject)).unique()
    if (!user) throw new Error('User not found')

    const coil = await ctx.db.get(args.id)
    if (!coil) throw new Error('Coil not found')

    if (user.role !== 'admin') {
      const staff = await db.query('staff').withIndex('by_user', (q: any) => q.eq('userId', user._id)).first()
      if (!staff || staff.clinicId !== coil.siteId) throw new Error('Access denied')
      if (staff.accessLevel !== 'admin') throw new Error('Clinic admin access required')
    }

    await ctx.db.patch(args.id, { recordState: 'Confirmed' })
  },
})
