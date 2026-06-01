import { mutation, query, internalAction } from './_generated/server'
import { v }                               from 'convex/values'
import { internal }                        from './_generated/api'

// ── File upload ───────────────────────────────────────────────────────────────

/** Generate a one-time upload URL for the accreditation document. */
export const generateUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    return await ctx.storage.generateUploadUrl()
  },
})

// ── Applications ──────────────────────────────────────────────────────────────

/** Submit a new clinic onboarding application. */
export const submitClinicApplication = mutation({
  args: {
    // Contact
    contactName:  v.string(),
    contactEmail: v.string(),
    contactPhone: v.optional(v.string()),
    jobTitle:     v.optional(v.string()),

    // Facility
    facilityName:    v.string(),
    facilityType:    v.string(),
    facilityAddress: v.string(),
    facilityCity:    v.optional(v.string()),
    facilityCountry: v.string(),
    facilityWebsite: v.optional(v.string()),
    facilityPhone:   v.optional(v.string()),

    // Regulatory
    regulatoryBody:  v.optional(v.string()),
    registrationNum: v.optional(v.string()),

    // Services
    services:       v.array(v.string()),
    additionalInfo: v.optional(v.string()),

    // Facility capacity (kept as separate fields so the detail page can display them cleanly)
    mriScannerCount:     v.optional(v.number()),
    staffUsingImplantId: v.optional(v.number()),

    // Accreditation document
    storageId: v.optional(v.id('_storage')),
    fileName:  v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Capture the authenticated user's Clerk ID (if signed in)
    const identity    = await ctx.auth.getUserIdentity()
    const clerkUserId = identity?.subject ?? undefined

    // Prevent duplicate applications: if an existing application is not rejected
    // (i.e. pending or approved), return early
    const existing = await ctx.db
      .query('clinicApplications')
      .withIndex('by_email', (q) => q.eq('contactEmail', args.contactEmail))
      .first()

    if (existing && existing.status !== 'rejected') {
      return { id: existing._id, alreadySubmitted: true }
    }

    const id = await ctx.db.insert('clinicApplications', {
      ...args,
      clerkUserId,
      status:      'pending',
      submittedAt: Date.now(),
    })

    // Fire email notification to admin asynchronously
    await ctx.scheduler.runAfter(0, internal.email.sendClinicApplicationEmail, {
      applicationId:   id,
      facilityName:    args.facilityName,
      contactName:     args.contactName,
      contactEmail:    args.contactEmail,
      facilityType:    args.facilityType,
      facilityCity:    args.facilityCity,
      facilityCountry: args.facilityCountry,
      services:        args.services,
    })

    // Pre-create a Clerk account immediately so it exists when the approval email
    // link is clicked. We only need to do this if the submitter isn't already
    // signed in (i.e. clerkUserId is unknown). If they're signed in, their Clerk
    // account already exists and activateClinicAccount will find it by ID.
    if (!clerkUserId) {
      await ctx.scheduler.runAfter(0, internal.clinics.createPendingClinicAccount, {
        contactEmail: args.contactEmail,
        contactName:  args.contactName,
      })
    }

    return { id, alreadySubmitted: false }
  },
})

/** Get the current user's clinic application (if any). */
export const getMyApplication = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) return null

    const app = await ctx.db
      .query('clinicApplications')
      .withIndex('by_clerk', (q) => q.eq('clerkUserId', identity.subject))
      .first()

    return app ?? null
  },
})

/** Get the clinic the current user belongs to (via staff record). */
export const getMyClinic = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) return null

    const user = await ctx.db
      .query('users')
      .withIndex('by_clerk', (q) => q.eq('clerkId', identity.subject))
      .first()

    if (!user) return null

    const staffRow = await ctx.db
      .query('staff')
      .withIndex('by_user', (q) => q.eq('userId', user._id))
      .first()

    if (!staffRow) return null

    return await ctx.db.get(staffRow.clinicId)
  },
})

