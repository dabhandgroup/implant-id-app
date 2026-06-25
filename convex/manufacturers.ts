import { mutation, query, internalAction, internalMutation } from './_generated/server'
import { v } from 'convex/values'
import { internal } from './_generated/api'
import type { Id } from './_generated/dataModel'

// ── Slug helpers ──────────────────────────────────────────────────────────────

const COUNTRY_ISO2: Record<string, string> = {
  'Afghanistan':'af','Albania':'al','Algeria':'dz','Argentina':'ar','Australia':'au',
  'Austria':'at','Belgium':'be','Brazil':'br','Canada':'ca','Chile':'cl','China':'cn',
  'Colombia':'co','Croatia':'hr','Czech Republic':'cz','Czechia':'cz','Denmark':'dk',
  'Egypt':'eg','Finland':'fi','France':'fr','Germany':'de','Greece':'gr','Hungary':'hu',
  'India':'in','Indonesia':'id','Ireland':'ie','Israel':'il','Italy':'it','Japan':'jp',
  'Malaysia':'my','Mexico':'mx','Netherlands':'nl','New Zealand':'nz','Nigeria':'ng',
  'Norway':'no','Pakistan':'pk','Philippines':'ph','Poland':'pl','Portugal':'pt',
  'Romania':'ro','Russia':'ru','Saudi Arabia':'sa','Singapore':'sg','Slovakia':'sk',
  'Slovenia':'si','South Africa':'za','South Korea':'kr','Spain':'es','Sweden':'se',
  'Switzerland':'ch','Taiwan':'tw','Thailand':'th','Turkey':'tr','UAE':'ae',
  'Ukraine':'ua','United Arab Emirates':'ae','United Kingdom':'gb','UK':'gb',
  'United States':'us','USA':'us','US':'us','Vietnam':'vn',
}

function slugBase(companyName: string, country: string): string {
  const cc = COUNTRY_ISO2[country] ?? country.slice(0, 2).toLowerCase()
  const name = companyName
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-{2,}/g, '-')
  return `${name}-${cc}`
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function uniqueSlug(ctx: any, companyName: string, country: string, excludeId?: Id<'manufacturers'>): Promise<string> {
  const base = slugBase(companyName, country)
  let candidate = base
  let i = 2
  for (;;) {
    const existing = await ctx.db
      .query('manufacturers')
      .withIndex('by_slug', (q: any) => q.eq('slug', candidate))
      .first()
    if (!existing || existing._id === excludeId) return candidate
    candidate = `${base}-${i++}`
  }
}

/** Generate a one-time Convex storage upload URL for manufacturer documents. */
export const generateUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    return await ctx.storage.generateUploadUrl()
  },
})

/** Get a public URL for a stored document (admin only). */
export const getStorageUrl = query({
  args: { storageId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.storage.getUrl(args.storageId)
  },
})

// ── Applications ──────────────────────────────────────────────────────────────

