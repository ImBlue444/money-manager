import { contextBridge, ipcRenderer, type IpcRendererEvent } from 'electron'
import type { AiMessage, AiPeriod, Api } from '../src/types'

const api: Api = {
  // Transactions
  getTransactions: (filters) => ipcRenderer.invoke('transactions:get', filters),
  addTransaction: (data) => ipcRenderer.invoke('transactions:add', data),
  updateTransaction: (id, data) => ipcRenderer.invoke('transactions:update', id, data),
  deleteTransaction: (id) => ipcRenderer.invoke('transactions:delete', id),
  getTransactionMonths: () => ipcRenderer.invoke('transactions:getMonths'),

  // Subscriptions
  getSubscriptions: () => ipcRenderer.invoke('subscriptions:get'),
  addSubscription: (data) => ipcRenderer.invoke('subscriptions:add', data),
  updateSubscription: (id, data) => ipcRenderer.invoke('subscriptions:update', id, data),
  deleteSubscription: (id) => ipcRenderer.invoke('subscriptions:delete', id),

  // Budget
  getBudget: (month) => ipcRenderer.invoke('budget:get', month),
  setBudget: (data) => ipcRenderer.invoke('budget:set', data),
  deleteBudget: (id) => ipcRenderer.invoke('budget:delete', id),

  // Goals
  getGoals: () => ipcRenderer.invoke('goals:get'),
  addGoal: (data) => ipcRenderer.invoke('goals:add', data),
  updateGoal: (id, data) => ipcRenderer.invoke('goals:update', id, data),
  deleteGoal: (id) => ipcRenderer.invoke('goals:delete', id),

  // Settings
  getSetting: (key) => ipcRenderer.invoke('settings:get', key),
  setSetting: (key, value) => ipcRenderer.invoke('settings:set', key, value),
  getAllSettings: () => ipcRenderer.invoke('settings:getAll'),

  // System
  showSaveDialog: (options) => ipcRenderer.invoke('dialog:showSave', options),
  showOpenDialog: (options) => ipcRenderer.invoke('dialog:showOpen', options),
  getSystemLocale: () => ipcRenderer.invoke('system:getLocale'),

  // AI
  saveAiApiKey: (key: string) => ipcRenderer.invoke('ai:saveApiKey', key),
  getAiApiKey: () => ipcRenderer.invoke('ai:getApiKey'),
  sendAiMessage: (message: string, history: AiMessage[], period: AiPeriod) =>
    ipcRenderer.invoke('ai:sendMessage', message, history, period),
  onAiChunk: (callback: (chunk: string) => void) => {
    const handler = (_event: IpcRendererEvent, chunk: string) => callback(chunk)
    ipcRenderer.on('ai:chunk', handler)
    return () => ipcRenderer.removeListener('ai:chunk', handler)
  },
  onAiDone: (callback: () => void) => {
    const handler = () => callback()
    ipcRenderer.on('ai:done', handler)
    return () => ipcRenderer.removeListener('ai:done', handler)
  },
  onAiError: (callback: (error: string) => void) => {
    const handler = (_event: IpcRendererEvent, error: string) => callback(error)
    ipcRenderer.on('ai:error', handler)
    return () => ipcRenderer.removeListener('ai:error', handler)
  },
  generateInsight: (period: AiPeriod) => ipcRenderer.invoke('ai:generateInsight', period),

  // Currency
  getExchangeRate: (from, to) => ipcRenderer.invoke('currency:getRate', from, to),

  // Backup / reset
  exportBackup: () => ipcRenderer.invoke('backup:export'),
  importBackup: (data) => ipcRenderer.invoke('backup:import', data),
  saveBackup: () => ipcRenderer.invoke('backup:save'),
  loadBackup: () => ipcRenderer.invoke('backup:load'),
  resetData: () => ipcRenderer.invoke('data:reset'),

  // Reports
  exportCsv: (rows) => ipcRenderer.invoke('csv:export', rows),
  getDashboardSummary: (month) => ipcRenderer.invoke('dashboard:summary', month),
  getReportsSummary: (from, to) => ipcRenderer.invoke('reports:summary', from, to)
}

contextBridge.exposeInMainWorld('api', api)

declare global {
  interface Window {
    api: Api
  }
}
