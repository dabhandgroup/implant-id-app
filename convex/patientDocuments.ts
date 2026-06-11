import { mutation, query } from './_generated/server'
import { v }               from 'convex/values'

/** Generate a one-time Convex storage upload URL for a patient document (clinic/surgeon only). */
export const generateUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) throw new Error('Not authenticated')
    const user = await ctx.db
      .query('users')
      .withIndex('by_clerk', (q) => q.eq('clerkId', identity.subject))
      .unique()
    if (!user || !['clinic_staff', 'surgeon', 'admin'].includes(user.role)) {
      throw new Error('Clinic staff access required')
    }
    return ctx.storage.generateUploadUrl()
  },
})

/** Save a document after the file has been uploaded to Convex storage (clinic/surgeon only). */
export const addPatientDocument = mutation({
  args: {
    patientId:    v.id('patients'),
    fileStorageId: v.id('_storage'),
    fileName:     v.string(),
    docType:      v.string(),
    notes:        v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) throw new Error('Not authenticated')
    const user = await ctx.db
      .query('users')
      .withIndex('by_clerk', (q) => q.eq('clerkId', identity.subject))
      .unique()
    if (!user || !['clinic_staff', 'surgeon', 'admin'].includes(user.role)) {
      throw new Error('Clinic staff access required')
    }

    // Find the clinic this staff member belongs to (if any)
    const staff = await ctx.db
      .query('staff')
      .withIndex('by_user', (q) => q.eq('userId', user._id))
      .first()

    await ctx.db.insert('patientDocuments', {
      patientId:    args.patientId,
      clinicId:     staff?.clinicId,
      uploadedBy:   user._id,
      fileName:     args.fileName,
      fileStorageId: args.fileStorageId,
      docType:      args.docType,
      notes:        args.notes,
      uploadedAt:   Date.now(),
    })

    // Notify patient
    const patient = await ctx.db.get(args.patientId)
    if (patient) {
      await ctx.db.insert('notifications', {
        userId:    patient.userId,
        type:      'document_added',
        title:     'A document was added to your record',
        body:      `"${args.fileName}" has been attached to your implant record.`,
        read:      false,
        relatedId: args.patientId,
        createdAt: Date.now(),
      })
    }
  },
})

/** All documents for a specific patient (clinic-facing). Returns signed storage URLs. */
export const getPatientDocuments = query({
  args: { patientId: v.id('patients') },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) return []
    const user = await ctx.db
      .query('users')
      .withIndex('by_clerk', (q) => q.eq('clerkId', identity.subject))
      .unique()
    if (!user || !['clinic_staff', 'surgeon', 'admin'].includes(user.role)) return []

    const docs = await ctx.db
      .query('patientDocuments')
      .withIndex('by_patient', (q) => q.eq('patientId', args.patientId))
      .order('desc')
      .take(50)

    return Promise.all(docs.map(async (d) => ({
      ...d,
      url: await ctx.storage.getUrl(d.fileStorageId),
    })))
  },
})

/** All documents for the currently authenticated patient (patient-facing). */
export const getMyDocuments = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) return []
    const user = await ctx.db
      .query('users')
      .withIndex('by_clerk', (q) => q.eq('clerkId', identity.subject))
      .unique()
    if (!user) return []
    const patient = await ctx.db
      .query('patients')
      .withIndex('by_user', (q) => q.eq('userId', user._id))
      .unique()
    if (!patient) return []

    const docs = await ctx.db
      .query('patientDocuments')
      .withIndex('by_patient', (q) => q.eq('patientId', patient._id))
      .order('desc')
      .take(50)

    return Promise.all(docs.map(async (d) => ({
      ...d,
      url: await ctx.storage.getUrl(d.fileStorageId),
    })))
  },
})

/** Delete a document (uploader or admin only). */
export const deletePatientDocument = mutation({
  args: { documentId: v.id('patientDocuments') },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) throw new Error('Not authenticated')
    const user = await ctx.db
      .query('users')
      .withIndex('by_clerk', (q) => q.eq('clerkId', identity.subject))
      .unique()
    if (!user) throw new Error('User not found')

    const doc = await ctx.db.get(args.documentId)
    if (!doc) throw new Error('Document not found')

    if (user.role !== 'admin' && doc.uploadedBy !== user._id) {
      throw new Error('You can only delete documents you uploaded')
    }

    await ctx.storage.delete(doc.fileStorageId)
    await ctx.db.delete(args.documentId)
  },
})
