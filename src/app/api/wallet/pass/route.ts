/**
 * GET /api/wallet/pass
 *
 * Generates and returns an Apple Wallet .pkpass file for the authenticated patient.
 *
 * Requires these environment variables in Vercel / Convex:
 *   APPLE_PASS_TYPE_ID      — e.g. pass.io.implantid.patient  (from Apple Developer Portal)
 *   APPLE_TEAM_ID           — 10-char Apple Team Identifier
 *   APPLE_PASS_CERT         — base64-encoded .p12 signing certificate
 *   APPLE_PASS_CERT_PASSWORD — passphrase for the .p12 (leave blank if none)
 *   APPLE_WWDR_CERT         — base64-encoded Apple WWDR G4 certificate
 *
 * How to get these:
 *   1. Enrol in Apple Developer Program (developer.apple.com)
 *   2. Certificates, IDs & Profiles → Identifiers → Pass Type IDs → Create new
 *   3. Generate a pass signing certificate for that ID → download .cer → export as .p12
 *   4. Download the WWDR (Worldwide Developer Relations) G4 cert from Apple
 *   5. base64-encode both files: openssl base64 -in cert.p12 -out cert.b64
 *   6. Add all values as Vercel environment variables
 */

import { auth }        from '@clerk/nextjs/server'
import { fetchQuery }  from 'convex/nextjs'
import { api }         from '../../../../convex/_generated/api'
import { PKPass }      from 'passkit-generator'

// ── MRI status helpers ────────────────────────────────────────────────────────

const MRI_LABEL: Record<string, string> = {
  safe:        'MR Safe',
  conditional: 'MR Conditional',
  unsafe:      'MR Unsafe — Do Not Scan',
}

const MRI_BG_RGB: Record<string, string> = {
  safe:        'rgb(21,128,61)',    // green
  conditional: 'rgb(180,83,9)',     // amber
  unsafe:      'rgb(185,28,28)',    // red
}

const PENDING_BG  = 'rgb(100,116,139)'   // slate-500
const DEFAULT_BG  = 'rgb(41,134,159)'    // implant ID teal
const WHITE_TEXT  = 'rgb(255,255,255)'
const LIGHT_LABEL = 'rgb(220,240,248)'

// ── Route handler ─────────────────────────────────────────────────────────────

export const runtime = 'nodejs'

