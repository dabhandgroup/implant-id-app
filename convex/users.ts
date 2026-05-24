import { mutation, query } from './_generated/server'
import { v } from 'convex/values'

// Called after Clerk sign-in to ensure a user row exists in Convex
export const upsertUser = mutation({
  args: {
    clerkId: v.string(),
    email: v.string(),
    name: v.string(),
    role: v.union(v.literal('patient'), v.literal('clinic_staff'), v.literal('admin')),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query('users')
      .withIndex('by_clerk', (q) => q.eq('clerkId', args.clerkId))
      .unique()

    if (existing) {
      await ctx.db.patch(existing._id, { email: args.email, name: args.name })
      return existing._id
    }

    return ctx.db.insert('users', {
      clerkId: args.clerkId,
      email: args.email,
      name: args.name,
      role: args.role,
    })
  },
})

export const getMe = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) return null

    return ctx.db
      .query('users')
      .withIndex('by_clerk', (q) => q.eq('clerkId', identity.subject))
      .unique()
  },
})
