import Database from 'better-sqlite3'
import { app } from 'electron'
import path from 'node:path'
import fs from 'node:fs'
import type {
  BackupData,
  Budget,
  Goal,
  SettingsMap,
  Subscription,
  Transaction,
  TransactionFilters,
  TransactionType
} from '../types'

const DB_DIR = app?.getPath ? app.getPath('userData') : path.resolve('.')
fs.mkdirSync(DB_DIR, { recursive: true })
const DB_PATH = path.join(DB_DIR, 'finanza.db')

const db = new Database(DB_PATH)
db.pragma('journal_mode = WAL')

function initSchema(): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS transactions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      amount REAL NOT NULL,
      amount_eur REAL NOT NULL DEFAULT 0,
      type TEXT NOT NULL CHECK(type IN ('income', 'expense')),
      category TEXT NOT NULL,
      description TEXT,
      date TEXT NOT NULL,
      currency TEXT DEFAULT 'EUR',
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS subscriptions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      amount REAL NOT NULL,
      currency TEXT DEFAULT 'EUR',
      billing_cycle TEXT NOT NULL CHECK(billing_cycle IN ('weekly', 'monthly', 'quarterly', 'yearly')),
      category TEXT NOT NULL,
      next_billing_date TEXT NOT NULL,
      color TEXT DEFAULT '#6366f1',
      icon TEXT DEFAULT 'credit-card',
      is_active INTEGER DEFAULT 1,
      notes TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS budget (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      category TEXT NOT NULL,
      monthly_limit REAL NOT NULL,
      month TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS goals (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      target_amount REAL NOT NULL,
      current_amount REAL DEFAULT 0,
      target_date TEXT,
      color TEXT DEFAULT '#10b981',
      icon TEXT DEFAULT 'target',
      notes TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );
  `)

  // Migration: add amount_eur if missing
  const columns = db
    .prepare(`SELECT name FROM pragma_table_info('transactions')`)
    .all() as Array<{ name: string }>
  if (!columns.some((c) => c.name === 'amount_eur')) {
    db.exec(`ALTER TABLE transactions ADD COLUMN amount_eur REAL NOT NULL DEFAULT 0`)
    db.exec(`UPDATE transactions SET amount_eur = amount WHERE amount_eur = 0`)
  }

  // Default settings
  const defaults: Partial<SettingsMap> = {
    base_currency: 'EUR',
    locale: 'it-IT',
    theme: 'light',
    starting_balance: '0',
    username: 'Utente'
  }
  const insertSetting = db.prepare(`INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)`)
  for (const [key, value] of Object.entries(defaults)) {
    insertSetting.run(key, value)
  }
}

initSchema()

export function closeDb(): void {
  db.close()
}

// Settings
export function getSetting<K extends keyof SettingsMap>(key: K): SettingsMap[K] | undefined {
  const row = db.prepare('SELECT value FROM settings WHERE key = ?').get(key) as
    | { value: string }
    | undefined
  return row ? (row.value as SettingsMap[K]) : undefined
}

export function getAllSettings(): Partial<SettingsMap> {
  const rows = db.prepare('SELECT key, value FROM settings').all() as Array<{
    key: keyof SettingsMap
    value: string
  }>
  return Object.fromEntries(rows.map((r) => [r.key, r.value])) as Partial<SettingsMap>
}

export function setSetting<K extends keyof SettingsMap>(key: K, value: SettingsMap[K]): void {
  db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)').run(key, value)
}

// Transactions
export function getTransactions(filters: TransactionFilters = {}): Transaction[] {
  const conditions: string[] = []
  const params: (string | number)[] = []

  if (filters.type && filters.type !== 'all') {
    conditions.push('type = ?')
    params.push(filters.type)
  }
  if (filters.category && filters.category !== 'all') {
    conditions.push('category = ?')
    params.push(filters.category)
  }
  if (filters.month) {
    conditions.push("strftime('%Y-%m', date) = ?")
    params.push(filters.month)
  }
  if (filters.search) {
    conditions.push('(description LIKE ? OR category LIKE ?)')
    const q = `%${filters.search}%`
    params.push(q, q)
  }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : ''
  const limit = filters.limit !== undefined ? 'LIMIT ?' : ''
  const offset = filters.offset !== undefined ? 'OFFSET ?' : ''
  if (filters.limit !== undefined) params.push(filters.limit)
  if (filters.offset !== undefined) params.push(filters.offset)

  const sql = `SELECT * FROM transactions ${where} ORDER BY date DESC, id DESC ${limit} ${offset}`
  return db.prepare(sql).all(...params) as Transaction[]
}

export function addTransaction(data: Omit<Transaction, 'id' | 'created_at'>): { id: number } {
  const res = db
    .prepare(
      `INSERT INTO transactions (amount, amount_eur, type, category, description, date, currency)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      data.amount,
      data.amount_eur,
      data.type,
      data.category,
      data.description ?? '',
      data.date,
      data.currency ?? 'EUR'
    )
  return { id: Number(res.lastInsertRowid) }
}

