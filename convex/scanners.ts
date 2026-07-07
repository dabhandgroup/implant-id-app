import { mutation, query } from './_generated/server'
import { v }               from 'convex/values'

// ── Queries ───────────────────────────────────────────────────────────────────

/** All approved scanners — used by clinic pickers (no auth required). */
export const listApprovedScanners = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db
      .query('scanners')
      .withIndex('by_status', (q) => q.eq('status', 'approved'))
      .collect()
  },
})

/** Admin: list all scanners, optionally filtered by status. */
export const listScanners = query({
  args: {
    status: v.optional(v.union(
      v.literal('approved'),
      v.literal('pending'),
      v.literal('rejected'),
    )),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) return []
    const user = await ctx.db
      .query('users')
      .withIndex('by_clerk', (q) => q.eq('clerkId', identity.subject))
      .unique()
    if (!user || user.role !== 'admin') return []

    if (args.status) {
      return await ctx.db
        .query('scanners')
        .withIndex('by_status', (q) => q.eq('status', args.status!))
        .order('desc')
        .collect()
    }
    return await ctx.db.query('scanners').order('desc').collect()
  },
})

/** Get a scanner by ID. */
export const getScannerById = query({
  args: { id: v.id('scanners') },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id)
  },
})

/** Get scanners linked to the authenticated clinic. */
export const getMyClinicScanners = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) return []
    const user = await ctx.db
      .query('users')
      .withIndex('by_clerk', (q) => q.eq('clerkId', identity.subject))
      .unique()
    if (!user) return []
    const staffRow = await ctx.db
      .query('staff')
      .withIndex('by_user', (q) => q.eq('userId', user._id))
      .first()
    if (!staffRow) return []
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const clinic = await ctx.db.get(staffRow.clinicId) as any
    if (!clinic) return []
    const ids: string[] = clinic.scannerIds ?? []
    const scanners = await Promise.all(ids.map((id) => ctx.db.get(id as never)))
    return scanners.filter(Boolean)
  },
})

// ── Mutations ─────────────────────────────────────────────────────────────────

const SCANNER_ARGS = {
  manufacturer:       v.string(),
  model:              v.string(),
  fieldStrength:      v.string(),
  scannerType:        v.string(),
  boreDiameter:       v.optional(v.number()),
  maxSpatialGradient: v.optional(v.number()),
  notes:              v.optional(v.string()),
}

/** Admin: add a scanner directly as approved. */
export const addScanner = mutation({
  args: SCANNER_ARGS,
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) throw new Error('Not authenticated')
    const user = await ctx.db
      .query('users')
      .withIndex('by_clerk', (q) => q.eq('clerkId', identity.subject))
      .unique()
    if (!user || user.role !== 'admin') throw new Error('Admin access required')

    return await ctx.db.insert('scanners', {
      ...args,
      status:      'approved',
      submittedAt: Date.now(),
    })
  },
})

/** Admin: update scanner details. */
export const updateScanner = mutation({
  args: { id: v.id('scanners'), ...SCANNER_ARGS },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) throw new Error('Not authenticated')
    const user = await ctx.db
      .query('users')
      .withIndex('by_clerk', (q) => q.eq('clerkId', identity.subject))
      .unique()
    if (!user || user.role !== 'admin') throw new Error('Admin access required')

    const { id, ...fields } = args
    await ctx.db.patch(id, fields)
  },
})

/** Clinic staff: submit a new scanner for admin approval. */
export const submitScanner = mutation({
  args: SCANNER_ARGS,
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) throw new Error('Not authenticated')
    const user = await ctx.db
      .query('users')
      .withIndex('by_clerk', (q) => q.eq('clerkId', identity.subject))
      .unique()
    if (!user) throw new Error('User not found')
    const staffRow = await ctx.db
      .query('staff')
      .withIndex('by_user', (q) => q.eq('userId', user._id))
      .first()

    return await ctx.db.insert('scanners', {
      ...args,
      status:              'pending',
      submittedByClinicId: staffRow?.clinicId,
      submittedAt:         Date.now(),
    })
  },
})

