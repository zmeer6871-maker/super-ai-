import express from 'express'
import bodyParser from 'body-parser'
import { getPaymentProvider } from '../payments/provider'
import { pool } from '../db'

const router = express.Router()

const provider = getPaymentProvider()

router.get('/setup-status', (req, res) => {
  res.json({ configured: provider.configured, provider: provider.getName() })
})

router.get('/methods', async (req, res) => {
  if (!provider.configured) return res.json({ configured: false, methods: [] })
  if (!provider.getSupportedMethods) return res.json({ configured: true, methods: [] })
  try {
    const methods = await provider.getSupportedMethods()
    res.json({ configured: true, methods })
  } catch (e:any) { console.error('getSupportedMethods error', e); res.status(500).json({ error: 'provider_error' }) }
})

// Create a payment/order record (server-side) — persist a payments row and delegate to provider
router.post('/create-order', async (req, res) => {
  try {
    const { plan, amount, currency } = req.body
    if (!plan || !amount) return res.status(400).json({ error: 'invalid_request', message: 'plan and amount are required' })

    if (!provider.configured) return res.status(400).json({ error: 'payments_not_configured', message: 'Payment provider not configured' })

    const userId = (req as any).user?.id || null
    // Insert payment record with created status
    const insert = await pool.query(
      'INSERT INTO payments(user_id, provider, provider_payment_id, amount_cents, currency, status, metadata, created_at) VALUES($1,$2,$3,$4,$5,$6,$7,now()) RETURNING id',
      [userId, provider.getName(), null, Math.round(amount * 100), currency || 'INR', 'created', JSON.stringify({ plan })]
    )
    const paymentId = insert.rows[0].id

    // Call provider to create an order
    const result = await provider.createOrder({ userId, plan, amountCents: Math.round(amount * 100), currency: currency || 'INR', metadata: { paymentId } })

    // Update payment record with provider order id and set to pending
    await pool.query('UPDATE payments SET provider_payment_id=$1, status=$2, metadata=$3 WHERE id=$4', [result.providerOrderId, 'pending', JSON.stringify({ ...(Array.isArray((insert.rows[0]||[]).metadata) ? {} : insert.rows[0].metadata), providerCheckout: result.checkout }), paymentId])

    res.json({ ok: true, paymentId, providerOrderId: result.providerOrderId, checkout: result.checkout })
  } catch (e:any) {
    console.error('create-order error', e)
    if (e.message === 'payments_not_configured') return res.status(400).json({ error: 'payments_not_configured' })
    res.status(500).json({ error: 'provider_error', message: e.message })
  }
})

// Optional client-side verify endpoint (providers often use webhooks; this allows verifying a payment after redirect)
router.post('/verify', async (req, res) => {
  try {
    const { providerOrderId, providerResponse } = req.body
    if (!providerOrderId) return res.status(400).json({ error: 'invalid_request' })
    if (!provider.configured || !provider.verifyPayment) return res.status(400).json({ error: 'payments_not_configured' })
    const v = await provider.verifyPayment(providerOrderId, providerResponse)
    // Update payment record based on verification
    let status = v.status || (v.ok ? 'succeeded' : 'failed')
    await pool.query('UPDATE payments SET status=$1, metadata=COALESCE(metadata, '{}'::jsonb) || $2 WHERE provider_payment_id=$3', [status, JSON.stringify({ providerVerification: v }), providerOrderId])
    // If succeeded, activate subscription (server-side entitlement update)
    if (v.ok) {
      // Lookup payment to find user and plan
      const p = await pool.query('SELECT id,user_id,metadata FROM payments WHERE provider_payment_id=$1', [providerOrderId])
      if (p.rowCount > 0) {
        const payment = p.rows[0]
        const meta = payment.metadata || {}
        const plan = meta.plan || meta?.providerCheckout?.notes?.plan || 'pro'
        // create subscription record
        await pool.query('INSERT INTO subscriptions(user_id,plan,status,provider,provider_subscription_id,current_period_end,created_at) VALUES($1,$2,$3,$4,$5,$6,now())', [payment.user_id, plan, 'active', provider.getName(), providerOrderId, new Date(Date.now() + 30*24*3600*1000)])
      }
    }
    res.json({ ok: true, verified: v.ok, status })
  } catch (e:any) { console.error('verify error', e); res.status(500).json({ error: 'server_error' }) }
})

// Generic webhook endpoint — delegate to provider.handleWebhook if provided
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
