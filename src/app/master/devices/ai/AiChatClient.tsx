'use client'
import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useMutation } from 'convex/react'
import { api as apiBase } from '../../../../../convex/_generated/api'
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const api = apiBase as any

const API_KEY_STORAGE = 'implantid_anthropic_key'
const MODEL = 'claude-opus-4-8'

const SYSTEM_PROMPT = `You are an AI assistant for Implant ID, a medical device registry platform.
Your job is to help administrators research and add medical implant device data to the catalogue.

You can help with:
- Researching specific devices (pacemakers, ICDs, cochlear implants, spinal cord stimulators, orthopaedic implants, etc.)
- Finding device specifications: manufacturer, model number, MRI safety status, device type
- Parsing and importing device data from uploaded PDFs, spec sheets, spreadsheets, or pasted data
- Formatting device data into the fields required by the catalogue

Required catalogue fields for each device:
- Manufacturer name
- Device name / model
- Device type (e.g. Pacemaker, ICD, Cochlear Implant, Hip Replacement, etc.)
- Classification: active (has power source), passive (no power source), or legacy (discontinued)
- MRI status: "safe", "conditional", or "unsafe" (if truly unknown, use "unknown")

Optional catalogue fields (include if found):
- Field strengths (e.g. 1.5T, 3.0T)
- Contraindications

When processing any uploaded file or pasted data, ALWAYS:

1. Show a comparison table for each device found:

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

Flag missing or uncertain fields. Note any MRI status uncertainty — this is a patient safety issue.

2. After ALL comparison tables, include a machine-readable import block (required, always, even for one device):

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

End with a summary: "Found X device(s). Y ready to import. Z need manual review."

Be concise, factual, and accurate. When unsure about MRI status, say so.`

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
    <p
      style={{ margin: 0, lineHeight: 1.65 }}
      dangerouslySetInnerHTML={{ __html: formatted }}
    />
  )
}

