import { mutation, query } from './_generated/server'
import { v } from 'convex/values'

/**
 * Patient ID format: IID-[3 surname][2 firstname][DD][MM][2 random]
 * Example:  IID-SMIJO2311XK  (Smith, John, born 23 November)
 *
 * Readable  — a clinician can roughly guess the patient from it
 * Immutable — built from name + DOB, not phone (which changes)
 * Unique    — random suffix + DB uniqueness check prevents collisions
 *
 * Excluded chars: O (looks like 0), I (looks like 1)
 */
const CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'

function generatePatientId(
  firstName: string,
  lastName: string,
  dob: string, // YYYY-MM-DD
): string {
  const sur = lastName
    .replace(/[^a-zA-Z]/g, '')
    .toUpperCase()
    .padEnd(3, 'X')
    .slice(0, 3)
  const fst = firstName
    .replace(/[^a-zA-Z]/g, '')
    .toUpperCase()
    .padEnd(2, 'X')
    .slice(0, 2)
  const parts = dob.split('-')
  const day   = (parts[2] ?? '01').padStart(2, '0')
  const month = (parts[1] ?? '01').padStart(2, '0')
  const rand  = Array.from(
    { length: 2 },
    () => CHARS[Math.floor(Math.random() * CHARS.length)],
  ).join('')
  return `IID-${sur}${fst}${day}${month}${rand}`
}

/** Returns the current user's patient profile, or null if not yet registered */
export const getMyPatient = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) return null

    const user = await ctx.db
      .query('users')
      .withIndex('by_clerk', (q) => q.eq('clerkId', identity.subject))
      .unique()
    if (!user) return null

    return ctx.db
      .query('patients')
      .withIndex('by_user', (q) => q.eq('userId', user._id))
      .unique()
  },
})

/** Create a patient profile for the current user. Idempotent — safe to call twice. */
export const createPatient = mutation({
  args: {
    // Step 1 — personal details
    firstName: v.string(),
    lastName:  v.string(),
    dob:       v.string(),               // YYYY-MM-DD
    phone:     v.optional(v.string()),

    // Step 2 — self-reported implant (pending verification)
    selfReportedDevice:       v.optional(v.string()),
    selfReportedDeviceType:   v.optional(v.string()),
    selfReportedImplantMonth: v.optional(v.string()),
    selfReportedImplantYear:  v.optional(v.string()),
    selfReportedHospital:     v.optional(v.string()),

    // Step 3 — emergency contact
    emergencyContactName:     v.optional(v.string()),
    emergencyContactPhone:    v.optional(v.string()),
    emergencyContactRelation: v.optional(v.string()),
    additionalNotes:          v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) throw new Error('Not authenticated')

    const user = await ctx.db
      .query('users')
      .withIndex('by_clerk', (q) => q.eq('clerkId', identity.subject))
      .unique()
    if (!user) throw new Error('User profile not found — please try again')

    // Idempotent: if already registered, return the same shape
    const existing = await ctx.db
      .query('patients')
      .withIndex('by_user', (q) => q.eq('userId', user._id))
      .unique()
    if (existing) return { id: existing._id, implantIdCode: existing.implantIdCode }

    // Generate a code that doesn't clash with any existing one
    let code = ''
    for (let attempt = 0; attempt < 20; attempt++) {
      const candidate = generatePatientId(args.firstName, args.lastName, args.dob)
      const clash = await ctx.db
        .query('patients')
        .withIndex('by_implant_code', (q) => q.eq('implantIdCode', candidate))
        .first()
      if (!clash) { code = candidate; break }
    }
    if (!code) throw new Error('Could not generate a unique patient ID — please try again')

    const patientId = await ctx.db.insert('patients', {
      userId:        user._id,
      implantIdCode: code,
      firstName:     args.firstName,
      lastName:      args.lastName,
      dob:           args.dob,
      phone:         args.phone,

      selfReportedDevice:       args.selfReportedDevice,
      selfReportedDeviceType:   args.selfReportedDeviceType,
      selfReportedImplantMonth: args.selfReportedImplantMonth,
      selfReportedImplantYear:  args.selfReportedImplantYear,
      selfReportedHospital:     args.selfReportedHospital,

      emergencyContactName:     args.emergencyContactName,
      emergencyContactPhone:    args.emergencyContactPhone,
      emergencyContactRelation: args.emergencyContactRelation,
      additionalNotes:          args.additionalNotes,

      verificationStatus: 'pending',
    })

    return { id: patientId, implantIdCode: code }
  },
})
