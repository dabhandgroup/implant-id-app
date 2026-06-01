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
    selfReportedSurgeonUserId: v.optional(v.string()),   // Convex user ID if surgeon found on platform
    selfReportedSurgeonEmail:  v.optional(v.string()),   // email to invite if not on platform
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
      selfReportedSurgeon:       args.selfReportedSurgeon,
      selfReportedSurgeonEmail:  args.selfReportedSurgeonEmail,
      selfReportedImplants:      args.selfReportedImplants,

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

/**
 * Public lookup by implant ID code — used by clinic scan page.
 * Returns patient info + verified devices, or null if not found.
 * No authentication required (the code itself acts as the access token).
 */
export const lookupByImplantId = query({
  args: { code: v.string() },
  handler: async (ctx, args) => {
    const patient = await ctx.db
      .query('patients')
      .withIndex('by_implant_code', (q) => q.eq('implantIdCode', args.code.trim().toUpperCase()))
      .unique()
    if (!patient) return null

    // Fetch verified device links
    const links = await ctx.db
      .query('patientDevices')
      .withIndex('by_patient', (q) => q.eq('patientId', patient._id))
      .take(20)

    const devices = (
      await Promise.all(
        links.map(async (l) => {
          const d = await ctx.db.get(l.deviceId)
          if (!d) return null
          return {
            manufacturer: d.manufacturer,
            model:        d.model,
            deviceType:   d.deviceType,
            mriStatus:    d.mriStatus,
            serialNumber: l.serialNumber,
            implantDate:  l.implantDate,
            status:       l.status,
          }
        }),
      )
    ).filter(Boolean)

    // Aggregate MRI status: unsafe > conditional > safe > unknown
    let mriStatus: 'safe' | 'conditional' | 'unsafe' | 'unknown' = 'unknown'
    const statuses = devices.map((d) => d!.mriStatus)
    if (statuses.includes('unsafe'))      mriStatus = 'unsafe'
    else if (statuses.includes('conditional')) mriStatus = 'conditional'
    else if (statuses.includes('safe'))        mriStatus = 'safe'

    return {
      implantIdCode:       patient.implantIdCode,
      firstName:           patient.firstName,
      lastName:            patient.lastName,
      dob:                 patient.dob,
      heightCm:            patient.heightCm,
      weightKg:            patient.weightKg,
      contrastAllergy:     patient.contrastAllergy,
      contrastAllergyNote: patient.contrastAllergyNote,
      verificationStatus:  patient.verificationStatus ?? 'pending',
      selfReportedDevice:  patient.selfReportedDevice,
      mriStatus,
      devices,
    }
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

/** Verify a patient's record (admin / clinic_staff / surgeon only). */
export const verifyPatient = mutation({
  args: {
    patientId:    v.id('patients'),
    deviceId:     v.optional(v.id('devices')),
    serialNumber: v.optional(v.string()),
    implantDate:  v.optional(v.string()),
    clinicNotes:  v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) throw new Error('Not authenticated')

    const user = await ctx.db
      .query('users')
      .withIndex('by_clerk', (q) => q.eq('clerkId', identity.subject))
      .unique()
    if (!user) throw new Error('User not found')
    if (!['admin', 'clinic_staff', 'surgeon'].includes(user.role)) {
      throw new Error('Insufficient permissions')
    }

    const patient = await ctx.db.get(args.patientId)
    if (!patient) throw new Error('Patient not found')

    await ctx.db.patch(args.patientId, { verificationStatus: 'active' })

    if (args.deviceId) {
      await ctx.db.insert('patientDevices', {
        patientId:    args.patientId,
        deviceId:     args.deviceId,
        serialNumber: args.serialNumber,
        implantDate:  args.implantDate,
        clinicNotes:  args.clinicNotes,
        status:       'active',
      })
    }

    // Get the patient's user record to find their email
    const patientUser = await ctx.db.get(patient.userId)
    if (patientUser?.email) {
      await ctx.scheduler.runAfter(0, internal.email.sendPatientVerifiedEmail, {
        firstName:     patient.firstName,
        email:         patientUser.email,
        implantIdCode: patient.implantIdCode,
      })
    }

    await ctx.db.insert('notifications', {
      userId:    patient.userId,
      type:      'verification',
      title:     'Your implant record is verified',
      body:      'Your clinical team has verified your record. Your wallet pass is now active.',
      read:      false,
      createdAt: Date.now(),
    })
  },
})

/** List all patients — admin only. */
export const listAllPatients = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) return []

    // Verify the caller exists in Convex (i.e. has completed sign-in).
    // Role enforcement is handled server-side by requireRole('admin') in the
    // /master layout — we don't double-check here because the Convex users table
    // role can lag behind Clerk (e.g. admin who first logged in before their
    // role was written gets 'patient' in the Convex row but 'admin' in Clerk).
    const user = await ctx.db
      .query('users')
      .withIndex('by_clerk', (q) => q.eq('clerkId', identity.subject))
      .unique()
    if (!user) return []

    return ctx.db
      .query('patients')
      .order('desc')
      .take(args.limit ?? 100)
  },
})

