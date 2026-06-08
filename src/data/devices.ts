// Implant ID — typed device database
// Extracted from public/implants.js v5

// ── TYPES ──────────────────────────────────────────────────────────────────

export interface Manufacturer {
  manufacturer_id: string
  manufacturer_name: string
  common_name: string
  country_of_origin: string
  tga_registered: boolean
  fda_registered: boolean
  mhra_registered: boolean
  website: string
  mri_safety_portal_url: string
  contact_email: string
  manufacturer_verified: boolean
  notes: string
}

export interface Document {
  doc_id: string
  manufacturer_id: string
  device_ids: string[]
  document_title: string
  document_version: string
  source_type: string
  document_date: string
  document_url: string
  date_retrieved: string
  is_superseded: boolean
  superseded_by_doc_id: string
  notes: string
  verified_by: string
}

export interface Device {
  device_id: string
  device_name: string
  manufacturer_id: string
  model_number: string
  device_type: string
  component_role?: string
  lead_group_id?: string
  lead_status?: string
  implant_region: string
  mri_classification: 'MR Conditional' | 'MR Safe' | 'MR Unsafe'
  field_strength_1t5: boolean
  field_strength_3t: boolean
  field_strength_7t: boolean
  field_strength_notes: string
  regionA_max_sar_wb: number | null
  regionA_max_sar_head: number | null
  regionA_max_b1_rms: number | null
  regionB_max_sar_wb: number | null
  regionB_max_sar_head: number | null
  regionB_max_b1_rms: number | null
  rf_transmit_mode: string
  rf_receive_coil: string
  mri_mode_label?: string
  mri_platform_label?: string
  scanner_configuration: string
  max_slew_rate: number | null
  max_db_dt: number | null
  max_spatial_gradient: number | null
  isocentre_restriction: string
  scan_region_permitted: string
  orientation_restriction: string
  bore_contact_restriction: string
  scan_region_notes: string
  max_scan_time_mins: number | null
  cooloff_period_mins: number | null
  post_implant_wait_weeks?: number
  prescan_programming_required?: boolean
  magnet_removal_required?: boolean
  rep_required?: boolean
  prescan_checklist?: string
  postscan_checklist?: string
  patient_instructions?: string
  // Passive-specific
  deflection_angle?: string
  deflection_notes?: string
  torque_magnitude?: string
  artifact_type?: string
  artifact_extent_mm?: number | null
  artifact_notes?: string
  heating_temp_rise?: string
  material_ferromagnetic?: boolean | string
  // Linking
  doc_id: string
  source_type: string
  last_verified_date: string
  verified_by: string
  manufacturer_verified: boolean
  entry_notes: string
  // Category tag
  _category: 'active' | 'passive' | 'legacy'
}

// ── MANUFACTURERS ──────────────────────────────────────────────────────────

export const MANUFACTURERS: Manufacturer[] = [
  { manufacturer_id: 'MFR-000001', manufacturer_name: 'Medtronic plc', common_name: 'Medtronic', country_of_origin: 'Ireland / USA', tga_registered: true, fda_registered: true, mhra_registered: true, website: 'https://www.medtronic.com', mri_safety_portal_url: 'https://manuals.medtronic.com', contact_email: 'mri@medtronic.com', manufacturer_verified: false, notes: "World's largest cardiac device manufacturer. SureScan MRI platform." },
  { manufacturer_id: 'MFR-000002', manufacturer_name: 'Abbott Laboratories (Cardiovascular)', common_name: 'Abbott', country_of_origin: 'USA', tga_registered: true, fda_registered: true, mhra_registered: true, website: 'https://www.cardiovascular.abbott', mri_safety_portal_url: 'https://www.cardiovascular.abbott/us/en/hcp/mri-safety.html', contact_email: '', manufacturer_verified: false, notes: 'Formerly St. Jude Medical (acquired 2017). MRI-Ready pacemaker platform.' },
  { manufacturer_id: 'MFR-000003', manufacturer_name: 'Abbott Neuromodulation', common_name: 'Abbott Neuromodulation', country_of_origin: 'USA', tga_registered: true, fda_registered: true, mhra_registered: true, website: 'https://www.neuromodulation.abbott', mri_safety_portal_url: 'https://www.neuromodulation.abbott', contact_email: '', manufacturer_verified: false, notes: 'Separate Abbott division for DBS and SCS devices. Infinity DBS system.' },
  { manufacturer_id: 'MFR-000004', manufacturer_name: 'Cochlear Limited', common_name: 'Cochlear', country_of_origin: 'Australia', tga_registered: true, fda_registered: true, mhra_registered: true, website: 'https://www.cochlear.com', mri_safety_portal_url: 'https://www.cochlear.com/au/en/home/cochlear-implants/mri.html', contact_email: '', manufacturer_verified: false, notes: 'ASX-listed Australian company. HQ North Ryde NSW. Nucleus and Osia product lines.' },
  { manufacturer_id: 'MFR-000005', manufacturer_name: 'Cook Medical', common_name: 'Cook Medical', country_of_origin: 'USA', tga_registered: true, fda_registered: true, mhra_registered: true, website: 'https://www.cookmedical.com', mri_safety_portal_url: 'https://www.cookmedical.com', contact_email: '', manufacturer_verified: false, notes: '' },
  { manufacturer_id: 'MFR-000006', manufacturer_name: 'Boston Scientific Corporation', common_name: 'Boston Scientific', country_of_origin: 'USA', tga_registered: true, fda_registered: true, mhra_registered: true, website: 'https://www.bostonscientific.com', mri_safety_portal_url: 'https://www.bostonscientific.com', contact_email: '', manufacturer_verified: false, notes: '' },
  { manufacturer_id: 'MFR-000007', manufacturer_name: 'Edwards Lifesciences Corporation (discontinued line)', common_name: 'Edwards Lifesciences', country_of_origin: 'USA', tga_registered: false, fda_registered: false, mhra_registered: false, website: 'https://www.edwards.com', mri_safety_portal_url: '', contact_email: '', manufacturer_verified: false, notes: 'Starr-Edwards ball-and-cage valve line discontinued. Pre-6000 series is MR Unsafe.' },
]

// ── DOCUMENTS ──────────────────────────────────────────────────────────────

