import React from 'react'

export default function Settings() {
  return (
    <div className="settings">
      <h3>Settings</h3>
      <p>Local chat history stored in browser. Server stores history in data/ for now.</p>
      <p>AI provider: use environment variables on the server (.env)</p>
    </div>
  )
}
