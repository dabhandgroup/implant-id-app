import { mutation, query, internalAction } from './_generated/server'
import { v }                              from 'convex/values'
import { internal }                       from './_generated/api'

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

/** Create a patient record on behalf of a patient (clinic staff / surgeon only). */
export const clinicAddPatient = mutation({
  args: {
    firstName: v.string(),
    lastName:  v.string(),
    dob:       v.string(),
    email:     v.string(),
    phone:     v.optional(v.string()),
    countryOfBirth: v.optional(v.string()),

    selfReportedDevice:       v.optional(v.string()),
    selfReportedDeviceId:     v.optional(v.string()),
    selfReportedManufacturer: v.optional(v.string()),
    selfReportedModelNumber:  v.optional(v.string()),
    selfReportedDeviceType:   v.optional(v.string()),
    selfReportedImplantMonth: v.optional(v.string()),
    selfReportedImplantYear:  v.optional(v.string()),
    selfReportedHospital:     v.optional(v.string()),
    selfReportedSurgeon:      v.optional(v.string()),

    emergencyContactName:     v.optional(v.string()),
    emergencyContactPhone:    v.optional(v.string()),
    emergencyContactRelation: v.optional(v.string()),
    additionalNotes:          v.optional(v.string()),
    heightCm:                 v.optional(v.number()),
    weightKg:                 v.optional(v.number()),
    contrastAllergy:          v.optional(v.boolean()),
    contrastAllergyNote:      v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) throw new Error('Not authenticated')

    const caller = await ctx.db
      .query('users')
      .withIndex('by_clerk', (q) => q.eq('clerkId', identity.subject))
      .unique()
    if (!caller) throw new Error('User profile not found')
    if (!['clinic_staff', 'surgeon', 'admin'].includes(caller.role)) {
      throw new Error('Only clinic staff can add patients')
    }

    // Find or create a placeholder Convex user for the patient.
    // clerkId starts empty — upsertUser fills it in the first time they sign in.
    const existingUser = await ctx.db
      .query('users')
      .withIndex('by_email', (q) => q.eq('email', args.email.toLowerCase()))
      .first()
    const patientUserId = existingUser
      ? existingUser._id
      : await ctx.db.insert('users', {
          clerkId: '',
          email:   args.email.toLowerCase(),
          role:    'patient',
          name:    `${args.firstName} ${args.lastName}`,
        })

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
      userId:        patientUserId,
      implantIdCode: code,
      firstName:     args.firstName,
      lastName:      args.lastName,
      dob:           args.dob,
      email:         args.email,
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

      emergencyContactName:     args.emergencyContactName,
      emergencyContactPhone:    args.emergencyContactPhone,
      emergencyContactRelation: args.emergencyContactRelation,
      additionalNotes:          args.additionalNotes,
      heightCm:                 args.heightCm,
      weightKg:                 args.weightKg,
      contrastAllergy:          args.contrastAllergy,
      contrastAllergyNote:      args.contrastAllergyNote,

      verificationStatus: 'pending' as const,
    })

    // Link this patient to the clinic that added them so they appear in listClinicPatients immediately.
    const staffRow = await ctx.db
      .query('staff')
      .withIndex('by_user', (q) => q.eq('userId', caller._id))
      .first()
    if (staffRow) {
      await ctx.db.insert('accessRequests', {
        clinicId:    staffRow.clinicId,
        staffId:     staffRow._id,
        patientId,
        status:      'approved' as const,
        requestedAt: Date.now(),
        resolvedAt:  Date.now(),
      })
    }

    // Create Clerk invitation + send invite email (async — non-blocking, sequential in one action)
    await ctx.scheduler.runAfter(0, internal.patients.setupNewPatient, {
      email:         args.email,
      firstName:     args.firstName,
      lastName:      args.lastName,
      phone:         args.phone,
      implantIdCode: code,
    })

    return { id: patientId, implantIdCode: code }
  },
})

/**
 * Create a Clerk invitation for a clinic-added patient and send the invite email.
 * Uses the ticket-based activation flow (same pattern as clinic staff approval).
 * If the patient already has a Clerk account, sends a login email instead.
 */
