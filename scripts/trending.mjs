#!/usr/bin/env node
/**
 * Trending CVE intelligence aggregator.
 *
 * Correlates multiple free, authoritative sources by CVE ID and computes a
 * transparent "hype" score, then writes public/data/trending.json for the UI.
 *
 * Sources (all fetched server-side — no CORS limits in CI):
 *   - CISA KEV          actively-exploited catalog (JSON)
 *   - NVD API 2.0       recent CRITICAL/HIGH CVEs (CVSS, CWE, description)
 *   - FIRST EPSS        exploit-probability scores (batched)
 *   - RSS news          BleepingComputer, The Hacker News, Dark Reading,
 *                       SecurityWeek, The Record (CVE mentions in headlines)
 *   - GitHub PoCs       reused from our own public/data/<year>.json exploit map
 *   - Reddit (optional) r/netsec, r/cybersecurity, r/sysadmin, r/blueteamsec
 *                       — requires OAuth; skipped gracefully if unavailable
 *
 * Usage:  node scripts/trending.mjs [--days 14] [--max-nvd 600]
 * Env:    GITHUB_TOKEN (optional, for higher GitHub limits — data is read from
 *         disk so it's only needed if you also re-run the exploit scrape)
 *         REDDIT_CLIENT_ID / REDDIT_CLIENT_SECRET (optional)
 */

import { writeFile, mkdir, readFile, readdir } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dirname, '..')
const DATA_DIR = join(ROOT, 'public', 'data')

const DAYS = argNum('--days', 30) // recency window for "newly published" candidates
const MAX_NVD = argNum('--max-nvd', 1500)
const UA = 'CVEPulse-aggregator/1.0 (+https://github.com)'
const CVE_RE = /CVE-\d{4}-\d{4,7}/gi

const RSS_FEEDS = [
  { name: 'BleepingComputer', url: 'https://www.bleepingcomputer.com/feed/' },
  { name: 'The Hacker News', url: 'https://feeds.feedburner.com/TheHackersNews' },
  { name: 'Dark Reading', url: 'https://www.darkreading.com/rss.xml' },
  { name: 'SecurityWeek', url: 'https://www.securityweek.com/feed/' },
  { name: 'The Record', url: 'https://therecord.media/feed/' },
]

const REDDIT_SUBS = ['netsec', 'cybersecurity', 'sysadmin', 'blueteamsec']

function argNum(flag, def) {
  const i = process.argv.indexOf(flag)
  return i >= 0 ? Number(process.argv[i + 1]) : def
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const log = (...m) => console.log(...m)
const nowMs = Date.now()
const daysAgo = (n) => new Date(nowMs - n * 86400_000)
const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, n))

async function getText(url, opts = {}) {
  const res = await fetch(url, { headers: { 'User-Agent': UA, ...(opts.headers || {}) } })
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`)
  return res.text()
}
async function getJson(url, opts = {}) {
  const res = await fetch(url, {
    headers: { 'User-Agent': UA, Accept: 'application/json', ...(opts.headers || {}) },
  })
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`)
  return res.json()
}

// ---------------------------------------------------------------------------
// Source 1: CISA KEV
// ---------------------------------------------------------------------------
async function fetchKev() {
  const d = await getJson(
    'https://www.cisa.gov/sites/default/files/feeds/known_exploited_vulnerabilities.json',
  )
  const map = new Map()
  for (const v of d.vulnerabilities || []) {
    map.set(v.cveID.toUpperCase(), {
      dateAdded: v.dateAdded,
      dueDate: v.dueDate,
      vendor: v.vendorProject,
      product: v.product,
      name: v.vulnerabilityName,
      shortDescription: v.shortDescription,
      // field is exactly "Known" | "Unknown" — must be an exact match, since
      // a substring test (/known/) also matches "Unknown".
      ransomware: (v.knownRansomwareCampaignUse || '').trim().toLowerCase() === 'known',
    })
  }
  return { map, count: d.count ?? map.size }
}

