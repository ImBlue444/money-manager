import React, { useEffect, useMemo, useState } from 'react'
import { Plus, Target, TrendingUp } from 'lucide-react'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { Input } from '../components/ui/Input'
import { Modal } from '../components/ui/Modal'
import { Spinner } from '../components/ui/Spinner'
import { useGoals } from '../hooks/useGoals'
import { useSettings } from '../context/SettingsContext'
import { formatCurrency } from '../lib/formatters'
import type { Goal } from '../types'

const ICONS = ['🎯', '✈️', '🚗', '🏠', '🎓', '💻', '🎁', '🏖️', '💍', '🐷', '⚕️', '🔧']

export function Goals(): JSX.Element {
  const { settings } = useSettings()
  const { data, loading, error, refetch } = useGoals()
  const [modalOpen, setModalOpen] = useState(false)
  const [fundingGoal, setFundingGoal] = useState<Goal | null>(null)

  const currency = settings.base_currency || 'EUR'
  const locale = settings.locale || 'it-IT'

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-2xl font-semibold">Obiettivi di risparmio</h2>
        <Button onClick={() => setModalOpen(true)} className="gap-2">
          <Plus className="h-4 w-4" /> Nuovo obiettivo
        </Button>
      </div>

      <ProjectionCard goals={data} currency={currency} locale={locale} />

      {loading ? (
        <div className="flex h-64 items-center justify-center">
          <Spinner />
        </div>
      ) : error ? (
        <div className="text-red-500">{error}</div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {data.map((goal) => (
            <GoalCard
              key={goal.id}
              goal={goal}
              currency={currency}
              locale={locale}
              onFund={() => setFundingGoal(goal)}
              onChanged={refetch}
            />
          ))}
          {data.length === 0 && (
            <div className="col-span-full py-12 text-center text-gray-500">
              Nessun obiettivo. Inizia a risparmiare!
            </div>
          )}
        </div>
      )}

      <GoalModal isOpen={modalOpen} onClose={() => setModalOpen(false)} onSaved={refetch} />
      <FundModal
        isOpen={!!fundingGoal}
        onClose={() => setFundingGoal(null)}
        goal={fundingGoal}
        onSaved={refetch}
      />
    </div>
  )
}

function ProjectionCard({
  goals,
  currency,
  locale
}: {
  goals: Goal[]
  currency: string
  locale: string
}): JSX.Element {
  const [monthlySaving, setMonthlySaving] = useState('500')
  const remaining = useMemo(
    () => goals.reduce((sum, g) => sum + Math.max(0, g.target_amount - g.current_amount), 0),
    [goals]
  )
  const saving = Number(monthlySaving) || 0
  const months = saving > 0 ? Math.ceil(remaining / saving) : 0
  const projectedDate = months > 0 ? new Date(Date.now() + months * 30 * 24 * 60 * 60 * 1000) : null

  return (
    <Card>
      <div className="flex items-center gap-3">
        <TrendingUp className="h-6 w-6 text-primary-500" />
        <h3 className="text-base font-semibold">Proiezione</h3>
      </div>
      <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="flex-1">
          <label className="text-xs text-gray-500">Risparmio mensile medio</label>
          <Input
            type="number"
            min="0"
            value={monthlySaving}
            onChange={(e) => setMonthlySaving(e.target.value)}
          />
        </div>
        <div className="flex-1">
          <p className="text-xs text-gray-500">Totale da raggiungere</p>
          <p className="text-lg font-bold">{formatCurrency(remaining, currency, locale)}</p>
        </div>
        <div className="flex-1">
          <p className="text-xs text-gray-500">Data stimata completamento</p>
          <p className="text-lg font-bold">
            {projectedDate ? projectedDate.toLocaleDateString(locale, { month: 'long', year: 'numeric' }) : '-'}
          </p>
        </div>
      </div>
    </Card>
  )
}

function GoalCard({
  goal,
  currency,
  locale,
  onFund,
  onChanged
}: {
  goal: Goal
  currency: string
  locale: string
  onFund: () => void
  onChanged: () => void
}): JSX.Element {
  const percentage = Math.min(100, Math.round((goal.current_amount / goal.target_amount) * 100))
  const completed = goal.current_amount >= goal.target_amount

  const handleDelete = async () => {
    if (!confirm('Eliminare questo obiettivo?')) return
    await window.api.deleteGoal(goal.id)
    onChanged()
  }

  return (
    <Card className="relative">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div
            className="flex h-12 w-12 items-center justify-center rounded-full text-2xl text-white"
            style={{ backgroundColor: goal.color }}
          >
            {goal.icon}
          </div>
          <div>
            <p className="font-medium">{goal.name}</p>
            {goal.target_date && (
              <p className="text-xs text-gray-500">Entro {new Date(goal.target_date).toLocaleDateString(locale)}</p>
            )}
          </div>
        </div>
        {completed && (
          <span className="rounded-full bg-income/10 px-2 py-1 text-xs font-medium text-income">
            Completato!
          </span>
        )}
      </div>

      <div className="mx-auto my-6 h-32 w-32">
        <CircularProgress percentage={percentage} color={goal.color} />
      </div>

      <div className="text-center">
        <p className="text-sm text-gray-500">
          {formatCurrency(goal.current_amount, currency, locale)} di{' '}
          {formatCurrency(goal.target_amount, currency, locale)}
        </p>
        <p className="text-2xl font-bold">{percentage}%</p>
      </div>

      <div className="mt-4 flex gap-2">
        <Button variant="secondary" size="sm" className="flex-1" onClick={onFund}>
          Aggiungi fondi
        </Button>
        <Button variant="ghost" size="sm" onClick={handleDelete}>
          Elimina
        </Button>
      </div>
    </Card>
  )
}

