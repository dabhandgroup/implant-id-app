import { mutation, query, action, internalAction, internalMutation, internalQuery } from './_generated/server'
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

    // No match by clerkId — check if there's a pre-created admin placeholder row
    // (clerkId = '') waiting to be linked. This happens when an admin accepts a
    // Clerk invitation for the first time: their real clerkId didn't exist yet when
    // inviteAdmin created the placeholder.
    const placeholder = await ctx.db
      .query('users')
      .withIndex('by_email', (q) => q.eq('email', args.email))
      .unique()

    if (placeholder && placeholder.clerkId === '') {
      // Link the real Clerk ID and update profile. Role stays as-is (already 'admin').
      await ctx.db.patch(placeholder._id, {
        clerkId: clerkId,
        email:   args.email,
        name:    args.name,
      })
      return placeholder._id
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
 * Invite a new master admin by email — creates their Clerk invitation via the
 * Clerk Invitations API (bypasses phone-number requirement) and sends invite email.
 * Admin-only.
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
      // Promote to admin if not already, then send invite email regardless
      await ctx.db.patch(existing._id, { role: 'admin', name: args.name })
      await ctx.scheduler.runAfter(0, internal.users.createAdminClerkAccount, {
        email: args.email,
        name:  args.name,
      })
      return existing._id
    }

    // Create placeholder — Clerk invitation created by the internalAction below
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

/**
 * Create a Clerk invitation for a new admin and send the activation email.
 * Uses Clerk Invitations API (POST /v1/invitations) which bypasses instance
 * sign-up requirements (e.g. phone number) that would block direct user creation.
 */
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
        // Already exists — update role and send sign-in instructions (no invitation needed)
        await fetch(`https://api.clerk.com/v1/users/${found[0].id}/metadata`, {
          method: 'PATCH',
          headers: { Authorization: `Bearer ${secretKey}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ public_metadata: { role: 'admin' } }),
        })
        // Link the clerkId back to the Convex placeholder in case it's not set
        await ctx.runMutation(internal.users.linkAdminClerkId, { email: args.email, clerkId: found[0].id })
        // Send sign-in instructions email (no invitation URL needed — account already exists)
        await ctx.runAction(internal.email.sendAdminInviteEmail, { email: args.email, name: args.name })
        return
      }
    }

    // Revoke any existing pending invitations for this email so we can create a fresh one
    const pendingRes = await fetch(
      `https://api.clerk.com/v1/invitations?email_address=${encodeURIComponent(args.email)}&status=pending&limit=10`,
      { headers: { Authorization: `Bearer ${secretKey}` } }
    )
    if (pendingRes.ok) {
      const pendingList = await pendingRes.json() as { id: string }[]
      const list = Array.isArray(pendingList) ? pendingList : (pendingList as unknown as { data: { id: string }[] })?.data ?? []
      for (const inv of list) {
        await fetch(`https://api.clerk.com/v1/invitations/${inv.id}/revoke`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${secretKey}` },
        }).catch(() => {/* non-fatal */})
      }
    }

    // No existing Clerk account — create via Invitations API (bypasses phone requirement)
    const res = await fetch('https://api.clerk.com/v1/invitations', {
      method: 'POST',
      headers: { Authorization: `Bearer ${secretKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email_address:   args.email,
        public_metadata: { role: 'admin' },
        redirect_url:    'https://portal.implantid.io/master/login',
        notify:          false,  // we send our own branded email
      }),
    })
    if (res.ok) {
      const inv = await res.json() as { id: string; url: string }
      // Send invite email with the one-time activation link
      await ctx.runAction(internal.email.sendAdminInviteEmail, {
        email:     args.email,
        name:      args.name,
        inviteUrl: inv.url,
      })
    } else {
      console.error('[admin invite] Clerk invitation failed:', res.status, await res.text())
    }
  },
})

/** Internal — links a Clerk ID back to the placeholder user row created during invite. */
export const linkAdminClerkId = internalMutation({
  args: { email: v.string(), clerkId: v.string() },
  handler: async (ctx, args) => {
    const user = await ctx.db.query('users').withIndex('by_email', q => q.eq('email', args.email)).unique()
    if (user && !user.clerkId) {
      await ctx.db.patch(user._id, { clerkId: args.clerkId })
    }
  },
})

/** Update a master admin's display name. Admin-only. */
export const updateAdmin = mutation({
  args: { userId: v.id('users'), name: v.string() },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) throw new Error('Not authenticated')
    const me = await ctx.db.query('users').withIndex('by_clerk', q => q.eq('clerkId', identity.subject)).unique()
    if (!me || me.role !== 'admin') throw new Error('Admin only')
    const target = await ctx.db.get(args.userId)
    if (!target || target.role !== 'admin') throw new Error('Not an admin user')
    await ctx.db.patch(args.userId, { name: args.name.trim() })
  },
})

