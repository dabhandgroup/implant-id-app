/**
 * POST /api/devices/scrape
 *
 * Calls the Anthropic API server-side (keeps ANTHROPIC_API_KEY out of the browser)
 * to extract structured MRI safety device data from the manufacturer's IFU / web sources.
 *
 * Body: { manufacturer, model, deviceType, ifuUrl?, ifuText?, useWebSearch? }
 * Returns: Structured JSON with device fields + provenance + confidence
 */

export const runtime = 'nodejs'

// ── Field schema per device type (mirrors the intake tool) ──────────────────

const ACTIVE_FIELDS = [
  'device_name','manufacturer','model_number','device_type','device_subtype',
  'mri_classification','field_strength_15t','field_strength_30t','field_strength_70t',
  'whole_body_sar_limit','local_sar_limit_head','b1rms_limit',
  'slew_rate_limit','gradient_limit','max_scan_time_per_sequence',
  'post_implant_wait_days','programming_mode_required',
  'contraindications','special_conditions','approved_regions',
]

const PASSIVE_FIELDS = [
  'device_name','manufacturer','model_number','device_type','device_subtype',
  'mri_classification','field_strength_15t','field_strength_30t','field_strength_70t',
  'artifact_field_size_cm','positioning_restrictions',
  'contraindications','approved_regions',
]

const SCHEMA_FIELDS: Record<string, string[]> = {
  active:  ACTIVE_FIELDS,
  passive: PASSIVE_FIELDS,
  temp:    PASSIVE_FIELDS,
  legacy:  PASSIVE_FIELDS,
}

// ── System prompt (adapted from the intake tool v4.1) ───────────────────────

function buildSystemPrompt(opts: { deviceType: string; useWebSearch: boolean }) {
  const fields = SCHEMA_FIELDS[opts.deviceType] ?? ACTIVE_FIELDS
  const base = `You are an expert MRI safety data extraction assistant for Implant ID. Strict precision rules:
- NEVER infer, guess, estimate, or fabricate. If the source does not state a value, return null.
- Distinguish "Not Stated" (field applies, absent in source) from "N/A" (field does not apply).
- A test observation (e.g. "tested 15 min at 3T") is NOT a clinical limit.
- MR Unsafe cannot be overridden by any parameter.
- For EVERY populated field, provide provenance: the exact verbatim source sentence(s) and which source.
- mri_classification must be exactly one of: "MR Safe" | "MR Conditional" | "MR Unsafe" | "MR Unknown"
- Output ONLY valid JSON, no markdown, no preamble. Shape:
{
  "<schema_field>": <value|null>,
  "_provenance": { "<field>": { "source_id": "S1", "quote": "<exact sentence>", "note": "<optional>" } },
  "_sources_consulted": [{ "id": "S1", "type": "ifu|oem-web|thirdparty", "title": "...", "url": "...", "accessible": true }],
  "_pdf_links": ["<direct PDF URL>"],
  "_conflicts": [{ "field": "<name>", "values": [{ "value": "...", "source_id": "S1" }] }],
  "_field_confidence": { "<field>": "High|Medium|Low" },
  "needs_review": ["<field>"],
  "confidence_pct": <0-100>
}

IMPORTANT: "_pdf_links" must contain every direct .pdf URL you encounter — IFUs, MRI Technical Manuals, product leaflets, safety guides. These are shown to clinicians for verification. If a page links to a PDF, include the full PDF URL, not the page URL. If no PDFs are found, return an empty array.
Units: SAR W/kg, B1+rms µT, slew rate T/m/s.`

  let note = `\n\nDevice type: ${opts.deviceType}. Populate these schema fields (use exactly these keys): ${fields.join(', ')}.`

  if (opts.useWebSearch) {
    note += `\n\nYou have web search. Find the manufacturer's official IFU / MRI Technical Manual first; prefer OEM IFU above all. Record every source in _sources_consulted with URL and whether you could access it (accessible:false for paywall/login).`
  } else {
    note += `\n\nSINGLE-SOURCE MODE: use only the IFU URL or pasted text provided.`
  }

  return base + note
}

// ── Map AI output → our Convex device schema ─────────────────────────────────

