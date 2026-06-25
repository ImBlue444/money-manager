import { ipcMain } from 'electron'
import { deleteBudget, getBudgetWithSpending, setBudget } from '../../src/lib/db'
import { budgetSchema } from '../../src/lib/schemas'

export function registerBudgetIpc(): void {
  ipcMain.handle('budget:get', (_event, month: string) => {
    try {
      if (!/^\d{4}-\d{2}$/.test(month)) throw new Error('Mese non valido')
      return getBudgetWithSpending(month)
    } catch (e) {
      console.error('budget:get error', e)
      throw e
    }
  })

  ipcMain.handle('budget:set', (_event, data) => {
    try {
      const valid = budgetSchema.parse(data)
      return setBudget(valid)
    } catch (e) {
      console.error('budget:set error', e)
      throw e
    }
  })

  ipcMain.handle('budget:delete', (_event, id: number) => {
    try {
      if (!Number.isInteger(id) || id <= 0) throw new Error('ID non valido')
      deleteBudget(id)
    } catch (e) {
      console.error('budget:delete error', e)
      throw e
    }
  })
}
