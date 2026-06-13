import { mutation, query, internalAction, internalMutation, internalQuery, action } from './_generated/server'
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

    // Cross-type uniqueness: email cannot belong to a manufacturer account
    const existingMfr = await ctx.db
      .query('manufacturers')
      .withIndex('by_email', (q) => q.eq('contactEmail', args.contactEmail))
      .first()
    if (existingMfr && existingMfr.status !== 'rejected') {
      throw new Error('This email address is already registered as a manufacturer account. Each email can only be used for one account type. Please use a different email address.')
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

    // Confirmation email to the clinic — receipt of everything they submitted
    await ctx.scheduler.runAfter(0, internal.email.sendClinicApplicationConfirmationEmail, {
      contactName:     args.contactName,
      contactEmail:    args.contactEmail,
      facilityName:    args.facilityName,
      facilityType:    args.facilityType,
      facilityAddress: args.facilityAddress,
      facilityCity:    args.facilityCity,
      facilityCountry: args.facilityCountry,
      facilityWebsite: args.facilityWebsite,
      facilityPhone:   args.facilityPhone,
      contactPhone:    args.contactPhone,
      jobTitle:        args.jobTitle,
      regulatoryBody:  args.regulatoryBody,
      registrationNum: args.registrationNum,
      services:        args.services,
      additionalInfo:  args.additionalInfo,
    })

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

/** List clinics visible to patients (opted in via showToPatients). */
export const listClinicsForPatients = query({
  args: { query: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const all = await ctx.db
      .query('clinics')
      .withIndex('by_status', (q) => q.eq('status', 'active'))
      .collect()

    // Show clinics that have explicitly opted in, OR all active clinics if none have set the flag yet
    // (graceful default — once a clinic sets it false it will be hidden)
    const visible = all.filter(c => c.showToPatients !== false)

    if (!args.query?.trim()) return visible

    const q = args.query.toLowerCase()
    return visible.filter(c =>
      c.name.toLowerCase().includes(q) ||
      c.address.toLowerCase().includes(q) ||
      c.city?.toLowerCase().includes(q) ||
      c.country?.toLowerCase().includes(q) ||
      c.capabilities.some(cap => cap.toLowerCase().includes(q)),
    )
  },
})

/** Clinic staff updates their clinic's patient visibility setting. */
export const updateClinicVisibility = mutation({
  args: { showToPatients: v.boolean() },
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
    if (!staffRow || staffRow.accessLevel !== 'admin') throw new Error('Admin access required')
    await ctx.db.patch(staffRow.clinicId, { showToPatients: args.showToPatients })
  },
})

