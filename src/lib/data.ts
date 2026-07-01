import type { DataIndex, YearData } from '../types'

// Where to load JSON from. Default: the site's own /data (committed by the
// GitHub Action). Override with VITE_DATA_BASE to point at a raw GitHub URL,
// e.g. https://raw.githubusercontent.com/<you>/cve-mapping/main/public/data
const BASE = (import.meta.env.VITE_DATA_BASE || `${import.meta.env.BASE_URL}data`).replace(
  /\/$/,
  '',
)

export async function loadIndex(): Promise<DataIndex> {
  const res = await fetch(`${BASE}/index.json`, { cache: 'no-cache' })
  if (!res.ok) throw new Error(`index.json: HTTP ${res.status}`)
  return res.json()
}

export async function loadYear(year: number): Promise<YearData | null> {
  try {
    const res = await fetch(`${BASE}/${year}.json`, { cache: 'no-cache' })
    if (!res.ok) return null
    return await res.json()
  } catch {
    return null
  }
}
