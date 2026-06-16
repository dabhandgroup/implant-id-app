'use client'
import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useMutation, useQuery } from 'convex/react'
import * as XLSX from 'xlsx'
import { api as apiBase } from '../../../../../convex/_generated/api'
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const api = apiBase as any

const API_KEY_STORAGE = 'implantid_anthropic_key'
const MODEL = 'claude-opus-4-8'

const SYSTEM_PROMPT = `You are an AI assistant for Implant ID, a medical device registry platform.
Your job is to help administrators research and add medical implant device data to the catalogue.
You only work with data the user provides — you do not browse the internet or access external sources.

You can help with:
- Researching devices based on data the user has provided or pasted
- Parsing and extracting device data from uploaded PDFs, spec sheets, spreadsheets, images, or pasted text
- Formatting device data into the fields required by the catalogue

Required catalogue fields for each device:
- Manufacturer name
- Device name / model number
- Device type (e.g. Pacemaker, ICD, Cochlear Implant, Hip Replacement, etc.)
- Classification: active (has power source), passive (no power), or legacy (discontinued)
- MRI status: "safe", "conditional", "unsafe" — if truly unknown, use "unknown"

Optional fields (include if found):
- Field strengths (e.g. 1.5T, 3.0T)
- Contraindications / notes

When processing any uploaded file or pasted data, ALWAYS:

1. Show a comparison table for EACH device found:

**Device [N]: [Device Name]**
| Field | Raw data from document | Ready to import |
|---|---|---|
| Manufacturer | [as it appears] | [cleaned/standardised] |
| Model | [as it appears] | [cleaned value] |
| Device Type | [as it appears] | [standardised type] |
| Classification | [if noted] | active / passive / legacy |
| MRI Status | [as it appears] | safe / conditional / unsafe / unknown |
| Field Strengths | [if noted] | [e.g. 1.5T, 3.0T] |
| Contraindications | [if noted] | [summary] |

Flag missing or uncertain fields. MRI status uncertainty must be clearly noted — patient safety issue.

2. After ALL comparison tables, include a machine-readable import block (always, even for one device):

\`\`\`import-json
[
  {
    "manufacturer": "...",
    "model": "...",
    "deviceType": "...",
    "classification": "active",
    "mriStatus": "conditional",
    "fieldStrengths": "1.5T, 3.0T",
    "contraindications": "..."
  }
]
\`\`\`

End with: "Found X device(s). Y ready to import. Z need manual review."

Be concise and factual. Never invent data — only use what is in the provided documents.`

type ApiContent =
  | { type: 'text'; text: string }
  | { type: 'document'; source: { type: 'base64'; media_type: string; data: string } }
  | { type: 'image'; source: { type: 'base64'; media_type: string; data: string } }

interface Message {
  role: 'user' | 'assistant'
  content: string
  apiContent?: ApiContent[]
  isFileImport?: boolean
}

interface AttachedFile {
  name: string
  mimeType: string
  data: string
  isText: boolean
}

interface DeviceImport {
  manufacturer: string
  model: string
  deviceType: string
  classification: 'active' | 'passive' | 'legacy'
  mriStatus: 'safe' | 'conditional' | 'unsafe' | 'unknown'
  fieldStrengths?: string
  contraindications?: string
}

