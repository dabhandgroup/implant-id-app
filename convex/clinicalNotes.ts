import { mutation, query } from './_generated/server'
import { v } from 'convex/values'

// Clinic staff / surgeon / admin: all notes for a patient
export const getPatientClinicalNotes = query({
  args: { patientId: v.id('patients') },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) return []
    const user = await ctx.db.query('users').withIndex('by_clerk', q => q.eq('clerkId', identity.subject)).first()
    if (!user) return []
    const isClinicStaff = user.role === 'clinic_staff' || user.role === 'surgeon'
    const isAdmin = user.role === 'admin'
    if (!isClinicStaff && !isAdmin) return []
    return await ctx.db
      .query('clinicalNotes')
      .withIndex('by_patient', q => q.eq('patientId', args.patientId))
      .order('asc')
      .collect()
  },
})

// Patient: only notes explicitly shared with them
export const getMyVisibleClinicalNotes = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) return []
    const user = await ctx.db.query('users').withIndex('by_clerk', q => q.eq('clerkId', identity.subject)).first()
    if (!user) return []
    const patient = await ctx.db.query('patients').withIndex('by_user', q => q.eq('userId', user._id)).first()
    if (!patient) return []
    return await ctx.db
      .query('clinicalNotes')
      .withIndex('by_patient_visible', q => q.eq('patientId', patient._id).eq('visibleToPatient', true))
      .order('asc')
      .collect()
  },
})

// Clinic staff: add a note to a patient's record
export const addClinicalNote = mutation({
  args: {
    patientId:        v.id('patients'),
    content:          v.string(),
    visibleToPatient: v.boolean(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) throw new Error('Not authenticated')
    const user = await ctx.db.query('users').withIndex('by_clerk', q => q.eq('clerkId', identity.subject)).first()
    if (!user) throw new Error('User not found')
    const isClinicStaff = user.role === 'clinic_staff' || user.role === 'surgeon'
    const isAdmin = user.role === 'admin'
    if (!isClinicStaff && !isAdmin) throw new Error('Only clinic staff can add clinical notes')

    let authorRole = user.role
    let clinicId: ReturnType<typeof v.id<'clinics'>> | undefined
    let clinicName: string | undefined

    if (isClinicStaff) {
      const staffRow = await ctx.db.query('staff').withIndex('by_user', q => q.eq('userId', user._id)).first()
      if (staffRow) {
        authorRole = staffRow.jobType
        clinicId   = staffRow.clinicId
        const clinic = await ctx.db.get(staffRow.clinicId)
        clinicName = clinic?.name
      }
    }

    return await ctx.db.insert('clinicalNotes', {
      patientId:        args.patientId,
      authorId:         user._id,
      authorName:       user.name,
      authorRole,
      clinicId,
      clinicName,
      content:          args.content.trim(),
      visibleToPatient: args.visibleToPatient,
      createdAt:        Date.now(),
    })
  },
})

// Delete own note (or admin can delete any)
export const deleteClinicalNote = mutation({
  args: { noteId: v.id('clinicalNotes') },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) throw new Error('Not authenticated')
    const user = await ctx.db.query('users').withIndex('by_clerk', q => q.eq('clerkId', identity.subject)).first()
    if (!user) throw new Error('User not found')
    const note = await ctx.db.get(args.noteId)
    if (!note) throw new Error('Note not found')
    if (note.authorId !== user._id && user.role !== 'admin') throw new Error('Not authorised')
    await ctx.db.delete(args.noteId)
    return { deleted: true }
  },
})

// Toggle visibility (own note or admin)
export const toggleNoteVisibility = mutation({
  args: { noteId: v.id('clinicalNotes'), visibleToPatient: v.boolean() },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) throw new Error('Not authenticated')
    const user = await ctx.db.query('users').withIndex('by_clerk', q => q.eq('clerkId', identity.subject)).first()
    if (!user) throw new Error('User not found')
    const note = await ctx.db.get(args.noteId)
    if (!note) throw new Error('Note not found')
    if (note.authorId !== user._id && user.role !== 'admin') throw new Error('Not authorised')
    await ctx.db.patch(args.noteId, { visibleToPatient: args.visibleToPatient })
    return { updated: true }
  },
})
