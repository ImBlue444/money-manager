import React, { useEffect, useMemo, useState } from 'react'
import { Plus, Search, ArrowUpDown, ChevronLeft, ChevronRight, Pencil, Trash2, AlertTriangle } from 'lucide-react'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { Input } from '../components/ui/Input'
import { Select } from '../components/ui/Select'
import { Modal } from '../components/ui/Modal'
import { Spinner } from '../components/ui/Spinner'
import { Badge } from '../components/ui/Badge'
import { CategoryIcon } from '../components/ui/CategoryIcon'
import { useTransactions } from '../hooks/useTransactions'
import { useCurrency } from '../hooks/useCurrency'
import { useSettings } from '../context/SettingsContext'
import { EXPENSE_CATEGORIES, INCOME_CATEGORIES, getCategory } from '../lib/categories'
import { formatConverted, formatCurrency, formatDate, getMonthKey, monthLabel } from '../lib/formatters'
import type { Transaction, TransactionType } from '../types'

export function Transactions(): JSX.Element {
  const { settings } = useSettings()
  const [typeFilter, setTypeFilter] = useState<TransactionType | 'all'>('all')
  const [categoryFilter, setCategoryFilter] = useState<string>('all')
  const [monthFilter, setMonthFilter] = useState<string>('all')
  const [availableMonths, setAvailableMonths] = useState<string[]>([])
  const [search, setSearch] = useState('')
  const [sortKey, setSortKey] = useState<'date' | 'amount'>('date')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')
  const [page, setPage] = useState(1)
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<Transaction | null>(null)

  useEffect(() => {
    let cancelled = false
    window.api.getTransactionMonths().then((months) => {
      if (cancelled) return
      setAvailableMonths(months)
      const current = getMonthKey()
      if (months.includes(current)) {
        setMonthFilter(current)
      } else if (months.length > 0) {
        setMonthFilter(months[0])
      }
    })
    return () => {
      cancelled = true
    }
  }, [])

  const filters = {
    type: typeFilter,
    category: categoryFilter,
    month: monthFilter === 'all' ? undefined : monthFilter,
    search: search.trim()
  }
  const { data: rawData, loading, error, refetch } = useTransactions(filters)

  const sortedData = useMemo(() => {
    const list = [...rawData]
    list.sort((a, b) => {
      let cmp = 0
      if (sortKey === 'date') {
        cmp = a.date.localeCompare(b.date)
      } else if (sortKey === 'amount') {
        cmp = a.amount_base - b.amount_base
      }
      return sortOrder === 'asc' ? cmp : -cmp
    })
    return list
  }, [rawData, sortKey, sortOrder])

  const pageSize = 20
  const totalPages = Math.max(1, Math.ceil(sortedData.length / pageSize))
  const pageData = sortedData.slice((page - 1) * pageSize, page * pageSize)

  const handleSort = (key: 'date' | 'amount') => {
    if (sortKey === key) {
      setSortOrder((o) => (o === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortKey(key)
      setSortOrder('desc')
    }
    setPage(1)
  }

  const handleEdit = (tx: Transaction) => {
    setEditing(tx)
    setModalOpen(true)
  }

  const handleAdd = () => {
    setEditing(null)
    setModalOpen(true)
  }

  const handleDelete = async (id: number) => {
    if (!confirm('Eliminare questa transazione?')) return
    await window.api.deleteTransaction(id)
    refetch()
  }

  const currency = settings.base_currency || 'EUR'
  const locale = settings.locale || 'it-IT'

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-2xl font-semibold">Transazioni</h2>
        <Button onClick={handleAdd} className="gap-2">
          <Plus className="h-4 w-4" /> Aggiungi transazione
        </Button>
      </div>

      <Card>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <Select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value as TransactionType | 'all')}>
            <option value="all">Tutte</option>
            <option value="income">Entrate</option>
            <option value="expense">Uscite</option>
          </Select>
          <Select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}>
            <option value="all">Tutte le categorie</option>
            {typeFilter !== 'income' &&
              EXPENSE_CATEGORIES.map((c) => (
                <option key={c.name} value={c.name}>
                  {c.name}
                </option>
              ))}
            {typeFilter !== 'expense' &&
              INCOME_CATEGORIES.map((c) => (
                <option key={c.name} value={c.name}>
                  {c.name}
                </option>
              ))}
          </Select>
          <Select value={monthFilter} onChange={(e) => setMonthFilter(e.target.value)}>
            <option value="all">Tutti i mesi</option>
            {availableMonths.map((m) => (
              <option key={m} value={m}>
                {monthLabel(m, settings.locale || 'it-IT')}
              </option>
            ))}
          </Select>
          <div className="relative lg:col-span-2">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <Input
              placeholder="Cerca..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>
      </Card>

      {loading ? (
        <div className="flex h-64 items-center justify-center">
          <Spinner />
        </div>
      ) : error ? (
        <div className="text-red-500">{error}</div>
      ) : (
        <Card className="overflow-hidden p-0">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50 dark:bg-gray-700/50">
              <tr>
                <th
                  className="cursor-pointer px-4 py-3 font-medium"
                  onClick={() => handleSort('date')}
                >
                  <span className="flex items-center gap-1">
                    Data <ArrowUpDown className="h-3 w-3" />
                  </span>
                </th>
                <th className="px-4 py-3 font-medium">Descrizione</th>
                <th className="px-4 py-3 font-medium">Categoria</th>
                <th
                  className="cursor-pointer px-4 py-3 font-medium"
                  onClick={() => handleSort('amount')}
                >
                  <span className="flex items-center gap-1">
                    Importo <ArrowUpDown className="h-3 w-3" />
                  </span>
                </th>
                <th className="px-4 py-3 font-medium text-right">Azioni</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
              {pageData.map((tx) => (
                <tr
                  key={tx.id}
                  className="hover:bg-gray-50 dark:hover:bg-gray-700/30 cursor-pointer"
                  onClick={() => handleEdit(tx)}
                >
                  <td className="px-4 py-3">{formatDate(tx.date, locale)}</td>
                  <td className="px-4 py-3">{tx.description || '-'}</td>
                  <td className="px-4 py-3">
                    <CategoryBadge name={tx.category} />
                  </td>
                  <td className="px-4 py-3">
                    <span className={tx.type === 'income' ? 'text-income' : 'text-expense'}>
                      {tx.type === 'income' ? '+' : '-'} {formatConverted(tx.amount_base, currency, tx.amount, tx.currency, locale)}
                    </span>
                    {tx.conversion_warning === 1 && (
                      <span title="Tasso di cambio non disponibile al salvataggio; verrà ricalcolato appena online">
                        <AlertTriangle className="ml-1 inline h-3.5 w-3.5 text-warning" />
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        handleEdit(tx)
                      }}
                      className="mr-2 rounded-md p-1 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700"
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        handleDelete(tx.id)
                      }}
                      className="rounded-md p-1 text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))}
              {pageData.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-gray-500">
                    Nessuna transazione trovata
                  </td>
                </tr>
              )}
            </tbody>
          </table>

          <div className="flex items-center justify-between border-t border-gray-100 px-4 py-3 dark:border-gray-700">
            <span className="text-xs text-gray-500">
              {sortedData.length} risultati — pagina {page} di {totalPages}
            </span>
            <div className="flex gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </Card>
      )}

      <TransactionModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        editing={editing}
        onSaved={refetch}
      />
    </div>
  )
}

