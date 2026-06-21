import { v } from 'convex/values'
import { mutation, query } from './_generated/server'

async function getAuthedUser(ctx: any) {
  const identity = await ctx.auth.getUserIdentity()
  if (!identity) return null
  return ctx.db
    .query('users')
    .withIndex('by_clerk', (q: any) => q.eq('clerkId', identity.subject))
    .unique()
}

/** Generate a short-lived upload URL for a surgeon document. */
export const generateUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    const user = await getAuthedUser(ctx)
    if (!user || !['surgeon', 'clinic_staff', 'admin'].includes(user.role)) {
      throw new Error('Not authorised')
    }
    return ctx.storage.generateUploadUrl()
  },
})

/** Save metadata after a document has been uploaded to storage. */
export const saveDocument = mutation({
  args: {
    patientId:  v.id('patients'),
    storageId:  v.id('_storage'),
    docType:    v.union(
      v.literal('surgical_notes'),
      v.literal('implant_card'),
      v.literal('consent'),
      v.literal('other'),
    ),
    fileName:   v.string(),
    notes:      v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await getAuthedUser(ctx)
    if (!user || !['surgeon', 'clinic_staff', 'admin'].includes(user.role)) {
      throw new Error('Not authorised')
    }
    return ctx.db.insert('surgeonDocuments', {
      patientId:        args.patientId,
      uploadedByUserId: user._id,
      storageId:        args.storageId,
      docType:          args.docType,
      fileName:         args.fileName,
      uploadedAt:       Date.now(),
      notes:            args.notes,
    })
  },
})

/** List all documents for a patient. Returns docs with download URLs. */
export const listDocuments = query({
  args: { patientId: v.id('patients') },
  handler: async (ctx, args) => {
    const user = await getAuthedUser(ctx)
    if (!user || !['surgeon', 'clinic_staff', 'admin'].includes(user.role)) return []

    const docs = await ctx.db
      .query('surgeonDocuments')
      .withIndex('by_patient', (q) => q.eq('patientId', args.patientId))
      .order('desc')
      .collect()

    return Promise.all(
      docs.map(async (doc) => ({
        ...doc,
        url: await ctx.storage.getUrl(doc.storageId),
      }))
    )
  },
})

/** Delete a surgeon document. */
export const deleteDocument = mutation({
  args: { documentId: v.id('surgeonDocuments') },
  handler: async (ctx, args) => {
    const user = await getAuthedUser(ctx)
    if (!user || !['surgeon', 'clinic_staff', 'admin'].includes(user.role)) {
      throw new Error('Not authorised')
    }
    const doc = await ctx.db.get(args.documentId)
    if (!doc) throw new Error('Document not found')
    await ctx.storage.delete(doc.storageId)
    await ctx.db.delete(args.documentId)
  },
})
