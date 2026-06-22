import React from 'react'
import { useSettings } from '../../context/SettingsContext'

export function TopBar(): JSX.Element {
  const { settings } = useSettings()
  return (
    <header className="flex h-16 items-center justify-between border-b border-gray-100 bg-white/80 px-6 backdrop-blur dark:border-gray-700 dark:bg-gray-900/80">
      <h1 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Finanza Personale</h1>
      <div className="text-sm text-gray-500 dark:text-gray-400">
        Ciao, <span className="font-medium text-gray-900 dark:text-gray-100">{settings.username || 'Utente'}</span>
      </div>
    </header>
  )
}
