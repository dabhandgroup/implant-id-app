import { defineSchema, defineTable } from 'convex/server'
import { v } from 'convex/values'

export default defineSchema({
  // Users — one row per Clerk user, links clerkId to role + profile
  users: defineTable({
    clerkId: v.string(),
    email: v.string(),
    role: v.union(v.literal('patient'), v.literal('clinic_staff'), v.literal('admin')),
    name: v.string(),
  })
    .index('by_clerk', ['clerkId'])
    .index('by_email', ['email']),

  // Implant device catalogue (managed by platform admin)
  devices: defineTable({
    manufacturer: v.string(),
    model: v.string(),
    deviceType: v.string(), // e.g. "Pacemaker", "Hip Replacement"
    classification: v.union(v.literal('active'), v.literal('passive'), v.literal('legacy')),
    mriStatus: v.union(v.literal('conditional'), v.literal('safe'), v.literal('unsafe'), v.literal('unknown')),
    fieldStrengths: v.optional(v.string()),   // e.g. "1.5T, 3.0T"
    sarLimit: v.optional(v.string()),
    b1RmsLimit: v.optional(v.string()),
    slewRateLimit: v.optional(v.string()),
    gradientLimit: v.optional(v.string()),
    maxScanTime: v.optional(v.string()),
    contraindications: v.optional(v.string()),
    approvedRegions: v.optional(v.array(v.string())),
    verified: v.boolean(),
    verifiedAt: v.optional(v.number()),
    submittedByManufacturer: v.optional(v.string()),
  })
    .index('by_manufacturer', ['manufacturer'])
    .index('by_mri_status', ['mriStatus'])
    .index('by_classification', ['classification']),

  // Patient profiles
  patients: defineTable({
    userId:        v.id('users'),
    implantIdCode: v.string(),          // e.g. IID-SMIJO2311XK

    // Personal details
    firstName: v.string(),
    lastName:  v.string(),
    dob:       v.optional(v.string()),  // YYYY-MM-DD
    phone:     v.optional(v.string()),

    // Self-reported implant (unverified until clinic confirms)
    selfReportedDevice:       v.optional(v.string()),  // free-text name
    selfReportedDeviceId:     v.optional(v.string()),  // devices.ts device_id if matched
    selfReportedManufacturer: v.optional(v.string()),  // manufacturer common_name
    selfReportedModelNumber:  v.optional(v.string()),  // model_number
    selfReportedDeviceType:   v.optional(v.string()),  // e.g. "Pacemaker"
    selfReportedImplantMonth: v.optional(v.string()),  // MM
    selfReportedImplantYear:  v.optional(v.string()),  // YYYY
    selfReportedHospital:     v.optional(v.string()),
    selfReportedSurgeon:      v.optional(v.string()),
    selfReportedImplants:     v.optional(v.string()),  // JSON — additional implants array
    countryOfBirth:           v.optional(v.string()),

    // Emergency contact (collected at registration)
    emergencyContactName:     v.optional(v.string()),
    emergencyContactPhone:    v.optional(v.string()),
    emergencyContactRelation: v.optional(v.string()),

    // Extra clinical notes (allergies, etc.)
    additionalNotes: v.optional(v.string()),

    // Physical measurements (needed for SAR calculations by clinicians)
    heightCm:            v.optional(v.number()),   // cm, e.g. 175
    weightKg:            v.optional(v.number()),   // kg, e.g. 72
    contrastAllergy:     v.optional(v.boolean()),  // true = contrast allergy present
    contrastAllergyNote: v.optional(v.string()),   // free-text detail

    // Set to true once the patient has dismissed the first-login welcome flow
    welcomeSeen: v.optional(v.boolean()),

    // 'pending' until clinic verifies the implant details, then 'active'
    verificationStatus: v.optional(
      v.union(v.literal('pending'), v.literal('active'))
    ),
  })
    .index('by_user',         ['userId'])
    .index('by_implant_code', ['implantIdCode']),

  // Patient's implant records (one patient can have multiple devices)
  patientDevices: defineTable({
    patientId: v.id('patients'),
    deviceId: v.id('devices'),
    serialNumber: v.optional(v.string()),
    implantDate: v.optional(v.string()),
    implantingSurgeon: v.optional(v.string()),
    hospital: v.optional(v.string()),
    patientNotes: v.optional(v.string()),
    clinicNotes: v.optional(v.string()),
    status: v.union(v.literal('active'), v.literal('explanted'), v.literal('replaced')),
  })
    .index('by_patient', ['patientId'])
    .index('by_device', ['deviceId']),

  // Clinic profiles
  clinics: defineTable({
    name: v.string(),
    address: v.string(),
    phone: v.optional(v.string()),
    mriBookingsPhone: v.optional(v.string()),
    email: v.optional(v.string()),
    website: v.optional(v.string()),
    capabilities: v.array(v.string()), // e.g. ["Pacemaker/ICD","DBS/Neurostim"]
    logoUrl: v.optional(v.string()),
    status: v.union(v.literal('active'), v.literal('pending'), v.literal('suspended')),
  })
    .index('by_status', ['status']),

  // Clinic staff members
  staff: defineTable({
    userId: v.id('users'),
    clinicId: v.id('clinics'),
    jobType: v.union(v.literal('radiographer'), v.literal('surgeon'), v.literal('admin')),
    accessLevel: v.union(v.literal('standard'), v.literal('senior'), v.literal('admin')),
    allPatients: v.boolean(),   // true = see all patients, false = assigned only
    status: v.union(v.literal('active'), v.literal('pending'), v.literal('suspended')),
  })
    .index('by_user', ['userId'])
    .index('by_clinic', ['clinicId']),

  // Explicit patient assignments when staff.allPatients = false
  staffPatients: defineTable({
    staffId: v.id('staff'),
    patientId: v.id('patients'),
    assignedAt: v.number(),
  })
    .index('by_staff', ['staffId'])
    .index('by_patient', ['patientId']),

  // Tier 2 access requests — clinic requests full patient record
  accessRequests: defineTable({
    clinicId: v.id('clinics'),
    staffId: v.id('staff'),
    patientId: v.id('patients'),
    status: v.union(v.literal('pending'), v.literal('approved'), v.literal('declined')),
    requestedAt: v.number(),
    resolvedAt: v.optional(v.number()),
    reason: v.optional(v.string()),
  })
    .index('by_patient', ['patientId'])
    .index('by_clinic', ['clinicId'])
    .index('by_status', ['status']),

  // Per-patient care team roles
  careTeam: defineTable({
    patientId: v.id('patients'),
    role: v.string(),           // e.g. "Implanting surgeon"
    name: v.string(),
    organisation: v.optional(v.string()),
    staffId: v.optional(v.id('staff')),  // linked if staff member on platform
  })
    .index('by_patient', ['patientId']),

  // Per-user notification feed
  notifications: defineTable({
    userId: v.id('users'),
    type: v.string(),           // e.g. "access_request", "device_recall", "expiry"
    title: v.string(),
    body: v.string(),
    read: v.boolean(),
    relatedId: v.optional(v.string()),
    createdAt: v.number(),
  })
    .index('by_user', ['userId'])
    .index('by_user_unread', ['userId', 'read']),

  // Clinic onboarding applications (pre-approval)
  clinicApplications: defineTable({
    // Contact
    contactName:  v.string(),
    contactEmail: v.string(),
    contactPhone: v.optional(v.string()),
    jobTitle:     v.optional(v.string()),

    // Facility
    facilityName:     v.string(),
    facilityType:     v.string(),  // "Hospital", "Private clinic", etc.
    facilityAddress:  v.string(),
    facilityCity:     v.optional(v.string()),
    facilityCountry:  v.string(),
    facilityWebsite:  v.optional(v.string()),
    facilityPhone:    v.optional(v.string()),

    // Regulatory
    regulatoryBody:   v.optional(v.string()),
    registrationNum:  v.optional(v.string()),

    // Services
    services:         v.array(v.string()),  // e.g. ["MRI", "Pacemaker clinics"]
    additionalInfo:   v.optional(v.string()),

    // Facility capacity (collected in onboarding form)
    mriScannerCount:    v.optional(v.number()),
    staffUsingImplantId: v.optional(v.number()),

    // Status
    status:       v.union(v.literal('pending'), v.literal('approved'), v.literal('rejected')),
    submittedAt:  v.number(),
    reviewedAt:   v.optional(v.number()),
    reviewNotes:  v.optional(v.string()),

    // Accreditation document (Convex file storage)
    storageId: v.optional(v.id('_storage')),
    fileName:  v.optional(v.string()),

    // Clerk user who submitted (if authenticated)
    clerkUserId:  v.optional(v.string()),
  })
    .index('by_status', ['status'])
    .index('by_email', ['contactEmail'])
    .index('by_clerk', ['clerkUserId']),

  // Clinic audit log
  auditLog: defineTable({
    clinicId: v.id('clinics'),
    staffId: v.id('staff'),
    action: v.string(),
    target: v.optional(v.string()),   // patient ID, device ID, etc.
    detail: v.optional(v.string()),
    createdAt: v.number(),
  })
    .index('by_clinic', ['clinicId'])
    .index('by_staff', ['staffId']),
})
