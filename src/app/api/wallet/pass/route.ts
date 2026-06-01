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
import { deflateSync } from 'zlib'
// node-forge is bundled with passkit-generator
// eslint-disable-next-line @typescript-eslint/no-require-imports
const forge = require('node-forge')

// ── PNG generation (required by Apple Wallet) ─────────────────────────────────

function crc32(buf: Buffer): number {
  const table = new Uint32Array(256)
  for (let i = 0; i < 256; i++) {
    let c = i
    for (let j = 0; j < 8; j++) c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1)
    table[i] = c
  }
  let crc = 0xFFFFFFFF
  for (let i = 0; i < buf.length; i++) crc = table[(crc ^ buf[i]) & 0xFF] ^ (crc >>> 8)
  return (crc ^ 0xFFFFFFFF) >>> 0
}

function pngChunk(type: string, data: Buffer): Buffer {
  const tb  = Buffer.from(type, 'ascii')
  const len = Buffer.allocUnsafe(4); len.writeUInt32BE(data.length)
  const crc = Buffer.allocUnsafe(4); crc.writeUInt32BE(crc32(Buffer.concat([tb, data])))
  return Buffer.concat([len, tb, data, crc])
}

/** Create a minimal solid-colour PNG (RGB, no alpha). */
function makePng(w: number, h: number, r: number, g: number, b: number): Buffer {
  const sig  = Buffer.from([137,80,78,71,13,10,26,10])
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4)
  ihdr[8] = 8; ihdr[9] = 2   // 8-bit RGB

  const rows = Buffer.alloc(h * (1 + w * 3))
  for (let y = 0; y < h; y++) {
    const off = y * (1 + w * 3)
    for (let x = 0; x < w; x++) {
      rows[off + 1 + x * 3]     = r
      rows[off + 1 + x * 3 + 1] = g
      rows[off + 1 + x * 3 + 2] = b
    }
  }

  return Buffer.concat([
    sig,
    pngChunk('IHDR', ihdr),
    pngChunk('IDAT', deflateSync(rows)),
    pngChunk('IEND', Buffer.alloc(0)),
  ])
}

// Implant ID teal: #29869F (41,134,159)
const ICON_SM  = makePng(29,  29,  41, 134, 159)   // icon.png
const ICON_MD  = makePng(58,  58,  41, 134, 159)   // icon@2x.png
const ICON_LG  = makePng(87,  87,  41, 134, 159)   // icon@3x.png
const LOGO_SM  = makePng(160, 50,  41, 134, 159)   // logo.png
const LOGO_MD  = makePng(320, 100, 41, 134, 159)   // logo@2x.png

const MRI_LABEL: Record<string, string> = {
  safe: 'MR Safe', conditional: 'MR Conditional', unsafe: 'MR Unsafe — Do Not Scan',
}
const MRI_BG: Record<string, string> = {
  safe: 'rgb(21,128,61)', conditional: 'rgb(180,83,9)', unsafe: 'rgb(185,28,28)',
}
const PENDING_BG = 'rgb(100,116,139)'
const DEFAULT_BG = 'rgb(41,134,159)'
const WHITE      = 'rgb(255,255,255)'
const LABEL_C    = 'rgb(220,240,248)'

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
    logoText:           'Implant ID',
    foregroundColor:    WHITE,
    backgroundColor:    bgColor,
    labelColor:         LIGHT_LABEL,
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
        { key: 'implantId', label: 'IMPLANT ID', value: patient.implantIdCode },
      ],
      secondaryFields: [
        { key: 'mriStatus',    label: 'MRI STATUS', value: mriLabel },
        { key: 'patientName',  label: 'PATIENT',    value: fullName },
      ],
      auxiliaryFields: [
        { key: 'device', label: 'DEVICE', value: deviceName },
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
      // Files — pass.json + required icon images
      {
        'pass.json':   Buffer.from(JSON.stringify(passJson)),
        'icon.png':    ICON_SM,
        'icon@2x.png': ICON_MD,
        'icon@3x.png': ICON_LG,
        'logo.png':    LOGO_SM,
        'logo@2x.png': LOGO_MD,
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

// Fix missing constant reference
const LIGHT_LABEL = 'rgb(220,240,248)'
