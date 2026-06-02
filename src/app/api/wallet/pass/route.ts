/**
 * GET /api/wallet/pass
 * Generates a signed Apple Wallet .pkpass for the authenticated patient.
 *
 * Required Vercel env vars:
 *   APPLE_PASS_TYPE_ID      e.g. pass.io.implantid.patient
 *   APPLE_TEAM_ID           10-char team ID (e.g. 43QC4SK96C)
 *   APPLE_PASS_CERT         base64 of the .p12 signing certificate
 *   APPLE_PASS_CERT_PASSWORD passphrase for the .p12 (omit / leave blank if none)
 *   APPLE_WWDR_CERT         base64 of the Apple WWDR G4 .cer certificate
 */

export const runtime = 'nodejs'

import { auth }        from '@clerk/nextjs/server'
import { fetchQuery }  from 'convex/nextjs'
import { api }         from '../../../../../convex/_generated/api'
import { PKPass }      from 'passkit-generator'
import { readFileSync } from 'fs'
import { join }         from 'path'
// node-forge is bundled with passkit-generator
// eslint-disable-next-line @typescript-eslint/no-require-imports
const forge = require('node-forge')

// ── Load pre-converted PNG assets from /public ────────────────────────────────
// These were generated from the SVGs using sharp (see scripts/convert-pass-images.js)
function pub(name: string) {
  return readFileSync(join(process.cwd(), 'public', name))
}

const ICON_SM         = pub('icon-29.png')
const ICON_MD         = pub('icon-58.png')
const ICON_LG         = pub('icon-87.png')
// White logo — shows clearly on coloured card backgrounds
const LOGO_SM = pub('wallet-logo.png')
const LOGO_MD = pub('wallet-logo@2x.png')

const MRI_LABEL: Record<string, string> = {
  safe: 'MR Safe', conditional: 'MR Conditional', unsafe: 'MR Unsafe — Do Not Scan',
}
const MRI_BG: Record<string, string> = {
  safe:        'rgb(21,128,61)',    // green
  conditional: 'rgb(220,76,0)',    // deep orange
  unsafe:      'rgb(185,28,28)',   // red
}
const PENDING_BG = 'rgb(100,116,139)'
const DEFAULT_BG = 'rgb(41,134,159)'
const WHITE      = 'rgb(255,255,255)'

/** Extract PEM cert + key from a .p12 buffer using node-forge */
function parsePkcs12(p12Buffer: Buffer, passphrase: string): { certPem: string; keyPem: string } {
  const p12Der  = forge.util.createBuffer(p12Buffer.toString('binary'))
  const p12Asn1 = forge.asn1.fromDer(p12Der)
  const p12     = forge.pkcs12.pkcs12FromAsn1(p12Asn1, false, passphrase || null)

  // Extract certificate
  const certBags  = p12.getBags({ bagType: forge.pki.oids.certBag })
  const certBag   = certBags[forge.pki.oids.certBag]?.[0]
  if (!certBag?.cert) throw new Error('No certificate found in .p12 file')
  const certPem   = forge.pki.certificateToPem(certBag.cert)

  // Extract private key
  const keyBags   = p12.getBags({ bagType: forge.pki.oids.pkcs8ShroudedKeyBag })
  const keyBag    = keyBags[forge.pki.oids.pkcs8ShroudedKeyBag]?.[0]
  if (!keyBag?.key)  throw new Error('No private key found in .p12 file')
  const keyPem    = forge.pki.privateKeyToPem(keyBag.key)

  return { certPem, keyPem }
}

/** Convert a DER (.cer) buffer to PEM string */
function derToPem(derBuffer: Buffer): string {
  const b64  = derBuffer.toString('base64')
  const body = b64.match(/.{1,64}/g)!.join('\n')
  return `-----BEGIN CERTIFICATE-----\n${body}\n-----END CERTIFICATE-----\n`
}

