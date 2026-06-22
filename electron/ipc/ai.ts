import { ipcMain, safeStorage } from 'electron'
import Store from 'electron-store'
import { buildFinancialContext, buildSystemPrompt, getPeriodDates } from '../../src/lib/aiContext'
import { getAllSettings } from '../../src/lib/db'
import type { AiMessage, AiPeriod } from '../../src/types'

const aiStore = new Store<{ apiKeyEncrypted?: string }>({ name: 'moneylove-ai' })

function saveApiKey(key: string): void {
  if (!key) {
    aiStore.delete('apiKeyEncrypted')
    return
  }
  if (!safeStorage.isEncryptionAvailable()) {
    // Fallback: store plain. Not recommended, but keeps feature working.
    aiStore.set('apiKeyEncrypted', `plain:${key}`)
    return
  }
  const encrypted = safeStorage.encryptString(key)
  aiStore.set('apiKeyEncrypted', encrypted.toString('base64'))
}

function getApiKey(): string | null {
  const stored = aiStore.get('apiKeyEncrypted')
  if (!stored) return null
  if (stored.startsWith('plain:')) {
    return stored.slice(6)
  }
  if (!safeStorage.isEncryptionAvailable()) return null
  const buffer = Buffer.from(stored, 'base64')
  return safeStorage.decryptString(buffer)
}

function getModel(): string {
  return getAllSettings().ai_model || 'gpt-4o-mini'
}

function getProvider(): string {
  return getAllSettings().ai_provider || 'openai'
}

function createMessages(
  context: string,
  systemPrompt: string,
  userMessage: string,
  history: AiMessage[]
): AiMessage[] {
  return [
    { role: 'system', content: systemPrompt },
    { role: 'system', content: `DATI FINANZIARI DELL'UTENTE:\n${context}` },
    ...history,
    { role: 'user', content: userMessage }
  ]
}

async function streamOpenAI(
  event: Electron.IpcMainInvokeEvent,
  apiKey: string,
  model: string,
  messages: AiMessage[]
): Promise<void> {
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model,
      messages,
      stream: true,
      temperature: 0.7,
      max_tokens: 2048
    })
  })

  if (!response.ok) {
    const text = await response.text()
    throw new Error(`OpenAI error ${response.status}: ${text}`)
  }

  const reader = response.body?.getReader()
  if (!reader) throw new Error('No response body')

  const decoder = new TextDecoder()
  let buffer = ''

  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })
    const lines = buffer.split('\n')
    buffer = lines.pop() || ''
    for (const line of lines) {
      const trimmed = line.trim()
      if (!trimmed.startsWith('data:')) continue
      const data = trimmed.slice(5).trim()
      if (data === '[DONE]') continue
      try {
        const parsed = JSON.parse(data)
        const delta = parsed.choices?.[0]?.delta?.content
        if (delta) {
          event.sender.send('ai:chunk', delta)
        }
      } catch {
        // ignore malformed lines
      }
    }
  }
}

async function streamAnthropic(
  event: Electron.IpcMainInvokeEvent,
  apiKey: string,
  model: string,
  messages: AiMessage[]
): Promise<void> {
  const systemMessages = messages.filter((m) => m.role === 'system').map((m) => m.content)
  const userAssistantMessages = messages.filter((m) => m.role !== 'system') as Array<{
    role: 'user' | 'assistant'
    content: string
  }>

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01'
    },
    body: JSON.stringify({
      model,
      max_tokens: 2048,
      system: systemMessages.join('\n\n'),
      messages: userAssistantMessages,
      stream: true
    })
  })

  if (!response.ok) {
    const text = await response.text()
    throw new Error(`Anthropic error ${response.status}: ${text}`)
  }

  const reader = response.body?.getReader()
  if (!reader) throw new Error('No response body')

  const decoder = new TextDecoder()
  let buffer = ''

  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })
    const lines = buffer.split('\n')
    buffer = lines.pop() || ''
    let currentData = ''
    for (const line of lines) {
      const trimmed = line.trim()
      if (trimmed.startsWith('event:')) {
        currentData = ''
        continue
      }
      if (trimmed.startsWith('data:')) {
        currentData = trimmed.slice(5).trim()
        try {
          const parsed = JSON.parse(currentData)
          const delta = parsed.delta?.text
          if (delta) {
            event.sender.send('ai:chunk', delta)
          }
        } catch {
          // ignore
        }
      }
    }
  }
}

export function registerAiIpc(): void {
  ipcMain.handle('ai:saveApiKey', (_event, key: string) => {
    try {
      saveApiKey(key)
    } catch (e) {
      console.error('ai:saveApiKey error', e)
      throw e
    }
  })

  ipcMain.handle('ai:getApiKey', () => {
    try {
      return getApiKey() ?? ''
    } catch (e) {
      console.error('ai:getApiKey error', e)
      return ''
    }
  })

  ipcMain.handle(
    'ai:sendMessage',
    async (event, message: string, history: AiMessage[], period: AiPeriod) => {
      try {
        const apiKey = getApiKey()
        if (!apiKey) throw new Error('Chiave API non configurata')

        const settings = getAllSettings()
        const locale = settings.locale || 'it-IT'
        const provider = getProvider()
        const model = getModel()
        const context = await buildFinancialContext(period)
        const systemPrompt = buildSystemPrompt(locale)
        const messages = createMessages(context, systemPrompt, message, history)

        if (provider === 'anthropic') {
          await streamAnthropic(event, apiKey, model, messages)
        } else {
          await streamOpenAI(event, apiKey, model, messages)
        }

        event.sender.send('ai:done')
      } catch (e) {
        const msg = e instanceof Error ? e.message : 'Errore AI sconosciuto'
        console.error('ai:sendMessage error', e)
        event.sender.send('ai:error', msg)
      }
    }
  )

  ipcMain.handle('ai:generateInsight', async (_event, period: AiPeriod) => {
    try {
      const apiKey = getApiKey()
      if (!apiKey) return ''

      const settings = getAllSettings()
      const locale = settings.locale || 'it-IT'
      const provider = getProvider()
      const model = getModel()
      const context = await buildFinancialContext(period)
      const systemPrompt = buildSystemPrompt(locale)
      const { label } = getPeriodDates(period)
      const userMessage = `Genera un breve insight (max 3 frasi) sulle finanze dell'utente per il periodo ${label}. Sii incoraggiante e pratico.`
      const messages = createMessages(context, systemPrompt, userMessage, [])

      if (provider === 'anthropic') {
        const systemMessages = messages.filter((m) => m.role === 'system').map((m) => m.content)
        const userAssistantMessages = messages.filter(
          (m) => m.role !== 'system'
        ) as Array<{ role: 'user' | 'assistant'; content: string }>
        const response = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': apiKey,
            'anthropic-version': '2023-06-01'
          },
          body: JSON.stringify({
            model,
            max_tokens: 512,
            system: systemMessages.join('\n\n'),
            messages: userAssistantMessages
          })
        })
        const data = (await response.json()) as { content?: Array<{ text?: string }> }
        return data.content?.[0]?.text ?? ''
      } else {
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${apiKey}`
          },
          body: JSON.stringify({
            model,
            messages,
            temperature: 0.7,
            max_tokens: 512
          })
        })
        const data = (await response.json()) as { choices?: Array<{ message?: { content?: string } }> }
        return data.choices?.[0]?.message?.content ?? ''
      }
    } catch (e) {
      console.error('ai:generateInsight error', e)
      return ''
    }
  })
}
