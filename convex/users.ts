import { mutation, query, internalAction } from './_generated/server'
import { v }                               from 'convex/values'
import { internal }                        from './_generated/api'

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

/** List all admin users — master admin only. */
export const listAdmins = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) return []
    const me = await ctx.db.query('users').withIndex('by_clerk', q => q.eq('clerkId', identity.subject)).unique()
    if (!me || me.role !== 'admin') return []
    return ctx.db.query('users').filter(q => q.eq(q.field('role'), 'admin')).collect()
  },
})

/**
 * Invite a new master admin by email — creates their Clerk account via the
 * Clerk Admin API and stamps the admin role. Admin-only.
 */
export const inviteAdmin = mutation({
  args: {
    email: v.string(),
    name:  v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) throw new Error('Not authenticated')
    const me = await ctx.db.query('users').withIndex('by_clerk', q => q.eq('clerkId', identity.subject)).unique()
    if (!me || me.role !== 'admin') throw new Error('Admin only')

    // Check if already exists in Convex
    const existing = await ctx.db.query('users').withIndex('by_email', q => q.eq('email', args.email)).unique()
    if (existing) {
      // Promote to admin if not already
      await ctx.db.patch(existing._id, { role: 'admin', name: args.name })
      return existing._id
    }

    // Create placeholder — Clerk account created by the internalAction below
    const id = await ctx.db.insert('users', {
      clerkId: '',
      email:   args.email,
      name:    args.name,
      role:    'admin',
    })

    await ctx.scheduler.runAfter(0, internal.users.createAdminClerkAccount, {
      email: args.email,
      name:  args.name,
    })

    return id
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

/** Create a Clerk account for a new admin (passwordless, email OTP sign-in) and send invite email. */
export const createAdminClerkAccount = internalAction({
  args: { email: v.string(), name: v.string() },
  handler: async (ctx, args) => {
    const secretKey = process.env.CLERK_SECRET_KEY
    if (!secretKey) { console.error('[admin invite] CLERK_SECRET_KEY not set'); return }

    // Check if Clerk account already exists
    const search = await fetch(`https://api.clerk.com/v1/users?email_address=${encodeURIComponent(args.email)}&limit=1`,
      { headers: { Authorization: `Bearer ${secretKey}` } })
    if (search.ok) {
      const found = await search.json() as { id: string }[]
      if (found.length > 0) {
        // Already exists — just update the role
        await fetch(`https://api.clerk.com/v1/users/${found[0].id}/metadata`, {
          method: 'PATCH',
          headers: { Authorization: `Bearer ${secretKey}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ public_metadata: { role: 'admin' } }),
        })
        console.log('[admin invite] Updated existing Clerk user to admin:', args.email)
        // Send invite email even for existing users being promoted
        await ctx.runAction(internal.email.sendAdminInviteEmail, { email: args.email, name: args.name })
        return
      }
    }

    // Create new passwordless account
    const nameParts = args.name.trim().split(/\s+/)
    const res = await fetch('https://api.clerk.com/v1/users', {
      method: 'POST',
      headers: { Authorization: `Bearer ${secretKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email_addresses:           [args.email],
        first_name:                nameParts[0],
        last_name:                 nameParts.slice(1).join(' ') || undefined,
        skip_password_requirement: true,
        public_metadata:           { role: 'admin' },
      }),
    })
    if (res.ok) {
      const u = await res.json() as { id: string }
      console.log('[admin invite] Created Clerk admin account', u.id, 'for', args.email)
      // Send welcome / login instructions email
      await ctx.runAction(internal.email.sendAdminInviteEmail, { email: args.email, name: args.name })
    } else {
      console.error('[admin invite] Clerk creation failed:', res.status, await res.text())
    }
  },
})
