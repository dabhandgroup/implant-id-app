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
- Device name (friendly product name, e.g. "Azure XT DR MRI SureScan")
- Model number
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
    "name": "Azure XT DR MRI SureScan",
    "manufacturer": "Medtronic",
    "model": "W3DR01; W3DR06",
    "deviceType": "Pacemaker",
    "classification": "active",
    "mriStatus": "conditional",
    "fieldStrengths": "1.5T, 3.0T",
    "contraindications": "Requires complete SureScan system..."
  }
]
\`\`\`

The "name" field must be the full product name (distinct from the model number).

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
  name?: string
  manufacturer: string
  model: string
  deviceType: string
  classification: 'active' | 'passive' | 'legacy'
  mriStatus: 'safe' | 'conditional' | 'unsafe' | 'unknown'
  fieldStrengths?: string
  contraindications?: string
}

interface SavedChat {
  _id: string
  title: string
  updatedAt: number
  messages: Array<{ role: 'user' | 'assistant'; content: string; isFileImport?: boolean }>
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

function chatTitle(messages: Message[]): string {
  const first = messages.find(m => m.role === 'user')?.content ?? 'New chat'
  return first.replace(/^I've attached: /, '').slice(0, 55)
}

function relativeDate(ts: number): string {
  const diff = Date.now() - ts
  const DAY = 86_400_000
  if (diff < DAY)       return 'Today'
  if (diff < 2 * DAY)   return 'Yesterday'
  if (diff < 7 * DAY)   return 'This week'
  if (diff < 30 * DAY)  return 'This month'
  return new Date(ts).toLocaleDateString('en-GB', { month: 'short', year: 'numeric' })
}

function groupChats(chats: SavedChat[]): { label: string; items: SavedChat[] }[] {
  const groups: Record<string, SavedChat[]> = {}
  const ORDER = ['Today', 'Yesterday', 'This week', 'This month']
  for (const c of chats) {
    const label = relativeDate(c.updatedAt)
    ;(groups[label] ??= []).push(c)
  }
  return Object.entries(groups).sort(([a], [b]) => {
    const ai = ORDER.indexOf(a), bi = ORDER.indexOf(b)
    if (ai >= 0 && bi >= 0) return ai - bi
    if (ai >= 0) return -1
    if (bi >= 0) return 1
    return 0
  }).map(([label, items]) => ({ label, items }))
}

const SparkleIcon = ({ size = 16, color = 'currentColor' }: { size?: number; color?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.7">
    <path d="m12 3-1.9 5.8a2 2 0 0 1-1.3 1.3L3 12l5.8 1.9a2 2 0 0 1 1.3 1.3L12 21l1.9-5.8a2 2 0 0 1 1.3-1.3L21 12l-5.8-1.9a2 2 0 0 1-1.3-1.3z"/>
  </svg>
)

function MriBadge({ status }: { status: string }) {
  const cfg: Record<string, { bg: string; color: string; label: string }> = {
    safe:        { bg: 'color-mix(in srgb,var(--ok) 14%,transparent)',    color: 'var(--ok)',   label: 'MRI Safe' },
    conditional: { bg: 'color-mix(in srgb,#f59e0b 14%,transparent)',      color: '#b45309',     label: 'MRI Conditional' },
    unsafe:      { bg: 'color-mix(in srgb,var(--err) 14%,transparent)',   color: 'var(--err)',  label: 'MRI Unsafe' },
    unknown:     { bg: 'color-mix(in srgb,var(--muted2) 14%,transparent)', color: 'var(--muted)', label: 'MRI Unknown' },
  }
  const { bg, color, label } = cfg[status] ?? cfg.unknown
  return (
    <span style={{ background: bg, color, fontSize: 11, fontWeight: 700, padding: '3px 8px', borderRadius: 5, fontFamily: 'var(--ff)', letterSpacing: 0.2, whiteSpace: 'nowrap' }}>
      {label}
    </span>
  )
}

function MarkdownText({ text }: { text: string }) {
  const lines = text.split('\n')
  const html = lines.map(line => {
    if (/^\|[-| :]+\|$/.test(line.trim())) return ''
    if (line.startsWith('|')) {
      const cells = line.split('|').filter((_, ci, a) => ci > 0 && ci < a.length - 1)
      const cellsHtml = cells.map((cell, ci) => {
        const fmt = cell.trim()
          .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
          .replace(/`(.+?)`/g, '<code style="background:color-mix(in srgb,var(--accent) 10%,transparent);padding:1px 4px;border-radius:3px;font-family:SF Mono,monospace;font-size:11px">$1</code>')
        return `<span style="flex:${ci === 0 ? '0 0 110px' : '1'};padding:3px 8px 3px 0;font-size:12.5px;font-weight:${ci === 0 ? '600' : '400'}">${fmt}</span>`
      }).join('')
      return `<div style="display:flex;border-bottom:1px solid var(--border)">${cellsHtml}</div>`
    }
    if (line.startsWith('**') && line.endsWith('**') && line.length > 4) {
      return `<div style="font-weight:700;font-size:13.5px;margin:14px 0 5px">${line.replace(/\*\*/g, '')}</div>`
    }
    if (!line.trim()) return '<div style="height:8px"></div>'
    const formatted = line
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.+?)\*/g, '<em>$1</em>')
      .replace(/`(.+?)`/g, '<code style="background:color-mix(in srgb,var(--accent) 10%,transparent);padding:1px 5px;border-radius:4px;font-size:12px;font-family:SF Mono,Monaco,monospace">$1</code>')
    return `<div style="margin:2px 0">${formatted}</div>`
  }).join('')
  return (
    <div style={{ fontFamily: 'var(--fb)', fontSize: 13.5, lineHeight: 1.65 }} dangerouslySetInnerHTML={{ __html: html }} />
  )
}

export default function AiChatClient() {
  const router = useRouter()
  const bulkInsertDevices = useMutation(api.devices.bulkInsertDevices)
  const saveChatMut       = useMutation(api.aiChats.saveChat)
  const updateChatMut     = useMutation(api.aiChats.updateChat)
  const deleteChatMut     = useMutation(api.aiChats.deleteChat)

  // All hooks unconditionally at the top
  const [apiKey,           setApiKey]           = useState<string>('')
  const [keyLoaded,        setKeyLoaded]        = useState(false)
  const [messages,         setMessages]         = useState<Message[]>([])
  const [input,            setInput]            = useState('')
  const [loading,          setLoading]          = useState(false)
  const [streamingContent, setStreamingContent] = useState('')
  const [error,            setError]            = useState('')
  const [isDragging,       setIsDragging]       = useState(false)
  const [attachedFiles,    setAttachedFiles]    = useState<AttachedFile[]>([])
  const [importing,        setImporting]        = useState<Record<number, 'loading' | 'done' | 'error'>>({})
  const [importErrors,     setImportErrors]     = useState<Record<number, string>>({})
  const [expandedCards,    setExpandedCards]    = useState<Set<number>>(new Set())
  const [activeChatId,     setActiveChatId]     = useState<string | null>(null)
  const [hoveredChatId,    setHoveredChatId]    = useState<string | null>(null)

  // Derive dup pairs from last assistant message unconditionally
  const _lastMsg = messages.length > 0 ? messages[messages.length - 1] : null
  const _dupPairs = (_lastMsg?.role === 'assistant' && _lastMsg?.isFileImport && !loading)
    ? parseDevicesFromResponse(_lastMsg.content).map(d => ({ manufacturer: d.manufacturer, model: d.model }))
    : []
  const duplicateCheck = useQuery(api.devices.findDuplicates, { pairs: _dupPairs })
  const chatHistory    = useQuery(api.aiChats.listChats) as SavedChat[] | undefined

  const bottomRef    = useRef<HTMLDivElement>(null)
  const textareaRef  = useRef<HTMLTextAreaElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
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
    const workbook = XLSX.read(new Uint8Array(buffer), { type: 'array' })
    const MAX_CHARS_PER_SHEET = 80_000
    const parts: string[] = []
    for (const sheetName of workbook.SheetNames) {
      const sheet = workbook.Sheets[sheetName]
      let csv = XLSX.utils.sheet_to_csv(sheet, { skipHidden: true })
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
      const isXLSX  = name.endsWith('.xlsx') || name.endsWith('.xls') || type.includes('spreadsheetml') || type.includes('ms-excel')
      const isText  = !isXLSX && (type === 'text/csv' || type === 'text/plain' || type === 'text/tsv' || name.endsWith('.csv') || name.endsWith('.tsv') || name.endsWith('.txt'))
      const isPDF   = type === 'application/pdf' || name.endsWith('.pdf')
      const isImage = type.startsWith('image/')

      if (isXLSX) {
        try {
          attached.push({ name: file.name, mimeType: 'text/csv', data: await readXLSXAsText(file), isText: true })
        } catch {
          errs.push(`${file.name} — could not read spreadsheet`)
        }
      } else if (isText) {
        attached.push({ name: file.name, mimeType: file.type || 'text/plain', data: await readFileAsText(file), isText: true })
      } else if (isPDF) {
        attached.push({ name: file.name, mimeType: 'application/pdf', data: await readFileAsBase64(file), isText: false })
      } else if (isImage) {
        attached.push({ name: file.name, mimeType: file.type || 'image/jpeg', data: await readFileAsBase64(file), isText: false })
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
    setInput(`I've attached: ${attached.map(f => f.name).join(', ')}. Please extract all medical device data and present the comparison table showing what's in the document vs the catalogue import fields.`)
    textareaRef.current?.focus()
  }

  function handleDragEnter(e: React.DragEvent) { e.preventDefault(); dragCounter.current++; if (dragCounter.current === 1) setIsDragging(true) }
  function handleDragLeave(e: React.DragEvent) { e.preventDefault(); dragCounter.current--; if (dragCounter.current === 0) setIsDragging(false) }
  function handleDragOver(e: React.DragEvent) { e.preventDefault() }
  async function handleDrop(e: React.DragEvent) { e.preventDefault(); dragCounter.current = 0; setIsDragging(false); await processDroppedFiles(Array.from(e.dataTransfer.files)) }

  async function send() {
    const text = input.trim()
    if (!text || loading) return
    setInput('')
    setError('')
    setImporting({})
    setImportErrors({})
    setExpandedCards(new Set())

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

    const newMsg: Message = { role: 'user', content: text, ...(isFileMsg ? { apiContent, isFileImport: true } : {}) }
    const updated = [...messages, newMsg]
    setMessages(updated)
    setLoading(true)
    setStreamingContent('')

    try {
      const apiMessages = updated.map(m => ({ role: m.role, content: m.apiContent ?? m.content }))
      const res = await fetch('/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-anthropic-key': apiKey },
        body: JSON.stringify({ model: MODEL, max_tokens: 8192, system: SYSTEM_PROMPT, messages: apiMessages }),
      })

      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err?.error?.message ?? `API error ${res.status}`)
      }

      const reader = res.body!.getReader()
      const decoder = new TextDecoder()
      let accumulated = ''
      let buffer = ''
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() ?? ''
        for (const line of lines) {
          if (!line.startsWith('data: ')) continue
          const data = line.slice(6).trim()
          if (!data || data === '[DONE]') continue
          try {
            const parsed = JSON.parse(data)
            if (parsed.type === 'content_block_delta' && parsed.delta?.type === 'text_delta') {
              accumulated += parsed.delta.text
              setStreamingContent(accumulated)
            }
          } catch { /* ignore */ }
        }
      }

      const finalMessages = [...updated, { role: 'assistant' as const, content: accumulated, isFileImport: isFileMsg }]
      setMessages(finalMessages)

      // Persist to Convex — strip apiContent (never save base64 to DB)
      const toSave = finalMessages.map(m => ({ role: m.role, content: m.content, ...(m.isFileImport ? { isFileImport: true as const } : {}) }))
      const title  = chatTitle(finalMessages)
      if (activeChatId) {
        await updateChatMut({ id: activeChatId as never, messages: toSave })
      } else {
        const newId = await saveChatMut({ title, messages: toSave })
        setActiveChatId(String(newId))
      }
    } catch (e) {
      setError((e as Error).message ?? 'Something went wrong')
    } finally {
      setLoading(false)
      setStreamingContent('')
    }
  }

  async function handleImportDevice(device: DeviceImport, index: number) {
    setImporting(p => ({ ...p, [index]: 'loading' }))
    setImportErrors(p => { const n = { ...p }; delete n[index]; return n })
    try {
      await bulkInsertDevices({
        devices: [{
          name:              device.name ?? `${device.manufacturer} ${device.model}`,
          manufacturer:      device.manufacturer,
          model:             device.model,
          deviceType:        device.deviceType,
          classification:    device.classification ?? 'active',
          mriStatus:         device.mriStatus,
          fieldStrengths:    device.fieldStrengths,
          contraindications: device.contraindications,
        }],
        submitterName: 'Master Admin', submitterTitle: 'Master Admin', source: 'admin',
      })
      setImporting(p => ({ ...p, [index]: 'done' }))
    } catch (e) {
      setImporting(p => ({ ...p, [index]: 'error' }))
      setImportErrors(p => ({ ...p, [index]: (e as Error).message ?? 'Import failed' }))
    }
  }

  async function handleBulkApprove(devices: DeviceImport[]) {
    const toImport = devices.map((d, idx) => ({ d, idx })).filter(({ idx }) => !duplicateCheck?.[idx]?.exists && importing[idx] !== 'done')
    for (const { d, idx } of toImport) await handleImportDevice(d, idx)
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() }
  }

  function newChat() {
    setMessages([])
    setError('')
    setAttachedFiles([])
    setImporting({})
    setImportErrors({})
    setExpandedCards(new Set())
    setStreamingContent('')
    setActiveChatId(null)
    setInput('')
  }

  function loadChat(chat: SavedChat) {
    setMessages(chat.messages as Message[])
    setActiveChatId(chat._id)
    setError('')
    setImporting({})
    setImportErrors({})
    setExpandedCards(new Set())
    setStreamingContent('')
    setInput('')
  }

  async function handleDeleteChat(id: string) {
    if (activeChatId === id) newChat()
    try { await deleteChatMut({ id: id as never }) } catch { /* ignore */ }
  }

  function toggleCardExpanded(idx: number) {
    setExpandedCards(prev => { const next = new Set(prev); if (next.has(idx)) next.delete(idx); else next.add(idx); return next })
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
            The AI assistant uses your own Anthropic API key. Your key is stored only in your browser — it never touches our servers.
          </p>
          <div style={{ background: 'color-mix(in srgb,var(--accent) 6%,transparent)', border: '1px solid color-mix(in srgb,var(--accent) 18%,transparent)', borderRadius: 12, padding: '20px 24px', marginBottom: 28, textAlign: 'left' }}>
            <div style={{ fontFamily: 'var(--ff)', fontSize: 12, fontWeight: 700, letterSpacing: '1px', textTransform: 'uppercase', color: 'var(--accent)', marginBottom: 8 }}>How to set up</div>
            <ol style={{ fontFamily: 'var(--ff)', fontSize: 13.5, color: 'var(--muted)', lineHeight: 1.7, paddingLeft: 18, margin: 0 }}>
              <li>Go to <strong>console.anthropic.com</strong> and create an API key</li>
              <li>Go to <strong>Settings → AI Assistant</strong> in the master admin</li>
              <li>Paste your key into the <strong>Anthropic API Key</strong> field</li>
              <li>Return here and start chatting</li>
            </ol>
          </div>
          <button className="btn btn-s btn-lg" onClick={() => router.push('/master/settings')}>Go to Settings →</button>
        </div>
      </div>
    )
  }

  const lastMsg = messages[messages.length - 1]
  const lastAssistantWasFileImport = lastMsg?.role === 'assistant' && lastMsg?.isFileImport && !loading
  const parsedDevices = lastAssistantWasFileImport ? parseDevicesFromResponse(lastMsg.content) : []
  const groups = groupChats(chatHistory ?? [])

  return (
    <div className="m-content" style={{ display: 'flex', flexDirection: 'row', height: 'calc(100vh - 64px)', padding: 0, overflow: 'hidden' }}>

      {/* ── Chat history sidebar ─────────────────────────────── */}
      <div style={{ width: 240, flexShrink: 0, borderRight: '1px solid var(--border)', display: 'flex', flexDirection: 'column', background: 'var(--bg2)', overflow: 'hidden' }}>
        {/* New chat */}
        <div style={{ padding: '14px 12px 10px', borderBottom: '1px solid var(--border)' }}>
          <button
            className="btn btn-block"
            onClick={newChat}
            style={{ display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'center', fontSize: 13, padding: '8px 12px' }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
              <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
            New chat
          </button>
        </div>

        {/* Chat list */}
        <div style={{ flex: 1, overflowY: 'auto', paddingBottom: 12 }}>
          {chatHistory === undefined && (
            <div style={{ fontFamily: 'var(--ff)', fontSize: 12, color: 'var(--muted2)', padding: '16px 14px' }}>Loading…</div>
          )}
          {chatHistory?.length === 0 && (
            <div style={{ fontFamily: 'var(--ff)', fontSize: 12, color: 'var(--muted2)', padding: '16px 14px' }}>No saved chats yet</div>
          )}
          {groups.map(group => (
            <div key={group.label}>
              <div style={{ fontFamily: 'var(--ff)', fontSize: 10.5, fontWeight: 700, color: 'var(--muted2)', textTransform: 'uppercase', letterSpacing: '0.6px', padding: '12px 14px 4px' }}>
                {group.label}
              </div>
              {group.items.map(chat => (
                <div
                  key={chat._id}
                  onClick={() => loadChat(chat)}
                  onMouseEnter={() => setHoveredChatId(chat._id)}
                  onMouseLeave={() => setHoveredChatId(null)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 4,
                    padding: '7px 12px 7px 14px', cursor: 'pointer',
                    borderLeft: activeChatId === chat._id ? '2px solid var(--accent)' : '2px solid transparent',
                    background: activeChatId === chat._id
                      ? 'color-mix(in srgb,var(--accent) 8%,transparent)'
                      : hoveredChatId === chat._id
                        ? 'color-mix(in srgb,var(--text) 4%,transparent)'
                        : 'transparent',
                    transition: 'background .1s',
                  }}
                >
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{
                      fontFamily: 'var(--ff)', fontSize: 12.5,
                      fontWeight: activeChatId === chat._id ? 600 : 400,
                      color: 'var(--text)',
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    }}>
                      {chat.title}
                    </div>
                  </div>
                  <button
                    onClick={e => { e.stopPropagation(); handleDeleteChat(chat._id) }}
                    onMouseEnter={e => { e.currentTarget.style.color = 'var(--err)' }}
                    onMouseLeave={e => { e.currentTarget.style.color = 'var(--muted2)' }}
                    style={{
                      background: 'none', border: 'none', cursor: 'pointer',
                      color: 'var(--muted2)', padding: '2px 4px', fontSize: 12.5,
                      flexShrink: 0, lineHeight: 1,
                      opacity: hoveredChatId === chat._id ? 1 : 0,
                      transition: 'opacity .1s',
                    }}
                    aria-label="Delete chat"
                  >✕</button>
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* ── Main chat area ───────────────────────────────────── */}
      <div
        style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, position: 'relative' }}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
      >
        {/* Drag overlay */}
        {isDragging && (
          <div style={{ position: 'absolute', inset: 0, zIndex: 50, background: 'color-mix(in srgb,var(--accent) 8%,transparent)', border: '3px dashed var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 12, pointerEvents: 'none' }}>
            <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'var(--accent)', display: 'grid', placeItems: 'center' }}>
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontFamily: 'var(--ff)', fontSize: 18, fontWeight: 600, color: 'var(--accent)' }}>Drop to process</div>
              <div style={{ fontFamily: 'var(--ff)', fontSize: 13.5, color: 'var(--muted)', marginTop: 4 }}>PDF, XLSX, CSV, TXT, or image</div>
            </div>
          </div>
        )}

        {/* Messages */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '24px 24px', display: 'flex', flexDirection: 'column', gap: 20 }}>

          {messages.length === 0 && (
            <div style={{ margin: 'auto', textAlign: 'center', maxWidth: 460 }}>
              <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'color-mix(in srgb,var(--accent) 10%,transparent)', display: 'grid', placeItems: 'center', margin: '0 auto 16px' }}>
                <SparkleIcon size={24} color="var(--accent)" />
              </div>
              <div style={{ fontFamily: 'var(--ff)', fontSize: 16, fontWeight: 500, marginBottom: 8 }}>Device research assistant</div>
              <p style={{ color: 'var(--muted)', fontSize: 13.5, lineHeight: 1.6, marginBottom: 20 }}>
                Ask me to research a device, or upload a spec sheet to extract and import device data. I only work with data you provide.
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {[
                  'What are the MRI safety specs for the Medtronic Micra AV pacemaker?',
                  'Find details for the Abbott Tendril ST lead, model 1688TC',
                  "I'll paste a CSV with device data — help me format it for import",
                ].map(q => (
                  <button key={q}
                    style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 10, padding: '10px 14px', fontFamily: 'var(--ff)', fontSize: 13, color: 'var(--text)', cursor: 'pointer', textAlign: 'left', transition: 'border-color .15s' }}
                    onClick={() => { setInput(q); textareaRef.current?.focus() }}
                    onMouseOver={e => (e.currentTarget.style.borderColor = 'var(--accent)')}
                    onMouseOut={e => (e.currentTarget.style.borderColor = 'var(--border)')}
                  >{q}</button>
                ))}
              </div>
            </div>
          )}

          {messages.map((m, i) => {
            const isLast = i === messages.length - 1
            const displayContent = m.role === 'assistant' ? stripImportBlock(m.content) : m.content
            return (
              <div key={i}>
                <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start', flexDirection: m.role === 'user' ? 'row-reverse' : 'row' }}>
                  <div style={{ width: 32, height: 32, borderRadius: '50%', flexShrink: 0, display: 'grid', placeItems: 'center', background: m.role === 'user' ? 'var(--accent)' : 'color-mix(in srgb,var(--accent) 12%,transparent)', color: m.role === 'user' ? '#fff' : 'var(--accent)', fontFamily: 'var(--ff)', fontSize: 12, fontWeight: 700 }}>
                    {m.role === 'user' ? 'MA' : <SparkleIcon size={14} color="var(--accent)" />}
                  </div>
                  <div style={{ maxWidth: '82%' }}>
                    <div style={{ background: m.role === 'user' ? 'var(--accent)' : 'var(--bg2)', color: m.role === 'user' ? '#fff' : 'var(--text)', border: m.role === 'user' ? 'none' : '1px solid var(--border)', borderRadius: m.role === 'user' ? '14px 14px 4px 14px' : '4px 14px 14px 14px', padding: '12px 16px', fontFamily: 'var(--fb)', fontSize: 14, lineHeight: 1.65 }}>
                      {m.role === 'user' && m.isFileImport && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8, opacity: 0.85 }}>
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
                          <span style={{ fontSize: 12, fontWeight: 600 }}>File attached</span>
                        </div>
                      )}
                      <MarkdownText text={displayContent} />
                    </div>
                  </div>
                </div>

                {/* Device review cards */}
                {isLast && m.role === 'assistant' && m.isFileImport && parsedDevices.length > 0 && (() => {
                  const newCount = parsedDevices.filter((_, idx) => !duplicateCheck?.[idx]?.exists && importing[idx] !== 'done').length
                  const dupCount = parsedDevices.filter((_, idx) => duplicateCheck?.[idx]?.exists).length
                  const doneCount = parsedDevices.filter((_, idx) => importing[idx] === 'done').length
                  return (
                    <div style={{ marginTop: 16, marginLeft: 44 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12, flexWrap: 'wrap' }}>
                        <div style={{ fontFamily: 'var(--ff)', fontSize: 13, fontWeight: 600 }}>
                          {parsedDevices.length} device{parsedDevices.length !== 1 ? 's' : ''} extracted
                          {duplicateCheck === undefined && <span style={{ color: 'var(--muted)', fontWeight: 400, marginLeft: 6 }}>· checking for duplicates…</span>}
                          {dupCount > 0 && <span style={{ color: 'var(--err)', fontWeight: 400, marginLeft: 6 }}>· {dupCount} already in catalogue</span>}
                          {doneCount > 0 && <span style={{ color: 'var(--ok)', fontWeight: 400, marginLeft: 6 }}>· {doneCount} added</span>}
                        </div>
                        {duplicateCheck !== undefined && newCount > 0 && (
                          <button className="btn btn-s" style={{ fontSize: 12, padding: '5px 13px', marginLeft: 'auto' }} onClick={() => handleBulkApprove(parsedDevices)}>
                            Add all {newCount} to catalogue
                          </button>
                        )}
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                        {parsedDevices.map((device, idx) => {
                          const isDup = duplicateCheck?.[idx]?.exists
                          const dupStatus = duplicateCheck?.[idx]?.status
                          const importStatus = importing[idx]
                          const importErr = importErrors[idx]
                          const isExpanded = expandedCards.has(idx)
                          const deviceTitle = device.name ?? device.model
                          const hasLongNotes = (device.contraindications?.length ?? 0) > 140
                          return (
                            <div key={idx} style={{ background: isDup ? 'color-mix(in srgb,var(--err) 3%,var(--bg))' : 'var(--bg)', border: `1px solid ${isDup ? 'color-mix(in srgb,var(--err) 18%,transparent)' : importStatus === 'done' ? 'color-mix(in srgb,var(--ok) 25%,transparent)' : 'var(--border)'}`, borderRadius: 12, overflow: 'hidden' }}>
                              <div style={{ padding: '10px 14px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', background: 'var(--bg2)' }}>
                                <span style={{ fontFamily: 'var(--ff)', fontSize: 11, fontWeight: 600, background: 'color-mix(in srgb,var(--accent) 10%,transparent)', color: 'var(--accent-deep)', padding: '2px 8px', borderRadius: 5 }}>{device.deviceType}</span>
                                <MriBadge status={device.mriStatus} />
                                <span style={{ fontFamily: 'var(--ff)', fontSize: 11, color: 'var(--muted)', background: 'color-mix(in srgb,var(--muted2) 14%,transparent)', padding: '2px 8px', borderRadius: 5, textTransform: 'capitalize' }}>{device.classification}</span>
                                {isDup && <span style={{ marginLeft: 'auto', fontFamily: 'var(--ff)', fontSize: 11.5, color: 'var(--err)', fontWeight: 700, flexShrink: 0 }}>Already in catalogue{dupStatus ? ` (${dupStatus.replace('_', ' ')})` : ''}</span>}
                                {importStatus === 'done' && !isDup && <span style={{ marginLeft: 'auto', fontFamily: 'var(--ff)', fontSize: 11.5, color: 'var(--ok)', fontWeight: 700, flexShrink: 0 }}>✓ Added</span>}
                              </div>
                              <div style={{ padding: '12px 14px' }}>
                                <div style={{ fontFamily: 'var(--ff)', fontSize: 14, fontWeight: 600, marginBottom: 2 }}>{deviceTitle}</div>
                                <div style={{ fontFamily: 'var(--ff)', fontSize: 12.5, color: 'var(--muted)', marginBottom: device.fieldStrengths || device.contraindications ? 10 : 0 }}>
                                  {device.manufacturer}
                                  {device.name && device.model && <span> · <span style={{ fontFamily: 'SF Mono,Monaco,monospace', fontSize: 11.5 }}>{device.model}</span></span>}
                                </div>
                                {device.fieldStrengths && (
                                  <div style={{ fontFamily: 'var(--ff)', fontSize: 12.5, color: 'var(--text)', marginBottom: device.contraindications ? 6 : 0 }}>
                                    <span style={{ color: 'var(--muted)', marginRight: 4 }}>Field strengths:</span>{device.fieldStrengths}
                                  </div>
                                )}
                                {device.contraindications && (
                                  <div style={{ fontFamily: 'var(--ff)', fontSize: 12.5, color: 'var(--text)', lineHeight: 1.5 }}>
                                    <span style={{ color: 'var(--muted)' }}>Notes: </span>
                                    {isExpanded || !hasLongNotes ? device.contraindications : device.contraindications.slice(0, 140) + '…'}
                                    {hasLongNotes && (
                                      <button onClick={() => toggleCardExpanded(idx)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'var(--ff)', fontSize: 12, color: 'var(--accent)', padding: '0 0 0 4px', fontWeight: 500 }}>
                                        {isExpanded ? 'Show less' : 'Show more'}
                                      </button>
                                    )}
                                  </div>
                                )}
                              </div>
                              {!isDup && importStatus !== 'done' && (
                                <div style={{ padding: '10px 14px', borderTop: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 10 }}>
                                  {importErr && <span style={{ fontFamily: 'var(--ff)', fontSize: 12, color: 'var(--err)', flex: 1 }}>{importErr}</span>}
                                  {importStatus === 'loading'
                                    ? <span style={{ fontFamily: 'var(--ff)', fontSize: 12.5, color: 'var(--muted)' }}>Adding…</span>
                                    : <button className="btn btn-s" style={{ fontSize: 12.5, padding: '6px 14px' }} onClick={() => handleImportDevice(device, idx)}>Add to catalogue</button>
                                  }
                                </div>
                              )}
                            </div>
                          )
                        })}
                      </div>
                      <div style={{ fontFamily: 'var(--ff)', fontSize: 11.5, color: 'var(--muted2)', marginTop: 10 }}>
                        Adds as pending review — visible in All Devices for final sign-off before going live
                      </div>
                    </div>
                  )
                })()}
              </div>
            )
          })}

          {/* Streaming message */}
          {loading && (
            <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
              <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'color-mix(in srgb,var(--accent) 12%,transparent)', display: 'grid', placeItems: 'center', flexShrink: 0 }}>
                <SparkleIcon size={14} color="var(--accent)" />
              </div>
              <div style={{ maxWidth: '82%', background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: '4px 14px 14px 14px', padding: '12px 16px' }}>
                {streamingContent
                  ? <MarkdownText text={stripImportBlock(streamingContent)} />
                  : <div style={{ display: 'flex', gap: 5, alignItems: 'center', padding: '2px 0' }}>
                      {[0, 1, 2].map(i => (
                        <div key={i} style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--accent)', animation: `ai-pulse 1.2s ease-in-out ${i * 0.2}s infinite`, opacity: 0.5 }} />
                      ))}
                    </div>
                }
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
        <div style={{ padding: '14px 24px 18px', borderTop: '1px solid var(--border)', background: 'var(--bg2)', flexShrink: 0 }}>
          {/* File drop zone */}
          <div
            onClick={() => fileInputRef.current?.click()}
            style={{ border: `2px dashed ${isDragging ? 'var(--accent)' : attachedFiles.length ? 'color-mix(in srgb,var(--accent) 40%,transparent)' : 'var(--border2)'}`, borderRadius: 12, background: isDragging ? 'color-mix(in srgb,var(--accent) 6%,transparent)' : attachedFiles.length ? 'color-mix(in srgb,var(--accent) 4%,transparent)' : 'transparent', padding: attachedFiles.length ? '10px 14px' : '16px 20px', marginBottom: 12, cursor: 'pointer', transition: 'border-color .15s, background .15s' }}
          >
            {attachedFiles.length === 0 ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 14, pointerEvents: 'none' }}>
                <div style={{ width: 40, height: 40, borderRadius: 10, background: 'color-mix(in srgb,var(--accent) 10%,transparent)', display: 'grid', placeItems: 'center', flexShrink: 0 }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="1.8"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
                </div>
                <div>
                  <div style={{ fontFamily: 'var(--ff)', fontSize: 13, fontWeight: 500, color: 'var(--text)', marginBottom: 2 }}>Drop a spec sheet, CSV, or spreadsheet</div>
                  <div style={{ fontFamily: 'var(--ff)', fontSize: 12, color: 'var(--muted)' }}>PDF · XLSX (all sheets) · CSV · TXT · Image — or click to browse</div>
                </div>
              </div>
            ) : (
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                {attachedFiles.map(f => (
                  <div key={f.name} style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'color-mix(in srgb,var(--accent) 12%,transparent)', border: '1px solid color-mix(in srgb,var(--accent) 25%,transparent)', borderRadius: 6, padding: '4px 10px 4px 8px', fontFamily: 'var(--ff)', fontSize: 12, color: 'var(--accent-deep)' }}>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
                    {f.name}
                    <button onClick={e => { e.stopPropagation(); setAttachedFiles(p => p.filter(x => x.name !== f.name)) }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)', padding: 0, lineHeight: 1, fontSize: 13, marginLeft: 2 }} aria-label={`Remove ${f.name}`}>✕</button>
                  </div>
                ))}
                <span style={{ fontFamily: 'var(--ff)', fontSize: 12, color: 'var(--accent)', marginLeft: 4 }}>+ Add more</span>
              </div>
            )}
          </div>

          <input ref={fileInputRef} type="file" accept=".pdf,.csv,.tsv,.txt,.xlsx,.xls,image/*" multiple style={{ display: 'none' }}
            onChange={async e => { if (e.target.files) await processDroppedFiles(Array.from(e.target.files)); e.target.value = '' }} />

          <div
            style={{ display: 'flex', gap: 10, alignItems: 'flex-end', background: 'var(--bg)', border: '1.5px solid var(--border2)', borderRadius: 14, padding: '8px 8px 8px 16px', transition: 'border-color .15s' }}
            onFocusCapture={e => (e.currentTarget.style.borderColor = 'var(--accent)')}
            onBlurCapture={e => (e.currentTarget.style.borderColor = 'var(--border2)')}
          >
            <textarea
              ref={textareaRef} rows={1}
              placeholder="Ask about a device, paste data, or drop a file above…"
              value={input} onChange={e => setInput(e.target.value)} onKeyDown={handleKeyDown} disabled={loading}
              style={{ flex: 1, border: 'none', outline: 'none', resize: 'none', background: 'transparent', fontFamily: 'var(--fb)', fontSize: 14, color: 'var(--text)', lineHeight: 1.55, maxHeight: 160, overflowY: 'auto', paddingTop: 4, verticalAlign: 'top' }}
            />
            <button className="btn btn-s" onClick={send} disabled={loading || !input.trim()} style={{ flexShrink: 0, height: 38, width: 38, padding: 0, display: 'grid', placeItems: 'center', borderRadius: 10 }} aria-label="Send message">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
            </button>
          </div>

          <div style={{ fontFamily: 'var(--ff)', fontSize: 11.5, color: 'var(--muted2)', marginTop: 8, textAlign: 'center' }}>
            Enter to send · Shift+Enter for new line · Devices added as pending review, not published automatically
          </div>
        </div>
      </div>

      <style>{`
        @keyframes ai-pulse {
          0%, 100% { opacity: 0.3; transform: scale(0.85); }
          50%       { opacity: 1;   transform: scale(1.1); }
        }
      `}</style>
    </div>
  )
}
