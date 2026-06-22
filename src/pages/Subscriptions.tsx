import React, { useMemo, useState } from 'react'
import { Plus, Pencil, Trash2, Calendar, AlertTriangle } from 'lucide-react'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { Input } from '../components/ui/Input'
import { Select } from '../components/ui/Select'
import { Modal } from '../components/ui/Modal'
import { ColorPicker } from '../components/ui/ColorPicker'
import { Spinner } from '../components/ui/Spinner'
import { Switch } from '../components/ui/Switch'
import { Badge } from '../components/ui/Badge'
import { CategoryIcon } from '../components/ui/CategoryIcon'
import { useSubscriptions } from '../hooks/useSubscriptions'
import { useCurrency } from '../hooks/useCurrency'
import { useSettings } from '../context/SettingsContext'
import { EXPENSE_CATEGORIES, getCategory } from '../lib/categories'
import { formatConverted, formatCurrency, formatDate } from '../lib/formatters'
import type { BillingCycle, EnrichedSubscription, Subscription } from '../types'
import { parseISO, startOfDay, isBefore, addWeeks, addMonths, addQuarters, addYears, format } from 'date-fns'

export function Subscriptions(): JSX.Element {
  const { settings } = useSettings()
  const { data, loading, error, refetch } = useSubscriptions()
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<Subscription | null>(null)

  const currency = settings.base_currency || 'EUR'
  const locale = settings.locale || 'it-IT'

  const summary = useMemo(() => {
    let monthly = 0
    let yearly = 0
    let saved = 0
    for (const s of data) {
      if (s.is_active) {
        monthly += s.monthly_base
        yearly += s.yearly_base
      } else {
        saved += s.monthly_base
      }
    }
    return { monthly, yearly, saved }
  }, [data])

  const upcoming = useMemo(() => {
    const today = startOfDay(new Date())
    return data.filter((s) => {
      if (!s.is_active) return false
      const next = parseISO(s.next_billing_date)
      const diff = (next.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
      return diff >= 0 && diff <= 3
    })
  }, [data])

  const handleEdit = (sub: Subscription) => {
    setEditing(sub)
    setModalOpen(true)
  }

  const handleDelete = async (id: number) => {
    if (!confirm('Eliminare questo abbonamento?')) return
    await window.api.deleteSubscription(id)
    refetch()
  }

  const handleToggle = async (id: number, isActive: boolean) => {
    await window.api.updateSubscription(id, { is_active: isActive ? 1 : 0 })
    refetch()
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-2xl font-semibold">Abbonamenti</h2>
        <Button onClick={() => { setEditing(null); setModalOpen(true) }} className="gap-2">
          <Plus className="h-4 w-4" /> Aggiungi abbonamento
        </Button>
      </div>

      {upcoming.length > 0 && (
        <div className="flex items-start gap-3 rounded-lg border border-warning/30 bg-warning/10 p-4 text-warning">
          <AlertTriangle className="h-5 w-5 shrink-0" />
          <div>
            <p className="font-medium">Rinnovi in arrivo</p>
            <ul className="mt-1 text-sm">
              {upcoming.map((s) => (
                <li key={s.id}>
                  {s.name} — {formatDate(s.next_billing_date, locale)}
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <SummaryCard label="Costo mensile" value={formatCurrency(summary.monthly, currency, locale)} />
        <SummaryCard label="Costo annuale" value={formatCurrency(summary.yearly, currency, locale)} />
        <SummaryCard label="Risparmio potenziale" value={formatCurrency(summary.saved, currency, locale)} />
      </div>

      {loading ? (
        <div className="flex h-64 items-center justify-center">
          <Spinner />
        </div>
      ) : error ? (
        <div className="text-red-500">{error}</div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {data.map((sub) => (
            <SubscriptionCard
              key={sub.id}
              sub={sub}
              currency={currency}
              locale={locale}
              onEdit={handleEdit}
              onDelete={handleDelete}
              onToggle={handleToggle}
            />
          ))}
          {data.length === 0 && (
            <div className="col-span-full py-12 text-center text-gray-500">
              Nessun abbonamento. Aggiungi il primo!
            </div>
          )}
        </div>
      )}

      <SubscriptionModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        editing={editing}
        onSaved={refetch}
      />
    </div>
  )
}

function SummaryCard({ label, value }: { label: string; value: string }): JSX.Element {
  return (
    <Card>
      <p className="text-sm text-gray-500 dark:text-gray-400">{label}</p>
      <p className="mt-1 text-xl font-bold">{value}</p>
    </Card>
  )
}

function SubscriptionCard({
  sub,
  currency,
  locale,
  onEdit,
  onDelete,
  onToggle
}: {
  sub: EnrichedSubscription
  currency: string
  locale: string
  onEdit: (s: Subscription) => void
  onDelete: (id: number) => void
  onToggle: (id: number, isActive: boolean) => void
}): JSX.Element {
  const cat = getCategory(sub.category)
  return (
    <Card className={`group relative transition-opacity ${sub.is_active ? '' : 'opacity-75'}`}>
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div
            className="flex h-10 w-10 items-center justify-center rounded-lg text-white"
            style={{ backgroundColor: sub.color }}
          >
            <CategoryIcon name={sub.icon} className="h-5 w-5" />
          </div>
          <div>
            <p className="font-medium">{sub.name}</p>
            <p className="text-xs text-gray-500">
              {formatConverted(sub.amount_base ?? sub.amount, currency, sub.amount, sub.currency, locale)} / {sub.billing_cycle}
            </p>
          </div>
        </div>
        <div className="flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
          <button
            onClick={() => onEdit(sub)}
            className="rounded-md p-1 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700"
          >
            <Pencil className="h-4 w-4" />
          </button>
          <button
            onClick={() => onDelete(sub.id)}
            className="rounded-md p-1 text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>
      <div className="mt-4 flex items-center justify-between">
        <Badge color={cat?.color} className="gap-1">
          {cat && <CategoryIcon name={cat.icon} className="h-3 w-3" />}
          {sub.category}
        </Badge>
        <Switch
          checked={sub.is_active === 1}
          onChange={(checked) => onToggle(sub.id, checked)}
          label={sub.is_active ? 'Attivo' : 'Sospeso'}
        />
      </div>
      <div className="mt-3 flex items-center gap-2 text-xs text-gray-500">
        <Calendar className="h-3.5 w-3.5" />
        Prossimo: {formatDate(sub.next_billing_date, locale)}
      </div>
      <div className="mt-1 text-xs text-gray-400">
        ~{formatCurrency(sub.monthly_base, currency, locale)} / mese
        {sub.conversion_warning === 1 && (
          <span
            title="Tasso di cambio non disponibile; verrà ricalcolato appena online"
            className="ml-1 inline-flex items-center text-warning"
          >
            <AlertTriangle className="inline h-3 w-3" />
          </span>
        )}
      </div>
    </Card>
  )
}

function toMonthly(amount: number, cycle: BillingCycle): number {
  switch (cycle) {
    case 'weekly':
      return amount * 4
    case 'monthly':
      return amount
    case 'quarterly':
      return amount / 3
    case 'yearly':
      return amount / 12
  }
}

function toYearly(amount: number, cycle: BillingCycle): number {
  switch (cycle) {
    case 'weekly':
      return amount * 52
    case 'monthly':
      return amount * 12
    case 'quarterly':
      return amount * 4
    case 'yearly':
      return amount
  }
}

interface SubscriptionModalProps {
  isOpen: boolean
  onClose: () => void
  editing: Subscription | null
  onSaved: () => void
}

function SubscriptionModal({ isOpen, onClose, editing, onSaved }: SubscriptionModalProps): JSX.Element {
  const { settings } = useSettings()
  const [name, setName] = useState('')
  const [amount, setAmount] = useState('')
  const [currency, setCurrency] = useState(settings.base_currency || 'EUR')
  const [cycle, setCycle] = useState<BillingCycle>('monthly')
  const [category, setCategory] = useState('')
  const [nextDate, setNextDate] = useState(new Date().toISOString().split('T')[0])
  const [color, setColor] = useState('#6366f1')
  const [isActive, setIsActive] = useState(1)
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)

  const baseCurrency = settings.base_currency || 'EUR'
  const { rate, loading: rateLoading, convert } = useCurrency(currency, baseCurrency)

  React.useEffect(() => {
    if (editing) {
      setName(editing.name)
      setAmount(String(editing.amount))
      setCurrency(editing.currency || baseCurrency)
      setCycle(editing.billing_cycle)
      setCategory(editing.category)
      setNextDate(editing.next_billing_date)
      setColor(editing.color || '#6366f1')
      setIsActive(editing.is_active)
      setNotes(editing.notes || '')
    } else {
      setName('')
      setAmount('')
      setCurrency(baseCurrency)
      setCycle('monthly')
      setCategory('')
      setNextDate(new Date().toISOString().split('T')[0])
      setColor('#6366f1')
      setIsActive(1)
      setNotes('')
    }
  }, [editing, isOpen, baseCurrency])

  const monthlyPreview = useMemo(() => {
    const val = Number(amount)
    if (Number.isNaN(val)) return 0
    return toMonthly(val, cycle)
  }, [amount, cycle])

  const amountBase = useMemo(() => {
    const val = Number(amount)
    if (Number.isNaN(val)) return null
    return convert(val)
  }, [amount, convert])

  const monthlyBasePreview = useMemo(() => {
    const base = amountBase ?? Number(amount)
    return toMonthly(base, cycle)
  }, [amountBase, amount, cycle])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const val = Number(amount)
    if (!name || !amount || Number.isNaN(val) || val <= 0) return alert('Dati non validi')
    if (!category || !nextDate) return alert('Compila tutti i campi')
    setSaving(true)
    const payload = {
      name,
      amount: val,
      amount_base: amountBase ?? val,
      conversion_warning: rate ? 0 : 1,
      currency,
      billing_cycle: cycle,
      category,
      next_billing_date: nextDate,
      color,
      icon: 'credit-card',
      is_active: isActive,
      notes
    }
    try {
      if (editing) {
        await window.api.updateSubscription(editing.id, payload)
      } else {
        await window.api.addSubscription(payload)
      }
      onSaved()
      onClose()
    } catch {
      alert('Errore salvataggio')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={editing ? 'Modifica abbonamento' : 'Aggiungi abbonamento'}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="mb-1 block text-xs font-medium">Nome</label>
          <Input value={name} onChange={(e) => setName(e.target.value)} required />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1 block text-xs font-medium">Importo</label>
            <Input type="number" step="0.01" min="0" value={amount} onChange={(e) => setAmount(e.target.value)} required />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium">Valuta</label>
            <Select value={currency} onChange={(e) => setCurrency(e.target.value)}>
              {['EUR', 'USD', 'GBP', 'CHF'].map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </Select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1 block text-xs font-medium">Ciclo</label>
            <Select value={cycle} onChange={(e) => setCycle(e.target.value as BillingCycle)}>
              <option value="weekly">Settimanale</option>
              <option value="monthly">Mensile</option>
              <option value="quarterly">Trimestrale</option>
              <option value="yearly">Annuale</option>
            </Select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium">Prossimo rinnovo</label>
            <Input type="date" value={nextDate} onChange={(e) => setNextDate(e.target.value)} required />
          </div>
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium">Categoria</label>
          <Select value={category} onChange={(e) => setCategory(e.target.value)} required>
            <option value="">Seleziona...</option>
            {EXPENSE_CATEGORIES.map((c) => (
              <option key={c.name} value={c.name}>{c.name}</option>
            ))}
          </Select>
        </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <ColorPicker label="Colore" value={color} onChange={setColor} />
            <div>
              <label className="mb-1 block text-xs font-medium">Stato</label>
              <Select value={isActive} onChange={(e) => setIsActive(Number(e.target.value))}>
                <option value={1}>Attivo</option>
                <option value={0}>Sospeso</option>
              </Select>
            </div>
          </div>

        <div className={`rounded-lg p-3 text-sm ${rate || currency === baseCurrency ? 'bg-gray-50 dark:bg-gray-700/50' : 'bg-warning/10 text-warning'}`}>
          {rateLoading ? (
            'Caricamento tasso...'
          ) : currency === baseCurrency || rate ? (
            <>
              Costo mensile equivalente:{' '}
              <strong>{formatCurrency(monthlyBasePreview, baseCurrency, settings.locale || 'it-IT')}</strong>
              {currency !== baseCurrency && rate && (
                <span className="block text-xs text-gray-500">
                  1 {currency} = {rate} {baseCurrency}
                </span>
              )}
            </>
          ) : (
            <>
              <span className="flex items-center gap-1 font-medium">
                <AlertTriangle className="h-4 w-4" /> Tasso di cambio non disponibile
              </span>
              <span className="text-xs">Salverò l’abbonamento e lo ricalcolerò automaticamente appena torni online.</span>
            </>
          )}
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium">Note</label>
          <Input value={notes} onChange={(e) => setNotes(e.target.value)} />
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="ghost" onClick={onClose}>Annulla</Button>
          <Button type="submit" isLoading={saving}>Salva</Button>
        </div>
      </form>
    </Modal>
  )
}