export async function GET() {
  // ── Auth ──────────────────────────────────────────────────────────────────
  const clerkAuth = await auth()
  if (!clerkAuth.userId) return new Response('Unauthorised', { status: 401 })

  const convexToken = await clerkAuth.getToken({ template: 'convex' })

  // ── Patient data ──────────────────────────────────────────────────────────
  const [patient, safety] = await Promise.all([
    fetchQuery(api.patients.getMyPatient,       {}, { token: convexToken ?? undefined }),
    fetchQuery(api.patients.getMyImplantSafety, {}, { token: convexToken ?? undefined }),
  ])
  if (!patient) return new Response('Patient not found', { status: 404 })

  // ── Apple credentials ─────────────────────────────────────────────────────
  const passTypeId = process.env.APPLE_PASS_TYPE_ID
  const teamId     = process.env.APPLE_TEAM_ID
  const certB64    = process.env.APPLE_PASS_CERT
  const certPwd    = process.env.APPLE_PASS_CERT_PASSWORD ?? ''
  const wwdrB64    = process.env.APPLE_WWDR_CERT

  if (!passTypeId || !teamId || !certB64 || !wwdrB64) {
    return Response.json({
      error:    'Apple Wallet not configured',
      missing:  [
        !passTypeId && 'APPLE_PASS_TYPE_ID',
        !teamId     && 'APPLE_TEAM_ID',
        !certB64    && 'APPLE_PASS_CERT',
        !wwdrB64    && 'APPLE_WWDR_CERT',
      ].filter(Boolean),
    }, { status: 503 })
  }

  // ── Build pass content ────────────────────────────────────────────────────
  const isPending  = patient.verificationStatus !== 'active'
  const mriLabel   = safety ? (MRI_LABEL[safety] ?? 'MRI status unknown') : (isPending ? 'Pending verification' : 'Not assessed')
  const bgColor    = isPending ? PENDING_BG : (safety ? (MRI_BG[safety] ?? DEFAULT_BG) : DEFAULT_BG)
  const fullName   = `${patient.firstName} ${patient.lastName}`
  const deviceName = patient.selfReportedDevice ?? 'Not recorded'

  const passJson = {
    formatVersion:      1,
    passTypeIdentifier: passTypeId,
    serialNumber:       patient.implantIdCode,
    teamIdentifier:     teamId,
    organizationName:   'Implant ID',
    description:        'Implant ID Patient Pass',
    // No logoText — the logo image is the brand; text next to it causes overlap
    foregroundColor:    WHITE,
    backgroundColor:    bgColor,
    labelColor:         'rgb(255,220,180)',
    barcodes: [
      {
        message:         `https://portal.implantid.io/scan/${patient.implantIdCode}`,
        format:          'PKBarcodeFormatQR',
        messageEncoding: 'iso-8859-1',
        altText:         patient.implantIdCode,
      },
    ],
    generic: {
      // headerFields: top-right — keep very short so it doesn't overlap the logo
      headerFields: [
        {
          key:   'mriShort',
          label: 'MRI',
          value: safety === 'safe' ? 'SAFE' : safety === 'conditional' ? 'CONDITIONAL' : safety === 'unsafe' ? 'UNSAFE' : 'PENDING',
        },
      ],
      // primaryField: largest text — patient name is most immediately useful
      primaryFields: [
        { key: 'patientName', label: 'PATIENT', value: fullName },
      ],
      // secondaryFields: MRI status full label + device name
      secondaryFields: [
        { key: 'mriStatus', label: 'MRI STATUS', value: mriLabel },
        { key: 'device',    label: 'DEVICE',     value: deviceName },
      ],
      // auxiliaryFields: implant date + surgeon
      auxiliaryFields: [
        ...(patient.selfReportedImplantYear ? [{
          key:   'implantDate',
          label: 'IMPLANTED',
          value: patient.selfReportedImplantMonth
            ? `${patient.selfReportedImplantMonth}/${patient.selfReportedImplantYear}`
            : patient.selfReportedImplantYear,
        }] : []),
        ...(patient.selfReportedSurgeon ? [{
          key:   'surgeon',
          label: 'SURGEON',
          value: patient.selfReportedSurgeon,
        }] : []),
        { key: 'implantId', label: 'IMPLANT ID', value: patient.implantIdCode },
        ...(patient.contrastAllergy ? [{
          key:   'allergyFront',
          label: 'CONTRAST ALLERGY',
          value: patient.contrastAllergyNote
            ? patient.contrastAllergyNote.slice(0, 40)
            : 'Documented — notify radiology',
        }] : []),
      ],
      backFields: [
        {
          key:   'instructions',
          label: isPending ? '⚠ UNVERIFIED RECORD' : 'IMPORTANT',
          value: isPending
            ? 'This record has NOT been verified. Do not use to make clinical MRI decisions until verification is complete.'
            : 'Always show this card to MRI staff before any scan. Your radiographer will review conditions with you.',
          textAlignment: 'PKTextAlignmentLeft',
        },
        {
          key:   'emergency',
          label: 'EMERGENCY',
          value: 'If found unconscious, show this card to medical staff immediately.',
          textAlignment: 'PKTextAlignmentLeft',
        },
        ...(patient.contrastAllergy ? [{
          key:   'allergy',
          label: '⚠ CONTRAST ALLERGY',
          value: patient.contrastAllergyNote ?? 'Documented contrast allergy — inform radiology before any contrast.',
          textAlignment: 'PKTextAlignmentLeft' as const,
        }] : []),
        ...(patient.emergencyContactName ? [{
          key:   'emergency_contact',
          label: `EMERGENCY CONTACT${patient.emergencyContactRelation ? ` (${patient.emergencyContactRelation})` : ''}`,
          value: `${patient.emergencyContactName}${patient.emergencyContactPhone ? ` · ${patient.emergencyContactPhone}` : ''}`,
          textAlignment: 'PKTextAlignmentLeft' as const,
        }] : []),
        {
          key:   'portal',
          label: 'FULL RECORD',
          value: `portal.implantid.io/scan/${patient.implantIdCode}`,
          textAlignment: 'PKTextAlignmentLeft',
        },
      ],
    },
  }

  // ── Generate signed .pkpass ───────────────────────────────────────────────
  try {
    // Parse .p12 → separate PEM cert + key using node-forge
    const p12Buffer = Buffer.from(certB64, 'base64')
    const { certPem, keyPem } = parsePkcs12(p12Buffer, certPwd)

    // WWDR cert: convert DER to PEM if needed
    const wwdrBuffer = Buffer.from(wwdrB64, 'base64')
    const wwdrPem    = wwdrBuffer.toString('utf-8').includes('BEGIN CERTIFICATE')
      ? wwdrBuffer.toString('utf-8')
      : derToPem(wwdrBuffer)

    const pass = new PKPass(
      // Files — pass.json + icon images (no thumbnail — was causing MRI badge to clip)
      {
        'pass.json':      Buffer.from(JSON.stringify(passJson)),
        'icon.png':       ICON_SM,
        'icon@2x.png':    ICON_MD,
        'icon@3x.png':    ICON_LG,
        'logo.png':       LOGO_SM,
        'logo@2x.png':    LOGO_MD,
      },
      // Certificates — all in PEM format
      {
        wwdr:       wwdrPem,
        signerCert: certPem,
        signerKey:  keyPem,
        signerKeyPassphrase: certPwd || undefined,
      },
    )

    const buffer = pass.getAsBuffer()

    return new Response(new Uint8Array(buffer), {
      headers: {
        'Content-Type':        'application/vnd.apple.pkpass',
        'Content-Disposition': `attachment; filename="implant-id-${patient.implantIdCode}.pkpass"`,
        'Cache-Control':       'no-store',
      },
    })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[wallet/pass] Generation failed:', msg)
    return new Response(
      JSON.stringify({ error: 'Pass generation failed', detail: msg }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
}

