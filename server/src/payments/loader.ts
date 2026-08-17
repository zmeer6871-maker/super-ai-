/*
  Provider-agnostic payment loader with safer typing for dynamic require
*/

import { PaymentProvider } from './provider'

export function getPaymentProvider(): PaymentProvider {
  const selected = (process.env.PAYMENT_PROVIDER || '').toLowerCase()
  if (!selected) {
    // lazy-import to avoid TS errors
    const { UnconfiguredProvider } = require('./provider') as any
    return new UnconfiguredProvider()
  }

  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const module = require(`./providers/${selected}`) as any
    if (module && module.default) return module.default as PaymentProvider
    if (module) return module as PaymentProvider
    // fallback
    const { UnconfiguredProvider } = require('./provider') as any
    return new UnconfiguredProvider()
  } catch (e) {
    console.warn('Payment provider module not found for', selected)
    const { UnconfiguredProvider } = require('./provider') as any
    return new UnconfiguredProvider()
  }
}
