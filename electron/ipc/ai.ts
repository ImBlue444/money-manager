import { ipcMain, safeStorage } from 'electron'
import Store from 'electron-store'
import { buildFinancialContext, buildSystemPrompt } from '../../src/lib/aiContext'
import { getAllSettings } from '../../src/lib/db'
import { AI_PROVIDERS, DEFAULT_PROVIDER, getDefaultModel } from '../../src/lib/aiProviders'
import type { AiMessage, AiPeriod, AiProvider } from '../../src/types'

interface StoreKeys {
  keys?: Partial<Record<AiProvider, string>>
  apiKeyEncrypted?: string // legacy
}

const aiStore = new Store<StoreKeys>({ name: 'moneylove-ai' })

function encryptKey(key: string): string {
  if (!safeStorage.isEncryptionAvailable()) {
    return `plain:${key}`
  }
  const encrypted = safeStorage.encryptString(key)
  return encrypted.toString('base64')
}

function decryptKey(encrypted: string): string | null {
  if (encrypted.startsWith('plain:')) return encrypted.slice(6)
  if (!safeStorage.isEncryptionAvailable()) return null
  return safeStorage.decryptString(Buffer.from(encrypted, 'base64'))
}

function saveApiKey(provider: AiProvider, key: string): void {
  const keys = (aiStore.get('keys') ?? {}) as Partial<Record<AiProvider, string>>
  if (!key) {
    delete keys[provider]
  } else {
    keys[provider] = encryptKey(key)
  }
  aiStore.set('keys', keys)
}

function getApiKey(provider: AiProvider): string | null {
  const keys = (aiStore.get('keys') ?? {}) as Partial<Record<AiProvider, string>>
  let encrypted = keys[provider]

  // Legacy migration: old generic key was used only for OpenAI
  if (!encrypted && provider === 'openai') {
    encrypted = aiStore.get('apiKeyEncrypted')
    if (encrypted) {
      keys.openai = encrypted
      aiStore.set('keys', keys)
    }
  }

  if (!encrypted) return null
  return decryptKey(encrypted)
}

function getProvider(): AiProvider {
  const p = getAllSettings().ai_provider as AiProvider | undefined
  return p && AI_PROVIDERS[p] ? p : DEFAULT_PROVIDER
}

function getModel(): string {
  const settings = getAllSettings()
  const provider = getProvider()
  const model = settings.ai_model
  if (model && (AI_PROVIDERS[provider].models.some((m) => m.id === model) || true)) {
    return model || getDefaultModel(provider)
  }
  return getDefaultModel(provider)
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

async function readSseStream(
  response: Response,
  onDelta: (parsed: any) => void
): Promise<void> {
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
      if (data === '[DONE]' || !data) continue
      try {
        const parsed = JSON.parse(data)
        onDelta(parsed)
      } catch {
        // ignore malformed lines
      }
    }
  }
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

  await readSseStream(response, (parsed) => {
    const delta = parsed.choices?.[0]?.delta?.content
    if (delta) event.sender.send('ai:chunk', delta)
  })
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

  await readSseStream(response, (parsed) => {
    const delta = parsed.delta?.text
    if (delta) event.sender.send('ai:chunk', delta)
  })
}

function toGeminiRole(role: AiMessage['role']): string {
  if (role === 'assistant') return 'model'
  if (role === 'system') return 'user'
  return role
}

function toGeminiContents(messages: AiMessage[]): Array<{ role: string; parts: Array<{ text: string }> }> {
  const contents: Array<{ role: string; parts: Array<{ text: string }> }> = []
  for (const m of messages) {
    const role = toGeminiRole(m.role)
    if (role === 'model' && contents.length === 0) continue
    if (contents.length > 0 && contents[contents.length - 1].role === role) {
      contents[contents.length - 1].parts[0].text += '\n' + m.content
    } else {
      contents.push({ role, parts: [{ text: m.content }] })
    }
  }
  return contents
}

