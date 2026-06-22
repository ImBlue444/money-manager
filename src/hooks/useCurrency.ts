import { useCallback, useEffect, useState } from 'react'
import type { ExchangeRateResult } from '../types'

export function useCurrency(from: string, to: string) {
  const [result, setResult] = useState<ExchangeRateResult | null>(null)
  const [loading, setLoading] = useState(false)

  const fetchRate = useCallback(async () => {
    if (from === to) {
      setResult({ rate: 1 })
      return
    }
    setLoading(true)
    const res = await window.api.getExchangeRate(from, to)
    setResult(res)
    setLoading(false)
  }, [from, to])

  useEffect(() => {
    fetchRate()
  }, [fetchRate])

  const convert = useCallback(
    (amount: number) => {
      if (!result || result.rate === null) return null
      return Number((amount * result.rate).toFixed(4))
    },
    [result]
  )

  return { ...result, loading, refetch: fetchRate, convert }
}
