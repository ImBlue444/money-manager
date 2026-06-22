import React, { createContext, useContext, useEffect, useReducer, useCallback } from 'react'
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
  username: 'Utente'
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

interface SettingsContextValue {
  settings: SettingsState
  updateSetting: <K extends keyof SettingsMap>(key: K, value: SettingsMap[K]) => Promise<void>
  refresh: () => Promise<void>
}

const SettingsContext = createContext<SettingsContextValue | null>(null)

export function SettingsProvider({ children }: { children: React.ReactNode }): JSX.Element {
  const [state, dispatch] = useReducer(reducer, initialState)

  const refresh = useCallback(async () => {
    const all = await window.api.getAllSettings()
    dispatch({ type: 'LOAD', settings: all })
    applyTheme(all.theme ?? 'light')
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

  useEffect(() => {
    refresh()
  }, [refresh])

  return (
    <SettingsContext.Provider value={{ settings: state, updateSetting, refresh }}>
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
