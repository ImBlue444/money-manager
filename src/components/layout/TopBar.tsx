import React from 'react'

export function TopBar(): JSX.Element {
  return (
    <header className="flex h-16 items-center justify-end border-b border-white/60 bg-white/60 px-6 backdrop-blur-xl dark:border-white/10 dark:bg-love-card-dark/60">
      <p className="text-sm text-gray-500 dark:text-gray-400"><b>Love</b> your finances</p>
    </header>
  )
}
