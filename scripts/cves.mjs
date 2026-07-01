#!/usr/bin/env node
/**
 * Full CVE catalog ingestion from the NVD API 2.0.
 *
 * Unlike scrape.mjs (which only finds CVEs that have a public GitHub PoC repo),
 * this pulls EVERY CVE for a year — with title, description, CVSS, CWE, KEV
 * status and reference count — so no CVE is ever "missing" from the dashboard.
 * Exploit-repo counts are merged in from the scrape output when present.
 *
 * Output: public/data/cve/<year>.json  + public/data/cve/index.json
 *
 * Usage:
 *   node scripts/cves.mjs --year 2026
 *   node scripts/cves.mjs --from 2024 --to 2026
 *   node scripts/cves.mjs --since 2026-06-30T00:00:00.000   # incremental (lastMod)
 * Env: NVD_API_KEY (strongly recommended — 50 req/30s vs 5 req/30s)
 */

import { writeFile, mkdir, readFile, readdir } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dirname, '..')
const DATA_DIR = join(ROOT, 'public', 'data')
const CVE_DIR = join(DATA_DIR, 'cve')

const API = 'https://services.nvd.nist.gov/rest/json/cves/2.0'
const PER_PAGE = 200 // large pages time out for anonymous callers; 200 is reliable
const WINDOW_DAYS = 110 // NVD allows max 120 days per date range
const API_KEY = process.env.NVD_API_KEY || ''
const PACE = API_KEY ? 700 : 6300 // 50/30s vs 5/30s
const DESC_MAX = 320
const TITLE_MAX = 110

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const log = (...m) => console.log(...m)

function arg(flag) {
  const i = process.argv.indexOf(flag)
  return i >= 0 ? process.argv[i + 1] : null
}

async function getJson(url) {
  let lastErr
  for (let attempt = 0; attempt < 8; attempt++) {
    try {
      const res = await fetch(url, {
        headers: { 'User-Agent': 'argus-catalog/1.0', ...(API_KEY ? { apiKey: API_KEY } : {}) },
      })
      if (res.status === 403 || res.status === 429 || res.status >= 500) {
        const wait = PACE * (attempt + 2)
        log(`  ${res.status} from NVD, backing off ${Math.round(wait / 1000)}s`)
        await sleep(wait)
        continue
      }
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      return await res.json() // parse inside try so truncated bodies retry
    } catch (e) {
      lastErr = e
      const wait = PACE * (attempt + 2)
      log(`  network error (${e.message || e.code || 'fetch'}), retry in ${Math.round(wait / 1000)}s`)
      await sleep(wait)
    }
  }
  throw lastErr || new Error('exceeded retry budget: ' + url)
}

// ---- extraction helpers ----
function pickMetric(m = {}) {
  const pick = (arr) => arr?.find((x) => x.type === 'Primary') || arr?.[0]
  return pick(m.cvssMetricV31) || pick(m.cvssMetricV30) || pick(m.cvssMetricV2)
}
function severityFromCvss(s) {
  if (s == null) return 'UNKNOWN'
  if (s >= 9) return 'CRITICAL'
  if (s >= 7) return 'HIGH'
  if (s >= 4) return 'MEDIUM'
  if (s > 0) return 'LOW'
  return 'UNKNOWN'
}
function clip(s, n) {
  s = (s || '').replace(/\s+/g, ' ').trim()
  return s.length > n ? s.slice(0, n - 1) + '…' : s
}
function titleFrom(cve, desc) {
  if (cve.cisaVulnerabilityName) return clip(cve.cisaVulnerabilityName, TITLE_MAX)
  const first = desc.split(/(?<=[.])\s/)[0]
  return clip(first || desc, TITLE_MAX)
}