async function streamGemini(
  event: Electron.IpcMainInvokeEvent,
  apiKey: string,
  model: string,
  messages: AiMessage[]
): Promise<void> {
  const systemMessages = messages.filter((m) => m.role === 'system').map((m) => m.content)
  const otherMessages = messages.filter((m) => m.role !== 'system')
  const contents = toGeminiContents(otherMessages)

  const systemInstruction = systemMessages.length
    ? { parts: [{ text: systemMessages.join('\n\n') }] }
    : undefined

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(
    model
  )}:streamGenerateContent?alt=sse&key=${encodeURIComponent(apiKey)}`

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents,
      ...(systemInstruction ? { systemInstruction } : {})
    })
  })

  if (!response.ok) {
    const text = await response.text()
    throw new Error(`Gemini error ${response.status}: ${text}`)
  }

  await readSseStream(response, (parsed) => {
    const parts = parsed.candidates?.[0]?.content?.parts
    if (Array.isArray(parts)) {
      const text = parts.map((p: { text?: string }) => p.text).join('')
      if (text) event.sender.send('ai:chunk', text)
    }
  })
}

async function generateOpenAI(apiKey: string, model: string, messages: AiMessage[]): Promise<string> {
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`
    },
    body: JSON.stringify({ model, messages, temperature: 0.7, max_tokens: 512 })
  })
  const data = (await response.json()) as { choices?: Array<{ message?: { content?: string } }> }
  return data.choices?.[0]?.message?.content ?? ''
}

async function generateAnthropic(apiKey: string, model: string, messages: AiMessage[]): Promise<string> {
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
}

async function generateGemini(apiKey: string, model: string, messages: AiMessage[]): Promise<string> {
  const systemMessages = messages.filter((m) => m.role === 'system').map((m) => m.content)
  const otherMessages = messages.filter((m) => m.role !== 'system')
  const contents = toGeminiContents(otherMessages)
  const systemInstruction = systemMessages.length
    ? { parts: [{ text: systemMessages.join('\n\n') }] }
    : undefined

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(
    model
  )}:generateContent?key=${encodeURIComponent(apiKey)}`

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ contents, ...(systemInstruction ? { systemInstruction } : {}) })
  })
  const data = (await response.json()) as {
    candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>
  }
  return data.candidates?.[0]?.content?.parts?.[0]?.text ?? ''
}

export function registerAiIpc(): void {
  ipcMain.handle('ai:saveApiKey', (_event, provider: AiProvider, key: string) => {
    try {
      saveApiKey(provider, key)
    } catch (e) {
      console.error('ai:saveApiKey error', e)
      throw e
    }
  })

  ipcMain.handle('ai:getApiKey', (_event, provider: AiProvider) => {
    try {
      return getApiKey(provider) ?? ''
    } catch (e) {
      console.error('ai:getApiKey error', e)
      return ''
    }
  })

  ipcMain.handle(
    'ai:sendMessage',
    async (event, message: string, history: AiMessage[], period: AiPeriod) => {
      try {
        const provider = getProvider()
        const apiKey = getApiKey(provider)
        if (!apiKey) throw new Error(`Chiave API non configurata per ${AI_PROVIDERS[provider].label}`)

        const settings = getAllSettings()
        const locale = settings.locale || 'it-IT'
        const model = getModel()
        const context = await buildFinancialContext(period)
        const systemPrompt = buildSystemPrompt(locale)
        const messages = createMessages(context, systemPrompt, message, history)

        if (provider === 'anthropic') await streamAnthropic(event, apiKey, model, messages)
        else if (provider === 'gemini') await streamGemini(event, apiKey, model, messages)
        else await streamOpenAI(event, apiKey, model, messages)

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
      const provider = getProvider()
      const apiKey = getApiKey(provider)
      if (!apiKey) return ''

      const settings = getAllSettings()
      const locale = settings.locale || 'it-IT'
      const model = getModel()
      const context = await buildFinancialContext(period)
      const systemPrompt = buildSystemPrompt(locale)
      const userMessage = `Genera un breve insight (max 3 frasi) sulle finanze dell'utente. Sii incoraggiante e pratico.`
      const messages = createMessages(context, systemPrompt, userMessage, [])

      if (provider === 'anthropic') return generateAnthropic(apiKey, model, messages)
      if (provider === 'gemini') return generateGemini(apiKey, model, messages)
      return generateOpenAI(apiKey, model, messages)
    } catch (e) {
      console.error('ai:generateInsight error', e)
      return ''
    }
  })
}
