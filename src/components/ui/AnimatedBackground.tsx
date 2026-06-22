import React from 'react'

export function AnimatedBackground(): JSX.Element {
  return (
    <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      <div
        className="absolute -left-20 -top-20 h-96 w-96 rounded-full bg-primary-300/30 blur-3xl animate-blob dark:bg-primary-500/15"
        style={{ animationDelay: '0s' }}
      />
      <div
        className="absolute -right-20 top-1/3 h-[28rem] w-[28rem] rounded-full bg-secondary-500/20 blur-3xl animate-blob-slow dark:bg-secondary-500/15"
        style={{ animationDelay: '2s' }}
      />
      <div
        className="absolute bottom-0 left-1/3 h-80 w-80 rounded-full bg-warning/20 blur-3xl animate-blob dark:bg-primary-700/20"
        style={{ animationDelay: '4s' }}
      />
    </div>
  )
}