// ---------------------------------------------------------------------------
// Source 2: NVD recent CRITICAL/HIGH
// ---------------------------------------------------------------------------
async function fetchNvd() {
  const out = new Map()
  const end = new Date(nowMs)
  const start = daysAgo(DAYS)
  const fmt = (d) => d.toISOString().slice(0, 23)
  const apiKey = process.env.NVD_API_KEY

  for (const sev of ['CRITICAL', 'HIGH', 'MEDIUM']) {
    let startIndex = 0
    for (let guard = 0; guard < 6; guard++) {
      const url =
        `https://services.nvd.nist.gov/rest/json/cves/2.0?` +
        `pubStartDate=${fmt(start)}&pubEndDate=${fmt(end)}` +
        `&cvssV3Severity=${sev}&resultsPerPage=200&startIndex=${startIndex}`
      let data
      try {
        data = await getJson(url, apiKey ? { headers: { apiKey } } : {})
      } catch (e) {
        log(`  NVD ${sev} @${startIndex} failed: ${e.message}; retrying once`)
        await sleep(6500)
        try {
          data = await getJson(url, apiKey ? { headers: { apiKey } } : {})
        } catch {
          break
        }
      }
      for (const item of data.vulnerabilities || []) {
        const c = item.cve
        const id = c.id.toUpperCase()
        if (out.has(id)) continue
        out.set(id, {
          published: c.published,
          lastModified: c.lastModified,
          description: c.descriptions?.find((x) => x.lang === 'en')?.value || '',
          cvss: extractCvss(c),
          severity: sev,
          cwe: extractCwe(c),
        })
      }
      startIndex += 200
      if (startIndex >= (data.totalResults || 0) || out.size >= MAX_NVD) break
      await sleep(apiKey ? 800 : 6500) // public NVD: 5 req / 30s
    }
    if (out.size >= MAX_NVD) break
  }
  return out
}

function extractCvss(c) {
  const m = c.metrics || {}
  const pick = (arr) => arr?.find((x) => x.type === 'Primary') || arr?.[0]
  const v31 = pick(m.cvssMetricV31)
  const v30 = pick(m.cvssMetricV30)
  const v2 = pick(m.cvssMetricV2)
  const data = v31?.cvssData || v30?.cvssData || v2?.cvssData
  return data?.baseScore ?? null
}
function extractCwe(c) {
  for (const w of c.weaknesses || []) {
    const d = w.description?.find((x) => /^CWE-/.test(x.value))
    if (d) return d.value
  }
  return null
}

// ---------------------------------------------------------------------------
// Source 3: FIRST EPSS (batched)
// ---------------------------------------------------------------------------
async function fetchEpss(cveIds) {
  const out = new Map()
  const ids = [...cveIds]
  for (let i = 0; i < ids.length; i += 100) {
    const batch = ids.slice(i, i + 100)
    try {
      const d = await getJson(
        `https://api.first.org/data/v1/epss?cve=${batch.join(',')}&pretty=false`,
      )
      for (const row of d.data || []) {
        out.set(row.cve.toUpperCase(), {
          epss: Number(row.epss),
          percentile: Number(row.percentile),
        })
      }
    } catch (e) {
      log(`  EPSS batch failed: ${e.message}`)
    }
    await sleep(400)
  }
  return out
}

// ---------------------------------------------------------------------------
// Source 4: RSS news feeds
// ---------------------------------------------------------------------------
async function fetchRss() {
  const mentions = new Map() // cveId -> [{source,title,url,date}]
  const liveSources = []

  for (const feed of RSS_FEEDS) {
    try {
      const xml = await getText(feed.url)
      const items = parseRssItems(xml)
      let hits = 0
      for (const it of items) {
        const found = new Set((`${it.title} ${it.summary}`.match(CVE_RE) || []).map((s) => s.toUpperCase()))
        for (const cve of found) {
          if (!mentions.has(cve)) mentions.set(cve, [])
          mentions.get(cve).push({ source: feed.name, title: it.title, url: it.link, date: it.date })
          hits++
        }
      }
      liveSources.push({ name: feed.name, status: 'ok', items: items.length, cveHits: hits })
      log(`  RSS ${feed.name}: ${items.length} items, ${hits} CVE mentions`)
    } catch (e) {
      liveSources.push({ name: feed.name, status: 'error', items: 0, cveHits: 0 })
      log(`  RSS ${feed.name} failed: ${e.message}`)
    }
  }
  return { mentions, liveSources }
}

function parseRssItems(xml) {
  const items = []
  const blocks = xml.split(/<item[\s>]/i).slice(1)
  const entryBlocks = blocks.length ? blocks : xml.split(/<entry[\s>]/i).slice(1)
  for (const b of entryBlocks) {
    const title = decode(tag(b, 'title'))
    const link = decode(tag(b, 'link') || attr(b, 'link', 'href'))
    const summary = decode(tag(b, 'description') || tag(b, 'summary') || tag(b, 'content'))
    const date = tag(b, 'pubDate') || tag(b, 'published') || tag(b, 'updated') || ''
    if (title) items.push({ title, link, summary, date: normDate(date) })
  }
  return items
}
function tag(s, name) {
  const m = s.match(new RegExp(`<${name}[^>]*>([\\s\\S]*?)<\\/${name}>`, 'i'))
  if (!m) return ''
  return m[1].replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1').trim()
}
function attr(s, name, a) {
  const m = s.match(new RegExp(`<${name}[^>]*\\b${a}="([^"]*)"`, 'i'))
  return m ? m[1] : ''
}
function decode(s) {
  return (s || '')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;|&apos;/g, "'")
    .replace(/&amp;/g, '&')
    .replace(/<[^>]+>/g, '')
    .trim()
}
function normDate(s) {
  const d = new Date(s)
  return Number.isNaN(d.getTime()) ? null : d.toISOString()
}

