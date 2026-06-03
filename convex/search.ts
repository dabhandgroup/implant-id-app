import { query } from './_generated/server'
import { v }     from 'convex/values'

/**
 * Platform-wide search for the master admin.
 * Searches patients (name + implant ID), approved clinics, and devices in parallel.
 * Returns up to 6 results per category so the UI stays fast.
 */
export const masterSearch = query({
  args: { query: v.string() },
  handler: async (ctx, args) => {
    const raw = args.query.trim()
    if (raw.length < 2) return { patients: [], clinics: [], devices: [] }

    const q = raw.toLowerCase()

    // ── Patients ────────────────────────────────────────────────────────────
    const allPatients = await ctx.db.query('patients').order('desc').take(200)
    const patients = allPatients
      .filter(p =>
        `${p.firstName} ${p.lastName}`.toLowerCase().includes(q) ||
        p.implantIdCode.toLowerCase().includes(q) ||
        p.selfReportedDevice?.toLowerCase().includes(q),
      )
      .slice(0, 6)
      .map(p => ({
        _id:               p._id,
        name:              `${p.firstName} ${p.lastName}`,
        implantIdCode:     p.implantIdCode,
        verificationStatus: p.verificationStatus,
        device:            p.selfReportedDevice ?? null,
      }))

    // ── Clinics ─────────────────────────────────────────────────────────────
    const allClinics = await ctx.db.query('clinics').take(200)
    const clinics = allClinics
      .filter(c =>
        c.name.toLowerCase().includes(q) ||
        c.email?.toLowerCase().includes(q),
      )
      .slice(0, 6)
      .map(c => ({
        _id:    c._id,
        name:   c.name,
        email:  c.email ?? null,
        status: c.status,
      }))

    // Pending applications that match (in case the clinic isn't approved yet)
    const allApps = await ctx.db.query('clinicApplications').take(200)
    const pendingClinics = allApps
      .filter(a =>
        a.status === 'pending' &&
        (a.facilityName.toLowerCase().includes(q) || a.contactEmail.toLowerCase().includes(q)),
      )
      .slice(0, 3)
      .map(a => ({
        _id:    a._id,
        name:   a.facilityName,
        email:  a.contactEmail,
        status: 'pending' as const,
        isApplication: true,
      }))

    // ── Devices ─────────────────────────────────────────────────────────────
    const allDevices = await ctx.db.query('devices').take(500)
    const devices = allDevices
      .filter(d =>
        d.manufacturer.toLowerCase().includes(q) ||
        d.model.toLowerCase().includes(q) ||
        d.deviceType.toLowerCase().includes(q),
      )
      .slice(0, 6)
      .map(d => ({
        _id:          d._id,
        manufacturer: d.manufacturer,
        model:        d.model,
        deviceType:   d.deviceType,
        mriStatus:    d.mriStatus,
      }))

    return {
      patients,
      clinics:  [...clinics, ...pendingClinics].slice(0, 6),
      devices,
    }
  },
})
