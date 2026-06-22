import { useCallback, useEffect, useState } from 'react'
import type { EnrichedSubscription } from '../types'

export function useSubscriptions() {
  const [data, setData] = useState<EnrichedSubscription[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetch = useCallback(async () => {
    try {
      setLoading(true)
      const rows = await window.api.getSubscriptions()
      setData(rows)
      setError(null)
    } catch (e) {
      setError('Errore caricamento abbonamenti')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetch()
  }, [fetch])

  return { data, loading, error, refetch: fetch }
}
