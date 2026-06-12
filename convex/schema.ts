import { defineSchema, defineTable } from 'convex/server'
import { v } from 'convex/values'

export default defineSchema({
  // Users — one row per Clerk user, links clerkId to role + profile
  users: defineTable({
    clerkId: v.string(),
    email: v.string(),
    role: v.union(v.literal('patient'), v.literal('clinic_staff'), v.literal('surgeon'), v.literal('admin'), v.literal('manufacturer')),
    name: v.string(),
  })
    .index('by_clerk', ['clerkId'])
    .index('by_email', ['email']),

  // Implant device catalogue (managed by platform admin & manufacturers)
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
    recalled:    v.optional(v.boolean()),
    recallNotes: v.optional(v.string()),
    verified: v.boolean(),
    verifiedAt: v.optional(v.number()),
    submittedByManufacturer: v.optional(v.string()),
    // Manufacturer portal additions
    submittedByManufacturerId: v.optional(v.id('manufacturers')),
    status: v.optional(v.union(v.literal('draft'), v.literal('pending_review'), v.literal('live'), v.literal('recalled'))),
    publishedAt: v.optional(v.number()),   // null = not yet published; set by scheduler after 24h
    lotNumber: v.optional(v.string()),     // required for recall matching
    regionalRep: v.optional(v.array(v.object({
      country: v.string(),
      name: v.string(),
      email: v.string(),
    }))),
    oem_ownedNotes: v.optional(v.string()),  // OEM-branded patient-facing notes
    sourceUrl:  v.optional(v.string()),      // Primary source URL or PDF link
    pdfLinks:   v.optional(v.array(v.string())), // All PDF links found during scrape
    sourcesRaw: v.optional(v.string()),      // JSON-stringified _sources_consulted array
    // Human-readable device code (auto-generated on creation) e.g. DID-MDTAZU-J7K2
    deviceCode: v.optional(v.string()),
    // Manually curated source URLs (IFUs, manufacturer pages, clinical references)
    sourceUrls: v.optional(v.array(v.object({
      url:   v.string(),
      label: v.optional(v.string()),  // e.g. "IFU PDF", "Manufacturer page"
    }))),
    // Uploaded source documents (IFU PDFs stored in Convex file storage)
    sourceDocs: v.optional(v.array(v.object({
      storageId: v.id('_storage'),
      label:     v.optional(v.string()),
    }))),
  })
    .index('by_manufacturer', ['manufacturer'])
    .index('by_mri_status', ['mriStatus'])
    .index('by_classification', ['classification'])
    .index('by_status', ['status'])
    .index('by_submitted_manufacturer', ['submittedByManufacturerId'])
    .index('by_device_code', ['deviceCode'])
    .searchIndex('search_manufacturer', { searchField: 'manufacturer' })
    .searchIndex('search_model',        { searchField: 'model' }),

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
    selfReportedSurgeonUserId: v.optional(v.id('users')),
    selfReportedSurgeonEmail:  v.optional(v.string()),
    selfReportedImplants:     v.optional(v.string()),  // JSON — additional implants array
    countryOfBirth:           v.optional(v.string()),

    // Emergency contact (collected at registration)
    emergencyContactName:     v.optional(v.string()),
    emergencyContactPhone:    v.optional(v.string()),
    emergencyContactRelation: v.optional(v.string()),

    // Extra clinical notes (allergies, etc.)
    additionalNotes: v.optional(v.string()),

    // Patient-editable emergency info
    medications:    v.optional(v.string()),  // current medications (free-text)
    otherAllergies: v.optional(v.string()),  // non-implant allergies
    homeAddress:    v.optional(v.string()),  // home address

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

    // Admin-only override for testing MRI card colours without real devices
    mriStatusOverride: v.optional(
      v.union(v.literal('safe'), v.literal('conditional'), v.literal('unsafe'), v.literal('unknown'), v.null())
    ),
  })
    .index('by_user',         ['userId'])
    .index('by_implant_code', ['implantIdCode'])
    .searchIndex('search_first_name', { searchField: 'firstName' })
    .searchIndex('search_last_name',  { searchField: 'lastName' }),

  // Patient activity timeline
  patientEvents: defineTable({
    patientId:   v.id('patients'),
    type:        v.union(
      v.literal('registered'),
      v.literal('verified'),
      v.literal('shared'),
      v.literal('scanned'),
      v.literal('wallet_added'),
      v.literal('device_linked'),
    ),
    title:       v.string(),
    description: v.optional(v.string()),
    createdAt:   v.number(),
  })
    .index('by_patient',          ['patientId'])
    .index('by_patient_and_time', ['patientId', 'createdAt']),

  // Clinical documents attached to a patient record by clinic/surgeon staff
  patientDocuments: defineTable({
    patientId:    v.id('patients'),
    clinicId:     v.optional(v.id('clinics')),
    uploadedBy:   v.id('users'),              // staff member who uploaded
    fileName:     v.string(),                 // display name
    fileStorageId: v.id('_storage'),          // Convex storage reference
    docType:      v.string(),                 // e.g. 'scan_report' | 'pre_assessment' | 'discharge_summary' | 'ifu' | 'other'
    notes:        v.optional(v.string()),
    uploadedAt:   v.number(),
  })
    .index('by_patient', ['patientId'])
    .index('by_clinic',  ['clinicId']),

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
    city:    v.optional(v.string()),    // city for Find a Clinic search/display
    country: v.optional(v.string()),
    phone: v.optional(v.string()),
    mriBookingsPhone: v.optional(v.string()),
    email: v.optional(v.string()),
    website: v.optional(v.string()),
    capabilities: v.array(v.string()), // e.g. ["Pacemaker/ICD","DBS/Neurostim"]
    logoUrl: v.optional(v.string()),
    status: v.union(v.literal('active'), v.literal('pending'), v.literal('suspended')),
    showToPatients: v.optional(v.boolean()),  // appears on patient Find a Clinic page
  })
    .index('by_status', ['status'])
    .searchIndex('search_name', { searchField: 'name' }),

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

  // Manufacturer applications (pre-approval)
  manufacturers: defineTable({
    // Basic identity
    companyName: v.string(),
    contactName: v.string(),
    contactEmail: v.string(),
    country: v.string(),
    regNumber: v.optional(v.string()),
    website: v.optional(v.string()),
    logoUrl: v.optional(v.string()),
    // Extended onboarding fields
    legalEntityName:          v.optional(v.string()),
    contactJobTitle:          v.optional(v.string()),
    contactPhone:             v.optional(v.string()),
    iso13485CertNumber:       v.optional(v.string()),
    iso13485IssuingBody:      v.optional(v.string()),
    iso13485ExpiryDate:       v.optional(v.string()),
    regulatoryRegistrations:  v.optional(v.string()),  // free-text list
    deviceCategories:         v.optional(v.array(v.string())),
    geographicMarkets:        v.optional(v.array(v.string())),
    // Supporting documents (Convex storage IDs)
    docCompanyRegistration:   v.optional(v.string()),  // Certificate of Incorporation
    docIso13485:              v.optional(v.string()),  // ISO 13485 cert
    docRegulatoryCert:        v.optional(v.string()),  // FDA/MHRA/CE etc.
    docLetterhead:            v.optional(v.string()),  // Company letterhead statement
    docMriSampleData:         v.optional(v.string()),  // Optional: sample MRI safety sheet
    // Admin
    status: v.union(v.literal('pending'), v.literal('approved'), v.literal('rejected')),
    submittedAt: v.number(),
    reviewedAt: v.optional(v.number()),
    reviewNotes: v.optional(v.string()),
    clerkUserId: v.optional(v.string()),
  })
    .index('by_status', ['status'])
    .index('by_email', ['contactEmail'])
    .index('by_clerk', ['clerkUserId']),

  // Source documents & submission contracts
  // Source docs = IFUs, manuals, spec sheets from manufacturer sites (seeded from devices.ts)
  // Submission contracts = auto-generated when a manufacturer submits a device via the portal
  documents: defineTable({
    title: v.string(),
    docType: v.string(),              // 'Manufacturer IFU' | 'Manufacturer MRI Technical Manual' | 'Manufacturer spec sheet' | 'Manufacturer product page' | 'Peer-reviewed publication' | 'Submission Contract'
    manufacturer: v.string(),
    deviceNames: v.array(v.string()), // device names linked to this document
    documentVersion: v.optional(v.string()),
    documentDate: v.optional(v.string()),     // YYYY-MM-DD
    dateRetrieved: v.optional(v.string()),    // YYYY-MM-DD
    sourceUrl: v.optional(v.string()),        // real external URL
    fileStorageId: v.optional(v.id('_storage')), // if PDF has been uploaded
    status: v.union(v.literal('live'), v.literal('superseded')),
    // Submission contract fields (set when manufacturer submits a device)
    submittedByManufacturerId: v.optional(v.id('manufacturers')),
    signerName: v.optional(v.string()),
    signerTitle: v.optional(v.string()),
    signerCompany: v.optional(v.string()),
    signedAt: v.optional(v.number()),
    notes: v.optional(v.string()),
    verifiedBy: v.optional(v.string()),
    createdAt: v.number(),
  })
    .index('by_manufacturer', ['manufacturer'])
    .index('by_status', ['status'])
    .index('by_type', ['docType']),

  // Scrape jobs — persisted so results survive navigation and show as history
  scrapeJobs: defineTable({
    manufacturer:  v.string(),
    model:         v.string(),
    deviceType:    v.string(),
    ifuUrl:        v.optional(v.string()),
    status:        v.union(v.literal('pending'), v.literal('complete'), v.literal('error')),
    result:        v.optional(v.any()),
    errorMessage:  v.optional(v.string()),
    createdAt:     v.number(),
    completedAt:   v.optional(v.number()),
  })
    .index('by_created', ['createdAt']),

  // Device change requests (manufacturers flag recalls, edits, unsafe flags)
  deviceChangeRequests: defineTable({
    deviceId: v.id('devices'),
    manufacturerId: v.id('manufacturers'),
    requestType: v.union(v.literal('recall'), v.literal('unsafe'), v.literal('edit'), v.literal('other')),
    description: v.string(),
    proposedChanges: v.optional(v.object({
      mriStatus: v.optional(v.string()),
      fieldStrengths: v.optional(v.string()),
      sarLimit: v.optional(v.string()),
      b1RmsLimit: v.optional(v.string()),
      slewRateLimit: v.optional(v.string()),
      gradientLimit: v.optional(v.string()),
      maxScanTime: v.optional(v.string()),
      contraindications: v.optional(v.string()),
    })),
    lotNumbers: v.optional(v.array(v.string())),
    affectedRegions: v.optional(v.array(v.string())),
    status: v.union(v.literal('pending'), v.literal('approved'), v.literal('rejected')),
    adminNotes: v.optional(v.string()),
    submittedAt: v.number(),
    resolvedAt: v.optional(v.number()),
    publishedAt: v.optional(v.number()),
  })
    .index('by_device', ['deviceId'])
    .index('by_manufacturer', ['manufacturerId'])
    .index('by_status', ['status']),
})
