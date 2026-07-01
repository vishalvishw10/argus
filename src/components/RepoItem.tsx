import type { Repo } from '../types'
import { Star, Fork, ExternalLink } from './icons'
import { compactNumber, relativeTime, isoDate, langColor } from '../lib/format'

export default function RepoItem({ repo }: { repo: Repo }) {
  return (
    <div className="group rounded-lg border border-line bg-base-900/40 p-3.5 transition hover:border-brand-400/25 hover:bg-base-800/60">
      <div className="flex items-start justify-between gap-3">
        <a
          href={repo.html_url}
          target="_blank"
          rel="noreferrer"
          className="inline-flex min-w-0 items-center gap-1.5 font-mono text-sm font-semibold text-paper hover:text-brand-300"
        >
          <span className="truncate">{repo.full_name}</span>
          <ExternalLink className="h-3.5 w-3.5 shrink-0 opacity-0 transition group-hover:opacity-60" />
        </a>

        <div className="flex shrink-0 items-center gap-3 font-mono text-xs text-paper-muted">
          <span className="inline-flex items-center gap-1" title={`${repo.stargazers_count} stars`}>
            <Star className="h-3.5 w-3.5 text-amber-400/80" />
            {compactNumber(repo.stargazers_count)}
          </span>
          <span className="inline-flex items-center gap-1" title={`${repo.forks_count} forks`}>
            <Fork className="h-3.5 w-3.5 text-paper-dim" />
            {compactNumber(repo.forks_count)}
          </span>
        </div>
      </div>

      {repo.description && (
        <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-paper-muted">{repo.description}</p>
      )}

      <div className="mt-2.5 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-paper-dim">
        {repo.language && (
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: langColor(repo.language) }} />
            {repo.language}
          </span>
        )}
        <span>
          by{' '}
          <a href={repo.owner.html_url} target="_blank" rel="noreferrer" className="text-paper-muted hover:text-brand-300">
            @{repo.owner.login}
          </a>
        </span>
        <span title={isoDate(repo.pushed_at)}>pushed {relativeTime(repo.pushed_at)}</span>
        <span title={isoDate(repo.created_at)}>created {isoDate(repo.created_at)}</span>
        {repo.topics?.slice(0, 4).map((t) => (
          <span key={t} className="rounded bg-white/[0.04] px-1.5 py-0.5 text-[11px] text-paper-muted">
            #{t}
          </span>
        ))}
      </div>
    </div>
  )
}
