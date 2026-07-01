import { useCallback, useEffect, useRef, useState } from 'react'
import type { CatalogCve, CatalogIndex } from '../types'

const BASE = (import.meta.env.VITE_DATA_BASE || `${import.meta.env.BASE_URL}data`).replace(/\/$/, '')

interface State {
  index: CatalogIndex | null
  byYear: Map<number, CatalogCve[]>
  loadingYears: Set<number>
  error: string | null
  ready: boolean
}

/** Loads the catalog manifest, then lazily loads each year's full CVE list. */
export function useCatalog() {
  const [state, setState] = useState<State>({
    index: null,
    byYear: new Map(),
    loadingYears: new Set(),
    error: null,
    ready: false,
  })
  const cache = useRef(new Map<number, CatalogCve[]>())
  const inflight = useRef(new Set<number>())

  useEffect(() => {
    let cancelled = false
    fetch(`${BASE}/cve/index.json`, { cache: 'no-cache' })
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`)
        return r.json()
      })
      .then((index: CatalogIndex) => !cancelled && setState((s) => ({ ...s, index, ready: true })))
      .catch((e) => !cancelled && setState((s) => ({ ...s, error: e.message ?? String(e), ready: true })))
    return () => {
      cancelled = true
    }
  }, [])

  const ensureYear = useCallback(async (year: number) => {
    if (cache.current.has(year) || inflight.current.has(year)) return
    inflight.current.add(year)
    setState((s) => ({ ...s, loadingYears: new Set(s.loadingYears).add(year) }))
    let cves: CatalogCve[] = []
    try {
      const res = await fetch(`${BASE}/cve/${year}.json`, { cache: 'no-cache' })
      if (res.ok) cves = (await res.json()).cves ?? []
    } catch {
      /* missing year */
    }
    cache.current.set(year, cves)
    inflight.current.delete(year)
    setState((s) => {
      const byYear = new Map(s.byYear)
      byYear.set(year, cves)
      const loadingYears = new Set(s.loadingYears)
      loadingYears.delete(year)
      return { ...s, byYear, loadingYears }
    })
  }, [])

  return { ...state, ensureYear }
}