/** Submit a new manufacturer application. */
export const submitManufacturerApplication = mutation({
  args: {
    companyName:             v.string(),
    contactName:             v.string(),
    contactEmail:            v.string(),
    country:                 v.string(),
    regNumber:               v.optional(v.string()),
    website:                 v.optional(v.string()),
    // Extended onboarding fields
    legalEntityName:         v.optional(v.string()),
    contactJobTitle:         v.optional(v.string()),
    contactPhone:            v.optional(v.string()),
    iso13485CertNumber:      v.optional(v.string()),
    iso13485IssuingBody:     v.optional(v.string()),
    iso13485ExpiryDate:      v.optional(v.string()),
    regulatoryRegistrations: v.optional(v.string()),
    deviceCategories:        v.optional(v.array(v.string())),
    geographicMarkets:       v.optional(v.array(v.string())),
    // Supporting document storage IDs
    docCompanyRegistration:  v.optional(v.string()),
    docIso13485:             v.optional(v.string()),
    docRegulatoryCert:       v.optional(v.string()),
    docLetterhead:           v.optional(v.string()),
    docMriSampleData:        v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Capture the authenticated user's Clerk ID (if signed in)
    const identity = await ctx.auth.getUserIdentity()
    const clerkUserId = identity?.subject ?? undefined

    // Prevent duplicate applications
    const existing = await ctx.db
      .query('manufacturers')
      .withIndex('by_email', (q) => q.eq('contactEmail', args.contactEmail))
      .first()

    if (existing && existing.status !== 'rejected') {
      return { id: existing._id, alreadySubmitted: true }
    }

    // Cross-type uniqueness: email cannot belong to a clinic account
    const existingClinic = await ctx.db
      .query('clinicApplications')
      .withIndex('by_email', (q) => q.eq('contactEmail', args.contactEmail))
      .first()
    if (existingClinic && existingClinic.status !== 'rejected') {
      throw new Error('This email address is already registered as a clinic account. Each email can only be used for one account type. Please use a different email address.')
    }

    const id = await ctx.db.insert('manufacturers', {
      companyName:             args.companyName,
      contactName:             args.contactName,
      contactEmail:            args.contactEmail,
      country:                 args.country,
      regNumber:               args.regNumber,
      website:                 args.website,
      legalEntityName:         args.legalEntityName,
      contactJobTitle:         args.contactJobTitle,
      contactPhone:            args.contactPhone,
      iso13485CertNumber:      args.iso13485CertNumber,
      iso13485IssuingBody:     args.iso13485IssuingBody,
      iso13485ExpiryDate:      args.iso13485ExpiryDate,
      regulatoryRegistrations: args.regulatoryRegistrations,
      deviceCategories:        args.deviceCategories,
      geographicMarkets:       args.geographicMarkets,
      docCompanyRegistration:  args.docCompanyRegistration,
      docIso13485:             args.docIso13485,
      docRegulatoryCert:       args.docRegulatoryCert,
      docLetterhead:           args.docLetterhead,
      docMriSampleData:        args.docMriSampleData,
      clerkUserId,
      status: 'pending',
      submittedAt: Date.now(),
    })

    // Fire email notification to admin asynchronously
    await ctx.scheduler.runAfter(0, internal.email.sendManufacturerApplicationEmail, {
      manufacturerId: id,
      companyName: args.companyName,
      contactName: args.contactName,
      contactEmail: args.contactEmail,
      country: args.country,
    })

    // Pre-create a Clerk account if not already signed in
    if (!clerkUserId) {
      await ctx.scheduler.runAfter(0, internal.manufacturers.createPendingManufacturerAccount, {
        contactEmail: args.contactEmail,
        contactName: args.contactName,
      })
    }

    return { id, alreadySubmitted: false }
  },
})

/** Get the current user's manufacturer application (if any). */
export const getMyApplication = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) return null

    const app = await ctx.db
      .query('manufacturers')
      .withIndex('by_clerk', (q) => q.eq('clerkUserId', identity.subject))
      .first()

    return app ?? null
  },
})

/** Get the manufacturer profile for the current authenticated user. */
export const getMyManufacturer = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) return null

    const user = await ctx.db
      .query('users')
      .withIndex('by_clerk', (q) => q.eq('clerkId', identity.subject))
      .first()

    if (!user || user.role !== 'manufacturer') return null

    // Find manufacturer by email
    const mfr = await ctx.db
      .query('manufacturers')
      .withIndex('by_email', (q) => q.eq('contactEmail', user.email))
      .first()

    return mfr ?? null
  },
})

/** Get a single application by its Convex ID (master admin detail view). */
export const getApplicationById = query({
  args: { id: v.id('manufacturers') },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id)
  },
})

/** Get a manufacturer by slug or Convex ID — slug takes priority. */
export const getBySlugOrId = query({
  args: { slugOrId: v.string() },
  handler: async (ctx, args) => {
    const bySlug = await ctx.db
      .query('manufacturers')
      .withIndex('by_slug', (q) => q.eq('slug', args.slugOrId))
      .first()
    if (bySlug) return bySlug
    // Fall back to treating it as a Convex ID
    try { return await ctx.db.get(args.slugOrId as Id<'manufacturers'>) } catch { return null }
  },
})

/** Master admin: update editable fields on a manufacturer record. */
export const updateManufacturer = mutation({
  args: {
    id: v.id('manufacturers'),
    companyName:             v.optional(v.string()),
    legalEntityName:         v.optional(v.string()),
    contactName:             v.optional(v.string()),
    contactEmail:            v.optional(v.string()),
    contactPhone:            v.optional(v.string()),
    contactJobTitle:         v.optional(v.string()),
    country:                 v.optional(v.string()),
    website:                 v.optional(v.string()),
    logoUrl:                 v.optional(v.string()),
    regNumber:               v.optional(v.string()),
    iso13485CertNumber:      v.optional(v.string()),
    iso13485IssuingBody:     v.optional(v.string()),
    iso13485ExpiryDate:      v.optional(v.string()),
    regulatoryRegistrations: v.optional(v.string()),
    deviceCategories:        v.optional(v.array(v.string())),
    geographicMarkets:       v.optional(v.array(v.string())),
  },
  handler: async (ctx, { id, ...patch }) => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) throw new Error('Not authenticated')
    const user = await ctx.db.query('users').withIndex('by_clerk', q => q.eq('clerkId', identity.subject)).first()
    if (!user || user.role !== 'admin') throw new Error('Admin role required')
    await ctx.db.patch(id, patch)
  },
})

