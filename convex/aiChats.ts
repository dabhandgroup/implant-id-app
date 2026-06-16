import { mutation, query } from './_generated/server'
import { v } from 'convex/values'

const messageV = v.object({
  role:         v.union(v.literal('user'), v.literal('assistant')),
  content:      v.string(),
  isFileImport: v.optional(v.boolean()),
})

/** List all AI chat sessions for the current admin, newest first. */
export const listChats = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) return []
    const user = await ctx.db.query('users').withIndex('by_clerk', q => q.eq('clerkId', identity.subject)).unique()
    if (!user || user.role !== 'admin') return []

    return ctx.db
      .query('aiChats')
      .withIndex('by_clerk_updated', q => q.eq('clerkId', identity.subject))
      .order('desc')
      .take(60)
  },
})

/** Create a new AI chat session. Returns the new document _id. */
export const saveChat = mutation({
  args: {
    title:    v.string(),
    messages: v.array(messageV),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) throw new Error('Not authenticated')
    const user = await ctx.db.query('users').withIndex('by_clerk', q => q.eq('clerkId', identity.subject)).unique()
    if (!user || user.role !== 'admin') throw new Error('Admin access required')

    const now = Date.now()
    return ctx.db.insert('aiChats', {
      clerkId:   identity.subject,
      title:     args.title,
      messages:  args.messages,
      createdAt: now,
      updatedAt: now,
    })
  },
})

/** Update the messages (and updatedAt) of an existing chat session. */
export const updateChat = mutation({
  args: {
    id:       v.id('aiChats'),
    messages: v.array(messageV),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) throw new Error('Not authenticated')
    const chat = await ctx.db.get(args.id)
    if (!chat || chat.clerkId !== identity.subject) throw new Error('Not found')

    await ctx.db.patch(args.id, { messages: args.messages, updatedAt: Date.now() })
  },
})

/** Delete an AI chat session. */
export const deleteChat = mutation({
  args: { id: v.id('aiChats') },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) throw new Error('Not authenticated')
    const chat = await ctx.db.get(args.id)
    if (!chat || chat.clerkId !== identity.subject) throw new Error('Not found')

    await ctx.db.delete(args.id)
  },
})
