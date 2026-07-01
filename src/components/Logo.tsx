export function LogoMark({ size = 32, className = '' }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" className={className} aria-hidden>
      <defs>
        <linearGradient id="argus-g" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#f1dca9" />
          <stop offset="1" stopColor="#c2974a" />
        </linearGradient>
      </defs>
      {/* signal rings */}
      <circle cx="16" cy="16" r="13" fill="none" stroke="url(#argus-g)" strokeWidth="1.4" opacity="0.25" />
      <circle cx="16" cy="16" r="8.5" fill="none" stroke="url(#argus-g)" strokeWidth="1.6" opacity="0.55" />
      {/* crosshair sightlines */}
      <path d="M16 1.5v5M16 25.5v5M1.5 16h5M25.5 16h5" stroke="url(#argus-g)" strokeWidth="1.4" strokeLinecap="round" opacity="0.6" />
      {/* core */}
      <circle cx="16" cy="16" r="3.6" fill="url(#argus-g)" />
      <circle cx="16" cy="16" r="3.6" fill="url(#argus-g)" opacity="0.5">
        <animate attributeName="r" values="3.6;6;3.6" dur="2.4s" repeatCount="indefinite" />
        <animate attributeName="opacity" values="0.5;0;0.5" dur="2.4s" repeatCount="indefinite" />
      </circle>
    </svg>
  )
}

export function Wordmark({ className = '' }: { className?: string }) {
  return (
    <span className={`font-bold tracking-tight ${className}`}>
      Ar<span className="grad-text">gus</span>
    </span>
  )
}