/** Get a single application by its Convex ID (master admin detail view). */
export const getApplicationById = query({
  args: { id: v.id('clinicApplications') },
  handler: async (ctx, args) => {
    const app = await ctx.db.get(args.id)
    if (!app) return null

    // Resolve a short-lived download URL for the accreditation document
    const fileUrl = app.storageId ? await ctx.storage.getUrl(app.storageId) : null

    return { ...app, fileUrl }
  },
})

/** List clinic applications, optionally filtered by status. */
export const listApplications = query({
  args: {
    status: v.optional(v.union(
      v.literal('pending'),
      v.literal('approved'),
      v.literal('rejected'),
    )),
  },
  handler: async (ctx, args) => {
    if (args.status !== undefined) {
      return await ctx.db
        .query('clinicApplications')
        .withIndex('by_status', (q) => q.eq('status', args.status!))
        .order('desc')
        .take(50)
    }

    return await ctx.db
      .query('clinicApplications')
      .order('desc')
      .take(50)
  },
})

/** List all approved clinics (master admin view). */
export const listClinics = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db
      .query('clinics')
      .withIndex('by_status', (q) => q.eq('status', 'active'))
      .order('desc')
      .take(100)
  },
})

// ── Approval ──────────────────────────────────────────────────────────────────

/**
 * Pre-create a passwordless Clerk account the moment a clinic submits their
 * application form. This guarantees the account exists before the approval
 * email link is ever clicked, avoiding the "Couldn't find your account" error.
 *
 * The account is created with role: 'clinic_pending' — it can't access anything.
 * activateClinicAccount (called on approval) promotes it to 'clinic_staff'.
 */
