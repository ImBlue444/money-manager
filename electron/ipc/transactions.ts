import { ipcMain } from 'electron'
import {
  addTransaction,
  deleteTransaction,
  getTransactionMonths,
  getTransactions,
  updateTransaction
} from '../../src/lib/db'
import {
  transactionFiltersSchema,
  transactionSchema,
  transactionUpdateSchema
} from '../../src/lib/schemas'

export function registerTransactionIpc(): void {
  ipcMain.handle('transactions:get', (_event, filters) => {
    try {
      const valid = transactionFiltersSchema.parse(filters)
      return getTransactions(valid)
    } catch (e) {
      console.error('transactions:get error', e)
      throw e
    }
  })

  ipcMain.handle('transactions:add', (_event, data) => {
    try {
      const valid = transactionSchema.parse(data)
      return addTransaction(valid)
    } catch (e) {
      console.error('transactions:add error', e)
      throw e
    }
  })

  ipcMain.handle('transactions:update', (_event, id: number, data) => {
    try {
      if (!Number.isInteger(id) || id <= 0) throw new Error('ID non valido')
      const valid = transactionUpdateSchema.parse(data)
      updateTransaction(id, valid)
    } catch (e) {
      console.error('transactions:update error', e)
      throw e
    }
  })

  ipcMain.handle('transactions:delete', (_event, id: number) => {
    try {
      if (!Number.isInteger(id) || id <= 0) throw new Error('ID non valido')
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