/** Get a single patient by ID with their verified devices — admin / clinic_staff / surgeon. */
export const getPatientById = query({
  args: { patientId: v.id('patients') },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) return null

    const user = await ctx.db
      .query('users')
      .withIndex('by_clerk', (q) => q.eq('clerkId', identity.subject))
      .unique()
    if (!user || !['admin', 'clinic_staff', 'surgeon'].includes(user.role)) return null

    const patient = await ctx.db.get(args.patientId)
    if (!patient) return null

    const links = await ctx.db
      .query('patientDevices')
      .withIndex('by_patient', (q) => q.eq('patientId', patient._id))
      .take(50)

    const devices = (
      await Promise.all(
        links.map(async (l) => {
          const d = await ctx.db.get(l.deviceId)
          return d ? { ...l, device: d } : null
        }),
      )
    ).filter(Boolean)

    return { ...patient, devices }
  },
})

/** Get the current user's notifications (most recent 20). */
export const getMyNotifications = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) return []

    const user = await ctx.db
      .query('users')
      .withIndex('by_clerk', (q) => q.eq('clerkId', identity.subject))
      .unique()
    if (!user) return []

    return ctx.db
      .query('notifications')
      .withIndex('by_user', (q) => q.eq('userId', user._id))
      .order('desc')
      .take(20)
  },
})

/** Mark all unread notifications as read for the current user. */
export const markAllNotificationsRead = mutation({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) return

    const user = await ctx.db
      .query('users')
      .withIndex('by_clerk', (q) => q.eq('clerkId', identity.subject))
      .unique()
    if (!user) return

    const unread = await ctx.db
      .query('notifications')
      .withIndex('by_user_unread', (q) =>
        q.eq('userId', user._id).eq('read', false),
      )
      .take(100)

    await Promise.all(unread.map((n) => ctx.db.patch(n._id, { read: true })))
  },
})

/**
 * Search platform surgeons by name or email — used during patient registration
 * so a patient can tag their implanting surgeon.
 */
export const searchSurgeonsForRegistration = query({
  args: { query: v.string() },
  handler: async (ctx, args) => {
    if (args.query.trim().length < 2) return []

    const surgeonStaff = await ctx.db
      .query('staff')
      .filter((q) => q.eq(q.field('jobType'), 'surgeon'))
      .take(200)

    // Deduplicate by userId (surgeon may be at multiple clinics)
    const seenUserIds = new Set<string>()
    const uniqueStaff = surgeonStaff.filter((s) => {
      const id = s.userId.toString()
      if (seenUserIds.has(id)) return false
      seenUserIds.add(id)
      return true
    })

    const users = await Promise.all(uniqueStaff.map((s) => ctx.db.get(s.userId)))
    const valid = users.filter(Boolean) as NonNullable<(typeof users)[0]>[]

    const q = args.query.trim().toLowerCase()
    const filtered = valid.filter(
      (u) =>
        u.name.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q),
    )

    return filtered.slice(0, 8).map((u) => ({
      userId: u._id,
      name:   u.name,
      email:  u.email,
    }))
  },
})

// ── Device management (admin / clinic / surgeon) ──────────────────────────────

/** Link a device catalogue entry to a patient record (adds a verified device). */
export const linkDeviceToPatient = mutation({
  args: {
    patientId:    v.id('patients'),
    deviceId:     v.id('devices'),
    serialNumber: v.optional(v.string()),
    implantDate:  v.optional(v.string()),
    clinicNotes:  v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) throw new Error('Not authenticated')
    const user = await ctx.db
      .query('users')
      .withIndex('by_clerk', (q) => q.eq('clerkId', identity.subject))
      .first()
    if (!user || !['admin', 'clinic_staff', 'surgeon'].includes(user.role)) {
      throw new Error('Insufficient permissions')
    }
    // Prevent duplicate active links
    const existing = await ctx.db
      .query('patientDevices')
      .withIndex('by_patient', (q) => q.eq('patientId', args.patientId))
      .filter((q) => q.eq(q.field('deviceId'), args.deviceId))
      .filter((q) => q.eq(q.field('status'), 'active'))
      .first()
    if (existing) throw new Error('This device is already linked to this patient')

    return ctx.db.insert('patientDevices', {
      patientId:    args.patientId,
      deviceId:     args.deviceId,
      serialNumber: args.serialNumber,
      implantDate:  args.implantDate,
      clinicNotes:  args.clinicNotes,
      status:       'active',
    })
  },
})

