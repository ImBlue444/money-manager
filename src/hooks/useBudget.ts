import { useCallback, useEffect, useState } from 'react'
import type { BudgetWithSpending } from '../types'

export function useBudget(month: string) {
  const [data, setData] = useState<BudgetWithSpending[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetch = useCallback(async () => {
    try {
      setLoading(true)
      const rows = await window.api.getBudget(month)
      setData(rows)
      setError(null)
    } catch (e) {
      setError('Errore caricamento budget')
    } finally {
      setLoading(false)
    }
  }, [month])

  useEffect(() => {
    fetch()
  }, [fetch])

  return { data, loading, error, refetch: fetch }
}
