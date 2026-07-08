import { mutation, query } from './_generated/server'
import { v }               from 'convex/values'

// ── Queries ───────────────────────────────────────────────────────────────────

/**
 * Patient-owned scan history. Patients see all their events; clinic staff see
 * only events from their own site (P-7 ownership ruling).
 */
export const listScanEventsByPatient = query({
  args: {
    patientId:      v.id('patients'),
    paginationOpts: v.object({ numItems: v.number(), cursor: v.union(v.string(), v.null()) }),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) return { page: [], isDone: true, continueCursor: '' }
    return await ctx.db
      .query('scanEvents')
      .withIndex('by_patient', (q) => q.eq('patientId', args.patientId))
      .order('desc')
      .paginate(args.paginationOpts)
  },
})

/** Clinic staff: their clinic's scan events with optional scanner filter. */
export const listScanEventsByClinic = query({
  args: {
    paginationOpts: v.object({ numItems: v.number(), cursor: v.union(v.string(), v.null()) }),
    scannerId:      v.optional(v.id('scanners')),
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

    if (args.scannerId) {
      // Filter by scanner — use scanner index then filter by clinic in memory
      const byScanner = await ctx.db
        .query('scanEvents')
        .withIndex('by_scanner', (q) => q.eq('scannerId', args.scannerId!))
        .order('desc')
        .take(200)
      const clinicEvents = byScanner.filter((e) => e.clinicId === staff.clinicId)
      return { page: clinicEvents, isDone: true, continueCursor: '' }
    }

    return await ctx.db
      .query('scanEvents')
      .withIndex('by_clinic', (q) => q.eq('clinicId', staff.clinicId))
      .order('desc')
      .paginate(args.paginationOpts)
  },
})

/** Single scan event — includes full audit snapshot. */
export const getScanEvent = query({
  args: { id: v.id('scanEvents') },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) return null
    return await ctx.db.get(args.id)
  },
})

// ── Mutations ─────────────────────────────────────────────────────────────────

/**
 * Clinic staff: log a scan event.
 *
 * The resolution snapshot fields MUST be passed in from the client — they come
 * from the matrix resolver output that was shown to the user, and are frozen
 * here. They are NEVER re-computed at log time (P-3 ruling).
 */
export const createScanEvent = mutation({
  args: {
    patientId:              v.id('patients'),
    scannerId:              v.id('scanners'),
    coilId:                 v.optional(v.id('siteCoils')),
    bodyRegion:             v.string(),
    rvbRecordId:            v.optional(v.id('riskBenefitRecords')),

    // Actual parameters used at console
    fieldStrengthUsed:      v.string(),
    operatingModeUsed:      v.optional(v.string()),
    sarWbActual:            v.optional(v.number()),
    sarHeadActual:          v.optional(v.number()),
    b1RmsActual:            v.optional(v.number()),
    slewRateActual:         v.optional(v.number()),
    scanTimeMins:           v.optional(v.number()),

    // Outcome
    outcome:                v.union(
      v.literal('Completed'),
      v.literal('Early Termination'),
      v.literal('Aborted'),
      v.literal('Not Performed'),
    ),
    earlyTerminationReason: v.optional(v.string()),
    adverseEvents:          v.optional(v.string()),
    postScanDeviceCheck:    v.optional(v.string()),

    // AUDIT SNAPSHOT — P-3 ruling. Passed from client, frozen here.
    resolvedOutcomeCache:    v.string(),
    resolvedConditionIds:    v.array(v.string()),
    resolvedConstraintsJson: v.string(),
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

    return await ctx.db.insert('scanEvents', {
      ...args,
      clinicId:  staff.clinicId,
      staffId:   staff._id,
      createdAt: Date.now(),
    })
  },
})

/**
 * Patient only: add their own post-scan notes to a scan event.
 * Cannot override any clinical or sign-off data.
 */
export const addPatientNotes = mutation({
  args: {
    id:                   v.id('scanEvents'),
    patientPostScanNotes: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) throw new Error('Not authenticated')
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = ctx.db as any
    const user = await db.query('users').withIndex('by_clerk', (q: any) => q.eq('clerkId', identity.subject)).unique()
    if (!user || user.role !== 'patient') throw new Error('Patient access required')

    const event = await ctx.db.get(args.id)
    if (!event) throw new Error('Scan event not found')

    // Verify this event belongs to the calling patient
    const patient = await db.query('patients').withIndex('by_user', (q: any) => q.eq('userId', user._id)).unique()
    if (!patient || patient._id !== event.patientId) throw new Error('Access denied')

    await ctx.db.patch(args.id, { patientPostScanNotes: args.patientPostScanNotes })
  },
})