export const setupNewPatient = internalAction({
  args: {
    email:         v.string(),
    firstName:     v.string(),
    lastName:      v.string(),
    phone:         v.optional(v.string()),
    implantIdCode: v.string(),
  },
  handler: async (ctx, args) => {
    const secretKey = process.env.CLERK_SECRET_KEY
    if (!secretKey) {
      console.error('[patient] CLERK_SECRET_KEY not set')
      return
    }

    // 1. Check if a Clerk account already exists for this email
    const searchRes = await fetch(
      `https://api.clerk.com/v1/users?email_address=${encodeURIComponent(args.email)}&limit=1`,
      { headers: { Authorization: `Bearer ${secretKey}` } },
    )
    if (searchRes.ok) {
      const found = (await searchRes.json()) as { id: string }[]
      if (found.length > 0) {
        // Existing user — ensure patient role is set, then send a login link
        await fetch(`https://api.clerk.com/v1/users/${found[0].id}/metadata`, {
          method:  'PATCH',
          headers: { Authorization: `Bearer ${secretKey}`, 'Content-Type': 'application/json' },
          body:    JSON.stringify({ public_metadata: { role: 'patient' } }),
        })
        console.log('[patient] Existing Clerk account found for', args.email, '— sending login email')
        await ctx.runAction(internal.email.sendClinicPatientInviteEmail, {
          firstName:     args.firstName,
          email:         args.email,
          implantIdCode: args.implantIdCode,
          // role=patient tells the login page to default to the patient tab
          activationUrl: `https://portal.implantid.io/login?email=${encodeURIComponent(args.email)}&role=patient`,
        })
        return
      }
    }

    // 2. New user — revoke any stale pending invitations first
    const pendingRes = await fetch(
      `https://api.clerk.com/v1/invitations?email_address=${encodeURIComponent(args.email)}&status=pending&limit=10`,
      { headers: { Authorization: `Bearer ${secretKey}` } },
    )
    if (pendingRes.ok) {
      const data = await pendingRes.json()
      const arr: { id: string }[] = Array.isArray(data) ? data : (data?.data ?? [])
      for (const inv of arr) {
        await fetch(`https://api.clerk.com/v1/invitations/${inv.id}/revoke`, {
          method: 'POST', headers: { Authorization: `Bearer ${secretKey}` },
        }).catch(() => {})
      }
    }

    // 3. Create a Clerk invitation — notify: false, we send our own branded email
    const invRes = await fetch('https://api.clerk.com/v1/invitations', {
      method:  'POST',
      headers: { Authorization: `Bearer ${secretKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email_address:   args.email,
        public_metadata: { role: 'patient' },
        redirect_url:    'https://portal.implantid.io/patients/dashboard',
        notify:          false,
      }),
    })

    if (!invRes.ok) {
      console.error('[patient] Clerk invitation failed:', invRes.status, await invRes.text())
      // Fallback: send email with plain login URL
      await ctx.runAction(internal.email.sendClinicPatientInviteEmail, {
        firstName:     args.firstName,
        email:         args.email,
        implantIdCode: args.implantIdCode,
      })
      return
    }

    const inv = await invRes.json() as { id: string; url?: string }
    console.log('[patient] Clerk invitation created for', args.email, ':', JSON.stringify(inv))

    // 4. Extract ticket from the invitation URL
    let activationUrl: string | undefined
    if (inv.url) {
      try {
        const parsed = new URL(inv.url)
        const ticket = parsed.searchParams.get('__clerk_ticket')
          ?? parsed.searchParams.get('ticket')
          ?? [...parsed.searchParams.entries()].find(([k]) => k.includes('ticket'))?.[1]
        if (ticket) {
          activationUrl = `https://portal.implantid.io/patients/activate?email=${encodeURIComponent(args.email)}&ticket=${ticket}`
        } else {
          console.warn('[patient] No ticket in Clerk URL, falling back to login URL')
        }
      } catch {
        console.error('[patient] Failed to parse Clerk invitation URL:', inv.url)
      }
    }

    // 5. Send the invite email (with activation URL if we got a ticket)
    await ctx.runAction(internal.email.sendClinicPatientInviteEmail, {
      firstName:     args.firstName,
      email:         args.email,
      implantIdCode: args.implantIdCode,
      activationUrl,
      isActivation:  !!activationUrl,
    })
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

    // Admin override takes precedence for testing
    const override = (patient as Record<string, unknown>).mriStatusOverride as string | null | undefined
    if (override && override !== 'none') return override as 'safe' | 'conditional' | 'unsafe' | 'unknown'

    const links = await ctx.db
      .query('patientDevices')
      .withIndex('by_patient', (q) => q.eq('patientId', patient._id))
      .filter((q) => q.eq(q.field('status'), 'active'))
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

/** All verified devices linked to the current patient. */
export const getMyLinkedDevices = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) return []
    const user = await ctx.db
      .query('users')
      .withIndex('by_clerk', (q) => q.eq('clerkId', identity.subject))
      .unique()
    if (!user) return []
    const patient = await ctx.db
      .query('patients')
      .withIndex('by_user', (q) => q.eq('userId', user._id))
      .unique()
    if (!patient) return []

    const links = await ctx.db
      .query('patientDevices')
      .withIndex('by_patient', (q) => q.eq('patientId', patient._id))
      .filter((q) => q.eq(q.field('status'), 'active'))
      .collect()

    return Promise.all(
      links.map(async (l) => {
        const d = await ctx.db.get(l.deviceId)
        return d ? {
          _id:          l._id,
          deviceId:     l.deviceId,
          name:         d.model,
          manufacturer: d.manufacturer,
          deviceType:   d.deviceType,
          mriStatus:    d.mriStatus,
          serialNumber: l.serialNumber,
          implantDate:  l.implantDate,
        } : null
      }),
    ).then(list => list.filter(Boolean))
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

    // Fetch active device links only
    const links = await ctx.db
      .query('patientDevices')
      .withIndex('by_patient', (q) => q.eq('patientId', patient._id))
      .filter((q) => q.eq(q.field('status'), 'active'))
      .collect()

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

/**
 * Look up a patient by Implant ID code for the clinic scan page.
 * Returns the patient summary including the internal _id so the clinic can
 * call getPatientDeviceLinks and recordPatientLookup as follow-up queries.
 * No authentication required — the code acts as the access token.
 */
export const getPatientByCode = query({
  args: { code: v.string() },
  handler: async (ctx, args) => {
    const patient = await ctx.db
      .query('patients')
      .withIndex('by_implant_code', (q) => q.eq('implantIdCode', args.code.trim().toUpperCase()))
      .unique()
    if (!patient) return null

    const patientUser = patient.userId ? await ctx.db.get(patient.userId) : null

    return {
      _id:                      patient._id,
      implantIdCode:            patient.implantIdCode,
      firstName:                patient.firstName,
      lastName:                 patient.lastName,
      dob:                      patient.dob,
      heightCm:                 patient.heightCm,
      weightKg:                 patient.weightKg,
      contrastAllergy:          patient.contrastAllergy,
      contrastAllergyNote:      patient.contrastAllergyNote,
      verificationStatus:       patient.verificationStatus ?? 'pending',
      selfReportedDevice:       patient.selfReportedDevice,
      selfReportedManufacturer: patient.selfReportedManufacturer,
      selfReportedModelNumber:  patient.selfReportedModelNumber,
      clinicSharingEnabled:     patient.clinicSharingEnabled,
      accountActivated:         !!(patientUser?.clerkId),
    }
  },
})

/**
 * All active device links for a patient — for the clinic scan expand-parameters panel.
 * Clinic passes the _id returned from getPatientByCode.
 */
export const getPatientDeviceLinks = query({
  args: { patientId: v.id('patients') },
  handler: async (ctx, args) => {
    const links = await ctx.db
      .query('patientDevices')
      .withIndex('by_patient', (q) => q.eq('patientId', args.patientId))
      .filter((q) => q.eq(q.field('status'), 'active'))
      .collect()

    return Promise.all(
      links.map(async (l) => {
        const d = await ctx.db.get(l.deviceId)
        return {
          _id:         l._id,
          deviceId:    l.deviceId,
          deviceName:  d ? d.model : undefined,
          deviceType:  d?.deviceType,
          serialNumber: l.serialNumber,
          implantDate:  l.implantDate,
          status:       l.status,
        }
      }),
    )
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
      const existingLink = await ctx.db
        .query('patientDevices')
        .withIndex('by_patient', (q) => q.eq('patientId', args.patientId))
        .filter((q) => q.and(
          q.eq(q.field('deviceId'), args.deviceId!),
          q.eq(q.field('status'), 'active'),
        ))
        .first()
      if (!existingLink) {
        await ctx.db.insert('patientDevices', {
          patientId:    args.patientId,
          deviceId:     args.deviceId,
          serialNumber: args.serialNumber,
          implantDate:  args.implantDate,
          clinicNotes:  args.clinicNotes,
          status:       'active',
        })
      }
    }

    // Get the patient's user record to find their email
    if (patient.userId) {
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
    }
  },
})

/**
 * Admin-only: override a patient's verification status and MRI status for testing.
 * Sets a direct override on the patient record that takes precedence over linked devices.
 */
export const adminSetPatientStatus = mutation({
  args: {
    patientId:          v.id('patients'),
    verificationStatus: v.union(v.literal('pending'), v.literal('active')),
    mriOverride:        v.optional(v.union(v.literal('safe'), v.literal('conditional'), v.literal('unsafe'), v.literal('unknown'), v.literal('none'))),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) throw new Error('Not authenticated')
    const user = await ctx.db.query('users').withIndex('by_clerk', q => q.eq('clerkId', identity.subject)).unique()
    if (!user || user.role !== 'admin') throw new Error('Admin only')

    const patch: Record<string, unknown> = { verificationStatus: args.verificationStatus }
    if (args.mriOverride !== undefined) {
      patch.mriStatusOverride = args.mriOverride === 'none' ? null : args.mriOverride
    }
    await ctx.db.patch(args.patientId, patch)
  },
})

