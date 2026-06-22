import { ipcMain } from 'electron'
import { deleteBudget, getBudgetWithSpending, setBudget } from '../../src/lib/db'

export function registerBudgetIpc(): void {
  ipcMain.handle('budget:get', (_event, month: string) => {
    try {
      return getBudgetWithSpending(month)
    } catch (e) {
      console.error('budget:get error', e)
      throw e
    }
  })

  ipcMain.handle(
    'budget:set',
    (
      _event,
      data: {
        category: string
        monthly_limit: number
        month: string
      }
    ) => {
      try {
        return setBudget(data)
      } catch (e) {
        console.error('budget:set error', e)
        throw e
      }
    }
  )

  ipcMain.handle('budget:delete', (_event, id: number) => {
    try {
      deleteBudget(id)
    } catch (e) {
      console.error('budget:delete error', e)
      throw e
    }
  })
}
