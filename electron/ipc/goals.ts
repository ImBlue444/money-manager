import { ipcMain } from 'electron'
import { addGoal, deleteGoal, getGoals, updateGoal } from '../../src/lib/db'
import type { Goal } from '../../src/types'

export function registerGoalIpc(): void {
  ipcMain.handle('goals:get', () => {
    try {
      return getGoals()
    } catch (e) {
      console.error('goals:get error', e)
      throw e
    }
  })

  ipcMain.handle('goals:add', (_event, data: Omit<Goal, 'id' | 'created_at'>) => {
    try {
      return addGoal(data)
    } catch (e) {
      console.error('goals:add error', e)
      throw e
    }
  })

  ipcMain.handle(
    'goals:update',
    (_event, id: number, data: Partial<Omit<Goal, 'id' | 'created_at'>>) => {
      try {
        updateGoal(id, data)
      } catch (e) {
        console.error('goals:update error', e)
        throw e
      }
    }
  )

  ipcMain.handle('goals:delete', (_event, id: number) => {
    try {
      deleteGoal(id)
    } catch (e) {
      console.error('goals:delete error', e)
      throw e
    }
  })
}
