import React from 'react'

export default function Explore() {
  return (
    <div style={{padding:12}}>
      <h2>Explore</h2>
      <p>Use Explore to find inspiration, prompts, and starter templates for writing, studying, and coding.</p>
      <section style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
        <div style={{padding:12,background:'rgba(255,255,255,0.02)',borderRadius:8}}>
          <h4>Study Templates</h4>
          <ul>
            <li>Explain like I'm 5</li>
            <li>Step-by-step worked example</li>
            <li>Short quiz with answers</li>
          </ul>
        </div>
        <div style={{padding:12,background:'rgba(255,255,255,0.02)',borderRadius:8}}>
          <h4>Writing Prompts</h4>
          <ul>
            <li>Improve tone to professional</li>
            <li>Shorten for social media</li>
            <li>Expand with examples</li>
          </ul>
        </div>
      </section>
    </div>
  )
}