// ---------------------------------------------------------------------------
// Source 5: GitHub PoC repos (reuse our own exploit-map data on disk)
// ---------------------------------------------------------------------------
async function loadGithubMap(years) {
  const map = new Map()
  for (const y of years) {
    try {
      const d = JSON.parse(await readFile(join(DATA_DIR, `${y}.json`), 'utf8'))
      for (const cve of d.cves) {
        if (!cve.cve_id.startsWith('CVE-')) continue
        const repos = cve.repositories
        map.set(cve.cve_id.toUpperCase(), {
          count: repos.length,
          stars: repos.reduce((s, r) => s + r.stargazers_count, 0),
          top: repos.slice(0, 3).map((r) => ({
            full_name: r.full_name,
            html_url: r.html_url,
            stars: r.stargazers_count,
          })),
        })
      }
    } catch {
      /* year file may not exist */
    }
  }
  return map
}

// ---------------------------------------------------------------------------
// Source 6: Reddit (optional, OAuth)
// ---------------------------------------------------------------------------
async function fetchReddit() {
  const id = process.env.REDDIT_CLIENT_ID
  const secret = process.env.REDDIT_CLIENT_SECRET
  if (!id || !secret) {
    log('  Reddit: no credentials, skipping (set REDDIT_CLIENT_ID/SECRET to enable)')
    return { mentions: new Map(), status: 'skipped', upvotes: 0 }
  }
  try {
    const tokRes = await fetch('https://www.reddit.com/api/v1/access_token', {
      method: 'POST',
      headers: {
        Authorization: 'Basic ' + Buffer.from(`${id}:${secret}`).toString('base64'),
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': UA,
      },
      body: 'grant_type=client_credentials',
    })
    const { access_token } = await tokRes.json()
    const mentions = new Map()
    let upvotes = 0
    for (const sub of REDDIT_SUBS) {
      const d = await getJson(`https://oauth.reddit.com/r/${sub}/new?limit=50`, {
        headers: { Authorization: `Bearer ${access_token}` },
      })
      for (const { data: p } of d.data?.children || []) {
        const found = new Set((`${p.title} ${p.selftext || ''}`.match(CVE_RE) || []).map((s) => s.toUpperCase()))
        for (const cve of found) {
          if (!mentions.has(cve)) mentions.set(cve, { ups: 0, posts: [] })
          mentions.get(cve).ups += p.ups
          mentions.get(cve).posts.push({ title: p.title, url: `https://reddit.com${p.permalink}`, ups: p.ups, sub })
          upvotes += p.ups
        }
      }
      await sleep(800)
    }
    return { mentions, status: 'ok', upvotes }
  } catch (e) {
    log(`  Reddit failed: ${e.message}`)
    return { mentions: new Map(), status: 'error', upvotes: 0 }
  }
}

// ---------------------------------------------------------------------------
// Scoring + assembly
// ---------------------------------------------------------------------------
function recencyBoost(iso, span) {
  if (!iso) return 0
  const age = (nowMs - new Date(iso).getTime()) / 86400_000
  if (age < 0 || age > span) return 0
  return 1 - age / span
}

