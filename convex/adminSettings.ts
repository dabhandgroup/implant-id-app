import { query, mutation, internalQuery } from './_generated/server'
import { v } from 'convex/values'

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
