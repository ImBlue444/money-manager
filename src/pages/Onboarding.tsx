import React, { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { Input } from '../components/ui/Input'
import { Select } from '../components/ui/Select'
import { BrandLogo } from '../components/ui/BrandLogo'
import { AnimatedBackground } from '../components/ui/AnimatedBackground'
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
    <div className="relative flex min-h-screen items-center justify-center p-4">
      <AnimatedBackground />
      <motion.div
        initial={{ y: 30, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
        className="w-full max-w-md"
      >
        <Card>
          <div className="mb-6 text-center">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
              className="mx-auto mb-3 flex h-14 w-14 items-center justify-center"
            >
              <BrandLogo className="h-14 w-14" />
            </motion.div>
            <h1 className="font-display text-3xl font-bold tracking-tight text-gray-900 dark:text-gray-100">
              MoneyLove
            </h1>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Configura i tuoi dati base per iniziare.
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
              <Input value={locale} disabled className="bg-gray-50/70 dark:bg-white/5" />
              <p className="mt-1 text-xs text-gray-500">Derivato automaticamente dal sistema.</p>
            </div>

            <Button type="submit" isLoading={loading} className="w-full">
              Inizia
            </Button>
          </form>
        </Card>
      </motion.div>
    </div>
  )
}
