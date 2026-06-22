import React from 'react'
import { Heart } from 'lucide-react'
import { useSettings } from '../../context/SettingsContext'

export function TopBar(): JSX.Element {
  const { settings } = useSettings()
  return (
    <header className="flex h-16 items-center justify-between border-b border-white/60 bg-white/60 px-6 backdrop-blur-xl dark:border-white/10 dark:bg-love-card-dark/60">
      <h1 className="font-display text-xl font-semibold tracking-tight text-gray-900 dark:text-gray-100">
        MoneyLove
      </h1>
      <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
        <Heart className="h-4 w-4 fill-primary-500 text-primary-500" />
        Ciao, <span className="font-medium text-gray-900 dark:text-gray-100">{settings.username || 'Utente'}</span>
      </div>
    </header>
  )
}
