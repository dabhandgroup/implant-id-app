import { mutation, query } from './_generated/server'
import { v } from 'convex/values'

/** List all live documents (source docs + submission contracts). */
export const listDocuments = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    return ctx.db
      .query('documents')
      .withIndex('by_status', (q) => q.eq('status', 'live'))
      .order('desc')
      .take(args.limit ?? 200)
  },
})

/** Get a single document by Convex ID. */
export const getDocument = query({
  args: { id: v.id('documents') },
  handler: async (ctx, args) => {
    return ctx.db.get(args.id)
  },
})

/** List documents for a specific manufacturer. */
export const listByManufacturer = query({
  args: { manufacturer: v.string() },
  handler: async (ctx, args) => {
    return ctx.db
      .query('documents')
      .withIndex('by_manufacturer', (q) => q.eq('manufacturer', args.manufacturer))
      .order('desc')
      .take(100)
  },
})

/** Add a source document (admin use — for IFUs, manuals, spec sheets). */
export const addDocument = mutation({
  args: {
    title: v.string(),
    docType: v.string(),
    manufacturer: v.string(),
    deviceNames: v.array(v.string()),
    documentVersion: v.optional(v.string()),
    documentDate: v.optional(v.string()),
    dateRetrieved: v.optional(v.string()),
    sourceUrl: v.optional(v.string()),
    notes: v.optional(v.string()),
    verifiedBy: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    return ctx.db.insert('documents', {
      ...args,
      status: 'live',
      createdAt: Date.now(),
    })
  },
})

/**
 * Auto-create a submission contract document when a manufacturer submits a device.
 * Called internally from the manufacturer device submission flow.
 */
export const createSubmissionContract = mutation({
  args: {
    title: v.string(),
    manufacturer: v.string(),
    deviceNames: v.array(v.string()),
    submittedByManufacturerId: v.id('manufacturers'),
    signerName: v.string(),
    signerTitle: v.string(),
    signerCompany: v.string(),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    return ctx.db.insert('documents', {
      title: args.title,
      docType: 'Submission Contract',
      manufacturer: args.manufacturer,
      deviceNames: args.deviceNames,
      submittedByManufacturerId: args.submittedByManufacturerId,
      signerName: args.signerName,
      signerTitle: args.signerTitle,
      signerCompany: args.signerCompany,
      signedAt: Date.now(),
      notes: args.notes,
      status: 'live',
      createdAt: Date.now(),
    })
  },
})