function toRecord(cve) {
  const desc = cve.descriptions?.find((d) => d.lang === 'en')?.value || ''
  const metric = pickMetric(cve.metrics)
  const cvss = metric?.cvssData?.baseScore ?? null
  const sevRaw = metric?.cvssData?.baseSeverity
  let cwe = null
  for (const w of cve.weaknesses || []) {
    const d = w.description?.find((x) => /^CWE-/.test(x.value))
    if (d) { cwe = d.value; break }
  }
  return {
    id: cve.id,
    title: titleFrom(cve, desc),
    description: clip(desc, DESC_MAX),
    cvss,
    severity: sevRaw || severityFromCvss(cvss),
    cwe,
    published: cve.published || null,
    last_modified: cve.lastModified || null,
    kev: !!cve.cisaExploitAdd,
    kev_date: cve.cisaExploitAdd || null,
    refs: (cve.references || []).length,
    repos: 0, // merged below from the exploit-map scrape
    stars: 0,
  }
}

// page through one date window. Returns false if it bailed early (so callers
// keep whatever was collected rather than discarding the whole year).
async function fetchWindow(params, into) {
  let startIndex = 0
  for (;;) {
    const url = `${API}?${params}&resultsPerPage=${PER_PAGE}&startIndex=${startIndex}`
    let data
    try {
      data = await getJson(url)
    } catch (e) {
      log(`  window page @${startIndex} failed permanently (${e.message || e}); keeping partial`)
      return false
    }
    for (const item of data.vulnerabilities || []) {
      const r = toRecord(item.cve)
      into.set(r.id, r)
    }
    const total = data.totalResults || 0
    startIndex += PER_PAGE
    log(`    ${Math.min(startIndex, total)}/${total}`)
    if (startIndex >= total) break
    await sleep(PACE)
  }
  return true
}

const fmt = (d) => d.toISOString().slice(0, 23)

async function fetchYear(year) {
  const map = new Map()
  let cursor = new Date(Date.UTC(year, 0, 1))
  const end = new Date(Date.UTC(year, 11, 31, 23, 59, 59))
  const now = new Date()
  while (cursor < end && cursor < now) {
    const winEnd = new Date(Math.min(cursor.getTime() + WINDOW_DAYS * 86400_000, end.getTime(), now.getTime()))
    log(`  window ${fmt(cursor).slice(0, 10)} … ${fmt(winEnd).slice(0, 10)}`)
    await fetchWindow(`pubStartDate=${fmt(cursor)}&pubEndDate=${fmt(winEnd)}`, map)
    cursor = new Date(winEnd.getTime() + 1000)
    await sleep(PACE)
  }
  return map
}

// merge exploit-repo counts from public/data/<year>.json
async function mergeRepos(year, map) {
  try {
    const d = JSON.parse(await readFile(join(DATA_DIR, `${year}.json`), 'utf8'))
    for (const cve of d.cves) {
      const r = map.get(cve.cve_id)
      if (r) {
        r.repos = cve.repositories.length
        r.stars = cve.repositories.reduce((s, x) => s + x.stargazers_count, 0)
      }
    }
  } catch {
    /* no scrape file for this year */
  }
}

async function writeYear(year, map) {
  const cves = [...map.values()].sort((a, b) => b.id.localeCompare(a.id, undefined, { numeric: true }))
  await mkdir(CVE_DIR, { recursive: true })
  await writeFile(join(CVE_DIR, `${year}.json`), JSON.stringify({ year, generated_at: new Date().toISOString(), count: cves.length, cves }))
  const kev = cves.filter((c) => c.kev).length
  const sev = cves.reduce((a, c) => ((a[c.severity] = (a[c.severity] || 0) + 1), a), {})
  log(`✓ ${year}: ${cves.length} CVEs (${kev} KEV) ${JSON.stringify(sev)}`)
}

async function buildIndex() {
  const files = (await readdir(CVE_DIR)).filter((f) => /^\d{4}\.json$/.test(f))
  const years = []
  for (const f of files) {
    const d = JSON.parse(await readFile(join(CVE_DIR, f), 'utf8'))
    years.push({
      year: d.year,
      count: d.count ?? d.cves.length,
      kev: d.cves.filter((c) => c.kev).length,
    })
  }
  years.sort((a, b) => b.year - a.year)
  await writeFile(join(CVE_DIR, 'index.json'), JSON.stringify({ generated_at: new Date().toISOString(), years }, null, 2))
  log(`index.json: ${years.length} years, ${years.reduce((s, y) => s + y.count, 0)} CVEs`)
}

