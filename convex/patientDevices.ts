import { mutation, query } from './_generated/server'
import { v }               from 'convex/values'

// ── Controlled vocabularies ───────────────────────────────────────────────────

const INTEGRITY_STATES = [
  'Complete',
  'Fractured-Suspected',
  'Abandoned-Fragment',
  'Explanted-Partial',
  'Not Stated',
] as const

const IMPLANT_LOCATIONS = [
  'Brain/Skull',
  'Chest/Pectoral',
  'Upper Left Chest (above rib 4)',
  'Abdomen',
  'Left Vagus Nerve',
  'Right Atrium',
  'Right Ventricle',
  'Left Pectoral',
  'Cranial (lead)',
  'Spinal (lead)',
  'Lower Extremity',
  'Other',
] as const

const RECORD_STATES = [
  'Draft',
  'Awaiting Review',
  'Verified — Surgeon',
  'Verified — Dual',
  'Disputed',
  'Discharged — Verified',
  'Discharged — Unverified',
] as const

// ── Queries ───────────────────────────────────────────────────────────────────

/**
 * Resolver query: fetch all active patient devices with their linked device record
 * and integrity/location state. Used by the matrix resolver assembly step.
 */
export const getImplantsByPatientForResolver = query({
  args: { patientId: v.id('patients') },
  handler: async (ctx, args) => {
    const patientDeviceRows = await ctx.db
      .query('patientDevices')
      .withIndex('by_patient', (q) => q.eq('patientId', args.patientId))
      .collect()

    const activeRows = patientDeviceRows.filter((pd) => pd.status === 'active')

    const withDevice = await Promise.all(
      activeRows.map(async (pd) => {
        const device = await ctx.db.get(pd.deviceId)
        return { patientDevice: pd, device }
      })
    )

    return withDevice.filter((r) => r.device !== null)
  },
})

// ── Auth helpers ──────────────────────────────────────────────────────────────

async function requireClinicStaff(ctx: { auth: { getUserIdentity(): Promise<{ subject: string } | null> }, db: never }) {
  const identity = await (ctx.auth as { getUserIdentity(): Promise<{ subject: string } | null> }).getUserIdentity()
  if (!identity) throw new Error('Not authenticated')
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = ctx.db as any
  const user = await db.query('users').withIndex('by_clerk', (q: any) => q.eq('clerkId', identity.subject)).unique()
  if (!user) throw new Error('User not found')
  const staff = await db.query('staff').withIndex('by_user', (q: any) => q.eq('userId', user._id)).first()
  return { user, staff }
}

// ── Mutations ─────────────────────────────────────────────────────────────────

/** Clinic staff or surgeon: set device integrity state on a patient implant. */
export const updateImplantIntegrity = mutation({
  args: {
    patientDeviceId:     v.id('patientDevices'),
    deviceIntegrityState: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) throw new Error('Not authenticated')
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = ctx.db as any
    const user = await db.query('users').withIndex('by_clerk', (q: any) => q.eq('clerkId', identity.subject)).unique()
    if (!user) throw new Error('User not found')
    if (!['admin', 'clinic_staff', 'surgeon'].includes(user.role)) throw new Error('Access denied')

    if (!(INTEGRITY_STATES as readonly string[]).includes(args.deviceIntegrityState)) {
      throw new Error(`Invalid integrity state: ${args.deviceIntegrityState}`)
    }

    await ctx.db.patch(args.patientDeviceId, {
      deviceIntegrityState: args.deviceIntegrityState,
    })
  },
})

/** Clinic staff or surgeon: set implant anatomical location. */
export const updateImplantLocation = mutation({
  args: {
    patientDeviceId: v.id('patientDevices'),
    implantLocation: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) throw new Error('Not authenticated')
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = ctx.db as any
    const user = await db.query('users').withIndex('by_clerk', (q: any) => q.eq('clerkId', identity.subject)).unique()
    if (!user) throw new Error('User not found')
    if (!['admin', 'clinic_staff', 'surgeon'].includes(user.role)) throw new Error('Access denied')

    if (!(IMPLANT_LOCATIONS as readonly string[]).includes(args.implantLocation)) {
      throw new Error(`Invalid implant location: ${args.implantLocation}`)
    }

    await ctx.db.patch(args.patientDeviceId, {
      implantLocation: args.implantLocation,
    })
  },
})

/**
 * Surgeon only: mark a device record as verified.
 * Upgrades recordState to 'Verified — Surgeon' or 'Verified — Dual'
 * if the patient has already confirmed.
 */
export const markSurgeonVerified = mutation({
  args: { patientDeviceId: v.id('patientDevices') },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) throw new Error('Not authenticated')
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = ctx.db as any
    const user = await db.query('users').withIndex('by_clerk', (q: any) => q.eq('clerkId', identity.subject)).unique()
    if (!user) throw new Error('User not found')
    if (!['admin', 'surgeon'].includes(user.role)) throw new Error('Surgeon access required')

    const pd = await ctx.db.get(args.patientDeviceId)
    if (!pd) throw new Error('Implant record not found')

    const today = new Date().toISOString().split('T')[0]
    const isDual = !!pd.patientConfirmedDate

    await ctx.db.patch(args.patientDeviceId, {
      surgeonVerifiedDate: today,
      recordState: isDual ? 'Verified — Dual' : 'Verified — Surgeon',
    })
  },
})

/**
 * Patient only: confirm their own implant record is complete and correct.
 * Upgrades recordState to 'Verified — Dual' if the surgeon has already verified.
 */
export const markPatientConfirmed = mutation({
  args: { patientDeviceId: v.id('patientDevices') },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) throw new Error('Not authenticated')
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = ctx.db as any
    const user = await db.query('users').withIndex('by_clerk', (q: any) => q.eq('clerkId', identity.subject)).unique()
    if (!user) throw new Error('User not found')
    if (user.role !== 'patient') throw new Error('Patient access required')

    const pd = await ctx.db.get(args.patientDeviceId)
    if (!pd) throw new Error('Implant record not found')

    // Verify this device belongs to the calling patient
    const patient = await db.query('patients').withIndex('by_user', (q: any) => q.eq('userId', user._id)).unique()
    if (!patient || patient._id !== pd.patientId) throw new Error('Access denied')

    const today = new Date().toISOString().split('T')[0]
    const isDual = !!pd.surgeonVerifiedDate

    await ctx.db.patch(args.patientDeviceId, {
      patientConfirmedDate: today,
      recordState: isDual ? 'Verified — Dual' : 'Awaiting Review',
    })
  },
})

/** Admin only: direct record state override for edge cases. */
export const updateRecordState = mutation({
  args: {
    patientDeviceId: v.id('patientDevices'),
    recordState:     v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) throw new Error('Not authenticated')
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = ctx.db as any
    const user = await db.query('users').withIndex('by_clerk', (q: any) => q.eq('clerkId', identity.subject)).unique()
    if (!user || user.role !== 'admin') throw new Error('Admin access required')

    if (!(RECORD_STATES as readonly string[]).includes(args.recordState)) {
      throw new Error(`Invalid record state: ${args.recordState}`)
    }

    await ctx.db.patch(args.patientDeviceId, { recordState: args.recordState })
  },
})

// ── Exports for UI ────────────────────────────────────────────────────────────

export { INTEGRITY_STATES, IMPLANT_LOCATIONS, RECORD_STATES }
