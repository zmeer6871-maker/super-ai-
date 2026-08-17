/*
  Generic payment provider interface and factory.
  This keeps the payment system provider-agnostic. Concrete providers can be implemented
  in server/src/payments/providers/ and returned by getPaymentProvider().

  Currently, if no provider is configured, the UnconfiguredProvider will respond with
  clear 'payments_not_configured' errors. This removes the Razorpay-specific code and
  lets you add any provider later without changing the rest of the app.
*/

import { Request, Response } from 'express'

export interface PaymentOrder {
  userId?: number | null
  plan: string
  amountCents: number
  currency: string
  metadata?: any
}

export interface PaymentProvider {
  configured: boolean
  getName(): string
  createOrder(order: PaymentOrder): Promise<{ providerOrderId: string; order: any }>
  verifyWebhookSignature?(req: Request): Promise<boolean>
  handleWebhook?(req: Request, res: Response): Promise<void>
}

class UnconfiguredProvider implements PaymentProvider {
  configured = false
  getName() { return 'none' }
  async createOrder() { throw new Error('payments_not_configured') }
  async verifyWebhookSignature() { return false }
  async handleWebhook() { throw new Error('payments_not_configured') }
}

export function getPaymentProvider(): PaymentProvider {
  const selected = process.env.PAYMENT_PROVIDER || ''
  if (!selected) return new UnconfiguredProvider()
  // load provider dynamically from providers/ folder if implemented
  try {
    // provider module must export a default PaymentProvider instance
    // e.g., export default new RazorpayProvider(...)
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const module = require(`./providers/${selected}`)
    return module.default
  } catch (e) {
    console.warn('Payment provider module not found for', selected)
    return new UnconfiguredProvider()
  }
}