/** Master admin: generate slugs for any manufacturer that doesn't have one yet. */
export const backfillSlugs = mutation({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) throw new Error('Not authenticated')
    const user = await ctx.db.query('users').withIndex('by_clerk', q => q.eq('clerkId', identity.subject)).first()
    if (!user || user.role !== 'admin') throw new Error('Admin role required')
    const all = await ctx.db.query('manufacturers').collect()
    let updated = 0
    for (const mfr of all) {
      if (mfr.slug) continue
      const slug = await uniqueSlug(ctx, mfr.companyName, mfr.country, mfr._id)
      await ctx.db.patch(mfr._id, { slug })
      updated++
    }
    return { updated }
  },
})

/** Backfill logoUrl from website domain using Clearbit for manufacturers that have a website but no logo. Admin-only. */
export const backfillLogoUrls = mutation({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) throw new Error('Not authenticated')
    const user = await ctx.db.query('users').withIndex('by_clerk', q => q.eq('clerkId', identity.subject)).first()
    if (!user || user.role !== 'admin') throw new Error('Admin role required')
    const all = await ctx.db.query('manufacturers').collect()
    let updated = 0
    for (const mfr of all) {
      if (mfr.logoUrl) continue
      if (!mfr.website) continue
      const domain = mfr.website.replace(/^https?:\/\/(?:www\.)?/, '').replace(/\/.*$/, '').trim()
      if (!domain) continue
      await ctx.db.patch(mfr._id, { logoUrl: `https://logo.clearbit.com/${domain}` })
      updated++
    }
    return { updated }
  },
})

/** List manufacturer applications, optionally filtered by status. */
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
        .query('manufacturers')
        .withIndex('by_status', (q) => q.eq('status', args.status!))
        .order('desc')
        .take(50)
    }

    return await ctx.db
      .query('manufacturers')
      .order('desc')
      .take(50)
  },
})

/** List all approved manufacturers (master admin view). */
export const listApprovedManufacturers = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db
      .query('manufacturers')
      .withIndex('by_status', (q) => q.eq('status', 'approved'))
      .order('desc')
      .take(100)
  },
})

// ── Approval ──────────────────────────────────────────────────────────────────

/**
 * Pre-create a passwordless Clerk account when a manufacturer submits their application.
 */
export const createPendingManufacturerAccount = internalAction({
  args: {
    contactEmail: v.string(),
    contactName: v.string(),
  },
  handler: async (_ctx, args) => {
    const secretKey = process.env.CLERK_SECRET_KEY
    if (!secretKey) {
      console.error('[manufacturers] CLERK_SECRET_KEY not set — skipping Clerk pre-creation')
      return
    }

    // If an account already exists for this email, do nothing
    const searchRes = await fetch(
      `https://api.clerk.com/v1/users?email_address=${encodeURIComponent(args.contactEmail)}&limit=1`,
      { headers: { Authorization: `Bearer ${secretKey}` } },
    )
    if (searchRes.ok) {
      const found = (await searchRes.json()) as { id: string }[]
      if (found.length > 0) {
        return
      }
    }

    // Create a passwordless account
    const nameParts = args.contactName.trim().split(/\s+/)
    const createRes = await fetch('https://api.clerk.com/v1/users', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${secretKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email_addresses: [args.contactEmail],
        first_name: nameParts[0],
        last_name: nameParts.slice(1).join(' ') || undefined,
        skip_password_requirement: true,
        public_metadata: { role: 'manufacturer_pending' },
      }),
    })

    if (!createRes.ok) {
      const body = await createRes.text()
      console.error('[manufacturers] Clerk pre-creation failed:', createRes.status, body)
    }
  },
})

/**
 * Activate the manufacturer account in Clerk after approval.
 */