/** Also store city/country when approving an application. */

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
    // Throw (not log) so Convex retries the action once the key is configured.
    if (!secretKey) throw new Error('[clinics] CLERK_SECRET_KEY not set — will retry')

    let resolvedId = args.clerkUserId ?? null

    // 1. Find existing Clerk account by email
    if (!resolvedId) {
      const searchRes = await fetch(
        `https://api.clerk.com/v1/users?email_address=${encodeURIComponent(args.contactEmail)}&limit=1`,
        { headers: { Authorization: `Bearer ${secretKey}` } },
      )
      if (searchRes.ok) {
        const found = (await searchRes.json()) as { id: string }[]
        if (found.length > 0) resolvedId = found[0].id
      }
    }

    let inviteUrl: string | undefined

    if (!resolvedId) {
      // 2. No existing account — use Clerk Invitations API.
      // Revoke any stale pending invitations first so we always get a fresh link.
      const pendingRes = await fetch(
        `https://api.clerk.com/v1/invitations?email_address=${encodeURIComponent(args.contactEmail)}&status=pending&limit=10`,
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

      // Create a new invitation. notify: false so we send our own branded email;
      // Clerk returns a `url` field with the one-time activation link.
      const invRes = await fetch('https://api.clerk.com/v1/invitations', {
        method:  'POST',
        headers: { Authorization: `Bearer ${secretKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email_address:   args.contactEmail,
          public_metadata: { role: 'clinic_staff' },
          redirect_url:    'https://portal.implantid.io/clinics/dashboard',
          notify:          false,
        }),
      })
      if (!invRes.ok) {
        throw new Error(`[clinics] Clerk invitation failed (${invRes.status}): ${await invRes.text()}`)
      }
      const inv = await invRes.json() as { id: string; url?: string }

      // Log the full invitation object so we can see exactly what Clerk returns
      console.log('[clinics] Clerk invitation response for', args.contactEmail, ':', JSON.stringify(inv))

      if (inv.url) {
        try {
          const parsed = new URL(inv.url)
          // Try __clerk_ticket first, then any param containing "ticket"
          const tkValue = parsed.searchParams.get('__clerk_ticket')
            ?? parsed.searchParams.get('ticket')
            ?? [...parsed.searchParams.entries()].find(([k]) => k.includes('ticket'))?.[1]

          if (tkValue) {
            inviteUrl = `https://portal.implantid.io/clinics/activate?email=${encodeURIComponent(args.contactEmail)}&ticket=${tkValue}`
          } else {
            // Clerk URL exists but has no ticket param — use it directly as fallback
            // (goes to /sign-up which uses Clerk's native <SignUp> component)
            console.warn('[clinics] No ticket param in Clerk URL, using raw URL as fallback:', inv.url)
            inviteUrl = inv.url
          }
        } catch {
          console.error('[clinics] Failed to parse Clerk invitation URL:', inv.url)
          inviteUrl = inv.url
        }
      } else {
        console.error('[clinics] Clerk invitation had no URL field. Full response:', JSON.stringify(inv))
      }
      console.log('[clinics] Final activate URL for', args.contactEmail, ':', inviteUrl)
    } else {
      // 3. Existing account — stamp the clinic_staff role
      await fetch(`https://api.clerk.com/v1/users/${resolvedId}/metadata`, {
        method:  'PATCH',
        headers: { Authorization: `Bearer ${secretKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ public_metadata: { role: 'clinic_staff' } }),
      }).catch(() => {})
    }

    // Send our branded approval email with the activation link (if we have one).
    await ctx.runAction(internal.email.sendClinicApprovalEmail, {
      contactName:  args.contactName,
      contactEmail: args.contactEmail,
      facilityName: args.facilityName,
      inviteUrl,
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
/** Master admin corrects the contact email on an application.
 *  Validates no clash, updates both clinicApplications + clinics rows,
 *  and if the clinic is already approved retriggers activation + approval email.
 */
export const updateClinicContactEmail = mutation({
  args: {
    applicationId: v.id('clinicApplications'),
    newEmail:      v.string(),
  },
  handler: async (ctx, args) => {
    const app = await ctx.db.get(args.applicationId)
    if (!app) throw new Error('Application not found')

    const normalized = args.newEmail.trim().toLowerCase()
    if (!normalized) throw new Error('Email address is required')

    // Clash check — users table
    const userClash = await ctx.db
      .query('users')
      .withIndex('by_email', q => q.eq('email', normalized))
      .unique()
    if (userClash) throw new Error('That email is already registered to another account on the platform')

    // Clash check — other clinic applications
    const appClash = await ctx.db
      .query('clinicApplications')
      .withIndex('by_email', q => q.eq('contactEmail', normalized))
      .filter(q => q.neq(q.field('_id'), args.applicationId))
      .first()
    if (appClash) throw new Error('That email is already used in another clinic application')

    const oldEmail = app.contactEmail
    await ctx.db.patch(args.applicationId, { contactEmail: normalized })

    if (app.status === 'approved') {
      // Also patch the live clinic record
      const clinic = await ctx.db
        .query('clinics')
        .filter(q => q.eq(q.field('email'), oldEmail))
        .first()
      if (clinic) await ctx.db.patch(clinic._id, { email: normalized })

      // Retrigger Clerk activation + approval email (handled inside activateClinicAccount)
      await ctx.scheduler.runAfter(0, internal.clinics.activateClinicAccount, {
        contactEmail: normalized,
        contactName:  app.contactName,
        facilityName: app.facilityName,
      })
    }

    return { wasApproved: app.status === 'approved' }
  },
})

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

    // Cross-type uniqueness check at approval time
    if (args.decision === 'approved') {
      const conflictingMfr = await ctx.db
        .query('manufacturers')
        .withIndex('by_email', (q) => q.eq('contactEmail', app.contactEmail))
        .first()
      if (conflictingMfr && conflictingMfr.status !== 'rejected') {
        throw new Error(`Cannot approve: ${app.contactEmail} is already registered as a manufacturer account. Each email can only belong to one account type.`)
      }
    }

    await ctx.db.patch(args.applicationId, {
      status:      args.decision,
      reviewedAt:  Date.now(),
      reviewNotes: args.notes,
    })

    if (args.decision === 'approved') {
      // Reactivate an existing (possibly suspended) clinic rather than creating a
      // duplicate — this handles the rejected → re-approved path correctly.
      const existingClinic = await ctx.db
        .query('clinics')
        .filter((q) => q.eq(q.field('email'), app.contactEmail))
        .first()

      let clinicId
      if (existingClinic) {
        await ctx.db.patch(existingClinic._id, { status: 'active' })
        clinicId = existingClinic._id
      } else {
        clinicId = await ctx.db.insert('clinics', {
          name:           app.facilityName,
          address:        app.facilityAddress,
          city:           app.facilityCity ?? undefined,
          country:        app.facilityCountry,
          phone:          app.facilityPhone ?? app.contactPhone ?? undefined,
          email:          app.contactEmail,
          website:        app.facilityWebsite ?? undefined,
          capabilities:   app.services,
          status:         'active',
          showToPatients: true,
        })
      }

      // If we know the submitting Clerk user, link them as admin staff
      // (guard against duplicate staff rows on re-approval)
      if (app.clerkUserId) {
        const user = await ctx.db
          .query('users')
          .withIndex('by_clerk', (q) => q.eq('clerkId', app.clerkUserId!))
          .first()

        if (user) {
          const existingStaff = await ctx.db
            .query('staff')
            .withIndex('by_clinic', (q) => q.eq('clinicId', clinicId))
            .filter((q) => q.eq(q.field('userId'), user._id))
            .first()
          if (!existingStaff) {
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
      }

      // Activate the Clerk account + send approval email (both handled inside activateClinicAccount)
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

/**
 * Re-trigger clinic account activation + resend the approval email.
 * Used by admin when the original activation failed (e.g. Clerk key was missing).
 */
/** Internal: fetch the application data needed by retriggerClinicActivation. */
export const getApplicationForActivation = internalQuery({
  args: { applicationId: v.id('clinicApplications'), adminClerkId: v.string() },
  handler: async (ctx, args) => {
    const admin = await ctx.db
      .query('users')
      .withIndex('by_clerk', (q) => q.eq('clerkId', args.adminClerkId))
      .first()
    if (!admin || admin.role !== 'admin') throw new Error('Admin access required')
    const app = await ctx.db.get(args.applicationId)
    if (!app) throw new Error('Application not found')
    if (app.status !== 'approved') throw new Error('Application must be approved first')
    return {
      clerkUserId:  app.clerkUserId ?? null,
      contactEmail: app.contactEmail,
      contactName:  app.contactName,
      facilityName: app.facilityName,
    }
  },
})

/**
 * Re-trigger clinic account activation synchronously so errors surface in the UI.
 * Runs as a public action so Clerk API failures are visible to the admin
 * rather than silently retrying in the background.
 */
export const retriggerClinicActivation = action({
  args: { applicationId: v.id('clinicApplications') },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) throw new Error('Not authenticated')

    const app = await ctx.runQuery(internal.clinics.getApplicationForActivation, {
      applicationId: args.applicationId,
      adminClerkId:  identity.subject,
    })

    await ctx.runAction(internal.clinics.activateClinicAccount, {
      clerkUserId:  app.clerkUserId ?? undefined,
      contactEmail: app.contactEmail,
      contactName:  app.contactName,
      facilityName: app.facilityName,
    })
  },
})

/** Admin manually adds a clinic, bypassing the onboarding form. */
export const adminAddClinic = mutation({
  args: {
    clinicName:      v.string(),
    contactName:     v.string(),
    contactEmail:    v.string(),
    facilityType:    v.string(),
    facilityAddress: v.string(),
    facilityCountry: v.string(),
    facilityCity:    v.optional(v.string()),
    facilityPhone:   v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) throw new Error('Not authenticated')
    const admin = await ctx.db
      .query('users')
      .withIndex('by_clerk', (q) => q.eq('clerkId', identity.subject))
      .first()
    if (!admin || admin.role !== 'admin') throw new Error('Admin access required')

    // Cross-type uniqueness
    const existingApp = await ctx.db
      .query('clinicApplications')
      .withIndex('by_email', (q) => q.eq('contactEmail', args.contactEmail))
      .first()
    if (existingApp && existingApp.status !== 'rejected') {
      throw new Error('A clinic already exists for this email address.')
    }
    const existingMfr = await ctx.db
      .query('manufacturers')
      .withIndex('by_email', (q) => q.eq('contactEmail', args.contactEmail))
      .first()
    if (existingMfr && existingMfr.status !== 'rejected') {
      throw new Error('This email is already registered as a manufacturer account.')
    }

    const now = Date.now()
    const appId = await ctx.db.insert('clinicApplications', {
      contactName:     args.contactName,
      contactEmail:    args.contactEmail,
      facilityName:    args.clinicName,
      facilityType:    args.facilityType,
      facilityAddress: args.facilityAddress,
      facilityCity:    args.facilityCity,
      facilityCountry: args.facilityCountry,
      facilityPhone:   args.facilityPhone,
      services:        [],
      status:          'approved',
      submittedAt:     now,
      reviewedAt:      now,
    })

    await ctx.db.insert('clinics', {
      name:           args.clinicName,
      address:        args.facilityAddress,
      city:           args.facilityCity,
      country:        args.facilityCountry,
      phone:          args.facilityPhone,
      email:          args.contactEmail,
      capabilities:   [],
      status:         'active',
      showToPatients: true,
    })

    await ctx.scheduler.runAfter(0, internal.clinics.activateClinicAccount, {
      contactEmail: args.contactEmail,
      contactName:  args.contactName,
      facilityName: args.clinicName,
    })

    return { appId }
  },
})

/** Internal: delete clinic application records (called by deleteRejectedApplications action). */
export const deleteApplicationRecords = internalMutation({
  args: {
    applicationIds: v.array(v.id('clinicApplications')),
    adminClerkId:   v.string(),
  },
  handler: async (ctx, args) => {
    const admin = await ctx.db
      .query('users')
      .withIndex('by_clerk', (q) => q.eq('clerkId', args.adminClerkId))
      .first()
    if (!admin || admin.role !== 'admin') throw new Error('Admin access required')

    const emails: string[] = []
    for (const id of args.applicationIds) {
      const app = await ctx.db.get(id)
      if (!app) continue
      if (app.status !== 'rejected') throw new Error(`Application ${id} is not rejected — only rejected applications can be deleted.`)
      emails.push(app.contactEmail)
      await ctx.db.delete(id)
    }
    return emails
  },
})

/** Delete rejected clinic applications and clean up the corresponding Clerk accounts. */
export const deleteRejectedApplications = action({
  args: { applicationIds: v.array(v.id('clinicApplications')) },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) throw new Error('Not authenticated')

    const emails = await ctx.runMutation(internal.clinics.deleteApplicationRecords, {
      applicationIds: args.applicationIds,
      adminClerkId:   identity.subject,
    }) as string[]

    const secretKey = process.env.CLERK_SECRET_KEY
    if (!secretKey || emails.length === 0) return

    for (const email of emails) {
      // Revoke any pending Clerk invitations for this email
      const invRes = await fetch(
        `https://api.clerk.com/v1/invitations?email_address=${encodeURIComponent(email)}&status=pending&limit=10`,
        { headers: { Authorization: `Bearer ${secretKey}` } },
      ).catch(() => null)
      if (invRes?.ok) {
        const data = await invRes.json()
        const arr: { id: string }[] = Array.isArray(data) ? data : (data?.data ?? [])
        for (const inv of arr) {
          await fetch(`https://api.clerk.com/v1/invitations/${inv.id}/revoke`, {
            method: 'POST', headers: { Authorization: `Bearer ${secretKey}` },
          }).catch(() => {})
        }
      }

      // Delete the Clerk user only if they are a clinic_staff user (we created them)
      // — leave patients, manufacturers, and admins alone.
      const userRes = await fetch(
        `https://api.clerk.com/v1/users?email_address=${encodeURIComponent(email)}&limit=1`,
        { headers: { Authorization: `Bearer ${secretKey}` } },
      ).catch(() => null)
      if (userRes?.ok) {
        const users = await userRes.json() as { id: string; public_metadata?: { role?: string } }[]
        for (const u of users) {
          const role = u.public_metadata?.role
          if (role === 'clinic_staff' || !role) {
            await fetch(`https://api.clerk.com/v1/users/${u.id}`, {
              method: 'DELETE', headers: { Authorization: `Bearer ${secretKey}` },
            }).catch(() => {})
          }
        }
      }
    }
  },
})

