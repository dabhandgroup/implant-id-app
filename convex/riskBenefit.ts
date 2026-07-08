import { mutation, query } from './_generated/server'
import { v }               from 'convex/values'

// ── Queries ───────────────────────────────────────────────────────────────────

/** Patient's own RvB records (and records from clinics they've shared access with). */
export const listRvbByPatient = query({
  args: {
    patientId:      v.id('patients'),
    paginationOpts: v.object({ numItems: v.number(), cursor: v.union(v.string(), v.null()) }),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) return { page: [], isDone: true, continueCursor: '' }
    return await ctx.db
      .query('riskBenefitRecords')
      .withIndex('by_patient', (q) => q.eq('patientId', args.patientId))
      .order('desc')
      .paginate(args.paginationOpts)
  },
})

/** Clinic staff: all RvB records for their clinic. */
export const listRvbByClinic = query({
  args: {
    paginationOpts: v.object({ numItems: v.number(), cursor: v.union(v.string(), v.null()) }),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) return { page: [], isDone: true, continueCursor: '' }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = ctx.db as any
    const user = await db.query('users').withIndex('by_clerk', (q: any) => q.eq('clerkId', identity.subject)).unique()
    if (!user) return { page: [], isDone: true, continueCursor: '' }
    const staff = await db.query('staff').withIndex('by_user', (q: any) => q.eq('userId', user._id)).first()
    if (!staff) return { page: [], isDone: true, continueCursor: '' }

    return await ctx.db
      .query('riskBenefitRecords')
      .withIndex('by_clinic', (q) => q.eq('clinicId', staff.clinicId))
      .order('desc')
      .paginate(args.paginationOpts)
  },
})

/** Single RvB record — clinic staff or admin. */
export const getRvbById = query({
  args: { id: v.id('riskBenefitRecords') },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) return null
    return await ctx.db.get(args.id)
  },
})

// ── Mutations ─────────────────────────────────────────────────────────────────

/**
 * Clinic staff: create a pre-scan risk-benefit record.
 * The resolution snapshot (matrix output) is passed in from the client
 * and frozen here — it is never re-computed.
 */
export const createRvbRecord = mutation({
  args: {
    patientId:               v.id('patients'),
    scannerId:               v.optional(v.id('scanners')),
    coilId:                  v.optional(v.id('siteCoils')),
    bodyRegion:              v.optional(v.string()),

    // Clinical decision
    indication:              v.string(),
    decision:                v.union(v.literal('Proceed'), v.literal('Do Not Proceed'), v.literal('Deferred')),
    reasonForProceeding:     v.optional(v.string()),

    // Sign-off
    clinicianName:           v.string(),
    clinicianRole:           v.string(),

    // Matrix resolution snapshot — passed from the client, frozen here
    resolvedOutcomeCache:    v.optional(v.string()),
    resolvedConditionIds:    v.optional(v.array(v.string())),
    resolvedConstraintsJson: v.optional(v.string()),
    resolutionTimestamp:     v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) throw new Error('Not authenticated')
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = ctx.db as any
    const user = await db.query('users').withIndex('by_clerk', (q: any) => q.eq('clerkId', identity.subject)).unique()
    if (!user) throw new Error('User not found')
    if (!['admin', 'clinic_staff', 'surgeon'].includes(user.role)) throw new Error('Access denied')

    const staff = await db.query('staff').withIndex('by_user', (q: any) => q.eq('userId', user._id)).first()
    if (!staff) throw new Error('Not a clinic staff member')

    const { patientId, ...fields } = args
    return await ctx.db.insert('riskBenefitRecords', {
      ...fields,
      patientId,
      clinicId:         staff.clinicId,
      staffId:          staff._id,
      clinicianSignedAt: Date.now(),
      createdAt:        Date.now(),
    })
  },
})

/** Clinic staff: add radiologist countersign to an existing RvB record. */
export const addRadiologistSign = mutation({
  args: {
    id:              v.id('riskBenefitRecords'),
    radiologistName: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) throw new Error('Not authenticated')
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = ctx.db as any
    const user = await db.query('users').withIndex('by_clerk', (q: any) => q.eq('clerkId', identity.subject)).unique()
    if (!user) throw new Error('User not found')
    if (!['admin', 'clinic_staff', 'surgeon'].includes(user.role)) throw new Error('Access denied')

    await ctx.db.patch(args.id, {
      radiologistName:    args.radiologistName,
      radiologistSignedAt: Date.now(),
    })
  },
})

/** Link a scan event to an existing RvB record (called after scan event creation). */
export const linkToScanEvent = mutation({
  args: {
    rvbId:       v.id('riskBenefitRecords'),
    scanEventId: v.id('scanEvents'),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) throw new Error('Not authenticated')
    await ctx.db.patch(args.rvbId, { linkedScanEventId: args.scanEventId })
  },
})