export default function AiChatClient() {
  const router = useRouter()
  const addDevice = useMutation(api.devices.addDevice)

  const [apiKey,         setApiKey]         = useState<string>('')
  const [keyLoaded,      setKeyLoaded]      = useState(false)
  const [messages,       setMessages]       = useState<Message[]>([])
  const [input,          setInput]          = useState('')
  const [loading,        setLoading]        = useState(false)
  const [error,          setError]          = useState('')
  const [isDragging,     setIsDragging]     = useState(false)
  const [attachedFiles,  setAttachedFiles]  = useState<AttachedFile[]>([])
  const [signedOff,      setSignedOff]      = useState(false)
  const [importing,      setImporting]      = useState<Record<number, 'loading' | 'done' | 'error'>>({})
  const [importErrors,   setImportErrors]   = useState<Record<number, string>>({})

  const bottomRef    = useRef<HTMLDivElement>(null)
  const textareaRef  = useRef<HTMLTextAreaElement>(null)
  const dragCounter  = useRef(0)

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
      reader.onload = () => {
        const result = reader.result as string
        resolve(result.split(',')[1])
      }
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

  async function processDroppedFiles(files: File[]) {
    setError('')
    const supported: File[] = []
    const unsupported: string[] = []

    for (const file of files) {
      const type = file.type.toLowerCase()
      const name = file.name.toLowerCase()
      const ok =
        type === 'application/pdf' ||
        type === 'text/csv' || type === 'text/plain' || type === 'text/tsv' ||
        type.startsWith('image/') ||
        name.endsWith('.csv') || name.endsWith('.tsv') ||
        name.endsWith('.txt') || name.endsWith('.pdf')

      if (ok) supported.push(file)
      else if (name.endsWith('.xlsx') || name.endsWith('.xls'))
        unsupported.push(`${file.name} — please export as CSV first`)
      else
        unsupported.push(`${file.name} — unsupported format`)
    }

    if (unsupported.length) {
      setError(unsupported.join('\n'))
    }

    if (!supported.length) return

    const attached: AttachedFile[] = []
    for (const file of supported) {
      const type = file.type.toLowerCase()
      const name = file.name.toLowerCase()
      const isText = type === 'text/csv' || type === 'text/plain' || type === 'text/tsv' ||
                     name.endsWith('.csv') || name.endsWith('.tsv') || name.endsWith('.txt')
      const isImage = type.startsWith('image/')

      if (isText) {
        const text = await readFileAsText(file)
        attached.push({ name: file.name, mimeType: file.type || 'text/plain', data: text, isText: true })
      } else {
        const base64 = await readFileAsBase64(file)
        attached.push({
          name: file.name,
          mimeType: isImage ? (file.type || 'image/jpeg') : 'application/pdf',
          data: base64,
          isText: false,
        })
      }
    }

    setAttachedFiles(attached)
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

      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type':                      'application/json',
          'x-api-key':                         apiKey,
          'anthropic-version':                 '2023-06-01',
          'anthropic-dangerous-allow-browser': 'true',
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
      await addDevice({
        manufacturer:    device.manufacturer,
        model:           device.model,
        deviceType:      device.deviceType,
        classification:  device.classification,
        mriStatus:       device.mriStatus,
        fieldStrengths:  device.fieldStrengths,
        contraindications: device.contraindications,
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
      {/* Drag overlay */}
      {isDragging && (
        <div style={{
          position: 'absolute', inset: 0, zIndex: 50,
          background: 'color-mix(in srgb,var(--accent) 8%,transparent)',
          border: '3px dashed var(--accent)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexDirection: 'column', gap: 12, pointerEvents: 'none',
        }}>
          <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'var(--accent)', display: 'grid', placeItems: 'center' }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>
            </svg>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontFamily: 'var(--ff)', fontSize: 16, fontWeight: 600, color: 'var(--accent)' }}>Drop to process</div>
            <div style={{ fontFamily: 'var(--ff)', fontSize: 13, color: 'var(--muted)', marginTop: 4 }}>PDF, CSV, TXT, or image files</div>
          </div>
        </div>
      )}

      {/* Toolbar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 28px', borderBottom: '1px solid var(--border)', background: 'var(--bg2)', flexShrink: 0 }}>
        <div style={{ fontFamily: 'var(--ff)', fontSize: 13.5, fontWeight: 500, color: 'var(--text)', display: 'flex', alignItems: 'center', gap: 8 }}>
          <SparkleIcon color="var(--accent)" />
          AI Device Assistant
          <span style={{ fontFamily: 'var(--ff)', fontSize: 11, color: 'var(--muted2)', fontWeight: 400 }}>· {MODEL}</span>
        </div>
        {messages.length > 0 && (
          <button className="btn" style={{ fontSize: 12, padding: '5px 12px' }} onClick={clearChat}>
            Clear chat
          </button>
        )}
      </div>

      {/* Messages */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '24px 28px', display: 'flex', flexDirection: 'column', gap: 20 }}>
        {messages.length === 0 && (
          <div style={{ margin: 'auto', textAlign: 'center', maxWidth: 460 }}>
            <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'color-mix(in srgb,var(--accent) 10%,transparent)', display: 'grid', placeItems: 'center', margin: '0 auto 16px' }}>
              <SparkleIcon size={24} color="var(--accent)" />
            </div>
            <div style={{ fontFamily: 'var(--ff)', fontSize: 16, fontWeight: 500, marginBottom: 8 }}>Device research assistant</div>
            <p style={{ color: 'var(--muted)', fontSize: 13.5, lineHeight: 1.6, marginBottom: 8 }}>
              Ask me to research a device, or drag and drop a spec sheet, CSV, or PDF to extract and import device data.
            </p>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'color-mix(in srgb,var(--accent) 8%,transparent)', border: '1px dashed color-mix(in srgb,var(--accent) 30%,transparent)', borderRadius: 8, padding: '7px 14px', marginBottom: 20 }}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>
              </svg>
              <span style={{ fontFamily: 'var(--ff)', fontSize: 12.5, color: 'var(--accent-deep)', fontWeight: 500 }}>Drop a PDF or CSV anywhere to import devices</span>
            </div>
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
                {isLast && m.role === 'assistant' && m.isFileImport && parsedDevices.length > 0 && (
                  <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden' }}>
                    <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 8 }}>
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2"><polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>
                      <span style={{ fontFamily: 'var(--ff)', fontSize: 13, fontWeight: 600 }}>
                        {parsedDevices.length} device{parsedDevices.length !== 1 ? 's' : ''} ready to import
                      </span>
                    </div>
                    <div style={{ padding: '14px 16px' }}>
                      <label style={{ display: 'flex', alignItems: 'flex-start', gap: 10, cursor: 'pointer', marginBottom: signedOff ? 14 : 0 }}>
                        <input
                          type="checkbox"
                          checked={signedOff}
                          onChange={e => setSignedOff(e.target.checked)}
                          style={{ marginTop: 2, accentColor: 'var(--accent)', width: 16, height: 16, flexShrink: 0 }}
                        />
                        <span style={{ fontFamily: 'var(--ff)', fontSize: 13, color: 'var(--text)', lineHeight: 1.5 }}>
                          I have reviewed the extracted information above and confirm it is accurate and ready to import into the catalogue.
                        </span>
                      </label>
                      {signedOff && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                          {parsedDevices.map((device, idx) => (
                            <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 8, padding: '10px 14px' }}>
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ fontFamily: 'var(--ff)', fontSize: 13, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                  {device.manufacturer} — {device.model}
                                </div>
                                <div style={{ fontFamily: 'var(--ff)', fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>
                                  {device.deviceType} · {device.mriStatus} · {device.classification}
                                </div>
                              </div>
                              {importing[idx] === 'done' ? (
                                <span style={{ fontFamily: 'var(--ff)', fontSize: 12, color: 'var(--ok)', fontWeight: 600, flexShrink: 0 }}>✓ Added</span>
                              ) : importing[idx] === 'loading' ? (
                                <span style={{ fontFamily: 'var(--ff)', fontSize: 12, color: 'var(--muted)', flexShrink: 0 }}>Adding…</span>
                              ) : (
                                <button
                                  className="btn btn-s"
                                  style={{ fontSize: 12, padding: '5px 12px', flexShrink: 0 }}
                                  onClick={() => handleImportDevice(device, idx)}
                                >
                                  Add to catalogue
                                </button>
                              )}
                            </div>
                          ))}
                          {Object.entries(importErrors).map(([idx, msg]) => (
                            <div key={idx} style={{ fontFamily: 'var(--ff)', fontSize: 12, color: 'var(--err)', padding: '6px 10px', background: 'color-mix(in srgb,var(--err) 8%,transparent)', borderRadius: 6 }}>
                              Device {Number(idx) + 1}: {msg}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}
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
                    animation: `ai-pulse 1.2s ease-in-out ${i * 0.2}s infinite`,
                    opacity: 0.5,
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
      <div style={{ padding: '16px 28px', borderTop: '1px solid var(--border)', background: 'var(--bg2)', flexShrink: 0 }}>
        {/* Attached files */}
        {attachedFiles.length > 0 && (
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 10 }}>
            {attachedFiles.map(f => (
              <div key={f.name} style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'color-mix(in srgb,var(--accent) 10%,transparent)', border: '1px solid color-mix(in srgb,var(--accent) 25%,transparent)', borderRadius: 6, padding: '4px 10px 4px 8px', fontFamily: 'var(--ff)', fontSize: 12, color: 'var(--accent-deep)' }}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                  <polyline points="14 2 14 8 20 8"/>
                </svg>
                {f.name}
                <button
                  onClick={() => setAttachedFiles(p => p.filter(x => x.name !== f.name))}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)', padding: 0, lineHeight: 1, fontSize: 13, marginLeft: 2 }}
                  aria-label={`Remove ${f.name}`}
                >✕</button>
              </div>
            ))}
          </div>
        )}

        <div
          style={{ display: 'flex', gap: 10, alignItems: 'flex-end', background: 'var(--bg)', border: '1.5px solid var(--border2)', borderRadius: 14, padding: '8px 8px 8px 16px', transition: 'border-color .15s' }}
          onFocusCapture={e => (e.currentTarget.style.borderColor = 'var(--accent)')}
          onBlurCapture={e => (e.currentTarget.style.borderColor = 'var(--border2)')}
        >
          <textarea
            ref={textareaRef}
            rows={1}
            placeholder="Ask about a device, paste spreadsheet data, or drag & drop a spec sheet above…"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={loading}
            style={{
              flex: 1, border: 'none', outline: 'none', resize: 'none', background: 'transparent',
              fontFamily: 'var(--fb)', fontSize: 14, color: 'var(--text)', lineHeight: 1.55,
              maxHeight: 160, overflowY: 'auto', paddingTop: 4,
              verticalAlign: 'top',
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
          Enter to send · Shift+Enter for new line · Drag &amp; drop PDF, CSV, or spec sheet to process
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
