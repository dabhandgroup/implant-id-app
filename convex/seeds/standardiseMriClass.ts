import { mutation } from '../_generated/server'

// Run with:  npx convex run seeds/standardiseMriClass:standardiseMriClassification
//
// One-time migration: populates `mriClassification` on every device row that is
// missing it (or has an empty string) by mapping from the existing `mriStatus`
// field (which was the old string enum).
//
// Safe to run multiple times — devices that already have mriClassification are skipped.

const STATUS_TO_CLASSIFICATION: Record<string, string> = {
  conditional:  'MR Conditional',
  safe:         'MR Safe',
  unsafe:       'MR Unsafe',
  not_tested:   'Not Tested',
  not_stated:   'Not Stated',
  unknown:      'Not Stated',
}

export const standardiseMriClassification = mutation({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity()
    if (identity) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const db = ctx.db as any
      const user = await db.query('users').withIndex('by_clerk', (q: any) => q.eq('clerkId', identity.subject)).unique()
      if (user && user.role !== 'admin') throw new Error('Admin access required')
    }

    const devices = await ctx.db.query('devices').collect()

    let updated = 0
    let skipped = 0

    for (const device of devices) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const d = device as any

      // Already has a value — skip
      if (d.mriClassification && d.mriClassification.trim() !== '') {
        skipped++
        continue
      }

      const mriStatus: string | undefined = d.mriStatus
      if (!mriStatus) {
        skipped++
        continue
      }

      const classification = STATUS_TO_CLASSIFICATION[mriStatus.toLowerCase().replace(/ /g, '_')]
      if (!classification) {
        skipped++
        continue
      }

      await ctx.db.patch(device._id, { mriClassification: classification } as never)
      updated++
    }

    return { total: devices.length, updated, skipped }
  },
})
