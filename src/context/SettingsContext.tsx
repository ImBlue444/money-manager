import React, { createContext, useContext, useEffect, useReducer, useCallback, useState } from 'react'
import type { SettingsMap } from '../types'

type SettingsState = Partial<SettingsMap>

type Action =
  | { type: 'SET'; key: keyof SettingsMap; value: string }
  | { type: 'LOAD'; settings: Partial<SettingsMap> }

const initialState: SettingsState = {
  base_currency: 'EUR',
  locale: 'it-IT',
  theme: 'light',
  starting_balance: '0',
  username: 'Utente',
  onboarding_completed: 'false'
}

function reducer(state: SettingsState, action: Action): SettingsState {
  switch (action.type) {
    case 'SET':
      return { ...state, [action.key]: action.value }
    case 'LOAD':
      return { ...state, ...action.settings }
    default:
      return state
  }
}

export interface OnboardingData {
  username: string
  base_currency: string
  starting_balance: string
  theme: 'light' | 'dark'
  locale: string
}

interface SettingsContextValue {
  settings: SettingsState
  loading: boolean
  needsOnboarding: boolean
  updateSetting: <K extends keyof SettingsMap>(key: K, value: SettingsMap[K]) => Promise<void>
  completeOnboarding: (data: OnboardingData) => Promise<void>
  refresh: () => Promise<void>
}

const SettingsContext = createContext<SettingsContextValue | null>(null)

export function SettingsProvider({ children }: { children: React.ReactNode }): JSX.Element {
  const [state, dispatch] = useReducer(reducer, initialState)
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    setLoading(true)
    const all = await window.api.getAllSettings()
    dispatch({ type: 'LOAD', settings: all })
    applyTheme(all.theme ?? 'light')
    setLoading(false)
  }, [])

  const updateSetting = useCallback(
    async <K extends keyof SettingsMap>(key: K, value: SettingsMap[K]) => {
      await window.api.setSetting(key, value)
      dispatch({ type: 'SET', key, value })
      if (key === 'theme') {
        applyTheme(value as 'light' | 'dark')
      }
    },
    []
  )

  const completeOnboarding = useCallback(async (data: OnboardingData) => {
    const payload: Partial<SettingsMap> = {
      ...data,
      onboarding_completed: 'true'
    }
    await Promise.all(
      Object.entries(payload).map(([key, value]) =>
        window.api.setSetting(key as keyof SettingsMap, value as string)
      )
    )
    dispatch({ type: 'LOAD', settings: payload })
    applyTheme(data.theme)
  }, [])

  useEffect(() => {
    refresh()
  }, [refresh])

  const needsOnboarding = state.onboarding_completed !== 'true'

  return (
    <SettingsContext.Provider
      value={{ settings: state, loading, needsOnboarding, updateSetting, completeOnboarding, refresh }}
    >
      {children}
    </SettingsContext.Provider>
  )
}

function applyTheme(theme: 'light' | 'dark' | string): void {
  const root = window.document.documentElement
  if (theme === 'dark') {
    root.classList.add('dark')
  } else {
    root.classList.remove('dark')
  }
}

export function useSettings(): SettingsContextValue {
  const ctx = useContext(SettingsContext)
  if (!ctx) throw new Error('useSettings must be used within SettingsProvider')
  return ctx
}
