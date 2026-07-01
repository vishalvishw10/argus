#!/usr/bin/env node
/**
 * cve-mapping scraper — our own implementation.
 *
 * Queries the GitHub code-search API for repositories that reference a CVE ID,
 * groups them under the CVE they mention, and writes one JSON file per year to
 * public/data/<year>.json plus a public/data/index.json manifest.
 *
 * Method (and how it improves on the reference Go tool):
 *   - GitHub Search caps any query at 1000 results. When total_count > 1000 we
 *     subdivide the query by month (created:YYYY-MM-01..end). If a single month
 *     STILL exceeds 1000 we subdivide that month by day — the reference tool
 *     stops at month granularity and silently drops the overflow.
 *   - Dedupe repos by id across all sub-queries.
 *   - A repo is bucketed under every distinct CVE-<year>-<n> it mentions in its
 *     name / full_name / description / topics (regex). No match -> OTHER-<year>.
 *   - Rate-limit aware: reads x-ratelimit-remaining / x-ratelimit-reset and the
 *     secondary-limit Retry-After header, sleeps instead of hammering.
 *
 * Usage:
 *   GITHUB_TOKEN=xxx node scripts/scrape.mjs                 # all years (current down to 1999)
 *   GITHUB_TOKEN=xxx node scripts/scrape.mjs --year 2025
 *   GITHUB_TOKEN=xxx node scripts/scrape.mjs --from 2023 --to 2026
 *   GITHUB_TOKEN=xxx node scripts/scrape.mjs --year 2026 --max-pages 3   # cap for testing
 *
 * Requires Node 18+ (global fetch).
 */

import { writeFile, mkdir, readdir, readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dirname, '..')
const DATA_DIR = join(ROOT, 'public', 'data')

const API = 'https://api.github.com/search/repositories'
const PER_PAGE = 100
const RESULT_CAP = 1000 // GitHub Search hard limit per query

const TOKEN = process.env.GITHUB_TOKEN || process.env.GH_TOKEN || ''
const FIRST_YEAR = 1999

