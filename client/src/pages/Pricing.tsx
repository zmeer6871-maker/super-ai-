import React from 'react'

export default function Pricing() {
  return (
    <div style={{padding:12,background:'rgba(255,255,255,0.02)',borderRadius:8}}>
      <h2>Pricing</h2>
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:12}}>
        <div style={{padding:12,background:'#071229',borderRadius:8}}>
          <h3>Free</h3>
          <p>₹0 — 150 messages/day</p>
          <ul>
            <li>ALIC, DESK, SIR X</li>
            <li>Core chat modes</li>
          </ul>
        </div>
        <div style={{padding:12,background:'#071229',borderRadius:8}}>
          <h3>Pro</h3>
          <p>₹99/month — 1000 messages/day</p>
          <ul>
            <li>Voice</li>
            <li>Image understanding</li>
            <li>PDF/file features</li>
          </ul>
        </div>
        <div style={{padding:12,background:'#071229',borderRadius:8}}>
          <h3>Ultra</h3>
          <p>₹299/month — Unlimited subject to fair-use</p>
          <ul>
            <li>Voice, images, advanced features</li>
          </ul>
        </div>
      </div>
      <p style={{marginTop:12,color:'#94a3b8'}}>Note: Payment integration is not included. To enable paid features, integrate a payment provider and server-side entitlement checks.</p>
    </div>
  )
}