/** Update a patient's email address in the users table — admin only. */
export const adminUpdatePatientEmail = mutation({
  args: {
    patientId: v.id('patients'),
    email:     v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) throw new Error('Not authenticated')
    const admin = await ctx.db.query('users').withIndex('by_clerk', q => q.eq('clerkId', identity.subject)).unique()
    if (!admin || admin.role !== 'admin') throw new Error('Admin only')

    const patient = await ctx.db.get(args.patientId)
    if (!patient) throw new Error('Patient not found')
    if (!patient.userId) throw new Error('Patient has no linked user account yet')

    const email = args.email.trim().toLowerCase()
    if (!email || !email.includes('@')) throw new Error('Invalid email address')

    await ctx.db.patch(patient.userId, { email })
  },
})

/** Admin: assign a patient to a clinic — creates an approved accessRequest and emails the clinic. */
export const adminAssignPatientToClinic = mutation({
  args: {
    patientId: v.id('patients'),
    clinicId:  v.id('clinics'),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) throw new Error('Not authenticated')
    const admin = await ctx.db.query('users').withIndex('by_clerk', q => q.eq('clerkId', identity.subject)).unique()
    if (!admin || admin.role !== 'admin') throw new Error('Admin only')

    const patient = await ctx.db.get(args.patientId)
    if (!patient) throw new Error('Patient not found')

    const clinic = await ctx.db.get(args.clinicId)
    if (!clinic) throw new Error('Clinic not found')

    const staffRow = await ctx.db.query('staff').withIndex('by_clinic', q => q.eq('clinicId', args.clinicId)).first()
    if (!staffRow) throw new Error('This clinic has no active staff members yet — they must complete sign-up first')

    const existing = await ctx.db
      .query('accessRequests')
      .withIndex('by_clinic', q => q.eq('clinicId', args.clinicId))
      .filter(q => q.eq(q.field('patientId'), patient._id))
      .first()
    if (existing) throw new Error('This patient is already linked to this clinic')

    await ctx.db.insert('accessRequests', {
      clinicId:    args.clinicId,
      staffId:     staffRow._id,
      patientId:   patient._id,
      status:      'approved',
      requestedAt: Date.now(),
      reason:      'Assigned by admin',
    })

    const allStaff = await ctx.db.query('staff').withIndex('by_clinic', q => q.eq('clinicId', args.clinicId)).collect()
    for (const s of allStaff) {
      await ctx.db.insert('notifications', {
        userId:    s.userId,
        type:      'patient_share',
        title:     `${patient.firstName} ${patient.lastName} has been assigned to your clinic`,
        body:      `Implant ID: ${patient.implantIdCode}. Their record is now accessible from your patient list.`,
        read:      false,
        relatedId: patient._id,
        createdAt: Date.now(),
      })
    }

    if (clinic.email) {
      const patientUser = patient.userId ? await ctx.db.get(patient.userId) : null
      await ctx.scheduler.runAfter(0, internal.email.sendPatientShareEmail, {
        patientName:   `${patient.firstName} ${patient.lastName}`,
        patientEmail:  patientUser?.email ?? undefined,
        implantIdCode: patient.implantIdCode,
        device:        patient.selfReportedDevice ?? undefined,
        clinicEmail:   clinic.email,
        clinicName:    clinic.name,
      })
    }
  },
})

