export function formatCurrency(amount: number, currency = 'EUR', locale = 'it-IT'): string {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency
  }).format(amount)
}

export function formatConverted(
  amountBase: number,
  baseCurrency: string,
  amountOriginal: number,
  originalCurrency: string,
  locale = 'it-IT'
): string {
  const base = formatCurrency(amountBase, baseCurrency, locale)
  if (originalCurrency === baseCurrency) return base
  const original = formatCurrency(amountOriginal, originalCurrency, locale)
  return `${base} (${original})`
}

export function formatDate(dateStr: string, locale = 'it-IT'): string {
  const date = new Date(dateStr + 'T00:00:00')
  return date.toLocaleDateString(locale, { day: '2-digit', month: 'short', year: 'numeric' })
}

export function formatShortDate(dateStr: string, locale = 'it-IT'): string {
  const date = new Date(dateStr + 'T00:00:00')
  return date.toLocaleDateString(locale, { day: '2-digit', month: 'short' })
}

export function getMonthKey(date = new Date()): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  return `${y}-${m}`
}

export function monthLabel(monthKey: string, locale = 'it-IT'): string {
  const [year, month] = monthKey.split('-').map(Number)
  const date = new Date(year, month - 1, 1)
  return date.toLocaleDateString(locale, { month: 'long', year: 'numeric' })
}

export function previousMonthKey(monthKey: string): string {
  const [year, month] = monthKey.split('-').map(Number)
  const date = new Date(year, month - 2, 1)
  return getMonthKey(date)
}
