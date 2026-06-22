import { app, BrowserWindow, dialog, ipcMain, nativeTheme } from 'electron'
import fs from 'node:fs'
import { format } from 'date-fns'
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
import type {
  BackupData,
  BillingCycle,
  ElectronOpenDialogOptions,
  ElectronSaveDialogOptions,
  Transaction
} from '../../src/types'

const rateCache = new Map<string, { rate: number; date: string; timestamp: number }>()
const RATE_TTL = 30 * 60 * 1000

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
      if (from === to) return { rate: 1, date: format(new Date(), 'yyyy-MM-dd') }
      const cacheKey = `${from}-${to}`
      const cached = rateCache.get(cacheKey)
      if (cached && Date.now() - cached.timestamp < RATE_TTL) {
        return { rate: cached.rate, date: cached.date }
      }
      const res = await fetch(`https://api.frankfurter.app/latest?from=${from}&to=${to}`)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = (await res.json()) as { rates: Record<string, number>; date: string }
      const rate = data.rates[to]
      if (rate === undefined) throw new Error('Tasso non disponibile')
      rateCache.set(cacheKey, { rate, date: data.date, timestamp: Date.now() })
      return { rate, date: data.date }
    } catch (e) {
      console.error('currency:getRate error', e)
      return { rate: null, error: 'Impossibile ottenere il tasso di cambio' }
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
      const data = JSON.parse(raw) as BackupData
      importBackup(data)
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
    const headers = ['id', 'date', 'type', 'category', 'description', 'amount', 'currency', 'amount_eur']
    const lines = [
      headers.join(','),
      ...rows.map((r) =>
        [
          r.id,
          r.date,
          r.type,
          `"${r.category}"`,
          `"${(r.description ?? '').replace(/"/g, '""')}"`,
          r.amount,
          r.currency,
          r.amount_eur
        ].join(',')
      )
    ]
    fs.writeFileSync(result.filePath, lines.join('\n'), 'utf-8')
  })

  ipcMain.handle('dashboard:summary', (_event, month: string) => {
    try {
      const starting = Number(getSetting('starting_balance') ?? '0')
      const totals = getMonthlyTotals(month)
      const subs = getActiveSubscriptions()
      const monthlySubscriptionCost = subs.reduce((sum, s) => sum + toMonthly(s.amount, s.billing_cycle), 0)
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