export const DOCUMENTS: Document[] = [
  { doc_id: 'DOC-000001', manufacturer_id: 'MFR-000001', device_ids: ['IID-PPM-000001','IID-LEAD-000001'], document_title: 'Medtronic Azure XT MRI SureScan Technical Manual', document_version: 'M977378A001', source_type: 'Manufacturer MRI Technical Manual', document_date: '2024-01-01', document_url: 'https://manuals.medtronic.com', date_retrieved: '2025-10-01', is_superseded: false, superseded_by_doc_id: '', notes: 'Covers Azure XT DR/VR/SR generators and all SureScan-compatible leads.', verified_by: 'Implant ID editorial team' },
  { doc_id: 'DOC-000002', manufacturer_id: 'MFR-000001', device_ids: ['IID-LEAD-000001'], document_title: 'Medtronic CapSureFix MRI SureScan 5086MRI IFU', document_version: 'Rev C', source_type: 'Manufacturer IFU', document_date: '2023-06-01', document_url: 'https://manuals.medtronic.com', date_retrieved: '2025-10-01', is_superseded: false, superseded_by_doc_id: '', notes: 'Lead-specific IFU. MRI conditions governed by complete SureScan system manual (DOC-000001).', verified_by: 'Implant ID editorial team' },
  { doc_id: 'DOC-000003', manufacturer_id: 'MFR-000002', device_ids: ['IID-PPM-000002'], document_title: 'Abbott MRI-Ready Pacing Systems Manual', document_version: 'Rev 1.2', source_type: 'Manufacturer MRI Technical Manual', document_date: '2024-03-01', document_url: 'https://www.cardiovascular.abbott/us/en/hcp/mri-safety.html', date_retrieved: '2025-10-01', is_superseded: false, superseded_by_doc_id: '', notes: 'Covers Assurity MRI and Endurity MRI generators. Compatible leads: UltiPace and Tendril STS.', verified_by: 'Implant ID editorial team' },
  { doc_id: 'DOC-000004', manufacturer_id: 'MFR-000004', device_ids: ['IID-CI-000001'], document_title: 'Cochlear Nucleus Profile CI500 Series MRI Guidelines', document_version: 'D2044134_1', source_type: 'Manufacturer IFU', document_date: '2023-01-01', document_url: 'https://www.cochlear.com/us/en/professionals/resources-and-training/mri-guidelines', date_retrieved: '2026-06-08', is_superseded: false, superseded_by_doc_id: '', notes: 'CI500 series (CI512, CI522, CI532, CI532P). CORRECTED 2026-06-08: was incorrectly titled as Profile Plus. At 1.5T: MRI Kit required, magnet in situ. At 3T: magnet surgically removed.', verified_by: 'Implant ID editorial team — verified via cochlear.com and mriquestions.com 2026-06-08' },
  { doc_id: 'DOC-000005', manufacturer_id: 'MFR-000003', device_ids: ['IID-DBS-000001'], document_title: 'Abbott Infinity DBS MRI Procedure Manual', document_version: 'Rev B', source_type: 'Manufacturer MRI Technical Manual', document_date: '2023-11-01', document_url: 'https://www.neuromodulation.abbott', date_retrieved: '2025-10-01', is_superseded: false, superseded_by_doc_id: '', notes: '', verified_by: 'Implant ID editorial team' },
  { doc_id: 'DOC-000006', manufacturer_id: 'MFR-000001', device_ids: ['IID-SCS-000001'], document_title: 'Medtronic RestoreAdvanced 37712 MRI Guidelines', document_version: 'Rev A', source_type: 'Manufacturer MRI Technical Manual', document_date: '2023-09-01', document_url: 'https://manuals.medtronic.com', date_retrieved: '2025-10-01', is_superseded: false, superseded_by_doc_id: '', notes: '', verified_by: 'Implant ID editorial team' },
  { doc_id: 'DOC-000007', manufacturer_id: 'MFR-000005', device_ids: ['IID-PASS-000001'], document_title: 'Cook Medical Zilver PTX MRI Information', document_version: 'Rev 2', source_type: 'Manufacturer IFU', document_date: '2023-04-01', document_url: 'https://www.cookmedical.com', date_retrieved: '2025-10-01', is_superseded: false, superseded_by_doc_id: '', notes: '', verified_by: 'Implant ID editorial team' },
  { doc_id: 'DOC-000008', manufacturer_id: 'MFR-000006', device_ids: ['IID-PASS-000002'], document_title: 'Boston Scientific Wallstent Biliary Endoprosthesis MRI Information', document_version: 'Rev 3', source_type: 'Manufacturer IFU', document_date: '2023-07-01', document_url: 'https://www.bostonscientific.com', date_retrieved: '2025-10-01', is_superseded: false, superseded_by_doc_id: '', notes: '', verified_by: 'Implant ID editorial team' },
  { doc_id: 'DOC-000009', manufacturer_id: 'MFR-000007', device_ids: ['IID-LEG-000001'], document_title: 'Shellock F. Reference Manual for Magnetic Resonance Safety', document_version: '2021 edition', source_type: 'Peer-reviewed publication', document_date: '2021-01-01', document_url: 'https://www.mrisafety.com', date_retrieved: '2025-10-01', is_superseded: false, superseded_by_doc_id: '', notes: '', verified_by: 'Implant ID editorial team' },
  { doc_id: 'DOC-000010', manufacturer_id: 'MFR-000004', device_ids: ['IID-CI-000002'], document_title: 'Cochlear Nucleus Profile Plus CI600 Series MRI Guidelines', document_version: 'D2044134_2', source_type: 'Manufacturer IFU', document_date: '2025-07-21', document_url: 'https://www.cochlear.com/us/en/professionals/resources-and-training/mri-guidelines', date_retrieved: '2026-06-08', is_superseded: false, superseded_by_doc_id: '', notes: 'CI600 series (CI612, CI622, CI624, CI632, CI632P). No head bandage required at any field strength. Magnet stays in place at 1.5T and 3T. WB SAR ≤2.0 W/kg at 3T. Source verified via mriquestions.com Cochlear 2025 guidelines PDF (D2044134_2).', verified_by: 'Implant ID editorial team — verified via cochlear.com and mriquestions.com PDF 2026-06-08' },
  { doc_id: 'DOC-000011', manufacturer_id: 'MFR-000006', device_ids: ['IID-ICD-000001'], document_title: 'Boston Scientific EMBLEM MRI S-ICD ImageReady MR-Conditional Technical Guide', document_version: 'CRM-368602-AC', source_type: 'Manufacturer MRI Technical Manual', document_date: '2016-08-01', document_url: 'https://www.bostonscientific.com/imageready/en-US/emblem-mri-patient.html', date_retrieved: '2026-06-08', is_superseded: false, superseded_by_doc_id: '', notes: 'Covers A219 (Emblem MRI S-ICD) with compatible electrodes 3010, 3400, 3401, 3501. 1.5T only. Full body, no anatomical exclusion zones. MRI Protection Mode required (disables ALL tachycardia therapy). May cause permanent beeper volume loss. Source: spec sheet CRM-368602-AC and bostonscientific.com ImageReady portal.', verified_by: 'Implant ID editorial team — verified via bostonscientific.com and spec sheet CRM-368602-AC 2026-06-08' },
  { doc_id: 'DOC-000012', manufacturer_id: 'MFR-000001', device_ids: ['IID-PPM-000005'], document_title: 'Medtronic Azure S MRI SureScan Technical Manual', document_version: 'See manuals.medtronic.com for current version', source_type: 'Manufacturer MRI Technical Manual', document_date: '2022-01-01', document_url: 'https://manuals.medtronic.com', date_retrieved: '2026-06-08', is_superseded: false, superseded_by_doc_id: '', notes: 'Covers Azure S DR (W3DR01) and Azure S SR (W3SR01). SureScan platform — MRI conditions identical to Azure XT. Model numbers confirmed via medtronic.com product ordering table 2026-06-08.', verified_by: 'Implant ID editorial team — model numbers confirmed via medtronic.com 2026-06-08' },
]

