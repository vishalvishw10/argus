import { useEffect, useMemo, useState } from 'react'
import { useTrending } from '../hooks/useTrending'
import { useCatalog } from '../hooks/useCatalog'
import { useCveData } from '../hooks/useCveData'
import CommandBar, { type Mode } from '../components/console/CommandBar'
import IndexList from '../components/console/IndexList'
import Dossier from '../components/console/Dossier'
import Overview from '../components/console/Overview'
import AboutModal from '../components/console/AboutModal'
import { fromTrend, fromCatalog, type IndexItem } from '../lib/derive'
import type { Cve, CatalogCve, Severity, TrendCve, CatalogSort } from '../types'

const SEVS: (Severity | 'ALL')[] = ['ALL', 'CRITICAL', 'HIGH', 'MEDIUM', 'LOW']
const CAT_SORTS: { key: CatalogSort; label: string }[] = [
  { key: 'newest', label: 'Newest' },
  { key: 'cvss', label: 'CVSS' },
  { key: 'kev', label: 'KEV first' },
  { key: 'repos', label: 'Most PoCs' },
  { key: 'cve', label: 'CVE ID' },
]

export default function ConsoleView() {
  const { data: trending, loading: trendLoading } = useTrending()
  const catalog = useCatalog()
  const exploit = useCveData() // for full repo lists in the dossier

  const [mode, setMode] = useState<Mode>('trending')
  const [query, setQuery] = useState('')
  const [selected, setSelected] = useState<string | null>(null)
  const [severity, setSeverity] = useState<Severity | 'ALL'>('ALL')
  const [catSort, setCatSort] = useState<CatalogSort>('newest')
  const [catYear, setCatYear] = useState<number | null>(null)
  const [aboutOpen, setAboutOpen] = useState(false)

  const catYears = useMemo(() => catalog.index?.years.map((y) => y.year) ?? [], [catalog.index])

  // default catalog year = latest
  useEffect(() => {
    if (catYear == null && catYears.length) setCatYear(catYears[0])
  }, [catYears, catYear])

  // load the active catalog year
  useEffect(() => {
    if (mode === 'cves' && catYear != null) catalog.ensureYear(catYear)
  }, [mode, catYear, catalog])

  const trendMap = useMemo(() => {
    const m = new Map<string, TrendCve>()
    trending?.cves.forEach((c) => m.set(c.cve_id, c))
    return m
  }, [trending])

  const catalogMap = useMemo(() => {
    const m = new Map<string, CatalogCve>()
    for (const [, list] of catalog.byYear) for (const c of list) m.set(c.id, c)
    return m
  }, [catalog.byYear])

  const cveMap = useMemo(() => {
    const m = new Map<string, Cve>()
    for (const [, list] of exploit.cvesByYear) for (const c of list) m.set(c.cve_id, c)
    return m
  }, [exploit.cvesByYear])

  // ----- trending list -----
  const pulseItems = useMemo<IndexItem[]>(() => {
    let items = (trending?.cves ?? []).map(fromTrend)
    if (severity !== 'ALL') items = items.filter((i) => i.severity === severity)
    return items
  }, [trending, severity])

  // ----- catalog list (active year) -----
  const catalogItems = useMemo<IndexItem[]>(() => {
    if (catYear == null) return []
    const list = catalog.byYear.get(catYear) ?? []
    let items = list.map((c) => fromCatalog(c, trendMap))
    if (severity !== 'ALL') items = items.filter((i) => i.severity === severity)
    const arr = items
    switch (catSort) {
      case 'cvss':
        return arr.sort((a, b) => (b.cvss ?? -1) - (a.cvss ?? -1))
      case 'kev':
        return arr.sort((a, b) => Number(b.kev) - Number(a.kev) || (b.cvss ?? 0) - (a.cvss ?? 0))
      case 'repos':
        return arr.sort((a, b) => b.repoCount - a.repoCount || (b.cvss ?? 0) - (a.cvss ?? 0))
      case 'cve':
        return arr.sort((a, b) => b.cve_id.localeCompare(a.cve_id, undefined, { numeric: true }))
      case 'newest':
      default:
        return arr.sort((a, b) => (b.published || '').localeCompare(a.published || '') || b.cve_id.localeCompare(a.cve_id, undefined, { numeric: true }))
    }
  }, [catYear, catalog.byYear, trendMap, severity, catSort])

  const baseItems = mode === 'trending' ? pulseItems : catalogItems

  // in CVEs mode, typing a full CVE-YYYY- auto-switches the year
  useEffect(() => {
    if (mode !== 'cves') return
    const m = query.match(/cve-(\d{4})-/i)
    const y = m ? Number(m[1]) : null
    if (y && catYears.includes(y) && y !== catYear) setCatYear(y)
  }, [query, mode, catYears, catYear])

  const items = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return baseItems
    return baseItems.filter(
      (i) =>
        i.cve_id.toLowerCase().includes(q) ||
        (i.title?.toLowerCase().includes(q) ?? false) ||
        (i.description?.toLowerCase().includes(q) ?? false),
    )
  }, [baseItems, query])

  // first impression: open the top trending CVE
  useEffect(() => {
    if (!selected && mode === 'trending' && pulseItems.length) setSelected(pulseItems[0].cve_id)
  }, [pulseItems, mode, selected])

  // ensure repo + catalog data for the selected CVE (any mode)
  useEffect(() => {
    if (!selected) return
    const y = Number(selected.match(/CVE-(\d{4})-/)?.[1])
    if (y) {
      exploit.ensureYear(y)
      if (catYears.includes(y)) catalog.ensureYear(y)
    }
  }, [selected, exploit, catalog, catYears])

  const listLoading =
    mode === 'trending' ? trendLoading : catYear == null || !catalog.byYear.has(catYear)

  const selectedTrend = selected ? trendMap.get(selected) ?? null : null
  const selectedCve = selected ? cveMap.get(selected) ?? null : null
  const selectedCatalog = selected ? catalogMap.get(selected) ?? null : null
  const selectedItem = useMemo(
    () => (selected ? items.find((i) => i.cve_id === selected) ?? baseItems.find((i) => i.cve_id === selected) ?? null : null),
    [selected, items, baseItems],
  )

  const totals = useMemo(() => {
    const cves = catalog.index?.years.reduce((s, y) => s + y.count, 0) ?? 0
    const repos = exploit.index?.years.reduce((s, y) => s + y.repo_count, 0) ?? 0
    return { cves, repos }
  }, [catalog.index, exploit.index])

  return (
    <div className="flex h-screen flex-col">
      <CommandBar
        mode={mode}
        setMode={(m) => {
          setMode(m)
          setSelected(null)
        }}
        query={query}
        setQuery={setQuery}
        generatedAt={trending?.generated_at ?? null}
        onAbout={() => setAboutOpen(true)}
      />

      {/* sub-bar: controls per mode */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-line bg-base-900/40 px-3 py-2 sm:px-4">
        {mode === 'cves' && (
          <>
            <label className="flex items-center gap-2">
              <span className="label">Year</span>
              <select value={catYear ?? ''} onChange={(e) => setCatYear(Number(e.target.value))} className="field cursor-pointer !py-1 pr-7 text-xs">
                {catYears.map((y) => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </label>
            <label className="flex items-center gap-2">
              <span className="label">Sort</span>
              <select value={catSort} onChange={(e) => setCatSort(e.target.value as CatalogSort)} className="field cursor-pointer !py-1 pr-7 text-xs">
                {CAT_SORTS.map((s) => (
                  <option key={s.key} value={s.key}>{s.label}</option>
                ))}
              </select>
            </label>
          </>
        )}
        <div className="flex items-center gap-2">
          <span className="label">Severity</span>
          <div className="seg">
            {SEVS.map((s) => (
              <button key={s} data-active={severity === s} onClick={() => setSeverity(s)}>
                {s === 'ALL' ? 'All' : s[0] + s.slice(1).toLowerCase()}
              </button>
            ))}
          </div>
        </div>
        {mode === 'cves' && catalog.error && <span className="text-xs text-rose-400">catalog: run scripts/cves.mjs</span>}
      </div>

      {/* split pane */}
      <div className="grid min-h-0 flex-1 lg:grid-cols-[minmax(340px,440px)_1fr]">
        <div className={`min-h-0 border-r border-line ${selected ? 'hidden lg:block' : 'block'}`}>
          <IndexList items={items} selected={selected} onSelect={setSelected} loading={listLoading} />
        </div>
        <div className={`min-h-0 ${selected ? 'block' : 'hidden lg:block'}`}>
          {selected ? (
            <Dossier
              key={selected}
              cveId={selected}
              item={selectedItem}
              trend={selectedTrend}
              cve={selectedCve}
              catalog={selectedCatalog}
              onClose={() => setSelected(null)}
            />
          ) : (
            <Overview
              trending={trending}
              totalCves={totals.cves}
              totalRepos={totals.repos}
              topMovers={pulseItems.slice(0, 6)}
              onSelect={setSelected}
            />
          )}
        </div>
      </div>

      {aboutOpen && <AboutModal onClose={() => setAboutOpen(false)} />}
    </div>
  )
}