// ---------------------------------------------------------------------------
// arg parsing
// ---------------------------------------------------------------------------
function parseArgs(argv) {
  const a = { years: null, maxPages: Infinity }
  for (let i = 2; i < argv.length; i++) {
    const k = argv[i]
    if (k === '--year') a.years = [Number(argv[++i])]
    else if (k === '--from') a._from = Number(argv[++i])
    else if (k === '--to') a._to = Number(argv[++i])
    else if (k === '--max-pages') a.maxPages = Number(argv[++i])
  }
  if (!a.years) {
    const now = new Date()
    const to = a._to ?? now.getUTCFullYear()
    const from = a._from ?? FIRST_YEAR
    a.years = []
    for (let y = to; y >= from; y--) a.years.push(y)
  }
  return a
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

// ---------------------------------------------------------------------------
// HTTP with rate-limit handling
// ---------------------------------------------------------------------------
async function ghSearch(query, page) {
  const url = `${API}?q=${encodeURIComponent(query)}&sort=updated&order=desc&per_page=${PER_PAGE}&page=${page}`
  for (let attempt = 0; attempt < 6; attempt++) {
    const res = await fetch(url, {
      headers: {
        Accept: 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
        'User-Agent': 'cve-mapping-scraper',
        ...(TOKEN ? { Authorization: `Bearer ${TOKEN}` } : {}),
      },
    })

    // Secondary rate limit / abuse detection
    if (res.status === 403 || res.status === 429) {
      const retryAfter = Number(res.headers.get('retry-after'))
      const remaining = Number(res.headers.get('x-ratelimit-remaining'))
      if (retryAfter) {
        log(`  rate limited, sleeping ${retryAfter}s`)
        await sleep(retryAfter * 1000)
        continue
      }
      if (remaining === 0) {
        const reset = Number(res.headers.get('x-ratelimit-reset')) * 1000
        const wait = Math.max(2000, reset - Date.now() + 1000)
        log(`  primary limit hit, sleeping ${Math.round(wait / 1000)}s`)
        await sleep(wait)
        continue
      }
      const body = await res.text()
      throw new Error(`403/429 from GitHub: ${body.slice(0, 200)}`)
    }

    if (res.status === 422) {
      // Beyond the 1000-result window — signal caller to stop paginating.
      return { items: [], total_count: RESULT_CAP, capped: true }
    }

    if (!res.ok) {
      const body = await res.text()
      throw new Error(`HTTP ${res.status}: ${body.slice(0, 200)}`)
    }

    // Proactively throttle when the search budget runs low (30 req/min auth'd).
    const remaining = Number(res.headers.get('x-ratelimit-remaining'))
    const json = await res.json()
    if (remaining <= 1) {
      const reset = Number(res.headers.get('x-ratelimit-reset')) * 1000
      const wait = Math.max(1500, reset - Date.now() + 1000)
      log(`  search budget low, sleeping ${Math.round(wait / 1000)}s`)
      await sleep(wait)
    } else {
      await sleep(2100) // search API allows ~30 req/min authenticated -> ~2s/request
    }
    return json
  }
  throw new Error('exceeded retry budget for ' + query)
}

// Page through a single query up to the 1000-result cap.
async function fetchQuery(query, maxPages) {
  const out = []
  let total = null
  for (let page = 1; page <= maxPages; page++) {
    const data = await ghSearch(query, page)
    if (total === null) total = data.total_count ?? 0
    const items = data.items ?? []
    out.push(...items)
    if (items.length < PER_PAGE) break
    if (out.length >= RESULT_CAP) break
    if (data.capped) break
  }
  return { items: out, total: total ?? 0 }
}

const lastDay = (y, m) => new Date(Date.UTC(y, m, 0)).getUTCDate() // m: 1-12

// Fetch a whole year, subdividing by month then day when over the cap.
async function fetchYear(year, maxPages) {
  // Quoted exact phrase, default repo-search fields (name + description + topics).
  // Matches the proven reference behaviour; `in:readme` would inflate/noise results.
  const base = `"CVE-${year}-"`
  log(`year ${year}: probing total_count…`)
  const probe = await fetchQuery(base, 1)
  log(`year ${year}: GitHub reports ${probe.total} total results`)

  if (probe.total <= RESULT_CAP) {
    const { items } = await fetchQuery(base, maxPages)
    return dedupe(items)
  }

  // Over 1000 -> month subdivision
  log(`year ${year}: >1000, subdividing by month`)
  const all = []
  for (let m = 1; m <= 12; m++) {
    const start = `${year}-${String(m).padStart(2, '0')}-01`
    const end = `${year}-${String(m).padStart(2, '0')}-${String(lastDay(year, m)).padStart(2, '0')}`
    const q = `${base} created:${start}..${end}`
    const probeM = await fetchQuery(q, 1)
    if (probeM.total <= RESULT_CAP) {
      const { items } = await fetchQuery(q, maxPages)
      all.push(...items)
      log(`  ${start}..${end}: ${items.length} (of ${probeM.total})`)
    } else {
      // Month still over cap -> day subdivision
      log(`  ${start}..${end}: ${probeM.total} >1000, subdividing by day`)
      for (let d = 1; d <= lastDay(year, m); d++) {
        const day = `${year}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`
        const qd = `${base} created:${day}`
        const { items } = await fetchQuery(qd, maxPages)
        all.push(...items)
        if (items.length) log(`    ${day}: ${items.length}`)
      }
    }
  }
  return dedupe(all)
}

function dedupe(repos) {
  const seen = new Set()
  const out = []
  for (const r of repos) {
    if (seen.has(r.id)) continue
    seen.add(r.id)
    out.push(r)
  }
  return out
}

// ---------------------------------------------------------------------------
// grouping: repo -> CVE buckets
// ---------------------------------------------------------------------------
function groupByCve(repos, year) {
  const re = new RegExp(`cve-${year}-\\d+`, 'gi')
  const buckets = new Map()
  const other = `OTHER-${year}`

  for (const repo of repos) {
    const hay = [repo.name, repo.full_name, repo.description, ...(repo.topics || [])]
      .filter(Boolean)
      .join(' ')
    const matches = hay.match(re)
    const slim = slimRepo(repo)

    if (!matches) {
      push(buckets, other, slim)
      continue
    }
    for (const id of new Set(matches.map((s) => s.toUpperCase()))) {
      push(buckets, id, slim)
    }
  }

  // dedupe per-bucket by id, sort repos by stars desc
  const cves = []
  for (const [cve_id, list] of buckets) {
    const seen = new Set()
    const repos = []
    for (const r of list) {
      if (seen.has(r.id)) continue
      seen.add(r.id)
      repos.push(r)
    }
    repos.sort((a, b) => b.stargazers_count - a.stargazers_count)
    cves.push({ cve_id, repositories: repos })
  }
  cves.sort((a, b) => a.cve_id.localeCompare(b.cve_id, undefined, { numeric: true }))
  return cves
}

function push(map, key, val) {
  if (!map.has(key)) map.set(key, [])
  map.get(key).push(val)
}

function slimRepo(r) {
  return {
    id: r.id,
    name: r.name,
    full_name: r.full_name,
    html_url: r.html_url,
    description: r.description,
    stargazers_count: r.stargazers_count,
    forks_count: r.forks_count,
    language: r.language,
    updated_at: r.updated_at,
    pushed_at: r.pushed_at,
    created_at: r.created_at,
    topics: r.topics || [],
    owner: { login: r.owner?.login, html_url: r.owner?.html_url },
    clone_url: r.clone_url,
  }
}

// ---------------------------------------------------------------------------
// index manifest (rebuilt from whatever year files exist)
// ---------------------------------------------------------------------------
async function buildIndex() {
  const files = (await readdir(DATA_DIR)).filter((f) => /^\d{4}\.json$/.test(f))
  const years = []
  for (const f of files) {
    const d = JSON.parse(await readFile(join(DATA_DIR, f), 'utf8'))
    years.push({
      year: d.year,
      cve_count: d.cves.length,
      repo_count: d.cves.reduce((s, c) => s + c.repositories.length, 0),
    })
  }
  years.sort((a, b) => b.year - a.year)
  const idx = { generated_at: new Date().toISOString(), years }
  await writeFile(join(DATA_DIR, 'index.json'), JSON.stringify(idx, null, 2))
  log(`index.json: ${years.length} years`)
}

function log(...m) {
  console.log(...m)
}

// ---------------------------------------------------------------------------
// main
// ---------------------------------------------------------------------------
async function main() {
  if (!TOKEN) {
    console.error('ERROR: set GITHUB_TOKEN (a classic or fine-grained PAT, public_repo scope is enough).')
    process.exit(1)
  }
  const { years, maxPages } = parseArgs(process.argv)
  await mkdir(DATA_DIR, { recursive: true })

  for (const year of years) {
    const t0 = Date.now()
    const repos = await fetchYear(year, maxPages)
    const cves = groupByCve(repos, year)
    const realCves = cves.filter((c) => c.cve_id.startsWith('CVE-')).length
    await writeFile(
      join(DATA_DIR, `${year}.json`),
      JSON.stringify({ year, cves }, null, 2),
    )
    log(
      `✓ ${year}: ${repos.length} repos -> ${realCves} CVEs (+OTHER) in ${(
        (Date.now() - t0) / 1000
      ).toFixed(1)}s\n`,
    )
  }

  await buildIndex()
  log('done.')
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
