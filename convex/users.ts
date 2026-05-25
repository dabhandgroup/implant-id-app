import { mutation, query } from './_generated/server'
import { v } from 'convex/values'

// Called after Clerk sign-in to ensure a user row exists in Convex.
// Intentionally accepts no role or clerkId from the client — both are derived
// from the verified Clerk JWT so callers cannot spoof them.
export const upsertUser = mutation({
  args: {
    email: v.string(),
    name: v.string(),
  },
  handler: async (ctx, args) => {
    // Convex validates the Clerk JWT; identity.subject is the real Clerk user ID
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) throw new Error('Unauthenticated')

    const clerkId = identity.subject

    const existing = await ctx.db
      .query('users')
      .withIndex('by_clerk', (q) => q.eq('clerkId', clerkId))
      .unique()

    if (existing) {
      // Only update profile fields — never touch role here
      await ctx.db.patch(existing._id, { email: args.email, name: args.name })
      return existing._id
    }

    // New users always start as clinic_staff; promote to admin in the dashboard
    return ctx.db.insert('users', {
      clerkId,
      email: args.email,
      name: args.name,
      role: 'clinic_staff',
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