/** Unauthenticated submit — used during clinic onboarding (before staff row exists). */
export const submitScannerDuringOnboarding = mutation({
  args: SCANNER_ARGS,
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) throw new Error('Not authenticated — please sign in')

    return await ctx.db.insert('scanners', {
      ...args,
      status:      'pending',
      submittedAt: Date.now(),
    })
  },
})

/** Admin: approve a pending scanner submission. */
export const approveScanner = mutation({
  args: { id: v.id('scanners') },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) throw new Error('Not authenticated')
    const user = await ctx.db
      .query('users')
      .withIndex('by_clerk', (q) => q.eq('clerkId', identity.subject))
      .unique()
    if (!user || user.role !== 'admin') throw new Error('Admin access required')

    const scanner = await ctx.db.get(args.id)
    if (!scanner) throw new Error('Scanner not found')

    await ctx.db.patch(args.id, { status: 'approved', reviewedAt: Date.now() })

    // If submitted by a clinic, automatically link the scanner to that clinic
    if (scanner.submittedByClinicId) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const clinic = await ctx.db.get(scanner.submittedByClinicId) as any
      if (clinic) {
        const existing: string[] = clinic.scannerIds ?? []
        if (!existing.includes(args.id)) {
          await ctx.db.patch(scanner.submittedByClinicId, {
            scannerIds: [...existing, args.id],
          } as never)
        }
      }
    }
  },
})

/** Admin: reject a pending scanner submission. */
export const rejectScanner = mutation({
  args: { id: v.id('scanners'), notes: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) throw new Error('Not authenticated')
    const user = await ctx.db
      .query('users')
      .withIndex('by_clerk', (q) => q.eq('clerkId', identity.subject))
      .unique()
    if (!user || user.role !== 'admin') throw new Error('Admin access required')

    await ctx.db.patch(args.id, {
      status:      'rejected',
      reviewedAt:  Date.now(),
      reviewNotes: args.notes,
    })
  },
})

/** Admin: permanently delete a scanner. */
export const deleteScanner = mutation({
  args: { id: v.id('scanners') },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) throw new Error('Not authenticated')
    const user = await ctx.db
      .query('users')
      .withIndex('by_clerk', (q) => q.eq('clerkId', identity.subject))
      .unique()
    if (!user || user.role !== 'admin') throw new Error('Admin access required')

    await ctx.db.delete(args.id)
  },
})

/** Clinic staff: add an approved scanner to their clinic. */
export const addScannerToClinic = mutation({
  args: { scannerId: v.id('scanners') },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) throw new Error('Not authenticated')
    const user = await ctx.db
      .query('users')
      .withIndex('by_clerk', (q) => q.eq('clerkId', identity.subject))
      .unique()
    if (!user) throw new Error('User not found')
    const staffRow = await ctx.db
      .query('staff')
      .withIndex('by_user', (q) => q.eq('userId', user._id))
      .first()
    if (!staffRow) throw new Error('Not a clinic staff member')

    const scanner = await ctx.db.get(args.scannerId)
    if (!scanner || scanner.status !== 'approved') throw new Error('Scanner not found or not yet approved')

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const clinic = await ctx.db.get(staffRow.clinicId) as any
    if (!clinic) throw new Error('Clinic not found')
    const existing: string[] = clinic.scannerIds ?? []
    if (existing.includes(args.scannerId)) return
    await ctx.db.patch(staffRow.clinicId, { scannerIds: [...existing, args.scannerId] } as never)
  },
})

/** Clinic staff: remove a scanner from their clinic. */
export const removeScannerFromClinic = mutation({
  args: { scannerId: v.id('scanners') },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) throw new Error('Not authenticated')
    const user = await ctx.db
      .query('users')
      .withIndex('by_clerk', (q) => q.eq('clerkId', identity.subject))
      .unique()
    if (!user) throw new Error('User not found')
    const staffRow = await ctx.db
      .query('staff')
      .withIndex('by_user', (q) => q.eq('userId', user._id))
      .first()
    if (!staffRow) throw new Error('Not a clinic staff member')

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const clinic = await ctx.db.get(staffRow.clinicId) as any
    if (!clinic) throw new Error('Clinic not found')
    const existing: string[] = clinic.scannerIds ?? []
    await ctx.db.patch(staffRow.clinicId, {
      scannerIds: existing.filter((id) => id !== args.scannerId),
    } as never)
  },
})

