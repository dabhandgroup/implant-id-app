import { query }    from './_generated/server'
import { v }         from 'convex/values'
import { Doc, Id }   from './_generated/dataModel'
import { resolveSystem, combineVerdicts, SystemInput } from './matrixCore'

// The pure 10-gate resolver (resolveSystem) and its helpers/constants live in
// ./matrixCore.ts — shared with the standalone MVP matrix
// (src/app/clinics/matrix/) so the safety logic is never duplicated. This file
// is now just the Convex data-assembly layer: fetch real records, build
// SystemInput objects, call the shared resolver.

// ── Main resolver query ───────────────────────────────────────────────────────

export const resolveMatrix = query({
  args: {
    mode:                  v.union(v.literal('registry'), v.literal('manual')),
    // Registry mode
    patientId:             v.optional(v.id('patients')),
    // Manual mode
    manualDeviceId:        v.optional(v.id('devices')),
    manualLeadIds:         v.optional(v.array(v.id('devices'))),
    manualImplantLocation: v.optional(v.string()),
    manualIntegrityState:  v.optional(v.string()),
    // Hardware (both modes) — either from DB or manual entry
    scannerId:             v.optional(v.id('scanners')),
    coilId:                v.optional(v.id('siteCoils')),
    // Manual scanner entry (used when clinic has no scanner in DB)
    manualFieldStrength:   v.optional(v.string()),
    manualScannerType:     v.optional(v.string()),
    manualSpatialGradient: v.optional(v.float64()),
    manualSlewRate:        v.optional(v.float64()),
    // Manual coil entry
    manualCoilType:        v.optional(v.string()),
    bodyRegion:            v.string(),
  },
  handler: async (ctx, args) => {
    // 1. Fetch scanner from DB, or build from manual entry
    const dbScanner = args.scannerId ? await ctx.db.get(args.scannerId) : null
    if (!dbScanner && !args.manualFieldStrength) throw new Error('Either scannerId or manualFieldStrength is required')
    const scanner = (dbScanner ?? {
      fieldStrength:       args.manualFieldStrength!,
      maxSpatialGradient:  args.manualSpatialGradient,
      maxSlewRate:         args.manualSlewRate,
      scannerType:         args.manualScannerType ?? 'Closed-bore',
      fieldOrientation:    undefined,
      tableLimitKg:        undefined,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    }) as any

    // 2. Fetch coil from DB, or build from manual coil type
    const dbCoil = args.coilId ? await ctx.db.get(args.coilId) : null
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const coil = (dbCoil ?? (args.manualCoilType ? { coilType: args.manualCoilType, coilDisplayName: args.manualCoilType } : null)) as any

    const preflightWarnings: string[] = []
    const systems: SystemInput[] = []

    // 3. Assemble systems
    if (args.mode === 'registry') {
      if (!args.patientId) throw new Error('patientId required in registry mode')

      const patient = await ctx.db.get(args.patientId)

      // Weight pre-check
      if (patient?.weightKg && scanner.tableLimitKg && patient.weightKg > scanner.tableLimitKg) {
        preflightWarnings.push(`Patient weight ${patient.weightKg} kg may exceed this scanner's rated table limit of ${scanner.tableLimitKg} kg. Confirm with site engineering before positioning.`)
      }

      const patientDeviceRows = await ctx.db
        .query('patientDevices')
        .withIndex('by_patient', (q) => q.eq('patientId', args.patientId!))
        .collect()
      const active = patientDeviceRows.filter((pd) => pd.status === 'active')

      // Group by systemGroupId (or individual device if no group)
      const systemMap = new Map<string, typeof active>()
      for (const pd of active) {
        const key = pd.systemGroupId ?? pd._id
        const existing = systemMap.get(key) ?? []
        existing.push(pd)
        systemMap.set(key, existing)
      }

      for (const [, group] of systemMap) {
        // Fetch device records for this group
        const deviceDocs = (await Promise.all(group.map((pd) => ctx.db.get(pd.deviceId)))).filter(Boolean) as Doc<'devices'>[]

        // Primary device: prefer Generator/System role, fallback to first
        const primary = group.find((pd) => {
          const dev = deviceDocs.find((d) => d._id === pd.deviceId)
          return dev?.componentRole && ['Generator', 'System', 'IPG'].includes(dev.componentRole)
        }) ?? group[0]

        const primaryDevice = deviceDocs.find((d) => d._id === primary.deviceId)
        if (!primaryDevice) continue

        // Post-implant wait check
        const postWaitWeeks = (primaryDevice as unknown as { postImplantWaitWeeks?: number }).postImplantWaitWeeks
        const implantDate   = (primary as unknown as { implantDate?: string }).implantDate
        if (postWaitWeeks && implantDate) {
          const implantMs  = new Date(implantDate).getTime()
          const nowMs      = Date.now()
          const weeksSince = (nowMs - implantMs) / (7 * 24 * 60 * 60 * 1000)
          if (weeksSince < postWaitWeeks) {
            const daysLeft = Math.ceil((postWaitWeeks - weeksSince) * 7)
            preflightWarnings.push(
              `${primaryDevice.deviceName ?? primaryDevice.model}: manufacturer requires ${postWaitWeeks} weeks post-implant before MRI. Approximately ${daysLeft} day${daysLeft !== 1 ? 's' : ''} remaining.`
            )
          }
        }

        // Leads = all group members that are not the primary
        const leadRows = group.filter((pd) => pd._id !== primary._id)
        const leadDevices = (await Promise.all(leadRows.map((pd) => ctx.db.get(pd.deviceId)))).filter(Boolean) as Doc<'devices'>[]

        // Fetch conditions for the primary device
        const conditions = await ctx.db
          .query('deviceConditions')
          .withIndex('by_parent', (q) => q.eq('parentId', primaryDevice._id as string))
          .collect()

        const systemLabel = primaryDevice.deviceName ?? primaryDevice.model

        systems.push({
          label:           systemLabel,
          device:          primaryDevice,
          conditions,
          leadDevices,
          integrityState:  primary.deviceIntegrityState ?? 'Not Stated',
          implantLocation: primary.implantLocation,
        })
      }
    } else {
      // Manual mode — single device (+ optional leads)
      if (!args.manualDeviceId) throw new Error('manualDeviceId required in manual mode')

      const device = await ctx.db.get(args.manualDeviceId)
      if (!device) throw new Error('Device not found')

      const conditions = await ctx.db
        .query('deviceConditions')
        .withIndex('by_parent', (q) => q.eq('parentId', args.manualDeviceId as string))
        .collect()

      const leadDevices = args.manualLeadIds
        ? ((await Promise.all(args.manualLeadIds.map((id) => ctx.db.get(id)))).filter(Boolean) as Doc<'devices'>[])
        : []

      systems.push({
        label:           device.deviceName ?? device.model,
        device,
        conditions,
        leadDevices,
        integrityState:  args.manualIntegrityState ?? 'Not Stated',
        implantLocation: args.manualImplantLocation,
      })
    }

    // 4. Resolve each system
    const results = systems.map((s) => resolveSystem(s, scanner as Doc<'scanners'>, coil as Doc<'siteCoils'> | null, args.bodyRegion))

    // 5. Combine verdicts — most restrictive wins
    const verdict = combineVerdicts(results)

    // Combine and deduplicate constraints across all systems
    const combinedConstraints = [...new Set(results.flatMap((r) => r.constraints))]

    return {
      verdict,
      systems:             results,
      combinedConstraints,
      weightAlert: preflightWarnings.length > 0 ? preflightWarnings.join('\n') : null,
    }
  },
})