/** Remove a master admin. Cannot remove yourself. Admin-only. */
export const removeAdmin = mutation({
  args: { userId: v.id('users') },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) throw new Error('Not authenticated')
    const me = await ctx.db.query('users').withIndex('by_clerk', q => q.eq('clerkId', identity.subject)).unique()
    if (!me || me.role !== 'admin') throw new Error('Admin only')
    if (me._id === args.userId) throw new Error('Cannot remove yourself')
    const target = await ctx.db.get(args.userId)
    if (!target || target.role !== 'admin') throw new Error('Not an admin user')
    if (target.email?.toLowerCase() === 'harry@dabhandmarketing.com') throw new Error('This account is protected and cannot be removed')
    // Optionally downgrade in Clerk if they have a real account
    if (target.clerkId) {
      const secretKey = process.env.CLERK_SECRET_KEY
      if (secretKey) {
        await fetch(`https://api.clerk.com/v1/users/${target.clerkId}/metadata`, {
          method: 'PATCH',
          headers: { Authorization: `Bearer ${secretKey}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ public_metadata: { role: 'patient' } }),
        }).catch(() => {/* non-fatal */})
      }
    }
    await ctx.db.delete(args.userId)
  },
})

/** Resend invite email to a pending admin. Admin-only. */
export const resendAdminInvite = mutation({
  args: { userId: v.id('users') },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) throw new Error('Not authenticated')
    const me = await ctx.db.query('users').withIndex('by_clerk', q => q.eq('clerkId', identity.subject)).unique()
    if (!me || me.role !== 'admin') throw new Error('Admin only')
    const target = await ctx.db.get(args.userId)
    if (!target || target.role !== 'admin') throw new Error('Not an admin user')
    // Re-run the Clerk invitation creation + email.
    // The createAdminClerkAccount action now revokes any pending invite first,
    // so this is safe to call multiple times.
    await ctx.scheduler.runAfter(0, internal.users.createAdminClerkAccount, {
      email: target.email,
      name:  target.name,
    })
  },
})

// ── Internal helpers used by updateMyEmail ──────────────────────────────────

export const getMeInternal = internalQuery({
  args: { clerkId: v.string() },
  handler: async (ctx, args) => {
    return ctx.db.query('users').withIndex('by_clerk', q => q.eq('clerkId', args.clerkId)).unique()
  },
})

export const getUserByEmail = internalQuery({
  args: { email: v.string() },
  handler: async (ctx, args) => {
    return ctx.db.query('users').withIndex('by_email', q => q.eq('email', args.email)).unique()
  },
})

export const setAdminEmail = internalMutation({
  args: { userId: v.id('users'), email: v.string() },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.userId, { email: args.email })
  },
})

/**
 * Update the calling admin's email address.
 * Validates uniqueness in both Convex and Clerk, then updates both.
 * Uses a public action so the Clerk API calls happen server-side with full error propagation.
 */
export const updateMyEmail = action({
  args: { newEmail: v.string() },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) throw new Error('Not authenticated')

    const secretKey = process.env.CLERK_SECRET_KEY
    if (!secretKey) throw new Error('Server configuration error — CLERK_SECRET_KEY not set')

    const newEmail = args.newEmail.trim().toLowerCase()
    if (!newEmail.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) throw new Error('Invalid email address')

    // Check caller is an admin
    const me = await ctx.runQuery(internal.users.getMeInternal, { clerkId: identity.subject })
    if (!me || me.role !== 'admin') throw new Error('Admin access required')

    // Reject if the new email is the same as the current one
    if (me.email === newEmail) throw new Error('That is already your current email address')

    // Check Convex uniqueness across all roles
    const convexConflict = await ctx.runQuery(internal.users.getUserByEmail, { email: newEmail })
    if (convexConflict) throw new Error('This email is already associated with an account')

    // Check Clerk uniqueness
    const clerkSearch = await fetch(
      `https://api.clerk.com/v1/users?email_address=${encodeURIComponent(newEmail)}&limit=1`,
      { headers: { Authorization: `Bearer ${secretKey}` } }
    )
    if (clerkSearch.ok) {
      const found = await clerkSearch.json() as { id: string }[]
      if (found.length > 0) throw new Error('This email is already registered with another account')
    }

    // Get current user from Clerk to find the old email address ID
    const clerkUserRes = await fetch(`https://api.clerk.com/v1/users/${me.clerkId}`, {
      headers: { Authorization: `Bearer ${secretKey}` },
    })
    if (!clerkUserRes.ok) throw new Error('Failed to fetch Clerk user data')
    const clerkUser = await clerkUserRes.json() as {
      primary_email_address_id: string
      email_addresses: { id: string; email_address: string }[]
    }
    const oldEmailId = clerkUser.primary_email_address_id

    // Add new email address to the Clerk user (pre-verified)
    const createRes = await fetch(`https://api.clerk.com/v1/users/${me.clerkId}/email_addresses`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${secretKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ email_address: newEmail, verified: true }),
    })
    if (!createRes.ok) {
      const errText = await createRes.text()
      throw new Error(`Failed to add new email address: ${errText}`)
    }
    const newEmailAddr = await createRes.json() as { id: string }

    // Make the new address primary
    const patchRes = await fetch(`https://api.clerk.com/v1/users/${me.clerkId}`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${secretKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ primary_email_address_id: newEmailAddr.id }),
    })
    if (!patchRes.ok) throw new Error('Failed to set new email as primary')

    // Remove the old email address (non-fatal)
    if (oldEmailId) {
      await fetch(`https://api.clerk.com/v1/users/${me.clerkId}/email_addresses/${oldEmailId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${secretKey}` },
      }).catch(() => {/* non-fatal */})
    }

    // Update Convex record
    await ctx.runMutation(internal.users.setAdminEmail, { userId: me._id, email: newEmail })
  },
})
