import React from 'react'
import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs))
}

interface BrandLogoProps {
  className?: string
  iconClassName?: string
}

export function BrandLogo({ className, iconClassName }: BrandLogoProps): JSX.Element {
  return (
    <div className={cn('relative flex items-center justify-center', className)}>
      <svg
        viewBox="0 0 48 48"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={cn('h-full w-full', iconClassName)}
      >
        <defs>
          <linearGradient id="heartGrad" x1="0" y1="0" x2="48" y2="48" gradientUnits="userSpaceOnUse">
            <stop stopColor="#ff5e8a" />
            <stop offset="1" stopColor="#a78bfa" />
          </linearGradient>
        </defs>
        <path
          d="M24 42.5L21.1 39.8C10.8 30.5 4 24.4 4 16.9 4 10.8 8.7 6 14.7 6c3.4 0 6.7 1.6 8.8 4.1C25.6 7.6 28.9 6 32.3 6 38.3 6 43 10.8 43 16.9c0 7.5-6.8 13.6-17.1 22.9L24 42.5z"
          fill="url(#heartGrad)"
        />
        <rect x="14" y="18" width="20" height="14" rx="3" fill="white" fillOpacity="0.95" />
        <circle cx="18" cy="25" r="2" fill="#ff5e8a" />
        <path d="M23 23h10v1.5H23V23zm0 3h7v1.5h-7V26z" fill="#a78bfa" fillOpacity="0.8" />
      </svg>
    </div>
  )
}
