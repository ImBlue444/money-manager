import Store from 'electron-store'
import { db, getSetting } from '../../src/lib/db'

interface RateCache {
  rate: number
  date: string
  timestamp: number
}

interface CurrencyStore {
  rates: Record<string, RateCache>
  lastBaseCurrency?: string
}

const RATE_TTL = 30 * 60 * 1000

const store = new Store<CurrencyStore>({
  name: 'moneylove-rates',
  encryptionKey: 'moneylove-rates-storage-key',
  clearInvalidConfig: true,
  defaults: { rates: {} }
})

function cacheKey(from: string, to: string): string {
  return `${from}-${to}`
}

function getBaseCurrency(): string {
  return getSetting('base_currency') ?? 'EUR'
}

function setCachedRate(from: string, to: string, rate: number, date: string): void {
  const rates = store.get('rates')
  rates[cacheKey(from, to)] = { rate, date, timestamp: Date.now() }
  store.set('rates', rates)
}

export function getCachedRate(from: string, to: string): number | null {
  if (from === to) return 1
  const rates = store.get('rates')
  const cached = rates[cacheKey(from, to)]
  return cached?.rate ?? null
}

export function getCachedRateSafe(from: string, to: string): number | null {
  if (from === to) return 1
  const rates = store.get('rates')
  const cached = rates[cacheKey(from, to)]
  return cached?.rate ?? null
}

export async function fetchRate(from: string, to: string): Promise<number | null> {
  if (from === to) return 1
  const rates = store.get('rates')
  const cached = rates[cacheKey(from, to)]
  if (cached && Date.now() - cached.timestamp < RATE_TTL) {
    return cached.rate
  }
  try {
    const res = await fetch(
      `https://api.frankfurter.app/latest?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`
    )
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const data = (await res.json()) as { rates: Record<string, number>; date: string }
    const rate = data.rates[to]
    if (rate === undefined) throw new Error('Tasso non disponibile')
    setCachedRate(from, to, rate, data.date)
    return rate
  } catch (e) {
    console.error(`fetchRate(${from}, ${to}) error`, e)
    return cached?.rate ?? null
  }
}

export async function fetchRatesToBase(
  base: string,
  currencies: string[]
): Promise<Record<string, number> | null> {
  const targets = currencies.filter((c) => c !== base)
  const result: Record<string, number> = { [base]: 1 }

  if (targets.length === 0) return result

  const missing = targets.filter((c) => !getCachedRate(c, base))
  if (missing.length === 0) {
    for (const c of targets) {
      const rate = getCachedRate(c, base)
      if (rate !== null) result[c] = rate
    }
    return result
  }

  try {
    const res = await fetch(
      `https://api.frankfurter.app/latest?from=${encodeURIComponent(base)}&to=${encodeURIComponent(
        missing.join(',')
      )}`
    )
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const data = (await res.json()) as { rates: Record<string, number>; date: string }
    for (const c of targets) {
      const forward = data.rates[c]
      if (forward !== undefined && forward !== 0) {
        const rate = 1 / forward
        result[c] = rate
        setCachedRate(base, c, forward, data.date)
        setCachedRate(c, base, rate, data.date)
      } else {
        const stale = getCachedRate(c, base)
        if (stale !== null) result[c] = stale
      }
    }
    return result
  } catch (e) {
    console.error('fetchRatesToBase error', e)
    for (const c of targets) {
      const stale = getCachedRate(c, base)
      if (stale !== null) result[c] = stale
    }
    return Object.keys(result).length > 1 ? result : null
  }
}

export function convertSync(amount: number, from: string, to: string): number | null {
  if (from === to) return amount
  const rate = getCachedRate(from, to)
  if (rate === null) return null
  return Number((amount * rate).toFixed(4))
}

export async function convert(
  amount: number,
  from: string,
  to: string
): Promise<number | null> {
  if (from === to) return amount
  const rate = await fetchRate(from, to)
  if (rate === null) return null
  return Number((amount * rate).toFixed(4))
}

export function getLastBaseCurrency(): string | undefined {
  return store.get('lastBaseCurrency')
}

export function setLastBaseCurrency(base: string): void {
  store.set('lastBaseCurrency', base)
}

const RECALC_STATEMENTS = {
  transactions: {
    all: db.prepare('SELECT DISTINCT currency FROM transactions WHERE currency != ?'),
    warnings: db.prepare('SELECT DISTINCT currency FROM transactions WHERE conversion_warning = 1'),
    update: db.prepare('UPDATE transactions SET amount_base = amount * ?, conversion_warning = 0 WHERE currency = ?'),
    flag: db.prepare('UPDATE transactions SET conversion_warning = 1 WHERE currency = ? AND currency != ?')
  },
  subscriptions: {
    all: db.prepare('SELECT DISTINCT currency FROM subscriptions WHERE currency != ?'),
    warnings: db.prepare('SELECT DISTINCT currency FROM subscriptions WHERE conversion_warning = 1'),
    update: db.prepare('UPDATE subscriptions SET amount_base = amount * ?, conversion_warning = 0 WHERE currency = ?'),
    flag: db.prepare('UPDATE subscriptions SET conversion_warning = 1 WHERE currency = ? AND currency != ?')
  }
}

async function recalculateTable(
  table: keyof typeof RECALC_STATEMENTS,
  base: string,
  onlyWarnings: boolean
): Promise<void> {
  const stmts = RECALC_STATEMENTS[table]
  const rows = (onlyWarnings
    ? stmts.warnings.all()
    : stmts.all.all(base)) as Array<{ currency: string }>

  for (const { currency } of rows) {
    if (currency === base) continue
    const rate = await fetchRate(currency, base)
    if (rate !== null) {
      stmts.update.run(rate, currency)
    } else {
      stmts.flag.run(currency, base)
    }
  }
}

export async function recalculateTransactions(base: string, onlyWarnings: boolean): Promise<void> {
  await recalculateTable('transactions', base, onlyWarnings)
}

export async function recalculateSubscriptions(base: string, onlyWarnings: boolean): Promise<void> {
  await recalculateTable('subscriptions', base, onlyWarnings)
}

export async function recalculateBudgetAndGoals(oldBase: string, newBase: string): Promise<void> {
  const rate = await fetchRate(oldBase, newBase)
  if (rate === null) return
  db.prepare('UPDATE budget SET monthly_limit = monthly_limit * ?').run(rate)
  db.prepare('UPDATE goals SET target_amount = target_amount * ?, current_amount = current_amount * ?').run(
    rate,
    rate
  )
}

export async function recalculateWarnings(): Promise<void> {
  const base = getBaseCurrency()
  await recalculateTransactions(base, true)
  await recalculateSubscriptions(base, true)
}

export async function recalculateAll(newBase: string): Promise<void> {
  await recalculateTransactions(newBase, false)
  await recalculateSubscriptions(newBase, false)
  const oldBase = getLastBaseCurrency()
  if (oldBase && oldBase !== newBase) {
    await recalculateBudgetAndGoals(oldBase, newBase)
  }
  setLastBaseCurrency(newBase)
}
