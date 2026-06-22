import React from 'react'

export function AnimatedBackground(): JSX.Element {
  return (
    <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      <div
        className="absolute -left-16 -top-16 h-80 w-80 rounded-full bg-primary-200/20 blur-3xl animate-blob dark:bg-primary-900/15"
        style={{ animationDelay: '0s' }}
      />
      <div
        className="absolute -right-16 top-1/3 h-96 w-96 rounded-full bg-secondary-500/10 blur-3xl animate-blob-slow dark:bg-secondary-700/10"
        style={{ animationDelay: '3s' }}
      />
      <div
        className="absolute bottom-0 left-1/3 h-64 w-64 rounded-full bg-primary-300/10 blur-3xl animate-blob dark:bg-primary-800/10"
        style={{ animationDelay: '6s' }}
      />
    </div>
  )
}
