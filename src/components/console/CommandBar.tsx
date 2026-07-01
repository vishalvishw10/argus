import { useEffect, useRef } from 'react'
import { LogoMark, Wordmark } from '../Logo'
import { Search, Github, Flame, Database } from '../icons'

export type Mode = 'trending' | 'cves'

interface Props {
  mode: Mode
  setMode: (m: Mode) => void
  query: string
  setQuery: (v: string) => void
  generatedAt: string | null
  onAbout: () => void
}

export default function CommandBar({ mode, setMode, query, setQuery, generatedAt, onAbout }: Props) {
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        inputRef.current?.focus()
      }
      if (e.key === 'Escape' && document.activeElement === inputRef.current) {
        setQuery('')
        inputRef.current?.blur()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [setQuery])

  return (
    <header className="sticky top-0 z-40 border-b border-line bg-base-900/85 backdrop-blur-md">
      <div className="flex h-14 items-center gap-3 px-3 sm:px-4">
        <button onClick={() => setMode('trending')} className="flex shrink-0 items-center gap-2" title="Argus home">
          <LogoMark size={28} />
          <Wordmark className="hidden text-[17px] sm:inline" />
        </button>

        <div className="seg shrink-0">
          <button data-active={mode === 'trending'} onClick={() => setMode('trending')}>
            <Flame className="h-3.5 w-3.5" />
            Trending
          </button>
          <button data-active={mode === 'cves'} onClick={() => setMode('cves')}>
            <Database className="h-3.5 w-3.5" />
            CVEs
          </button>
        </div>

        <div className="relative min-w-0 flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-paper-dim" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={mode === 'trending' ? 'Search trending CVEs, vendor, tag…' : 'Search every CVE by ID, title or keyword…'}
            className="field w-full !py-2 pl-9 pr-16 font-mono text-sm"
            spellCheck={false}
          />
          <span className="pointer-events-none absolute right-2.5 top-1/2 hidden -translate-y-1/2 items-center gap-1 sm:flex">
            <span className="kbd">⌘</span>
            <span className="kbd">K</span>
          </span>
        </div>

        <button onClick={onAbout} className="btn hidden !px-3 sm:inline-flex" title="About Argus">
          About
        </button>
        <a href="https://github.com/vishalvishw10/argus" target="_blank" rel="noreferrer" className="btn !px-2.5" title="Source on GitHub">
          <Github className="h-4 w-4" />
        </a>
      </div>

      {generatedAt && (
        <div className="flex items-center gap-2 border-t border-line/60 px-4 py-1.5 text-[11px] text-paper-dim">
          <span className="inline-flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" />
            LIVE
          </span>
          <span className="text-paper-dim/60">·</span>
          <span>
            synced <span className="font-mono text-paper-muted">{new Date(generatedAt).toISOString().slice(0, 16).replace('T', ' ')} UTC</span>
          </span>
          <span className="hidden text-paper-dim/60 sm:inline">·</span>
          <span className="hidden sm:inline">auto-refreshed hourly</span>
        </div>
      )}
    </header>
  )
}
