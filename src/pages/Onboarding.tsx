import React, { useEffect, useState } from 'react'
import { Wallet } from 'lucide-react'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { Input } from '../components/ui/Input'
import { Select } from '../components/ui/Select'
import { useSettings } from '../context/SettingsContext'

const CURRENCIES = ['EUR', 'USD', 'GBP', 'CHF', 'JPY', 'CAD', 'AUD']

export function Onboarding(): JSX.Element {
  const { completeOnboarding } = useSettings()
  const [name, setName] = useState('')
  const [currency, setCurrency] = useState('EUR')
  const [startingBalance, setStartingBalance] = useState('0')
  const [theme, setTheme] = useState<'light' | 'dark'>('light')
  const [locale, setLocale] = useState('it-IT')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    let cancelled = false
    window.api.getSystemLocale().then((systemLocale) => {
      if (!cancelled) setLocale(systemLocale)
    })
    return () => {
      cancelled = true
    }
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return alert('Inserisci il tuo nome')
    const balance = Number(startingBalance)
    if (Number.isNaN(balance)) return alert('Saldo iniziale non valido')
    setLoading(true)
    try {
      await completeOnboarding({
        username: name.trim(),
        base_currency: currency,
        starting_balance: String(balance),
        theme,
        locale
      })
    } catch {
      alert('Errore durante il salvataggio')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 p-4 dark:bg-gray-900">
      <Card className="w-full max-w-md">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-primary-500 text-white">
            <Wallet className="h-7 w-7" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Benvenuto</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Configura i tuoi dati base per iniziare a usare Finanza Personale.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium">Nome</label>
            <Input
              placeholder="Come ti chiami?"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              autoFocus
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">Valuta principale</label>
            <Select value={currency} onChange={(e) => setCurrency(e.target.value)}>
              {CURRENCIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </Select>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">Saldo iniziale</label>
            <Input
              type="number"
              step="0.01"
              value={startingBalance}
              onChange={(e) => setStartingBalance(e.target.value)}
              required
            />
            <p className="mt-1 text-xs text-gray-500">
              Il saldo del tuo conto al momento in cui inizi a usare l’app.
            </p>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">Tema</label>
            <div className="flex gap-4">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="radio"
                  value="light"
                  checked={theme === 'light'}
                  onChange={() => setTheme('light')}
                  className="h-4 w-4 text-primary-500"
                />
                Chiaro
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="radio"
                  value="dark"
                  checked={theme === 'dark'}
                  onChange={() => setTheme('dark')}
                  className="h-4 w-4 text-primary-500"
                />
                Scuro
              </label>
            </div>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">Locale</label>
            <Input value={locale} disabled className="bg-gray-50 dark:bg-gray-800" />
            <p className="mt-1 text-xs text-gray-500">Derivato automaticamente dal sistema.</p>
          </div>

          <Button type="submit" isLoading={loading} className="w-full">
            Inizia
          </Button>
        </form>
      </Card>
    </div>
  )
}
