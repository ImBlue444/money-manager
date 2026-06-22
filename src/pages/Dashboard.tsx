import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Card } from '../components/ui/Card'
import { Spinner } from '../components/ui/Spinner'
import { Button } from '../components/ui/Button'
import { useSettings } from '../context/SettingsContext'
import type { DashboardSummary, Subscription, Transaction } from '../types'
import { formatConverted, formatCurrency, formatShortDate, getMonthKey, monthLabel } from '../lib/formatters'
import {
  TrendingUp,
  TrendingDown,
  Wallet,
  RefreshCw,
  Calendar,
  Sparkles
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
        <h2 className="font-display text-2xl font-semibold tracking-tight">Dashboard</h2>
        <span className="text-sm text-gray-500 dark:text-gray-400">{monthLabel(month, locale)}</span>
      </div>

      <AIInsight />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <SummaryCard
          label="Saldo attuale"
          value={formatCurrency(data.balance, currency, locale)}
          icon={Wallet}
          tone="primary"
        />
        <SummaryCard
          label="Entrate mese"
          value={formatCurrency(data.income, currency, locale)}
          icon={TrendingUp}
          tone="income"
        />
        <SummaryCard
          label="Uscite mese"
          value={formatCurrency(data.expense, currency, locale)}
          icon={TrendingDown}
          tone="expense"
        />
        <SummaryCard
          label="Abbonamenti attivi"
          value={formatCurrency(data.subscriptions, currency, locale)}
          icon={RefreshCw}
          tone="warning"
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
  tone
}: {
  label: string
  value: string
  icon: React.ElementType
  tone: 'primary' | 'income' | 'expense' | 'warning'
}): JSX.Element {
  const toneClasses = {
    primary: 'bg-primary-50 text-primary-700 dark:bg-primary-900/20 dark:text-primary-300',
    income: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-300',
    expense: 'bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-300',
    warning: 'bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-300'
  }
  return (
    <Card className="group transition-all hover:-translate-y-0.5 hover:shadow-md">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-500 dark:text-gray-400">{label}</p>
          <p className="mt-1 font-display text-2xl font-bold tracking-tight text-gray-900 dark:text-gray-100">
            {value}
          </p>
        </div>
        <div
          className={`flex h-11 w-11 items-center justify-center rounded-xl transition-transform group-hover:scale-105 ${toneClasses[tone]}`}
        >
          <Icon className="h-5 w-5" />
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
        {isIncome ? '+' : '-'} {formatConverted(tx.amount_base, currency, tx.amount, tx.currency, locale)}
      </span>
    </div>
  )
}

function AIInsight(): JSX.Element {
  const { settings } = useSettings()
  const [insight, setInsight] = useState('')
  const [loading, setLoading] = useState(false)
  const [hasKey, setHasKey] = useState(false)

  const autoInsight = settings.ai_auto_insight === 'true'
  const provider = (settings.ai_provider as 'openai' | 'anthropic' | 'gemini') || 'openai'

  useEffect(() => {
    let cancelled = false
    window.api.getAiApiKey(provider).then((key) => {
      if (!cancelled) setHasKey(!!key)
    })
    return () => {
      cancelled = true
    }
  }, [provider])

  const generate = async () => {
    setLoading(true)
    try {
      const text = await window.api.generateInsight('last_month')
      setInsight(text)
    } catch {
      setInsight('Impossibile generare l’insight. Controlla la chiave API.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (autoInsight && hasKey) {
      generate()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoInsight, hasKey])

  if (!hasKey) {
    return (
      <Card className="flex items-center justify-between gap-4">
        <div>
          <h3 className="flex items-center gap-2 text-base font-semibold">
            <Sparkles className="h-5 w-5 text-primary-500" /> LoveAI
          </h3>
          <p className="text-sm text-gray-500">
            Configura la tua chiave API per ricevere consigli personalizzati sulle tue finanze.
          </p>
        </div>
        <Link to="/settings">
          <Button variant="secondary" size="sm">
            Configura
          </Button>
        </Link>
      </Card>
    )
  }

  return (
    <Card className="relative overflow-hidden">
      <div className="absolute -right-6 -top-6 h-24 w-24 rounded-full bg-primary-500/10 blur-2xl" />
      <div className="relative flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="flex items-center gap-2 text-base font-semibold">
            <Sparkles className="h-5 w-5 text-primary-500" /> LoveAI Insight
          </h3>
          {loading ? (
            <p className="text-sm text-gray-500">LoveAI sta analizzando i tuoi dati...</p>
          ) : insight ? (
            <p className="text-sm text-gray-700 dark:text-gray-300">{insight}</p>
          ) : autoInsight ? null : (
            <p className="text-sm text-gray-500">
              Genera un consiglio personalizzato basato sulle tue finanze.
            </p>
          )}
        </div>
        <div className="flex items-center gap-2">
          {!autoInsight && (
            <Button variant="secondary" size="sm" onClick={generate} isLoading={loading}>
              Genera consiglio
            </Button>
          )}
          <Link to="/ai">
            <Button size="sm">Chatta</Button>
          </Link>
        </div>
      </div>
    </Card>
  )
}

const COLORS = ['#ff5e8a', '#a78bfa', '#34d399', '#ffb703', '#ff4d6d', '#60a5fa', '#f472b6', '#fb923c']
function getColor(idx: number): string {
  return COLORS[idx % COLORS.length]
}
