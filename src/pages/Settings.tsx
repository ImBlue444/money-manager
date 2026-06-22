import React, { useEffect, useMemo, useState } from 'react'
import { Save, Download, Upload, Trash2, Sparkles, Eye, EyeOff, AlertTriangle } from 'lucide-react'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { Input } from '../components/ui/Input'
import { Select } from '../components/ui/Select'
import { useSettings } from '../context/SettingsContext'
import { AI_PROVIDERS, getDefaultModel } from '../lib/aiProviders'
import type { AiProvider } from '../types'

const CURRENCIES = ['EUR', 'USD', 'GBP', 'CHF', 'JPY', 'CAD', 'AUD']
const LOCALES = ['it-IT', 'en-US', 'en-GB', 'de-DE', 'fr-FR', 'es-ES']
const CUSTOM_MODEL_VALUE = 'custom'

const PROVIDER_OPTIONS = Object.entries(AI_PROVIDERS).map(([value, config]) => ({
  value: value as AiProvider,
  label: config.label
}))

export function Settings(): JSX.Element {
  const { settings, updateSetting, refresh } = useSettings()
  const [username, setUsername] = useState(settings.username || '')
  const [currency, setCurrency] = useState(settings.base_currency || 'EUR')
  const [locale, setLocale] = useState(settings.locale || 'it-IT')
  const [startingBalance, setStartingBalance] = useState(settings.starting_balance || '0')
  const [theme, setTheme] = useState<'light' | 'dark'>(settings.theme || 'light')

  const [aiProvider, setAiProvider] = useState<AiProvider>(
    (settings.ai_provider as AiProvider) || 'openai'
  )
  const [aiModel, setAiModel] = useState(settings.ai_model || getDefaultModel(aiProvider))
  const [isCustomModel, setIsCustomModel] = useState(false)
  const [customModel, setCustomModel] = useState('')
  const [aiApiKey, setAiApiKey] = useState('')
  const [showKey, setShowKey] = useState(false)
  const [aiAutoInsight, setAiAutoInsight] = useState(settings.ai_auto_insight === 'true')

  const providerModels = useMemo(() => AI_PROVIDERS[aiProvider].models, [aiProvider])

  useEffect(() => {
    setUsername(settings.username || '')
    setCurrency(settings.base_currency || 'EUR')
    setLocale(settings.locale || 'it-IT')
    setStartingBalance(settings.starting_balance || '0')
    setTheme(settings.theme || 'light')
    const nextProvider = (settings.ai_provider as AiProvider) || 'openai'
    setAiProvider(nextProvider)
    const savedModel = settings.ai_model || getDefaultModel(nextProvider)
    setAiModel(savedModel)
    const isKnown = AI_PROVIDERS[nextProvider].models.some((m) => m.id === savedModel)
    setIsCustomModel(!isKnown)
    setCustomModel(isKnown ? '' : savedModel)
    setAiAutoInsight(settings.ai_auto_insight === 'true')
  }, [settings])

  useEffect(() => {
    let cancelled = false
    window.api.getAiApiKey(aiProvider).then((key) => {
      if (!cancelled) setAiApiKey(key)
    })
    return () => {
      cancelled = true
    }
  }, [aiProvider])

  const handleProviderChange = (next: AiProvider) => {
    setAiProvider(next)
    const defaultModel = getDefaultModel(next)
    setAiModel(defaultModel)
    setIsCustomModel(false)
    setCustomModel('')
  }

  const handleModelChange = (value: string) => {
    if (value === CUSTOM_MODEL_VALUE) {
      setIsCustomModel(true)
      setCustomModel('')
    } else {
      setIsCustomModel(false)
      setCustomModel('')
      setAiModel(value)
    }
  }

  const effectiveModel = useMemo(() => {
    if (isCustomModel && customModel.trim()) return customModel.trim()
    return aiModel
  }, [isCustomModel, customModel, aiModel])

  const selectedTierLabel = useMemo(() => {
    if (isCustomModel) return 'Modello personalizzato — il consumo dipende dal modello scelto'
    const found = providerModels.find((m) => m.id === aiModel)
    if (!found) return ''
    return found.tier === 'economy'
      ? 'Economy — basso consumo di token'
      : 'Performance — qualità superiore, maggiore consumo di token'
  }, [aiModel, isCustomModel, providerModels])

  const handleSave = async () => {
    if (isCustomModel && !customModel.trim()) {
      alert('Inserisci un ID modello personalizzato prima di salvare.')
      return
    }
    const modelToSave = effectiveModel
    await Promise.all([
      updateSetting('username', username),
      updateSetting('base_currency', currency),
      updateSetting('locale', locale),
      updateSetting('starting_balance', startingBalance),
      updateSetting('theme', theme),
      updateSetting('ai_provider', aiProvider),
      updateSetting('ai_model', modelToSave),
      updateSetting('ai_auto_insight', String(aiAutoInsight)),
      window.api.saveAiApiKey(aiProvider, aiApiKey)
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
      <h2 className="font-display text-2xl font-semibold tracking-tight">Impostazioni</h2>

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
        <div className="mb-4 flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary-500" />
          <h3 className="text-base font-semibold">LoveAI</h3>
        </div>
        <div className="space-y-4">
          <div className="rounded-2xl border border-warning/30 bg-warning/10 p-4 text-sm text-warning">
            <div className="flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              <p>
                La tua chiave API viene cifrata localmente. I dati finanziari aggregati verranno
                inviati al provider scelto solo quando usi LoveAI.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-medium">Provider</label>
              <Select value={aiProvider} onChange={(e) => handleProviderChange(e.target.value as AiProvider)}>
                {PROVIDER_OPTIONS.map((p) => (
                  <option key={p.value} value={p.value}>{p.label}</option>
                ))}
              </Select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium">Modello</label>
              {isCustomModel ? (
                <Input
                  value={customModel}
                  onChange={(e) => setCustomModel(e.target.value)}
                  placeholder="Inserisci ID modello personalizzato"
                />
              ) : (
                <Select value={aiModel} onChange={(e) => handleModelChange(e.target.value)}>
                  {providerModels.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.label} ({m.tier === 'economy' ? 'Economy' : 'Performance'})
                    </option>
                  ))}
                  <option value={CUSTOM_MODEL_VALUE}>Modello personalizzato...</option>
                </Select>
              )}
              {selectedTierLabel && (
                <p className="mt-1 text-xs text-gray-500">{selectedTierLabel}</p>
              )}
            </div>
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium">
              API Key — {AI_PROVIDERS[aiProvider].label}
            </label>
            <div className="relative">
              <Input
                type={showKey ? 'text' : 'password'}
                value={aiApiKey}
                onChange={(e) => setAiApiKey(e.target.value)}
                placeholder={
                  aiProvider === 'openai'
                    ? 'sk-...'
                    : aiProvider === 'anthropic'
                    ? 'sk-ant-...'
                    : 'AIza...'
                }
                className="pr-10"
              />
              <button
                type="button"
                onClick={() => setShowKey((s) => !s)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <label className="flex items-start gap-3 rounded-2xl border border-primary-200 bg-primary-50/50 p-3 dark:border-primary-500/30 dark:bg-primary-500/10">
            <input
              type="checkbox"
              checked={aiAutoInsight}
              onChange={(e) => setAiAutoInsight(e.target.checked)}
              className="mt-0.5 h-4 w-4 text-primary-500"
            />
            <div>
              <p className="text-sm font-medium">Insight automatico in Dashboard</p>
              <p className="text-xs text-gray-500">
                Genera automaticamente un consiglio AI all’avvio. Consuma più token e richiede una
                chiave API valida.
              </p>
            </div>
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
