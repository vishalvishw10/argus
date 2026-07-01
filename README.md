# Argus - Vulnerability Intelligence Console

Argus is a vulnerability intelligence console. It pulls CVE data from a bunch of public sources, lines it up by CVE ID, and shows you everything about a vuln in one place: the description, CVSS, EPSS score, whether CISA says it's being exploited, who's published a proof of concept on GitHub, and what the security press is saying about it.

It's a static site. There's no server and no database. A few scripts run on a schedule (GitHub Actions), write plain JSON files into the repo, and the React app just reads those files. That means it's cheap to host and there's nothing to keep running.

Live at https://argus.rootxvishal.com

## What's in it

There are two views you switch between in the top bar.

**Trending** is the "what should I care about right now" feed. Every CVE gets a 0-100 hype score based on whether it's in CISA's exploited list, how many news outlets are covering it, its CVSS/EPSS, and how many PoC repos exist. Sorted hottest first.

**CVEs** is the full catalog straight from NVD. Every CVE for the year, not just the ones with exploits. Pick a year, sort it, filter by severity, search it.

Click any CVE in either view and you get the dossier on the right: full description, the score breakdown, a timeline (published -> added to KEV -> covered in the news), the PoC repos, references, and links out to NVD / CVE.org / GitHub.

## Running it locally

```bash
npm install
npm run dev
```

That's it for the UI - it ships with real data already committed, so it works straight away.

If you want to pull fresh data yourself:

```bash
# full CVE catalog for a year (no key needed, just slow)
node scripts/cves.mjs --year 2026

# the trending feed
node scripts/trending.mjs

# the exploit-repo map (needs a GitHub token in your shell)
node scripts/scrape.mjs --from 2025 --to 2026
```

A note on NVD: without an API key you're capped at 5 requests / 30s, so a big backfill takes a while. Grab a free key from https://nvd.nist.gov/developers/request-an-api-key and the scripts pick it up from `NVD_API_KEY` automatically (about 10x faster). The site works fine without one.

## The scripts

| Script | Writes | What it does |
|---|---|---|
| `cves.mjs` | `public/data/cve/<year>.json` | Full NVD catalog per year. `--since` does an incremental update. |
| `trending.mjs` | `public/data/trending.json` | Builds the hype-ranked feed from all the sources. |
| `scrape.mjs` | `public/data/<year>.json` | Finds GitHub repos that reference each CVE. |
| `build-index.mjs` | `index.json` | Rebuilds the manifest. |

## Stack

Vite, React, TypeScript, Tailwind. Node scripts for the data, no build step for those.

## Heads up

This is for research and defensive work. The exploit links go to third-party GitHub repos, so treat them accordingly. Not affiliated with MITRE, NIST or CISA.
