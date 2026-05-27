import { mutation, query } from './_generated/server'
import { v }               from 'convex/values'
import { internal }        from './_generated/api'

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
  },
  handler: async (ctx, args) => {
    // Capture the authenticated user's Clerk ID (if signed in)
    const identity = await ctx.auth.getUserIdentity()
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
      facilityName:    args.facilityName,
      contactName:     args.contactName,
      contactEmail:    args.contactEmail,
      facilityType:    args.facilityType,
      facilityCity:    args.facilityCity,
      facilityCountry: args.facilityCountry,
      services:        args.services,
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
    if (app.status !== 'pending') throw new Error('Application is not pending')

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

      return { clinicId }
    }

    return null
  },
})
