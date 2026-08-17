import React, { useEffect, useState, useRef } from 'react'

type Msg = { id: string; role: 'user' | 'assistant' | 'system'; text: string }

const ASSISTANTS = ['ALIC', 'DESK', 'SIR X']
const MODES = ['general','study','writing','coding','translator','summarizer','quiz','explore','auto']

function isClarifying(text: string) {
  const t = text.trim();
  if (!t) return false;
  // heuristics: short question, starts with a question word or ends with '?'
  const qwords = ['who','what','when','where','why','how','which']
  const first = t.split(/\s+/)[0].replace(/[^a-zA-Z]/g,'').toLowerCase()
  if (t.endsWith('?')) return true
  if (qwords.includes(first) && t.length < 200) return true
  return false
}

export default function Chat() {
  const [messages, setMessages] = useState<Msg[]>(() => {
    try { return JSON.parse(localStorage.getItem('sa_messages') || '[]') } catch { return [] }
  })
  const [input, setInput] = useState('')
  const [assistant, setAssistant] = useState('ALIC')
  const [mode, setMode] = useState('general')
  const [auto, setAuto] = useState(false)
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
      const res = await fetch('/api/chat', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ messages: [{ role: 'user', content: userMsg.text }], assistant, mode, auto }) })
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

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]
    if (!f) return
    // upload to server
    const fd = new FormData()
    fd.append('file', f)
    try {
      const up = await fetch('/api/upload', { method: 'POST', body: fd })
      if (!up.ok) { alert('Upload failed'); return }
      const j = await up.json()
      const url = j.url
      const tag = `![${f.name}](${url})`
      // add message with image markdown and send to provider
      const userMsg: Msg = { id: Date.now().toString(), role: 'user', text: tag }
      setMessages((s) => [...s, userMsg])
      // auto-send image context to /api/chat
      setLoading(true)
      const res = await fetch('/api/chat', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ messages: [{ role: 'user', content: `User attached image: ${url}` }], assistant, mode, auto }) })
      if (!res.ok) {
        const err = await res.json().catch(() => ({ message: 'Unknown error' }))
        setMessages((s) => [...s, { id: Date.now().toString(), role: 'assistant', text: `Error: ${err.message || JSON.stringify(err)}` }])
      } else {
        const j2 = await res.json()
        const text = j2.result?.text || JSON.stringify(j2.result)
        setMessages((s) => [...s, { id: Date.now().toString(), role: 'assistant', text }])
      }
    } catch (e:any) { setMessages((s) => [...s, { id: Date.now().toString(), role: 'assistant', text: `Upload/Network error: ${e.message}` }]) }
    finally { setLoading(false) }
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

  // Filter UI: quick show last N messages from assistant
  const [filterAssistant, setFilterAssistant] = useState<string>('all')
  const filtered = filterAssistant === 'all' ? messages : messages.filter(m => m.role === 'assistant' ? (filterAssistant === 'assistant' ? true : true) : true)

  return (
    <div className="chat">
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
        <div className="controls">
          <select value={assistant} onChange={(e) => setAssistant(e.target.value)}>
            {ASSISTANTS.map(a => <option key={a} value={a}>{a}</option>)}
          </select>
          <select value={mode} onChange={(e) => setMode(e.target.value)}>
            {MODES.map(m => <option key={m} value={m}>{m}</option>)}
          </select>
          <label style={{display:'flex',alignItems:'center',gap:6}}>
            <input type="checkbox" checked={auto} onChange={(e)=>setAuto(e.target.checked)} /> Auto
          </label>
          <button onClick={onAttach}>Attach</button>
          <button onClick={startVoice}>Voice</button>
          <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={onFile} />
        </div>
        <div style={{display:'flex',alignItems:'center',gap:8}}>
          <label style={{color:'#94a3b8'}}>Filter</label>
          <select value={filterAssistant} onChange={(e)=>setFilterAssistant(e.target.value)}>
            <option value="all">All</option>
            <option value="assistant">Assistant</option>
            <option value="user">User</option>
            <option value="system">System</option>
          </select>
        </div>
      </div>
      <div className="messages">
        {filtered.map(m => (
          <div key={m.id} className={"message " + m.role}>
            <div className="role">{m.role}</div>
            <div className="text">
              {m.text}
              {m.role === 'assistant' && isClarifying(m.text) ? <div style={{marginTop:6,fontSize:12,color:'#a3a3a3'}}>Clarifying question</div> : null}
            </div>
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
