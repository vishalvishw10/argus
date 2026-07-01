export interface Owner {
  login: string
  html_url: string
}

export interface Repo {
  id: number
  name: string
  full_name: string
  html_url: string
  description: string | null
  stargazers_count: number
  forks_count: number
  language: string | null
  updated_at: string
  pushed_at: string
  created_at: string
  topics: string[]
  owner: Owner
  clone_url: string
}

export interface Cve {
  cve_id: string
  repositories: Repo[]
}

export interface YearData {
  year: number
  cves: Cve[]
}

export interface IndexYear {
  year: number
  cve_count: number
  repo_count: number
}

export interface DataIndex {
  generated_at: string
  years: IndexYear[]
}

export type SortKey = 'updated' | 'stars' | 'forks' | 'repos' | 'cve'

// ---- Trending intelligence ----
export type Severity = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'UNKNOWN'

export interface MediaItem {
  source: string
  title: string
  url: string
  date: string | null
}

export interface TrendRepoRef {
  full_name: string
  html_url: string
  stars: number
}

export interface TrendCve {
  cve_id: string
  title: string
  vendor: string | null
  product: string | null
  description: string
  cvss: number | null
  severity: Severity
  epss: number | null
  epss_pct: number | null
  cwe: string | null
  published: string | null
  kev: {
    in_kev: boolean
    date_added?: string
    due_date?: string
    ransomware?: boolean
  }
  zero_day: boolean
  no_patch: boolean
  hype: number
  rising: number
  rank: number
  repos: { count: number; stars: number; top: TrendRepoRef[] }
  media: MediaItem[]
  reddit: { ups: number; posts: { title: string; url: string; ups: number; sub: string }[] } | null
  tags: string[]
  timeline: { date: string; label: string }[]
}

export interface SourceStatus {
  name: string
  status: 'ok' | 'error' | 'skipped'
  detail: string
}

export interface TrendingData {
  generated_at: string
  window_days: number
  stats: {
    trending_count: number
    media_mentions: number
    reddit_upvotes: number
    kev_count: number
    kev_total: number
    sources_live: number
    window_days: number
  }
  sources: SourceStatus[]
  cves: TrendCve[]
}

export type TrendSort = 'hype' | 'rising' | 'cvss' | 'epss' | 'newest'

// ---- Full CVE catalog (NVD-backed) ----
export interface CatalogCve {
  id: string
  title: string
  description: string
  cvss: number | null
  severity: Severity
  cwe: string | null
  published: string | null
  last_modified: string | null
  kev: boolean
  kev_date: string | null
  refs: number
  repos: number
  stars: number
}

export interface CatalogYear {
  year: number
  generated_at: string
  count: number
  cves: CatalogCve[]
}

export interface CatalogIndex {
  generated_at: string
  years: { year: number; count: number; kev: number }[]
}

export type CatalogSort = 'newest' | 'cvss' | 'kev' | 'repos' | 'cve'