export const createPendingClinicAccount = internalAction({
  args: {
    contactEmail: v.string(),
    contactName:  v.string(),
  },
  handler: async (_ctx, args) => {
    const secretKey = process.env.CLERK_SECRET_KEY
    if (!secretKey) {
      console.error('[clinics] CLERK_SECRET_KEY not set — skipping Clerk pre-creation')
      return
    }

    // If an account already exists for this email, do nothing
    const searchRes = await fetch(
      `https://api.clerk.com/v1/users?email_address=${encodeURIComponent(args.contactEmail)}&limit=1`,
      { headers: { Authorization: `Bearer ${secretKey}` } },
    )
    if (searchRes.ok) {
      const found = (await searchRes.json()) as { id: string }[]
      if (found.length > 0) {
        console.log('[clinics] Clerk account already exists for', args.contactEmail, '— skipping creation')
        return
      }
    }

    // Create a passwordless account (no role until approved)
    const nameParts = args.contactName.trim().split(/\s+/)
    const createRes = await fetch('https://api.clerk.com/v1/users', {
      method:  'POST',
      headers: {
        Authorization:  `Bearer ${secretKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email_addresses:           [args.contactEmail],
        first_name:                nameParts[0],
        last_name:                 nameParts.slice(1).join(' ') || undefined,
        skip_password_requirement: true,
        public_metadata:           { role: 'clinic_pending' },
      }),
    })

    if (createRes.ok) {
      const u = (await createRes.json()) as { id: string }
      console.log('[clinics] Pre-created Clerk account', u.id, 'for', args.contactEmail)
    } else {
      const body = await createRes.text()
      console.error('[clinics] Clerk pre-creation failed:', createRes.status, body)
    }
  },
})

/**
 * Activate the clinic account in Clerk after approval, then send the branded
 * approval email via Resend.
 *
 * Resolution order for the Clerk account:
 *   1. If clerkUserId is already known, just patch the role.
 *   2. Otherwise, search for an existing user with that email and patch them.
 *   3. If no account exists, create one (no password — they sign in with
 *      Clerk's email OTP magic code).
 *
 * Requires CLERK_SECRET_KEY in Convex environment variables.
 */
export const activateClinicAccount = internalAction({
  args: {
    clerkUserId:  v.optional(v.string()),
    contactEmail: v.string(),
    contactName:  v.string(),
    facilityName: v.string(),
  },
  handler: async (ctx, args) => {
    const secretKey = process.env.CLERK_SECRET_KEY
    if (!secretKey) {
      console.error('[clinics] CLERK_SECRET_KEY not set — cannot activate clinic account')
    } else {
      let resolvedId = args.clerkUserId ?? null

      if (!resolvedId) {
        // 1. Try to find by email
        const searchRes = await fetch(
          `https://api.clerk.com/v1/users?email_address=${encodeURIComponent(args.contactEmail)}&limit=1`,
          { headers: { Authorization: `Bearer ${secretKey}` } },
        )
        if (searchRes.ok) {
          const found = (await searchRes.json()) as { id: string }[]
          if (found.length > 0) resolvedId = found[0].id
        }
      }

      if (!resolvedId) {
        // 2. Create a new Clerk user (passwordless — signs in via email OTP)
        const createRes = await fetch('https://api.clerk.com/v1/users', {
          method: 'POST',
          headers: {
            Authorization:  `Bearer ${secretKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            email_addresses:          [args.contactEmail],
            public_metadata:          { role: 'clinic_staff' },
            skip_password_requirement: true,
          }),
        })
        if (createRes.ok) {
          const newUser = (await createRes.json()) as { id: string }
          resolvedId = newUser.id
          console.log('[clinics] Created Clerk account for', args.contactEmail)
        } else {
          const body = await createRes.text()
          console.error('[clinics] Clerk user creation failed:', createRes.status, body)
        }
      }

      if (resolvedId) {
        // 3. Stamp the role on the resolved account
        const patchRes = await fetch(
          `https://api.clerk.com/v1/users/${resolvedId}/metadata`,
          {
            method: 'PATCH',
            headers: {
              Authorization:  `Bearer ${secretKey}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ public_metadata: { role: 'clinic_staff' } }),
          },
        )
        if (patchRes.ok) {
          console.log('[clinics] Role set to clinic_staff for', resolvedId)
        } else {
          const body = await patchRes.text()
          console.error('[clinics] Clerk metadata PATCH failed:', patchRes.status, body)
        }
      }
    }

    // Always send the branded approval email via Resend (even if Clerk step failed)
    await ctx.runAction(internal.email.sendClinicApprovalEmail, {
      contactName:  args.contactName,
      contactEmail: args.contactEmail,
      facilityName: args.facilityName,
    })
  },
})

// ── Staff management ──────────────────────────────────────────────────────────

/** List all staff members for the current user's clinic with their user info. */
export const listClinicStaff = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) return []
    const user = await ctx.db
      .query('users')
      .withIndex('by_clerk', (q) => q.eq('clerkId', identity.subject))
      .first()
    if (!user) return []
    const staffRow = await ctx.db
      .query('staff')
      .withIndex('by_user', (q) => q.eq('userId', user._id))
      .first()
    if (!staffRow) return []
    const all = await ctx.db
      .query('staff')
      .withIndex('by_clinic', (q) => q.eq('clinicId', staffRow.clinicId))
      .collect()
    return Promise.all(
      all.map(async (s) => {
        const u = await ctx.db.get(s.userId)
        return { ...s, userName: u?.name ?? '', userEmail: u?.email ?? '' }
      }),
    )
  },
})

/**
 * Create / update the Clerk account for a new staff member.
 * surgeon jobType → role: 'surgeon'
 * all others     → role: 'clinic_staff'
 */
export const createStaffAccount = internalAction({
  args: {
    contactEmail: v.string(),
    contactName:  v.string(),
    jobType:      v.union(v.literal('radiographer'), v.literal('surgeon'), v.literal('admin')),
  },
  handler: async (_ctx, args) => {
    const secretKey = process.env.CLERK_SECRET_KEY
    if (!secretKey) {
      console.error('[staff] CLERK_SECRET_KEY not set')
      return
    }
    const role = args.jobType === 'surgeon' ? 'surgeon' : 'clinic_staff'

    // Check if account already exists
    const searchRes = await fetch(
      `https://api.clerk.com/v1/users?email_address=${encodeURIComponent(args.contactEmail)}&limit=1`,
      { headers: { Authorization: `Bearer ${secretKey}` } },
    )
    if (searchRes.ok) {
      const found = (await searchRes.json()) as { id: string }[]
      if (found.length > 0) {
        await fetch(`https://api.clerk.com/v1/users/${found[0].id}/metadata`, {
          method:  'PATCH',
          headers: { Authorization: `Bearer ${secretKey}`, 'Content-Type': 'application/json' },
          body:    JSON.stringify({ public_metadata: { role } }),
        })
        console.log('[staff] Updated Clerk role for existing user', args.contactEmail)
        return
      }
    }

    // Create new passwordless account
    const nameParts = args.contactName.trim().split(/\s+/)
    const createRes = await fetch('https://api.clerk.com/v1/users', {
      method:  'POST',
      headers: { Authorization: `Bearer ${secretKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email_addresses:           [args.contactEmail],
        first_name:                nameParts[0],
        last_name:                 nameParts.slice(1).join(' ') || undefined,
        skip_password_requirement: true,
        public_metadata:           { role },
      }),
    })
    if (createRes.ok) {
      const u = (await createRes.json()) as { id: string }
      console.log('[staff] Created Clerk account', u.id, 'for', args.contactEmail, 'role:', role)
    } else {
      console.error('[staff] Clerk creation failed:', createRes.status, await createRes.text())
    }
  },
})

/** Invite a new staff member to the clinic and create their Clerk account. */
export const inviteClinicStaff = mutation({
  args: {
    contactEmail: v.string(),
    contactName:  v.string(),
    jobType:      v.union(v.literal('radiographer'), v.literal('surgeon'), v.literal('admin')),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) throw new Error('Not authenticated')
    const user = await ctx.db
      .query('users')
      .withIndex('by_clerk', (q) => q.eq('clerkId', identity.subject))
      .first()
    if (!user) throw new Error('User not found')
    const staffRow = await ctx.db
      .query('staff')
      .withIndex('by_user', (q) => q.eq('userId', user._id))
      .first()
    if (!staffRow) throw new Error('Staff record not found — are you a clinic admin?')

    // Find or create the user record for the invitee
    let targetUser = await ctx.db
      .query('users')
      .withIndex('by_email', (q) => q.eq('email', args.contactEmail))
      .first()
    if (!targetUser) {
      const uid = await ctx.db.insert('users', {
        clerkId: '',   // will be filled in when they sign in
        email:   args.contactEmail,
        role:    'clinic_staff',
        name:    args.contactName,
      })
      targetUser = await ctx.db.get(uid)
    }
    if (!targetUser) throw new Error('Could not create user record')

    await ctx.db.insert('staff', {
      userId:      targetUser._id,
      clinicId:    staffRow.clinicId,
      jobType:     args.jobType,
      accessLevel: 'standard',
      allPatients: true,
      status:      'active',
    })

    // Create / update their Clerk account asynchronously
    await ctx.scheduler.runAfter(0, internal.clinics.createStaffAccount, {
      contactEmail: args.contactEmail,
      contactName:  args.contactName,
      jobType:      args.jobType,
    })

    // Send invite email so they know to sign in
    const clinic = await ctx.db.get(staffRow.clinicId)
    await ctx.scheduler.runAfter(0, internal.email.sendStaffInviteEmail, {
      contactEmail: args.contactEmail,
      contactName:  args.contactName,
      clinicName:   clinic?.name ?? 'your clinic',
      jobType:      args.jobType,
    })
  },
})

/** Search existing platform surgeons by name or email (for adding to a clinic). */
export const searchPlatformSurgeons = query({
  args: { query: v.string() },
  handler: async (ctx, args) => {
    // Get all staff with jobType = 'surgeon'
    const surgeonStaff = await ctx.db
      .query('staff')
      .filter((q) => q.eq(q.field('jobType'), 'surgeon'))
      .collect()

    // Unique user IDs (surgeon may be at multiple clinics)
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
    const filtered = q
      ? valid.filter(
          (u) =>
            u.name.toLowerCase().includes(q) ||
            u.email.toLowerCase().includes(q),
        )
      : valid

    return filtered.slice(0, 10).map((u) => ({
      userId: u._id,
      name:   u.name,
      email:  u.email,
    }))
  },
})

/** Add an existing platform surgeon (or staff member) to this clinic. */
export const addExistingStaffToClinic = mutation({
  args: {
    userId:  v.id('users'),
    jobType: v.union(v.literal('radiographer'), v.literal('surgeon'), v.literal('admin')),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) throw new Error('Not authenticated')
    const user = await ctx.db
      .query('users')
      .withIndex('by_clerk', (q) => q.eq('clerkId', identity.subject))
      .first()
    if (!user) throw new Error('User not found')
    const staffRow = await ctx.db
      .query('staff')
      .withIndex('by_user', (q) => q.eq('userId', user._id))
      .first()
    if (!staffRow) throw new Error('Staff record not found')

    // Check not already at this clinic
    const existing = await ctx.db
      .query('staff')
      .withIndex('by_clinic', (q) => q.eq('clinicId', staffRow.clinicId))
      .filter((q) => q.eq(q.field('userId'), args.userId))
      .first()
    if (existing) throw new Error('This person is already a member of your clinic')

    await ctx.db.insert('staff', {
      userId:      args.userId,
      clinicId:    staffRow.clinicId,
      jobType:     args.jobType,
      accessLevel: 'standard',
      allPatients: true,
      status:      'active',
    })
  },
})

/** Approve or reject a clinic application. */
export const reviewApplication = mutation({
  args: {
    applicationId: v.id('clinicApplications'),
    decision:      v.union(v.literal('approved'), v.literal('rejected')),
    notes:         v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const app = await ctx.db.get(args.applicationId)
    if (!app) throw new Error('Application not found')

    // Guard: don't let an already-approved application be approved again
    // (would create a duplicate clinic record). All other transitions are fine.
    if (app.status === 'approved' && args.decision === 'approved') {
      throw new Error('This clinic is already approved')
    }

    await ctx.db.patch(args.applicationId, {
      status:      args.decision,
      reviewedAt:  Date.now(),
      reviewNotes: args.notes,
    })

    if (args.decision === 'approved') {
      const clinicId = await ctx.db.insert('clinics', {
        name:         app.facilityName,
        address:      app.facilityAddress,
        phone:        app.facilityPhone ?? app.contactPhone ?? undefined,
        email:        app.contactEmail,
        website:      app.facilityWebsite ?? undefined,
        capabilities: app.services,
        status:       'active',
      })

      // If we know the submitting Clerk user, make them an admin staff member
      if (app.clerkUserId) {
        const user = await ctx.db
          .query('users')
          .withIndex('by_clerk', (q) => q.eq('clerkId', app.clerkUserId!))
          .first()

        if (user) {
          await ctx.db.insert('staff', {
            userId:      user._id,
            clinicId,
            jobType:     'admin',
            accessLevel: 'admin',
            allPatients: true,
            status:      'active',
          })
        }
      }

      // Activate the Clerk account + send approval email
      await ctx.scheduler.runAfter(0, internal.clinics.activateClinicAccount, {
        clerkUserId:  app.clerkUserId ?? undefined,
        contactEmail: app.contactEmail,
        contactName:  app.contactName,
        facilityName: app.facilityName,
      })

      return { clinicId }
    }

    // Rejection / unapproval path ─────────────────────────────────────────────
    // If this clinic was previously approved, suspend their clinic record
    if (app.status === 'approved') {
      const clinic = await ctx.db
        .query('clinics')
        .filter(q => q.eq(q.field('email'), app.contactEmail))
        .first()
      if (clinic) {
        await ctx.db.patch(clinic._id, { status: 'suspended' })
      }
    }

    // Send rejection email
    await ctx.scheduler.runAfter(0, internal.email.sendClinicRejectionEmail, {
      contactName:  app.contactName,
      contactEmail: app.contactEmail,
      facilityName: app.facilityName,
      reviewNotes:  args.notes,
    })

    return null
  },
})
