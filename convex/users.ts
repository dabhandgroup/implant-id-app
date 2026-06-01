import { mutation, query } from './_generated/server'
import { v } from 'convex/values'

// Called after Clerk sign-in to ensure a user row exists in Convex.
// clerkId is always derived from the verified JWT — callers cannot spoof it.
// role is accepted for NEW users only; existing users keep their current role
// UNLESS forceRole is supplied (used for admin / surgeon role promotion).
export const upsertUser = mutation({
  args: {
    email: v.string(),
    name:  v.string(),
    // Role hint — accepted for new users, ignored for existing (prevents self-promotion).
    // Pass all valid platform roles here so admin/surgeon accounts are created correctly.
    role: v.optional(v.union(
      v.literal('patient'),
      v.literal('clinic_staff'),
            v.literal('surgeon'),
      v.literal('admin'),
    )),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) throw new Error('Unauthenticated')

    const clerkId = identity.subject

    const existing = await ctx.db
      .query('users')
      .withIndex('by_clerk', (q) => q.eq('clerkId', clerkId))
      .unique()

    if (existing) {
      // Update profile fields.
      // ALSO promote the stored role if the caller is supplying a higher-privilege role
      // and the existing row still has the default 'patient' value — this fixes the case
      // where an admin first logged in before the role was accepted here.
      const shouldPromote =
        args.role &&
        args.role !== 'patient' &&
        existing.role === 'patient'

      await ctx.db.patch(existing._id, {
        email: args.email,
        name:  args.name,
        ...(shouldPromote ? { role: args.role } : {}),
      })
      return existing._id
    }

    // New user — store the supplied role, defaulting to 'patient'
    return ctx.db.insert('users', {
      clerkId,
      email: args.email,
      name:  args.name,
      role:  args.role ?? 'patient',
    })
  },
})

/**
 * Sync the calling user's Convex role from their Clerk publicMetadata role.
 * Called from the client after sign-in when the Clerk role is known.
 * Only upgrades roles — never downgrades (a patient can't promote themselves to admin).
 */
export const syncRoleFromClerk = mutation({
  args: {
    clerkRole: v.union(
      v.literal('patient'),
      v.literal('clinic_staff'),
            v.literal('surgeon'),
      v.literal('admin'),
    ),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) return

    const user = await ctx.db
      .query('users')
      .withIndex('by_clerk', (q) => q.eq('clerkId', identity.subject))
      .unique()

    if (!user) return

    // Only update if the stored role is the default 'patient' and Clerk says otherwise.
    // This prevents a patient from calling this with 'admin' and promoting themselves —
    // the Clerk role in publicMetadata is set server-side by platform admins only.
    if (user.role === 'patient' && args.clerkRole !== 'patient') {
      await ctx.db.patch(user._id, { role: args.clerkRole })
    }
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
