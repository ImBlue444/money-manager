import { ipcMain } from 'electron'
import { addGoal, deleteGoal, getGoals, updateGoal } from '../../src/lib/db'
import { goalSchema, goalUpdateSchema } from '../../src/lib/schemas'

export function registerGoalIpc(): void {
  ipcMain.handle('goals:get', () => {
    try {
      return getGoals()
    } catch (e) {
      console.error('goals:get error', e)
      throw e
    }
  })

  ipcMain.handle('goals:add', (_event, data) => {
    try {
      const valid = goalSchema.parse(data)
      return addGoal(valid)
    } catch (e) {
      console.error('goals:add error', e)
      throw e
    }
  })

  ipcMain.handle('goals:update', (_event, id: number, data) => {
    try {
      if (!Number.isInteger(id) || id <= 0) throw new Error('ID non valido')
      const valid = goalUpdateSchema.parse(data)
      updateGoal(id, valid)
    } catch (e) {
      console.error('goals:update error', e)
      throw e
    }
  })

  ipcMain.handle('goals:delete', (_event, id: number) => {
    try {
      if (!Number.isInteger(id) || id <= 0) throw new Error('ID non valido')
      deleteGoal(id)
    } catch (e) {
      console.error('goals:delete error', e)
      throw e
    }
  })
}