/** Admin: list approved clinic access for a patient. */
export const getPatientClinics = query({
  args: { patientId: v.id('patients') },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) return []
    const user = await ctx.db.query('users').withIndex('by_clerk', q => q.eq('clerkId', identity.subject)).unique()
    if (!user || user.role !== 'admin') return []

    const requests = await ctx.db
      .query('accessRequests')
      .withIndex('by_patient', q => q.eq('patientId', args.patientId))
      .filter(q => q.eq(q.field('status'), 'approved'))
      .collect()

    return Promise.all(requests.map(async r => {
      const clinic = await ctx.db.get(r.clinicId)
      return { ...r, clinic }
    }))
  },
})

/** List all patients — admin only. */
export const listAllPatients = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) return []

    const user = await ctx.db
      .query('users')
      .withIndex('by_clerk', (q) => q.eq('clerkId', identity.subject))
      .unique()
    if (!user || user.role !== 'admin') return []

    const patients = await ctx.db
      .query('patients')
      .order('desc')
      .take(args.limit ?? 100)
    return Promise.all(patients.map(async (p) => {
      const userRow = p.userId ? await ctx.db.get(p.userId) : null
      return { ...p, accountActivated: !!(userRow?.clerkId) }
    }))
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
      .filter((q) => q.neq(q.field('status'), 'explanted'))
      .take(50)

    const devices = (
      await Promise.all(
        links.map(async (l) => {
          const d = await ctx.db.get(l.deviceId)
          return d ? { ...l, device: d } : null
        }),
      )
    ).filter(Boolean)

    const patientUser = patient.userId ? await ctx.db.get(patient.userId) : null
    const email = patientUser?.email || null

    return { ...patient, devices, email }
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

