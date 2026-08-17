import React, { useEffect, useState, useRef } from 'react'

type Msg = { id: string; role: 'user' | 'assistant'; text: string }

const ASSISTANTS = ['ALIC', 'DESK', 'SIR X']

export default function Chat() {
  const [messages, setMessages] = useState<Msg[]>(() => {
    try { return JSON.parse(localStorage.getItem('sa_messages') || '[]') } catch { return [] }
  })
  const [input, setInput] = useState('')
  const [assistant, setAssistant] = useState('ALIC')
  const [loading, setLoading] = useState(false)
  const fileRef = useRef<HTMLInputElement | null>(null)

  useEffect(() => { localStorage.setItem('sa_messages', JSON.stringify(messages)) }, [messages])

  async function send() {
    if (!input.trim()) return
    const userMsg: Msg = { id: Date.now().toString(), role: 'user', text: input }
    setMessages((s) => [...s, userMsg])
    setInput('')
    setLoading(true)
    try {
      const res = await fetch('/api/chat', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ messages: [{ role: 'user', content: userMsg.text }], assistant }) })
      if (!res.ok) {
        const err = await res.json().catch(() => ({ message: 'Unknown error' }))
        setMessages((s) => [...s, { id: Date.now().toString(), role: 'assistant', text: `Error: ${err.message || JSON.stringify(err)}` }])
      } else {
        const j = await res.json()
        const text = j.result?.text || JSON.stringify(j.result)
        setMessages((s) => [...s, { id: Date.now().toString(), role: 'assistant', text }])
      }
    } catch (e: any) {
      setMessages((s) => [...s, { id: Date.now().toString(), role: 'assistant', text: `Network error: ${e.message}` }])
    } finally {
      setLoading(false)
    }
  }

  function onAttach() {
    fileRef.current?.click()
  }

  function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]
    if (!f) return
    setMessages((s) => [...s, { id: Date.now().toString(), role: 'user', text: `[Image attached: ${f.name}]` }])
  }

  // Basic voice input using SpeechRecognition if available
  async function startVoice() {
    // @ts-ignore
    const SpeechRecognition = window.SpeechRecognition || (window as any).webkitSpeechRecognition
    if (!SpeechRecognition) {
      alert('Voice input not supported in this browser')
      return
    }
    const r = new SpeechRecognition()
    r.lang = 'en-US'
    r.onresult = (ev: any) => {
      const t = ev.results[0][0].transcript
      setInput((s) => s ? s + ' ' + t : t)
    }
    r.onerror = (ev: any) => console.error('voice error', ev)
    r.start()
  }

  return (
    <div className="chat">
      <div className="controls">
        <select value={assistant} onChange={(e) => setAssistant(e.target.value)}>
          {ASSISTANTS.map(a => <option key={a} value={a}>{a}</option>)}
        </select>
        <button onClick={onAttach}>Attach</button>
        <button onClick={startVoice}>Voice</button>
        <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={onFile} />
      </div>
      <div className="messages">
        {messages.map(m => (
          <div key={m.id} className={"message " + m.role}>
            <div className="role">{m.role}</div>
            <div className="text">{m.text}</div>
          </div>
        ))}
      </div>
      <div className="composer">
        <input value={input} onChange={(e) => setInput(e.target.value)} placeholder="Type a message" />
        <button onClick={send} disabled={loading}>{loading ? '...' : 'Send'}</button>
      </div>
    </div>
  )
}