/** Summary statistics for the current user's clinic dashboard. */
export const getClinicStats = query({
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

    const approvedRequests = await ctx.db
      .query('accessRequests')
      .withIndex('by_clinic', (q) => q.eq('clinicId', staffRow.clinicId))
      .filter((q) => q.eq(q.field('status'), 'approved'))
      .take(500)

    const uniquePatientIds = [...new Set(approvedRequests.map((r) => r.patientId))]
    const patients = (
      await Promise.all(uniquePatientIds.map((id) => ctx.db.get(id)))
    ).filter(Boolean)

    // Team size (active staff)
    const allStaff = await ctx.db
      .query('staff')
      .withIndex('by_clinic', (q) => q.eq('clinicId', staffRow.clinicId))
      .take(200)
    const teamCount = allStaff.filter((s) => s.status === 'active').length

    return {
      total:     patients.length,
      verified:  patients.filter((p) => p?.verificationStatus === 'active').length,
      pending:   patients.filter((p) => p?.verificationStatus !== 'active').length,
      teamCount,
    }
  },
})

/** Patients who have approved access requests for this clinic (incl. records shared by patients). */
export const listClinicPatients = query({
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

    const requests = await ctx.db
      .query('accessRequests')
      .withIndex('by_clinic', (q) => q.eq('clinicId', staffRow.clinicId))
      .filter((q) => q.eq(q.field('status'), 'approved'))
      .collect()

    const seen = new Set<string>()
    const results = []
    for (const req of requests) {
      const pid = req.patientId.toString()
      if (seen.has(pid)) continue
      seen.add(pid)
      const patient = await ctx.db.get(req.patientId)
      if (!patient) continue
      results.push({
        _id:                    patient._id,
        implantIdCode:          patient.implantIdCode,
        firstName:              patient.firstName,
        lastName:               patient.lastName,
        verificationStatus:     patient.verificationStatus,
        selfReportedDevice:     patient.selfReportedDevice,
        selfReportedDeviceType: patient.selfReportedDeviceType,
        lastAccessed:           req.requestedAt,
      })
    }
    return results.sort((a, b) => (b.lastAccessed ?? 0) - (a.lastAccessed ?? 0))
  },
})