// ── ACTIVE IMPLANTS ────────────────────────────────────────────────────────

const ACTIVE_IMPLANTS: Device[] = [
  {
    device_id: 'IID-PPM-000001',
    device_name: 'Azure XT MRI SureScan',
    manufacturer_id: 'MFR-000001',
    model_number: 'W1DR01; W1SR01',
    device_type: 'Pacemaker',
    component_role: 'Generator / IPG',
    lead_group_id: 'LG-MED-SURESCAN-001',
    lead_status: '',
    implant_region: 'Left or right pectoral region',
    mri_classification: 'MR Conditional',
    field_strength_1t5: true,
    field_strength_3t: true,
    field_strength_7t: false,
    field_strength_notes: '1.5T and 3T permitted. Full-body scanning allowed when complete SureScan system.',
    regionA_max_sar_wb: 2,
    regionA_max_sar_head: 3.2,
    regionA_max_b1_rms: 2,
    regionB_max_sar_wb: 2,
    regionB_max_sar_head: 3.2,
    regionB_max_b1_rms: 2,
    rf_transmit_mode: 'Body coil only — local transmit coils prohibited',
    rf_receive_coil: 'Any receive coil',
    mri_mode_label: 'SureScan ON',
    mri_platform_label: 'SureScan',
    scanner_configuration: 'Cylindrical bore, horizontal field',
    max_slew_rate: 200,
    max_db_dt: null,
    max_spatial_gradient: null,
    isocentre_restriction: 'No restriction — full body scanning permitted when complete SureScan system',
    scan_region_permitted: 'No restriction',
    orientation_restriction: 'No orientation restriction',
    bore_contact_restriction: '',
    scan_region_notes: 'Complete SureScan system required (generator + SureScan leads). Any abandoned or non-SureScan leads contraindicate the system.',
    max_scan_time_mins: null,
    cooloff_period_mins: null,
    post_implant_wait_weeks: 6,
    prescan_programming_required: true,
    magnet_removal_required: false,
    rep_required: false,
    prescan_checklist: '1. Confirm complete SureScan system (generator + approved leads).\n2. Confirm implant >6 weeks post-surgery.\n3. Confirm all leads electrically intact — impedance 200–1500 ohms (pacing).\n4. Confirm pacing threshold ≤2.0V at 0.4ms (pacemaker-dependent patients).\n5. Programme SureScan mode to ON using Medtronic programmer.\n6. Confirm scanner in Normal Operating Mode.\n7. Set WB SAR ≤2.0 W/kg and Head SAR ≤3.2 W/kg.\n8. Monitor patient continuously during scan.',
    postscan_checklist: '1. Programme SureScan mode to OFF and restore permanent settings.\n2. Confirm permanently programmed settings are appropriate.\n3. Check pacing capture thresholds post-scan.',
    patient_instructions: 'Your pacemaker is compatible with MRI under specific conditions. A cardiac programmer will be used before and after your scan. Please inform the department of any additional implanted devices.',
    doc_id: 'DOC-000001',
    source_type: 'Manufacturer MRI Technical Manual',
    last_verified_date: '2025-10-01',
    verified_by: 'Implant ID editorial team',
    manufacturer_verified: false,
    entry_notes: 'MODEL NUMBERS CORRECTED 2026-06-08 (source: medtronic.com ordering table). W1DR01 = Azure XT DR (dual chamber); W1SR01 = Azure XT SR (single chamber). Previous entry incorrectly listed W3DR01 which is the Azure S — a newer, separate model. Abandoned leads in situ contraindicate this system regardless of capping status unless confirmed in writing by Medtronic. Azure S (W3DR01; W3SR01) has identical SureScan MRI conditions — see IID-PPM-000005.',
    _category: 'active',
  },
  {
    device_id: 'IID-LEAD-000001',
    device_name: 'CapSureFix MRI SureScan',
    manufacturer_id: 'MFR-000001',
    model_number: '5086MRI',
    device_type: 'Pacemaker',
    component_role: 'Pacing lead',
    lead_group_id: 'LG-MED-SURESCAN-001',
    lead_status: 'Active',
    implant_region: 'Right atrium or right ventricle',
    mri_classification: 'MR Conditional',
    field_strength_1t5: true,
    field_strength_3t: true,
    field_strength_7t: false,
    field_strength_notes: 'Conditions as per grouped SureScan system — most restrictive parameters apply across system.',
    regionA_max_sar_wb: 2,
    regionA_max_sar_head: 3.2,
    regionA_max_b1_rms: 2,
    regionB_max_sar_wb: 2,
    regionB_max_sar_head: 3.2,
    regionB_max_b1_rms: 2,
    rf_transmit_mode: 'Body coil only',
    rf_receive_coil: 'Any receive coil',
    mri_mode_label: 'SureScan ON (via generator programming)',
    mri_platform_label: 'SureScan',
    scanner_configuration: 'Cylindrical bore, horizontal field',
    max_slew_rate: 200,
    max_db_dt: null,
    max_spatial_gradient: null,
    isocentre_restriction: 'Full body scanning permitted when part of complete SureScan system',
    scan_region_permitted: 'No restriction',
    orientation_restriction: 'No restriction',
    bore_contact_restriction: '',
    scan_region_notes: 'Must only be used as part of a complete SureScan system. See generator entry IID-PPM-000001.',
    max_scan_time_mins: null,
    cooloff_period_mins: null,
    post_implant_wait_weeks: 6,
    prescan_programming_required: true,
    magnet_removal_required: false,
    rep_required: false,
    prescan_checklist: 'See generator entry IID-PPM-000001 for complete system checklist.',
    postscan_checklist: 'See generator entry IID-PPM-000001.',
    patient_instructions: '',
    doc_id: 'DOC-000002',
    source_type: 'Manufacturer IFU',
    last_verified_date: '2025-10-01',
    verified_by: 'Implant ID editorial team',
    manufacturer_verified: false,
    entry_notes: 'Bipolar, silicone, steroid-eluting, screw-in, extendible/retractable. Can be implanted in right atrium or right ventricle.',
    _category: 'active',
  },
  {
    device_id: 'IID-PPM-000002',
    device_name: 'Assurity MRI',
    manufacturer_id: 'MFR-000002',
    model_number: 'PM1272; PM2272',
    device_type: 'Pacemaker',
    component_role: 'Generator / IPG',
    lead_group_id: 'LG-ABB-ASSURITY-001',
    lead_status: '',
    implant_region: 'Left or right pectoral region',
    mri_classification: 'MR Conditional',
    field_strength_1t5: true,
    field_strength_3t: true,
    field_strength_7t: false,
    field_strength_notes: 'Full-body 1.5T and 3T conditional. No post-implant wait (0 weeks) — key differentiator.',
    regionA_max_sar_wb: 2,
    regionA_max_sar_head: 3.2,
    regionA_max_b1_rms: 2,
    regionB_max_sar_wb: 2,
    regionB_max_sar_head: 3.2,
    regionB_max_b1_rms: 2,
    rf_transmit_mode: 'Body coil only',
    rf_receive_coil: 'Any receive coil',
    mri_mode_label: 'MRI Settings ON',
    mri_platform_label: 'MRI Ready',
    scanner_configuration: 'Cylindrical bore, horizontal field',
    max_slew_rate: 200,
    max_db_dt: null,
    max_spatial_gradient: null,
    isocentre_restriction: 'No restriction — full body scanning permitted',
    scan_region_permitted: 'No restriction',
    orientation_restriction: 'No orientation restriction',
    bore_contact_restriction: 'Merlin PCS and MRI Activator are MR Unsafe — must not enter Zone IV',
    scan_region_notes: 'Compatible leads: UltiPace and Tendril STS only.',
    max_scan_time_mins: null,
    cooloff_period_mins: null,
    post_implant_wait_weeks: 0,
    prescan_programming_required: true,
    magnet_removal_required: false,
    rep_required: false,
    prescan_checklist: '1. Confirm complete MRI-Ready system (Assurity MRI + UltiPace or Tendril STS leads).\n2. Confirm no abandoned or non-MR-conditional leads.\n3. Confirm lead impedance within programmed limits.\n4. Enable MRI Settings using Merlin PCS or SJM MRI Activator (outside Zone IV).\n5. Review MRI Checklist screen on programmer and confirm all items.\n6. Set scanner to Normal Mode: WB SAR ≤2.0 W/kg.\n7. Monitor patient continuously.',
    postscan_checklist: '1. Disable MRI Settings and restore permanently programmed parameters.\n2. Confirm pacing settings are appropriate.\n3. Check capture thresholds.',
    patient_instructions: 'Your pacemaker is MRI-compatible. A cardiac technician will briefly reprogram your device before and after the scan. Please notify the department of any other implanted devices.',
    doc_id: 'DOC-000003',
    source_type: 'Manufacturer MRI Technical Manual',
    last_verified_date: '2025-10-01',
    verified_by: 'Implant ID editorial team',
    manufacturer_verified: false,
    entry_notes: 'Zero post-implant wait time is a significant clinical advantage. Do NOT bring Merlin PCS or MRI Activator inside Zone IV — MR Unsafe.',
    _category: 'active',
  },
  {
    device_id: 'IID-CI-000001',
    device_name: 'Nucleus Profile',
    manufacturer_id: 'MFR-000004',
    model_number: 'CI512; CI522; CI532; CI532P',
    device_type: 'Cochlear Implant',
    component_role: 'Generator / IPG',
    lead_group_id: '',
    lead_status: '',
    implant_region: 'Temporal bone (behind ear)',
    mri_classification: 'MR Conditional',
    field_strength_1t5: true,
    field_strength_3t: true,
    field_strength_7t: false,
    field_strength_notes: 'CI500 series (Nucleus Profile). 1.5T: magnet may remain in situ — Cochlear MRI Kit (circumferential head bandage) IS REQUIRED at 1.5T. 3T: implant magnet MUST be surgically removed before the scan — MRI Kit is contraindicated at 3T with magnet absent. 7T: not permitted.',
    regionA_max_sar_wb: 2,
    regionA_max_sar_head: 3.2,
    regionA_max_b1_rms: null,
    regionB_max_sar_wb: 2,
    regionB_max_sar_head: 3.2,
    regionB_max_b1_rms: null,
    rf_transmit_mode: 'No restriction',
    rf_receive_coil: 'Any receive coil — implant site must not contact head coil conductors',
    mri_mode_label: 'External processor removed — no programming required',
    mri_platform_label: '',
    scanner_configuration: 'Cylindrical bore, horizontal field',
    max_slew_rate: null,
    max_db_dt: null,
    max_spatial_gradient: null,
    isocentre_restriction: 'Head coil scanning permitted. Avoid placing implant directly at isocentre if possible.',
    scan_region_permitted: 'No restriction',
    orientation_restriction: 'Head-first supine ONLY — no prone, feet-first, or lateral decubitus. Magnet torque risk.',
    bore_contact_restriction: 'Implant site must not contact RF head coil conductors — pad if necessary.',
    scan_region_notes: 'Bilateral implants: each device requires individual assessment. External processor and coil must be removed before entering Zone III.',
    max_scan_time_mins: null,
    cooloff_period_mins: null,
    post_implant_wait_weeks: undefined,
    prescan_programming_required: false,
    magnet_removal_required: true,
    rep_required: false,
    prescan_checklist: '1. Remove external sound processor and transmitting coil before Zone III entry.\n2. Confirm device is CI500 series (Nucleus Profile) — different rules apply for CI600 (Profile Plus).\n3. AT 1.5T (magnet in situ): Apply Cochlear MRI Kit (circumferential head bandage) — MANDATORY.\n4. AT 3T: Confirm magnet has been surgically removed before scan date — 3T with magnet in situ is contraindicated. Do NOT apply MRI Kit at 3T (contraindicated when magnet absent).\n5. Position patient head-first supine only — no exceptions.\n6. Warn patient of possible mild discomfort/sensation at implant site.\n7. Ensure implant does not contact head coil conductors — pad if necessary.',
    postscan_checklist: '1. Remove head bandage if applied.\n2. Confirm patient comfort and check implant site.\n3. Patient may refit external processor after leaving Zone IV.',
    patient_instructions: 'Please remove your external sound processor and any magnetic accessories before your scan. You may feel a mild pulling sensation at your implant site — this is normal. Tell the radiographer immediately if you feel any pain.',
    doc_id: 'DOC-000004',
    source_type: 'Manufacturer IFU',
    last_verified_date: '2025-10-01',
    verified_by: 'Implant ID editorial team',
    manufacturer_verified: false,
    entry_notes: 'CI500 SERIES (Nucleus Profile) — CORRECTED 2026-06-08. CRITICAL: Previous entry had incorrect device name ("Profile Plus"), incorrect models (CI532; CI534 — CI534 is not a valid Cochlear model), and inverted 1.5T/3T conditions. At 1.5T: MRI Kit (head bandage) IS required with magnet in situ. At 3T: magnet MUST be surgically removed (NOT just a bandage). Magnet removal requires a surgical procedure — confirm with patient and referring team well before the scan date. For CI600 (Profile Plus) which requires NO magnet removal at either field strength, see IID-CI-000002.',
    _category: 'active',
  },
  {
    device_id: 'IID-DBS-000001',
    device_name: 'Infinity Deep Brain Stimulation System',
    manufacturer_id: 'MFR-000003',
    model_number: '6660; 6661; 6662; 6663',
    device_type: 'Deep Brain Stimulator',
    component_role: 'Generator / IPG',
    lead_group_id: 'LG-ABB-INFINITY-DBS-001',
    lead_status: '',
    implant_region: 'Subclavicular (IPG); intracranial (leads)',
    mri_classification: 'MR Conditional',
    field_strength_1t5: true,
    field_strength_3t: false,
    field_strength_7t: false,
    field_strength_notes: '1.5T ONLY. 3T and 7T are NOT permitted under any circumstances.',
    regionA_max_sar_wb: 0.1,
    regionA_max_sar_head: 0.1,
    regionA_max_b1_rms: null,
    regionB_max_sar_wb: 0.1,
    regionB_max_sar_head: 0.1,
    regionB_max_b1_rms: null,
    rf_transmit_mode: 'Head transmit coil only — body coil transmit PROHIBITED',
    rf_receive_coil: 'Head transmit-receive coil only',
    mri_mode_label: 'Therapy OFF — MRI Mode',
    mri_platform_label: '',
    scanner_configuration: 'Cylindrical bore, horizontal field',
    max_slew_rate: 200,
    max_db_dt: null,
    max_spatial_gradient: null,
    isocentre_restriction: 'Brain/head imaging only. IPG must remain outside the imaging volume. Consult manufacturer manual for specific landmark-to-isocentre distances.',
    scan_region_permitted: 'Head/neck only',
    orientation_restriction: 'Head-first supine only',
    bore_contact_restriction: 'Extension cables must not contact the bore. Specific cable routing required — see manufacturer checklist.',
    scan_region_notes: 'Scan only at centres with explicit DBS MRI experience. WB SAR ≤0.1 W/kg is 20× below Normal Mode — requires individual protocol modification.',
    max_scan_time_mins: 30,
    cooloff_period_mins: 60,
    post_implant_wait_weeks: 4,
    prescan_programming_required: true,
    magnet_removal_required: false,
    rep_required: true,
    prescan_checklist: '1. Confirm 1.5T only — do NOT proceed at 3T.\n2. Abbott DBS representative must be present.\n3. Confirm complete Infinity DBS system with approved leads and extensions.\n4. Programme device to MRI mode (therapy off, specific amplitude settings per manual).\n5. Confirm WB SAR ≤0.1 W/kg on scanner — verify before patient entry.\n6. Use head transmit coil only — body coil transmit is contraindicated.\n7. Patient head-first supine only.\n8. Confirm IPG is outside imaging volume.\n9. Continuous patient monitoring throughout.\n10. Note scan start time — maximum 30 minutes.',
    postscan_checklist: '1. Wait full 60-minute cooloff before any re-entry.\n2. Abbott rep to restore device programming.\n3. Confirm device function post-scan.\n4. Document scan duration and any adverse events.',
    patient_instructions: 'Your deep brain stimulator requires careful preparation before your MRI. Your device will be turned off for the scan duration — you may notice a temporary return of symptoms. An Abbott specialist will be present throughout. Please allow extra time for your appointment.',
    doc_id: 'DOC-000005',
    source_type: 'Manufacturer MRI Technical Manual',
    last_verified_date: '2025-10-01',
    verified_by: 'Implant ID editorial team',
    manufacturer_verified: false,
    entry_notes: 'CRITICAL: SAR limit of 0.1 W/kg is extremely restrictive — 20× below Normal Mode. Standard protocols must be individually modified. Only scan at DBS-experienced centres.',
    _category: 'active',
  },
  {
    device_id: 'IID-SCS-000001',
    device_name: 'RestoreAdvanced',
    manufacturer_id: 'MFR-000001',
    model_number: '37712',
    device_type: 'Neurostimulator (SCS)',
    component_role: 'Generator / IPG',
    lead_group_id: 'LG-MED-RESTORE-001',
    lead_status: '',
    implant_region: 'Abdomen or buttock (IPG); spinal epidural space (leads)',
    mri_classification: 'MR Conditional',
    field_strength_1t5: true,
    field_strength_3t: false,
    field_strength_7t: false,
    field_strength_notes: '1.5T head-only scanning only. 3T and full-body imaging at any field strength are NOT permitted.',
    regionA_max_sar_wb: 0.9,
    regionA_max_sar_head: 3.2,
    regionA_max_b1_rms: null,
    regionB_max_sar_wb: null,
    regionB_max_sar_head: null,
    regionB_max_b1_rms: null,
    rf_transmit_mode: 'Head transmit coil only',
    rf_receive_coil: 'Head coil only',
    mri_mode_label: 'Therapy amplitude set to 0 — MRI mode per manual',
    mri_platform_label: 'SureScan',
    scanner_configuration: 'Cylindrical bore, horizontal field',
    max_slew_rate: 200,
    max_db_dt: null,
    max_spatial_gradient: null,
    isocentre_restriction: 'Head imaging only. IPG and all spinal leads must remain outside imaging volume and area of significant gradient fields.',
    scan_region_permitted: 'Head/neck only',
    orientation_restriction: 'Head-first supine only',
    bore_contact_restriction: '',
    scan_region_notes: 'Head-only restriction means body, spine, and extremity MRI are NOT permitted while this device is implanted.',
    max_scan_time_mins: null,
    cooloff_period_mins: null,
    post_implant_wait_weeks: 0,
    prescan_programming_required: true,
    magnet_removal_required: false,
    rep_required: false,
    prescan_checklist: '1. Confirm 1.5T head-only scan — body/spine MRI is contraindicated.\n2. Confirm complete approved system with correct leads and extensions.\n3. Programme stimulation amplitude to 0 mA per manual protocol.\n4. Use head transmit coil only.\n5. Confirm WB SAR ≤0.9 W/kg.\n6. Continuous monitoring throughout.',
    postscan_checklist: '1. Restore device to therapy settings.\n2. Confirm stimulation function.\n3. Assess patient comfort.',
    patient_instructions: 'Your spinal cord stimulator means only brain/head MRI scans are possible today. Your stimulation will be turned off during the scan — you may notice a temporary increase in discomfort.',
    doc_id: 'DOC-000006',
    source_type: 'Manufacturer MRI Technical Manual',
    last_verified_date: '2025-10-01',
    verified_by: 'Implant ID editorial team',
    manufacturer_verified: false,
    entry_notes: 'The head-only restriction is clinically significant — many referrers are unaware that an SCS precludes body/spine MRI.',
    _category: 'active',
  },
  {
    device_id: 'IID-ICD-000001',
    device_name: 'EMBLEM MRI S-ICD',
    manufacturer_id: 'MFR-000006',
    model_number: 'A219',
    device_type: 'Subcutaneous ICD (S-ICD)',
    component_role: 'Generator / IPG',
    lead_group_id: '',
    lead_status: '',
    implant_region: 'Left lateral thorax (subcutaneous — no intracardiac leads)',
    mri_classification: 'MR Conditional',
    field_strength_1t5: true,
    field_strength_3t: false,
    field_strength_7t: false,
    field_strength_notes: '1.5T ONLY. 3T and 7T are NOT permitted under any circumstances. Full-body scanning permitted without anatomical exclusion zones. Requires complete ImageReady system: A219 generator + compatible S-ICD electrode (model 3010, 3400, 3401, or 3501).',
    regionA_max_sar_wb: 2,
    regionA_max_sar_head: 3.2,
    regionA_max_b1_rms: null,
    regionB_max_sar_wb: 2,
    regionB_max_sar_head: 3.2,
    regionB_max_b1_rms: null,
    rf_transmit_mode: 'No restriction stated in published documentation',
    rf_receive_coil: 'Any receive coil',
    mri_mode_label: 'MRI Protection Mode ON',
    mri_platform_label: 'ImageReady',
    scanner_configuration: 'Cylindrical bore, horizontal field',
    max_slew_rate: null,
    max_db_dt: null,
    max_spatial_gradient: null,
    isocentre_restriction: 'No restriction — full body scanning without anatomical exclusion zones',
    scan_region_permitted: 'No restriction',
    orientation_restriction: 'No restriction stated',
    bore_contact_restriction: 'Model 3300 or 3200 programmer is MR Unsafe — must remain outside Zone III at all times.',
    scan_region_notes: 'No anatomical exclusion zones and no time restrictions. MRI Protection Mode disables ALL tachycardia therapy during scan — haemodynamic monitoring is mandatory throughout. Model A209 (older Emblem S-ICD) is also MR Conditional when used with compatible electrode as the complete ImageReady system.',
    max_scan_time_mins: null,
    cooloff_period_mins: null,
    post_implant_wait_weeks: undefined,
    prescan_programming_required: true,
    magnet_removal_required: false,
    rep_required: false,
    prescan_checklist: '1. Confirm complete ImageReady system: EMBLEM MRI S-ICD (A219) + compatible electrode (3010, 3400, 3401, or 3501).\n2. Confirm 1.5T scanner — 3T is NOT permitted.\n3. Programme device to MRI Protection Mode using Model 3300 or 3200 programmer — programmer MUST remain outside Zone III (MR Unsafe).\n4. Select MRI Protection Mode time-out: 6, 9, 12, or 24 hours as appropriate.\n5. Confirm WB SAR ≤2.0 W/kg and Head SAR ≤3.2 W/kg on scanner.\n6. Continuous haemodynamic monitoring throughout — ALL tachycardia therapy suspended in MRI Protection Mode.\n7. Counsel patient: MRI scanning may permanently reduce device beeper volume.',
    postscan_checklist: '1. Confirm MRI Protection Mode is still active (auto time-out may have triggered if scan exceeded programmed duration).\n2. Disable MRI Protection Mode and restore permanent settings using programmer outside Zone III.\n3. Confirm device sensing and therapy settings.\n4. Arrange LATITUDE NXT remote monitoring follow-up or in-clinic review within 3 months.',
    patient_instructions: 'Your subcutaneous defibrillator can be scanned by a 1.5T MRI. It will be temporarily programmed so it cannot deliver a shock during the scan — you will need continuous heart monitoring throughout. Tell staff immediately if you feel unwell at any time. Note that MRI may permanently affect the volume of your device beeper.',
    doc_id: 'DOC-000011',
    source_type: 'Manufacturer MRI Technical Manual',
    last_verified_date: '2026-06-08',
    verified_by: 'Implant ID editorial team — via bostonscientific.com ImageReady portal and spec sheet CRM-368602-AC',
    manufacturer_verified: false,
    entry_notes: 'Source: Boston Scientific ImageReady MR-Conditional S-ICD system, spec sheet CRM-368602-AC (Aug 2016) and bostonscientific.com ImageReady portal. SAR values (WB ≤2.0 W/kg, head ≤3.2 W/kg) confirmed via EU ImageReady page and spec sheet. CRITICAL: MRI Protection Mode disables ALL tachycardia therapy — patient is unprotected during scan. Haemodynamic monitoring is mandatory. Permanent beeper volume loss is a known and documented risk. MRI Hotline: 1-844-427-2674.',
    _category: 'active',
  },
  {
    device_id: 'IID-CI-000002',
    device_name: 'Nucleus Profile Plus',
    manufacturer_id: 'MFR-000004',
    model_number: 'CI612; CI622; CI624; CI632; CI632P',
    device_type: 'Cochlear Implant',
    component_role: 'Generator / IPG',
    lead_group_id: '',
    lead_status: '',
    implant_region: 'Temporal bone (behind ear)',
    mri_classification: 'MR Conditional',
    field_strength_1t5: true,
    field_strength_3t: true,
    field_strength_7t: false,
    field_strength_notes: '1.5T and 3T permitted. At BOTH field strengths: magnet remains in place — NO magnet removal required. NO Cochlear MRI Kit (head bandage) required at either field strength. This is the key clinical advance of CI600 series over CI500 (Profile), where magnet removal is required at 3T.',
    regionA_max_sar_wb: 2,
    regionA_max_sar_head: 2,
    regionA_max_b1_rms: null,
    regionB_max_sar_wb: 2,
    regionB_max_sar_head: 2,
    regionB_max_b1_rms: null,
    rf_transmit_mode: 'Circularly Polarised (CP) mode only — multi-channel/non-CP mode prohibited',
    rf_receive_coil: 'Any receive coil — implant site must not contact head coil conductors',
    mri_mode_label: 'External processor removed — no programming required',
    mri_platform_label: '',
    scanner_configuration: 'Horizontal cylindrical bore (closed or wide bore)',
    max_slew_rate: 200,
    max_db_dt: null,
    max_spatial_gradient: 20,
    isocentre_restriction: 'No restriction — any landmark acceptable provided SAR limits met',
    scan_region_permitted: 'No restriction',
    orientation_restriction: 'Patient supine, head aligned with bore axis. Maximum 15° angular deviation from Z-axis centreline permitted.',
    bore_contact_restriction: 'Implant site must not contact RF head coil conductors — pad if necessary.',
    scan_region_notes: 'No time restriction on scan duration. No specific post-implant wait time stated — allow normal tissue healing after surgery. Sound processor is MR Unsafe — must be removed before Zone III entry. Bilateral implants require individual assessment per device.',
    max_scan_time_mins: null,
    cooloff_period_mins: null,
    post_implant_wait_weeks: undefined,
    prescan_programming_required: false,
    magnet_removal_required: false,
    rep_required: false,
    prescan_checklist: '1. Remove external sound processor and transmitting coil before Zone III entry.\n2. Confirm CI600 series (Profile Plus) — different rules apply for CI500 (Profile) and CI1000 (Nexa).\n3. No head bandage required and no magnet removal required at any field strength.\n4. Confirm scanner uses Circularly Polarised (CP) RF mode — multi-channel/non-CP mode is prohibited.\n5. At 3T: confirm WB SAR ≤2.0 W/kg and Head SAR ≤2.0 W/kg. At 1.5T: Normal Operating Mode (no SAR restriction).\n6. Confirm gradient slew rate ≤200 T/m/s per axis; spatial field gradient ≤20 T/m (2000 gauss/cm).\n7. Position patient supine, head aligned with bore axis, maximum 15° angular deviation.\n8. Ensure implant does not contact head coil conductors — pad if necessary.\n9. Warn patient of possible mild sensation at implant site.',
    postscan_checklist: '1. Check patient comfort and implant site.\n2. Patient may refit external processor after leaving Zone IV.',
    patient_instructions: 'Please remove your external sound processor and any magnetic accessories before your scan. No head bandage is required for your implant type. You may feel a mild sensation at your implant site — please tell the radiographer immediately if you feel any pain.',
    doc_id: 'DOC-000010',
    source_type: 'Manufacturer IFU',
    last_verified_date: '2026-06-08',
    verified_by: 'Implant ID editorial team — via Cochlear MRI Guidelines D2044134_2 (2025) and mriquestions.com PDF 2026-06-08',
    manufacturer_verified: false,
    entry_notes: 'CI600 SERIES (Nucleus Profile Plus). Source: Cochlear MRI Guidelines D2044134_2 (2025) verified via mriquestions.com. KEY CLINICAL DISTINCTION: Unlike CI500 series (Profile, IID-CI-000001), the CI600 series does NOT require magnet removal at 3T and does NOT require a head bandage at 1.5T. Using CI500 protocols for a CI600 patient could result in unnecessary surgical magnet removal — always confirm the exact implant series before planning MRI.',
    _category: 'active',
  },
  {
    device_id: 'IID-PPM-000005',
    device_name: 'Azure S MRI SureScan',
    manufacturer_id: 'MFR-000001',
    model_number: 'W3DR01; W3SR01',
    device_type: 'Pacemaker',
    component_role: 'Generator / IPG',
    lead_group_id: 'LG-MED-SURESCAN-001',
    lead_status: '',
    implant_region: 'Left or right pectoral region',
    mri_classification: 'MR Conditional',
    field_strength_1t5: true,
    field_strength_3t: true,
    field_strength_7t: false,
    field_strength_notes: '1.5T and 3T permitted. Full-body scanning allowed when complete SureScan system. Identical SureScan MRI conditions to Azure XT (IID-PPM-000001). Azure S is the current production model with BlueSync™ wireless tablet programming.',
    regionA_max_sar_wb: 2,
    regionA_max_sar_head: 3.2,
    regionA_max_b1_rms: 2,
    regionB_max_sar_wb: 2,
    regionB_max_sar_head: 3.2,
    regionB_max_b1_rms: 2,
    rf_transmit_mode: 'Body coil only — local transmit coils prohibited',
    rf_receive_coil: 'Any receive coil',
    mri_mode_label: 'SureScan ON',
    mri_platform_label: 'SureScan',
    scanner_configuration: 'Cylindrical bore, horizontal field',
    max_slew_rate: 200,
    max_db_dt: null,
    max_spatial_gradient: null,
    isocentre_restriction: 'No restriction — full body scanning permitted when complete SureScan system',
    scan_region_permitted: 'No restriction',
    orientation_restriction: 'No orientation restriction',
    bore_contact_restriction: '',
    scan_region_notes: 'Complete SureScan system required (generator + SureScan leads). Any abandoned or non-SureScan leads contraindicate the system.',
    max_scan_time_mins: null,
    cooloff_period_mins: null,
    post_implant_wait_weeks: 6,
    prescan_programming_required: true,
    magnet_removal_required: false,
    rep_required: false,
    prescan_checklist: '1. Confirm complete SureScan system (generator + approved SureScan leads).\n2. Confirm implant >6 weeks post-surgery.\n3. Confirm all leads electrically intact — impedance 200–1500 ohms (pacing).\n4. Confirm pacing threshold ≤2.0V at 0.4ms (pacemaker-dependent patients).\n5. Programme SureScan mode to ON using CareLink SmartSync™ tablet programmer.\n6. Confirm scanner in Normal Operating Mode.\n7. Set WB SAR ≤2.0 W/kg and Head SAR ≤3.2 W/kg.\n8. Monitor patient continuously during scan.',
    postscan_checklist: '1. Programme SureScan mode to OFF and restore permanent settings.\n2. Confirm permanently programmed settings are appropriate.\n3. Check pacing capture thresholds post-scan.',
    patient_instructions: 'Your pacemaker is compatible with MRI under specific conditions. A cardiac programmer will be used before and after your scan. Please inform the department of any additional implanted devices.',
    doc_id: 'DOC-000012',
    source_type: 'Manufacturer MRI Technical Manual',
    last_verified_date: '2026-06-08',
    verified_by: 'Implant ID editorial team — model numbers confirmed via medtronic.com ordering table 2026-06-08',
    manufacturer_verified: false,
    entry_notes: 'Model W3DR01 = Azure S DR MRI SureScan (dual chamber) with BlueSync™ wireless technology. W3SR01 = Azure S SR MRI SureScan (single chamber). Model numbers confirmed via medtronic.com product ordering table 2026-06-08. This is the current production model. MRI parameters are identical to Azure XT — both run the SureScan platform with same SAR limits, same lead requirements, same pre/post-scan programming steps. Do NOT confuse with Azure XT (IID-PPM-000001, W1DR01/W1SR01).',
    _category: 'active',
  },
]

