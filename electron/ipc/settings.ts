import { ipcMain, nativeTheme } from 'electron'
import { getAllSettings, getSetting, setSetting } from '../../src/lib/db'
import { settingKeySchema } from '../../src/lib/schemas'

const VALID_THEMES = ['light', 'dark', 'system'] as const

export function registerSettingsIpc(): void {
  ipcMain.handle('settings:get', (_event, key) => {
    try {
      const validKey = settingKeySchema.parse(key)
      return getSetting(validKey)
    } catch (e) {
      console.error('settings:get error', e)
      throw e
    }
  })

  ipcMain.handle('settings:set', (_event, key, value: string) => {
    try {
      const validKey = settingKeySchema.parse(key)
      setSetting(validKey, value)
      if (validKey === 'theme') {
        const theme = VALID_THEMES.includes(value as typeof VALID_THEMES[number]) ? value : 'system'
        nativeTheme.themeSource = theme as typeof VALID_THEMES[number]
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
