import React from 'react'

interface SwitchProps {
  checked: boolean
  onChange: (checked: boolean) => void
  label?: string
  disabled?: boolean
}

export function Switch({ checked, onChange, label, disabled }: SwitchProps): JSX.Element {
  return (
    <label
      className={`inline-flex items-center gap-2 ${disabled ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'}`}
    >
      <span className="relative inline-flex h-6 w-11 items-center">
        <input
          type="checkbox"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          disabled={disabled}
          className="peer sr-only"
        />
        <span
          className={`absolute h-6 w-11 rounded-full transition-colors duration-200 ease-in-out ${
            checked ? 'bg-primary-500' : 'bg-gray-300 dark:bg-gray-600'
          }`}
        />
        <span
          className={`absolute left-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform duration-200 ease-in-out ${
            checked ? 'translate-x-5' : 'translate-x-0'
          }`}
        />
      </span>
      {label && <span className="text-sm font-medium text-gray-700 dark:text-gray-200">{label}</span>}
    </label>
  )
}