// ── PASSIVE IMPLANTS ───────────────────────────────────────────────────────

const PASSIVE_IMPLANTS: Device[] = [
  {
    device_id: 'IID-PASS-000001',
    device_name: 'Zilver PTX Drug-Eluting Peripheral Stent',
    manufacturer_id: 'MFR-000005',
    model_number: 'Zilver PTX',
    device_type: 'Vascular Stent',
    implant_region: 'Peripheral vasculature (femoropopliteal)',
    mri_classification: 'MR Conditional',
    field_strength_1t5: true,
    field_strength_3t: true,
    field_strength_7t: false,
    field_strength_notes: 'Tested at 1.5T and 3T per ASTM standards.',
    regionA_max_sar_wb: 2,
    regionA_max_sar_head: 3.2,
    regionA_max_b1_rms: null,
    regionB_max_sar_wb: 2,
    regionB_max_sar_head: 3.2,
    regionB_max_b1_rms: null,
    rf_transmit_mode: 'No restriction',
    rf_receive_coil: 'Any receive coil',
    scanner_configuration: '',
    max_slew_rate: null,
    max_db_dt: null,
    max_spatial_gradient: null,
    deflection_angle: '< 45° at 3T',
    deflection_notes: 'ASTM F2052 tested at 3T. Deflection ≤45° — acceptable.',
    torque_magnitude: '< gravitational torque at 3T — acceptable',
    artifact_type: 'Susceptibility',
    artifact_extent_mm: 10,
    artifact_notes: 'Susceptibility artefact ~10mm at 1.5T. Larger at 3T. Minimal on TSE sequences.',
    heating_temp_rise: '< 2°C at 2 W/kg WB SAR, 3T',
    material_ferromagnetic: false,
    isocentre_restriction: 'No restriction',
    scan_region_permitted: 'No restriction',
    orientation_restriction: 'No restriction',
    bore_contact_restriction: '',
    scan_region_notes: 'No post-implant waiting period required — can be scanned immediately.',
    max_scan_time_mins: null,
    cooloff_period_mins: null,
    doc_id: 'DOC-000007',
    source_type: 'Manufacturer IFU',
    last_verified_date: '2025-10-01',
    verified_by: 'Implant ID editorial team',
    manufacturer_verified: false,
    entry_notes: '',
    _category: 'passive',
  },
  {
    device_id: 'IID-PASS-000002',
    device_name: 'Wallstent Biliary Endoprosthesis',
    manufacturer_id: 'MFR-000006',
    model_number: 'Wallstent-Biliary',
    device_type: 'Biliary Stent',
    implant_region: 'Biliary tract / common bile duct',
    mri_classification: 'MR Conditional',
    field_strength_1t5: true,
    field_strength_3t: true,
    field_strength_7t: false,
    field_strength_notes: 'Conditional at 1.5T and 3T. Specific SAR conditions apply.',
    regionA_max_sar_wb: 2,
    regionA_max_sar_head: 3.2,
    regionA_max_b1_rms: null,
    regionB_max_sar_wb: 2,
    regionB_max_sar_head: 3.2,
    regionB_max_b1_rms: null,
    rf_transmit_mode: 'No restriction',
    rf_receive_coil: 'Any receive coil',
    scanner_configuration: '',
    max_slew_rate: null,
    max_db_dt: null,
    max_spatial_gradient: null,
    deflection_angle: '< 45° at 1.5T',
    deflection_notes: 'ASTM F2052 tested. Acceptable deflection at 1.5T and 3T.',
    torque_magnitude: 'Acceptable at both field strengths',
    artifact_type: 'Susceptibility',
    artifact_extent_mm: 20,
    artifact_notes: 'Susceptibility artefact may extend up to 20mm at 3T. MRCP sequences may be significantly degraded in the region of the stent.',
    heating_temp_rise: '< 3°C at 2 W/kg, 1.5T',
    material_ferromagnetic: 'Weakly ferromagnetic',
    isocentre_restriction: 'No restriction',
    scan_region_permitted: 'No restriction',
    orientation_restriction: 'No restriction',
    bore_contact_restriction: '',
    scan_region_notes: 'MRCP imaging quality may be significantly compromised by stent artefact. Consider alternative imaging approach if biliary anatomy detail is critical.',
    max_scan_time_mins: null,
    cooloff_period_mins: null,
    doc_id: 'DOC-000008',
    source_type: 'Manufacturer IFU',
    last_verified_date: '2025-10-01',
    verified_by: 'Implant ID editorial team',
    manufacturer_verified: false,
    entry_notes: 'MRCP imaging quality may be significantly compromised by stent artefact.',
    _category: 'passive',
  },
]

