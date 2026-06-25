import { ipcMain } from 'electron'
import { convertSync, fetchRatesToBase } from '../services/currency'
import {
  addSubscription,
  deleteSubscription,
  getSetting,
  getSubscriptions,
  updateSubscription
} from '../../src/lib/db'
import { subscriptionSchema, subscriptionUpdateSchema } from '../../src/lib/schemas'
import type { BillingCycle, EnrichedSubscription, Subscription } from '../../src/types'

function toMonthly(amount: number, cycle: BillingCycle): number {
  switch (cycle) {
    case 'weekly':
      return amount * 4
    case 'quarterly':
      return amount / 3
    case 'yearly':
      return amount / 12
    default:
      return amount
  }
}

function toYearly(amount: number, cycle: BillingCycle): number {
  switch (cycle) {
    case 'weekly':
      return amount * 52
    case 'quarterly':
      return amount * 4
    case 'yearly':
      return amount
    default:
      return amount * 12
  }
}

export function registerSubscriptionIpc(): void {
  ipcMain.handle('subscriptions:get', async () => {
    try {
      const subs = getSubscriptions()
      const baseCurrency = (getSetting('base_currency') ?? 'EUR') as string
      const currencies = [...new Set(subs.map((s) => s.currency))]
      await fetchRatesToBase(baseCurrency, currencies)
      return subs.map((s) => {
        const monthlyOriginal = toMonthly(s.amount, s.billing_cycle)
        const yearlyOriginal = toYearly(s.amount, s.billing_cycle)
        const converted = convertSync(s.amount, s.currency, baseCurrency)
        const amountBase = converted ?? s.amount_base ?? s.amount
        const monthlyBase = toMonthly(amountBase, s.billing_cycle)
        const yearlyBase = toYearly(amountBase, s.billing_cycle)
        return {
          ...s,
          amount_base: amountBase,
          monthly_base: monthlyBase,
          yearly_base: yearlyBase,
          monthly_original: monthlyOriginal,
          yearly_original: yearlyOriginal
        } as EnrichedSubscription
      })
    } catch (e) {
      console.error('subscriptions:get error', e)
      throw e
    }
  })

  ipcMain.handle('subscriptions:add', (_event, data) => {
    try {
      const valid = subscriptionSchema.parse(data)
      return addSubscription(valid)
    } catch (e) {
      console.error('subscriptions:add error', e)
      throw e
    }
  })

  ipcMain.handle('subscriptions:update', (_event, id: number, data) => {
    try {
      if (!Number.isInteger(id) || id <= 0) throw new Error('ID non valido')
      const valid = subscriptionUpdateSchema.parse(data)
      updateSubscription(id, valid)
    } catch (e) {
      console.error('subscriptions:update error', e)
      throw e
    }
  })

  ipcMain.handle('subscriptions:delete', (_event, id: number) => {
    try {
      if (!Number.isInteger(id) || id <= 0) throw new Error('ID non valido')
      deleteSubscription(id)
    } catch (e) {
      console.error('subscriptions:delete error', e)
      throw e
    }
  })
}