export const activateManufacturerAccount = internalAction({
  args: {
    clerkUserId: v.optional(v.string()),
    contactEmail: v.string(),
    contactName: v.string(),
    companyName: v.string(),
  },
  handler: async (ctx, args) => {
    const secretKey = process.env.CLERK_SECRET_KEY
    if (!secretKey) {
      console.error('[manufacturers] CLERK_SECRET_KEY not set — cannot activate account')
    } else {
      let resolvedId = args.clerkUserId ?? null

      if (!resolvedId) {
        // Try to find by email
        const searchRes = await fetch(
          `https://api.clerk.com/v1/users?email_address=${encodeURIComponent(args.contactEmail)}&limit=1`,
          { headers: { Authorization: `Bearer ${secretKey}` } },
        )
        if (searchRes.ok) {
          const found = (await searchRes.json()) as { id: string }[]
          if (found.length > 0) resolvedId = found[0].id
        }
      }

      if (!resolvedId) {
        // Create a new Clerk user (passwordless)
        const createRes = await fetch('https://api.clerk.com/v1/users', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${secretKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            email_addresses: [args.contactEmail],
            public_metadata: { role: 'manufacturer' },
            skip_password_requirement: true,
          }),
        })
        if (createRes.ok) {
          const newUser = (await createRes.json()) as { id: string }
          resolvedId = newUser.id
          console.log('[manufacturers] Created Clerk account for', args.contactEmail)
        } else {
          const body = await createRes.text()
          console.error('[manufacturers] Clerk user creation failed:', createRes.status, body)
        }
      }

      if (resolvedId) {
        // Set the role on the account
        const patchRes = await fetch(
          `https://api.clerk.com/v1/users/${resolvedId}/metadata`,
          {
            method: 'PATCH',
            headers: {
              Authorization: `Bearer ${secretKey}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ public_metadata: { role: 'manufacturer' } }),
          },
        )
        if (patchRes.ok) {
          console.log('[manufacturers] Role set to manufacturer for', resolvedId)
        } else {
          const body = await patchRes.text()
          console.error('[manufacturers] Clerk metadata PATCH failed:', patchRes.status, body)
        }
      }
    }

    // Send the approval email via Resend
    await ctx.runAction(internal.email.sendManufacturerApprovalEmail, {
      contactName: args.contactName,
      contactEmail: args.contactEmail,
      companyName: args.companyName,
    })
  },
})

/** Approve or reject a manufacturer application. */
export const reviewApplication = mutation({
  args: {
    applicationId: v.id('manufacturers'),
    decision: v.union(v.literal('approved'), v.literal('rejected')),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const app = await ctx.db.get(args.applicationId)
    if (!app) throw new Error('Application not found')

    // Guard: don't approve an already-approved application
    if (app.status === 'approved' && args.decision === 'approved') {
      throw new Error('This manufacturer is already approved')
    }

    // Cross-type uniqueness check at approval time
    if (args.decision === 'approved') {
      const conflictingClinic = await ctx.db
        .query('clinicApplications')
        .withIndex('by_email', (q) => q.eq('contactEmail', app.contactEmail))
        .first()
      if (conflictingClinic && conflictingClinic.status !== 'rejected') {
        throw new Error(`Cannot approve: ${app.contactEmail} is already registered as a clinic account. Each email can only belong to one account type.`)
      }
    }

    await ctx.db.patch(args.applicationId, {
      status: args.decision,
      reviewedAt: Date.now(),
      reviewNotes: args.notes,
    })

    if (args.decision === 'approved') {
      // Activate the Clerk account + send approval email
      await ctx.scheduler.runAfter(0, internal.manufacturers.activateManufacturerAccount, {
        clerkUserId: app.clerkUserId ?? undefined,
        contactEmail: app.contactEmail,
        contactName: app.contactName,
        companyName: app.companyName,
      })

      return { applicationId: app._id }
    }

    // Rejection path ──────────────────────────────────────────────────────────
    // Send rejection email
    await ctx.scheduler.runAfter(0, internal.email.sendManufacturerRejectionEmail, {
      contactName: app.contactName,
      contactEmail: app.contactEmail,
      companyName: app.companyName,
      reviewNotes: args.notes,
    })

    return null
  },
})

/** Master admin: add a manufacturer directly without sending any invitation email.
 *  Used to pre-populate the platform with known manufacturers. */
export const adminAddManufacturer = mutation({
  args: {
    companyName:  v.string(),
    contactName:  v.string(),
    contactEmail: v.string(),
    country:      v.string(),
    regNumber:    v.optional(v.string()),
    website:      v.optional(v.string()),
    logoUrl:      v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) throw new Error('Not authenticated')
    const user = await ctx.db.query('users').withIndex('by_clerk', q => q.eq('clerkId', identity.subject)).first()
    if (!user || user.role !== 'admin') throw new Error('Admin role required')

    const existing = await ctx.db.query('manufacturers').withIndex('by_email', q => q.eq('contactEmail', args.contactEmail)).first()
    if (existing) throw new Error('A manufacturer account already exists with this email address.')

    const existingClinic = await ctx.db.query('clinicApplications').withIndex('by_email', q => q.eq('contactEmail', args.contactEmail)).first()
    if (existingClinic && existingClinic.status !== 'rejected') throw new Error('This email is already registered as a clinic account.')

    const slug = await uniqueSlug(ctx, args.companyName, args.country)
    return ctx.db.insert('manufacturers', {
      ...args,
      slug,
      clerkUserId: undefined,
      status:      'approved',
      submittedAt: Date.now(),
      reviewedAt:  Date.now(),
    })
  },
})

/** Master admin: bulk-import manufacturers from CSV without sending invitation emails. */
export const adminBulkAddManufacturers = mutation({
  args: {
    manufacturers: v.array(v.object({
      companyName:             v.string(),
      legalEntityName:         v.optional(v.string()),
      contactName:             v.string(),
      contactJobTitle:         v.optional(v.string()),
      contactEmail:            v.string(),
      contactPhone:            v.optional(v.string()),
      country:                 v.string(),
      regNumber:               v.optional(v.string()),
      website:                 v.optional(v.string()),
      logoUrl:                 v.optional(v.string()),
      regulatoryRegistrations: v.optional(v.string()),
    })),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) throw new Error('Not authenticated')
    const user = await ctx.db.query('users').withIndex('by_clerk', q => q.eq('clerkId', identity.subject)).first()
    if (!user || user.role !== 'admin') throw new Error('Admin role required')

    const now = Date.now()
    let added = 0, updated = 0

    // Upsert by company name — update existing, insert new
    const allExisting = await ctx.db.query('manufacturers').collect()
    const byName = new Map(allExisting.map(m => [m.companyName.toLowerCase().trim(), m]))

    for (const mfr of args.manufacturers) {
      const existing = byName.get(mfr.companyName.toLowerCase().trim())
      if (existing) {
        await ctx.db.patch(existing._id, {
          legalEntityName:         mfr.legalEntityName,
          contactName:             mfr.contactName,
          contactJobTitle:         mfr.contactJobTitle,
          contactEmail:            mfr.contactEmail,
          contactPhone:            mfr.contactPhone,
          country:                 mfr.country,
          regNumber:               mfr.regNumber,
          website:                 mfr.website,
          logoUrl:                 mfr.logoUrl,
          regulatoryRegistrations: mfr.regulatoryRegistrations,
        })
        updated++
      } else {
        const slug = await uniqueSlug(ctx, mfr.companyName, mfr.country)
        await ctx.db.insert('manufacturers', {
          companyName:             mfr.companyName,
          legalEntityName:         mfr.legalEntityName,
          contactName:             mfr.contactName,
          contactJobTitle:         mfr.contactJobTitle,
          contactEmail:            mfr.contactEmail,
          contactPhone:            mfr.contactPhone,
          country:                 mfr.country,
          regNumber:               mfr.regNumber,
          website:                 mfr.website,
          logoUrl:                 mfr.logoUrl,
          regulatoryRegistrations: mfr.regulatoryRegistrations,
          slug,
          clerkUserId: undefined,
          status:      'approved',
          submittedAt: now,
          reviewedAt:  now,
        })
        added++
      }
    }

    return { added, updated }
  },
})

/** Master admin: permanently delete a manufacturer record. */
export const deleteManufacturer = mutation({
  args: { id: v.id('manufacturers') },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) throw new Error('Not authenticated')
    const user = await ctx.db.query('users').withIndex('by_clerk', q => q.eq('clerkId', identity.subject)).first()
    if (!user || user.role !== 'admin') throw new Error('Admin role required')
    const mfr = await ctx.db.get(args.id)
    if (!mfr) throw new Error('Manufacturer not found')
    await ctx.db.delete(args.id)
  },
})

/** Master admin: directly invite a manufacturer (skips application process). */
export const inviteManufacturer = mutation({
  args: {
    companyName: v.string(),
    contactName: v.string(),
    contactEmail: v.string(),
    country: v.string(),
    regNumber: v.optional(v.string()),
    website: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Verify admin access
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) throw new Error('Not authenticated')

    const user = await ctx.db
      .query('users')
      .withIndex('by_clerk', (q) => q.eq('clerkId', identity.subject))
      .first()
    if (!user || user.role !== 'admin') throw new Error('Admin role required')

    // Check for existing manufacturer
    const existing = await ctx.db
      .query('manufacturers')
      .withIndex('by_email', (q) => q.eq('contactEmail', args.contactEmail))
      .first()

    if (existing) {
      throw new Error('A manufacturer account already exists with this email address.')
    }

    // Cross-type uniqueness: email cannot belong to a clinic account
    const existingClinic = await ctx.db
      .query('clinicApplications')
      .withIndex('by_email', (q) => q.eq('contactEmail', args.contactEmail))
      .first()
    if (existingClinic && existingClinic.status !== 'rejected') {
      throw new Error('This email address is already registered as a clinic account. Each email can only be used for one account type.')
    }

    // Create and immediately approve the manufacturer
    const id = await ctx.db.insert('manufacturers', {
      ...args,
      clerkUserId: undefined,
      status: 'approved',
      submittedAt: Date.now(),
      reviewedAt: Date.now(),
    })

    // Send invitation email with sign-up link (they'll activate by signing up)
    await ctx.scheduler.runAfter(0, internal.email.sendManufacturerInviteEmail, {
      contactName: args.contactName,
      contactEmail: args.contactEmail,
      companyName: args.companyName,
    })

    return { id }
  },
})

// ── Devices ───────────────────────────────────────────────────────────────────

/** Manufacturer submits a new device for review (24h auto-publish). */
export const submitDeviceForReview = mutation({
  args: {
    manufacturer: v.string(),
    model: v.string(),
    deviceType: v.string(),
    classification: v.union(v.literal('active'), v.literal('passive'), v.literal('legacy')),
    mriStatus: v.union(v.literal('conditional'), v.literal('safe'), v.literal('unsafe'), v.literal('unknown')),
    fieldStrengths: v.optional(v.string()),
    sarLimit: v.optional(v.string()),
    b1RmsLimit: v.optional(v.string()),
    slewRateLimit: v.optional(v.string()),
    gradientLimit: v.optional(v.string()),
    maxScanTime: v.optional(v.string()),
    contraindications: v.optional(v.string()),
    approvedRegions: v.optional(v.array(v.string())),
    lotNumber: v.optional(v.string()),
    regionalRep: v.optional(v.array(v.object({
      country: v.string(),
      name: v.string(),
      email: v.string(),
    }))),
    sourceUrls: v.optional(v.array(v.object({ url: v.string(), label: v.optional(v.string()) }))),
    sourceDocs: v.optional(v.array(v.object({ storageId: v.id('_storage'), label: v.optional(v.string()) }))),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) throw new Error('Not authenticated')

    const user = await ctx.db
      .query('users')
      .withIndex('by_clerk', (q) => q.eq('clerkId', identity.subject))
      .first()
    if (!user || user.role !== 'manufacturer') throw new Error('Manufacturer role required')

    const mfr = await ctx.db
      .query('manufacturers')
      .withIndex('by_email', (q) => q.eq('contactEmail', user.email))
      .first()
    if (!mfr || mfr.status !== 'approved') throw new Error('Manufacturer not approved')

    const deviceId = await ctx.db.insert('devices', {
      ...args,
      submittedByManufacturerId: mfr._id,
      status: 'pending_review',
      publishedAt: undefined,
      verified: false,
    })

    // Schedule auto-publish after 24 hours
    await ctx.scheduler.runAfter(24 * 60 * 60 * 1000, internal.manufacturers.publishDevice, {
      deviceId,
    })

    // Email: device pending notification
    await ctx.scheduler.runAfter(0, internal.email.sendDevicePendingEmail, {
      contactName:  mfr.contactName,
      contactEmail: mfr.contactEmail,
      companyName:  mfr.companyName,
      deviceName:   `${args.manufacturer} ${args.model}`,
      deviceId:     String(deviceId),
      portalUrl:    `https://portal.implantid.io/manufacturer/devices/${String(deviceId)}`,
    })

    return deviceId
  },
})

/** Scheduled mutation: auto-publish device after 24 hours (only if still pending_review). */
export const publishDevice = internalMutation({
  args: {
    deviceId: v.id('devices'),
  },
  handler: async (ctx, args) => {
    const device = await ctx.db.get(args.deviceId)
    if (!device) {
      console.error('[manufacturers] publishDevice: device not found (may have been deleted):', args.deviceId)
      return
    }

    // Only publish if still pending
    if (device.status === 'pending_review') {
      await ctx.db.patch(args.deviceId, {
        status: 'live',
        publishedAt: Date.now(),
      })
      console.log('[manufacturers] Auto-published device:', args.deviceId)

      // Email: device live notification
      if (device.submittedByManufacturerId) {
        const mfr = await ctx.db.get(device.submittedByManufacturerId)
        if (mfr) {
          await ctx.scheduler.runAfter(0, internal.email.sendDeviceLiveEmail, {
            contactName:  mfr.contactName,
            contactEmail: mfr.contactEmail,
            companyName:  mfr.companyName,
            deviceNames:  [`${device.manufacturer} ${device.model}`],
            deviceId:     String(args.deviceId),
          })
        }
      }
    }
  },
})

/** Get manufacturer's device list (all statuses). */
export const getMyDevices = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) return []

    const user = await ctx.db
      .query('users')
      .withIndex('by_clerk', (q) => q.eq('clerkId', identity.subject))
      .first()
    if (!user || user.role !== 'manufacturer') return []

    const mfr = await ctx.db
      .query('manufacturers')
      .withIndex('by_email', (q) => q.eq('contactEmail', user.email))
      .first()
    if (!mfr) return []

    return await ctx.db
      .query('devices')
      .withIndex('by_submitted_manufacturer', (q) => q.eq('submittedByManufacturerId', mfr._id))
      .order('desc')
      .take(100)
  },
})

