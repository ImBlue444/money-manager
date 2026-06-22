import React, { useEffect, useState } from 'react'
import { Save, Download, Upload, Trash2 } from 'lucide-react'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { Input } from '../components/ui/Input'
import { Select } from '../components/ui/Select'
import { useSettings } from '../context/SettingsContext'

const CURRENCIES = ['EUR', 'USD', 'GBP', 'CHF', 'JPY', 'CAD', 'AUD']
const LOCALES = ['it-IT', 'en-US', 'en-GB', 'de-DE', 'fr-FR', 'es-ES']

export function Settings(): JSX.Element {
  const { settings, updateSetting, refresh } = useSettings()
  const [username, setUsername] = useState(settings.username || '')
  const [currency, setCurrency] = useState(settings.base_currency || 'EUR')
  const [locale, setLocale] = useState(settings.locale || 'it-IT')
  const [startingBalance, setStartingBalance] = useState(settings.starting_balance || '0')
  const [theme, setTheme] = useState<'light' | 'dark'>(settings.theme || 'light')

  useEffect(() => {
    setUsername(settings.username || '')
    setCurrency(settings.base_currency || 'EUR')
    setLocale(settings.locale || 'it-IT')
    setStartingBalance(settings.starting_balance || '0')
    setTheme(settings.theme || 'light')
  }, [settings])

  const handleSave = async () => {
    await Promise.all([
      updateSetting('username', username),
      updateSetting('base_currency', currency),
      updateSetting('locale', locale),
      updateSetting('starting_balance', startingBalance),
      updateSetting('theme', theme)
    ])
    alert('Impostazioni salvate')
  }

  const handleExport = async () => {
    await window.api.saveBackup()
  }

  const handleImport = async () => {
    if (!confirm('Il backup corrente verrà sovrascritto. Continuare?')) return
    await window.api.loadBackup()
    await refresh()
    alert('Backup importato')
  }

  const handleReset = async () => {
    if (!confirm('Sei sicuro? Tutti i dati verranno eliminati.')) return
    if (!confirm('Conferma definitiva: eliminare TUTTI i dati?')) return
    await window.api.resetData()
    await refresh()
    alert('Dati resettati')
  }

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-semibold">Impostazioni</h2>

      <Card>
        <h3 className="mb-4 text-base font-semibold">Profilo finanziario</h3>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-xs font-medium">Nome utente</label>
            <Input value={username} onChange={(e) => setUsername(e.target.value)} />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium">Valuta principale</label>
            <Select value={currency} onChange={(e) => setCurrency(e.target.value)}>
              {CURRENCIES.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </Select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium">Locale</label>
            <Select value={locale} onChange={(e) => setLocale(e.target.value)}>
              {LOCALES.map((l) => (
                <option key={l} value={l}>{l}</option>
              ))}
            </Select>
          </div>
        </div>
      </Card>

      <Card>
        <h3 className="mb-4 text-base font-semibold">Saldo iniziale</h3>
        <p className="mb-3 text-sm text-gray-500">
          Inserisci il tuo saldo al momento in cui hai iniziato a usare questa app.
        </p>
        <Input
          type="number"
          step="0.01"
          value={startingBalance}
          onChange={(e) => setStartingBalance(e.target.value)}
        />
      </Card>

      <Card>
        <h3 className="mb-4 text-base font-semibold">Tema</h3>
        <div className="flex gap-4">
          <label className="flex items-center gap-2">
            <input
              type="radio"
              value="light"
              checked={theme === 'light'}
              onChange={() => setTheme('light')}
              className="h-4 w-4 text-primary-500"
            />
            Chiaro
          </label>
          <label className="flex items-center gap-2">
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
      </Card>

      <Card>
        <h3 className="mb-4 text-base font-semibold">Dati</h3>
        <div className="flex flex-wrap gap-3">
          <Button variant="secondary" onClick={handleExport} className="gap-2">
            <Download className="h-4 w-4" /> Esporta backup (JSON)
          </Button>
          <Button variant="secondary" onClick={handleImport} className="gap-2">
            <Upload className="h-4 w-4" /> Importa backup (JSON)
          </Button>
          <Button variant="danger" onClick={handleReset} className="gap-2">
            <Trash2 className="h-4 w-4" /> Reset completo
          </Button>
        </div>
      </Card>

      <div className="flex justify-end">
        <Button onClick={handleSave} className="gap-2">
          <Save className="h-4 w-4" /> Salva impostazioni
        </Button>
      </div>
    </div>
  )
}
