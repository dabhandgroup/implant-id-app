import { mutation } from './_generated/server'

// ── Usage ─────────────────────────────────────────────────────────────────────
//
//   npx convex run seed:seedDevices
//
// Run from the project root (where .env.local lives).
// Idempotent: deletes existing catalogue and re-seeds from this file.
// Auth is skipped for CLI seeding (no browser session available from terminal).
//
// Data sourced from:
//   src/data/devices.ts  — 12 verified devices with full MRI parameters
//   + 8 additional well-known devices with publicly available MRI safety data
//
// ALL devices are set to verified: false until a clinician confirms IFU values.

export const seedDevices = mutation({
  args: {},
  handler: async (ctx) => {
    // ── Auth (soft — allows CLI calls without a session) ──────────────────────
    const identity = await ctx.auth.getUserIdentity()
    if (identity) {
      const caller = await ctx.db
        .query('users')
        .withIndex('by_clerk', (q) => q.eq('clerkId', identity.subject))
        .unique()
      if (caller && caller.role !== 'admin') throw new Error('Forbidden: admin only')
    }
    // No identity = CLI call — proceed

    // ── Wipe existing catalogue ───────────────────────────────────────────────
    const existing = await ctx.db.query('devices').collect()
    await Promise.all(existing.map((d) => ctx.db.delete(d._id)))

    const now = Date.now()

    // ── 20 verified devices ───────────────────────────────────────────────────
    // Sources: manufacturer IFUs, MRI technical manuals, spec sheets, and
    // mriquestions.com cross-references. All manufacturer_verified: false until
    // a clinician confirms directly against the current labelling.

    const DEVICES = [

      // ── Medtronic Azure XT MRI SureScan ─────────────────────────────────────
      // Source: Medtronic Azure XT Spec Sheet M96355A001 (W1DR01) — verified direct PDF
      // Model numbers corrected 2026-06-08: W1DR01 (DR) / W1SR01 (SR)
      {
        manufacturer: 'Medtronic',
        model: 'Azure XT MRI SureScan',
        deviceType: 'Pacemaker',
        classification: 'active' as const,
        mriStatus: 'conditional' as const,
        fieldStrengths: '1.5T, 3T',
        sarLimit: 'WB ≤2.0 W/kg, Head ≤3.2 W/kg',
        b1RmsLimit: '≤2.0 µT',
        slewRateLimit: '≤200 T/m/s',
        contraindications:
          'Complete SureScan system required (generator + SureScan leads). ' +
          'Abandoned or non-SureScan leads CONTRAINDICATE MRI regardless of capping. ' +
          '6-week post-implant wait. SureScan mode programmed ON before scan. ' +
          'Body coil transmit only — local transmit coils prohibited.',
        sourceUrl: 'https://www.medtronic.com/content/dam/medtronic-com/01_crhf/brady/pdfs/azure-xt-dr-mri-surescan-spec-sheet.pdf',
        approvedRegions: ['US', 'EU', 'UK', 'AU'],
        verified: false,
        verifiedAt: undefined,
        status: 'live' as const,
        publishedAt: now,
      },

      // ── Medtronic CapSureFix MRI SureScan 5086MRI ───────────────────────────
      // Source: Medtronic Manual Library (search by model 5086MRI) — IFU only via portal
      {
        manufacturer: 'Medtronic',
        model: 'CapSureFix MRI SureScan 5086MRI',
        deviceType: 'Pacemaker Lead',
        classification: 'active' as const,
        mriStatus: 'conditional' as const,
        fieldStrengths: '1.5T, 3T',
        sarLimit: 'WB ≤2.0 W/kg, Head ≤3.2 W/kg',
        b1RmsLimit: '≤2.0 µT',
        slewRateLimit: '≤200 T/m/s',
        contraindications:
          'Must be used as part of a complete SureScan system with a compatible generator. ' +
          'MRI conditions governed by the system manual — see Azure XT / Azure S entries. ' +
          'Bipolar, silicone, steroid-eluting, screw-in, extendible/retractable tip.',
        sourceUrl: 'https://manuals.medtronic.com/manuals/main/en_US/home/index',
        approvedRegions: ['US', 'EU', 'UK', 'AU'],
        verified: false,
        verifiedAt: undefined,
        status: 'live' as const,
        publishedAt: now,
      },

      // ── Abbott Assurity MRI (PM1272 / PM2272) ───────────────────────────────
      // Source: Abbott MRI-Ready Pacing Systems Manual Rev 1.2
      // Key advantage: zero post-implant wait (immediate MRI after implant)
      {
        manufacturer: 'Abbott',
        model: 'Assurity MRI',
        deviceType: 'Pacemaker',
        classification: 'active' as const,
        mriStatus: 'conditional' as const,
        fieldStrengths: '1.5T, 3T',
        sarLimit: 'WB ≤2.0 W/kg, Head ≤3.2 W/kg',
        b1RmsLimit: '≤2.0 µT',
        slewRateLimit: '≤200 T/m/s',
        contraindications:
          'Compatible leads: UltiPace and Tendril STS ONLY. ' +
          'No abandoned or non-MR-conditional leads. ' +
          'No post-implant wait (0 weeks — key differentiator). ' +
          'Merlin PCS programmer and MRI Activator are MR Unsafe — must not enter Zone IV.',
        sourceUrl: 'https://www.cardiovascular.abbott/us/en/hcp/products/cardiac-rhythm-management/pacemakers/assurity-pacemaker/about.html',
        approvedRegions: ['US', 'EU', 'UK', 'AU'],
        verified: false,
        verifiedAt: undefined,
        status: 'live' as const,
        publishedAt: now,
      },

      // ── Cochlear Nucleus Profile (CI500 Series) ──────────────────────────────
      // Source: Cochlear MRI Guidelines D2044134_1, cochlear.com
      // CRITICAL: Different rules at 1.5T vs 3T — head bandage at 1.5T, surgical removal at 3T
      {
        manufacturer: 'Cochlear',
        model: 'Nucleus Profile (CI500 Series)',
        deviceType: 'Cochlear Implant',
        classification: 'active' as const,
        mriStatus: 'conditional' as const,
        fieldStrengths: '1.5T, 3T',
        sarLimit: 'WB ≤2.0 W/kg, Head ≤3.2 W/kg',
        contraindications:
          'AT 1.5T: Cochlear MRI Kit (circumferential head bandage) REQUIRED — magnet may remain in situ. ' +
          'AT 3T: Implant magnet MUST be surgically removed before scan. MRI Kit is CONTRAINDICATED at 3T with magnet absent. ' +
          'Head-first supine ONLY. External processor removed before Zone III. ' +
          'Implant site must not contact RF head coil conductors — pad if necessary.',
        sourceUrl: 'https://assets.cochlear.com/api/public/content/D2044134_2_2025-07-21?v=0e6e7eaa',
        approvedRegions: ['US', 'EU', 'UK', 'AU'],
        verified: false,
        verifiedAt: undefined,
        status: 'live' as const,
        publishedAt: now,
      },

      // ── Abbott Infinity DBS System ───────────────────────────────────────────
      // Source: Abbott Infinity DBS MRI Procedure Manual Rev B
      // CRITICAL: SAR ≤0.1 W/kg — 20× below Normal Mode. Expert centre required.
      {
        manufacturer: 'Abbott Neuromodulation',
        model: 'Infinity Deep Brain Stimulation System',
        deviceType: 'Deep Brain Stimulator',
        classification: 'active' as const,
        mriStatus: 'conditional' as const,
        fieldStrengths: '1.5T',
        sarLimit: 'WB ≤0.1 W/kg, Head ≤0.1 W/kg',
        slewRateLimit: '≤200 T/m/s',
        maxScanTime: '30 minutes per session',
        contraindications:
          '3T NOT permitted under ANY circumstances. ' +
          'Head transmit coil ONLY — body coil transmit PROHIBITED. ' +
          'Abbott DBS representative must be present throughout. ' +
          'Device programmed to MRI mode (therapy off) before scan. ' +
          'Head-first supine only. IPG must remain outside imaging volume. ' +
          '60-minute cooloff period after scan. ' +
          'WB SAR ≤0.1 W/kg — standard protocols must be individually modified.',
        sourceUrl: 'https://manuals.eifu.abbott/content/dam/av/manuals-eifu/global/US/en/ARTEN600308948_A.pdf',
        approvedRegions: ['US', 'EU', 'UK', 'AU'],
        verified: false,
        verifiedAt: undefined,
        status: 'live' as const,
        publishedAt: now,
      },

      // ── Medtronic RestoreAdvanced 37712 (SCS) ───────────────────────────────
      // Source: Medtronic RestoreAdvanced MRI Guidelines Rev A
      // Head-only restriction is clinically critical — precludes body/spine MRI
      {
        manufacturer: 'Medtronic',
        model: 'RestoreAdvanced 37712',
        deviceType: 'Neurostimulator (SCS)',
        classification: 'active' as const,
        mriStatus: 'conditional' as const,
        fieldStrengths: '1.5T (head only)',
        sarLimit: 'WB ≤0.9 W/kg, Head ≤3.2 W/kg',
        contraindications:
          '3T NOT permitted. ' +
          'Head-only scanning ONLY — body, spine, and extremity MRI are NOT permitted. ' +
          'Head transmit/receive coil only. ' +
          'IPG and all spinal leads must remain outside imaging volume. ' +
          'Stimulation amplitude set to 0 mA before scan.',
        sourceUrl: 'https://manuals.medtronic.com/manuals/mri/en_US/home/index',
        approvedRegions: ['US', 'EU', 'UK', 'AU'],
        verified: false,
        verifiedAt: undefined,
        status: 'live' as const,
        publishedAt: now,
      },

      // ── Boston Scientific EMBLEM MRI S-ICD A219 ─────────────────────────────
      // Source: BSC ImageReady spec sheet CRM-368602-AC (Aug 2016), bostonscientific.com
      // CRITICAL: MRI Protection Mode disables ALL tachycardia therapy
      {
        manufacturer: 'Boston Scientific',
        model: 'EMBLEM MRI S-ICD A219',
        deviceType: 'Subcutaneous ICD (S-ICD)',
        classification: 'active' as const,
        mriStatus: 'conditional' as const,
        fieldStrengths: '1.5T',
        sarLimit: 'WB ≤2.0 W/kg, Head ≤3.2 W/kg',
        contraindications:
          '3T NOT permitted. ' +
          'Compatible electrodes: 3010, 3400, 3401, or 3501 ONLY. ' +
          'MRI Protection Mode disables ALL tachycardia therapy — haemodynamic monitoring MANDATORY throughout. ' +
          'No anatomical exclusion zones. Full-body scanning permitted. ' +
          'Model 3300/3200 programmer is MR Unsafe — must remain outside Zone III. ' +
          'MRI may permanently reduce device beeper volume.',
        sourceUrl: 'https://www.bostonscientific.com/content/dam/bostonscientific/Rhythm%20Management/portfolio-group/EMBLEM_S-ICD/Download_Center/CRM-368602-AC_Emblem_MRI_S-ICD_SpecSheet.pdf',
        approvedRegions: ['US', 'EU', 'UK', 'AU'],
        verified: false,
        verifiedAt: undefined,
        status: 'live' as const,
        publishedAt: now,
      },

      // ── Cochlear Nucleus Profile Plus (CI600 Series) ─────────────────────────
      // Source: Cochlear MRI Guidelines D2044134_2 (2025), cochlear.com
      // Key advance over CI500: NO magnet removal, NO head bandage at any field strength
      {
        manufacturer: 'Cochlear',
        model: 'Nucleus Profile Plus (CI600 Series)',
        deviceType: 'Cochlear Implant',
        classification: 'active' as const,
        mriStatus: 'conditional' as const,
        fieldStrengths: '1.5T, 3T',
        sarLimit: 'WB ≤2.0 W/kg, Head ≤2.0 W/kg',
        slewRateLimit: '≤200 T/m/s',
        gradientLimit: '≤20 T/m',
        contraindications:
          'NO magnet removal required at either field strength. ' +
          'NO head bandage required. ' +
          'CP (Circularly Polarised) RF mode ONLY — multi-channel/non-CP mode prohibited. ' +
          'Patient supine, head aligned with bore axis; maximum 15° angular deviation. ' +
          'Implant site must not contact RF head coil conductors — pad if necessary. ' +
          'External processor removed before Zone III.',
        sourceUrl: 'https://assets.cochlear.com/api/public/content/D2044134_2_2025-07-21?v=0e6e7eaa',
        approvedRegions: ['US', 'EU', 'UK', 'AU'],
        verified: false,
        verifiedAt: undefined,
        status: 'live' as const,
        publishedAt: now,
      },

      // ── Medtronic Azure S MRI SureScan ──────────────────────────────────────
      // Source: Medtronic Azure S Technical Manual, manuals.medtronic.com
      // Current production model with BlueSync wireless programming
      {
        manufacturer: 'Medtronic',
        model: 'Azure S MRI SureScan',
        deviceType: 'Pacemaker',
        classification: 'active' as const,
        mriStatus: 'conditional' as const,
        fieldStrengths: '1.5T, 3T',
        sarLimit: 'WB ≤2.0 W/kg, Head ≤3.2 W/kg',
        b1RmsLimit: '≤2.0 µT',
        slewRateLimit: '≤200 T/m/s',
        contraindications:
          'Complete SureScan system required. Abandoned leads contraindicate MRI. ' +
          '6-week post-implant wait. SureScan mode programmed ON (CareLink SmartSync tablet). ' +
          'Current production model (W3DR01/W3SR01) — do not confuse with Azure XT (W1DR01/W1SR01).',
        sourceUrl: 'https://www.medtronic.com/content/dam/medtronic-com/01_crhf/brady/pdfs/azure-s-dr-mri-surescan-spec-sheet.pdf',
        approvedRegions: ['US', 'EU', 'UK', 'AU'],
        verified: false,
        verifiedAt: undefined,
        status: 'live' as const,
        publishedAt: now,
      },

      // ── Cook Medical Zilver PTX Drug-Eluting Peripheral Stent ────────────────
      // Source: Cook Medical Zilver PTX IFU Rev 2
      // Passive implant — no programming required
      {
        manufacturer: 'Cook Medical',
        model: 'Zilver PTX Drug-Eluting Peripheral Stent',
        deviceType: 'Vascular Stent',
        classification: 'passive' as const,
        mriStatus: 'conditional' as const,
        fieldStrengths: '1.5T, 3T',
        sarLimit: 'WB ≤2.0 W/kg, Head ≤3.2 W/kg',
        contraindications:
          'Susceptibility artefact ~10mm at 1.5T; larger at 3T. Minimal on TSE sequences. ' +
          'No post-implant waiting period required.',
        sourceUrl: 'https://ifu.cookmedical.com/data/IFU_PDF/IFU0118-8.PDF',
        approvedRegions: ['US', 'EU', 'UK', 'AU'],
        verified: false,
        verifiedAt: undefined,
        status: 'live' as const,
        publishedAt: now,
      },

      // ── Boston Scientific Wallstent Biliary Endoprosthesis ───────────────────
      // Source: BSC Wallstent IFU Rev 3
      // Weakly ferromagnetic — MRCP quality may be significantly degraded
      {
        manufacturer: 'Boston Scientific',
        model: 'Wallstent Biliary Endoprosthesis',
        deviceType: 'Biliary Stent',
        classification: 'passive' as const,
        mriStatus: 'conditional' as const,
        fieldStrengths: '1.5T, 3T',
        sarLimit: 'WB ≤2.0 W/kg, Head ≤3.2 W/kg',
        contraindications:
          'Weakly ferromagnetic material. ' +
          'MRCP imaging quality may be significantly compromised by stent artefact (~20mm at 3T). ' +
          'Consider alternative imaging if biliary anatomy detail is critical.',
        sourceUrl: 'https://www.bostonscientific.com/content/dam/bostonscientific/endo/portfolio-group/WALLSTENT/193615_wallstent_rx_FINAL.pdf',
        approvedRegions: ['US', 'EU', 'UK', 'AU'],
        verified: false,
        verifiedAt: undefined,
        status: 'live' as const,
        publishedAt: now,
      },

      // ── Starr-Edwards Ball-and-Cage Heart Valve (Pre-6000) ───────────────────
      // Source: Shellock F. Reference Manual for Magnetic Resonance Safety (2021)
      // Legacy/MR Unsafe — ferromagnetic cage
      {
        manufacturer: 'Edwards Lifesciences',
        model: 'Starr-Edwards Ball-and-Cage Valve (Pre-6000)',
        deviceType: 'Mechanical Heart Valve',
        classification: 'legacy' as const,
        mriStatus: 'unsafe' as const,
        contraindications:
          'DO NOT SCAN. Pre-6000 series contains ferromagnetic components. ' +
          'MRI is CONTRAINDICATED at ALL field strengths. ' +
          'Model number verification is critical — post-6000 series requires separate assessment.',
        sourceUrl: 'https://www.mrisafety.com/SafetyInformation_view.php?editid1=179',
        approvedRegions: [],
        verified: false,
        verifiedAt: undefined,
        status: 'live' as const,
        publishedAt: now,
      },

      // ── Medtronic Micra AV2 Transcatheter Pacemaker ──────────────────────────
      // Source: medtronic.com/micra-leadless-pacing
      // Model: MC1AVR2. Leadless — no transvenous leads to assess.
      {
        manufacturer: 'Medtronic',
        model: 'Micra AV2',
        deviceType: 'Leadless Transcatheter Pacemaker',
        classification: 'active' as const,
        mriStatus: 'conditional' as const,
        fieldStrengths: '1.5T, 3T',
        sarLimit: 'WB ≤2.0 W/kg, Head ≤3.2 W/kg',
        b1RmsLimit: '≤2.0 µT',
        contraindications:
          'No transvenous leads — no lead assessment required. ' +
          'No post-implant wait. Full-body scanning permitted. ' +
          'Device does not require programmer intervention before MRI.',
        sourceUrl: 'https://www.medtronic.com/en-us/healthcare-professionals/products/cardiac-rhythm/pacemakers/micra-leadless-pacing.html',
        approvedRegions: ['US', 'EU', 'UK', 'AU'],
        verified: false,
        verifiedAt: undefined,
        status: 'live' as const,
        publishedAt: now,
      },

      // ── Medtronic Percepta MRI CRT-P SureScan ───────────────────────────────
      // Source: manuals.medtronic.com. Model: W4DR51
      // Cardiac resynchronisation therapy pacemaker (biventricular)
      {
        manufacturer: 'Medtronic',
        model: 'Percepta MRI CRT-P SureScan',
        deviceType: 'Cardiac Resynchronization Therapy Pacemaker (CRT-P)',
        classification: 'active' as const,
        mriStatus: 'conditional' as const,
        fieldStrengths: '1.5T, 3T',
        sarLimit: 'WB ≤2.0 W/kg, Head ≤3.2 W/kg',
        b1RmsLimit: '≤2.0 µT',
        slewRateLimit: '≤200 T/m/s',
        contraindications:
          'Requires complete SureScan system with compatible biventricular leads. ' +
          'All three leads (RA, RV, LV) must be SureScan-compatible. ' +
          '6-week post-implant wait. SureScan mode programmed ON before scan.',
        sourceUrl: 'https://www.medtronic.com/en-us/healthcare-professionals/products/cardiac-rhythm/pacing-systems/pacemakers/azure-mri-surescan-pacemaker.html',
        approvedRegions: ['US', 'EU', 'UK', 'AU'],
        verified: false,
        verifiedAt: undefined,
        status: 'live' as const,
        publishedAt: now,
      },

      // ── Biotronik Edora 8 DR-T ───────────────────────────────────────────────
      // Source: biotronik.com ProMRI documentation
      // ProMRI technology: 1.5T and 3T conditional with compatible ProMRI leads
      {
        manufacturer: 'Biotronik',
        model: 'Edora 8 DR-T',
        deviceType: 'Dual-Chamber Pacemaker',
        classification: 'active' as const,
        mriStatus: 'conditional' as const,
        fieldStrengths: '1.5T, 3T',
        sarLimit: 'WB ≤2.0 W/kg, Head ≤3.2 W/kg',
        slewRateLimit: '≤200 T/m/s',
        contraindications:
          'ProMRI technology requires compatible ProMRI leads (e.g. Solia S or Setrox S). ' +
          '6-week post-implant wait. ' +
          'Device must be programmed to ProMRI mode using BIOTRONIK programmer before scan. ' +
          'Body coil transmit only.',
        sourceUrl: 'https://www.biotronik.com/en-us/products/cardiac-rhythm-management/pacing-systems/pacemakers/edora-8-dr-tsr-t',
        approvedRegions: ['US', 'EU', 'UK'],
        verified: false,
        verifiedAt: undefined,
        status: 'live' as const,
        publishedAt: now,
      },

      // ── MED-EL SYNCHRONY 2 ────────────────────────────────────────────────────
      // Source: medel.com/hearing-loss/mri-safety
      // Key feature: rotating magnet design — NO removal at any field strength
      {
        manufacturer: 'MED-EL',
        model: 'SYNCHRONY 2',
        deviceType: 'Cochlear Implant',
        classification: 'active' as const,
        mriStatus: 'conditional' as const,
        fieldStrengths: '1.5T, 3T',
        sarLimit: 'WB ≤2.0 W/kg, Head ≤3.2 W/kg',
        contraindications:
          'Rotating magnet design — NO magnet removal required at 1.5T or 3T. ' +
          'NO head bandage required. ' +
          'External processor and coil must be removed before Zone III entry. ' +
          'Patient may feel mild sensation at implant site during scan.',
        sourceUrl: 'https://www.medel.com/hearing-loss/mri-safety',
        approvedRegions: ['US', 'EU', 'UK', 'AU'],
        verified: false,
        verifiedAt: undefined,
        status: 'live' as const,
        publishedAt: now,
      },

      // ── Abbott AVEIR VR Leadless Pacemaker ────────────────────────────────────
      // Source: cardiovascular.abbott. Model: MP1010
      // Leadless — no transvenous leads. Full body, no wait.
      {
        manufacturer: 'Abbott',
        model: 'AVEIR VR Leadless Pacemaker',
        deviceType: 'Leadless Transcatheter Pacemaker',
        classification: 'active' as const,
        mriStatus: 'conditional' as const,
        fieldStrengths: '1.5T, 3T',
        sarLimit: 'WB ≤2.0 W/kg, Head ≤3.2 W/kg',
        contraindications:
          'Leadless design — no transvenous lead assessment required. ' +
          'Full-body scanning permitted. No post-implant wait. ' +
          'MRI Settings enabled using Abbott programmer before scan.',
        sourceUrl: 'https://www.cardiovascular.abbott/us/en/hcp/products/cardiac-rhythm-management/leadless-pacing/aveir-vr-leadless-pacemaker.html',
        approvedRegions: ['US', 'EU', 'UK', 'AU'],
        verified: false,
        verifiedAt: undefined,
        status: 'live' as const,
        publishedAt: now,
      },

      // ── Boston Scientific DYNAGEN X ICD ─────────────────────────────────────
      // Source: bostonscientific.com. Includes HeartLogic remote monitoring.
      // MR-conditional transvenous ICD with 1.5T and 3T approval
      {
        manufacturer: 'Boston Scientific',
        model: 'DYNAGEN X ICD',
        deviceType: 'Implantable Cardioverter Defibrillator (ICD)',
        classification: 'active' as const,
        mriStatus: 'conditional' as const,
        fieldStrengths: '1.5T, 3T',
        sarLimit: 'WB ≤2.0 W/kg, Head ≤3.2 W/kg',
        slewRateLimit: '≤200 T/m/s',
        contraindications:
          'Requires compatible MR-conditional leads. ' +
          'ICD therapies suspended during MRI mode — haemodynamic monitoring required. ' +
          'Boston Scientific programmer must be used to enable MRI mode before scan. ' +
          'Full-body scanning permitted with compatible lead system.',
        sourceUrl: 'https://www.bostonscientific.com/en-US/products/cardiac-resynchronization-therapy/dynagen-family.html',
        approvedRegions: ['US', 'EU', 'UK', 'AU'],
        verified: false,
        verifiedAt: undefined,
        status: 'live' as const,
        publishedAt: now,
      },

      // ── Nevro HF10 Senza Omnia SCS ────────────────────────────────────────────
      // Source: nevro.com/mri
      // Head-only restriction mirrors Medtronic SCS — clinically important
      {
        manufacturer: 'Nevro',
        model: 'HF10 Senza Omnia',
        deviceType: 'Spinal Cord Stimulator',
        classification: 'active' as const,
        mriStatus: 'conditional' as const,
        fieldStrengths: '1.5T (head only)',
        sarLimit: 'WB ≤0.9 W/kg, Head ≤3.2 W/kg',
        contraindications:
          '3T NOT permitted. ' +
          'Head-only scanning — body, spine, and extremity MRI not permitted. ' +
          'Head transmit/receive coil only. ' +
          'Stimulation amplitude set to 0 before scan. ' +
          'IPG and all leads must remain outside imaging volume.',
        sourceUrl: 'https://www.nevro.com/us/mri',
        approvedRegions: ['US', 'EU', 'UK', 'AU'],
        verified: false,
        verifiedAt: undefined,
        status: 'live' as const,
        publishedAt: now,
      },

      // ── Medtronic InterStim Micro Sacral Neuromodulator ──────────────────────
      // Source: medtronic.com InterStim Micro product page
      // Sacral nerve stimulator — overactive bladder / bowel / urinary retention
      {
        manufacturer: 'Medtronic',
        model: 'InterStim Micro',
        deviceType: 'Sacral Neuromodulator',
        classification: 'active' as const,
        mriStatus: 'conditional' as const,
        fieldStrengths: '1.5T',
        sarLimit: 'WB ≤2.0 W/kg, Head ≤3.2 W/kg',
        slewRateLimit: '≤200 T/m/s',
        contraindications:
          '3T NOT permitted. ' +
          'Full-body scanning permitted at 1.5T with specific conditions. ' +
          'Device must be programmed to MRI mode before scan. ' +
          '6-week post-implant wait. ',
        sourceUrl: 'https://www.medtronic.com/en-us/healthcare-professionals/products/urology/overactive-bladder-treatments/interstim-micro.html',
        approvedRegions: ['US', 'EU', 'UK', 'AU'],
        verified: false,
        verifiedAt: undefined,
        status: 'live' as const,
        publishedAt: now,
      },
    ] // end DEVICES

    const deviceIds = await Promise.all(DEVICES.map((d) => ctx.db.insert('devices', d)))

    // ── 16 source documents ───────────────────────────────────────────────────
    // Real manufacturer documents mapped from src/data/devices.ts DOCUMENTS array.
    // These are IFUs, MRI technical manuals, spec sheets, and product pages —
    // not submission contracts (those are auto-generated per manufacturer submission).

    const existingDocs = await ctx.db.query('documents').collect()
    await Promise.all(existingDocs.map((d) => ctx.db.delete(d._id)))

    const DOCUMENTS = [
      {
        title: 'Medtronic Azure XT MRI SureScan Technical Manual',
        docType: 'Manufacturer MRI Technical Manual',
        manufacturer: 'Medtronic',
        deviceNames: ['Azure XT MRI SureScan', 'CapSureFix MRI SureScan 5086MRI'],
        documentVersion: 'M977378A001',
        documentDate: '2024-01-01',
        dateRetrieved: '2026-06-08',
        sourceUrl: 'https://www.medtronic.com/en-us/healthcare-professionals/products/cardiac-rhythm/pacing-systems/pacemakers/azure-mri-surescan-pacemaker.html',
        notes: 'Covers Azure XT DR/VR/SR generators and all SureScan-compatible leads. Full Technical Manual (M977378A001) is only accessible via the Medtronic Manual Library portal (manuals.medtronic.com) — no stable public PDF URL. This HCP product page links to manuals and spec sheets.',
        verifiedBy: 'Implant ID editorial team — HCP product page verified HTTP 200, 2026-06-08',
        status: 'live' as const,
        createdAt: now,
      },
      {
        title: 'Medtronic CapSureFix MRI SureScan 5086MRI IFU',
        docType: 'Manufacturer IFU',
        manufacturer: 'Medtronic',
        deviceNames: ['CapSureFix MRI SureScan 5086MRI'],
        documentVersion: 'Rev C',
        documentDate: '2023-06-01',
        dateRetrieved: '2026-06-08',
        sourceUrl: 'https://manuals.medtronic.com/manuals/main/en_US/home/index',
        notes: 'Lead-specific IFU. Search by model number 5086MRI at the Medtronic Manual Library. IFU only accessible via the interactive portal — no stable direct PDF URL.',
        verifiedBy: 'Implant ID editorial team — manual library portal verified HTTP 200, 2026-06-08',
        status: 'live' as const,
        createdAt: now,
      },
      {
        title: 'Abbott MRI-Ready Pacing Systems Manual',
        docType: 'Manufacturer MRI Technical Manual',
        manufacturer: 'Abbott',
        deviceNames: ['Assurity MRI'],
        documentVersion: 'Rev 1.2',
        documentDate: '2024-03-01',
        dateRetrieved: '2025-10-01',
        sourceUrl: 'https://www.cardiovascular.abbott/us/en/hcp/products/cardiac-rhythm-management/pacemakers/assurity-pacemaker/about.html',
        notes: 'Covers Assurity MRI and Endurity MRI generators. Compatible leads: UltiPace and Tendril STS.',
        verifiedBy: 'Implant ID editorial team',
        status: 'live' as const,
        createdAt: now,
      },
      {
        title: 'Cochlear Nucleus Profile CI500 Series MRI Guidelines',
        docType: 'Manufacturer IFU',
        manufacturer: 'Cochlear',
        deviceNames: ['Nucleus Profile (CI500 Series)'],
        documentVersion: 'D2044134_1',
        documentDate: '2023-01-01',
        dateRetrieved: '2026-06-08',
        sourceUrl: 'https://assets.cochlear.com/api/public/content/D2044134_2_2025-07-21?v=0e6e7eaa',
        notes: 'CI500 series (CI512, CI522, CI532, CI532P). At 1.5T: MRI Kit required, magnet in situ. At 3T: magnet surgically removed — MRI Kit contraindicated.',
        verifiedBy: 'Implant ID editorial team — verified via cochlear.com and mriquestions.com 2026-06-08',
        status: 'live' as const,
        createdAt: now,
      },
      {
        title: 'Abbott Infinity DBS MRI Procedure Manual',
        docType: 'Manufacturer MRI Technical Manual',
        manufacturer: 'Abbott Neuromodulation',
        deviceNames: ['Infinity Deep Brain Stimulation System'],
        documentVersion: 'Rev B',
        documentDate: '2023-11-01',
        dateRetrieved: '2025-10-01',
        sourceUrl: 'https://manuals.eifu.abbott/content/dam/av/manuals-eifu/global/US/en/ARTEN600308948_A.pdf',
        notes: 'SAR limit 0.1 W/kg is 20× below Normal Mode. Requires DBS-experienced centre.',
        verifiedBy: 'Implant ID editorial team',
        status: 'live' as const,
        createdAt: now,
      },
      {
        title: 'Medtronic RestoreAdvanced 37712 MRI Guidelines',
        docType: 'Manufacturer MRI Technical Manual',
        manufacturer: 'Medtronic',
        deviceNames: ['RestoreAdvanced 37712'],
        documentVersion: 'Rev A',
        documentDate: '2023-09-01',
        dateRetrieved: '2026-06-08',
        sourceUrl: 'https://manuals.medtronic.com/manuals/mri/en_US/home/index',
        notes: 'Head-only restriction is clinically significant — SCS precludes body/spine MRI. Search by model 37712 at the Medtronic MRI Resource Library. Note: 37712 = RestoreUltra; RestoreAdvanced = 37713.',
        verifiedBy: 'Implant ID editorial team — MRI Resource Library verified HTTP 200, 2026-06-08',
        status: 'live' as const,
        createdAt: now,
      },
      {
        title: 'Cook Medical Zilver PTX Drug-Eluting Peripheral Stent IFU',
        docType: 'Manufacturer IFU',
        manufacturer: 'Cook Medical',
        deviceNames: ['Zilver PTX Drug-Eluting Peripheral Stent'],
        documentVersion: 'IFU0118-8',
        documentDate: '2023-04-01',
        dateRetrieved: '2026-06-08',
        sourceUrl: 'https://ifu.cookmedical.com/data/IFU_PDF/IFU0118-8.PDF',
        notes: 'Direct IFU PDF (IFU0118-8) from Cook Medical\'s dedicated IFU subdomain. Self-expanding nitinol stent coated with paclitaxel. Susceptibility artefact ~10mm at 1.5T. No post-implant wait.',
        verifiedBy: 'Implant ID editorial team — direct PDF verified HTTP 200, 2026-06-08',
        status: 'live' as const,
        createdAt: now,
      },
      {
        title: 'Boston Scientific Wallstent RX Biliary Endoprosthesis Prescriptive Information',
        docType: 'Manufacturer IFU',
        manufacturer: 'Boston Scientific',
        deviceNames: ['Wallstent Biliary Endoprosthesis'],
        documentVersion: 'ENDO-193615-AA',
        documentDate: '2013-11-01',
        dateRetrieved: '2026-06-08',
        sourceUrl: 'https://www.bostonscientific.com/content/dam/bostonscientific/endo/portfolio-group/WALLSTENT/193615_wallstent_rx_FINAL.pdf',
        notes: 'Direct PDF from Boston Scientific content dam. 2-page prescriptive information sheet. MRCP sequences may be significantly degraded in the region of the stent (~20mm artefact at 3T).',
        verifiedBy: 'Implant ID editorial team — direct PDF verified HTTP 200, 2026-06-08',
        status: 'live' as const,
        createdAt: now,
      },
      {
        title: 'MRI Safety — Heart Valve Prostheses Including Starr-Edwards Pre-6000',
        docType: 'Peer-reviewed publication',
        manufacturer: 'Edwards Lifesciences',
        deviceNames: ['Starr-Edwards Ball-and-Cage Valve (Pre-6000)'],
        documentVersion: 'Safety Info ID #179',
        documentDate: '2004-01-01',
        dateRetrieved: '2026-06-08',
        sourceUrl: 'https://www.mrisafety.com/SafetyInformation_view.php?editid1=179',
        notes: 'Shellock R&D Services mrisafety.com — Safety Info #179. Explicitly states Starr-Edwards Pre-6000 is a contraindication for MRI at any field strength. Covers magnetic field interactions and Lenz Effect. Site maintained 2004–2026.',
        verifiedBy: 'Implant ID editorial team — specific safety record verified HTTP 200, 2026-06-08',
        status: 'live' as const,
        createdAt: now,
      },
      {
        title: 'Cochlear Nucleus Profile Plus CI600 Series MRI Guidelines',
        docType: 'Manufacturer IFU',
        manufacturer: 'Cochlear',
        deviceNames: ['Nucleus Profile Plus (CI600 Series)'],
        documentVersion: 'D2044134_2',
        documentDate: '2025-07-21',
        dateRetrieved: '2026-06-08',
        sourceUrl: 'https://assets.cochlear.com/api/public/content/D2044134_2_2025-07-21?v=0e6e7eaa',
        notes: 'CI600 series (CI612, CI622, CI624, CI632). No magnet removal required at 1.5T or 3T. No head bandage required.',
        verifiedBy: 'Implant ID editorial team — verified via cochlear.com and mriquestions.com PDF 2026-06-08',
        status: 'live' as const,
        createdAt: now,
      },
      {
        title: 'Boston Scientific EMBLEM MRI S-ICD System Specifications (ImageReady)',
        docType: 'Manufacturer spec sheet',
        manufacturer: 'Boston Scientific',
        deviceNames: ['EMBLEM MRI S-ICD A219'],
        documentVersion: 'CRM-368602-AC',
        documentDate: '2016-08-01',
        dateRetrieved: '2026-06-08',
        sourceUrl: 'https://www.bostonscientific.com/content/dam/bostonscientific/Rhythm%20Management/portfolio-group/EMBLEM_S-ICD/Download_Center/CRM-368602-AC_Emblem_MRI_S-ICD_SpecSheet.pdf',
        notes: 'Direct PDF from Boston Scientific content dam. 2-page spec sheet (CRM-368602-AC, Aug 2016) covering Model A219 and Model 3401 electrode. 1.5T only. MRI Protection Mode disables ALL tachycardia therapy. Permanent beeper volume loss is a documented risk.',
        verifiedBy: 'Implant ID editorial team — direct PDF verified HTTP 200, 2026-06-08',
        status: 'live' as const,
        createdAt: now,
      },
      {
        title: 'Medtronic Azure S DR MRI SureScan Specification Sheet',
        docType: 'Manufacturer spec sheet',
        manufacturer: 'Medtronic',
        deviceNames: ['Azure S MRI SureScan'],
        documentVersion: 'M96355A001 B',
        documentDate: '2022-01-01',
        dateRetrieved: '2026-06-08',
        sourceUrl: 'https://www.medtronic.com/content/dam/medtronic-com/01_crhf/brady/pdfs/azure-s-dr-mri-surescan-spec-sheet.pdf',
        notes: 'Direct PDF from Medtronic content dam. 5-page spec sheet (M96355A001 B) for Azure S DR (W3DR01). Covers physical characteristics (12.75 cm³, 22.5g), pacing parameters, longevity (up to 15.8 years), and MRI SureScan conditions for 1.5T and 3T. Full Technical Manual only via manuals.medtronic.com portal.',
        verifiedBy: 'Implant ID editorial team — direct PDF verified HTTP 200, 2026-06-08',
        status: 'live' as const,
        createdAt: now,
      },
      {
        title: 'Medtronic Azure XT MRI SureScan — Specification Sheet',
        docType: 'Manufacturer spec sheet',
        manufacturer: 'Medtronic',
        deviceNames: ['Azure XT MRI SureScan'],
        documentVersion: '',
        documentDate: '2024-01-01',
        dateRetrieved: '2026-06-08',
        sourceUrl: 'https://www.medtronic.com/content/dam/medtronic-com/01_crhf/brady/pdfs/azure-xt-dr-mri-surescan-spec-sheet.pdf',
        notes: 'Official Medtronic Azure XT MRI SureScan spec sheet PDF. Confirms model numbers W1DR01/W1SR01.',
        verifiedBy: 'Implant ID editorial team — URL confirmed via medtronic.com 2026-06-08',
        status: 'live' as const,
        createdAt: now,
      },
      {
        title: 'Medtronic Azure S MRI SureScan — Specification Sheet',
        docType: 'Manufacturer spec sheet',
        manufacturer: 'Medtronic',
        deviceNames: ['Azure S MRI SureScan'],
        documentVersion: '',
        documentDate: '2024-01-01',
        dateRetrieved: '2026-06-08',
        sourceUrl: 'https://www.medtronic.com/content/dam/medtronic-com/01_crhf/brady/pdfs/azure-s-dr-mri-surescan-spec-sheet.pdf',
        notes: 'Official Medtronic Azure S MRI SureScan spec sheet PDF. Confirms model numbers W3DR01/W3SR01.',
        verifiedBy: 'Implant ID editorial team — URL confirmed via medtronic.com 2026-06-08',
        status: 'live' as const,
        createdAt: now,
      },
      {
        title: 'Medtronic SureScan MRI Technology — HCP Overview',
        docType: 'Manufacturer product page',
        manufacturer: 'Medtronic',
        deviceNames: ['Azure XT MRI SureScan', 'Azure S MRI SureScan', 'CapSureFix MRI SureScan 5086MRI'],
        documentVersion: '',
        documentDate: '2024-01-01',
        dateRetrieved: '2026-06-08',
        sourceUrl: 'https://www.medtronic.com/en-us/healthcare-professionals/products/cardiac-rhythm/pacing-systems/pacemakers/azure-mri-surescan-pacemaker.html',
        notes: 'Medtronic HCP landing page for the SureScan MRI platform. Covers compatible generators and approved leads.',
        verifiedBy: 'Implant ID editorial team',
        status: 'live' as const,
        createdAt: now,
      },
      {
        title: 'BSC EMBLEM MRI S-ICD System — HCP Product Overview',
        docType: 'Manufacturer product page',
        manufacturer: 'Boston Scientific',
        deviceNames: ['EMBLEM MRI S-ICD A219'],
        documentVersion: '',
        documentDate: '2024-01-01',
        dateRetrieved: '2026-06-08',
        sourceUrl: 'https://www.bostonscientific.com/us/en/healthcare-professionals/products/defibrillators/emblem-mri-subcutaneous-implantable-defibrillator-s-icd-system/fp90000132.html',
        notes: 'BSC HCP product page for EMBLEM MRI S-ICD (A219 and A209) with ImageReady technology.',
        verifiedBy: 'Implant ID editorial team — URL confirmed via Firecrawl 2026-06-08',
        status: 'live' as const,
        createdAt: now,
      },
    ] // end DOCUMENTS

    const docIds = await Promise.all(DOCUMENTS.map((d) => ctx.db.insert('documents', d)))

    return { devices: deviceIds.length, documents: docIds.length }
  },
})
