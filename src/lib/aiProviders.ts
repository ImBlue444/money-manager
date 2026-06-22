import type { AiProvider, AiProviderConfig } from '../types'

export const AI_PROVIDERS: Record<AiProvider, AiProviderConfig> = {
  openai: {
    label: 'OpenAI',
    models: [
      { id: 'gpt-5.4-mini', label: 'GPT-5.4 mini', tier: 'economy' },
      { id: 'gpt-5.4', label: 'GPT-5.4', tier: 'performance' }
    ]
  },
  anthropic: {
    label: 'Anthropic Claude',
    models: [
      { id: 'claude-haiku-4-5', label: 'Claude Haiku 4.5', tier: 'economy' },
      { id: 'claude-sonnet-4-6', label: 'Claude Sonnet 4.6', tier: 'performance' }
    ]
  },
  gemini: {
    label: 'Google Gemini',
    models: [
      { id: 'gemini-3.5-flash', label: 'Gemini 3.5 Flash', tier: 'economy' },
      { id: 'gemini-3.5-pro', label: 'Gemini 3.5 Pro', tier: 'performance' }
    ]
  }
}

export const DEFAULT_PROVIDER: AiProvider = 'openai'

export function getDefaultModel(provider: AiProvider): string {
  const models = AI_PROVIDERS[provider].models
  return models.find((m) => m.tier === 'performance')?.id ?? models[0].id
}