/** Mark a single notification as read. */
export const markNotificationRead = mutation({
  args: { notificationId: v.id('notifications') },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) return
    const notif = await ctx.db.get(args.notificationId)
    if (!notif) return
    // Verify ownership — don't allow marking other users' notifications
    const user = await ctx.db
      .query('users')
      .withIndex('by_clerk', (q) => q.eq('clerkId', identity.subject))
      .unique()
    if (!user || notif.userId !== user._id) return
    await ctx.db.patch(args.notificationId, { read: true })
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
    patientId:         v.id('patients'),
    deviceId:          v.id('devices'),
    serialNumber:      v.optional(v.string()),
    implantDate:       v.optional(v.string()),
    clinicNotes:       v.optional(v.string()),
    hospital:          v.optional(v.string()),
    implantingSurgeon: v.optional(v.string()),
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
      patientId:         args.patientId,
      deviceId:          args.deviceId,
      serialNumber:      args.serialNumber,
      implantDate:       args.implantDate,
      clinicNotes:       args.clinicNotes,
      hospital:          args.hospital,
      implantingSurgeon: args.implantingSurgeon,
      status:            'active',
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

// ── Surgeon portal ────────────────────────────────────────────────────────────

/**
 * List all patients who have an approved access request at the surgeon's clinic.
 * Mirrors listClinicPatients in clinics.ts but keyed to the current user's staff row.
 */
export const getSurgeonPatients = query({
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

    const requests = await ctx.db
      .query('accessRequests')
      .withIndex('by_clinic', (q) => q.eq('clinicId', staffRow.clinicId))
      .filter((q) => q.eq(q.field('status'), 'approved'))
      .collect()

    const patientIds = [...new Set(requests.map((r) => r.patientId))]
    const patients = (await Promise.all(patientIds.map((id) => ctx.db.get(id)))).filter(Boolean)

    return patients.map((p) => ({
      _id:                p!._id,
      implantIdCode:      p!.implantIdCode,
      firstName:          p!.firstName,
      lastName:           p!.lastName,
      dob:                p!.dob,
      selfReportedDevice: p!.selfReportedDevice,
      verificationStatus: p!.verificationStatus ?? 'pending',
      lastAccessed: requests
        .filter((r) => r.patientId === p!._id)
        .sort((a, b) => b.requestedAt - a.requestedAt)[0]?.requestedAt,
    }))
  },
})

// ── Patient-facing access management ─────────────────────────────────────────

/**
 * Return the list of approved access grants for the current patient,
 * with clinic name and grant date.
 */
export const getMyClinicAccess = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) return []
    const user = await ctx.db
      .query('users')
      .withIndex('by_clerk', (q) => q.eq('clerkId', identity.subject))
      .unique()
    if (!user) return []

    const patient = await ctx.db
      .query('patients')
      .withIndex('by_user', (q) => q.eq('userId', user._id))
      .unique()
    if (!patient) return []

    const requests = await ctx.db
      .query('accessRequests')
      .withIndex('by_patient', (q) => q.eq('patientId', patient._id))
      .filter((q) => q.eq(q.field('status'), 'approved'))
      .collect()

    // Deduplicate by clinic — one entry per clinic
    const seen = new Set<string>()
    const unique = requests.filter((r) => {
      const k = r.clinicId.toString()
      if (seen.has(k)) return false
      seen.add(k)
      return true
    })

    return Promise.all(
      unique.map(async (r) => {
        const clinic = await ctx.db.get(r.clinicId)
        return {
          _id:         r._id,
          clinicId:    r.clinicId,
          clinicName:  clinic?.name ?? 'Unknown clinic',
          clinicCity:  clinic?.city,
          grantedAt:   r.requestedAt,
        }
      }),
    )
  },
})

