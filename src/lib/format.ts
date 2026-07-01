export function compactNumber(n: number): string {
  if (n < 1000) return String(n)
  if (n < 1_000_000) return (n / 1000).toFixed(n < 10_000 ? 1 : 0).replace(/\.0$/, '') + 'k'
  return (n / 1_000_000).toFixed(1).replace(/\.0$/, '') + 'M'
}

export function relativeTime(iso: string): string {
  const then = new Date(iso).getTime()
  if (Number.isNaN(then)) return '—'
  const diff = Date.now() - then
  const sec = Math.round(diff / 1000)
  const min = Math.round(sec / 60)
  const hr = Math.round(min / 60)
  const day = Math.round(hr / 24)
  if (sec < 60) return 'just now'
  if (min < 60) return `${min}m ago`
  if (hr < 24) return `${hr}h ago`
  if (day < 30) return `${day}d ago`
  const mo = Math.round(day / 30)
  if (mo < 12) return `${mo}mo ago`
  return `${Math.round(mo / 12)}y ago`
}

export function isoDate(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '—'
  return d.toISOString().slice(0, 10)
}

export function cveYear(cveId: string): number | null {
  const m = cveId.match(/CVE-(\d{4})-/i)
  return m ? Number(m[1]) : null
}

// A loose, label-only "severity" heuristic derived from social signal
// (stars + repo activity). NOT a CVSS score — purely for visual grouping.
const LANG_COLORS: Record<string, string> = {
  Python: '#3776ab',
  C: '#555555',
  'C++': '#f34b7d',
  Java: '#b07219',
  JavaScript: '#f1e05a',
  TypeScript: '#3178c6',
  Go: '#00add8',
  Rust: '#dea584',
  Ruby: '#701516',
  PHP: '#4f5d95',
  Shell: '#89e051',
  HTML: '#e34c26',
  PowerShell: '#012456',
  'C#': '#178600',
  Assembly: '#6e4c13',
  Perl: '#0298c3',
  Lua: '#000080',
  Kotlin: '#a97bff',
}

export function langColor(lang: string | null): string {
  if (!lang) return '#6b7280'
  return LANG_COLORS[lang] ?? '#34f5c5'
}
