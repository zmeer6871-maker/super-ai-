import React, { useState } from 'react'

export default function Settings() {
  const [serverHistory, setServerHistory] = useState<any[] | null>(null)

  async function fetchServerHistory() {
    try {
      const res = await fetch('/api/history?limit=200')
      if (!res.ok) throw new Error('Failed to load')
      const j = await res.json()
      setServerHistory(j.items)
    } catch (e:any) {
      alert('Could not fetch server history: ' + (e.message||e))
    }
  }

  function exportLocal() {
    const data = localStorage.getItem('sa_messages') || '[]'
    const blob = new Blob([data], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = 'sa_messages.json'; a.click()
    URL.revokeObjectURL(url)
  }

  function importLocal(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]
    if (!f) return
    const r = new FileReader()
    r.onload = () => {
      try {
        const v = JSON.parse(r.result as string)
        localStorage.setItem('sa_messages', JSON.stringify(v))
        alert('Imported local history.')
        window.location.reload()
      } catch (e:any) { alert('Invalid file') }
    }
    r.readAsText(f)
  }

  return (
    <div className="settings">
      <h3>Settings</h3>
      <p>Local chat history stored in browser. Server stores history in data/ for now.</p>
      <p>AI provider: use environment variables on the server (.env)</p>

      <div style={{marginTop:12}}>
        <button onClick={fetchServerHistory}>Load server history</button>
        <div style={{marginTop:8}}>{serverHistory ? <pre style={{maxHeight:120,overflow:'auto'}}>{JSON.stringify(serverHistory.slice(-20),null,2)}</pre> : <small>No server history loaded</small>}</div>
      </div>

      <div style={{marginTop:12}}>
        <button onClick={exportLocal}>Export local history</button>
        <input type="file" accept="application/json" onChange={importLocal} />
      </div>
    </div>
  )
}