function CircularProgress({ percentage, color }: { percentage: number; color: string }): JSX.Element {
  const radius = 50
  const stroke = 8
  const normalized = radius - stroke / 2
  const circumference = normalized * 2 * Math.PI
  const offset = circumference - (percentage / 100) * circumference
  return (
    <svg className="h-full w-full -rotate-90" viewBox="0 0 100 100">
      <circle cx="50" cy="50" r={normalized} stroke="currentColor" strokeWidth={stroke} className="text-gray-100 dark:text-gray-700" fill="none" />
      <circle
        cx="50"
        cy="50"
        r={normalized}
        stroke={color}
        strokeWidth={stroke}
        fill="none"
        strokeLinecap="round"
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        className="transition-all"
      />
    </svg>
  )
}

function GoalModal({
  isOpen,
  onClose,
  onSaved
}: {
  isOpen: boolean
  onClose: () => void
  onSaved: () => void
}): JSX.Element {
  const { settings } = useSettings()
  const [name, setName] = useState('')
  const [target, setTarget] = useState('')
  const [current, setCurrent] = useState('0')
  const [targetDate, setTargetDate] = useState('')
  const [color, setColor] = useState('#10b981')
  const [icon, setIcon] = useState('🎯')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (isOpen) {
      setName('')
      setTarget('')
      setCurrent('0')
      setTargetDate('')
      setColor('#10b981')
      setIcon('🎯')
    }
  }, [isOpen])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const t = Number(target)
    const c = Number(current)
    if (!name || !target || Number.isNaN(t) || t <= 0) return alert('Dati non validi')
    setSaving(true)
    try {
      await window.api.addGoal({
        name,
        target_amount: t,
        current_amount: Number.isNaN(c) ? 0 : c,
        target_date: targetDate || null,
        color,
        icon,
        notes: ''
      })
      onSaved()
      onClose()
    } catch {
      alert('Errore salvataggio')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Nuovo obiettivo">
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input placeholder="Nome obiettivo" value={name} onChange={(e) => setName(e.target.value)} required />
        <Input type="number" step="0.01" min="0" placeholder="Importo target" value={target} onChange={(e) => setTarget(e.target.value)} required />
        <Input type="number" step="0.01" min="0" placeholder="Già risparmiato" value={current} onChange={(e) => setCurrent(e.target.value)} />
        <Input type="date" placeholder="Data obiettivo (opzionale)" value={targetDate} onChange={(e) => setTargetDate(e.target.value)} />
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1 block text-xs font-medium">Colore</label>
            <input type="color" value={color} onChange={(e) => setColor(e.target.value)} className="h-10 w-full rounded-lg border border-gray-300 dark:border-gray-600" />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium">Icona</label>
            <select value={icon} onChange={(e) => setIcon(e.target.value)} className="h-10 w-full rounded-lg border border-gray-300 bg-white px-2 dark:border-gray-600 dark:bg-gray-800">
              {ICONS.map((i) => (
                <option key={i} value={i}>{i}</option>
              ))}
            </select>
          </div>
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="ghost" onClick={onClose}>Annulla</Button>
          <Button type="submit" isLoading={saving}>Salva</Button>
        </div>
      </form>
    </Modal>
  )
}

function FundModal({
  isOpen,
  onClose,
  goal,
  onSaved
}: {
  isOpen: boolean
  onClose: () => void
  goal: Goal | null
  onSaved: () => void
}): JSX.Element {
  const [amount, setAmount] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (isOpen) setAmount('')
  }, [isOpen])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!goal) return
    const val = Number(amount)
    if (!amount || Number.isNaN(val) || val <= 0) return alert('Importo non valido')
    setSaving(true)
    try {
      await window.api.updateGoal(goal.id, { current_amount: goal.current_amount + val })
      onSaved()
      onClose()
    } catch {
      alert('Errore')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={goal ? `Aggiungi fondi a ${goal.name}` : 'Aggiungi fondi'}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input type="number" step="0.01" min="0" placeholder="Importo" value={amount} onChange={(e) => setAmount(e.target.value)} required />
        <div className="flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={onClose}>Annulla</Button>
          <Button type="submit" isLoading={saving}>Aggiungi</Button>
        </div>
      </form>
    </Modal>
  )
}
