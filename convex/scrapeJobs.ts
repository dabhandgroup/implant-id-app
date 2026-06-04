import { mutation, query } from './_generated/server'
import { v }              from 'convex/values'

/** Create a new scrape job (pending). Returns the job ID. */
export const createScrapeJob = mutation({
  args: {
    manufacturer: v.string(),
    model:        v.string(),
    deviceType:   v.string(),
    ifuUrl:       v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    return ctx.db.insert('scrapeJobs', {
      manufacturer: args.manufacturer,
      model:        args.model,
      deviceType:   args.deviceType,
      ifuUrl:       args.ifuUrl,
      status:       'pending',
      createdAt:    Date.now(),
    })
  },
})

/** Mark a scrape job as complete with its result. */
export const completeScrapeJob = mutation({
  args: {
    jobId:  v.id('scrapeJobs'),
    result: v.any(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.jobId, {
      status:      'complete',
      result:      args.result,
      completedAt: Date.now(),
    })
  },
})

/** Mark a scrape job as errored. */
export const failScrapeJob = mutation({
  args: {
    jobId:        v.id('scrapeJobs'),
    errorMessage: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.jobId, {
      status:       'error',
      errorMessage: args.errorMessage,
      completedAt:  Date.now(),
    })
  },
})

/** List the most recent scrape jobs (history). */
export const listScrapeJobs = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    return ctx.db
      .query('scrapeJobs')
      .withIndex('by_created')
      .order('desc')
      .take(args.limit ?? 20)
  },
})

/** Get a single scrape job by ID. */
export const getScrapeJob = query({
  args: { jobId: v.id('scrapeJobs') },
  handler: async (ctx, args) => {
    return ctx.db.get(args.jobId)
  },
})
