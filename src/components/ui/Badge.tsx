import React from 'react'
import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs))
}

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  color?: string
}

export function Badge({ className, color, children, ...props }: BadgeProps): JSX.Element {
  const style = color ? { backgroundColor: `${color}20`, color, borderColor: `${color}40` } : undefined
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium',
        !color && 'bg-gray-100 text-gray-800 border-gray-200 dark:bg-gray-700 dark:text-gray-200 dark:border-gray-600',
        className
      )}
      style={style}
      {...props}
    >
      {children}
    </span>
  )
}