// ── LEGACY DEVICES ─────────────────────────────────────────────────────────

const LEGACY_DEVICES: Device[] = [
  {
    device_id: 'IID-LEG-000001',
    device_name: 'Starr-Edwards Ball-and-Cage Heart Valve',
    manufacturer_id: 'MFR-000007',
    model_number: 'Starr-Edwards-Pre6000',
    device_type: 'Pre-MRI Era Device',
    implant_region: 'Cardiac (mitral or aortic position)',
    mri_classification: 'MR Unsafe',
    field_strength_1t5: false,
    field_strength_3t: false,
    field_strength_7t: false,
    field_strength_notes: 'Pre-6000 series contains ferromagnetic components. MRI is contraindicated at all field strengths. Post-6000 models are MR Conditional — verify model number carefully.',
    regionA_max_sar_wb: null,
    regionA_max_sar_head: null,
    regionA_max_b1_rms: null,
    regionB_max_sar_wb: null,
    regionB_max_sar_head: null,
    regionB_max_b1_rms: null,
    rf_transmit_mode: '',
    rf_receive_coil: '',
    scanner_configuration: '',
    max_slew_rate: null,
    max_db_dt: null,
    max_spatial_gradient: null,
    deflection_angle: 'Not tested — contraindicated',
    deflection_notes: 'Ferromagnetic cage — MRI contraindicated.',
    torque_magnitude: 'Not tested — contraindicated',
    artifact_type: 'Multiple types',
    artifact_extent_mm: null,
    artifact_notes: 'Severe susceptibility artefact expected. Moot as scanning is contraindicated.',
    heating_temp_rise: 'Not tested — contraindicated',
    material_ferromagnetic: true,
    isocentre_restriction: 'MRI contraindicated — do not proceed',
    scan_region_permitted: 'NONE — MR Unsafe',
    orientation_restriction: '',
    bore_contact_restriction: '',
    scan_region_notes: 'DO NOT SCAN. Verify valve model before any decision. Post-6000 series valves require separate assessment.',
    max_scan_time_mins: null,
    cooloff_period_mins: null,
    doc_id: 'DOC-000009',
    source_type: 'Peer-reviewed publication',
    last_verified_date: '2025-10-01',
    verified_by: 'Implant ID editorial team',
    manufacturer_verified: false,
    entry_notes: 'Model number verification is critical — pre- and post-6000 series have fundamentally different safety profiles.',
    _category: 'legacy',
  },
]

// ── UNIFIED ARRAY ──────────────────────────────────────────────────────────

export const ALL_DEVICES: Device[] = [
  ...ACTIVE_IMPLANTS,
  ...PASSIVE_IMPLANTS,
  ...LEGACY_DEVICES,
]

// ── HELPERS ────────────────────────────────────────────────────────────────

/**
 * Look up a device by URL slug (e.g. "W3DR01").
 * Matches against any token in a semicolon-separated model_number string.
 * Case-insensitive.
 */
export function getDeviceByModel(slug: string): Device | undefined {
  const normalised = slug.trim().toLowerCase()
  return ALL_DEVICES.find((d) => {
    const tokens = d.model_number.split(';').map((t) => t.trim().toLowerCase())
    return tokens.includes(normalised)
  })
}

/** Get a manufacturer record by ID. */
export function getManufacturer(manufacturer_id: string): Manufacturer | undefined {
  return MANUFACTURERS.find((m) => m.manufacturer_id === manufacturer_id)
}

/** Get all documents that reference a given device_id. */
export function getDocuments(device_id: string): Document[] {
  return DOCUMENTS.filter((doc) => doc.device_ids.includes(device_id))
}
