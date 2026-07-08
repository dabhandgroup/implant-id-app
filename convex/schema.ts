import { defineSchema, defineTable } from 'convex/server'
import { v } from 'convex/values'

export default defineSchema({
  // Users — one row per Clerk user, links clerkId to role + profile
  users: defineTable({
    clerkId: v.string(),
    email: v.string(),
    role: v.union(v.literal('patient'), v.literal('clinic_staff'), v.literal('surgeon'), v.literal('admin'), v.literal('manufacturer')),
    name: v.string(),
    anthropicApiKey: v.optional(v.string()),
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
    // Email to notify on pending + live (set for both manufacturer and admin submits)
    submitterEmail: v.optional(v.string()),
    submitterName:  v.optional(v.string()),
    status: v.optional(v.union(v.literal('draft'), v.literal('pending_review'), v.literal('live'), v.literal('recalled'), v.literal('trash'))),
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

    // v13 fields (Tom's schema — populated on import from the authoritative database)
    deviceName:               v.optional(v.string()),  // human-readable name distinct from model number
    modelNumber:              v.optional(v.string()),  // normalised model number (verbatim from source)
    mriClassification:        v.optional(v.string()),  // 'MR Conditional' | 'MR Safe' | 'MR Unsafe' | 'Classification Unknown'
    componentRole:            v.optional(v.string()),  // 'Generator' | 'Lead' | 'System' | etc.
    fieldStrength1t5:         v.optional(v.boolean()),
    fieldStrength3t:          v.optional(v.boolean()),
    fieldStrength7t:          v.optional(v.boolean()),
    zoneCount:                v.optional(v.number()),  // 1 = inline conditions; >1 = see deviceConditions table
    jurisdiction:             v.optional(v.string()),  // CSV of ISO-3166-alpha-2 codes, e.g. "AU; GB; US"
    predecessorBrand:         v.optional(v.string()),
    searchAliases:            v.optional(v.string()),  // comma-separated alternative search terms
    rfTemperatureRise:        v.optional(v.string()),  // verbatim test observation — NOT a scan-time limit
    maxSarWb:                 v.optional(v.string()),
    maxB1Rms:                 v.optional(v.string()),
    radiographerInstructions: v.optional(v.string()),
    representativeInstructions: v.optional(v.string()),
    patientInstructions:      v.optional(v.string()),

    // Task 1.7 — device category + category-specific clinical fields
    deviceCategory: v.optional(v.string()),  // 'Cardiac — CIED' | 'Neuromodulation' | 'Cochlear & Hearing' | 'Drug Pump' | 'Passive' | 'Functional' | 'Temp & Removable' | 'Legacy & Foreign Body' | 'Other Active'
    chamberCount: v.optional(v.string()),    // Cardiac only — 'single' | 'dual' | 'triple' | 'N/A'
    prescanProgrammingRequired: v.optional(v.string()),   // 'TRUE' | 'FALSE' | 'Not Stated'
    deviceRepresentativeRequired: v.optional(v.string()), // 'TRUE' | 'FALSE' | 'Not Stated'
    mriModeType: v.optional(v.string()),     // proprietary MRI mode name, e.g. 'SureScan', 'ProMRI'
    postImplantWaitWeeks: v.optional(v.number()),  // weeks post-implant before MRI permitted
    deflectionAngle: v.optional(v.number()),       // Passive — degrees at 1.5T
    torqueMagnitude: v.optional(v.string()),        // Passive — verbatim torque test result
    artifactType: v.optional(v.string()),           // Passive — 'Signal void' | 'Distortion' | etc.
    artifactExtentMm: v.optional(v.number()),       // Passive — artifact radius in mm
    materialFerromagnetic: v.optional(v.boolean()), // Passive — whether ferromagnetic
    orientationRestriction: v.optional(v.string()), // Passive — verbatim orientation restriction note
    powerInjectable: v.optional(v.boolean()),       // Ports/catheters — power-injectable rated
  })
    .index('by_manufacturer', ['manufacturer'])
    .index('by_mri_status', ['mriStatus'])
    .index('by_classification', ['classification'])
    .index('by_status', ['status'])
    .index('by_submitted_manufacturer', ['submittedByManufacturerId'])
    .index('by_device_code', ['deviceCode']),

  // Patient profiles
  patients: defineTable({
    userId:        v.optional(v.id('users')),
    implantIdCode: v.string(),          // e.g. IID-SMIJO2311XK

    // Personal details
    firstName: v.string(),
    lastName:  v.string(),
    dob:       v.optional(v.string()),  // YYYY-MM-DD
    email:     v.optional(v.string()),
    phone:     v.optional(v.string()),

    // Self-reported implant (unverified until clinic confirms)
    selfReportedDevice:       v.optional(v.string()),  // free-text name
    selfReportedDeviceId:     v.optional(v.string()),  // devices.ts device_id if matched
    selfReportedManufacturer: v.optional(v.string()),  // manufacturer common_name
    selfReportedModelNumber:  v.optional(v.string()),  // model_number
    selfReportedDeviceType:   v.optional(v.string()),  // e.g. "Pacemaker"
    selfReportedImplantDay:   v.optional(v.string()),  // DD
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

    // Physical measurements (needed for SAR calculations by clinicians)
    heightCm:            v.optional(v.number()),   // cm, e.g. 175
    weightKg:            v.optional(v.number()),   // kg, e.g. 72
    contrastAllergy:     v.optional(v.boolean()),  // true = contrast allergy present
    contrastAllergyNote: v.optional(v.string()),   // free-text detail
    allergies:           v.optional(v.array(v.string())), // additional allergies list

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

    // Patient-controlled sharing: true = any clinic can see full record; false = limited view + request access
    clinicSharingEnabled: v.optional(v.boolean()),

    // Profile visibility preference
    visibility: v.optional(v.union(v.literal('global'), v.literal('restricted'), v.literal('emergency'))),

    // Notification preferences
    notifRecord:  v.optional(v.boolean()),
    notifWallet:  v.optional(v.boolean()),
    notifTips:    v.optional(v.boolean()),
    notifNetwork: v.optional(v.boolean()),

    // Privacy toggles
    emergencyAccess: v.optional(v.boolean()),
    shareLocation:   v.optional(v.boolean()),
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
    clinicNotesVisibleToPatient: v.optional(v.boolean()),
    status: v.union(v.literal('active'), v.literal('explanted'), v.literal('replaced')),
    // System grouping — links an IPG to its leads (shared UUID per system)
    systemGroupId: v.optional(v.string()),
    // For lead rows: physical lead length in cm
    leadLengthCm: v.optional(v.number()),

    // Task 1.3 — integrity state, implant location, verification
    deviceIntegrityState: v.optional(v.string()),  // 'Complete' | 'Fractured-Suspected' | 'Abandoned-Fragment' | 'Explanted-Partial' | 'Not Stated'
    implantLocation: v.optional(v.string()),        // controlled vocab — actual anatomical pocket
    leadTipPosition: v.optional(v.string()),        // DBS/SCS lead tip anatomical target
    surgeonVerifiedDate: v.optional(v.string()),    // YYYY-MM-DD
    patientConfirmedDate: v.optional(v.string()),   // YYYY-MM-DD
    recordState: v.optional(v.string()),            // 'Draft' | 'Awaiting Review' | 'Verified — Surgeon' | 'Verified — Dual' | 'Disputed' | 'Discharged — Verified' | 'Discharged — Unverified'
  })
    .index('by_patient', ['patientId'])
    .index('by_device', ['deviceId']),

  // Self-reported / unverified implant entries submitted by patients
  suspectedImplants: defineTable({
    patientId: v.id('patients'),
    description: v.string(),
    suspectedLocation: v.optional(v.string()),
    suspectedDate: v.optional(v.string()),
    submittedAt: v.number(),
    reviewedAt: v.optional(v.number()),
    reviewedBy: v.optional(v.id('users')),
    status: v.union(v.literal('pending'), v.literal('confirmed'), v.literal('dismissed')),
  })
    .index('by_patient', ['patientId'])
    .index('by_status', ['status']),

  // Surgeon-uploaded clinical documents (surgical notes, implant card scans, consent)
  surgeonDocuments: defineTable({
    patientId: v.id('patients'),
    uploadedByUserId: v.id('users'),
    storageId: v.id('_storage'),
    docType: v.union(
      v.literal('surgical_notes'),
      v.literal('implant_card'),
      v.literal('consent'),
      v.literal('other'),
    ),
    fileName: v.string(),
    uploadedAt: v.number(),
    notes: v.optional(v.string()),
  })
    .index('by_patient', ['patientId'])
    .index('by_uploader', ['uploadedByUserId']),

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
    scannerIds:   v.optional(v.array(v.id('scanners'))), // linked MRI scanners
    logoUrl: v.optional(v.string()),
    status: v.union(v.literal('active'), v.literal('pending'), v.literal('suspended')),
    showToPatients: v.optional(v.boolean()),  // appears on patient Find a Clinic page
    // Billing
    foreverFree:          v.optional(v.boolean()),
    billingPlan:          v.optional(v.union(v.literal('per_user'), v.literal('clinics'), v.literal('large_team'))),
    billingStatus:        v.optional(v.union(v.literal('trialing'), v.literal('active'), v.literal('past_due'), v.literal('canceled'))),
    stripeCustomerId:     v.optional(v.string()),
    stripeSubscriptionId: v.optional(v.string()),
    trialEndsAt:          v.optional(v.number()),
    currentPeriodEnd:     v.optional(v.number()),
    gracePeriodEndsAt:    v.optional(v.number()),
  })
    .index('by_status', ['status'])
    .index('by_stripe_customer', ['stripeCustomerId']),

  // MRI scanner database
  scanners: defineTable({
    manufacturer:        v.string(),   // e.g. "Siemens Healthineers"
    model:               v.string(),   // e.g. "MAGNETOM Vida"
    fieldStrength:       v.string(),   // "1.5T" | "3T" | "7T" | "0.5T"
    scannerType:         v.string(),   // "Closed-bore" | "Open-bore" | "Standing / upright"
    boreDiameter:        v.optional(v.number()),  // cm
    maxSpatialGradient:  v.optional(v.number()),  // T/m
    notes:               v.optional(v.string()),
    country:             v.optional(v.string()),   // country of origin / approval
    sourceUrls:          v.optional(v.array(v.object({
      url:   v.string(),
      label: v.optional(v.string()),
    }))),
    status:              v.union(v.literal('approved'), v.literal('pending'), v.literal('rejected')),
    submittedByClinicId: v.optional(v.id('clinics')),
    submittedAt:         v.number(),
    reviewedAt:          v.optional(v.number()),
    reviewNotes:         v.optional(v.string()),

    // Task 1.4 — hardware specs needed by the gate walk
    maxSlewRate:             v.optional(v.number()),  // T/m/s rated max
    fieldOrientation:        v.optional(v.string()),  // 'Horizontal' | 'Vertical' | 'Not Stated'
    tableLimitKg:            v.optional(v.number()),  // max patient weight
    b1RmsMonitoringCapable:  v.optional(v.boolean()), // true = console can enforce B1+RMS limit
    softwareVersionScope:    v.optional(v.string()),  // verbatim software version range this spec applies to
  })
    .index('by_status', ['status'])
    .index('by_manufacturer', ['manufacturer']),

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

  // Clinical notes — left by clinic staff / surgeons / radiographers on a patient's record
  clinicalNotes: defineTable({
    patientId:        v.id('patients'),
    authorId:         v.id('users'),
    authorName:       v.string(),
    authorRole:       v.string(),   // 'radiographer' | 'surgeon' | 'admin' | 'clinic_staff'
    clinicId:         v.optional(v.id('clinics')),
    clinicName:       v.optional(v.string()),
    content:          v.string(),
    visibleToPatient: v.boolean(),  // default false — hidden from patient unless explicitly shown
    createdAt:        v.number(),
  })
    .index('by_patient',         ['patientId'])
    .index('by_patient_visible', ['patientId', 'visibleToPatient']),

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

    // Services / scanner info
    services:            v.optional(v.array(v.string())),  // legacy — now optional
    scannerInfo:         v.optional(v.string()),            // free-text scanner hardware (legacy)
    accreditationNumber: v.optional(v.string()),            // personal accreditation number (HCPC/AHPRA)
    pendingScannerIds:   v.optional(v.array(v.string())),   // approved scanner IDs selected during onboarding
    additionalInfo:      v.optional(v.string()),

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

  // Device lookup events — incremented by recordPatientLookup for each linked device
  deviceLookups: defineTable({
    deviceId:  v.id('devices'),
    createdAt: v.number(),
  })
    .index('by_device_and_time', ['deviceId', 'createdAt']),

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
    slug: v.optional(v.string()),
  })
    .index('by_status', ['status'])
    .index('by_email', ['contactEmail'])
    .index('by_clerk', ['clerkUserId'])
    .index('by_slug', ['slug']),

  // Source documents & submission contracts
  documents: defineTable({
    title: v.string(),
    docType: v.string(),              // 'Manufacturer IFU' | 'Manufacturer MRI Technical Manual' | etc.
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

  // Per-admin email notification preferences (all default to true if no row)
  adminNotificationSettings: defineTable({
    clerkUserId:                v.string(),
    newClinicApplication:       v.boolean(),
    newManufacturerApplication: v.boolean(),
    newDevicePendingReview:     v.boolean(),
  })
    .index('by_clerk', ['clerkUserId']),

  // AI chat sessions (master admin only — stored per clerk user)
  aiChats: defineTable({
    clerkId:   v.string(),
    title:     v.string(),
    messages:  v.array(v.object({
      role:        v.union(v.literal('user'), v.literal('assistant')),
      content:     v.string(),
      isFileImport: v.optional(v.boolean()),
    })),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index('by_clerk',         ['clerkId'])
    .index('by_clerk_updated', ['clerkId', 'updatedAt']),

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

  // Device scan conditions — one row per condition-context
  // Task 1.1 — expanded to full 40-column structure for the gate-walk resolver
  deviceConditions: defineTable({
    parentId:           v.string(),  // devices._id (string since it can also ref systemParameters)
    zoneLabel:          v.optional(v.string()),   // e.g. "Zone A", "Thorax"
    landmark:           v.optional(v.string()),   // anatomical scan-centre landmark
    fieldStrength:      v.optional(v.string()),   // e.g. "1.5T" | "3T"
    maxSarWb:           v.optional(v.string()),
    maxB1Rms:           v.optional(v.string()),
    qualifierText:      v.optional(v.string()),   // verbatim IFU qualifier
    qualifierDeviceIds: v.optional(v.array(v.string())),
    mriClassification:  v.optional(v.string()),
    notes:              v.optional(v.string()),

    // Gate 1 — eligibility
    eligibilityTier:         v.optional(v.string()),  // 'Full Body' | 'Head-Only' | 'Not Eligible' | 'N-A'
    tierPrecondition:        v.optional(v.string()),  // decomposed text criteria
    deviceIntegrityState:    v.optional(v.string()),  // join key — 'Complete' | 'Fractured-Suspected' | 'Abandoned-Fragment' | 'Explanted-Partial' | 'Not Stated'

    // General context
    contextStatus:           v.optional(v.string()),  // 'Permitted' | 'Not Permitted' | 'Not Tested' | 'Not Stated'

    // Gate 5 — bore / orientation
    boreTypeRequired:         v.optional(v.string()),  // 'Closed-cylindrical' | 'Open' | 'Not Stated'
    fieldOrientationRequired: v.optional(v.string()),  // 'Horizontal' | 'Vertical' | 'Not Stated'

    // Gate 6 — transmit coil
    transmitCoilType:        v.optional(v.string()),  // controlled vocab — transmit_coil_type

    // Gate 6b — implant location
    implantLocationCond:     v.optional(v.string()),  // location this leaf applies to

    // Gate 7 — operating mode
    operatingMode:           v.optional(v.string()),  // 'Normal' | 'Normal; First Level' | 'First Level'
    rfExcitationMode:        v.optional(v.string()),  // 'CP only' | 'Not Stated'

    // Gate 3 — spatial gradient
    maxSpatialGradientCond:  v.optional(v.number()),  // T/m

    // Gate 4 — slew rate
    maxSlewRateCond:         v.optional(v.number()),  // T/m/s
    maxDbDt:                 v.optional(v.number()),  // T/s

    // Gate 9 — RF limits (numeric counterparts to string fields above)
    maxSarWhole:             v.optional(v.number()),  // W/kg whole-body
    maxSarHead:              v.optional(v.number()),  // W/kg head
    maxB1RmsVal:             v.optional(v.number()),  // µT (numeric)

    // Gate 8 — exclusion zone / isocentre
    exclusionZoneApplies:        v.optional(v.boolean()),
    exclusionZoneDescription:    v.optional(v.string()),
    isocentreRestriction:        v.optional(v.string()),

    // Gate 10 — time / thermal
    maxScanTimeMins:         v.optional(v.number()),
    scanTimeWindowMins:      v.optional(v.number()),
    cooloffPeriodMins:       v.optional(v.number()),

    // Patient preconditions
    patientPreconditions:    v.optional(v.string()),  // semicolon-separated prerequisite checks

    // Regional scope
    regionScope:             v.optional(v.string()),  // 'All' or ISO alpha-2 codes
    regionPermitted:         v.optional(v.string()),  // verbatim permitted body regions
    regionExcluded:          v.optional(v.string()),  // verbatim excluded body regions

    // Weight / patient-specific
    patientWeightBand:       v.optional(v.string()),  // weight-based condition restriction

    // Serial / recall scope
    serialNumberRange:       v.optional(v.string()),
    serialNote:              v.optional(v.string()),

    // Visual / diagram
    requiresVisualReview:    v.optional(v.boolean()),
    visualExtractionNotes:   v.optional(v.string()),

    // Provenance / admin
    verificationStatus:      v.optional(v.string()),  // 'Extracted' | 'Under Review' | 'Verified — Tom' | 'Verified — Dual' | 'Superseded' | 'Recalled' | 'Withdrawn'
    sourceType:              v.optional(v.string()),  // 'Manufacturer MRI Technical Manual' | 'Manufacturer IFU' | etc.
    docId:                   v.optional(v.string()),  // FK → documents table
    conditionNotes:          v.optional(v.string()),  // internal admin notes
    zoneIndex:               v.optional(v.number()),  // ordering (1..n)
  })
    .index('by_parent', ['parentId'])
    .index('by_parent_and_field_strength', ['parentId', 'fieldStrength'])
    .index('by_parent_and_transmit_coil_type', ['parentId', 'transmitCoilType'])
    .index('by_parent_and_device_integrity_state', ['parentId', 'deviceIntegrityState']),

  // OEM-stated system parameter records (generator + specific leads the manufacturer tested)
  systemParameters: defineTable({
    systemId:             v.string(),             // unique identifier for this system combination
    componentDeviceIds:   v.array(v.string()),    // the exact devices._id values in this system
    isMixedManufacturer:  v.optional(v.boolean()),
    mriClassification:    v.optional(v.string()),
    zoneCount:            v.optional(v.number()),
    fieldStrength:        v.optional(v.string()),
    maxSarWb:             v.optional(v.string()),
    maxB1Rms:             v.optional(v.string()),
    notes:                v.optional(v.string()),
  })
    .index('by_system_id', ['systemId']),

  // Task 1.2 — site coils (clinic-registered transmit/receive coils for the matrix resolver)
  // Implements Tom's Site_Coils table — Gate 6 of the gate walk
  siteCoils: defineTable({
    siteId:               v.id('clinics'),
    coilDisplayName:      v.string(),                    // vendor label, e.g. "Body 18 surface coil"
    coilType:             v.string(),                    // controlled: transmit_coil_type vocab
    fieldStrength:        v.string(),                    // '1.5T' | '3T' | '7T' | '0.55T'
    compatibleScannerIds: v.array(v.id('scanners')),     // scanners this coil works with at this site
    txCapable:            v.boolean(),                   // transmit-capable — resolver uses this
    rxCapable:            v.boolean(),                   // receive-capable
    channelCount:         v.optional(v.number()),
    manufacturer:         v.optional(v.string()),
    modelNumber:          v.optional(v.string()),
    status:               v.union(v.literal('active'), v.literal('retired')),
    recordState:          v.union(v.literal('Unconfirmed'), v.literal('Confirmed')),
    entryDate:            v.optional(v.string()),        // YYYY-MM-DD
    notes:                v.optional(v.string()),
  })
    .index('by_site_id', ['siteId'])
    .index('by_site_id_and_status', ['siteId', 'status']),

  // Task 1.5 — risk-benefit records (pre-scan decision gate, P-2 ruling)
  // Signed by clinician (+ optional radiologist) BEFORE the scan event is created
  riskBenefitRecords: defineTable({
    patientId:            v.id('patients'),
    clinicId:             v.id('clinics'),
    staffId:              v.id('staff'),

    // Clinical decision
    indication:           v.string(),
    decision:             v.union(v.literal('Proceed'), v.literal('Do Not Proceed'), v.literal('Deferred')),
    reasonForProceeding:  v.optional(v.string()),

    // Hardware planned
    scannerId:            v.optional(v.id('scanners')),
    coilId:               v.optional(v.id('siteCoils')),
    bodyRegion:           v.optional(v.string()),

    // Matrix output snapshot — captured at decision time, never re-resolved (P-3)
    resolvedOutcomeCache:    v.optional(v.string()),     // 'PASS' | 'FAIL' | 'UNRESOLVED'
    resolvedConditionIds:    v.optional(v.array(v.string())),
    resolvedConstraintsJson: v.optional(v.string()),     // JSON constraint set
    resolutionTimestamp:     v.optional(v.number()),

    // Sign-off
    clinicianName:        v.string(),
    clinicianRole:        v.string(),
    clinicianSignedAt:    v.number(),
    radiologistName:      v.optional(v.string()),
    radiologistSignedAt:  v.optional(v.number()),

    // Signed form document
    signedFormStorageId:  v.optional(v.id('_storage')),

    linkedScanEventId:    v.optional(v.id('scanEvents')),
    createdAt:            v.number(),
  })
    .index('by_patient', ['patientId'])
    .index('by_clinic', ['clinicId'])
    .index('by_decision', ['decision']),

  // Task 1.6 — scan events (post-scan execution record + audit snapshot, P-3 ruling)
  // The resolution snapshot is frozen at scan time and never re-read for future resolutions
  scanEvents: defineTable({
    patientId:              v.id('patients'),
    clinicId:               v.id('clinics'),
    staffId:                v.id('staff'),
    scannerId:              v.id('scanners'),
    coilId:                 v.optional(v.id('siteCoils')),
    bodyRegion:             v.string(),
    rvbRecordId:            v.optional(v.id('riskBenefitRecords')),

    // Actual parameters used at console
    fieldStrengthUsed:      v.string(),
    operatingModeUsed:      v.optional(v.string()),
    sarWbActual:            v.optional(v.number()),     // W/kg actually applied
    sarHeadActual:          v.optional(v.number()),
    b1RmsActual:            v.optional(v.number()),     // µT
    slewRateActual:         v.optional(v.number()),     // T/m/s
    scanTimeMins:           v.optional(v.number()),

    // Outcome
    outcome:                v.union(
      v.literal('Completed'),
      v.literal('Early Termination'),
      v.literal('Aborted'),
      v.literal('Not Performed'),
    ),
    earlyTerminationReason: v.optional(v.string()),
    adverseEvents:          v.optional(v.string()),
    postScanDeviceCheck:    v.optional(v.string()),
    patientPostScanNotes:   v.optional(v.string()),

    // AUDIT SNAPSHOT — P-3 ruling. Frozen at scan time. Never re-read for future resolutions.
    resolvedOutcomeCache:    v.string(),                // 'PASS' | 'FAIL' | 'UNRESOLVED'
    resolvedConditionIds:    v.array(v.string()),       // exact condition IDs used
    resolvedConstraintsJson: v.string(),                // full constraint set as JSON

    createdAt:              v.number(),
  })
    .index('by_patient', ['patientId'])
    .index('by_clinic', ['clinicId'])
    .index('by_scanner', ['scannerId']),

  // One-time delete-confirmation codes for master admin patient deletion
  adminDeleteCodes: defineTable({
    patientId: v.id('patients'),
    code:      v.string(),
    expiresAt: v.number(),
    used:      v.boolean(),
  }).index('by_patient', ['patientId']),

  // One-time delete-confirmation codes for master admin clinic deletion
  adminClinicDeleteCodes: defineTable({
    applicationId: v.id('clinicApplications'),
    code:          v.string(),
    expiresAt:     v.number(),
    used:          v.boolean(),
  }).index('by_application', ['applicationId']),

  // Global system email toggles — singleton, one row (no per-admin, platform-wide)
  systemEmailSettings: defineTable({
    // Manufacturer
    manufacturerApproval:          v.boolean(),
    manufacturerInvite:            v.boolean(),
    manufacturerRejection:         v.boolean(),
    // Device (sent to manufacturers)
    devicePending:                 v.boolean(),
    deviceLive:                    v.boolean(),
    deviceRejection:               v.boolean(),
    // Clinic
    clinicApplicationConfirmation: v.boolean(),
    clinicApproval:                v.boolean(),
    clinicRejection:               v.boolean(),
    staffInvite:                   v.boolean(),
    clinicPatientInvite:           v.boolean(),
    // Patient
    patientWelcome:                v.boolean(),
    patientVerified:               v.boolean(),
    patientShare:                  v.boolean(),
    // Surgeon
    surgeonInvite:                 v.boolean(),
  }),
})
