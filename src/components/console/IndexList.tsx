import { useEffect, useRef, useState } from 'react'
import type { IndexItem } from '../../lib/derive'
import IndexRow from './IndexRow'

interface Props {
  items: IndexItem[]
  selected: string | null
  onSelect: (id: string) => void
  loading: boolean
}

const CHUNK = 80

export default function IndexList({ items, selected, onSelect, loading }: Props) {
  const [limit, setLimit] = useState(CHUNK)
  const sentinel = useRef<HTMLDivElement>(null)
  const scrollBox = useRef<HTMLDivElement>(null)

  // reset paging when the underlying list changes
  useEffect(() => {
    setLimit(CHUNK)
    if (scrollBox.current) scrollBox.current.scrollTop = 0
  }, [items])

  // infinite scroll
  useEffect(() => {
    const el = sentinel.current
    if (!el) return
    const io = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) setLimit((l) => Math.min(l + CHUNK, items.length))
      },
      { root: scrollBox.current, rootMargin: '300px' },
    )
    io.observe(el)
    return () => io.disconnect()
  }, [items.length])

  const visible = items.slice(0, limit)

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b border-line px-3 py-2">
        <span className="label">Index</span>
        <span className="font-mono text-[11px] text-paper-dim">{items.length.toLocaleString()} CVEs</span>
      </div>

      <div ref={scrollBox} className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
        {loading ? (
          <div className="space-y-px p-2">
            {Array.from({ length: 12 }).map((_, i) => (
              <div key={i} className="h-12 animate-pulse rounded bg-white/[0.03]" />
            ))}
          </div>
        ) : items.length === 0 ? (
          <div className="p-8 text-center text-sm text-paper-dim">No CVEs match your search.</div>
        ) : (
          <>
            {visible.map((it) => (
              <IndexRow key={it.cve_id} item={it} selected={selected === it.cve_id} onSelect={onSelect} />
            ))}
            {limit < items.length && (
              <div ref={sentinel} className="py-4 text-center text-xs text-paper-dim">
                loading more… ({(items.length - limit).toLocaleString()} remaining)
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