/** Get a single device with change request history. */
export const getDeviceWithRequests = query({
  args: { id: v.id('devices') },
  handler: async (ctx, args) => {
    const device = await ctx.db.get(args.id)
    if (!device) return null

    const requests = await ctx.db
      .query('deviceChangeRequests')
      .withIndex('by_device', (q) => q.eq('deviceId', args.id))
      .order('desc')
      .take(50)

    return { ...device, changeRequests: requests }
  },
})

// ── Change Requests ───────────────────────────────────────────────────────────

/** Manufacturer submits a change request for an existing device. */
export const submitChangeRequest = mutation({
  args: {
    deviceId: v.id('devices'),
    requestType: v.union(v.literal('recall'), v.literal('unsafe'), v.literal('edit'), v.literal('other')),
    description: v.string(),
    proposedChanges: v.optional(v.object({
      mriStatus: v.optional(v.string()),
      fieldStrengths: v.optional(v.string()),
      sarLimit: v.optional(v.string()),
      b1RmsLimit: v.optional(v.string()),
      slewRateLimit: v.optional(v.string()),
      gradientLimit: v.optional(v.string()),
      maxScanTime: v.optional(v.string()),
      contraindications: v.optional(v.string()),
    })),
    lotNumbers: v.optional(v.array(v.string())),
    affectedRegions: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) throw new Error('Not authenticated')

    const user = await ctx.db
      .query('users')
      .withIndex('by_clerk', (q) => q.eq('clerkId', identity.subject))
      .first()
    if (!user || user.role !== 'manufacturer') throw new Error('Manufacturer role required')

    const mfr = await ctx.db
      .query('manufacturers')
      .withIndex('by_email', (q) => q.eq('contactEmail', user.email))
      .first()
    if (!mfr || mfr.status !== 'approved') throw new Error('Manufacturer not approved')

    const device = await ctx.db.get(args.deviceId)
    if (!device) throw new Error('Device not found')
    if (device.submittedByManufacturerId?.toString() !== mfr._id.toString()) {
      throw new Error('You can only request changes to your own devices')
    }

    const requestId = await ctx.db.insert('deviceChangeRequests', {
      deviceId: args.deviceId,
      manufacturerId: mfr._id,
      requestType: args.requestType,
      description: args.description,
      proposedChanges: args.proposedChanges,
      lotNumbers: args.lotNumbers,
      affectedRegions: args.affectedRegions,
      status: 'pending',
      submittedAt: Date.now(),
    })

    return requestId
  },
})

