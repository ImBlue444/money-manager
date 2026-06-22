import { ipcMain, nativeTheme } from 'electron'
import { getAllSettings, getSetting, setSetting } from '../../src/lib/db'
import type { SettingsMap } from '../../src/types'

export function registerSettingsIpc(): void {
  ipcMain.handle('settings:get', (_event, key: keyof SettingsMap) => {
    try {
      return getSetting(key)
    } catch (e) {
      console.error('settings:get error', e)
      throw e
    }
  })

  ipcMain.handle('settings:set', (_event, key: keyof SettingsMap, value: string) => {
    try {
      setSetting(key, value)
      if (key === 'theme') {
        nativeTheme.themeSource = value as 'light' | 'dark' | 'system'
      }
    } catch (e) {
      console.error('settings:set error', e)
      throw e
    }
  })

  ipcMain.handle('settings:getAll', () => {
    try {
      return getAllSettings()
    } catch (e) {
      console.error('settings:getAll error', e)
      throw e
    }
  })
}
