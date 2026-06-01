import { mutation, query } from './_generated/server'
import { v }              from 'convex/values'
import { internal }       from './_generated/api'

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
    selfReportedDeviceId:     v.optional(v.string()),
    selfReportedManufacturer: v.optional(v.string()),
    selfReportedModelNumber:  v.optional(v.string()),
    selfReportedDeviceType:   v.optional(v.string()),
    selfReportedImplantMonth: v.optional(v.string()),
    selfReportedImplantYear:  v.optional(v.string()),
    selfReportedHospital:     v.optional(v.string()),
    selfReportedSurgeon:      v.optional(v.string()),
    selfReportedImplants:     v.optional(v.string()),  // JSON array of additional implants
    countryOfBirth:           v.optional(v.string()),

    // Step 3 — emergency contact
    emergencyContactName:     v.optional(v.string()),
    emergencyContactPhone:    v.optional(v.string()),
    emergencyContactRelation: v.optional(v.string()),
    additionalNotes:          v.optional(v.string()),

    heightCm:            v.optional(v.number()),
    weightKg:            v.optional(v.number()),
    contrastAllergy:     v.optional(v.boolean()),
    contrastAllergyNote: v.optional(v.string()),

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
      countryOfBirth: args.countryOfBirth,

      selfReportedDevice:       args.selfReportedDevice,
      selfReportedDeviceId:     args.selfReportedDeviceId,
      selfReportedManufacturer: args.selfReportedManufacturer,
      selfReportedModelNumber:  args.selfReportedModelNumber,
      selfReportedDeviceType:   args.selfReportedDeviceType,
      selfReportedImplantMonth: args.selfReportedImplantMonth,
      selfReportedImplantYear:  args.selfReportedImplantYear,
      selfReportedHospital:     args.selfReportedHospital,
      selfReportedSurgeon:      args.selfReportedSurgeon,
      selfReportedImplants:     args.selfReportedImplants,

      emergencyContactName:     args.emergencyContactName,
      emergencyContactPhone:    args.emergencyContactPhone,
      emergencyContactRelation: args.emergencyContactRelation,
      additionalNotes:          args.additionalNotes,

      heightCm:            args.heightCm,
      weightKg:            args.weightKg,
      contrastAllergy:     args.contrastAllergy,
      contrastAllergyNote: args.contrastAllergyNote,

      verificationStatus: 'pending',
    })

    // Send welcome email using Clerk identity email
    const email = identity.email
    if (email) {
      await ctx.scheduler.runAfter(0, internal.email.sendPatientWelcomeEmail, {
        firstName:     args.firstName,
        lastName:      args.lastName,
        email,
        implantIdCode: code,
      })
    }

    return { id: patientId, implantIdCode: code }
  },
})

/** Mark the welcome flow as seen so it's never shown again across any device */
export const markWelcomeSeen = mutation({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) return
    const user = await ctx.db
      .query('users')
      .withIndex('by_clerk', (q) => q.eq('clerkId', identity.subject))
      .unique()
    if (!user) return
    const patient = await ctx.db
      .query('patients')
      .withIndex('by_user', (q) => q.eq('userId', user._id))
      .unique()
    if (!patient) return
    await ctx.db.patch(patient._id, { welcomeSeen: true })
  },
})

/** Update editable patient profile fields from the account/settings page. */
export const updatePatientProfile = mutation({
  args: {
    phone:               v.optional(v.string()),
    heightCm:            v.optional(v.number()),
    weightKg:            v.optional(v.number()),
    contrastAllergy:     v.optional(v.boolean()),
    contrastAllergyNote: v.optional(v.string()),
    additionalNotes:     v.optional(v.string()),
    emergencyContactName:     v.optional(v.string()),
    emergencyContactPhone:    v.optional(v.string()),
    emergencyContactRelation: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) throw new Error('Not authenticated')

    const user = await ctx.db
      .query('users')
      .withIndex('by_clerk', (q) => q.eq('clerkId', identity.subject))
      .unique()
    if (!user) throw new Error('User not found')

    const patient = await ctx.db
      .query('patients')
      .withIndex('by_user', (q) => q.eq('userId', user._id))
      .unique()
    if (!patient) throw new Error('Patient record not found')

    await ctx.db.patch(patient._id, {
      phone:               args.phone,
      heightCm:            args.heightCm,
      weightKg:            args.weightKg,
      contrastAllergy:     args.contrastAllergy,
      contrastAllergyNote: args.contrastAllergyNote,
      additionalNotes:     args.additionalNotes,
      emergencyContactName:     args.emergencyContactName,
      emergencyContactPhone:    args.emergencyContactPhone,
      emergencyContactRelation: args.emergencyContactRelation,
    })
  },
})

/** MRI safety status derived from the patient's verified device records.
 *  Returns the most-restrictive status across all linked devices:
 *  unsafe > conditional > safe > null (no verified devices yet).
 */
export const getMyImplantSafety = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) return null
    const user = await ctx.db
      .query('users')
      .withIndex('by_clerk', (q) => q.eq('clerkId', identity.subject))
      .unique()
    if (!user) return null
    const patient = await ctx.db
      .query('patients')
      .withIndex('by_user', (q) => q.eq('userId', user._id))
      .unique()
    if (!patient) return null

    const links = await ctx.db
      .query('patientDevices')
      .withIndex('by_patient', (q) => q.eq('patientId', patient._id))
      .collect()

    const statuses = await Promise.all(
      links.map(async (l) => {
        const d = await ctx.db.get(l.deviceId)
        return d?.mriStatus ?? null
      }),
    )

    if (statuses.includes('unsafe'))      return 'unsafe'      as const
    if (statuses.includes('conditional')) return 'conditional' as const
    if (statuses.includes('safe'))        return 'safe'        as const
    return null
  },
})

/** Patient counts for the surgeon dashboard stats cards. */
export const getSurgeonPatientCounts = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) return { total: 0, verified: 0, awaitingVerification: 0, pendingReview: 0 }
    const user = await ctx.db.query('users').withIndex('by_clerk', q => q.eq('clerkId', identity.subject)).unique()
    if (!user) return { total: 0, verified: 0, awaitingVerification: 0, pendingReview: 0 }
    const staffRow = await ctx.db.query('staff').withIndex('by_user', q => q.eq('userId', user._id)).first()
    if (!staffRow) return { total: 0, verified: 0, awaitingVerification: 0, pendingReview: 0 }
    const requests = await ctx.db.query('accessRequests')
      .withIndex('by_clinic', q => q.eq('clinicId', staffRow.clinicId))
      .filter(q => q.eq(q.field('status'), 'approved'))
      .collect()
    const patientIds = [...new Set(requests.map(r => r.patientId))]
    const patients = (await Promise.all(patientIds.map(id => ctx.db.get(id)))).filter(Boolean)
    return {
      total:                patients.length,
      verified:             patients.filter(p => p?.verificationStatus === 'active').length,
      awaitingVerification: patients.filter(p => p?.verificationStatus === 'pending').length,
      pendingReview:        0,
    }
  },
})