export function updateTransaction(
  id: number,
  data: Partial<Omit<Transaction, 'id' | 'created_at'>>
): void {
  const fields: string[] = []
  const values: unknown[] = []
  for (const [key, value] of Object.entries(data)) {
    if (value !== undefined) {
      fields.push(`${key} = ?`)
      values.push(value)
    }
  }
  if (!fields.length) return
  values.push(id)
  db.prepare(`UPDATE transactions SET ${fields.join(', ')} WHERE id = ?`).run(...values)
}

export function deleteTransaction(id: number): void {
  db.prepare('DELETE FROM transactions WHERE id = ?').run(id)
}

export function getRecentTransactions(limit: number): Transaction[] {
  return db
    .prepare('SELECT * FROM transactions ORDER BY date DESC, id DESC LIMIT ?')
    .all(limit) as Transaction[]
}

export function getTransactionMonths(): string[] {
  const rows = db
    .prepare("SELECT DISTINCT strftime('%Y-%m', date) AS month FROM transactions ORDER BY month DESC")
    .all() as Array<{ month: string }>
  return rows.map((r) => r.month)
}

export function getMonthlyTotals(month: string): { income: number; expense: number } {
  const row = db
    .prepare(
      `SELECT
        COALESCE(SUM(CASE WHEN type = 'income' THEN amount_eur ELSE 0 END), 0) AS income,
        COALESCE(SUM(CASE WHEN type = 'expense' THEN amount_eur ELSE 0 END), 0) AS expense
      FROM transactions
      WHERE strftime('%Y-%m', date) = ?`
    )
    .get(month) as { income: number; expense: number }
  return row
}

export function getSpendingByCategory(month: string): Array<{ category: string; amount: number }> {
  return db
    .prepare(
      `SELECT category, SUM(amount_eur) AS amount
       FROM transactions
       WHERE type = 'expense' AND strftime('%Y-%m', date) = ?
       GROUP BY category
       ORDER BY amount DESC`
    )
    .all(month) as Array<{ category: string; amount: number }>
}

export function getBalanceTrend(months = 6): Array<{ month: string; balance: number }> {
  const starting = Number(getSetting('starting_balance') ?? '0')
  const rows = db
    .prepare(
      `SELECT strftime('%Y-%m', date) AS month,
        SUM(CASE WHEN type = 'income' THEN amount_eur ELSE -amount_eur END) AS net
      FROM transactions
      WHERE date >= date('now', '-${months} months', 'start of month')
      GROUP BY month
      ORDER BY month ASC`
    )
    .all() as Array<{ month: string; net: number }>

  let balance = starting
  return rows.map((r) => {
    balance += r.net
    return { month: r.month, balance }
  })
}

export function getIncomeExpenseHistory(months = 12): Array<{
  month: string
  income: number
  expense: number
}> {
  return db
    .prepare(
      `SELECT strftime('%Y-%m', date) AS month,
        COALESCE(SUM(CASE WHEN type = 'income' THEN amount_eur ELSE 0 END), 0) AS income,
        COALESCE(SUM(CASE WHEN type = 'expense' THEN amount_eur ELSE 0 END), 0) AS expense
      FROM transactions
      WHERE date >= date('now', '-${months} months', 'start of month')
      GROUP BY month
      ORDER BY month ASC`
    )
    .all() as Array<{ month: string; income: number; expense: number }>
}

