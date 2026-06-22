import { contextBridge, ipcRenderer } from 'electron'
import type { Api } from '../src/types'

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
