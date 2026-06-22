import React from 'react'
import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs))
}

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost'
  size?: 'sm' | 'md' | 'lg'
  isLoading?: boolean
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', isLoading, children, disabled, ...props }, ref) => {
    return (
      <button
        ref={ref}
        disabled={disabled || isLoading}
        className={cn(
          'inline-flex items-center justify-center rounded-full font-medium transition-all focus:outline-none focus:ring-2 focus:ring-primary-400 focus:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none active:scale-95',
          variant === 'primary' && 'bg-gradient-to-r from-primary-500 to-primary-600 text-white shadow-glow hover:shadow-lg hover:brightness-105',
          variant === 'secondary' && 'bg-white/70 text-gray-900 shadow-sm hover:bg-white dark:bg-white/10 dark:text-gray-100 dark:hover:bg-white/20',
          variant === 'danger' && 'bg-gradient-to-r from-expense to-red-500 text-white shadow-md hover:brightness-105',
          variant === 'ghost' && 'bg-transparent text-gray-700 hover:bg-primary-50 dark:text-gray-200 dark:hover:bg-white/5',
          size === 'sm' && 'h-8 px-4 text-xs',
          size === 'md' && 'h-10 px-5 text-sm',
          size === 'lg' && 'h-12 px-6 text-base',
          className
        )}
        {...props}
      >
        {isLoading && (
          <span className="mr-2 inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
        )}
        {children}
      </button>
    )
  }
)
Button.displayName = 'Button'
