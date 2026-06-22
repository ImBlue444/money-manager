import {
  startOfMonth,
  endOfMonth,
  subMonths,
  format,
  startOfYear,
  endOfYear
} from 'date-fns'
import {
  getActiveSubscriptions,
  getAllSettings,
  getBudgetWithSpending,
  getGoals,
  getMonthlyTotals,
  getSpendingByCategory,
  getTransactions
} from './db'
import { convertSync, fetchRatesToBase } from '../../electron/services/currency'
import type { AiPeriod, Subscription } from '../types'

export function getPeriodDates(period: AiPeriod): { from: string; to: string; label: string } {
  const today = new Date()
  switch (period) {
    case 'current_month': {
      return {
        from: format(startOfMonth(today), 'yyyy-MM-dd'),
        to: format(endOfMonth(today), 'yyyy-MM-dd'),
        label: 'mese corrente'
      }
    }
    case 'last_month': {
      const last = subMonths(today, 1)
      return {
        from: format(startOfMonth(last), 'yyyy-MM-dd'),
        to: format(endOfMonth(last), 'yyyy-MM-dd'),
        label: 'mese scorso'
      }
    }
    case 'last_3_months': {
      return {
        from: format(startOfMonth(subMonths(today, 2)), 'yyyy-MM-dd'),
        to: format(endOfMonth(today), 'yyyy-MM-dd'),
        label: 'ultimi 3 mesi'
      }
    }
    case 'last_6_months': {
      return {
        from: format(startOfMonth(subMonths(today, 5)), 'yyyy-MM-dd'),
        to: format(endOfMonth(today), 'yyyy-MM-dd'),
        label: 'ultimi 6 mesi'
      }
    }
    case 'last_12_months': {
      return {
        from: format(startOfMonth(subMonths(today, 11)), 'yyyy-MM-dd'),
        to: format(endOfMonth(today), 'yyyy-MM-dd'),
        label: 'ultimi 12 mesi'
      }
    }
    case 'all':
    default: {
      return {
        from: '1900-01-01',
        to: format(today, 'yyyy-MM-dd'),
        label: 'tutto il periodo disponibile'
      }
    }
  }
}