export async function GET() {
  // ── Auth ──────────────────────────────────────────────────────────────────
  const clerkAuth = await auth()
  if (!clerkAuth.userId) {
    return new Response('Unauthorised', { status: 401 })
  }

  const convexToken = await clerkAuth.getToken({ template: 'convex' })

  // ── Patient data ──────────────────────────────────────────────────────────
  const [patient, safety] = await Promise.all([
    fetchQuery(api.patients.getMyPatient,       {}, { token: convexToken ?? undefined }),
    fetchQuery(api.patients.getMyImplantSafety, {}, { token: convexToken ?? undefined }),
  ])

  if (!patient) {
    return new Response('Patient record not found', { status: 404 })
  }

  // ── Apple credential check ────────────────────────────────────────────────
  const passTypeId  = process.env.APPLE_PASS_TYPE_ID
  const teamId      = process.env.APPLE_TEAM_ID
  const certB64     = process.env.APPLE_PASS_CERT
  const certPwd     = process.env.APPLE_PASS_CERT_PASSWORD ?? ''
  const wwdrB64     = process.env.APPLE_WWDR_CERT

  if (!passTypeId || !teamId || !certB64 || !wwdrB64) {
    return Response.json({
      error:    'Apple Wallet not yet configured',
      message:  'Your clinic administrator needs to configure Apple Developer credentials.',
      required: ['APPLE_PASS_TYPE_ID', 'APPLE_TEAM_ID', 'APPLE_PASS_CERT', 'APPLE_WWDR_CERT'],
    }, { status: 503 })
  }

  // ── Pass content ──────────────────────────────────────────────────────────
  const isPending   = patient.verificationStatus !== 'active'
  const mriLabel    = safety ? (MRI_LABEL[safety] ?? 'MR Status Unknown') : (isPending ? 'Pending Verification' : 'Not assessed')
  const bgColor     = isPending ? PENDING_BG : (safety ? (MRI_BG_RGB[safety] ?? DEFAULT_BG) : DEFAULT_BG)
  const fullName    = `${patient.firstName} ${patient.lastName}`
  const deviceName  = patient.selfReportedDevice ?? 'Not recorded'

  const passJson = {
    formatVersion:      1,
    passTypeIdentifier: passTypeId,
    serialNumber:       patient.implantIdCode,
    teamIdentifier:     teamId,
    organizationName:   'Implant ID',
    description:        'Implant ID Patient Pass',
    logoText:           'Implant ID',

    foregroundColor: WHITE_TEXT,
    backgroundColor: bgColor,
    labelColor:      LIGHT_LABEL,

    barcodes: [
      {
        message:         patient.implantIdCode,
        format:          'PKBarcodeFormatQR',
        messageEncoding: 'iso-8859-1',
        altText:         patient.implantIdCode,
      },
    ],

    generic: {
      primaryField: [
        {
          key:   'implantId',
          label: 'IMPLANT ID',
          value: patient.implantIdCode,
        },
      ],
      secondaryFields: [
        {
          key:   'mriStatus',
          label: 'MRI STATUS',
          value: mriLabel,
        },
        {
          key:   'patientName',
          label: 'PATIENT',
          value: fullName,
        },
      ],
      auxiliaryFields: [
        {
          key:   'device',
          label: 'DEVICE',
          value: deviceName,
        },
        ...(patient.selfReportedImplantYear ? [{
          key:   'implantDate',
          label: 'IMPLANTED',
          value: patient.selfReportedImplantMonth
            ? `${patient.selfReportedImplantMonth}/${patient.selfReportedImplantYear}`
            : patient.selfReportedImplantYear,
        }] : []),
      ],
      backFields: [
        {
          key:         'instructions',
          label:       isPending ? '⚠ UNVERIFIED RECORD' : 'IMPORTANT',
          value:       isPending
            ? 'This implant record has not yet been verified by clinical staff. Do NOT use this pass to make MRI decisions until verification is complete.'
            : 'Always show this card to MRI staff before any scan. Your radiographer will confirm conditions with you.',
          textAlignment: 'PKTextAlignmentLeft',
        },
        {
          key:   'emergency',
          label: 'EMERGENCY',
          value: 'If found unconscious or unable to communicate, show this card to medical staff immediately.',
          textAlignment: 'PKTextAlignmentLeft',
        },
        ...(patient.contrastAllergy ? [{
          key:   'allergy',
          label: '⚠ CONTRAST ALLERGY',
          value: patient.contrastAllergyNote ?? 'Documented contrast allergy — inform radiology before any contrast administration.',
          textAlignment: 'PKTextAlignmentLeft' as const,
        }] : []),
        {
          key:   'portal',
          label: 'FULL RECORD',
          value: `https://portal.implantid.io — Sign in with ${patient.firstName.toLowerCase()}`,
          textAlignment: 'PKTextAlignmentLeft',
        },
      ],
    },
  }

  // ── Generate pass ─────────────────────────────────────────────────────────
  try {
    const signerCert = Buffer.from(certB64, 'base64')
    const wwdrCert   = Buffer.from(wwdrB64, 'base64')

    const pass = new PKPass({}, {
      wwdr:                 wwdrCert,
      signerCert,
      signerKey:            signerCert,    // .p12 contains both cert + key
      signerKeyPassphrase:  certPwd || undefined,
    })

    // Apply pass fields
    Object.assign(pass, passJson)
    pass.type = 'generic'

    const buffer = pass.getAsBuffer()

    return new Response(buffer, {
      headers: {
        'Content-Type':        'application/vnd.apple.pkpass',
        'Content-Disposition': `attachment; filename="implant-id-${patient.implantIdCode}.pkpass"`,
        'Cache-Control':       'no-store',
      },
    })
  } catch (err) {
    console.error('[wallet/pass] Pass generation failed:', err)
    return new Response('Pass generation failed — check Apple credentials', { status: 500 })
  }
}