function buildRecord(cveId, ctx) {
  const kev = ctx.kev.get(cveId)
  const nvd = ctx.nvd.get(cveId)
  const epss = ctx.epss.get(cveId)
  const gh = ctx.github.get(cveId)
  const media = ctx.rss.get(cveId) || []
  const reddit = ctx.reddit.get(cveId)

  const cvss = nvd?.cvss ?? null
  // Honest severity: from CVSS when known, else the NVD bucket it came from,
  // else UNKNOWN. (No more blanket KEV->CRITICAL — that mislabeled HIGH/MEDIUM.)
  const severity = severityFromCvss(cvss) || nvd?.severity || 'UNKNOWN'
  const published = nvd?.published || null
  const epssVal = epss?.epss ?? null

  // patch / zero-day heuristics from headlines + KEV timing
  const mediaText = media.map((m) => m.title).join(' ').toLowerCase()
  const zeroDay = /zero[- ]?day|0[- ]?day|in[- ]the[- ]wild/.test(mediaText) ||
    (!!kev && !!published && new Date(kev.dateAdded) - new Date(published) <= 3 * 86400_000)
  const patchMentioned = /patch|fix|update|hotfix|mitigation/.test(mediaText)
  const noPatch = /no patch|unpatched|no fix|workaround only/.test(mediaText) || (!!kev && !patchMentioned)

  // --- hype score (0..100) ---
  let hype = 0
  if (kev) hype += 34 + (kev.ransomware ? 8 : 0) + 8 * recencyBoost(kev.dateAdded, 14)
  hype += clamp(media.length * 7, 0, 26)
  hype += media.reduce((s, m) => s + 4 * recencyBoost(m.date, 7), 0)
  if (cvss != null) hype += (cvss / 10) * 12
  if (epssVal != null) hype += epssVal * 14
  if (gh) hype += clamp(Math.log10(gh.stars + 1) * 4 + gh.count * 0.6, 0, 12)
  if (reddit) hype += clamp(Math.log10(reddit.ups + 1) * 4, 0, 8)
  hype += 6 * recencyBoost(published, DAYS)
  hype = Math.round(clamp(hype, 0, 100))

  // "rising" = freshness-weighted momentum
  const rising = Math.round(
    100 *
      clamp(
        media.reduce((s, m) => s + recencyBoost(m.date, 3), 0) * 0.4 +
          (kev ? recencyBoost(kev.dateAdded, 5) * 0.4 : 0) +
          recencyBoost(published, 5) * 0.2,
        0,
        1,
      ),
  )

  const title =
    kev?.name ||
    (nvd?.description ? firstSentence(nvd.description) : null) ||
    `${cveId}`

  const tags = []
  if (kev) tags.push('kev', 'actively-exploited')
  if (kev?.ransomware) tags.push('ransomware')
  if (zeroDay) tags.push('zero-day')
  if (media.length) tags.push('in-the-news')
  if (epssVal != null && epssVal >= 0.5) tags.push('high-epss')
  if (gh && gh.count) tags.push('poc-available')

  const timeline = []
  if (published) timeline.push({ date: published.slice(0, 10), label: 'Published to NVD' })
  if (kev) timeline.push({ date: kev.dateAdded, label: 'Added to CISA KEV — confirmed exploitation' })
  if (media.length) {
    const srcs = [...new Set(media.map((m) => m.source))].slice(0, 4).join(', ')
    timeline.push({ date: (media[0].date || '').slice(0, 10), label: `Covered by ${srcs}` })
  }
  timeline.sort((a, b) => (a.date || '').localeCompare(b.date || ''))

  return {
    cve_id: cveId,
    title,
    vendor: kev?.vendor || null,
    product: kev?.product || null,
    description: nvd?.description || kev?.shortDescription || '',
    cvss,
    severity,
    epss: epssVal,
    epss_pct: epss?.percentile ?? null,
    cwe: nvd?.cwe || null,
    published,
    kev: kev
      ? { in_kev: true, date_added: kev.dateAdded, due_date: kev.dueDate, ransomware: kev.ransomware }
      : { in_kev: false },
    zero_day: zeroDay,
    no_patch: noPatch,
    hype,
    rising,
    repos: gh || { count: 0, stars: 0, top: [] },
    media: media
      .slice()
      .sort((a, b) => (b.date || '').localeCompare(a.date || ''))
      .slice(0, 8),
    reddit: reddit ? { ups: reddit.ups, posts: reddit.posts.slice(0, 5) } : null,
    tags,
    timeline,
  }
}

function severityFromCvss(s) {
  if (s == null) return null
  if (s >= 9) return 'CRITICAL'
  if (s >= 7) return 'HIGH'
  if (s >= 4) return 'MEDIUM'
  return 'LOW'
}