function mapToDeviceSchema(parsed: Record<string, unknown>, deviceType: string, ifuUrl?: string) {
  const cls = String(parsed.mri_classification ?? '').toLowerCase()
  const mriStatus =
    cls.includes('unsafe') ? 'unsafe' :
    cls.includes('conditional') ? 'conditional' :
    cls.includes('safe') ? 'safe' : 'unknown'

  const classification =
    deviceType === 'active'  ? 'active'  :
    deviceType === 'legacy'  ? 'legacy'  : 'passive'

  const fieldStrengths = [
    parsed.field_strength_15t === true ? '1.5T' : null,
    parsed.field_strength_30t === true ? '3.0T' : null,
    parsed.field_strength_70t === true ? '7.0T' : null,
  ].filter(Boolean).join(', ') || null

  return {
    manufacturer:      String(parsed.manufacturer ?? ''),
    model:             String(parsed.device_name ?? parsed.model_number ?? ''),
    deviceType:        String(parsed.device_type ?? parsed.device_subtype ?? deviceType),
    classification:    classification as 'active' | 'passive' | 'legacy',
    mriStatus:         mriStatus as 'safe' | 'conditional' | 'unsafe' | 'unknown',
    fieldStrengths:    fieldStrengths ?? undefined,
    sarLimit:          parsed.whole_body_sar_limit != null ? String(parsed.whole_body_sar_limit) : undefined,
    b1RmsLimit:        parsed.b1rms_limit != null ? String(parsed.b1rms_limit) : undefined,
    slewRateLimit:     parsed.slew_rate_limit != null ? String(parsed.slew_rate_limit) : undefined,
    contraindications: parsed.contraindications != null ? String(parsed.contraindications) : undefined,
    approvedRegions:   Array.isArray(parsed.approved_regions)
                         ? (parsed.approved_regions as string[])
                         : undefined,
    // Primary source URL: first extracted PDF, then the reference URL provided
    sourceUrl: Array.isArray(parsed._pdf_links) && (parsed._pdf_links as string[]).length > 0
                 ? (parsed._pdf_links as string[])[0]
                 : ifuUrl ?? undefined,
    pdfLinks: Array.isArray(parsed._pdf_links) ? (parsed._pdf_links as string[]) : [],
  }
}

// ── Route handler ─────────────────────────────────────────────────────────────

export async function POST(request: Request) {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    return Response.json({ error: 'ANTHROPIC_API_KEY not configured in Vercel environment' }, { status: 503 })
  }

  const body = await request.json() as {
    manufacturer:  string
    model:         string
    deviceType:    string
    ifuUrl?:       string
    ifuText?:      string
    useWebSearch?: boolean
  }

  const { manufacturer, model, deviceType = 'active', ifuUrl, ifuText, useWebSearch = true } = body

  if (!manufacturer && !model && !ifuUrl && !ifuText) {
    return Response.json({ error: 'Provide manufacturer + model, an IFU URL, or paste IFU text' }, { status: 400 })
  }

  // Build user message
  const parts = [
    manufacturer ? `Manufacturer: ${manufacturer}` : '',
    model        ? `Model: ${model}` : '',
    ifuUrl       ? `Reference URL: ${ifuUrl}` : '',
    ifuText      ? `\nPasted IFU text:\n${ifuText}` : '',
  ].filter(Boolean)
  const userMsg = parts.join('\n')

  const anthropicBody: Record<string, unknown> = {
    model:      'claude-opus-4-5',
    max_tokens: 4096,
    system:     buildSystemPrompt({ deviceType, useWebSearch }),
    messages:   [{ role: 'user', content: userMsg }],
  }

  if (useWebSearch) {
    anthropicBody.tools = [{ type: 'web_search_20250305', name: 'web_search' }]
  }

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method:  'POST',
    headers: {
      'Content-Type':      'application/json',
      'x-api-key':         apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify(anthropicBody),
  })

  if (!res.ok) {
    const errText = await res.text()
    console.error('[scrape] Anthropic API error:', res.status, errText)
    return Response.json({ error: `Anthropic API error ${res.status}` }, { status: 502 })
  }

  const data = await res.json() as { content?: Array<{ type: string; text?: string }> }

  // Extract JSON from response
  const rawText = (data.content ?? [])
    .filter(b => b.type === 'text')
    .map(b => b.text ?? '')
    .join('')
    .replace(/```json\n?/g, '')
    .replace(/```\n?/g, '')
    .trim()

  const start = rawText.indexOf('{')
  const end   = rawText.lastIndexOf('}')
  if (start === -1 || end === -1) {
    return Response.json({ error: 'Model did not return valid JSON. Try pasting IFU text directly.' }, { status: 422 })
  }

  let parsed: Record<string, unknown>
  try {
    parsed = JSON.parse(rawText.slice(start, end + 1))
  } catch {
    return Response.json({ error: 'Could not parse model output as JSON.' }, { status: 422 })
  }

  const mapped = mapToDeviceSchema(parsed, deviceType, ifuUrl)

  return Response.json({
    mapped,           // ready to pass straight to addDevice mutation
    raw:    parsed,   // full AI output with provenance, confidence, sources
    status: 'ok',
  })
}
