import { query, mutation, internalQuery } from './_generated/server'
import { v } from 'convex/values'

// ── System Email Settings ─────────────────────────────────────────────────────

type SystemEmailType =
  | 'manufacturerApproval' | 'manufacturerInvite' | 'manufacturerRejection'
  | 'devicePending' | 'deviceLive' | 'deviceRejection'
  | 'clinicApplicationConfirmation' | 'clinicApproval' | 'clinicRejection'
  | 'staffInvite' | 'clinicPatientInvite'
  | 'patientWelcome' | 'patientVerified' | 'patientShare'
  | 'surgeonInvite'

const EMAIL_DEFAULTS: Record<SystemEmailType, boolean> = {
  manufacturerApproval: true, manufacturerInvite: true, manufacturerRejection: true,
  devicePending: true, deviceLive: true, deviceRejection: true,
  clinicApplicationConfirmation: true, clinicApproval: true, clinicRejection: true,
  staffInvite: true, clinicPatientInvite: true,
  patientWelcome: true, patientVerified: true, patientShare: true,
  surgeonInvite: true,
}

export const getSystemEmailSettings = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) return null
    const doc = await ctx.db.query('systemEmailSettings').first()
    return doc ?? { ...EMAIL_DEFAULTS }
  },
})

export const upsertSystemEmailSettings = mutation({
  args: {
    manufacturerApproval:          v.boolean(),
    manufacturerInvite:            v.boolean(),
    manufacturerRejection:         v.boolean(),
    devicePending:                 v.boolean(),
    deviceLive:                    v.boolean(),
    deviceRejection:               v.boolean(),
    clinicApplicationConfirmation: v.boolean(),
    clinicApproval:                v.boolean(),
    clinicRejection:               v.boolean(),
    staffInvite:                   v.boolean(),
    clinicPatientInvite:           v.boolean(),
    patientWelcome:                v.boolean(),
    patientVerified:               v.boolean(),
    patientShare:                  v.boolean(),
    surgeonInvite:                 v.boolean(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) throw new Error('Not authenticated')
    const existing = await ctx.db.query('systemEmailSettings').first()
    if (existing) {
      await ctx.db.patch(existing._id, args)
    } else {
      await ctx.db.insert('systemEmailSettings', args)
    }
  },
})

/** Called by email internalActions to check if a given email type is enabled globally. */
export const isSystemEmailEnabled = internalQuery({
  args: { type: v.string() },
  handler: async (ctx, { type }) => {
    const doc = await ctx.db.query('systemEmailSettings').first()
    if (!doc) return true
    const val = (doc as unknown as Record<string, unknown>)[type]
    return typeof val === 'boolean' ? val : true
  },
})

type NotificationType = 'newClinicApplication' | 'newManufacturerApplication' | 'newDevicePendingReview'

const DEFAULTS: Record<NotificationType, boolean> = {
  newClinicApplication:       true,
  newManufacturerApplication: true,
  newDevicePendingReview:     true,
}

export const getMyAdminNotificationSettings = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) return null
    const clerkUserId = identity.subject
    const existing = await ctx.db
      .query('adminNotificationSettings')
      .withIndex('by_clerk', q => q.eq('clerkUserId', clerkUserId))
      .unique()
    if (!existing) return { ...DEFAULTS, clerkUserId }
    return existing
  },
})

export const upsertAdminNotificationSettings = mutation({
  args: {
    newClinicApplication:       v.boolean(),
    newManufacturerApplication: v.boolean(),
    newDevicePendingReview:     v.boolean(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) throw new Error('Not authenticated')
    const clerkUserId = identity.subject
    const existing = await ctx.db
      .query('adminNotificationSettings')
      .withIndex('by_clerk', q => q.eq('clerkUserId', clerkUserId))
      .unique()
    if (existing) {
      await ctx.db.patch(existing._id, args)
    } else {
      await ctx.db.insert('adminNotificationSettings', { clerkUserId, ...args })
    }
  },
})

export const getAdminEmailsForNotificationType = internalQuery({
  args: {
    type: v.union(
      v.literal('newClinicApplication'),
      v.literal('newManufacturerApplication'),
      v.literal('newDevicePendingReview'),
    ),
  },
  handler: async (ctx, { type }) => {
    const admins = await ctx.db
      .query('users')
      .filter(q => q.eq(q.field('role'), 'admin'))
      .collect()

    const emails: string[] = []
    for (const admin of admins) {
      const settings = await ctx.db
        .query('adminNotificationSettings')
        .withIndex('by_clerk', q => q.eq('clerkUserId', admin.clerkId))
        .unique()
      const enabled = settings ? settings[type] : true
      if (enabled) emails.push(admin.email)
    }
    return emails
  },
})
