import { app, BrowserWindow, dialog, ipcMain, nativeTheme } from 'electron'
import fs from 'node:fs'
import { format } from 'date-fns'
import {
  convertSync,
  fetchRate,
  fetchRatesToBase,
  recalculateAll
} from '../services/currency'
import {
  exportBackup,
  getActiveSubscriptions,
  getBalanceTrend,
  getCategorySummary,
  getCategoryTrend,
  getIncomeExpenseHistory,
  getMonthlyTotals,
  getRecentTransactions,
  getSetting,
  getSpendingByCategory,
  importBackup,
  resetData
} from '../../src/lib/db'
import { backupDataSchema, currencyCodeSchema, dateSchema, monthKeySchema } from '../../src/lib/schemas'
import type {
  BackupData,
  BillingCycle,
  ElectronOpenDialogOptions,
  ElectronSaveDialogOptions,
  Transaction
} from '../../src/types'

function sanitizeCsvField(value: string): string {
  const escaped = value.replace(/"/g, '""')
  // Prevent formula injection in spreadsheet software
  if (/^[+=@-]/.test(value)) {
    return `"'${escaped}"`
  }
  return `"${escaped}"`
}

function getMainWindow(): BrowserWindow | undefined {
  return BrowserWindow.getAllWindows()[0]
}

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

export function registerSystemIpc(): void {
  ipcMain.handle('system:getLocale', () => {
    try {
      const locale = app.getLocale()
      // Map common locales to Intl-compatible format, fallback to en-US
      const mapping: Record<string, string> = {
        'it': 'it-IT',
        'en': 'en-US',
        'en-GB': 'en-GB',
        'de': 'de-DE',
        'fr': 'fr-FR',
        'es': 'es-ES',
        'pt': 'pt-PT',
        'nl': 'nl-NL',
        'ja': 'ja-JP',
        'zh': 'zh-CN'
      }
      return mapping[locale] ?? locale.replace('_', '-') ?? 'en-US'
    } catch (e) {
      console.error('system:getLocale error', e)
      return 'en-US'
    }
  })

  ipcMain.handle('dialog:showSave', async (_event, options: ElectronSaveDialogOptions) => {
    const win = getMainWindow()
    if (!win) return null
    const result = await dialog.showSaveDialog(win, {
      title: options.title,
      defaultPath: options.defaultPath,
      filters: options.filters
    })
    return result.canceled ? null : result.filePath
  })

  ipcMain.handle('dialog:showOpen', async (_event, options: ElectronOpenDialogOptions) => {
    const win = getMainWindow()
    if (!win) return null
    const result = await dialog.showOpenDialog(win, {
      title: options.title,
      filters: options.filters,
      properties: ['openFile']
    })
    return result.canceled || !result.filePaths.length ? null : result.filePaths[0]
  })

  ipcMain.handle('currency:getRate', async (_event, from: string, to: string) => {
    try {
      const fromCode = currencyCodeSchema.parse(from)
      const toCode = currencyCodeSchema.parse(to)
      if (fromCode === toCode) return { rate: 1, date: format(new Date(), 'yyyy-MM-dd') }
      const rate = await fetchRate(fromCode, toCode)
      if (rate === null) throw new Error('Tasso non disponibile')
      return { rate }
    } catch (e) {
      console.error('currency:getRate error', e)
      return { rate: null, error: 'Impossibile ottenere il tasso di cambio' }
    }
  })

  ipcMain.handle('currency:recalculate', async (_event, newBase: string) => {
    try {
      const base = currencyCodeSchema.parse(newBase)
      await recalculateAll(base)
    } catch (e) {
      console.error('currency:recalculate error', e)
      throw e
    }
  })

  ipcMain.handle('backup:export', () => {
    try {
      return exportBackup()
    } catch (e) {
      console.error('backup:export error', e)
      throw e
    }
  })

  ipcMain.handle('backup:import', (_event, data: BackupData) => {
    try {
      importBackup(data)
    } catch (e) {
      console.error('backup:import error', e)
      throw e
    }
  })

  ipcMain.handle('backup:save', async () => {
    const win = getMainWindow()
    if (!win) return
    const result = await dialog.showSaveDialog(win, {
      defaultPath: `finanza-backup-${format(new Date(), 'yyyy-MM-dd')}.json`,
      filters: [{ name: 'JSON', extensions: ['json'] }]
    })
    if (result.canceled || !result.filePath) return
    try {
      const data = exportBackup()
      fs.writeFileSync(result.filePath, JSON.stringify(data, null, 2), 'utf-8')
    } catch (e) {
      console.error('backup:save error', e)
      throw e
    }
  })

  ipcMain.handle('backup:load', async () => {
    const win = getMainWindow()
    if (!win) return
    const result = await dialog.showOpenDialog(win, {
      filters: [{ name: 'JSON', extensions: ['json'] }],
      properties: ['openFile']
    })
    if (result.canceled || !result.filePaths.length) return
    try {
      const raw = fs.readFileSync(result.filePaths[0], 'utf-8')
      const parsed = JSON.parse(raw)
      const validated = backupDataSchema.parse(parsed)
      importBackup(validated as BackupData)
    } catch (e) {
      console.error('backup:load error', e)
      throw e
    }
  })

  ipcMain.handle('data:reset', () => {
    try {
      resetData()
      const theme = getSetting('theme') ?? 'light'
      nativeTheme.themeSource = theme as 'light' | 'dark' | 'system'
    } catch (e) {
      console.error('data:reset error', e)
      throw e
    }
  })

  ipcMain.handle('csv:export', async (_event, rows: Transaction[]) => {
    const win = getMainWindow()
    if (!win) return
    const result = await dialog.showSaveDialog(win, {
      defaultPath: `transazioni-${format(new Date(), 'yyyy-MM-dd')}.csv`,
      filters: [{ name: 'CSV', extensions: ['csv'] }]
    })
    if (result.canceled || !result.filePath) return
    const headers = ['id', 'date', 'type', 'category', 'description', 'amount', 'currency', 'amount_base', 'conversion_warning']
    const lines = [
      headers.join(','),
      ...rows.map((r) =>
        [
          r.id,
          r.date,
          r.type,
          sanitizeCsvField(r.category),
          sanitizeCsvField(r.description ?? ''),
          r.amount,
          r.currency,
          r.amount_base,
          r.conversion_warning
        ].join(',')
      )
    ]
    fs.writeFileSync(result.filePath, lines.join('\n'), 'utf-8')
  })

  ipcMain.handle('dashboard:summary', async (_event, month: string) => {
    try {
      monthKeySchema.parse(month)
      const starting = Number(getSetting('starting_balance') ?? '0')
      const baseCurrency = (getSetting('base_currency') ?? 'EUR') as string
      const totals = getMonthlyTotals(month)
      const subs = getActiveSubscriptions()
      const currencies = [...new Set(subs.map((s) => s.currency))]
      await fetchRatesToBase(baseCurrency, currencies)
      const monthlySubscriptionCost = subs.reduce((sum, s) => {
        const monthly = toMonthly(s.amount, s.billing_cycle)
        return sum + (convertSync(monthly, s.currency, baseCurrency) ?? monthly)
      }, 0)
      return {
        balance: starting + totals.income - totals.expense,
        income: totals.income,
        expense: totals.expense,
        subscriptions: monthlySubscriptionCost,
        upcoming: subs.slice(0, 3),
        recent: getRecentTransactions(5),
        trend: getBalanceTrend(6),
        spendingByCategory: getSpendingByCategory(month)
      }
    } catch (e) {
      console.error('dashboard:summary error', e)
      throw e
    }
  })

  ipcMain.handle('reports:summary', (_event, from: string, to: string) => {
    try {
      dateSchema.parse(from)
      dateSchema.parse(to)
      return {
        categorySummary: getCategorySummary(from, to),
        incomeExpense: getIncomeExpenseHistory(12),
        categoryTrend: getCategoryTrend(12)
      }
    } catch (e) {
      console.error('reports:summary error', e)
      throw e
    }
  })
}