/** Manufacturer views their pending change requests. */
export const getMyChangeRequests = query({
  args: { status: v.optional(v.union(v.literal('pending'), v.literal('approved'), v.literal('rejected'))) },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) return []

    const user = await ctx.db
      .query('users')
      .withIndex('by_clerk', (q) => q.eq('clerkId', identity.subject))
      .first()
    if (!user || user.role !== 'manufacturer') return []

    const mfr = await ctx.db
      .query('manufacturers')
      .withIndex('by_email', (q) => q.eq('contactEmail', user.email))
      .first()
    if (!mfr) return []

    let query = ctx.db
      .query('deviceChangeRequests')
      .withIndex('by_manufacturer', (q) => q.eq('manufacturerId', mfr._id))

    if (args.status) {
      query = query.filter((q) => q.eq(q.field('status'), args.status!))
    }

    const requests = await query.order('desc').take(100)

    // Enrich with device info
    return Promise.all(
      requests.map(async (req) => {
        const device = await ctx.db.get(req.deviceId)
        return { ...req, deviceName: device?.model ?? 'Unknown' }
      }),
    )
  },
})

/** Master admin approves a change request and applies it to the device. */
export const approveChangeRequest = mutation({
  args: {
    requestId: v.id('deviceChangeRequests'),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) throw new Error('Not authenticated')
    const user = await ctx.db.query('users').withIndex('by_clerk', q => q.eq('clerkId', identity.subject)).first()
    if (!user || user.role !== 'admin') throw new Error('Admin access required')

    const request = await ctx.db.get(args.requestId)
    if (!request) throw new Error('Request not found')
    if (request.status !== 'pending') throw new Error('Only pending requests can be approved')

    const device = await ctx.db.get(request.deviceId)
    if (!device) throw new Error('Device not found')

    // Apply changes to device
    const updates: Record<string, unknown> = {
      status: 'live',
      publishedAt: Date.now(),
    }

    if (request.proposedChanges) {
      Object.assign(updates, request.proposedChanges)
    }

    // Mark recalled if it's a recall request
    if (request.requestType === 'recall') {
      updates.recalled = true
      updates.recallNotes = request.description
    }

    await ctx.db.patch(request.deviceId, updates)
    await ctx.db.patch(args.requestId, {
      status: 'approved',
      resolvedAt: Date.now(),
      publishedAt: Date.now(),
    })

    return { approved: true }
  },
})

