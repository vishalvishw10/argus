import { useEffect } from 'react'
import { LogoMark } from '../Logo'

export default function AboutModal({ onClose }: { onClose: () => void }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [onClose])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fade-in" onClick={onClose}>
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
      <div
        className="surface relative z-10 max-h-[85vh] w-full max-w-2xl overflow-y-auto p-6 shadow-pop"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <LogoMark size={40} />
            <div>
              <h2 className="text-lg font-bold">
                Ar<span className="grad-text">gus</span>
              </h2>
              <p className="text-xs text-slate-500">Vulnerability Intelligence Console</p>
            </div>
          </div>
          <button onClick={onClose} className="btn !px-2.5 !py-1.5 text-xs">
            Esc
          </button>
        </div>

        <p className="mt-4 text-sm leading-relaxed text-slate-400">
          Argus correlates authoritative vulnerability sources by CVE ID into a single dossier and a
          transparent <span className="text-brand-300">hype score</span>, refreshed hourly.
        </p>

        <h3 className="mt-6 label">Hype score (0–100)</h3>
        <p className="mt-2 text-xs leading-relaxed text-slate-500">
          KEV listing +34 (+ransomware/recency) · media mentions ≤26 · CVSS ≤12 · EPSS ≤14 · GitHub
          PoCs ≤12 · Reddit ≤8 · publication recency ≤6. A relevance signal — not a replacement for
          CVSS or your own risk assessment.
        </p>

        <p className="mt-6 text-[11px] text-slate-600">
          For security research and defensive use only. Not affiliated with MITRE, NIST or CISA.
        </p>
      </div>
    </div>
  )
}
