import { ipcMain } from 'electron'
import {
  addSubscription,
  deleteSubscription,
  getSubscriptions,
  updateSubscription
} from '../../src/lib/db'
import type { Subscription } from '../../src/types'

export function registerSubscriptionIpc(): void {
  ipcMain.handle('subscriptions:get', () => {
    try {
      return getSubscriptions()
    } catch (e) {
      console.error('subscriptions:get error', e)
      throw e
    }
  })

  ipcMain.handle('subscriptions:add', (_event, data: Omit<Subscription, 'id' | 'created_at'>) => {
    try {
      return addSubscription(data)
    } catch (e) {
      console.error('subscriptions:add error', e)
      throw e
    }
  })

  ipcMain.handle(
    'subscriptions:update',
    (_event, id: number, data: Partial<Omit<Subscription, 'id' | 'created_at'>>) => {
      try {
        updateSubscription(id, data)
      } catch (e) {
        console.error('subscriptions:update error', e)
        throw e
      }
    }
  )

  ipcMain.handle('subscriptions:delete', (_event, id: number) => {
    try {
      deleteSubscription(id)
    } catch (e) {
      console.error('subscriptions:delete error', e)
      throw e
    }
  })
}
