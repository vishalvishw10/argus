import type { Cve, TrendCve, CatalogCve, Severity } from '../types'

export interface IndexItem {
  cve_id: string
  title: string | null
  description: string | null
  severity: Severity
  hype: number | null
  kev: boolean
  ransomware: boolean
  zeroDay: boolean
  epss: number | null
  cvss: number | null
  repoCount: number
  stars: number
  published: string | null
  trending: boolean
}

// Build a clean one-liner from the highest-signal repo description.
export function deriveTitle(cve: Cve): string | null {
  const repo = cve.repositories.find((r) => r.description && r.description.trim().length > 8)
  if (!repo?.description) return null
  let t = repo.description.trim()
  // strip a leading "CVE-xxxx-yyyy" / "CVE-xxxx-yyyy:" / "[CVE...]" prefix
  t = t.replace(/^\[?\s*cve-\d{4}-\d{4,7}\s*[\]:–-]*\s*/i, '')
  t = t.replace(/\s+/g, ' ').trim()
  if (t.length < 6) return null
  return t.length > 110 ? t.slice(0, 107) + '…' : t
}

export function fromCatalog(c: CatalogCve, trendMap: Map<string, TrendCve>): IndexItem {
  const t = trendMap.get(c.id)
  return {
    cve_id: c.id,
    title: c.title || null,
    description: c.description || null,
    severity: c.severity,
    hype: t?.hype ?? null,
    kev: c.kev,
    ransomware: !!t?.kev.ransomware,
    zeroDay: t?.zero_day ?? false,
    epss: t?.epss ?? null,
    cvss: c.cvss,
    repoCount: c.repos,
    stars: c.stars,
    published: c.published,
    trending: !!t,
  }
}

export function fromTrend(t: TrendCve): IndexItem {
  return {
    cve_id: t.cve_id,
    title: t.title,
    description: t.description || null,
    severity: t.severity,
    hype: t.hype,
    kev: t.kev.in_kev,
    ransomware: !!t.kev.ransomware,
    zeroDay: t.zero_day,
    epss: t.epss,
    cvss: t.cvss,
    repoCount: t.repos.count,
    stars: t.repos.stars,
    published: t.published,
    trending: true,
  }
}

export function fromCve(c: Cve, trendMap: Map<string, TrendCve>): IndexItem {
  const t = trendMap.get(c.cve_id)
  const stars = c.repositories.reduce((s, r) => s + r.stargazers_count, 0)
  const derived = deriveTitle(c)
  return {
    cve_id: c.cve_id,
    title: t?.title ?? derived,
    description: t?.description ?? derived,
    severity: t?.severity ?? 'UNKNOWN',
    hype: t?.hype ?? null,
    kev: t?.kev.in_kev ?? false,
    ransomware: !!t?.kev.ransomware,
    zeroDay: t?.zero_day ?? false,
    epss: t?.epss ?? null,
    cvss: t?.cvss ?? null,
    repoCount: c.repositories.length,
    stars,
    trending: !!t,
    published: t?.published ?? null,
  }
}

export function cveSortYearDesc(a: string, b: string) {
  return b.localeCompare(a, undefined, { numeric: true })
}
