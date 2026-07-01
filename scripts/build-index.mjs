#!/usr/bin/env node
/**
 * Rebuild public/data/index.json from the existing year files.
 * Useful after manually editing/adding data without re-scraping.
 */
import { writeFile, readdir, readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const DATA_DIR = join(__dirname, '..', 'public', 'data')

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
await writeFile(
  join(DATA_DIR, 'index.json'),
  JSON.stringify({ generated_at: new Date().toISOString(), years }, null, 2),
)
console.log(`index.json rebuilt: ${years.length} years`)