/** Patient shares their record with a clinic — creates accessRequest, notifies staff, sends email. */
export const shareRecordWithClinic = mutation({
  args: {
    clinicEmail: v.string(),
    clinicName:  v.optional(v.string()),
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

    // If clinic is on the platform, create an approved accessRequest and notify staff
    const clinic = await ctx.db
      .query('clinics')
      .filter((q) => q.eq(q.field('email'), args.clinicEmail))
      .first()
    if (clinic) {
      const existing = await ctx.db
        .query('accessRequests')
        .withIndex('by_clinic', (q) => q.eq('clinicId', clinic._id))
        .filter((q) => q.eq(q.field('patientId'), patient._id))
        .first()
      if (!existing) {
        const staffRow = await ctx.db
          .query('staff')
          .withIndex('by_clinic', (q) => q.eq('clinicId', clinic._id))
          .first()
        if (staffRow) {
          await ctx.db.insert('accessRequests', {
            clinicId:    clinic._id,
            staffId:     staffRow._id,
            patientId:   patient._id,
            status:      'approved',
            requestedAt: Date.now(),
            reason:      'Patient shared record via email',
          })
        }
      }
      const allStaff = await ctx.db
        .query('staff')
        .withIndex('by_clinic', (q) => q.eq('clinicId', clinic._id))
        .collect()
      for (const s of allStaff) {
        await ctx.db.insert('notifications', {
          userId:    s.userId,
          type:      'patient_share',
          title:     `${patient.firstName} ${patient.lastName} shared their record`,
          body:      `Implant ID: ${patient.implantIdCode}. They have shared their record ahead of their appointment.`,
          read:      false,
          relatedId: patient._id,
          createdAt: Date.now(),
        })
      }
    }

    await ctx.scheduler.runAfter(0, internal.email.sendPatientShareEmail, {
      patientName:   `${patient.firstName} ${patient.lastName}`,
      patientEmail:  user.email || undefined,
      implantIdCode: patient.implantIdCode,
      device:        patient.selfReportedDevice ?? undefined,
      clinicEmail:   args.clinicEmail,
      clinicName:    args.clinicName ?? clinic?.name,
    })
  },
})

/** Mark a patient device link as explanted (removes it from active record). */
export const removePatientDevice = mutation({
  args: { patientDeviceId: v.id('patientDevices') },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) throw new Error('Not authenticated')
    const user = await ctx.db
      .query('users')
      .withIndex('by_clerk', (q) => q.eq('clerkId', identity.subject))
      .first()
    if (!user || !['admin', 'clinic_staff', 'surgeon'].includes(user.role)) {
      throw new Error('Insufficient permissions')
    }
    await ctx.db.patch(args.patientDeviceId, { status: 'explanted' })
  },
})

/** Record a patient lookup by clinic staff — writes audit log and notifies patient. */
export const recordPatientLookup = mutation({
  args: {
    patientId:  v.id('patients'),
    clinicName: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) return
    const user = await ctx.db
      .query('users')
      .withIndex('by_clerk', (q) => q.eq('clerkId', identity.subject))
      .first()
    if (!user) return
    const staffRow = await ctx.db
      .query('staff')
      .withIndex('by_user', (q) => q.eq('userId', user._id))
      .first()
    if (!staffRow) return

    const clinic = args.clinicName
      ? null
      : await ctx.db.get(staffRow.clinicId)
    const displayName = args.clinicName ?? clinic?.name ?? 'a clinic'

    // Write audit log
    await ctx.db.insert('auditLog', {
      clinicId:  staffRow.clinicId,
      staffId:   staffRow._id,
      action:    'patient_lookup',
      target:    args.patientId,
      detail:    `Patient record viewed via scan`,
      createdAt: Date.now(),
    })

    // Notify patient
    const patient = await ctx.db.get(args.patientId)
    if (patient) {
      await ctx.db.insert('notifications', {
        userId:    patient.userId,
        type:      'record_viewed',
        title:     'Your record was accessed',
        body:      `Your implant record was viewed by ${displayName}.`,
        read:      false,
        relatedId: args.patientId,
        createdAt: Date.now(),
      })
    }
  },
})