function CategoryBadge({ name }: { name: string }): JSX.Element {
  const cat = getCategory(name)
  return (
    <Badge color={cat?.color} className="gap-1">
      {cat && <CategoryIcon name={cat.icon} className="h-3 w-3" />}
      {name}
    </Badge>
  )
}

interface TransactionModalProps {
  isOpen: boolean
  onClose: () => void
  editing: Transaction | null
  onSaved: () => void
}

function TransactionModal({ isOpen, onClose, editing, onSaved }: TransactionModalProps): JSX.Element {
  const { settings } = useSettings()
  const [type, setType] = useState<TransactionType>('expense')
  const [amount, setAmount] = useState('')
  const [currency, setCurrency] = useState(settings.base_currency || 'EUR')
  const [category, setCategory] = useState('')
  const [description, setDescription] = useState('')
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  const [saving, setSaving] = useState(false)

  const baseCurrency = settings.base_currency || 'EUR'
  const { rate, loading: rateLoading, convert } = useCurrency(currency, baseCurrency)

  React.useEffect(() => {
    if (editing) {
      setType(editing.type)
      setAmount(String(editing.amount))
      setCurrency(editing.currency || baseCurrency)
      setCategory(editing.category)
      setDescription(editing.description || '')
      setDate(editing.date)
    } else {
      setType('expense')
      setAmount('')
      setCurrency(baseCurrency)
      setCategory('')
      setDescription('')
      setDate(new Date().toISOString().split('T')[0])
    }
  }, [editing, baseCurrency, isOpen])

  const categories = type === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES

  const amountBase = useMemo(() => {
    const val = Number(amount)
    if (Number.isNaN(val)) return null
    return convert(val)
  }, [amount, convert])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const val = Number(amount)
    if (!amount || Number.isNaN(val) || val <= 0) return alert('Inserisci un importo valido')
    if (!category) return alert('Seleziona una categoria')
    if (!date) return alert('Seleziona una data')

    setSaving(true)
    const payload = {
      amount: val,
      amount_base: amountBase ?? val,
      conversion_warning: rate ? 0 : 1,
      type,
      category,
      description,
      date,
      currency
    }
    try {
      if (editing) {
        await window.api.updateTransaction(editing.id, payload)
      } else {
        await window.api.addTransaction(payload)
      }
      onSaved()
      onClose()
    } catch (err) {
      alert('Errore salvataggio')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={editing ? 'Modifica transazione' : 'Aggiungi transazione'}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="flex gap-4">
          <label className="flex items-center gap-2">
            <input
              type="radio"
              value="income"
              checked={type === 'income'}
              onChange={() => setType('income')}
              className="h-4 w-4 text-primary-500"
            />
            Entrata
          </label>
          <label className="flex items-center gap-2">
            <input
              type="radio"
              value="expense"
              checked={type === 'expense'}
              onChange={() => setType('expense')}
              className="h-4 w-4 text-primary-500"
            />
            Uscita
          </label>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1 block text-xs font-medium">Importo</label>
            <Input
              type="number"
              step="0.01"
              min="0"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              required
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium">Valuta</label>
            <Select value={currency} onChange={(e) => setCurrency(e.target.value)}>
              {['EUR', 'USD', 'GBP', 'CHF', 'JPY', 'CAD', 'AUD'].map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </Select>
          </div>
        </div>

        {currency !== baseCurrency && (
          <div className={`rounded-lg p-3 text-sm ${rate && !rateLoading ? 'bg-gray-50 dark:bg-gray-700/50' : 'bg-warning/10 text-warning'}`}>
            {rateLoading ? (
              'Caricamento tasso...'
            ) : rate ? (
              <>
                Tasso: 1 {currency} = {rate} {baseCurrency}
                <br />
                Controvalore: {formatCurrency(amountBase ?? Number(amount) * (rate || 1), baseCurrency, settings.locale || 'it-IT')}
              </>
            ) : (
              <>
                <span className="flex items-center gap-1 font-medium">
                  <AlertTriangle className="h-4 w-4" /> Tasso di cambio non disponibile
                </span>
                <span className="text-xs">Salverò l’importo e lo ricalcolerò automaticamente appena torni online.</span>
              </>
            )}
          </div>
        )}

        <div>
          <label className="mb-1 block text-xs font-medium">Categoria</label>
          <Select value={category} onChange={(e) => setCategory(e.target.value)} required>
            <option value="">Seleziona...</option>
            {categories.map((c) => (
              <option key={c.name} value={c.name}>
                {c.name}
              </option>
            ))}
          </Select>
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium">Descrizione</label>
          <Input value={description} onChange={(e) => setDescription(e.target.value)} />
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium">Data</label>
          <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="ghost" onClick={onClose}>
            Annulla
          </Button>
          <Button type="submit" isLoading={saving}>
            Salva
          </Button>
        </div>
      </form>
    </Modal>
  )
}