export function getCategoryTrend(
  months = 12
): Array<{ month: string; category: string; amount: number }> {
  return db
    .prepare(
      `SELECT strftime('%Y-%m', date) AS month, category, SUM(amount_eur) AS amount
      FROM transactions
      WHERE type = 'expense' AND date >= date('now', '-${months} months', 'start of month')
      GROUP BY month, category
      ORDER BY month ASC, amount DESC`
    )
    .all() as Array<{ month: string; category: string; amount: number }>
}

export function getCategorySummary(
  fromDate: string,
  toDate: string
): Array<{ category: string; amount: number; count: number; avg: number }> {
  return db
    .prepare(
      `SELECT category,
        SUM(amount_eur) AS amount,
        COUNT(*) AS count,
        AVG(amount_eur) AS avg
      FROM transactions
      WHERE type = 'expense' AND date >= ? AND date <= ?
      GROUP BY category
      ORDER BY amount DESC`
    )
    .all(fromDate, toDate) as Array<{ category: string; amount: number; count: number; avg: number }>
}

// Subscriptions
export function getSubscriptions(): Subscription[] {
  return db.prepare('SELECT * FROM subscriptions ORDER BY next_billing_date ASC').all() as Subscription[]
}

export function addSubscription(data: Omit<Subscription, 'id' | 'created_at'>): { id: number } {
  const res = db
    .prepare(
      `INSERT INTO subscriptions
       (name, amount, currency, billing_cycle, category, next_billing_date, color, icon, is_active, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      data.name,
      data.amount,
      data.currency ?? 'EUR',
      data.billing_cycle,
      data.category,
      data.next_billing_date,
      data.color ?? '#6366f1',
      data.icon ?? 'credit-card',
      data.is_active ?? 1,
      data.notes ?? ''
    )
  return { id: Number(res.lastInsertRowid) }
}

export function updateSubscription(
  id: number,
  data: Partial<Omit<Subscription, 'id' | 'created_at'>>
): void {
  const fields: string[] = []
  const values: unknown[] = []
  for (const [key, value] of Object.entries(data)) {
    if (value !== undefined) {
      fields.push(`${key} = ?`)
      values.push(value)
    }
  }
  if (!fields.length) return
  values.push(id)
  db.prepare(`UPDATE subscriptions SET ${fields.join(', ')} WHERE id = ?`).run(...values)
}

export function deleteSubscription(id: number): void {
  db.prepare('DELETE FROM subscriptions WHERE id = ?').run(id)
}

export function getActiveSubscriptions(): Subscription[] {
  return db
    .prepare('SELECT * FROM subscriptions WHERE is_active = 1 ORDER BY next_billing_date ASC')
    .all() as Subscription[]
}

// Budget
export function getBudget(month: string): Budget[] {
  return db.prepare('SELECT * FROM budget WHERE month = ?').all(month) as Budget[]
}

export function setBudget(data: Omit<Budget, 'id' | 'created_at'>): { id: number } {
  const existing = db
    .prepare('SELECT id FROM budget WHERE category = ? AND month = ?')
    .get(data.category, data.month) as { id: number } | undefined
  if (existing) {
    db.prepare('UPDATE budget SET monthly_limit = ? WHERE id = ?').run(data.monthly_limit, existing.id)
    return { id: existing.id }
  }
  const res = db
    .prepare('INSERT INTO budget (category, monthly_limit, month) VALUES (?, ?, ?)')
    .run(data.category, data.monthly_limit, data.month)
  return { id: Number(res.lastInsertRowid) }
}

export function deleteBudget(id: number): void {
  db.prepare('DELETE FROM budget WHERE id = ?').run(id)
}

export function getBudgetWithSpending(month: string): Array<{
  budget: Budget
  spent: number
}> {
  const budgets = getBudget(month)
  const spentMap = new Map<string, number>()
  const rows = db
    .prepare(
      `SELECT category, SUM(amount_eur) AS spent
       FROM transactions
       WHERE type = 'expense' AND strftime('%Y-%m', date) = ?
       GROUP BY category`
    )
    .all(month) as Array<{ category: string; spent: number }>
  for (const r of rows) spentMap.set(r.category, r.spent)
  return budgets.map((b) => ({ budget: b, spent: spentMap.get(b.category) ?? 0 }))
}

// Goals
export function getGoals(): Goal[] {
  return db.prepare('SELECT * FROM goals ORDER BY created_at ASC').all() as Goal[]
}

export function addGoal(data: Omit<Goal, 'id' | 'created_at'>): { id: number } {
  const res = db
    .prepare(
      `INSERT INTO goals (name, target_amount, current_amount, target_date, color, icon, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      data.name,
      data.target_amount,
      data.current_amount ?? 0,
      data.target_date ?? null,
      data.color ?? '#10b981',
      data.icon ?? 'target',
      data.notes ?? ''
    )
  return { id: Number(res.lastInsertRowid) }
}

export function updateGoal(id: number, data: Partial<Omit<Goal, 'id' | 'created_at'>>): void {
  const fields: string[] = []
  const values: unknown[] = []
  for (const [key, value] of Object.entries(data)) {
    if (value !== undefined) {
      fields.push(`${key} = ?`)
      values.push(value)
    }
  }
  if (!fields.length) return
  values.push(id)
  db.prepare(`UPDATE goals SET ${fields.join(', ')} WHERE id = ?`).run(...values)
}

export function deleteGoal(id: number): void {
  db.prepare('DELETE FROM goals WHERE id = ?').run(id)
}

// Backup / reset
export function exportBackup(): BackupData {
  return {
    transactions: db.prepare('SELECT * FROM transactions').all() as Transaction[],
    subscriptions: db.prepare('SELECT * FROM subscriptions').all() as Subscription[],
    budget: db.prepare('SELECT * FROM budget').all() as Budget[],
    goals: db.prepare('SELECT * FROM goals').all() as Goal[],
    settings: getAllSettings()
  }
}

export function importBackup(data: BackupData): void {
  db.transaction(() => {
    db.exec('DELETE FROM transactions')
    db.exec('DELETE FROM subscriptions')
    db.exec('DELETE FROM budget')
    db.exec('DELETE FROM goals')
    const insertTx = db.prepare(
      `INSERT INTO transactions (id, amount, amount_eur, type, category, description, date, currency, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    for (const t of data.transactions) {
      insertTx.run(
        t.id,
        t.amount,
        t.amount_eur ?? t.amount,
        t.type,
        t.category,
        t.description ?? '',
        t.date,
        t.currency ?? 'EUR',
        t.created_at
      )
    }
    const insertSub = db.prepare(
      `INSERT INTO subscriptions (id, name, amount, currency, billing_cycle, category, next_billing_date, color, icon, is_active, notes, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    for (const s of data.subscriptions) {
      insertSub.run(
        s.id,
        s.name,
        s.amount,
        s.currency ?? 'EUR',
        s.billing_cycle,
        s.category,
        s.next_billing_date,
        s.color ?? '#6366f1',
        s.icon ?? 'credit-card',
        s.is_active ?? 1,
        s.notes ?? '',
        s.created_at
      )
    }
    const insertBudget = db.prepare(
      'INSERT INTO budget (id, category, monthly_limit, month, created_at) VALUES (?, ?, ?, ?, ?)'
    )
    for (const b of data.budget) {
      insertBudget.run(b.id, b.category, b.monthly_limit, b.month, b.created_at)
    }
    const insertGoal = db.prepare(
      'INSERT INTO goals (id, name, target_amount, current_amount, target_date, color, icon, notes, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'
    )
    for (const g of data.goals) {
      insertGoal.run(
        g.id,
        g.name,
        g.target_amount,
        g.current_amount ?? 0,
        g.target_date ?? null,
        g.color ?? '#10b981',
        g.icon ?? 'target',
        g.notes ?? '',
        g.created_at
      )
    }
    for (const [key, value] of Object.entries(data.settings)) {
      setSetting(key as keyof SettingsMap, value as SettingsMap[keyof SettingsMap])
    }
  })()
}

export function resetData(): void {
  db.transaction(() => {
    db.exec('DELETE FROM transactions')
    db.exec('DELETE FROM subscriptions')
    db.exec('DELETE FROM budget')
    db.exec('DELETE FROM goals')
    db.exec('DELETE FROM settings')
    initSchema()
  })()
}

export { db }
