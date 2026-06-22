"use strict";
const electron = require("electron");
const api = {
  // Transactions
  getTransactions: (filters) => electron.ipcRenderer.invoke("transactions:get", filters),
  addTransaction: (data) => electron.ipcRenderer.invoke("transactions:add", data),
  updateTransaction: (id, data) => electron.ipcRenderer.invoke("transactions:update", id, data),
  deleteTransaction: (id) => electron.ipcRenderer.invoke("transactions:delete", id),
  getTransactionMonths: () => electron.ipcRenderer.invoke("transactions:getMonths"),
  // Subscriptions
  getSubscriptions: () => electron.ipcRenderer.invoke("subscriptions:get"),
  addSubscription: (data) => electron.ipcRenderer.invoke("subscriptions:add", data),
  updateSubscription: (id, data) => electron.ipcRenderer.invoke("subscriptions:update", id, data),
  deleteSubscription: (id) => electron.ipcRenderer.invoke("subscriptions:delete", id),
  // Budget
  getBudget: (month) => electron.ipcRenderer.invoke("budget:get", month),
  setBudget: (data) => electron.ipcRenderer.invoke("budget:set", data),
  deleteBudget: (id) => electron.ipcRenderer.invoke("budget:delete", id),
  // Goals
  getGoals: () => electron.ipcRenderer.invoke("goals:get"),
  addGoal: (data) => electron.ipcRenderer.invoke("goals:add", data),
  updateGoal: (id, data) => electron.ipcRenderer.invoke("goals:update", id, data),
  deleteGoal: (id) => electron.ipcRenderer.invoke("goals:delete", id),
  // Settings
  getSetting: (key) => electron.ipcRenderer.invoke("settings:get", key),
  setSetting: (key, value) => electron.ipcRenderer.invoke("settings:set", key, value),
  getAllSettings: () => electron.ipcRenderer.invoke("settings:getAll"),
  // System
  showSaveDialog: (options) => electron.ipcRenderer.invoke("dialog:showSave", options),
  showOpenDialog: (options) => electron.ipcRenderer.invoke("dialog:showOpen", options),
  // Currency
  getExchangeRate: (from, to) => electron.ipcRenderer.invoke("currency:getRate", from, to),
  // Backup / reset
  exportBackup: () => electron.ipcRenderer.invoke("backup:export"),
  importBackup: (data) => electron.ipcRenderer.invoke("backup:import", data),
  saveBackup: () => electron.ipcRenderer.invoke("backup:save"),
  loadBackup: () => electron.ipcRenderer.invoke("backup:load"),
  resetData: () => electron.ipcRenderer.invoke("data:reset"),
  // Reports
  exportCsv: (rows) => electron.ipcRenderer.invoke("csv:export", rows),
  getDashboardSummary: (month) => electron.ipcRenderer.invoke("dashboard:summary", month),
  getReportsSummary: (from, to) => electron.ipcRenderer.invoke("reports:summary", from, to)
};
electron.contextBridge.exposeInMainWorld("api", api);
