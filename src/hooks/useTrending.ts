import { useEffect, useState } from 'react'
import type { TrendingData } from '../types'

const BASE = (import.meta.env.VITE_DATA_BASE || `${import.meta.env.BASE_URL}data`).replace(/\/$/, '')

export function useTrending() {
  const [data, setData] = useState<TrendingData | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    fetch(`${BASE}/trending.json`, { cache: 'no-cache' })
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`)
        return r.json()
      })
      .then((d: TrendingData) => !cancelled && setData(d))
      .catch((e) => !cancelled && setError(e.message ?? String(e)))
      .finally(() => !cancelled && setLoading(false))
    return () => {
      cancelled = true
    }
  }, [])

  return { data, error, loading }
}
