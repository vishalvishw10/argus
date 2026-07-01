import { useCallback, useEffect, useRef, useState } from 'react'
import type { Cve, DataIndex } from '../types'
import { loadIndex, loadYear } from '../lib/data'

interface State {
  index: DataIndex | null
  cvesByYear: Map<number, Cve[]>
  loadingYears: Set<number>
  error: string | null
  ready: boolean
}

/**
 * Loads the index manifest, then lazily loads each year's CVEs on demand and
 * caches them. `ensureYear` fetches a year if not already loaded.
 */
export function useCveData() {
  const [state, setState] = useState<State>({
    index: null,
    cvesByYear: new Map(),
    loadingYears: new Set(),
    error: null,
    ready: false,
  })
  const cache = useRef(new Map<number, Cve[]>())
  const inflight = useRef(new Set<number>())

  useEffect(() => {
    let cancelled = false
    loadIndex()
      .then((index) => {
        if (!cancelled) setState((s) => ({ ...s, index, ready: true }))
      })
      .catch((e) => {
        if (!cancelled)
          setState((s) => ({ ...s, error: e.message ?? String(e), ready: true }))
      })
    return () => {
      cancelled = true
    }
  }, [])

  const ensureYear = useCallback(async (year: number) => {
    if (cache.current.has(year) || inflight.current.has(year)) return
    inflight.current.add(year)
    setState((s) => ({ ...s, loadingYears: new Set(s.loadingYears).add(year) }))
    const data = await loadYear(year)
    const cves = data?.cves ?? []
    cache.current.set(year, cves)
    inflight.current.delete(year)
    setState((s) => {
      const next = new Map(s.cvesByYear)
      next.set(year, cves)
      const loading = new Set(s.loadingYears)
      loading.delete(year)
      return { ...s, cvesByYear: next, loadingYears: loading }
    })
  }, [])

  return { ...state, ensureYear }
}
