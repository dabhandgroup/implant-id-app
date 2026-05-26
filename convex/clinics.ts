import { mutation } from './_generated/server'
import { v }        from 'convex/values'
import { internal } from './_generated/api'

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
    // Prevent duplicate applications from the same email
    const existing = await ctx.db
      .query('clinicApplications')
      .withIndex('by_email', (q) => q.eq('contactEmail', args.contactEmail))
      .first()

    if (existing && existing.status === 'pending') {
      return { id: existing._id, alreadySubmitted: true }
    }

    const id = await ctx.db.insert('clinicApplications', {
      ...args,
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
