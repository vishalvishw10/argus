import type { Severity } from '../types'

export interface CveDetail {
  cve_id: string
  description: string
  cvss: number | null
  cvssVector: string | null
  severity: Severity
  cwe: string | null
  published: string | null
  lastModified: string | null
  kev: { in_kev: boolean; date_added?: string; due_date?: string; name?: string }
  epss: number | null
  references: { url: string; tags: string[] }[]
  source: 'nvd' | 'partial'
}

const cache = new Map<string, CveDetail>()
const inflight = new Map<string, Promise<CveDetail | null>>()

export function severityFromCvss(s: number | null): Severity {
  if (s == null) return 'UNKNOWN'
  if (s >= 9) return 'CRITICAL'
  if (s >= 7) return 'HIGH'
  if (s >= 4) return 'MEDIUM'
  if (s > 0) return 'LOW'
  return 'UNKNOWN'
}

function parseNvd(json: any, id: string): CveDetail | null {
  const item = json?.vulnerabilities?.[0]?.cve
  if (!item) return null
  const description = item.descriptions?.find((d: any) => d.lang === 'en')?.value || ''

  const m = item.metrics || {}
  const pick = (arr: any[]) => arr?.find((x) => x.type === 'Primary') || arr?.[0]
  const metric = pick(m.cvssMetricV31) || pick(m.cvssMetricV30) || pick(m.cvssMetricV2)
  const cvss = metric?.cvssData?.baseScore ?? null
  const cvssVector = metric?.cvssData?.vectorString ?? null
  const sevRaw = metric?.cvssData?.baseSeverity || metric?.baseSeverity

  let cwe: string | null = null
  for (const w of item.weaknesses || []) {
    const d = w.description?.find((x: any) => /^CWE-/.test(x.value))
    if (d) {
      cwe = d.value
      break
    }
  }

  const inKev = !!item.cisaExploitAdd
  return {
    cve_id: id,
    description,
    cvss,
    cvssVector,
    severity: (sevRaw as Severity) || severityFromCvss(cvss),
    cwe,
    published: item.published || null,
    lastModified: item.lastModified || null,
    kev: inKev
      ? { in_kev: true, date_added: item.cisaExploitAdd, due_date: item.cisaActionDue, name: item.cisaVulnerabilityName }
      : { in_kev: false },
    epss: null,
    references: (item.references || []).slice(0, 12).map((r: any) => ({ url: r.url, tags: r.tags || [] })),
    source: 'nvd',
  }
}

export async function fetchCveDetail(cveId: string): Promise<CveDetail | null> {
  const id = cveId.toUpperCase()
  if (cache.has(id)) return cache.get(id)!
  if (inflight.has(id)) return inflight.get(id)!

  const p = (async () => {
    let detail: CveDetail | null = null
    try {
      const res = await fetch(`https://services.nvd.nist.gov/rest/json/cves/2.0?cveId=${id}`)
      if (res.ok) detail = parseNvd(await res.json(), id)
    } catch {
      /* network/CORS/rate-limit — fall through */
    }
    // best-effort EPSS (non-blocking quality bump)
    if (detail) {
      try {
        const e = await fetch(`https://api.first.org/data/v1/epss?cve=${id}`)
        if (e.ok) {
          const j = await e.json()
          const row = j?.data?.[0]
          if (row) detail.epss = Number(row.epss)
        }
      } catch {
        /* ignore */
      }
      cache.set(id, detail)
    }
    inflight.delete(id)
    return detail
  })()

  inflight.set(id, p)
  return p
}
