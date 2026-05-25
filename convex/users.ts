import { mutation, query } from './_generated/server'
import { v } from 'convex/values'

// Called after Clerk sign-in to ensure a user row exists in Convex.
// clerkId is always derived from the verified JWT — callers cannot spoof it.
// role is accepted for NEW users only; existing users keep their current role.
export const upsertUser = mutation({
  args: {
    email: v.string(),
    name: v.string(),
    // Role hint from the login tab — ignored for existing users so a patient
    // logging in via the clinic tab can never upgrade themselves.
    role: v.optional(v.union(v.literal('patient'), v.literal('clinic_staff'))),
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
      // Only update profile fields — never touch role for existing users
      await ctx.db.patch(existing._id, { email: args.email, name: args.name })
      return existing._id
    }

    // New user: use the supplied role, falling back to 'patient' (safer default)
    return ctx.db.insert('users', {
      clerkId,
      email: args.email,
      name: args.name,
      role: args.role ?? 'patient',
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