/**
 * Revoke a clinic's access — sets the accessRequest to 'declined'.
 * Patient can only revoke their own access grants.
 */
export const revokeClinicAccess = mutation({
  args: { requestId: v.id('accessRequests') },
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

    const request = await ctx.db.get(args.requestId)
    if (!request) throw new Error('Access request not found')
    if (request.patientId !== patient._id) throw new Error('Not authorised')

    await ctx.db.patch(args.requestId, { status: 'declined', resolvedAt: Date.now() })

    // Also decline all other approved requests from the same clinic for this patient
    const others = await ctx.db
      .query('accessRequests')
      .withIndex('by_clinic', (q) => q.eq('clinicId', request.clinicId))
      .filter((q) => q.eq(q.field('patientId'), patient._id))
      .filter((q) => q.eq(q.field('status'), 'approved'))
      .collect()
    await Promise.all(others.map((o) => ctx.db.patch(o._id, { status: 'declined', resolvedAt: Date.now() })))
  },
})

/** Update all patient notification and privacy preferences. */
export const updatePatientPreferences = mutation({
  args: {
    visibility:      v.optional(v.union(v.literal('global'), v.literal('restricted'), v.literal('emergency'))),
    notifRecord:     v.optional(v.boolean()),
    notifWallet:     v.optional(v.boolean()),
    notifTips:       v.optional(v.boolean()),
    notifNetwork:    v.optional(v.boolean()),
    emergencyAccess: v.optional(v.boolean()),
    shareLocation:   v.optional(v.boolean()),
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
    const patch: Record<string, unknown> = {}
    if (args.visibility      !== undefined) patch.visibility      = args.visibility
    if (args.notifRecord     !== undefined) patch.notifRecord     = args.notifRecord
    if (args.notifWallet     !== undefined) patch.notifWallet     = args.notifWallet
    if (args.notifTips       !== undefined) patch.notifTips       = args.notifTips
    if (args.notifNetwork    !== undefined) patch.notifNetwork    = args.notifNetwork
    if (args.emergencyAccess !== undefined) patch.emergencyAccess = args.emergencyAccess
    if (args.shareLocation   !== undefined) patch.shareLocation   = args.shareLocation
    await ctx.db.patch(patient._id, patch)
  },
})

/** Update the patient's clinic sharing preference (clinicSharingEnabled). */
export const updateSharingPreference = mutation({
  args: { clinicSharingEnabled: v.boolean() },
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
    await ctx.db.patch(patient._id, { clinicSharingEnabled: args.clinicSharingEnabled })
  },
})

/** Return pending access requests waiting for the patient's response. */
export const getMyPendingAccessRequests = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) return []
    const user = await ctx.db
      .query('users')
      .withIndex('by_clerk', (q) => q.eq('clerkId', identity.subject))
      .unique()
    if (!user) return []
    const patient = await ctx.db
      .query('patients')
      .withIndex('by_user', (q) => q.eq('userId', user._id))
      .unique()
    if (!patient) return []

    const requests = await ctx.db
      .query('accessRequests')
      .withIndex('by_patient', (q) => q.eq('patientId', patient._id))
      .filter((q) => q.eq(q.field('status'), 'pending'))
      .collect()

    return Promise.all(
      requests.map(async (r) => {
        const clinic = await ctx.db.get(r.clinicId)
        return {
          _id:         r._id,
          clinicId:    r.clinicId,
          clinicName:  clinic?.name ?? 'Unknown clinic',
          clinicCity:  clinic?.city,
          requestedAt: r.requestedAt,
          reason:      r.reason,
        }
      }),
    )
  },
})

/** Patient approves or declines a pending clinic access request. */
export const respondToAccessRequest = mutation({
  args: {
    requestId: v.id('accessRequests'),
    approve:   v.boolean(),
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

    const request = await ctx.db.get(args.requestId)
    if (!request) throw new Error('Access request not found')
    if (request.patientId !== patient._id) throw new Error('Not authorised')

    const newStatus = args.approve ? 'approved' : 'declined'
    await ctx.db.patch(args.requestId, { status: newStatus, resolvedAt: Date.now() })

    // Notify the requesting staff member
    await ctx.db.insert('notifications', {
      userId:    (await ctx.db.get(request.staffId))?.userId ?? user._id,
      type:      'access_request',
      title:     args.approve ? 'Access approved' : 'Access declined',
      body:      args.approve
        ? `${patient.firstName} ${patient.lastName} approved your request to access their full implant record.`
        : `${patient.firstName} ${patient.lastName} declined your access request.`,
      read:      false,
      relatedId: args.requestId,
      createdAt: Date.now(),
    })
  },
})

