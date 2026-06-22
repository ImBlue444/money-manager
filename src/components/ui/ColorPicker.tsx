import React from 'react'

const DEFAULT_COLORS = [
  '#ef4444', // red
  '#f97316', // orange
  '#f59e0b', // amber
  '#84cc16', // lime
  '#10b981', // emerald
  '#06b6d4', // cyan
  '#3b82f6', // blue
  '#6366f1', // indigo
  '#8b5cf6', // violet
  '#d946ef', // fuchsia
  '#f43f5e', // rose
  '#64748b'  // slate
]

interface ColorPickerProps {
  value: string
  onChange: (color: string) => void
  colors?: string[]
  label?: string
}

export function ColorPicker({ value, onChange, colors = DEFAULT_COLORS, label }: ColorPickerProps): JSX.Element {
  return (
    <div>
      {label && <label className="mb-1 block text-xs font-medium">{label}</label>}
      <div className="grid grid-cols-6 gap-2">
        {colors.map((c) => (
          <button
            key={c}
            type="button"
            onClick={() => onChange(c)}
            className={`h-8 w-full rounded-lg transition-transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-offset-1 ${
              value.toLowerCase() === c.toLowerCase()
                ? 'ring-2 ring-offset-1 ring-gray-900 dark:ring-white scale-105'
                : ''
            }`}
            style={{ backgroundColor: c }}
            aria-label={`Seleziona colore ${c}`}
          />
        ))}
      </div>
    </div>
  )
}
