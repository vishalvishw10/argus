import type { TrendingData } from '../../types'
import type { IndexItem } from '../../lib/derive'
import { LogoMark } from '../Logo'
import { Flame, Alert, Newspaper, Database, Activity } from '../icons'
import { SEVERITY } from '../../lib/severity'

interface Props {
  trending: TrendingData | null
  totalCves: number
  totalRepos: number
  topMovers: IndexItem[]
  onSelect: (id: string) => void
}

function Stat({ icon, label, value, accent }: { icon: React.ReactNode; label: string; value: string; accent: string }) {
  return (
    <div className="surface p-3.5">
      <div className="flex items-center justify-between">
        <span className="label">{label}</span>
        <span className={accent}>{icon}</span>
      </div>
      <div className={`mt-1.5 font-mono text-2xl font-bold ${accent}`}>{value}</div>
    </div>
  )
}

export default function Overview({ trending, totalCves, totalRepos, topMovers, onSelect }: Props) {
  const s = trending?.stats
  return (
    <div className="flex h-full flex-col items-center justify-center overflow-y-auto px-6 py-10">
      <div className="w-full max-w-2xl">
        <div className="mb-6 flex flex-col items-center text-center">
          <LogoMark size={56} />
          <h1 className="mt-4 text-2xl font-bold">
            Ar<span className="grad-text">gus</span> — Vulnerability Intelligence Console
          </h1>
          <p className="mt-2 max-w-lg text-sm text-paper-muted">
            Select a CVE to open its dossier — description, CVSS, EPSS, CISA KEV status, exploitation
            timeline, proof-of-concept repositories and live media coverage, correlated in one place.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Stat icon={<Flame className="h-4 w-4" />} label="Trending" value={String(s?.trending_count ?? '—')} accent="text-orange-400" />
          <Stat icon={<Alert className="h-4 w-4" />} label="In KEV" value={String(s?.kev_count ?? '—')} accent="text-sev-critical" />
          <Stat icon={<Newspaper className="h-4 w-4" />} label="Mentions" value={String(s?.media_mentions ?? '—')} accent="text-sky-300" />
          <Stat icon={<Database className="h-4 w-4" />} label="CVEs indexed" value={totalCves ? compact(totalCves) : '—'} accent="text-brand-300" />
        </div>

        {topMovers.length > 0 && (
          <div className="surface mt-5 overflow-hidden">
            <div className="flex items-center gap-2 border-b border-line px-4 py-2.5">
              <Activity className="h-4 w-4 text-orange-400" />
              <span className="label !text-paper-muted">Top movers right now</span>
            </div>
            <div>
              {topMovers.map((m, i) => {
                const sev = SEVERITY[m.severity]
                return (
                  <button
                    key={m.cve_id}
                    onClick={() => onSelect(m.cve_id)}
                    className="flex w-full items-center gap-3 border-b border-line/60 px-4 py-2.5 text-left last:border-0 hover:bg-white/[0.03]"
                  >
                    <span className="font-mono text-xs text-paper-dim">{i + 1}</span>
                    <span className={`h-2 w-2 rounded-full ${sev.dot}`} />
                    <span className="font-mono text-sm font-bold text-paper">{m.cve_id}</span>
                    <span className="min-w-0 flex-1 truncate text-xs text-paper-dim">{m.title}</span>
                    {m.hype != null && (
                      <span className="inline-flex items-center gap-0.5 font-mono text-xs font-bold text-orange-400">
                        <Flame className="h-3 w-3" />
                        {m.hype}
                      </span>
                    )}
                  </button>
                )
              })}
            </div>
          </div>
        )}

        <p className="mt-5 text-center text-xs text-paper-dim">
          {totalRepos ? `${compact(totalRepos)} exploit repositories mapped · ` : ''}auto-refreshed hourly
        </p>
      </div>
    </div>
  )
}

function compact(n: number): string {
  if (n < 1000) return String(n)
  if (n < 1_000_000) return (n / 1000).toFixed(1).replace(/\.0$/, '') + 'k'
  return (n / 1_000_000).toFixed(1).replace(/\.0$/, '') + 'M'
}