/** Master admin rejects a change request. */
export const rejectChangeRequest = mutation({
  args: {
    requestId: v.id('deviceChangeRequests'),
    adminNotes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) throw new Error('Not authenticated')
    const user = await ctx.db.query('users').withIndex('by_clerk', q => q.eq('clerkId', identity.subject)).first()
    if (!user || user.role !== 'admin') throw new Error('Admin access required')

    const request = await ctx.db.get(args.requestId)
    if (!request) throw new Error('Request not found')
    if (request.status !== 'pending') throw new Error('Only pending requests can be rejected')

    await ctx.db.patch(args.requestId, {
      status: 'rejected',
      adminNotes: args.adminNotes,
      resolvedAt: Date.now(),
    })

    return { rejected: true }
  },
})

/** Master admin views all pending change requests (review queue). */
export const listChangeRequests = query({
  args: {
    status: v.optional(v.union(v.literal('pending'), v.literal('approved'), v.literal('rejected'))),
  },
  handler: async (ctx, args) => {
    let query = ctx.db
      .query('deviceChangeRequests')
      .withIndex('by_status', (q) => q.eq('status', args.status ?? 'pending'))

    const requests = await query.order('desc').take(100)

    // Enrich with device and manufacturer info
    return Promise.all(
      requests.map(async (req) => {
        const device = await ctx.db.get(req.deviceId)
        const mfr = await ctx.db.get(req.manufacturerId)
        return {
          ...req,
          deviceModel: device?.model ?? 'Unknown',
          manufacturerName: mfr?.companyName ?? 'Unknown',
        }
      }),
    )
  },
})