// group a flat map of records by CVE year, merge into existing files, write
async function groupMergeWrite(map) {
  const byYear = new Map()
  for (const r of map.values()) {
    const y = Number(r.id.match(/CVE-(\d{4})-/)?.[1])
    if (!y) continue
    if (!byYear.has(y)) byYear.set(y, new Map())
    byYear.get(y).set(r.id, r)
  }
  for (const [year, updates] of byYear) {
    let existing = new Map()
    try {
      const d = JSON.parse(await readFile(join(CVE_DIR, `${year}.json`), 'utf8'))
      existing = new Map(d.cves.map((c) => [c.id, c]))
    } catch {
      /* new year file */
    }
    for (const [id, r] of updates) existing.set(id, r)
    await mergeRepos(year, existing)
    await writeYear(year, existing)
  }
  await buildIndex()
  log(`merged ${map.size} CVEs across ${byYear.size} years`)
}

// pull all CVEs in a published-date range into `map`
async function pullRange(start, end, params = 'pubStartDate', endParam = 'pubEndDate', map = new Map()) {
  let cursor = new Date(start)
  const stop = new Date(end)
  while (cursor < stop) {
    const winEnd = new Date(Math.min(cursor.getTime() + WINDOW_DAYS * 86400_000, stop.getTime()))
    log(`  ${params.includes('lastMod') ? 'lastMod' : 'published'} ${fmt(cursor).slice(0, 10)} … ${fmt(winEnd).slice(0, 10)}`)
    await fetchWindow(`${params}=${fmt(cursor)}&${endParam}=${fmt(winEnd)}`, map)
    cursor = new Date(winEnd.getTime() + 1000)
    await sleep(PACE)
  }
  return map
}

// fetch specific CVE IDs individually (fast single-record calls) and merge
async function pullIds(ids, map = new Map()) {
  for (const id of ids) {
    try {
      const d = await getJson(`${API}?cveId=${id}`)
      const item = d?.vulnerabilities?.[0]?.cve
      if (item) map.set(id, toRecord(item))
    } catch {
      /* skip */
    }
    await sleep(PACE)
  }
  return map
}

// incremental: pull CVEs modified since <iso>, merge into the right year files
async function incremental(since) {
  const map = await pullRange(since, new Date(), 'lastModStartDate', 'lastModEndDate')
  await groupMergeWrite(map)
}

async function main() {
  await mkdir(CVE_DIR, { recursive: true })
  const since = arg('--since')
  if (since) {
    log(`Incremental catalog update since ${since}`)
    await incremental(since)
    return
  }

  // recent-window seed: published in the last N days (+ optional explicit IDs)
  const days = arg('--days')
  if (days) {
    const end = new Date()
    const start = new Date(end.getTime() - Number(days) * 86400_000)
    log(`Recent pull: CVEs published in the last ${days} days`)
    const map = await pullRange(start, end)
    const inc = arg('--include')
    if (inc) {
      log(`Including specific IDs: ${inc}`)
      await pullIds(inc.split(',').map((s) => s.trim()), map)
    }
    await groupMergeWrite(map)
    return
  }

  let years = []
  const single = arg('--year')
  if (single) years = [Number(single)]
  else {
    const to = Number(arg('--to') || new Date().getUTCFullYear())
    const from = Number(arg('--from') || to)
    for (let y = to; y >= from; y--) years.push(y)
  }

  for (const year of years) {
    log(`\n=== ${year} ===`)
    const map = await fetchYear(year)
    await mergeRepos(year, map)
    await writeYear(year, map)
  }
  await buildIndex()
  log('\ndone.')
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
