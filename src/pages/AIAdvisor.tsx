import React, { useEffect, useRef, useState } from 'react'
import { Send, Sparkles, AlertTriangle, Bot, User } from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import { motion, AnimatePresence } from 'framer-motion'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { Select } from '../components/ui/Select'
import { Input } from '../components/ui/Input'
import { BrandLogo } from '../components/ui/BrandLogo'
import { useSettings } from '../context/SettingsContext'
import { AI_PROVIDERS } from '../lib/aiProviders'
import type { AiMessage, AiPeriod, AiProvider } from '../types'

const PERIODS: { value: AiPeriod; label: string }[] = [
  { value: 'current_month', label: 'Mese corrente' },
  { value: 'last_month', label: 'Mese scorso' },
  { value: 'last_3_months', label: 'Ultimi 3 mesi' },
  { value: 'last_6_months', label: 'Ultimi 6 mesi' },
  { value: 'last_12_months', label: 'Ultimi 12 mesi' },
  { value: 'all', label: 'Tutto' }
]

const PROMPTS = [
  'Come sto andando questo mese?',
  'Dove posso risparmiare?',
  'Quanto spendo in abbonamenti?',
  'Dammi un piano per i miei obiettivi'
]

export function AIAdvisor(): JSX.Element {
  const { settings } = useSettings()
  const [messages, setMessages] = useState<AiMessage[]>([])
  const [input, setInput] = useState('')
  const [period, setPeriod] = useState<AiPeriod>('last_month')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [apiKeySet, setApiKeySet] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  const provider = (settings.ai_provider as AiProvider) || 'openai'

  useEffect(() => {
    let cancelled = false
    window.api.getAiApiKey(provider).then((key) => {
      if (!cancelled) setApiKeySet(!!key)
    })
    return () => {
      cancelled = true
    }
  }, [provider])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  useEffect(() => {
    const unsubscribeChunk = window.api.onAiChunk((chunk) => {
      setMessages((prev) => {
        const last = prev[prev.length - 1]
        if (last && last.role === 'assistant') {
          return [...prev.slice(0, -1), { ...last, content: last.content + chunk }]
        }
        return [...prev, { role: 'assistant', content: chunk }]
      })
    })
    const unsubscribeDone = window.api.onAiDone(() => {
      setLoading(false)
    })
    const unsubscribeError = window.api.onAiError((err) => {
      setError(err)
      setLoading(false)
    })
    return () => {
      unsubscribeChunk()
      unsubscribeDone()
      unsubscribeError()
    }
  }, [])

  const handleSend = async (text: string) => {
    if (!text.trim() || loading) return
    if (!apiKeySet) {
      setError('Configura la chiave API nelle Impostazioni per usare LoveAI.')
      return
    }
    setError(null)
    const userMessage: AiMessage = { role: 'user', content: text }
    const history = [...messages]
    setMessages((prev) => [...prev, userMessage])
    setInput('')
    setLoading(true)
    try {
      await window.api.sendAiMessage(text, history, period)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Errore di rete')
      setLoading(false)
    }
  }

  return (
    <div className="flex h-[calc(100vh-7rem)] flex-col">
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="font-display text-2xl font-semibold tracking-tight text-gray-900 dark:text-gray-100">LoveAI</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Chatta con le tue finanze. LoveAI difende i tuoi interessi economici.
          </p>
        </div>
        <Select
          value={period}
          onChange={(e) => setPeriod(e.target.value as AiPeriod)}
          className="w-full sm:w-44"
        >
          {PERIODS.map((p) => (
            <option key={p.value} value={p.value}>
              {p.label}
            </option>
          ))}
        </Select>
      </div>

      {!apiKeySet && (
        <div className="mb-4 flex items-start gap-3 rounded-2xl border border-warning/30 bg-warning/10 p-4 text-warning">
          <AlertTriangle className="h-5 w-5 shrink-0" />
          <div>
            <p className="font-medium">LoveAI è in attesa</p>
            <p className="text-sm">
              Inserisci la tua chiave API nelle Impostazioni per iniziare a chattare con le tue finanze.
            </p>
          </div>
        </div>
      )}

      <div className="mb-2 flex items-center gap-2 text-xs text-gray-500">
        <span className="rounded-full bg-gray-100 px-2 py-0.5 dark:bg-white/10">
          {AI_PROVIDERS[provider].label}
        </span>
        <span className="rounded-full bg-gray-100 px-2 py-0.5 dark:bg-white/10">
          {settings.ai_model || 'default'}
        </span>
      </div>

      <Card className="relative flex flex-1 flex-col overflow-hidden">
        <div className="flex-1 space-y-4 overflow-y-auto p-4">
          {messages.length === 0 && (
            <div className="flex h-full flex-col items-center justify-center text-center">
              <div className="mb-4">
                <BrandLogo className="h-14 w-14" />
              </div>
              <h3 className="font-display text-lg font-semibold">Ciao, sono LoveAI</h3>
              <p className="mb-6 max-w-xs text-sm text-gray-500 dark:text-gray-400">
                Posso aiutarti a capire come spendi, dove risparmiare e come raggiungere i tuoi obiettivi.
              </p>
              <div className="flex flex-wrap justify-center gap-2">
                {PROMPTS.map((p) => (
                  <button
                    key={p}
                    onClick={() => handleSend(p)}
                    className="rounded-xl border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 transition-colors hover:border-primary-300 hover:text-primary-700 dark:border-white/10 dark:bg-white/5 dark:text-gray-300 dark:hover:border-primary-500/50"
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>
          )}

          <AnimatePresence initial={false}>
            {messages.map((msg, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}
              >
                <div
                  className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl ${
                    msg.role === 'user'
                      ? 'bg-primary-600 text-white'
                      : 'bg-white shadow-sm dark:bg-love-card-dark'
                  }`}
                >
                  {msg.role === 'user' ? (
                    <User className="h-4 w-4" />
                  ) : (
                    <Bot className="h-4 w-4 text-primary-600" />
                  )}
                </div>
                <div
                  className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm ${
                    msg.role === 'user'
                      ? 'bg-primary-600 text-white'
                      : 'bg-white shadow-sm dark:bg-love-card-dark'
                  }`}
                >
                  {msg.role === 'assistant' ? (
                    <div className="prose prose-sm dark:prose-invert max-w-none">
                      <ReactMarkdown disallowedElements={['a', 'img']} unwrapDisallowed>{msg.content}</ReactMarkdown>
                    </div>
                  ) : (
                    msg.content
                  )}
                </div>
              </motion.div>
            ))}
          </AnimatePresence>

          {loading && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex items-center gap-2 text-sm text-gray-500"
            >
              <Sparkles className="h-4 w-4 animate-pulse" />
              LoveAI sta pensando...
            </motion.div>
          )}

          {error && (
            <div className="rounded-xl bg-red-50 p-3 text-sm text-red-600 dark:bg-red-900/20 dark:text-red-400">
              {error}
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        <div className="border-t border-white/60 p-3 dark:border-white/10">
          <form
            onSubmit={(e) => {
              e.preventDefault()
              handleSend(input)
            }}
            className="flex gap-2"
          >
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Chiedi a LoveAI..."
              disabled={loading}
              className="rounded-xl"
            />
            <Button type="submit" disabled={loading || !input.trim()} className="px-4">
              <Send className="h-4 w-4" />
            </Button>
          </form>
        </div>
      </Card>
    </div>
  )
}
