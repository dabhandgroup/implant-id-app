'use client'
import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'

const API_KEY_STORAGE = 'implantid_anthropic_key'
const MODEL = 'claude-opus-4-8'

const SYSTEM_PROMPT = `You are an AI assistant for Implant ID, a medical device registry platform.
Your job is to help administrators research and add medical implant device data to the catalogue.

You can help with:
- Researching specific devices (pacemakers, ICDs, cochlear implants, spinal cord stimulators, orthopaedic implants, etc.)
- Finding device specifications: manufacturer, model number, MRI safety status, device type
- Parsing and importing device data from spreadsheets or tables that the user pastes
- Formatting device data into the fields required by the catalogue

Required fields for each device:
- Manufacturer name
- Device name / model
- Model number
- Device type (e.g. Pacemaker, ICD, Cochlear Implant, Hip Replacement, etc.)
- MRI status: "safe", "conditional", or "unsafe"

When the user pastes spreadsheet data, parse all devices from it and present each one clearly.
Be concise, factual, and accurate. When unsure about MRI status, say so — this is a patient safety issue.`

interface Message {
  role: 'user' | 'assistant'
  content: string
}

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
  const [apiKey,    setApiKey]    = useState<string>('')
  const [keyLoaded, setKeyLoaded] = useState(false)
  const [messages,  setMessages]  = useState<Message[]>([])
  const [input,     setInput]     = useState('')
  const [loading,   setLoading]   = useState(false)
  const [error,     setError]     = useState('')
  const bottomRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    const stored = localStorage.getItem(API_KEY_STORAGE) ?? ''
    setApiKey(stored)
    setKeyLoaded(true)
  }, [])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  // Auto-resize textarea
  useEffect(() => {
    const el = textareaRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${Math.min(el.scrollHeight, 160)}px`
  }, [input])

  async function send() {
    const text = input.trim()
    if (!text || loading) return
    setInput('')
    setError('')

    const updated: Message[] = [...messages, { role: 'user', content: text }]
    setMessages(updated)
    setLoading(true)

    try {
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type':                  'application/json',
          'x-api-key':                     apiKey,
          'anthropic-version':             '2023-06-01',
          'anthropic-dangerous-allow-browser': 'true',
        },
        body: JSON.stringify({
          model:      MODEL,
          max_tokens: 2048,
          system:     SYSTEM_PROMPT,
          messages:   updated.map(m => ({ role: m.role, content: m.content })),
        }),
      })

      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err?.error?.message ?? `API error ${res.status}`)
      }

      const data = await res.json()
      const reply = data.content?.[0]?.text ?? ''
      setMessages(prev => [...prev, { role: 'assistant', content: reply }])
    } catch (e) {
      setError((e as Error).message ?? 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      send()
    }
  }

  function clearChat() {
    setMessages([])
    setError('')
  }

  if (!keyLoaded) return null

  if (!apiKey) {
    return (
      <div className="m-content">
        <div style={{ maxWidth: 520, margin: '60px auto', textAlign: 'center' }}>
          <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'color-mix(in srgb,var(--accent) 12%,transparent)', display: 'grid', placeItems: 'center', margin: '0 auto 24px' }}>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="1.7">
              <path d="M12 2a9 9 0 0 1 9 9c0 4.97-4.03 9-9 9s-9-4.03-9-9a9 9 0 0 1 9-9z"/>
              <path d="M9 9h.01M15 9h.01M9.5 14.5s1 1.5 2.5 1.5 2.5-1.5 2.5-1.5"/>
            </svg>
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
              <li>Go to <strong>Settings</strong> in the master admin</li>
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

  return (
    <div className="m-content" style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 64px)', padding: 0 }}>

      {/* Toolbar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 28px', borderBottom: '1px solid var(--border)', background: 'var(--bg2)', flexShrink: 0 }}>
        <div style={{ fontFamily: 'var(--ff)', fontSize: 13.5, fontWeight: 500, color: 'var(--text)', display: 'flex', alignItems: 'center', gap: 8 }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="1.7">
            <path d="M12 2a9 9 0 0 1 9 9c0 4.97-4.03 9-9 9s-9-4.03-9-9a9 9 0 0 1 9-9z"/>
            <path d="M9 9h.01M15 9h.01M9.5 14.5s1 1.5 2.5 1.5 2.5-1.5 2.5-1.5"/>
          </svg>
          AI Device Assistant
          <span style={{ fontFamily: 'var(--ff)', fontSize: 11, color: 'var(--muted2)', fontWeight: 400 }}>· {MODEL}</span>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {messages.length > 0 && (
            <button className="btn" style={{ fontSize: 12, padding: '5px 12px' }} onClick={clearChat}>
              Clear chat
            </button>
          )}
          <button className="btn" style={{ fontSize: 12, padding: '5px 12px' }} onClick={() => router.push('/master/settings')}>
            API key
          </button>
        </div>
      </div>

      {/* Messages */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '24px 28px', display: 'flex', flexDirection: 'column', gap: 20 }}>
        {messages.length === 0 && (
          <div style={{ margin: 'auto', textAlign: 'center', maxWidth: 440 }}>
            <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'color-mix(in srgb,var(--accent) 10%,transparent)', display: 'grid', placeItems: 'center', margin: '0 auto 16px' }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="1.7">
                <path d="M12 2a9 9 0 0 1 9 9c0 4.97-4.03 9-9 9s-9-4.03-9-9a9 9 0 0 1 9-9z"/>
                <path d="M9 9h.01M15 9h.01M9.5 14.5s1 1.5 2.5 1.5 2.5-1.5 2.5-1.5"/>
              </svg>
            </div>
            <div style={{ fontFamily: 'var(--ff)', fontSize: 16, fontWeight: 500, marginBottom: 8 }}>Device research assistant</div>
            <p style={{ color: 'var(--muted)', fontSize: 13.5, lineHeight: 1.6, marginBottom: 20 }}>
              Ask me to research a device, paste a spreadsheet to import, or describe what you need to add to the catalogue.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {[
                'What are the MRI safety specs for the Medtronic Micra AV pacemaker?',
                'Find device details for the Abbott Tendril ST lead, model 1688TC',
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

        {messages.map((m, i) => (
          <div key={i} style={{ display: 'flex', gap: 12, alignItems: 'flex-start',
            flexDirection: m.role === 'user' ? 'row-reverse' : 'row' }}>
            <div style={{
              width: 32, height: 32, borderRadius: '50%', flexShrink: 0, display: 'grid', placeItems: 'center',
              background: m.role === 'user'
                ? 'var(--accent)'
                : 'color-mix(in srgb,var(--accent) 12%,transparent)',
              color: m.role === 'user' ? '#fff' : 'var(--accent)',
              fontFamily: 'var(--ff)', fontSize: 12, fontWeight: 700,
            }}>
              {m.role === 'user' ? 'MA' : (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
                  <path d="M12 2a9 9 0 0 1 9 9c0 4.97-4.03 9-9 9s-9-4.03-9-9a9 9 0 0 1 9-9z"/>
                  <path d="M9 9h.01M15 9h.01M9.5 14.5s1 1.5 2.5 1.5 2.5-1.5 2.5-1.5"/>
                </svg>
              )}
            </div>
            <div style={{
              maxWidth: '78%',
              background: m.role === 'user' ? 'var(--accent)' : 'var(--bg2)',
              color: m.role === 'user' ? '#fff' : 'var(--text)',
              border: m.role === 'user' ? 'none' : '1px solid var(--border)',
              borderRadius: m.role === 'user' ? '14px 14px 4px 14px' : '4px 14px 14px 14px',
              padding: '12px 16px',
              fontFamily: 'var(--fb)', fontSize: 14, lineHeight: 1.65,
            }}>
              <MarkdownText text={m.content} />
            </div>
          </div>
        ))}

        {loading && (
          <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
            <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'color-mix(in srgb,var(--accent) 12%,transparent)', display: 'grid', placeItems: 'center', color: 'var(--accent)', flexShrink: 0 }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
                <path d="M12 2a9 9 0 0 1 9 9c0 4.97-4.03 9-9 9s-9-4.03-9-9a9 9 0 0 1 9-9z"/>
                <path d="M9 9h.01M15 9h.01M9.5 14.5s1 1.5 2.5 1.5 2.5-1.5 2.5-1.5"/>
              </svg>
            </div>
            <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: '4px 14px 14px 14px', padding: '12px 16px' }}>
              <div style={{ display: 'flex', gap: 5, alignItems: 'center' }}>
                {[0, 1, 2].map(i => (
                  <div key={i} style={{
                    width: 7, height: 7, borderRadius: '50%', background: 'var(--accent)',
                    animation: `pulse 1.2s ease-in-out ${i * 0.2}s infinite`,
                    opacity: 0.5,
                  }} />
                ))}
              </div>
            </div>
          </div>
        )}

        {error && (
          <div style={{ background: 'color-mix(in srgb,var(--err) 8%,transparent)', border: '1px solid color-mix(in srgb,var(--err) 20%,transparent)', borderRadius: 10, padding: '10px 14px', fontFamily: 'var(--ff)', fontSize: 13, color: 'var(--err)' }}>
            {error}
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div style={{ padding: '16px 28px', borderTop: '1px solid var(--border)', background: 'var(--bg2)', flexShrink: 0 }}>
        <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end', background: 'var(--bg)', border: '1.5px solid var(--border2)', borderRadius: 14, padding: '8px 8px 8px 16px', transition: 'border-color .15s' }}
          onFocusCapture={e => (e.currentTarget.style.borderColor = 'var(--accent)')}
          onBlurCapture={e => (e.currentTarget.style.borderColor = 'var(--border2)')}
        >
          <textarea
            ref={textareaRef}
            rows={1}
            placeholder="Ask about a device, paste spreadsheet data, or describe what to import…"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={loading}
            style={{
              flex: 1, border: 'none', outline: 'none', resize: 'none', background: 'transparent',
              fontFamily: 'var(--fb)', fontSize: 14, color: 'var(--text)', lineHeight: 1.55,
              maxHeight: 160, overflowY: 'auto', paddingTop: 4,
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
          Enter to send · Shift+Enter for new line · You can paste spreadsheet data directly
        </div>
      </div>

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 0.3; transform: scale(0.85); }
          50% { opacity: 1; transform: scale(1.1); }
        }
      `}</style>
    </div>
  )
}
