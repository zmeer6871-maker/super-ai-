import React from 'react'
import Chat from './components/Chat'
import Settings from './components/Settings'

export default function App() {
  return (
    <div className="app">
      <header className="app-header">Super AI</header>
      <main>
        <Chat />
      </main>
      <aside>
        <Settings />
      </aside>
    </div>
  )
}
