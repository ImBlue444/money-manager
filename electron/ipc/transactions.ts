import { ipcMain } from 'electron'
import {
  addTransaction,
  deleteTransaction,
  getTransactionMonths,
  getTransactions,
  updateTransaction
} from '../../src/lib/db'
import type { Transaction } from '../../src/types'

export function registerTransactionIpc(): void {
  ipcMain.handle('transactions:get', (_event, filters) => {
    try {
      return getTransactions(filters)
    } catch (e) {
      console.error('transactions:get error', e)
      throw e
    }
  })

  ipcMain.handle('transactions:add', (_event, data: Omit<Transaction, 'id' | 'created_at'>) => {
    try {
      return addTransaction(data)
    } catch (e) {
      console.error('transactions:add error', e)
      throw e
    }
  })

  ipcMain.handle(
    'transactions:update',
    (_event, id: number, data: Partial<Omit<Transaction, 'id' | 'created_at'>>) => {
      try {
        updateTransaction(id, data)
      } catch (e) {
        console.error('transactions:update error', e)
        throw e
      }
    }
  )

  ipcMain.handle('transactions:delete', (_event, id: number) => {
    try {
      deleteTransaction(id)
    } catch (e) {
      console.error('transactions:delete error', e)
      throw e
    }
  })

  ipcMain.handle('transactions:getMonths', () => {
    try {
      return getTransactionMonths()
    } catch (e) {
      console.error('transactions:getMonths error', e)
      throw e
    }
  })
}
