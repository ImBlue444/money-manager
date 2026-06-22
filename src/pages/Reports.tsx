import React, { useEffect, useMemo, useState } from 'react'
import { Download } from 'lucide-react'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { Select } from '../components/ui/Select'
import { Input } from '../components/ui/Input'
import { Spinner } from '../components/ui/Spinner'
import { useSettings } from '../context/SettingsContext'
import { formatCurrency, getMonthKey } from '../lib/formatters'
import type { ReportsSummary, Transaction } from '../types'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
  CartesianGrid,
  Legend
} from 'recharts'

export function Reports(): JSX.Element {
  const { settings } = useSettings()
  const [periodType, setPeriodType] = useState<'month' | 'quarter' | 'year' | 'custom'>('month')
  const [month, setMonth] = useState(getMonthKey())
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [summary, setSummary] = useState<ReportsSummary | null>(null)
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const currency = settings.base_currency || 'EUR'
  const locale = settings.locale || 'it-IT'

  const { fromDate, toDate } = useMemo(() => {
    const today = new Date()
    if (periodType === 'custom' && from && to) return { fromDate: from, toDate: to }
    const [y, m] = month.split('-').map(Number)
    if (periodType === 'month') {
      const lastDay = new Date(y, m, 0).getDate()
      return { fromDate: `${y}-${String(m).padStart(2, '0')}-01`, toDate: `${y}-${String(m).padStart(2, '0')}-${lastDay}` }
    }
    if (periodType === 'quarter') {
      const qStart = Math.floor((m - 1) / 3) * 3 + 1
      const qEnd = qStart + 2
      const lastDay = new Date(y, qEnd, 0).getDate()
      return {
        fromDate: `${y}-${String(qStart).padStart(2, '0')}-01`,
        toDate: `${y}-${String(qEnd).padStart(2, '0')}-${lastDay}`
      }
    }
    return { fromDate: `${y}-01-01`, toDate: `${y}-12-31` }
  }, [periodType, month, from, to])

  const load = async () => {
    try {
      setLoading(true)
      const [sum, txs] = await Promise.all([
        window.api.getReportsSummary(fromDate, toDate),
        window.api.getTransactions({})
      ])
      setSummary(sum)
      setTransactions(txs.filter((t) => t.date >= fromDate && t.date <= toDate))
    } catch (e) {
      setError('Errore caricamento report')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (periodType === 'custom' && (!from || !to)) return
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [periodType, month, from, to])

  const handleExportCsv = async () => {
    await window.api.exportCsv(transactions)
  }

  const categoryTrendData = useMemo(() => {
    if (!summary) return []
    const months = [...new Set(summary.categoryTrend.map((d) => d.month))].sort()
    const categories = [...new Set(summary.categoryTrend.map((d) => d.category))]
    return months.map((m) => {
      const row: Record<string, number | string> = { month: m }
      for (const cat of categories) {
        row[cat] = summary.categoryTrend.find((d) => d.month === m && d.category === cat)?.amount ?? 0
      }
      return row
    })
  }, [summary])

  const colors = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6', '#0ea5e9']

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-2xl font-semibold">Report</h2>
        <Button onClick={handleExportCsv} className="gap-2">
          <Download className="h-4 w-4" /> Esporta CSV
        </Button>
      </div>

      <Card>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
          <Select value={periodType} onChange={(e) => setPeriodType(e.target.value as typeof periodType)}>
            <option value="month">Mese singolo</option>
            <option value="quarter">Trimestre</option>
            <option value="year">Anno</option>
            <option value="custom">Range personalizzato</option>
          </Select>
          {periodType !== 'custom' ? (
            <Input type={periodType === 'year' ? 'number' : 'month'} value={month} onChange={(e) => setMonth(e.target.value)} />
          ) : (
            <>
              <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} placeholder="Dal" />
              <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} placeholder="Al" />
            </>
          )}
        </div>
      </Card>

      {loading ? (
        <div className="flex h-64 items-center justify-center">
          <Spinner />
        </div>
      ) : error || !summary ? (
        <div className="text-red-500">{error || 'Errore'}</div>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <Card>
              <h3 className="mb-4 text-base font-semibold">Entrate vs Uscite</h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={summary.incomeExpense}>
                    <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                    <YAxis tickFormatter={(v) => `€${v}`} tick={{ fontSize: 12 }} />
                    <Tooltip formatter={(v: number) => formatCurrency(v, currency, locale)} />
                    <Legend />
                    <Bar dataKey="income" name="Entrate" fill="#10b981" />
                    <Bar dataKey="expense" name="Uscite" fill="#ef4444" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card>

            <Card>
              <h3 className="mb-4 text-base font-semibold">Top categorie di spesa</h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={summary.categorySummary.slice(0, 6)} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" tickFormatter={(v) => `€${v}`} tick={{ fontSize: 12 }} />
                    <YAxis type="category" dataKey="category" width={100} tick={{ fontSize: 12 }} />
                    <Tooltip formatter={(v: number) => formatCurrency(v, currency, locale)} />
                    <Bar dataKey="amount" fill="#6366f1" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card>
          </div>

          <Card>
            <h3 className="mb-4 text-base font-semibold">Trend spese per categoria</h3>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={categoryTrendData}>
                  <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                  <YAxis tickFormatter={(v) => `€${v}`} tick={{ fontSize: 12 }} />
                  <Tooltip formatter={(v: number) => formatCurrency(v, currency, locale)} />
                  <Legend />
                  {categoryTrendData.length > 0 &&
                    Object.keys(categoryTrendData[0])
                      .filter((k) => k !== 'month')
                      .map((cat, idx) => (
                        <Area
                          key={cat}
                          type="monotone"
                          dataKey={cat}
                          stackId="1"
                          stroke={colors[idx % colors.length]}
                          fill={colors[idx % colors.length]}
                          fillOpacity={0.5}
                        />
                      ))}
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </Card>

          <Card>
            <h3 className="mb-4 text-base font-semibold">Riepilogo per categoria</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-gray-50 dark:bg-gray-700/50">
                  <tr>
                    <th className="px-4 py-2">Categoria</th>
                    <th className="px-4 py-2">Speso</th>
                    <th className="px-4 py-2">Transazioni</th>
                    <th className="px-4 py-2">Media</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                  {summary.categorySummary.map((row) => (
                    <tr key={row.category}>
                      <td className="px-4 py-2">{row.category}</td>
                      <td className="px-4 py-2">{formatCurrency(row.amount, currency, locale)}</td>
                      <td className="px-4 py-2">{row.count}</td>
                      <td className="px-4 py-2">{formatCurrency(row.avg, currency, locale)}</td>
                    </tr>
                  ))}
                  {summary.categorySummary.length === 0 && (
                    <tr>
                      <td colSpan={4} className="px-4 py-6 text-center text-gray-500">
                        Nessun dato per il periodo selezionato
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </>
      )}
    </div>
  )
}