function parseDevicesFromResponse(text: string): DeviceImport[] {
  const match = text.match(/```import-json\s*([\s\S]*?)\s*```/)
  if (!match) return []
  try {
    const parsed = JSON.parse(match[1])
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function stripImportBlock(text: string): string {
  return text.replace(/```import-json[\s\S]*?```/g, '').trim()
}

const SparkleIcon = ({ size = 16, color = 'currentColor' }: { size?: number; color?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.7">
    <path d="m12 3-1.9 5.8a2 2 0 0 1-1.3 1.3L3 12l5.8 1.9a2 2 0 0 1 1.3 1.3L12 21l1.9-5.8a2 2 0 0 1 1.3-1.3L21 12l-5.8-1.9a2 2 0 0 1-1.3-1.3z"/>
  </svg>
)

function MarkdownText({ text }: { text: string }) {
  const formatted = text
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/`(.+?)`/g, '<code style="background:color-mix(in srgb,var(--accent) 10%,transparent);padding:1px 5px;border-radius:4px;font-size:13px;font-family:SF Mono,Monaco,monospace">$1</code>')
    .replace(/\n\n/g, '</p><p style="margin:0 0 10px">')
    .replace(/\n/g, '<br/>')
  return (
    <p style={{ margin: 0, lineHeight: 1.65 }} dangerouslySetInnerHTML={{ __html: formatted }} />
  )
}

export default function AiChatClient() {
  const router = useRouter()
  const bulkInsertDevices = useMutation(api.devices.bulkInsertDevices)

  const [apiKey,        setApiKey]        = useState<string>('')
  const [keyLoaded,     setKeyLoaded]     = useState(false)
  const [messages,      setMessages]      = useState<Message[]>([])
  const [input,         setInput]         = useState('')
  const [loading,       setLoading]       = useState(false)
  const [error,         setError]         = useState('')
  const [isDragging,    setIsDragging]    = useState(false)
  const [attachedFiles, setAttachedFiles] = useState<AttachedFile[]>([])
  const [signedOff,     setSignedOff]     = useState(false)
  const [importing,     setImporting]     = useState<Record<number, 'loading' | 'done' | 'error'>>({})
  const [importErrors,  setImportErrors]  = useState<Record<number, string>>({})

  // Derive parsed devices from the last assistant message so we can pass them
  // to useQuery unconditionally (hooks must not be inside conditionals).
  const _lastMsg = messages.length > 0 ? messages[messages.length - 1] : null
  const _dupPairs = (_lastMsg?.role === 'assistant' && _lastMsg?.isFileImport && !loading)
    ? parseDevicesFromResponse(_lastMsg.content).map(d => ({ manufacturer: d.manufacturer, model: d.model }))
    : []
  const duplicateCheck = useQuery(api.devices.findDuplicates, { pairs: _dupPairs })

  const bottomRef   = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const dragCounter = useRef(0)

  useEffect(() => {
    const stored = localStorage.getItem(API_KEY_STORAGE) ?? ''
    setApiKey(stored)
    setKeyLoaded(true)
  }, [])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  useEffect(() => {
    const el = textareaRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${Math.min(el.scrollHeight, 160)}px`
  }, [input])

  function readFileAsBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve((reader.result as string).split(',')[1])
      reader.onerror = reject
      reader.readAsDataURL(file)
    })
  }

  function readFileAsText(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(reader.result as string)
      reader.onerror = reject
      reader.readAsText(file)
    })
  }

  async function readXLSXAsText(file: File): Promise<string> {
    const buffer = await file.arrayBuffer()
    // SheetJS requires Uint8Array, not ArrayBuffer
    const workbook = XLSX.read(new Uint8Array(buffer), { type: 'array' })
    const MAX_CHARS_PER_SHEET = 80_000
    const parts: string[] = []
    for (const sheetName of workbook.SheetNames) {
      const sheet = workbook.Sheets[sheetName]
      let csv = XLSX.utils.sheet_to_csv(sheet, { skipHidden: true })
      // Strip completely empty rows
      csv = csv.split('\n').filter(r => r.replace(/,/g, '').trim()).join('\n')
      if (!csv.trim()) continue
      const truncated = csv.length > MAX_CHARS_PER_SHEET
      if (truncated) csv = csv.slice(0, MAX_CHARS_PER_SHEET)
      parts.push(`=== Sheet: ${sheetName}${truncated ? ' (truncated — first 80KB)' : ''} ===\n${csv}`)
    }
    return parts.join('\n\n')
  }

  async function processDroppedFiles(files: File[]) {
    setError('')
    const attached: AttachedFile[] = []
    const errs: string[] = []

    for (const file of files) {
      const type = file.type.toLowerCase()
      const name = file.name.toLowerCase()

      const isXLSX = name.endsWith('.xlsx') || name.endsWith('.xls') ||
                     type.includes('spreadsheetml') || type.includes('ms-excel')
      const isText = !isXLSX && (
        type === 'text/csv' || type === 'text/plain' || type === 'text/tsv' ||
        name.endsWith('.csv') || name.endsWith('.tsv') || name.endsWith('.txt')
      )
      const isPDF  = type === 'application/pdf' || name.endsWith('.pdf')
      const isImage = type.startsWith('image/')

      if (isXLSX) {
        try {
          const text = await readXLSXAsText(file)
          attached.push({ name: file.name, mimeType: 'text/csv', data: text, isText: true })
        } catch {
          errs.push(`${file.name} — could not read spreadsheet`)
        }
      } else if (isText) {
        const text = await readFileAsText(file)
        attached.push({ name: file.name, mimeType: file.type || 'text/plain', data: text, isText: true })
      } else if (isPDF) {
        const base64 = await readFileAsBase64(file)
        attached.push({ name: file.name, mimeType: 'application/pdf', data: base64, isText: false })
      } else if (isImage) {
        const base64 = await readFileAsBase64(file)
        attached.push({ name: file.name, mimeType: file.type || 'image/jpeg', data: base64, isText: false })
      } else {
        errs.push(`${file.name} — unsupported format (use PDF, CSV, XLSX, or image)`)
      }
    }

    if (errs.length) setError(errs.join('\n'))
    if (!attached.length) return

    setAttachedFiles(prev => {
      const existing = new Set(prev.map(f => f.name))
      return [...prev, ...attached.filter(f => !existing.has(f.name))]
    })

    const names = attached.map(f => f.name).join(', ')
    setInput(`I've attached: ${names}. Please extract all medical device data and present the comparison table showing what's in the document vs the catalogue import fields.`)
    textareaRef.current?.focus()
  }

  function handleDragEnter(e: React.DragEvent) {
    e.preventDefault()
    dragCounter.current++
    if (dragCounter.current === 1) setIsDragging(true)
  }

  function handleDragLeave(e: React.DragEvent) {
    e.preventDefault()
    dragCounter.current--
    if (dragCounter.current === 0) setIsDragging(false)
  }

  function handleDragOver(e: React.DragEvent) { e.preventDefault() }

  async function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    dragCounter.current = 0
    setIsDragging(false)
    await processDroppedFiles(Array.from(e.dataTransfer.files))
  }

  async function send() {
    const text = input.trim()
    if (!text || loading) return
    setInput('')
    setError('')
    setSignedOff(false)
    setImporting({})
    setImportErrors({})

    const isFileMsg = attachedFiles.length > 0
    const apiContent: ApiContent[] = []

    if (isFileMsg) {
      apiContent.push({ type: 'text', text })
      for (const f of attachedFiles) {
        if (f.isText) {
          apiContent.push({ type: 'text', text: `\n\nFile: ${f.name}\n\`\`\`\n${f.data}\n\`\`\`` })
        } else if (f.mimeType.startsWith('image/')) {
          apiContent.push({ type: 'image', source: { type: 'base64', media_type: f.mimeType, data: f.data } })
        } else {
          apiContent.push({ type: 'document', source: { type: 'base64', media_type: f.mimeType, data: f.data } })
        }
      }
      setAttachedFiles([])
    }

    const newMsg: Message = {
      role: 'user',
      content: text,
      ...(isFileMsg ? { apiContent, isFileImport: true } : {}),
    }
    const updated: Message[] = [...messages, newMsg]
    setMessages(updated)
    setLoading(true)

    try {
      const apiMessages = updated.map(m => ({
        role: m.role,
        content: m.apiContent ?? m.content,
      }))

      const res = await fetch('/api/ai', {
        method: 'POST',
        headers: {
          'Content-Type':   'application/json',
          'x-anthropic-key': apiKey,
        },
        body: JSON.stringify({
          model:      MODEL,
          max_tokens: 4096,
          system:     SYSTEM_PROMPT,
          messages:   apiMessages,
        }),
      })

      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err?.error?.message ?? `API error ${res.status}`)
      }

      const data = await res.json()
      const reply = data.content?.[0]?.text ?? ''
      setMessages(prev => [...prev, { role: 'assistant', content: reply, isFileImport: isFileMsg }])
    } catch (e) {
      setError((e as Error).message ?? 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  async function handleImportDevice(device: DeviceImport, index: number) {
    setImporting(p => ({ ...p, [index]: 'loading' }))
    setImportErrors(p => { const n = { ...p }; delete n[index]; return n })
    try {
      await bulkInsertDevices({
        devices: [{
          name:            `${device.manufacturer} ${device.model}`,
          manufacturer:    device.manufacturer,
          model:           device.model,
          deviceType:      device.deviceType,
          classification:  device.classification ?? 'active',
          mriStatus:       device.mriStatus,
          fieldStrengths:  device.fieldStrengths,
          contraindications: device.contraindications,
        }],
        submitterName:  'Master Admin',
        submitterTitle: 'Master Admin',
        source:         'admin',
      })
      setImporting(p => ({ ...p, [index]: 'done' }))
    } catch (e) {
      setImporting(p => ({ ...p, [index]: 'error' }))
      setImportErrors(p => ({ ...p, [index]: (e as Error).message ?? 'Import failed' }))
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() }
  }

  function clearChat() {
    setMessages([])
    setError('')
    setAttachedFiles([])
    setSignedOff(false)
    setImporting({})
    setImportErrors({})
  }

  if (!keyLoaded) return null

  if (!apiKey) {
    return (
      <div className="m-content">
        <div style={{ maxWidth: 520, margin: '60px auto', textAlign: 'center' }}>
          <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'color-mix(in srgb,var(--accent) 12%,transparent)', display: 'grid', placeItems: 'center', margin: '0 auto 24px' }}>
            <SparkleIcon size={28} color="var(--accent)" />
          </div>
          <h2 style={{ fontFamily: 'var(--ff)', fontWeight: 500, marginBottom: 10 }}>AI Assistant</h2>
          <p style={{ color: 'var(--muted)', fontSize: 14.5, lineHeight: 1.6, marginBottom: 28 }}>
            The AI assistant uses your own Anthropic API key to research and import device data.
            Your key is stored only in your browser — it never touches our servers.
          </p>
          <div style={{ background: 'color-mix(in srgb,var(--accent) 6%,transparent)', border: '1px solid color-mix(in srgb,var(--accent) 18%,transparent)', borderRadius: 12, padding: '20px 24px', marginBottom: 28, textAlign: 'left' }}>
            <div style={{ fontFamily: 'var(--ff)', fontSize: 12, fontWeight: 700, letterSpacing: '1px', textTransform: 'uppercase', color: 'var(--accent)', marginBottom: 8 }}>
              How to set up
            </div>
            <ol style={{ fontFamily: 'var(--ff)', fontSize: 13.5, color: 'var(--muted)', lineHeight: 1.7, paddingLeft: 18, margin: 0 }}>
              <li>Go to <strong>console.anthropic.com</strong> and create an API key</li>
              <li>Go to <strong>Settings → AI Assistant</strong> in the master admin</li>
              <li>Paste your key into the <strong>Anthropic API Key</strong> field</li>
              <li>Return here and start chatting</li>
            </ol>
          </div>
          <button className="btn btn-s btn-lg" onClick={() => router.push('/master/settings')}>
            Go to Settings →
          </button>
        </div>
      </div>
    )
  }

  const lastMsg = messages[messages.length - 1]
  const lastAssistantWasFileImport = lastMsg?.role === 'assistant' && lastMsg?.isFileImport && !loading
  const parsedDevices = lastAssistantWasFileImport ? parseDevicesFromResponse(lastMsg.content) : []

  return (
    <div
      className="m-content"
      style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 64px)', padding: 0, position: 'relative' }}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      {/* Full-page drag overlay */}
      {isDragging && (
        <div style={{
          position: 'absolute', inset: 0, zIndex: 50,
          background: 'color-mix(in srgb,var(--accent) 8%,transparent)',
          border: '3px dashed var(--accent)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexDirection: 'column', gap: 12, pointerEvents: 'none',
        }}>
          <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'var(--accent)', display: 'grid', placeItems: 'center' }}>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
              <polyline points="17 8 12 3 7 8"/>
              <line x1="12" y1="3" x2="12" y2="15"/>
            </svg>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontFamily: 'var(--ff)', fontSize: 18, fontWeight: 600, color: 'var(--accent)' }}>Drop to process</div>
            <div style={{ fontFamily: 'var(--ff)', fontSize: 13.5, color: 'var(--muted)', marginTop: 4 }}>PDF, XLSX, CSV, TXT, or image</div>
          </div>
        </div>
      )}

      {/* Messages */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '24px 20px', display: 'flex', flexDirection: 'column', gap: 20, position: 'relative' }}>
        {messages.length > 0 && (
          <button className="btn" style={{ position: 'absolute', top: 16, right: 20, fontSize: 12, padding: '4px 10px', zIndex: 1 }} onClick={clearChat}>
            Clear chat
          </button>
        )}
        {messages.length === 0 && (
          <div style={{ margin: 'auto', textAlign: 'center', maxWidth: 480 }}>
            <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'color-mix(in srgb,var(--accent) 10%,transparent)', display: 'grid', placeItems: 'center', margin: '0 auto 16px' }}>
              <SparkleIcon size={24} color="var(--accent)" />
            </div>
            <div style={{ fontFamily: 'var(--ff)', fontSize: 16, fontWeight: 500, marginBottom: 8 }}>Device research assistant</div>
            <p style={{ color: 'var(--muted)', fontSize: 13.5, lineHeight: 1.6, marginBottom: 20 }}>
              Ask me to research a device, or upload a spec sheet to extract and import device data. I only work with data you provide — I don&apos;t access the internet.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {[
                'What are the MRI safety specs for the Medtronic Micra AV pacemaker?',
                'Find details for the Abbott Tendril ST lead, model 1688TC',
                'I\'ll paste a CSV with device data — help me format it for import',
              ].map(q => (
                <button key={q}
                  style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 10, padding: '10px 14px', fontFamily: 'var(--ff)', fontSize: 13, color: 'var(--text)', cursor: 'pointer', textAlign: 'left', transition: 'border-color .15s' }}
                  onClick={() => { setInput(q); textareaRef.current?.focus() }}
                  onMouseOver={e => (e.currentTarget.style.borderColor = 'var(--accent)')}
                  onMouseOut={e => (e.currentTarget.style.borderColor = 'var(--border)')}
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((m, i) => {
          const isLast = i === messages.length - 1
          const displayContent = m.role === 'assistant' ? stripImportBlock(m.content) : m.content
          return (
            <div key={i} style={{ display: 'flex', gap: 12, alignItems: 'flex-start', flexDirection: m.role === 'user' ? 'row-reverse' : 'row' }}>
              <div style={{
                width: 32, height: 32, borderRadius: '50%', flexShrink: 0, display: 'grid', placeItems: 'center',
                background: m.role === 'user' ? 'var(--accent)' : 'color-mix(in srgb,var(--accent) 12%,transparent)',
                color: m.role === 'user' ? '#fff' : 'var(--accent)',
                fontFamily: 'var(--ff)', fontSize: 12, fontWeight: 700,
              }}>
                {m.role === 'user' ? 'MA' : <SparkleIcon size={14} color="var(--accent)" />}
              </div>
              <div style={{ maxWidth: '78%', display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div style={{
                  background: m.role === 'user' ? 'var(--accent)' : 'var(--bg2)',
                  color: m.role === 'user' ? '#fff' : 'var(--text)',
                  border: m.role === 'user' ? 'none' : '1px solid var(--border)',
                  borderRadius: m.role === 'user' ? '14px 14px 4px 14px' : '4px 14px 14px 14px',
                  padding: '12px 16px',
                  fontFamily: 'var(--fb)', fontSize: 14, lineHeight: 1.65,
                }}>
                  {m.role === 'user' && m.isFileImport && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8, opacity: 0.85 }}>
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                        <polyline points="14 2 14 8 20 8"/>
                      </svg>
                      <span style={{ fontSize: 12, fontWeight: 600 }}>File attached</span>
                    </div>
                  )}
                  <MarkdownText text={displayContent} />
                </div>

                {/* Sign-off + import for last assistant file-import message */}
                {isLast && m.role === 'assistant' && m.isFileImport && parsedDevices.length > 0 && (() => {
                  const newDevices = parsedDevices.filter((_, idx) => !duplicateCheck?.[idx]?.exists)
                  const dupCount = parsedDevices.length - newDevices.length
                  return (
                    <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden' }}>
                      <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--border)', background: 'color-mix(in srgb,var(--ok) 6%,transparent)', display: 'flex', alignItems: 'center', gap: 8 }}>
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--ok)" strokeWidth="2.2">
                          <polyline points="9 11 12 14 22 4"/>
                          <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>
                        </svg>
                        <span style={{ fontFamily: 'var(--ff)', fontSize: 13, fontWeight: 600 }}>
                          {parsedDevices.length} device{parsedDevices.length !== 1 ? 's' : ''} found
                          {dupCount > 0 && <span style={{ color: 'var(--err)', marginLeft: 6 }}>· {dupCount} already in catalogue</span>}
                        </span>
                        <span style={{ fontFamily: 'var(--ff)', fontSize: 12, color: 'var(--muted)', marginLeft: 'auto' }}>
                          Submitted as pending — requires admin approval
                        </span>
                      </div>
                      <div style={{ padding: '14px 16px' }}>
                        {newDevices.length > 0 && (
                          <label style={{ display: 'flex', alignItems: 'flex-start', gap: 10, cursor: 'pointer', marginBottom: signedOff ? 14 : 0 }}>
                            <input
                              type="checkbox"
                              checked={signedOff}
                              onChange={e => setSignedOff(e.target.checked)}
                              style={{ marginTop: 2, accentColor: 'var(--accent)', width: 16, height: 16, flexShrink: 0 }}
                            />
                            <span style={{ fontFamily: 'var(--ff)', fontSize: 13, color: 'var(--text)', lineHeight: 1.5 }}>
                              I have reviewed the extracted information above and confirm it is accurate. I understand these will be added as <strong>pending review</strong> and must be approved before going live.
                            </span>
                          </label>
                        )}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: newDevices.length > 0 && !signedOff ? 0 : 0 }}>
                          {parsedDevices.map((device, idx) => {
                            const isDup = duplicateCheck?.[idx]?.exists
                            const dupStatus = duplicateCheck?.[idx]?.status
                            return (
                              <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: 10, background: isDup ? 'color-mix(in srgb,var(--err) 4%,transparent)' : 'var(--bg)', border: `1px solid ${isDup ? 'color-mix(in srgb,var(--err) 20%,transparent)' : 'var(--border)'}`, borderRadius: 8, padding: '10px 14px' }}>
                                <div style={{ flex: 1, minWidth: 0 }}>
                                  <div style={{ fontFamily: 'var(--ff)', fontSize: 13, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                    {device.manufacturer} — {device.model}
                                  </div>
                                  <div style={{ fontFamily: 'var(--ff)', fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>
                                    {device.deviceType} · MRI {device.mriStatus} · {device.classification}
                                  </div>
                                </div>
                                {isDup ? (
                                  <span style={{ fontFamily: 'var(--ff)', fontSize: 12, color: 'var(--err)', fontWeight: 600, flexShrink: 0, whiteSpace: 'nowrap' }}>
                                    Already in catalogue{dupStatus ? ` (${dupStatus.replace('_', ' ')})` : ''}
                                  </span>
                                ) : importing[idx] === 'done' ? (
                                  <span style={{ fontFamily: 'var(--ff)', fontSize: 12, color: 'var(--ok)', fontWeight: 600, flexShrink: 0 }}>✓ Sent for review</span>
                                ) : importing[idx] === 'loading' ? (
                                  <span style={{ fontFamily: 'var(--ff)', fontSize: 12, color: 'var(--muted)', flexShrink: 0 }}>Submitting…</span>
                                ) : signedOff ? (
                                  <button
                                    className="btn btn-s"
                                    style={{ fontSize: 12, padding: '5px 12px', flexShrink: 0 }}
                                    onClick={() => handleImportDevice(device, idx)}
                                  >
                                    Submit for review
                                  </button>
                                ) : null}
                              </div>
                            )
                          })}
                          {Object.entries(importErrors).map(([idx, msg]) => (
                            <div key={idx} style={{ fontFamily: 'var(--ff)', fontSize: 12, color: 'var(--err)', padding: '6px 10px', background: 'color-mix(in srgb,var(--err) 8%,transparent)', borderRadius: 6 }}>
                              Device {Number(idx) + 1}: {msg}
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )
                })()}
              </div>
            </div>
          )
        })}

        {loading && (
          <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
            <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'color-mix(in srgb,var(--accent) 12%,transparent)', display: 'grid', placeItems: 'center', flexShrink: 0 }}>
              <SparkleIcon size={14} color="var(--accent)" />
            </div>
            <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: '4px 14px 14px 14px', padding: '12px 16px' }}>
              <div style={{ display: 'flex', gap: 5, alignItems: 'center' }}>
                {[0, 1, 2].map(i => (
                  <div key={i} style={{
                    width: 7, height: 7, borderRadius: '50%', background: 'var(--accent)',
                    animation: `ai-pulse 1.2s ease-in-out ${i * 0.2}s infinite`, opacity: 0.5,
                  }} />
                ))}
              </div>
            </div>
          </div>
        )}

        {error && (
          <div style={{ background: 'color-mix(in srgb,var(--err) 8%,transparent)', border: '1px solid color-mix(in srgb,var(--err) 20%,transparent)', borderRadius: 10, padding: '10px 14px', fontFamily: 'var(--ff)', fontSize: 13, color: 'var(--err)', whiteSpace: 'pre-line' }}>
            {error}
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input area */}
      <div style={{ padding: '16px 20px 20px', borderTop: '1px solid var(--border)', background: 'var(--bg2)', flexShrink: 0 }}>

        {/* File drop zone — always visible */}
        <div
          onClick={() => fileInputRef.current?.click()}
          style={{
            border: `2px dashed ${isDragging ? 'var(--accent)' : attachedFiles.length ? 'color-mix(in srgb,var(--accent) 40%,transparent)' : 'var(--border2)'}`,
            borderRadius: 12,
            background: isDragging ? 'color-mix(in srgb,var(--accent) 6%,transparent)' : attachedFiles.length ? 'color-mix(in srgb,var(--accent) 4%,transparent)' : 'transparent',
            padding: attachedFiles.length ? '10px 14px' : '18px 20px',
            marginBottom: 12,
            cursor: 'pointer',
            transition: 'border-color .15s, background .15s',
          }}
        >
          {attachedFiles.length === 0 ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, pointerEvents: 'none' }}>
              <div style={{ width: 42, height: 42, borderRadius: 10, background: 'color-mix(in srgb,var(--accent) 10%,transparent)', display: 'grid', placeItems: 'center', flexShrink: 0 }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="1.8">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                  <polyline points="17 8 12 3 7 8"/>
                  <line x1="12" y1="3" x2="12" y2="15"/>
                </svg>
              </div>
              <div>
                <div style={{ fontFamily: 'var(--ff)', fontSize: 13.5, fontWeight: 500, color: 'var(--text)', marginBottom: 2 }}>
                  Drop a spec sheet, CSV, or spreadsheet
                </div>
                <div style={{ fontFamily: 'var(--ff)', fontSize: 12, color: 'var(--muted)' }}>
                  PDF · XLSX (all sheets) · CSV · TXT · Image — or click to browse
                </div>
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
              {attachedFiles.map(f => (
                <div key={f.name} style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'color-mix(in srgb,var(--accent) 12%,transparent)', border: '1px solid color-mix(in srgb,var(--accent) 25%,transparent)', borderRadius: 6, padding: '4px 10px 4px 8px', fontFamily: 'var(--ff)', fontSize: 12, color: 'var(--accent-deep)' }}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                    <polyline points="14 2 14 8 20 8"/>
                  </svg>
                  {f.name}
                  <button
                    onClick={e => { e.stopPropagation(); setAttachedFiles(p => p.filter(x => x.name !== f.name)) }}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)', padding: 0, lineHeight: 1, fontSize: 13, marginLeft: 2 }}
                    aria-label={`Remove ${f.name}`}
                  >✕</button>
                </div>
              ))}
              <span style={{ fontFamily: 'var(--ff)', fontSize: 12, color: 'var(--accent)', marginLeft: 4 }}>+ Add more</span>
            </div>
          )}
        </div>

        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,.csv,.tsv,.txt,.xlsx,.xls,image/*"
          multiple
          style={{ display: 'none' }}
          onChange={async e => {
            if (e.target.files) await processDroppedFiles(Array.from(e.target.files))
            e.target.value = ''
          }}
        />

        {/* Text input */}
        <div
          style={{ display: 'flex', gap: 10, alignItems: 'flex-end', background: 'var(--bg)', border: '1.5px solid var(--border2)', borderRadius: 14, padding: '8px 8px 8px 16px', transition: 'border-color .15s' }}
          onFocusCapture={e => (e.currentTarget.style.borderColor = 'var(--accent)')}
          onBlurCapture={e => (e.currentTarget.style.borderColor = 'var(--border2)')}
        >
          <textarea
            ref={textareaRef}
            rows={1}
            placeholder="Ask about a device, paste data, or drop a file above…"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={loading}
            style={{
              flex: 1, border: 'none', outline: 'none', resize: 'none', background: 'transparent',
              fontFamily: 'var(--fb)', fontSize: 14, color: 'var(--text)', lineHeight: 1.55,
              maxHeight: 160, overflowY: 'auto', paddingTop: 4, verticalAlign: 'top',
            }}
          />
          <button
            className="btn btn-s"
            onClick={send}
            disabled={loading || !input.trim()}
            style={{ flexShrink: 0, height: 38, width: 38, padding: 0, display: 'grid', placeItems: 'center', borderRadius: 10 }}
            aria-label="Send message"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="22" y1="2" x2="11" y2="13"/>
              <polygon points="22 2 15 22 11 13 2 9 22 2"/>
            </svg>
          </button>
        </div>

        <div style={{ fontFamily: 'var(--ff)', fontSize: 11.5, color: 'var(--muted2)', marginTop: 8, textAlign: 'center' }}>
          Enter to send · Shift+Enter for new line · Devices are submitted for review, not published automatically
        </div>
      </div>

      <style>{`
        @keyframes ai-pulse {
          0%, 100% { opacity: 0.3; transform: scale(0.85); }
          50% { opacity: 1; transform: scale(1.1); }
        }
      `}</style>
    </div>
  )
}
