import { mutation, query, internalAction, internalMutation, internalQuery, action } from './_generated/server'
import { v }                               from 'convex/values'
import { internal }                        from './_generated/api'

// ── File upload ───────────────────────────────────────────────────────────────

/** Admin: generate a one-time upload URL for an accreditation document. */
export const adminGenerateUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) throw new Error('Not authenticated')
    const user = await ctx.db.query('users').withIndex('by_clerk', q => q.eq('clerkId', identity.subject)).first()
    if (!user || user.role !== 'admin') throw new Error('Admin access required')
    return await ctx.storage.generateUploadUrl()
  },
})

/** Generate a one-time upload URL for the accreditation document. */
export const generateUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) throw new Error('Not authenticated')
    const user = await ctx.db.query('users').withIndex('by_clerk', q => q.eq('clerkId', identity.subject)).first()
    if (!user) throw new Error('User not found')
    const staffRow = await ctx.db.query('staff').withIndex('by_user', q => q.eq('userId', user._id)).first()
    if (!staffRow) throw new Error('Not a clinic staff member')
    return await ctx.storage.generateUploadUrl()
  },
})

/** Save a clinic logo after upload — gets URL from storage and patches the clinic record. */
export const saveClinicLogoUrl = mutation({
  args: { storageId: v.id('_storage') },
  handler: async (ctx, { storageId }) => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) throw new Error('Not authenticated')
    const user = await ctx.db.query('users').withIndex('by_clerk', q => q.eq('clerkId', identity.subject)).first()
    if (!user) throw new Error('User not found')
    const staffRow = await ctx.db.query('staff').withIndex('by_user', q => q.eq('userId', user._id)).first()
    if (!staffRow) throw new Error('Not a clinic staff member')
    const url = await ctx.storage.getUrl(storageId)
    if (!url) throw new Error('Failed to get URL for uploaded file')
    await ctx.db.patch(staffRow.clinicId, { logoUrl: url })
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

    // For approved applications, find the associated clinic (admin can then edit capabilities)
    let clinic: { _id: string; name: string; capabilities: string[] } | null = null
    if (app.status === 'approved') {
      const found = await ctx.db
        .query('clinics')
        .filter((q) => q.eq(q.field('name'), app.facilityName))
        .first()
      if (found) clinic = { _id: found._id, name: found.name, capabilities: found.capabilities ?? [] }
    }

    return { ...app, fileUrl, clinic }
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

    if (!createRes.ok) {
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
    clinicName:   v.string(),
    jobType:      v.union(v.literal('radiographer'), v.literal('surgeon'), v.literal('admin')),
  },
  handler: async (ctx, args) => {
    const secretKey = process.env.CLERK_SECRET_KEY
    if (!secretKey) {
      console.error('[staff] CLERK_SECRET_KEY not set')
      return
    }
    const role = args.jobType === 'surgeon' ? 'surgeon' : 'clinic_staff'

    // Check if account already exists in Clerk
    const searchRes = await fetch(
      `https://api.clerk.com/v1/users?email_address=${encodeURIComponent(args.contactEmail)}&limit=1`,
      { headers: { Authorization: `Bearer ${secretKey}` } },
    )
    if (searchRes.ok) {
      const found = (await searchRes.json()) as { id: string }[]
      if (found.length > 0) {
        // Existing user — patch their role and send a standard login-link email
        await fetch(`https://api.clerk.com/v1/users/${found[0].id}/metadata`, {
          method:  'PATCH',
          headers: { Authorization: `Bearer ${secretKey}`, 'Content-Type': 'application/json' },
          body:    JSON.stringify({ public_metadata: { role } }),
        })
        await ctx.runAction(internal.email.sendStaffInviteEmail, {
          contactName:  args.contactName,
          contactEmail: args.contactEmail,
          clinicName:   args.clinicName,
          jobType:      args.jobType,
        })
        return
      }
    }

    // New user — create their Clerk account directly so the login link works immediately
    const nameParts = args.contactName.trim().split(/\s+/)
    const firstName = nameParts[0] ?? ''
    const lastName  = nameParts.slice(1).join(' ') || undefined

    const createRes = await fetch('https://api.clerk.com/v1/users', {
      method:  'POST',
      headers: { Authorization: `Bearer ${secretKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email_address:    [args.contactEmail],
        first_name:       firstName,
        last_name:        lastName,
        public_metadata:  { role },
        skip_password_requirement: true,
        skip_password_checks:      true,
      }),
    })

    if (!createRes.ok) {
      console.error('[staff] Clerk user creation failed:', createRes.status, await createRes.text())
    }

    await ctx.runAction(internal.email.sendStaffInviteEmail, {
      contactName:  args.contactName,
      contactEmail: args.contactEmail,
      clinicName:   args.clinicName,
      jobType:      args.jobType,
    })
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

    // Create / update their Clerk account and send invitation email
    const clinic = await ctx.db.get(staffRow.clinicId)
    await ctx.scheduler.runAfter(0, internal.clinics.createStaffAccount, {
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
          billingStatus:  'trialing',
          trialEndsAt:    Date.now() + 14 * 24 * 60 * 60 * 1000,
        })
      }

      // Always create the clinic contact's staff row.
      // If their users row exists (they were logged in when applying), use it.
      // Otherwise create a placeholder (clerkId='') — upsertUser will link the
      // real Clerk ID when they first sign in. This mirrors addStaffMember.
      {
        let contactUser = app.clerkUserId
          ? await ctx.db
              .query('users')
              .withIndex('by_clerk', (q) => q.eq('clerkId', app.clerkUserId!))
              .first()
          : await ctx.db
              .query('users')
              .withIndex('by_email', (q) => q.eq('email', app.contactEmail))
              .first()

        if (!contactUser) {
          const uid = await ctx.db.insert('users', {
            clerkId: app.clerkUserId ?? '',
            email:   app.contactEmail,
            role:    'clinic_staff',
            name:    app.contactName,
          })
          contactUser = await ctx.db.get(uid)
        }

        if (contactUser) {
          const existingStaff = await ctx.db
            .query('staff')
            .withIndex('by_clinic', (q) => q.eq('clinicId', clinicId))
            .filter((q) => q.eq(q.field('userId'), contactUser!._id))
            .first()
          if (!existingStaff) {
            await ctx.db.insert('staff', {
              userId:      contactUser._id,
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
 * One-shot repair: for every approved clinic application that has no staff row,
 * find-or-create the users row and create the staff row. Run once from the
 * Convex dashboard (or via a temporary admin button) to fix clinics approved
 * before the reviewApplication fix was deployed.
 */
export const backfillClinicStaffRows = internalMutation({
  args: {},
  handler: async (ctx) => {
    const apps = await ctx.db
      .query('clinicApplications')
      .withIndex('by_status', q => q.eq('status', 'approved'))
      .collect()

    let fixed = 0
    for (const app of apps) {
      // Find the clinic
      const clinic = await ctx.db
        .query('clinics')
        .filter(q => q.eq(q.field('email'), app.contactEmail))
        .first()
      if (!clinic) continue

      // Check if ANY staff row already exists for this clinic
      const existingStaff = await ctx.db
        .query('staff')
        .withIndex('by_clinic', q => q.eq('clinicId', clinic._id))
        .first()
      if (existingStaff) continue // already has staff — skip

      // Find or create the users row
      let contactUser = app.clerkUserId
        ? await ctx.db.query('users').withIndex('by_clerk', q => q.eq('clerkId', app.clerkUserId!)).first()
        : await ctx.db.query('users').withIndex('by_email', q => q.eq('email', app.contactEmail)).first()

      if (!contactUser) {
        const uid = await ctx.db.insert('users', {
          clerkId: app.clerkUserId ?? '',
          email:   app.contactEmail,
          role:    'clinic_staff',
          name:    app.contactName,
        })
        contactUser = await ctx.db.get(uid)
      }

      if (contactUser) {
        await ctx.db.insert('staff', {
          userId:      contactUser._id,
          clinicId:    clinic._id,
          jobType:     'admin',
          accessLevel: 'admin',
          allPatients: true,
          status:      'active',
        })
        fixed++
      }
    }

    return { fixed, total: apps.length }
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
    clinicName:          v.string(),
    contactName:         v.string(),
    contactEmail:        v.string(),
    contactPhone:        v.optional(v.string()),
    jobTitle:            v.optional(v.string()),
    facilityType:        v.string(),
    facilityAddress:     v.string(),
    facilityCountry:     v.string(),
    facilityCity:        v.optional(v.string()),
    facilityPhone:       v.optional(v.string()),
    regulatoryBody:      v.optional(v.string()),
    registrationNum:     v.optional(v.string()),
    services:            v.optional(v.array(v.string())),
    additionalInfo:      v.optional(v.string()),
    mriScannerCount:     v.optional(v.number()),
    staffUsingImplantId: v.optional(v.number()),
    storageId:           v.optional(v.id('_storage')),
    fileName:            v.optional(v.string()),
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
    const svcList = args.services ?? []
    const appId = await ctx.db.insert('clinicApplications', {
      contactName:         args.contactName,
      contactEmail:        args.contactEmail,
      contactPhone:        args.contactPhone,
      jobTitle:            args.jobTitle,
      facilityName:        args.clinicName,
      facilityType:        args.facilityType,
      facilityAddress:     args.facilityAddress,
      facilityCity:        args.facilityCity,
      facilityCountry:     args.facilityCountry,
      facilityPhone:       args.facilityPhone,
      regulatoryBody:      args.regulatoryBody,
      registrationNum:     args.registrationNum,
      services:            svcList,
      additionalInfo:      args.additionalInfo,
      mriScannerCount:     args.mriScannerCount,
      staffUsingImplantId: args.staffUsingImplantId,
      storageId:           args.storageId,
      fileName:            args.fileName,
      status:              'approved',
      submittedAt:         now,
      reviewedAt:          now,
    })

    await ctx.db.insert('clinics', {
      name:           args.clinicName,
      address:        args.facilityAddress,
      city:           args.facilityCity,
      country:        args.facilityCountry,
      phone:          args.facilityPhone,
      email:          args.contactEmail,
      capabilities:   svcList,
      status:         'active',
      showToPatients: true,
      billingStatus:  'trialing',
      trialEndsAt:    Date.now() + 14 * 24 * 60 * 60 * 1000,
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
      .take(200)

    const seen = new Set<string>()
    const results = []
    for (const req of requests) {
      const pid = req.patientId.toString()
      if (seen.has(pid)) continue
      seen.add(pid)
      const patient = await ctx.db.get(req.patientId)
      if (!patient) continue
      const patientUser = patient.userId ? await ctx.db.get(patient.userId) : null
      results.push({
        _id:                    patient._id,
        implantIdCode:          patient.implantIdCode,
        firstName:              patient.firstName,
        lastName:               patient.lastName,
        verificationStatus:     patient.verificationStatus,
        selfReportedDevice:     patient.selfReportedDevice,
        selfReportedDeviceType: patient.selfReportedDeviceType,
        lastAccessed:           req.requestedAt,
        accountActivated:       !!(patientUser?.clerkId),
      })
    }
    return results.sort((a, b) => (b.lastAccessed ?? 0) - (a.lastAccessed ?? 0))
  },
})

/** Check if the calling clinic has already saved a patient. */
export const isPatientSaved = query({
  args: { patientId: v.id('patients') },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) return null
    const user = await ctx.db.query('users').withIndex('by_clerk', q => q.eq('clerkId', identity.subject)).first()
    if (!user) return null
    const staffRow = await ctx.db.query('staff').withIndex('by_user', q => q.eq('userId', user._id)).first()
    if (!staffRow) return null  // not clinic staff — hide the save button
    const existing = await ctx.db
      .query('accessRequests')
      .withIndex('by_clinic', q => q.eq('clinicId', staffRow.clinicId))
      .filter(q => q.and(q.eq(q.field('patientId'), args.patientId), q.eq(q.field('status'), 'approved')))
      .first()
    return !!existing
  },
})

/** Save a scanned patient to the clinic's patient list (creates an approved access request). */
export const savePatientToClinic = mutation({
  args: { patientId: v.id('patients') },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) throw new Error('Not authenticated')
    const user = await ctx.db.query('users').withIndex('by_clerk', q => q.eq('clerkId', identity.subject)).first()
    if (!user) throw new Error('User not found')
    const staffRow = await ctx.db.query('staff').withIndex('by_user', q => q.eq('userId', user._id)).first()
    if (!staffRow) throw new Error('Not a clinic staff member')

    // Idempotent — update to approved if a non-approved request exists, else insert
    const existing = await ctx.db
      .query('accessRequests')
      .withIndex('by_clinic', q => q.eq('clinicId', staffRow.clinicId))
      .filter(q => q.eq(q.field('patientId'), args.patientId))
      .first()

    if (existing) {
      if (existing.status !== 'approved') {
        await ctx.db.patch(existing._id, { status: 'approved', resolvedAt: Date.now() })
      }
      return
    }

    await ctx.db.insert('accessRequests', {
      clinicId:    staffRow.clinicId,
      staffId:     staffRow._id,
      patientId:   args.patientId,
      status:      'approved',
      requestedAt: Date.now(),
      resolvedAt:  Date.now(),
      reason:      'Saved from scan',
    })
  },
})

/** Remove a patient from the clinic's saved list. */
export const unsavePatientFromClinic = mutation({
  args: { patientId: v.id('patients') },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) throw new Error('Not authenticated')
    const user = await ctx.db.query('users').withIndex('by_clerk', q => q.eq('clerkId', identity.subject)).first()
    if (!user) throw new Error('User not found')
    const staffRow = await ctx.db.query('staff').withIndex('by_user', q => q.eq('userId', user._id)).first()
    if (!staffRow) throw new Error('Not a clinic staff member')

    const requests = await ctx.db
      .query('accessRequests')
      .withIndex('by_clinic', q => q.eq('clinicId', staffRow.clinicId))
      .filter(q => q.eq(q.field('patientId'), args.patientId))
      .collect()

    for (const req of requests) {
      await ctx.db.delete(req._id)
    }
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

export const getPatientAuditEntries = query({
  args: { patientId: v.id('patients') },
  handler: async (ctx, args) => {
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
      .withIndex('by_clinic', (q) => q.eq('clinicId', (staffRow as any).clinicId))
      .order('desc')
      .take(200)
    return entries
      .filter(e => e.target === (args.patientId as string))
      .slice(0, 10)
  },
})

/** Full clinic activity log — enriched with staff name and patient info. */
export const getClinicAuditLog = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
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
      .take(args.limit ?? 200)

    return await Promise.all(
      entries.map(async (e) => {
        let staffName = 'Unknown'
        try {
          const sr = await ctx.db.get(e.staffId)
          if (sr) {
            const u = await ctx.db.get(sr.userId)
            if (u) {
              const n = u.name ?? ''
              // Fallback: if name is a raw Clerk ID (user_xxx), use email prefix instead
              staffName = (n && !n.startsWith('user_'))
                ? n
                : (u.email ? u.email.split('@')[0] : 'Unknown')
            }
          }
        } catch (err) { console.error('[audit] Failed to resolve staff name for entry', e._id, err) }

        let patientName = ''
        let patientCode = ''
        if (e.target) {
          try {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const p = await ctx.db.get(e.target as any) as any
            if (p) {
              patientName = [p.firstName, p.lastName].filter(Boolean).join(' ')
              patientCode = p.implantIdCode ?? ''
            }
          } catch (err) { console.error('[audit] Failed to resolve patient for entry', e._id, err) }
        }

        return {
          _id:         e._id,
          action:      e.action,
          detail:      e.detail ?? '',
          staffName,
          patientName,
          patientCode,
          createdAt:   e.createdAt,
        }
      })
    )
  },
})

/** Logged-in staff user's own clinic info (name + id) — used to pre-fill forms. */
export const getMyClinicInfo = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) return null
    const user = await ctx.db.query('users').withIndex('by_clerk', q => q.eq('clerkId', identity.subject)).first()
    if (!user) return null
    const staffRow = await ctx.db.query('staff').withIndex('by_user', q => q.eq('userId', user._id)).first()
    if (!staffRow) return null
    const clinic = await ctx.db.get(staffRow.clinicId)
    return clinic ? { _id: clinic._id, name: clinic.name } : null
  },
})

/** Audit entries for a specific staff member (clinic admin only). */
export const getStaffAuditLog = query({
  args: { staffId: v.id('staff') },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) return []
    const user = await ctx.db.query('users').withIndex('by_clerk', q => q.eq('clerkId', identity.subject)).first()
    if (!user) return []
    const myStaff = await ctx.db.query('staff').withIndex('by_user', q => q.eq('userId', user._id)).first()
    if (!myStaff || myStaff.jobType !== 'admin') return []
    const targetStaff = await ctx.db.get(args.staffId)
    if (!targetStaff || targetStaff.clinicId.toString() !== myStaff.clinicId.toString()) return []
    const entries = await ctx.db
      .query('auditLog')
      .withIndex('by_staff', q => q.eq('staffId', args.staffId))
      .order('desc')
      .take(30)
    return await Promise.all(entries.map(async (e) => {
      let patientName = ''
      let patientCode = ''
      if (e.target) {
        try {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const p = await ctx.db.get(e.target as any) as any
          if (p) {
            patientName = [p.firstName, p.lastName].filter(Boolean).join(' ')
            patientCode = p.implantIdCode ?? ''
          }
        } catch { /* invalid id */ }
      }
      return {
        _id:         e._id,
        action:      e.action,
        detail:      e.detail ?? '',
        patientName,
        patientCode,
        createdAt:   e.createdAt,
      }
    }))
  },
})

/** Remove a staff member from the clinic (admin only). Deletes their staff row. */
export const revokeClinicStaff = mutation({
  args: { staffId: v.id('staff') },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) throw new Error('Not authenticated')
    const user = await ctx.db.query('users').withIndex('by_clerk', q => q.eq('clerkId', identity.subject)).first()
    if (!user) throw new Error('User not found')
    const myStaff = await ctx.db.query('staff').withIndex('by_user', q => q.eq('userId', user._id)).first()
    if (!myStaff || myStaff.jobType !== 'admin') throw new Error('Only admins can revoke staff access')
    const targetStaff = await ctx.db.get(args.staffId)
    if (!targetStaff || targetStaff.clinicId.toString() !== myStaff.clinicId.toString()) {
      throw new Error('Staff member not found in your clinic')
    }
    if (targetStaff._id.toString() === myStaff._id.toString()) {
      throw new Error('You cannot revoke your own access')
    }
    await ctx.db.delete(args.staffId)
    return { revoked: true }
  },
})

/** Update basic clinic information (name, email, phone, address). Admin staff only. */
export const updateClinicInfo = mutation({
  args: {
    name:    v.string(),
    email:   v.optional(v.string()),
    phone:   v.optional(v.string()),
    address: v.string(),
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
    if (!staffRow) throw new Error('Not a clinic staff member')
    if (staffRow.jobType !== 'admin') throw new Error('Admin access required')

    await ctx.db.patch(staffRow.clinicId, {
      name:    args.name.trim(),
      email:   args.email?.trim() || undefined,
      phone:   args.phone?.trim() || undefined,
      address: args.address.trim(),
    })

    return { updated: true }
  },
})

/** Update clinic capability tags (admin staff only). */
export const updateClinicCapabilities = mutation({
  args: { capabilities: v.array(v.string()) },
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
    if (!staffRow) throw new Error('Not a clinic staff member')
    if (staffRow.jobType !== 'admin') throw new Error('Admin access required')

    await ctx.db.patch(staffRow.clinicId, { capabilities: args.capabilities })
    return { updated: true }
  },
})

/** Update clinic capability tags (master admin — accepts explicit clinicId). */
export const adminUpdateClinicCapabilities = mutation({
  args: { clinicId: v.id('clinics'), capabilities: v.array(v.string()) },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) throw new Error('Not authenticated')

    const user = await ctx.db
      .query('users')
      .withIndex('by_clerk', (q) => q.eq('clerkId', identity.subject))
      .first()
    if (!user || user.role !== 'admin') throw new Error('Admin access required')

    await ctx.db.patch(args.clinicId, { capabilities: args.capabilities })
    return { updated: true }
  },
})

/**
 * Record a clinic staff member scanning / viewing a patient card.
 * Writes to auditLog, records device lookups, and notifies the patient.
 *
 * Replaces the recordPatientLookup call on the clinic portal because that
 * mutation silently exits when the staff row is missing. This version uses
 * multiple fallback strategies to find (or create) the staff row, so it
 * works even when the staff row was never created at approval time.
 */
export const logClinicPatientScan = mutation({
  args: { patientId: v.id('patients') },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) return

    // ── 1. Find user row ────────────────────────────────────────────────────
    const user = await ctx.db
      .query('users')
      .withIndex('by_clerk', (q) => q.eq('clerkId', identity.subject))
      .first()
    if (!user) return

    // ── 2. Find or create staff row ─────────────────────────────────────────
    let staffRow = await ctx.db
      .query('staff')
      .withIndex('by_user', (q) => q.eq('userId', user._id))
      .first()

    if (!staffRow) {
      // Strategy A: find approved application by clerkUserId → match clinic by email
      let clinicId: string | null = null

      const appByClerk = await ctx.db
        .query('clinicApplications')
        .withIndex('by_clerk', (q) => q.eq('clerkUserId', identity.subject))
        .first()

      if (appByClerk?.status === 'approved') {
        const c = await ctx.db
          .query('clinics')
          .filter((q) => q.eq(q.field('email'), appByClerk.contactEmail))
          .first()
        if (c) clinicId = c._id
      }

      // Strategy B: find approved application by user's email (case-insensitive)
      if (!clinicId && user.email) {
        const appByEmail = await ctx.db
          .query('clinicApplications')
          .withIndex('by_email', (q) => q.eq('contactEmail', user.email))
          .first()
        if (appByEmail?.status === 'approved') {
          const c = await ctx.db
            .query('clinics')
            .filter((q) => q.eq(q.field('email'), appByEmail.contactEmail))
            .first()
          if (c) clinicId = c._id
        }
      }

      // Strategy C: scan all active clinics and match email case-insensitively
      if (!clinicId && user.email) {
        const allActive = await ctx.db
          .query('clinics')
          .withIndex('by_status', (q) => q.eq('status', 'active'))
          .collect()
        const match = allActive.find(
          (c) => c.email?.toLowerCase() === user.email.toLowerCase(),
        )
        if (match) clinicId = match._id
      }

      if (!clinicId) return

      const staffId = await ctx.db.insert('staff', {
        userId:      user._id,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        clinicId:    clinicId as any,
        jobType:     'admin',
        accessLevel: 'admin',
        allPatients: true,
        status:      'active',
      })
      staffRow = await ctx.db.get(staffId)
      if (!staffRow) return
    }

    // ── 3. Write audit log ───────────────────────────────────────────────────
    await ctx.db.insert('auditLog', {
      clinicId:  staffRow.clinicId,
      staffId:   staffRow._id,
      action:    'patient_lookup',
      target:    args.patientId,
      detail:    'Patient record viewed via scan',
      createdAt: Date.now(),
    })

    // ── 4. Record device lookups ─────────────────────────────────────────────
    const linkedDevices = await ctx.db
      .query('patientDevices')
      .withIndex('by_patient', (q) => q.eq('patientId', args.patientId))
      .collect()
    const now = Date.now()
    for (const link of linkedDevices) {
      await ctx.db.insert('deviceLookups', { deviceId: link.deviceId, createdAt: now })
    }

    // ── 5. Notify patient ────────────────────────────────────────────────────
    const clinic = await ctx.db.get(staffRow.clinicId)
    const patient = await ctx.db.get(args.patientId)
    if (patient?.userId) {
      await ctx.db.insert('notifications', {
        userId:    patient.userId,
        type:      'record_viewed',
        title:     'Your record was accessed',
        body:      `Your implant record was viewed by ${clinic?.name ?? 'a clinic'}.`,
        read:      false,
        relatedId: args.patientId,
        createdAt: Date.now(),
      })
    }
  },
})

// ── Billing ───────────────────────────────────────────────────────────────────

/** Return billing status for the current clinic staff member's clinic. */
export const getBillingStatus = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) return null
    const user = await ctx.db.query('users').withIndex('by_clerk', q => q.eq('clerkId', identity.subject)).first()
    if (!user) return null
    const staffRow = await ctx.db.query('staff').withIndex('by_user', q => q.eq('userId', user._id)).first()
    if (!staffRow) return null
    const clinic = await ctx.db.get(staffRow.clinicId)
    if (!clinic) return null
    return {
      foreverFree:          clinic.foreverFree ?? false,
      billingPlan:          clinic.billingPlan ?? null,
      billingStatus:        clinic.billingStatus ?? null,
      trialEndsAt:          clinic.trialEndsAt ?? null,
      currentPeriodEnd:     clinic.currentPeriodEnd ?? null,
      gracePeriodEndsAt:    clinic.gracePeriodEndsAt ?? null,
      stripeCustomerId:     clinic.stripeCustomerId ?? null,
      stripeSubscriptionId: clinic.stripeSubscriptionId ?? null,
      clinicId:             staffRow.clinicId,
    }
  },
})

/** Internal: update billing fields on a clinic from Stripe webhook data. */
export const updateBillingFromStripe = mutation({
  args: {
    serviceKey:           v.string(),
    clinicId:             v.id('clinics'),
    billingPlan:          v.optional(v.union(v.literal('per_user'), v.literal('clinics'), v.literal('large_team'))),
    billingStatus:        v.union(v.literal('trialing'), v.literal('active'), v.literal('past_due'), v.literal('canceled')),
    stripeCustomerId:     v.optional(v.string()),
    stripeSubscriptionId: v.optional(v.string()),
    currentPeriodEnd:     v.optional(v.number()),
    gracePeriodEndsAt:    v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    if (!process.env.STRIPE_CONVEX_SERVICE_KEY || args.serviceKey !== process.env.STRIPE_CONVEX_SERVICE_KEY) {
      throw new Error('Unauthorized')
    }
    const { clinicId, serviceKey: _sk, ...patch } = args
    await ctx.db.patch(clinicId, patch)
  },
})

/** Look up a clinic by its Stripe customer ID — protected by service key. */
export const getClinicByStripeCustomer = query({
  args: { serviceKey: v.string(), stripeCustomerId: v.string() },
  handler: async (ctx, { serviceKey, stripeCustomerId }) => {
    if (!process.env.STRIPE_CONVEX_SERVICE_KEY || serviceKey !== process.env.STRIPE_CONVEX_SERVICE_KEY) {
      throw new Error('Unauthorized')
    }
    return await ctx.db
      .query('clinics')
      .withIndex('by_stripe_customer', q => q.eq('stripeCustomerId', stripeCustomerId))
      .first()
  },
})

/** Admin: set or clear the forever-free flag on a clinic. */
export const setForeverFree = mutation({
  args: {
    clinicId:   v.id('clinics'),
    foreverFree: v.boolean(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) throw new Error('Not authenticated')
    const user = await ctx.db.query('users').withIndex('by_clerk', q => q.eq('clerkId', identity.subject)).first()
    if (!user || user.role !== 'admin') throw new Error('Admin access required')
    await ctx.db.patch(args.clinicId, { foreverFree: args.foreverFree })
  },
})

/** DEV/TEST ONLY — set billing state directly on a clinic for UI testing. */
export const devSetBillingState = mutation({
  args: {
    clinicId: v.id('clinics'),
    preset:   v.string(),
  },
  handler: async (ctx, { clinicId, preset }) => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) throw new Error('Not authenticated')
    const user = await ctx.db.query('users').withIndex('by_clerk', q => q.eq('clerkId', identity.subject)).first()
    if (!user || user.role !== 'admin') throw new Error('Admin access required')
    const now = Date.now()
    const DAY = 24 * 60 * 60 * 1000
    const patches: Record<string, unknown> = {
      trialing_14d:    { billingStatus: 'trialing',  trialEndsAt: now + 14 * DAY, billingPlan: undefined, gracePeriodEndsAt: undefined, stripeSubscriptionId: undefined },
      trialing_2d:     { billingStatus: 'trialing',  trialEndsAt: now + 2 * DAY,  billingPlan: undefined, gracePeriodEndsAt: undefined, stripeSubscriptionId: undefined },
      trial_expired:   { billingStatus: 'trialing',  trialEndsAt: now - 1 * DAY,  billingPlan: undefined, gracePeriodEndsAt: undefined, stripeSubscriptionId: undefined },
      active_per_user: { billingStatus: 'active',    billingPlan: 'per_user', trialEndsAt: undefined, gracePeriodEndsAt: undefined, currentPeriodEnd: now + 30 * DAY, stripeSubscriptionId: 'sub_test' },
      active_clinics:  { billingStatus: 'active',    billingPlan: 'clinics',  trialEndsAt: undefined, gracePeriodEndsAt: undefined, currentPeriodEnd: now + 30 * DAY, stripeSubscriptionId: 'sub_test' },
      past_due_grace:  { billingStatus: 'past_due',  gracePeriodEndsAt: now + 5 * DAY, billingPlan: 'clinics', stripeSubscriptionId: 'sub_test' },
      past_due_expired:{ billingStatus: 'past_due',  gracePeriodEndsAt: now - 1 * DAY, billingPlan: 'clinics', stripeSubscriptionId: 'sub_test' },
      canceled:        { billingStatus: 'canceled',  billingPlan: undefined, gracePeriodEndsAt: undefined, stripeSubscriptionId: undefined },
      forever_free:    { foreverFree: true, billingStatus: undefined, billingPlan: undefined },
      reset:           { billingStatus: 'trialing', trialEndsAt: now + 14 * DAY, billingPlan: undefined, foreverFree: false, gracePeriodEndsAt: undefined, stripeSubscriptionId: undefined },
    }
    const patch = patches[preset]
    if (!patch) throw new Error(`Unknown preset: ${preset}`)
    await ctx.db.patch(clinicId, patch as any)
  },
})

/** Master admin — all audit log entries across every clinic. */
export const listAllAuditLogs = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) return []
    const user = await ctx.db.query('users').withIndex('by_clerk', q => q.eq('clerkId', identity.subject)).first()
    if (!user || user.role !== 'admin') return []

    const entries = await ctx.db
      .query('auditLog')
      .order('desc')
      .take(args.limit ?? 500)

    return await Promise.all(
      entries.map(async (e) => {
        let staffName = 'Unknown'
        let clinicName = 'Unknown'
        let patientName = ''
        let patientCode = ''

        try {
          const staffRow = await ctx.db.get(e.staffId)
          if (staffRow) {
            const u = await ctx.db.get(staffRow.userId)
            if (u) {
              const n = u.name ?? ''
              staffName = (n && !n.startsWith('user_')) ? n : (u.email ? u.email.split('@')[0] : 'Unknown')
            }
          }
        } catch { /* ignore */ }

        try {
          const clinic = await ctx.db.get(e.clinicId)
          if (clinic) clinicName = (clinic as any).name ?? 'Unknown'
        } catch { /* ignore */ }

        if (e.target) {
          try {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const p = await ctx.db.get(e.target as any) as any
            if (p) {
              patientName = [p.firstName, p.lastName].filter(Boolean).join(' ')
              patientCode = p.implantIdCode ?? ''
            }
          } catch { /* ignore */ }
        }

        return {
          _id:         e._id,
          action:      e.action,
          detail:      e.detail ?? '',
          staffName,
          clinicName,
          patientName,
          patientCode,
          createdAt:   e.createdAt,
        }
      })
    )
  },
})

/** How many "paying seats" does this clinic currently have? (surgeons + admins, not radiographers) */
export const countPayingSeats = query({
  args: { clinicId: v.id('clinics') },
  handler: async (ctx, { clinicId }) => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) return 0
    const allStaff = await ctx.db
      .query('staff')
      .withIndex('by_clinic', q => q.eq('clinicId', clinicId))
      .filter(q => q.eq(q.field('status'), 'active'))
      .collect()
    return allStaff.filter(s => s.jobType === 'surgeon' || s.jobType === 'admin').length
  },
})

// ── Clinic deletion (admin-only, email-verified) ──────────────────────────────

export const adminGenerateClinicDeleteCode = internalMutation({
  args: { applicationId: v.id('clinicApplications') },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) throw new Error('Not authenticated')
    const admin = await ctx.db.query('users').withIndex('by_clerk', q => q.eq('clerkId', identity.subject)).first()
    if (!admin || admin.role !== 'admin') throw new Error('Admin only')

    const app = await ctx.db.get(args.applicationId)
    if (!app) throw new Error('Clinic not found')

    // Invalidate any existing codes
    const existing = await ctx.db
      .query('adminClinicDeleteCodes')
      .withIndex('by_application', q => q.eq('applicationId', args.applicationId))
      .collect()
    for (const doc of existing) await ctx.db.delete(doc._id)

    const code = String(Math.floor(100000 + Math.random() * 900000))
    await ctx.db.insert('adminClinicDeleteCodes', {
      applicationId: args.applicationId,
      code,
      expiresAt: Date.now() + 10 * 60 * 1000,
      used: false,
    })

    return { code, clinicName: app.facilityName ?? 'Clinic' }
  },
})

export const adminVerifyAndDeleteClinic = mutation({
  args: { applicationId: v.id('clinicApplications'), code: v.string() },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) throw new Error('Not authenticated')
    const admin = await ctx.db.query('users').withIndex('by_clerk', q => q.eq('clerkId', identity.subject)).first()
    if (!admin || admin.role !== 'admin') throw new Error('Admin only')

    const codeDoc = await ctx.db
      .query('adminClinicDeleteCodes')
      .withIndex('by_application', q => q.eq('applicationId', args.applicationId))
      .first()
    if (!codeDoc) throw new Error('No verification code found. Request a new one.')
    if (codeDoc.used) throw new Error('Code already used. Request a new one.')
    if (Date.now() > codeDoc.expiresAt) throw new Error('Code expired. Request a new one.')
    if (codeDoc.code !== args.code) throw new Error('Incorrect code.')

    await ctx.db.patch(codeDoc._id, { used: true })

    const app = await ctx.db.get(args.applicationId)

    // Find and delete the associated clinic (matched by contact email)
    if (app) {
      const clinic = await ctx.db
        .query('clinics')
        .filter(q => q.eq(q.field('email'), app.contactEmail))
        .first()
      if (clinic) {
        const staffRows = await ctx.db.query('staff').withIndex('by_clinic', q => q.eq('clinicId', clinic._id)).collect()
        for (const s of staffRows) await ctx.db.delete(s._id)
        await ctx.db.delete(clinic._id)
      }
    }

    // Delete the application record
    await ctx.db.delete(args.applicationId)
  },
})