function toMonthly(amount: number, cycle: Subscription['billing_cycle']): number {
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

export async function buildFinancialContext(period: AiPeriod): Promise<string> {
  const settings = getAllSettings()
  const currency = settings.base_currency || 'EUR'
  const locale = settings.locale || 'it-IT'
  const username = settings.username || 'Utente'
  const { from, to, label } = getPeriodDates(period)

  const fromMonth = format(new Date(from), 'yyyy-MM')
  const toMonth = format(new Date(to), 'yyyy-MM')

  let income = 0
  let expense = 0
  if (fromMonth === toMonth) {
    const totals = getMonthlyTotals(fromMonth)
    income = totals.income
    expense = totals.expense
  } else {
    const months: string[] = []
    let cursor = new Date(from)
    while (cursor <= new Date(to)) {
      months.push(format(cursor, 'yyyy-MM'))
      cursor = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1)
    }
    for (const m of months) {
      const t = getMonthlyTotals(m)
      income += t.income
      expense += t.expense
    }
  }

  const startingBalance = Number(settings.starting_balance || '0')
  const balance = startingBalance + income - expense

  const txInPeriod = getTransactions({}).filter((t) => t.date >= from && t.date <= to)
  const spendingMap = new Map<string, number>()
  for (const t of txInPeriod.filter((t) => t.type === 'expense')) {
    spendingMap.set(t.category, (spendingMap.get(t.category) || 0) + t.amount_base)
  }
  const spending = Array.from(spendingMap.entries())
    .map(([category, amount]) => ({ category, amount }))
    .sort((a, b) => b.amount - a.amount)
  const subs = getActiveSubscriptions()
  const subCurrencies = [...new Set(subs.map((s) => s.currency))]
  await fetchRatesToBase(currency, subCurrencies)
  const monthlySubscriptions = subs.reduce((sum, s) => {
    const monthly = toMonthly(s.amount, s.billing_cycle)
    return sum + (convertSync(monthly, s.currency, currency) ?? monthly)
  }, 0)
  const budgets = getBudgetWithSpending(format(new Date(), 'yyyy-MM'))
  const goals = getGoals()

  const lines = [
    `Oggi è ${format(new Date(), 'yyyy-MM-dd')}.`,
    `L'utente si chiama ${username}.`,
    `Periodo di riferimento: ${label} (${from} → ${to}).`,
    `Valuta principale: ${currency}.`,
    `Saldo iniziale impostato: ${currency} ${startingBalance.toFixed(2)}.`,
    `Totale entrate nel periodo: ${currency} ${income.toFixed(2)}.`,
    `Totale uscite nel periodo: ${currency} ${expense.toFixed(2)}.`,
    `Saldo calcolato (iniziale + entrate - uscite): ${currency} ${balance.toFixed(2)}.`,
    `Numero di transazioni nel periodo: ${txInPeriod.length}.`,
    '',
    'ABBUONAMENTI ATTIVI:',
    `Costo mensile totale abbonamenti: ${currency} ${monthlySubscriptions.toFixed(2)}.`,
    subs
      .map((s) => {
        const monthly = toMonthly(s.amount, s.billing_cycle)
        const converted = convertSync(monthly, s.currency, currency) ?? monthly
        const original = `${s.amount.toFixed(2)} ${s.currency}`
        return `- ${s.name}: ${currency} ${converted.toFixed(2)} / mese (${original} / ${s.billing_cycle})`
      })
      .join('\n') || 'Nessun abbonamento attivo.',
    '',
    'TOP CATEGORIE DI SPESA:',
    spending
      .slice(0, 6)
      .map((c) => `- ${c.category}: ${currency} ${c.amount.toFixed(2)}`)
      .join('\n') || 'Nessuna spesa registrata.',
    '',
    'BUDGET DEL MESE CORRENTE:',
    budgets
      .map((b) => {
        const pct = b.budget.monthly_limit > 0 ? Math.round((b.spent / b.budget.monthly_limit) * 100) : 0
        return `- ${b.budget.category}: ${currency} ${b.spent.toFixed(2)} spesi su ${currency} ${b.budget.monthly_limit.toFixed(2)} (${pct}%)`
      })
      .join('\n') || 'Nessun budget impostato.',
    '',
    'OBIETTIVI DI RISPARMIO:',
    goals
      .map((g) => {
        const pct = g.target_amount > 0 ? Math.round((g.current_amount / g.target_amount) * 100) : 0
        return `- ${g.name}: ${currency} ${g.current_amount.toFixed(2)} / ${currency} ${g.target_amount.toFixed(2)} (${pct}%)`
      })
      .join('\n') || 'Nessun obiettivo impostato.'
  ]

  return lines.join('\n')
}

export function buildSystemPrompt(locale: string): string {
  return [
    'Sei LoveAI, un consulente finanziario personale integrato nell’app MoneyLove.',
    'Rispondi SEMPRE e SOLO in materia di finanza personale, risparmio, budgeting, gestione spese e pianificazione obiettivi.',
    'Il tuo unico obiettivo è difendere e migliorare gli interessi economici dell’utente.',
    'NON cambiare argomento se l’utente chiede cose fuori dalla finanza personale: rispondi gentilmente che puoi aiutarlo solo su questioni finanziarie.',
    'NON fornire consigli di investimento specifici (azioni, criptovalute, trading).',
    'Usa i dati forniti nel contesto per basare le tue risposte su fatti concreti.',
    'Sii conciso, pratico e incoraggiante. Usa emoji con moderazione.',
    `Rispondi nella lingua corrispondente al locale "${locale}" (es. it-IT → italiano, en-US → inglese).`
  ].join('\n')
}
