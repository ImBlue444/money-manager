import React, { useEffect, useState } from 'react'
import { Card } from '../components/ui/Card'
import { Spinner } from '../components/ui/Spinner'
import { useSettings } from '../context/SettingsContext'
import type { DashboardSummary, Subscription, Transaction } from '../types'
import { formatCurrency, formatShortDate, getMonthKey, monthLabel } from '../lib/formatters'
import {
  TrendingUp,
  TrendingDown,
  Wallet,
  RefreshCw,
  Calendar
} from 'lucide-react'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts'

export function Dashboard(): JSX.Element {
  const { settings } = useSettings()
  const [data, setData] = useState<DashboardSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const month = getMonthKey()

  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        setLoading(true)
        const summary = await window.api.getDashboardSummary(month)
        if (!cancelled) setData(summary)
      } catch (e) {
        if (!cancelled) setError('Errore caricamento dashboard')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [month])

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <Spinner />
      </div>
    )
  }
  if (error || !data) {
    return <div className="text-red-500">{error || 'Errore'}</div>
  }

  const currency = settings.base_currency || 'EUR'
  const locale = settings.locale || 'it-IT'

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-semibold">Dashboard</h2>
        <span className="text-sm text-gray-500 dark:text-gray-400">{monthLabel(month, locale)}</span>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <SummaryCard
          label="Saldo attuale"
          value={formatCurrency(data.balance, currency, locale)}
          icon={Wallet}
          color="text-primary-500"
        />
        <SummaryCard
          label="Entrate mese"
          value={formatCurrency(data.income, currency, locale)}
          icon={TrendingUp}
          color="text-income"
        />
        <SummaryCard
          label="Uscite mese"
          value={formatCurrency(data.expense, currency, locale)}
          icon={TrendingDown}
          color="text-expense"
        />
        <SummaryCard
          label="Abbonamenti attivi"
          value={formatCurrency(data.subscriptions, currency, locale)}
          icon={RefreshCw}
          color="text-warning"
        />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <h3 className="mb-4 text-base font-semibold">Andamento saldo</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data.trend}>
                <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                <YAxis tickFormatter={(v) => `€${v}`} tick={{ fontSize: 12 }} />
                <Tooltip formatter={(v: number) => formatCurrency(v, currency, locale)} />
                <Line
                  type="monotone"
                  dataKey="balance"
                  stroke="#6366f1"
                  strokeWidth={2}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card>
          <h3 className="mb-4 text-base font-semibold">Uscite per categoria</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data.spendingByCategory}
                  dataKey="amount"
                  nameKey="category"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={2}
                >
                  {data.spendingByCategory.map((entry, idx) => (
                    <Cell key={`cell-${idx}`} fill={getColor(idx)} />
                  ))}
                </Pie>
                <Tooltip formatter={(v: number) => formatCurrency(v, currency, locale)} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <h3 className="mb-4 text-base font-semibold">Prossimi abbonamenti</h3>
          <div className="space-y-3">
            {data.upcoming.length === 0 && (
              <p className="text-sm text-gray-500">Nessun abbonamento imminente</p>
            )}
            {data.upcoming.map((sub) => (
              <SubscriptionRow key={sub.id} sub={sub} locale={locale} />
            ))}
          </div>
        </Card>

        <Card>
          <h3 className="mb-4 text-base font-semibold">Ultime transazioni</h3>
          <div className="space-y-3">
            {data.recent.length === 0 && (
              <p className="text-sm text-gray-500">Nessuna transazione recente</p>
            )}
            {data.recent.map((tx) => (
              <TransactionRow key={tx.id} tx={tx} currency={currency} locale={locale} />
            ))}
          </div>
        </Card>
      </div>
    </div>
  )
}

function SummaryCard({
  label,
  value,
  icon: Icon,
  color
}: {
  label: string
  value: string
  icon: React.ElementType
  color: string
}): JSX.Element {
  return (
    <Card>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-500 dark:text-gray-400">{label}</p>
          <p className="mt-1 text-xl font-bold">{value}</p>
        </div>
        <div className={color}>
          <Icon className="h-8 w-8" />
        </div>
      </div>
    </Card>
  )
}

function SubscriptionRow({ sub, locale }: { sub: Subscription; locale: string }): JSX.Element {
  return (
    <div className="flex items-center gap-3">
      <div
        className="flex h-10 w-10 items-center justify-center rounded-lg text-white"
        style={{ backgroundColor: sub.color }}
      >
        <Calendar className="h-5 w-5" />
      </div>
      <div className="flex-1">
        <p className="text-sm font-medium">{sub.name}</p>
        <p className="text-xs text-gray-500">{formatShortDate(sub.next_billing_date, locale)}</p>
      </div>
      <span className="text-sm font-semibold">
        {formatCurrency(sub.amount, sub.currency, locale)}
      </span>
    </div>
  )
}

function TransactionRow({
  tx,
  currency,
  locale
}: {
  tx: Transaction
  currency: string
  locale: string
}): JSX.Element {
  const isIncome = tx.type === 'income'
  return (
    <div className="flex items-center justify-between">
      <div>
        <p className="text-sm font-medium">{tx.description || tx.category}</p>
        <p className="text-xs text-gray-500">{formatShortDate(tx.date, locale)}</p>
      </div>
      <span className={`text-sm font-semibold ${isIncome ? 'text-income' : 'text-expense'}`}>
        {isIncome ? '+' : '-'} {formatCurrency(tx.amount_eur, currency, locale)}
      </span>
    </div>
  )
}

const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6', '#0ea5e9']
function getColor(idx: number): string {
  return COLORS[idx % COLORS.length]
}