// ── Patient self-reported multi-device ────────────────────────────────────────

/**
 * Add an additional self-reported implant to the patient's record.
 * Stored as a JSON array in the selfReportedImplants field.
 */
export const addSelfReportedImplant = mutation({
  args: {
    device:       v.string(),
    manufacturer: v.optional(v.string()),
    deviceType:   v.optional(v.string()),
    modelNumber:  v.optional(v.string()),
    implantMonth: v.optional(v.string()),
    implantYear:  v.optional(v.string()),
    hospital:     v.optional(v.string()),
    surgeonName:  v.optional(v.string()),
    surgeonEmail: v.optional(v.string()),
    clinicId:     v.optional(v.string()),
    clinicName:   v.optional(v.string()),
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

    const existing: unknown[] = (() => {
      try { return JSON.parse(patient.selfReportedImplants ?? '[]') }
      catch { return [] }
    })()

    const updated = [
      ...existing,
      {
        device:       args.device,
        manufacturer: args.manufacturer,
        deviceType:   args.deviceType,
        modelNumber:  args.modelNumber,
        implantMonth: args.implantMonth,
        implantYear:  args.implantYear,
        hospital:     args.hospital ?? args.clinicName,
        surgeonName:  args.surgeonName,
        surgeonEmail: args.surgeonEmail,
        clinicId:     args.clinicId,
        clinicName:   args.clinicName,
        addedAt:      Date.now(),
      },
    ]

    await ctx.db.patch(patient._id, { selfReportedImplants: JSON.stringify(updated) })
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
    let staffRow = await ctx.db
      .query('staff')
      .withIndex('by_user', (q) => q.eq('userId', user._id))
      .first()

    if (!staffRow) {
      // Auto-heal: approved clinic contacts may not have a staff row if the
      // approval happened before their users row existed. Find their approved
      // application and create the missing staff row now.
      const app = await ctx.db
        .query('clinicApplications')
        .withIndex('by_clerk', (q) => q.eq('clerkUserId', identity.subject))
        .first()
      if (app?.status === 'approved') {
        const clinic = await ctx.db
          .query('clinics')
          .filter((q) => q.eq(q.field('email'), app.contactEmail))
          .first()
        if (clinic) {
          const staffId = await ctx.db.insert('staff', {
            userId:      user._id,
            clinicId:    clinic._id,
            jobType:     'admin',
            accessLevel: 'admin',
            allPatients: true,
            status:      'active',
          })
          staffRow = await ctx.db.get(staffId)
        }
      }
      if (!staffRow) return
    }

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

    // Record a lookup event for each of the patient's linked devices (manufacturer analytics)
    const linkedDevices = await ctx.db
      .query('patientDevices')
      .withIndex('by_patient', (q) => q.eq('patientId', args.patientId))
      .collect()
    const now = Date.now()
    for (const link of linkedDevices) {
      await ctx.db.insert('deviceLookups', {
        deviceId:  link.deviceId,
        createdAt: now,
      })
    }

    // Notify patient
    const patient = await ctx.db.get(args.patientId)
    if (patient?.userId) {
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

/** Clinic staff requests access to a patient's full record — creates pending accessRequest and notifies patient. */
export const requestClinicAccess = mutation({
  args: {
    patientId: v.id('patients'),
    reason:    v.optional(v.string()),
  },
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
      .unique()
    if (!staffRow) throw new Error('No staff record found')

    const patient = await ctx.db.get(args.patientId)
    if (!patient) throw new Error('Patient not found')

    // If the patient hasn't activated their account yet, auto-approve —
    // they have no way to approve or deny requests themselves.
    const patientUser = patient.userId ? await ctx.db.get(patient.userId) : null
    const isInvitePending = !patientUser?.clerkId

    if (isInvitePending) {
      // Check for an existing approved request — don't duplicate
      const existingApproved = await ctx.db
        .query('accessRequests')
        .withIndex('by_clinic', (q) => q.eq('clinicId', staffRow.clinicId))
        .filter((q) => q.and(
          q.eq(q.field('patientId'), args.patientId),
          q.eq(q.field('status'), 'approved'),
        ))
        .first()
      if (existingApproved) return { autoApproved: true }

      await ctx.db.insert('accessRequests', {
        clinicId:    staffRow.clinicId,
        staffId:     staffRow._id,
        patientId:   args.patientId,
        status:      'approved' as const,
        requestedAt: Date.now(),
        resolvedAt:  Date.now(),
        reason:      args.reason,
      })
      return { autoApproved: true }
    }

    // Don't create duplicate pending requests from the same clinic
    const existing = await ctx.db
      .query('accessRequests')
      .withIndex('by_clinic', (q) => q.eq('clinicId', staffRow.clinicId))
      .filter((q) =>
        q.and(
          q.eq(q.field('patientId'), args.patientId),
          q.eq(q.field('status'), 'pending'),
        ),
      )
      .first()
    if (existing) return { autoApproved: false }

    const clinic = await ctx.db.get(staffRow.clinicId)
    const clinicName = clinic?.name ?? 'A clinic'

    const requestId = await ctx.db.insert('accessRequests', {
      clinicId:    staffRow.clinicId,
      staffId:     staffRow._id,
      patientId:   args.patientId,
      status:      'pending',
      requestedAt: Date.now(),
      reason:      args.reason,
    })

    // Notify patient
    if (patient.userId) {
      await ctx.db.insert('notifications', {
        userId:    patient.userId,
        type:      'access_request',
        title:     'Clinic access request',
        body:      `${clinicName} has requested access to your full implant record. You can approve or decline this from your account.`,
        read:      false,
        relatedId: requestId,
        createdAt: Date.now(),
      })
    }

    return { autoApproved: false }
  },
})

export const getFullPatientByCode = query({
  args: { code: v.string() },
  handler: async (ctx, args) => {
    const patient = await ctx.db
      .query('patients')
      .withIndex('by_implant_code', (q) => q.eq('implantIdCode', args.code.trim().toUpperCase()))
      .unique()
    if (!patient) return null

    const links = await ctx.db
      .query('patientDevices')
      .withIndex('by_patient', (q) => q.eq('patientId', patient._id))
      .filter((q) => q.eq(q.field('status'), 'active'))
      .collect()

    const devices = (
      await Promise.all(
        links.map(async (l) => {
          const d = await ctx.db.get(l.deviceId)
          if (!d) return null
          return {
            deviceId:          l.deviceId as string,
            manufacturer:      d.manufacturer,
            model:             d.model,
            deviceType:        d.deviceType,
            mriStatus:         d.mriStatus,
            serialNumber:      l.serialNumber,
            implantDate:       l.implantDate,
            implantingSurgeon: l.implantingSurgeon,
            hospital:          l.hospital,
            status:            l.status,
            fieldStrengths:    d.fieldStrengths,
            sarLimit:          d.sarLimit,
            b1RmsLimit:        d.b1RmsLimit,
            slewRateLimit:     d.slewRateLimit,
            gradientLimit:     d.gradientLimit,
            maxScanTime:       d.maxScanTime,
            contraindications: d.contraindications,
          }
        }),
      )
    ).filter(Boolean)

    let mriStatus: 'safe' | 'conditional' | 'unsafe' | 'unknown' = 'unknown'
    const statuses = devices.map((d) => d!.mriStatus)
    if (statuses.includes('unsafe'))           mriStatus = 'unsafe'
    else if (statuses.includes('conditional')) mriStatus = 'conditional'
    else if (statuses.includes('safe'))        mriStatus = 'safe'

    return {
      _id:                       patient._id,
      implantIdCode:             patient.implantIdCode,
      firstName:                 patient.firstName,
      lastName:                  patient.lastName,
      dob:                       patient.dob,
      heightCm:                  patient.heightCm,
      weightKg:                  patient.weightKg,
      contrastAllergy:           patient.contrastAllergy,
      contrastAllergyNote:       patient.contrastAllergyNote,
      verificationStatus:        patient.verificationStatus ?? 'pending',
      selfReportedDevice:        patient.selfReportedDevice,
      selfReportedManufacturer:  patient.selfReportedManufacturer,
      selfReportedModelNumber:   patient.selfReportedModelNumber,
      selfReportedSurgeon:       patient.selfReportedSurgeon,
      selfReportedHospital:      patient.selfReportedHospital,
      emergencyContactName:      patient.emergencyContactName,
      emergencyContactPhone:     patient.emergencyContactPhone,
      emergencyContactRelation:  patient.emergencyContactRelation,
      additionalNotes:           patient.additionalNotes,
      mriStatus,
      devices,
      createdAt:                 patient._creationTime,
    }
  },
})

