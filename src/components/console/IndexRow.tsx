import { memo } from 'react'
import type { IndexItem } from '../../lib/derive'
import { SEVERITY, epssPct } from '../../lib/severity'
import { Alert, Github, Flame } from '../icons'

interface Props {
  item: IndexItem
  selected: boolean
  onSelect: (id: string) => void
}

function IndexRowImpl({ item, selected, onSelect }: Props) {
  const sev = SEVERITY[item.severity]
  return (
    <button
      onClick={() => onSelect(item.cve_id)}
      className={`group relative flex w-full items-center gap-3 border-b border-line/70 px-3 py-2.5 text-left transition ${
        selected ? 'bg-brand-500/[0.12]' : 'hover:bg-white/[0.03]'
      }`}
    >
      {/* severity spine */}
      <span className={`absolute left-0 top-0 h-full w-[3px] ${sev.dot} ${item.severity === 'UNKNOWN' ? 'opacity-30' : ''}`} />
      {selected && <span className="absolute right-0 top-0 h-full w-[2px] bg-brand-400" />}

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className={`font-mono text-[13px] font-bold ${selected ? 'text-brand-200' : 'text-paper group-hover:text-paper'}`}>
            {item.cve_id}
          </span>
          {item.kev && <Alert className="h-3 w-3 text-sev-critical" />}
          {item.hype != null && item.hype >= 50 && (
            <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-orange-400">
              <Flame className="h-2.5 w-2.5" />
              {item.hype}
            </span>
          )}
        </div>
        {item.title ? (
          <p className="mt-0.5 truncate text-xs text-paper-dim group-hover:text-paper-muted">{item.title}</p>
        ) : (
          <p className="mt-0.5 truncate text-xs italic text-paper-dim">description loads on open</p>
        )}
      </div>

      <div className="flex shrink-0 items-center gap-2.5 font-mono text-[11px] text-paper-dim">
        {item.cvss != null && <span className={`${sev.text} font-semibold`} title="CVSS">{item.cvss.toFixed(1)}</span>}
        {item.epss != null && <span className="text-amber-300/80" title="EPSS">{epssPct(item.epss)}</span>}
        {item.repoCount > 0 && (
          <span className="inline-flex items-center gap-0.5" title={`${item.repoCount} PoC repositories`}>
            <Github className="h-3 w-3" />
            {item.repoCount}
          </span>
        )}
      </div>
    </button>
  )
}

export default memo(IndexRowImpl)
