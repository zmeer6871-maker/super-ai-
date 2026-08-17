import React from 'react'
import Chat from './components/Chat'
import Settings from './components/Settings'
import Explore from './pages/Explore'
import Pricing from './pages/Pricing'

import './index.css'

export default function App() {
  const [route, setRoute] = React.useState<'chat'|'explore'|'pricing'>('chat')

  return (
    <div className="app">
      <header className="app-header">
        <div className="brand">Super AI</div>
        <nav className="nav">
          <button onClick={() => setRoute('chat')}>Chat</button>
          <button onClick={() => setRoute('explore')}>Explore</button>
          <button onClick={() => setRoute('pricing')}>Pricing</button>
        </nav>
      </header>
      <main>
        {route === 'chat' && <Chat />}
        {route === 'explore' && <Explore />}
        {route === 'pricing' && <Pricing />}
      </main>
      <aside>
        <Settings />
      </aside>
    </div>
  )
}