/** Recent patient lookups for the clinic dashboard (reads auditLog). */
export const getRecentLookups = query({
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

    const entries = await ctx.db
      .query('auditLog')
      .withIndex('by_clinic', (q) => q.eq('clinicId', staffRow.clinicId))
      .order('desc')
      .take(20)

    const results = await Promise.all(
      entries.map(async (e) => {
        let patientName = '—'
        let implantIdCode = ''
        let deviceName: string | undefined
        if (e.target) {
          try {
            const p = await ctx.db.get(e.target as any) as any
            if (p) {
              patientName  = [p.firstName, p.lastName].filter(Boolean).join(' ') || '—'
              implantIdCode = p.implantIdCode ?? ''
              deviceName   = p.selfReportedDevice
            }
          } catch { /* invalid id */ }
        }
        return { _id: e._id, patientName, implantIdCode, deviceName, action: e.action, createdAt: e.createdAt }
      })
    )
    return results
  },
})

/** Today's lookup count for the clinic (from auditLog). */
export const getTodayLookupCount = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) return 0
    const user = await ctx.db
      .query('users')
      .withIndex('by_clerk', (q) => q.eq('clerkId', identity.subject))
      .first()
    if (!user) return 0
    const staffRow = await ctx.db
      .query('staff')
      .withIndex('by_user', (q) => q.eq('userId', user._id))
      .first()
    if (!staffRow) return 0

    const todayStart = new Date()
    todayStart.setHours(0, 0, 0, 0)
    const entries = await ctx.db
      .query('auditLog')
      .withIndex('by_clinic', (q) => q.eq('clinicId', staffRow.clinicId))
      .filter((q) => q.gte(q.field('createdAt'), todayStart.getTime()))
      .collect()
    return entries.length
  },
})
