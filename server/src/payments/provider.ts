/*
  Payment provider interface (extended)
  - The interface is provider-agnostic and supports listing payment methods
  - Concrete providers should be implemented in server/src/payments/providers/<provider>.ts
  - do NOT export secrets or hardcode provider credentials here
*/

import { Request, Response } from 'express'

export type PaymentMethod =
  | 'upi'
  | 'upi_qr'
  | 'upi_intent'
  | 'card_debit'
  | 'card_credit'
  | 'net_banking'
  | 'wallet'
  | 'other'

export interface PaymentOrder {
  userId?: number | null
  plan: string
  amountCents: number
  currency: string
  metadata?: any
}

export interface CreateOrderResult {
  providerOrderId: string
  // provider-specific payload to open checkout securely on client (checkoutUrl, checkoutToken, formData, etc.)
  checkout?: any
}

export interface PaymentProvider {
  configured: boolean
  getName(): string
  getSupportedMethods?(): Promise<PaymentMethod[]>
  createOrder(order: PaymentOrder): Promise<CreateOrderResult>
  verifyPayment?(providerOrderId: string, payload: any): Promise<{ ok: boolean; status?: string; providerTransactionId?: string; metadata?: any }> // optional
  verifyWebhookSignature?(req: Request): Promise<boolean>
  handleWebhook?(req: Request, res: Response): Promise<void>
}

class UnconfiguredProvider implements PaymentProvider {
  configured = false
  getName() { return 'none' }
  async getSupportedMethods() { return [] }
  async createOrder() { throw new Error('payments_not_configured') }
  async verifyPayment() { throw new Error('payments_not_configured') }
  async verifyWebhookSignature() { return false }
  async handleWebhook() { throw new Error('payments_not_configured') }
}

export function getPaymentProvider(): PaymentProvider {
  const selected = (process.env.PAYMENT_PROVIDER || '').toLowerCase()
  if (!selected) return new UnconfiguredProvider()
  try {
    // provider module must export a default PaymentProvider instance
    // e.g., export default new SomeProvider(...)
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const module = require(`./providers/${selected}`)
    return module.default
  } catch (e) {
    console.warn('Payment provider module not found for', selected)
    return new UnconfiguredProvider()
  }
}