/** Count pending change requests (for sidebar badge). */
export const countPendingRequests = query({
  args: {},
  handler: async (ctx) => {
    const requests = await ctx.db
      .query('deviceChangeRequests')
      .withIndex('by_status', (q) => q.eq('status', 'pending'))
      .take(1)
    return requests.length
  },
})

/** Master admin: approve device early (before 24h auto-publish). */
export const approveDeviceEarly = mutation({
  args: {
    deviceId: v.id('devices'),
  },
  handler: async (ctx, args) => {
    const device = await ctx.db.get(args.deviceId)
    if (!device) throw new Error('Device not found')
    if (device.status !== 'pending_review') throw new Error('Only pending_review devices can be approved early')

    await ctx.db.patch(args.deviceId, {
      status: 'live',
      publishedAt: Date.now(),
    })

    return { approved: true }
  },
})

/** Master admin: reject a pending device. */
export const rejectDevice = mutation({
  args: {
    deviceId: v.id('devices'),
    reason: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const device = await ctx.db.get(args.deviceId)
    if (!device) throw new Error('Device not found')

    // Mark as draft (soft delete - device can be re-submitted)
    await ctx.db.patch(args.deviceId, {
      status: 'draft',
    })

    // Notify the submitting manufacturer by email
    if (device.submittedByManufacturerId) {
      const mfr = await ctx.db.get(device.submittedByManufacturerId)
      if (mfr) {
        await ctx.scheduler.runAfter(0, internal.email.sendDeviceRejectionEmail, {
          contactName:  mfr.contactName,
          contactEmail: mfr.contactEmail,
          companyName:  mfr.companyName,
          deviceModel:  device.model ?? 'your device submission',
          reason:       args.reason,
        })
      }
    }

    return { rejected: true }
  },
})

/** Returns the number of times any of the manufacturer's devices have been looked up in the last 30 days. */
export const getManufacturerLookupStats = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) return { lookups30d: 0 }

    const user = await ctx.db
      .query('users')
      .withIndex('by_clerk', (q) => q.eq('clerkId', identity.subject))
      .first()
    if (!user || user.role !== 'manufacturer') return { lookups30d: 0 }

    const mfr = await ctx.db
      .query('manufacturers')
      .withIndex('by_email', (q) => q.eq('contactEmail', user.email))
      .first()
    if (!mfr) return { lookups30d: 0 }

    const devices = await ctx.db
      .query('devices')
      .withIndex('by_submitted_manufacturer', (q) => q.eq('submittedByManufacturerId', mfr._id))
      .collect()

    const cutoff = Date.now() - 30 * 24 * 60 * 60 * 1000
    let lookups30d = 0
    for (const device of devices) {
      const rows = await ctx.db
        .query('deviceLookups')
        .withIndex('by_device_and_time', (q) =>
          q.eq('deviceId', device._id).gte('createdAt', cutoff)
        )
        .collect()
      lookups30d += rows.length
    }

    return { lookups30d }
  },
})
