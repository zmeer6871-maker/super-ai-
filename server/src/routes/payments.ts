import express from 'express'
import Razorpay from 'razorpay'
import crypto from 'crypto'
import { pool } from '../db'

const router = express.Router()

function razorConfigured() {
  return !!(process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET)
}

router.get('/setup-status', (req, res) => {
  res.json({ configured: razorConfigured() })
})

// create order (server-side) — client sends desired plan and amount
router.post('/create-order', async (req, res) => {
  if (!razorConfigured()) return res.status(400).json({ error: 'payments_not_configured', message: 'Razorpay keys not configured' })
  const { plan, amount } = req.body
  if (!plan || !amount) return res.status(400).json({ error: 'invalid_request' })
  const rzp = new Razorpay({ key_id: process.env.RAZORPAY_KEY_ID!, key_secret: process.env.RAZORPAY_KEY_SECRET! })
  try {
    const order = await rzp.orders.create({ amount: Math.round(amount * 100), currency: 'INR', receipt: `rcpt_${Date.now()}`, notes: { plan } })
    res.json({ order })
  } catch (e:any) { console.error(e); res.status(500).json({ error: 'provider_error' }) }
})

// webhook handler
router.post('/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET
  if (!secret) return res.status(400).json({ error: 'webhook_not_configured' })
  const signature = req.headers['x-razorpay-signature'] as string || ''
  const body = req.body as Buffer
  const expected = crypto.createHmac('sha256', secret).update(body).digest('hex')
  if (expected !== signature) return res.status(400).json({ error: 'invalid_signature' })
  const payload = JSON.parse(body.toString())
  // TODO: handle events (payment.captured, subscription.paid, etc.)
  console.log('Razorpay webhook', payload.event)
  res.json({ ok: true })
})

export default router
