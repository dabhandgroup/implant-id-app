import { cronJobs } from 'convex/server'
import { internal } from './_generated/api'

const crons = cronJobs()

// Publish manufacturer-submitted devices that have passed the 24-hour review hold.
crons.hourly(
  'auto-publish pending devices',
  { minuteUTC: 0 },
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (internal as any).devices.autoPublishPendingDevices,
)

export default crons
