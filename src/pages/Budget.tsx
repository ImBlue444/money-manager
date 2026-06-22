import React, { useEffect, useMemo, useState } from 'react'
import { Plus, AlertTriangle, Copy } from 'lucide-react'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { Select } from '../components/ui/Select'
import { Input } from '../components/ui/Input'
import { Modal } from '../components/ui/Modal'
import { Spinner } from '../components/ui/Spinner'
import { useBudget } from '../hooks/useBudget'
import { useSettings } from '../context/SettingsContext'
import { EXPENSE_CATEGORIES, getCategory } from '../lib/categories'
import { formatCurrency, getMonthKey, monthLabel, previousMonthKey } from '../lib/formatters'
import { CategoryIcon } from '../components/ui/CategoryIcon'
import type { BudgetWithSpending } from '../types'

export function Budget(): JSX.Element {
  const { settings } = useSettings()
  const [month, setMonth] = useState(getMonthKey())
  const { data, loading, error, refetch } = useBudget(month)
  const [modalOpen, setModalOpen] = useState(false)

  const locale = settings.locale || 'it-IT'

  const overBudget = useMemo(() => data.filter((b) => b.budget.monthly_limit > 0 && b.spent / b.budget.monthly_limit > 0.9), [data])

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-2xl font-semibold">Budget</h2>
        <div className="flex items-center gap-2">
          <Input
            type="month"
            value={month}
            onChange={(e) => setMonth(e.target.value)}
            className="w-40"
          />
          <Button onClick={() => setModalOpen(true)} className="gap-2">
            <Plus className="h-4 w-4" /> Imposta budget
          </Button>
        </div>
      </div>

      {overBudget.length > 0 && (
        <div className="flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 p-4 text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-400">
          <AlertTriangle className="h-5 w-5 shrink-0" />
          <div>
            <p className="font-medium">Budget quasi esaurito</p>
            <ul className="mt-1 text-sm">
              {overBudget.map((b) => (
                <li key={b.budget.id}>
                  {b.budget.category}: {formatCurrency(b.spent, settings.base_currency || 'EUR', locale)} su{' '}
                  {formatCurrency(b.budget.monthly_limit, settings.base_currency || 'EUR', locale)}
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex h-64 items-center justify-center">
          <Spinner />
        </div>
      ) : error ? (
        <div className="text-red-500">{error}</div>
      ) : (
        <div className="space-y-3">
          {data.length === 0 && (
            <Card>
              <p className="text-gray-500">Nessun budget impostato per {monthLabel(month, locale)}.</p>
            </Card>
          )}
          {data.map((b) => (
            <BudgetRow key={b.budget.id} item={b} currency={settings.base_currency || 'EUR'} locale={locale} onChanged={refetch} />
          ))}
        </div>
      )}

      <BudgetModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        month={month}
        onSaved={refetch}
      />
    </div>
  )
}

function BudgetRow({
  item,
  currency,
  locale,
  onChanged
}: {
  item: BudgetWithSpending
  currency: string
  locale: string
  onChanged: () => void
}): JSX.Element {
  const { budget, spent } = item
  const percentage = budget.monthly_limit > 0 ? Math.min(100, Math.round((spent / budget.monthly_limit) * 100)) : 0
  const color = percentage < 70 ? 'bg-income' : percentage <= 90 ? 'bg-warning' : 'bg-expense'
  const cat = getCategory(budget.category)

  const handleDelete = async () => {
    if (!confirm('Rimuovere il budget per questa categoria?')) return
    await window.api.deleteBudget(budget.id)
    onChanged()
  }

  return (
    <Card>
      <div className="mb-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          {cat && <CategoryIcon name={cat.icon} className="h-5 w-5" style={{ color: cat.color }} />}
          <span className="font-medium">{budget.category}</span>
        </div>
        <button onClick={handleDelete} className="text-xs text-red-500 hover:underline">
          Rimuovi
        </button>
      </div>
      <div className="h-3 w-full overflow-hidden rounded-full bg-gray-100 dark:bg-gray-700">
        <div className={`h-full ${color} transition-all`} style={{ width: `${percentage}%` }} />
      </div>
      <div className="mt-2 flex items-center justify-between text-sm">
        <span className="text-gray-500">
          {formatCurrency(spent, currency, locale)} spesi di {formatCurrency(budget.monthly_limit, currency, locale)}
        </span>
        <span className="font-medium">{percentage}%</span>
      </div>
    </Card>
  )
}

function BudgetModal({
  isOpen,
  onClose,
  month,
  onSaved
}: {
  isOpen: boolean
  onClose: () => void
  month: string
  onSaved: () => void
}): JSX.Element {
  const { settings } = useSettings()
  const [category, setCategory] = useState('')
  const [limit, setLimit] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (isOpen) {
      setCategory('')
      setLimit('')
    }
  }, [isOpen])

  const handleCopyLastMonth = async () => {
    const prev = previousMonthKey(month)
    const prevBudgets = await window.api.getBudget(prev)
    for (const b of prevBudgets) {
      await window.api.setBudget({
        category: b.budget.category,
        monthly_limit: b.budget.monthly_limit,
        month
      })
    }
    onSaved()
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const val = Number(limit)
    if (!category || Number.isNaN(val) || val <= 0) return alert('Dati non validi')
    setSaving(true)
    try {
      await window.api.setBudget({ category, monthly_limit: val, month })
      onSaved()
      onClose()
    } catch {
      alert('Errore salvataggio')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Imposta budget">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="mb-1 block text-xs font-medium">Categoria</label>
          <Select value={category} onChange={(e) => setCategory(e.target.value)} required>
            <option value="">Seleziona...</option>
            {EXPENSE_CATEGORIES.map((c) => (
              <option key={c.name} value={c.name}>{c.name}</option>
            ))}
          </Select>
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium">Limite mensile</label>
          <Input type="number" step="0.01" min="0" value={limit} onChange={(e) => setLimit(e.target.value)} required />
        </div>
        <div className="flex justify-between pt-2">
          <Button type="button" variant="ghost" onClick={handleCopyLastMonth} className="gap-1">
            <Copy className="h-4 w-4" /> Copia mese scorso
          </Button>
          <div className="flex gap-2">
            <Button type="button" variant="ghost" onClick={onClose}>Annulla</Button>
            <Button type="submit" isLoading={saving}>Salva</Button>
          </div>
        </div>
      </form>
    </Modal>
  )
}
