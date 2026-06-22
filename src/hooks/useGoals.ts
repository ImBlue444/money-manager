import { useCallback, useEffect, useState } from 'react'
import type { Goal } from '../types'

export function useGoals() {
  const [data, setData] = useState<Goal[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetch = useCallback(async () => {
    try {
      setLoading(true)
      const rows = await window.api.getGoals()
      setData(rows)
      setError(null)
    } catch (e) {
      setError('Errore caricamento obiettivi')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetch()
  }, [fetch])

  return { data, loading, error, refetch: fetch }
}
