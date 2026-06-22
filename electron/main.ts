import { app, BrowserWindow, Notification, nativeTheme } from 'electron'
import path from 'node:path'
import Store from 'electron-store'
import {
  closeDb,
  getActiveSubscriptions,
  getSetting,
  updateSubscription
} from '../src/lib/db'
import { registerTransactionIpc } from './ipc/transactions'
import { registerSubscriptionIpc } from './ipc/subscriptions'
import { registerBudgetIpc } from './ipc/budget'
import { registerGoalIpc } from './ipc/goals'
import { registerSettingsIpc } from './ipc/settings'
import { registerSystemIpc } from './ipc/system'
import { parseISO, isBefore, startOfDay, addWeeks, addMonths, addQuarters, addYears, format } from 'date-fns'
import type { BillingCycle, Subscription } from '../src/types'

const store = new Store<{
  windowBounds: { width: number; height: number; x?: number; y?: number }
}>()

let mainWindow: BrowserWindow | null = null

function createWindow(): void {
  const bounds = store.get('windowBounds', { width: 1280, height: 800 })

  mainWindow = new BrowserWindow({
    ...bounds,
    minWidth: 900,
    minHeight: 600,
    title: 'MoneyLove',
    webPreferences: {
      preload: path.join(__dirname, '../preload/preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false
    }
  })

  const devUrl = process.env['ELECTRON_RENDERER_URL']
  if (!app.isPackaged && devUrl) {
    mainWindow.loadURL(devUrl)
    mainWindow.webContents.openDevTools()
  } else {
    mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'))
  }

  mainWindow.on('close', () => {
    if (mainWindow) {
      store.set('windowBounds', mainWindow.getBounds())
    }
  })

  mainWindow.on('closed', () => {
    mainWindow = null
  })
}

function applyTheme(): void {
  const theme = getSetting('theme') ?? 'light'
  nativeTheme.themeSource = theme as 'light' | 'dark' | 'system'
}

function advanceBillingDate(dateStr: string, cycle: BillingCycle): string {
  const date = parseISO(dateStr)
  let next = date
  switch (cycle) {
    case 'weekly':
      next = addWeeks(date, 1)
      break
    case 'monthly':
      next = addMonths(date, 1)
      break
    case 'quarterly':
      next = addQuarters(date, 1)
      break
    case 'yearly':
      next = addYears(date, 1)
      break
  }
  return format(next, 'yyyy-MM-dd')
}

function updateSubscriptionDates(): void {
  const today = startOfDay(new Date())
  const subs = getActiveSubscriptions()
  for (const sub of subs) {
    let next = parseISO(sub.next_billing_date)
    let changed = false
    while (isBefore(next, today)) {
      next = parseISO(advanceBillingDate(format(next, 'yyyy-MM-dd'), sub.billing_cycle))
      changed = true
    }
    if (changed) {
      updateSubscription(sub.id, { next_billing_date: format(next, 'yyyy-MM-dd') })
    }
  }
}

function notifyUpcomingRenewals(): void {
  const today = startOfDay(new Date())
  const subs = getActiveSubscriptions().filter((s: Subscription) => {
    const next = parseISO(s.next_billing_date)
    const diff = (next.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
    return diff >= 0 && diff <= 3
  })
  for (const sub of subs) {
    new Notification({
      title: 'Rinnovo in arrivo',
      body: `${sub.name} si rinnova il ${sub.next_billing_date}`
    }).show()
  }
}

function registerIpc(): void {
  registerTransactionIpc()
  registerSubscriptionIpc()
  registerBudgetIpc()
  registerGoalIpc()
  registerSettingsIpc()
  registerSystemIpc()
}

app.whenReady().then(() => {
  applyTheme()
  updateSubscriptionDates()
  registerIpc()
  createWindow()
  notifyUpcomingRenewals()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    closeDb()
    app.quit()
  }
})

app.on('before-quit', () => {
  closeDb()
})