// Fill in true CVSS/severity for the displayed records that still lack a score
// (typically older KEV CVEs outside the recent NVD window). Bounded to the
// records we actually show, so it's a small, fast pass with an API key.
async function enrichSeverity(records) {
  const apiKey = process.env.NVD_API_KEY
  const todo = records.filter((r) => r.cvss == null)
  if (!todo.length) return
  log(`Enriching ${todo.length} records missing CVSS via per-CVE NVD…`)
  for (const r of todo) {
    try {
      const d = await getJson(
        `https://services.nvd.nist.gov/rest/json/cves/2.0?cveId=${r.cve_id}`,
        apiKey ? { headers: { apiKey } } : {},
      )
      const item = d?.vulnerabilities?.[0]?.cve
      if (item) {
        const cvss = extractCvss(item)
        const m = item.metrics || {}
        const pick = (a) => a?.find((x) => x.type === 'Primary') || a?.[0]
        const baseSev = pick(m.cvssMetricV31)?.cvssData?.baseSeverity || pick(m.cvssMetricV30)?.cvssData?.baseSeverity
        if (cvss != null) {
          r.cvss = cvss
          r.severity = severityFromCvss(cvss)
        } else if (baseSev) {
          r.severity = baseSev
        }
        if (!r.cwe) r.cwe = extractCwe(item)
        if (!r.description) r.description = item.descriptions?.find((x) => x.lang === 'en')?.value || r.description
      }
    } catch {
      /* leave as-is on failure */
    }
    await sleep(apiKey ? 700 : 6500)
  }
}
function firstSentence(t) {
  const s = t.split(/(?<=\.)\s/)[0]
  return s.length > 120 ? s.slice(0, 117) + '…' : s
}

// ---------------------------------------------------------------------------
// main
// ---------------------------------------------------------------------------
async function main() {
  await mkdir(DATA_DIR, { recursive: true })
  const thisYear = new Date(nowMs).getUTCFullYear()
  const ghYears = [thisYear, thisYear - 1, thisYear - 2]

  log('Aggregating trending CVE intelligence…')
  log('• CISA KEV'); const kev = await fetchKev()
  log('• NVD recent CRITICAL/HIGH'); const nvd = await fetchNvd()
  log('• RSS news feeds'); const { mentions: rss, liveSources } = await fetchRss()
  log('• Reddit'); const reddit = await fetchReddit()
  log('• GitHub PoC map (local)'); const github = await loadGithubMap(ghYears)

  // Candidate set: anything recent/notable from KEV(recent), NVD, RSS, Reddit.
  const candidates = new Set()
  const kevCutoff = daysAgo(45).getTime()
  for (const [id, v] of kev.map) if (new Date(v.dateAdded).getTime() >= kevCutoff) candidates.add(id)
  for (const id of nvd.keys()) candidates.add(id)
  for (const id of rss.keys()) candidates.add(id)
  for (const id of reddit.mentions.keys()) candidates.add(id)
  log(`Candidates: ${candidates.size}`)

  log('• EPSS scores'); const epss = await fetchEpss(candidates)

  const ctx = { kev: kev.map, nvd, epss, github, rss, reddit: reddit.mentions }
  let records = [...candidates].map((id) => buildRecord(id, ctx))

  // Keep the signal: must have at least one strong signal (KEV / media / NVD-with-cvss).
  records = records.filter((r) => r.kev.in_kev || r.media.length > 0 || r.cvss != null)
  records.sort((a, b) => b.hype - a.hype)
  records = records.slice(0, 60)

  // accurate severity for the displayed set (fills older KEV CVEs)
  await enrichSeverity(records)

  records.forEach((r, i) => (r.rank = i + 1))

  const stats = {
    trending_count: records.length,
    media_mentions: records.reduce((s, r) => s + r.media.length, 0),
    reddit_upvotes: reddit.upvotes,
    kev_count: records.filter((r) => r.kev.in_kev).length,
    kev_total: kev.count,
    sources_live: 1 + 1 + 1 + liveSources.filter((s) => s.status === 'ok').length + (github.size ? 1 : 0) + (reddit.status === 'ok' ? 1 : 0),
    window_days: DAYS,
  }

  const out = {
    generated_at: new Date(nowMs).toISOString(),
    window_days: DAYS,
    stats,
    sources: [
      { name: 'CISA KEV', status: 'ok', detail: `${kev.count} entries` },
      { name: 'NVD API 2.0', status: nvd.size ? 'ok' : 'error', detail: `${nvd.size} recent` },
      { name: 'FIRST EPSS', status: epss.size ? 'ok' : 'error', detail: `${epss.size} scored` },
      ...liveSources.map((s) => ({ name: s.name, status: s.status, detail: `${s.cveHits} mentions` })),
      { name: 'GitHub PoCs', status: github.size ? 'ok' : 'error', detail: `${github.size} mapped` },
      { name: 'Reddit', status: reddit.status, detail: reddit.status === 'ok' ? `${reddit.upvotes} upvotes` : reddit.status },
    ],
    cves: records,
  }

  await writeFile(join(DATA_DIR, 'trending.json'), JSON.stringify(out, null, 2))
  log(`\n✓ trending.json: ${records.length} CVEs, ${stats.kev_count} in KEV, ${stats.media_mentions} media mentions`)
  log(`  top: ${records.slice(0, 5).map((r) => `${r.cve_id}(${r.hype})`).join(', ')}`)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
