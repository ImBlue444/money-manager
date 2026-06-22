import { useCallback, useEffect, useState } from 'react'
import type { Transaction, TransactionFilters } from '../types'

export function useTransactions(filters: TransactionFilters = {}) {
  const [data, setData] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetch = useCallback(async () => {
    try {
      setLoading(true)
      const rows = await window.api.getTransactions(filters)
      setData(rows)
      setError(null)
    } catch (e) {
      setError('Errore caricamento transazioni')
    } finally {
      setLoading(false)
    }
  }, [JSON.stringify(filters)])

  useEffect(() => {
    let cancelled = false
    fetch()
    return () => {
      cancelled = true
    }
  }, [fetch])

  return { data, loading, error, refetch: fetch }
}
