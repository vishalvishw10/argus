import { useCveDetail } from '../../hooks/useCveDetail'
import type { Cve, TrendCve, CatalogCve } from '../../types'
import type { IndexItem } from '../../lib/derive'
import { SEVERITY, epssPct } from '../../lib/severity'
import { relativeTime } from '../../lib/format'
import HypeRing from '../trends/HypeRing'
import RepoItem from '../RepoItem'
import { Alert, Shield, Bolt, Newspaper, ExternalLink, Chevron, Github, Star } from '../icons'

interface Props {
  cveId: string
  item: IndexItem | null
  trend: TrendCve | null
  cve: Cve | null
  catalog?: CatalogCve | null
  onClose?: () => void
}

function Signal({ label, value, accent, sub }: { label: string; value: React.ReactNode; accent?: string; sub?: string }) {
  return (
    <div className="rounded-lg border border-line bg-base-900/50 px-3 py-2.5">
      <div className="label">{label}</div>
      <div className={`mt-1 font-mono text-base font-bold ${accent ?? 'text-paper'}`}>{value}</div>
      {sub && <div className="mt-0.5 truncate font-mono text-[10px] text-paper-dim">{sub}</div>}
    </div>
  )
}

export default function Dossier({ cveId, item, trend, cve, catalog, onClose }: Props) {
  const { detail, loading, failed } = useCveDetail(cveId)

  // resolve fields from best available source (trend > detail > catalog > item)
  const severity = trend?.severity ?? detail?.severity ?? catalog?.severity ?? item?.severity ?? 'UNKNOWN'
  const sev = SEVERITY[severity]
  const cvss = trend?.cvss ?? detail?.cvss ?? catalog?.cvss ?? item?.cvss ?? null
  const epss = trend?.epss ?? detail?.epss ?? item?.epss ?? null
  const cwe = trend?.cwe ?? detail?.cwe ?? catalog?.cwe ?? null
  const published = trend?.published ?? detail?.published ?? catalog?.published ?? item?.published ?? null
  const inKev = trend?.kev.in_kev ?? detail?.kev.in_kev ?? catalog?.kev ?? item?.kev ?? false
  const kevAdded = trend?.kev.date_added ?? detail?.kev.date_added ?? catalog?.kev_date ?? undefined
  const kevDue = trend?.kev.due_date ?? detail?.kev.due_date
  const ransomware = trend?.kev.ransomware ?? false
  const zeroDay = trend?.zero_day ?? false
  // full NVD description preferred; catalog snippet shows instantly meanwhile
  const description = detail?.description || trend?.description || catalog?.description || item?.description || ''
  const title = trend?.title || catalog?.title || detail?.kev.name || item?.title || cveId
  const repos = cve?.repositories ?? []
  const hype = trend?.hype ?? item?.hype ?? null

  // timeline: trend's if present, else derive
  const timeline = trend?.timeline?.length
    ? trend.timeline
    : [
        published ? { date: published.slice(0, 10), label: 'Published to NVD' } : null,
        kevAdded ? { date: kevAdded, label: 'Added to CISA KEV — confirmed exploitation' } : null,
      ].filter(Boolean) as { date: string; label: string }[]

  return (
    <div className="flex h-full flex-col">
      {/* header */}
      <div className="flex items-start gap-3 border-b border-line px-4 py-4 sm:px-6">
        {onClose && (
          <button onClick={onClose} className="btn mt-0.5 !px-2 lg:hidden" aria-label="Back">
            <Chevron className="h-4 w-4 rotate-180" />
          </button>
        )}
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="font-mono text-xl font-bold text-paper sm:text-2xl">{cveId}</h1>
            <span className={`rounded-md border px-2 py-0.5 text-[11px] font-bold uppercase ${sev.text} ${sev.bg} ${sev.border}`}>
              {sev.label}
            </span>
            {inKev && (
              <span className="inline-flex items-center gap-1 rounded-md border border-sev-critical/30 bg-sev-critical/10 px-2 py-0.5 text-[11px] font-bold uppercase text-sev-critical">
                <Alert className="h-3 w-3" /> CISA KEV
              </span>
            )}
            {ransomware && (
              <span className="inline-flex items-center gap-1 rounded-md border border-fuchsia-500/30 bg-fuchsia-500/10 px-2 py-0.5 text-[11px] font-bold uppercase text-fuchsia-300">
                <Bolt className="h-3 w-3" /> Ransomware
              </span>
            )}
            {zeroDay && (
              <span className="rounded-md border border-violet-500/30 bg-violet-500/10 px-2 py-0.5 text-[11px] font-bold uppercase text-violet-300">
                Zero-Day
              </span>
            )}
          </div>
          <h2 className="mt-2 text-[15px] font-semibold leading-snug text-paper text-balance">{title}</h2>
          {(trend?.vendor || trend?.product) && (
            <p className="mt-1 text-xs text-paper-dim">
              {[trend?.vendor?.trim(), trend?.product?.trim()].filter(Boolean).join(' · ')}
            </p>
          )}
          <div className="mt-3 flex flex-wrap gap-2">
            <a href={`https://nvd.nist.gov/vuln/detail/${cveId}`} target="_blank" rel="noreferrer" className="btn !py-1 !text-xs">
              <ExternalLink className="h-3.5 w-3.5" /> NVD
            </a>
            <a href={`https://www.cve.org/CVERecord?id=${cveId}`} target="_blank" rel="noreferrer" className="btn !py-1 !text-xs">
              <ExternalLink className="h-3.5 w-3.5" /> CVE.org
            </a>
            <a href={`https://github.com/search?q=${cveId}&type=repositories`} target="_blank" rel="noreferrer" className="btn !py-1 !text-xs">
              <Github className="h-3.5 w-3.5" /> GitHub
            </a>
          </div>
        </div>
        {hype != null && (
          <div className="hidden shrink-0 sm:block">
            <HypeRing value={hype} size={68} />
          </div>
        )}
      </div>

      {/* body */}
      <div className="min-h-0 flex-1 space-y-6 overflow-y-auto px-4 py-5 sm:px-6">
        {/* signal grid */}
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          <Signal label="CVSS" value={cvss != null ? cvss.toFixed(1) : '—'} accent={sev.text} sub={detail?.cvssVector ?? undefined} />
          <Signal label="EPSS" value={epssPct(epss)} accent="text-amber-300" sub={trend?.epss_pct != null ? `${(trend.epss_pct * 100).toFixed(0)}th pct` : undefined} />
          <Signal label="Exploit maturity" value={repos.length || trend?.repos.count || 0} accent="text-brand-300" sub="public PoC repos" />
          <Signal label="CWE" value={cwe || '—'} />
          <Signal label="Published" value={published ? published.slice(0, 10) : '—'} />
          <Signal
            label="Patch"
            value={trend?.no_patch ? 'None reported' : inKev ? 'Check vendor' : 'See refs'}
            accent={trend?.no_patch ? 'text-sev-critical' : 'text-paper-muted'}
            sub={kevDue ? `KEV due ${kevDue}` : undefined}
          />
        </div>

        {/* description */}
        <section>
          <h3 className="label mb-2">Description</h3>
          {loading && !description ? (
            <div className="space-y-2">
              <div className="h-3 w-full animate-pulse rounded bg-white/[0.05]" />
              <div className="h-3 w-11/12 animate-pulse rounded bg-white/[0.05]" />
              <div className="h-3 w-3/4 animate-pulse rounded bg-white/[0.05]" />
            </div>
          ) : description ? (
            <p className="text-sm leading-relaxed text-paper-muted">{description}</p>
          ) : (
            <p className="text-sm italic text-paper-dim">
              {failed ? 'NVD description unavailable (rate-limited or not yet published).' : 'No description on record.'}
            </p>
          )}
        </section>

        {/* timeline */}
        {timeline.length > 0 && (
          <section>
            <h3 className="label mb-3">Exploitation timeline</h3>
            <ol className="relative ml-1.5 space-y-3 border-l border-line pl-4">
              {timeline.map((t, i) => (
                <li key={i} className="relative">
                  <span
                    className={`absolute -left-[21px] top-1 h-2.5 w-2.5 rounded-full ring-2 ring-base-850 ${
                      t.label.includes('KEV') ? 'bg-sev-critical' : t.label.includes('Covered') ? 'bg-brand-400' : 'bg-sky-400'
                    }`}
                  />
                  <div className="font-mono text-xs text-paper-dim">{t.date}</div>
                  <div className="text-sm text-paper-muted">{t.label}</div>
                </li>
              ))}
            </ol>
          </section>
        )}

        {/* media coverage */}
        {trend?.media && trend.media.length > 0 && (
          <section>
            <h3 className="label mb-2">Media coverage</h3>
            <ul className="space-y-1.5">
              {trend.media.map((m, i) => (
                <li key={i} className="flex items-start gap-2 text-sm">
                  <Newspaper className="mt-0.5 h-3.5 w-3.5 shrink-0 text-paper-dim" />
                  <a href={m.url} target="_blank" rel="noreferrer" className="text-paper-muted hover:text-brand-300">
                    {m.title}
                    <span className="ml-2 text-xs text-paper-dim">
                      {m.source}{m.date ? ` · ${relativeTime(m.date)}` : ''}
                    </span>
                  </a>
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* exploit repositories */}
        {repos.length > 0 ? (
          <section>
            <h3 className="label mb-2">Proof-of-concept repositories ({repos.length})</h3>
            <div className="grid gap-2">
              {repos.map((r) => (
                <RepoItem key={r.id} repo={r} />
              ))}
            </div>
          </section>
        ) : trend && trend.repos.top.length > 0 ? (
          <section>
            <h3 className="label mb-2">Proof-of-concept repositories ({trend.repos.count})</h3>
            <div className="grid gap-2">
              {trend.repos.top.map((r) => (
                <a
                  key={r.full_name}
                  href={r.html_url}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center justify-between rounded-lg border border-line bg-base-900/40 px-3 py-2 text-sm hover:border-brand-400/25"
                >
                  <span className="inline-flex items-center gap-1.5 font-mono text-paper-muted">
                    <Github className="h-3.5 w-3.5 text-paper-dim" />
                    {r.full_name}
                  </span>
                  <span className="inline-flex items-center gap-1 font-mono text-xs text-paper-dim">
                    <Star className="h-3 w-3 text-amber-400/70" />
                    {r.stars.toLocaleString()}
                  </span>
                </a>
              ))}
            </div>
          </section>
        ) : null}

        {/* references */}
        {detail?.references && detail.references.length > 0 && (
          <section>
            <h3 className="label mb-2">References</h3>
            <ul className="space-y-1.5">
              {detail.references.map((r, i) => (
                <li key={i} className="flex items-start gap-2">
                  <ExternalLink className="mt-0.5 h-3.5 w-3.5 shrink-0 text-paper-dim" />
                  <a href={r.url} target="_blank" rel="noreferrer" className="break-all text-xs text-paper-muted hover:text-brand-300">
                    {r.url}
                    {r.tags.length > 0 && <span className="ml-2 text-paper-dim">[{r.tags.join(', ')}]</span>}
                  </a>
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* tags */}
        {trend?.tags && trend.tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5 pt-1">
            {trend.tags.map((t) => (
              <span key={t} className="rounded bg-white/[0.04] px-1.5 py-0.5 font-mono text-[10px] uppercase text-paper-muted">
                {t}
              </span>
            ))}
          </div>
        )}

        <div className="flex items-center gap-1.5 pt-2 text-[11px] text-paper-dim">
          <Shield className="h-3.5 w-3.5" />
          Intelligence correlated from NVD, CISA KEV, FIRST EPSS, security media & GitHub.
        </div>
      </div>
    </div>
  )
}
