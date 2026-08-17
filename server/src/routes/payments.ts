import express from 'express'
import bodyParser from 'body-parser'
import { getPaymentProvider } from '../payments/provider'

const router = express.Router()

const provider = getPaymentProvider()

router.get('/setup-status', (req, res) => {
  res.json({ configured: provider.configured, provider: provider.getName() })
})

// Create a payment/order record (server-side). The provider decides what to return.
router.post('/create-order', async (req, res) => {
  try {
    const { plan, amount, currency } = req.body
    if (!plan || !amount) return res.status(400).json({ error: 'invalid_request', message: 'plan and amount are required' })
    if (!provider.configured) return res.status(400).json({ error: 'payments_not_configured', message: 'Payment provider not configured' })
    const order = await provider.createOrder({ userId: (req as any).user?.id || null, plan, amountCents: Math.round(amount * 100), currency: currency || 'INR', metadata: {} })
    res.json({ ok: true, order })
  } catch (e:any) {
    console.error('create-order error', e)
    if (e.message === 'payments_not_configured') return res.status(400).json({ error: 'payments_not_configured' })
    res.status(500).json({ error: 'provider_error', message: e.message })
  }
})

// Generic webhook endpoint — delegate to provider.handleWebhook if provided
// Use raw body for signature verification middleware where necessary
router.post('/webhook', bodyParser.raw({ type: 'application/json' }), async (req, res) => {
  try {
    if (!provider.configured || !provider.handleWebhook) return res.status(400).json({ error: 'payments_not_configured' })
    await provider.handleWebhook(req, res)
  } catch (e:any) {
    console.error('webhook handler error', e)
    res.status(500).json({ error: 'server_error' })
  }
})

export default router
