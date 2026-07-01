import type { SVGProps } from 'react'

const base = {
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 2,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  viewBox: '0 0 24 24',
}

export const Star = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base} {...p}>
    <path d="M12 17.3l-6.2 3.7 1.6-7L2 9.2l7.1-.6L12 2l2.9 6.6 7.1.6-5.4 4.8 1.6 7z" />
  </svg>
)
export const Fork = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base} {...p}>
    <circle cx="6" cy="6" r="2.2" />
    <circle cx="18" cy="6" r="2.2" />
    <circle cx="12" cy="19" r="2.2" />
    <path d="M6 8.2v2.3a3 3 0 003 3h6a3 3 0 003-3V8.2M12 13.5v3.3" />
  </svg>
)
export const Search = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base} {...p}>
    <circle cx="11" cy="11" r="7" />
    <path d="M21 21l-4.3-4.3" />
  </svg>
)
export const Chevron = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base} {...p}>
    <path d="M9 6l6 6-6 6" />
  </svg>
)
export const ExternalLink = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base} {...p}>
    <path d="M14 4h6v6M20 4l-8 8M19 14v5a1 1 0 01-1 1H5a1 1 0 01-1-1V6a1 1 0 011-1h5" />
  </svg>
)
export const Copy = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base} {...p}>
    <rect x="9" y="9" width="11" height="11" rx="2" />
    <path d="M5 15V5a2 2 0 012-2h8" />
  </svg>
)
export const Flame = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base} {...p}>
    <path d="M12 3c.5 3-1.5 4.5-2.8 6C7.8 10.6 7 12.2 7 14a5 5 0 0010 0c0-2-1-3.7-2.3-5.2C13.6 7.5 13 5.5 12 3z" />
  </svg>
)
export const Github = (p: SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" fill="currentColor" {...p}>
    <path d="M12 2C6.48 2 2 6.58 2 12.26c0 4.5 2.87 8.32 6.84 9.67.5.1.68-.22.68-.48 0-.24-.01-.87-.01-1.7-2.78.62-3.37-1.37-3.37-1.37-.45-1.18-1.11-1.5-1.11-1.5-.91-.64.07-.63.07-.63 1 .07 1.53 1.06 1.53 1.06.89 1.56 2.34 1.11 2.91.85.09-.66.35-1.11.63-1.37-2.22-.26-4.56-1.14-4.56-5.07 0-1.12.39-2.03 1.03-2.75-.1-.26-.45-1.3.1-2.7 0 0 .84-.28 2.75 1.05A9.4 9.4 0 0112 6.84c.85 0 1.71.12 2.51.34 1.91-1.33 2.75-1.05 2.75-1.05.55 1.4.2 2.44.1 2.7.64.72 1.03 1.63 1.03 2.75 0 3.94-2.34 4.81-4.57 5.06.36.32.68.94.68 1.9 0 1.37-.01 2.48-.01 2.82 0 .27.18.59.69.48A10.04 10.04 0 0022 12.26C22 6.58 17.52 2 12 2z" />
  </svg>
)
export const Shield = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base} {...p}>
    <path d="M12 3l7 3v5c0 4.5-3 8-7 10-4-2-7-5.5-7-10V6l7-3z" />
  </svg>
)
export const Alert = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base} {...p}>
    <path d="M12 3l9 16H3l9-16z" />
    <path d="M12 10v4M12 17.5v.01" />
  </svg>
)
export const Bolt = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base} {...p}>
    <path d="M13 2L4 14h6l-1 8 9-12h-6l1-8z" />
  </svg>
)
export const Clock = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base} {...p}>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 7v5l3 2" />
  </svg>
)
export const Newspaper = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base} {...p}>
    <path d="M4 5h13v14a1 1 0 001 1 1 1 0 001-1V8h2v11a3 3 0 01-3 3H6a2 2 0 01-2-2V5z" />
    <path d="M7 8h7M7 11h7M7 14h5" />
  </svg>
)
export const Refresh = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base} {...p}>
    <path d="M21 12a9 9 0 01-9 9 9 9 0 01-8.5-6M3 12a9 9 0 019-9 9 9 0 018.5 6" />
    <path d="M21 3v5h-5M3 21v-5h5" />
  </svg>
)
export const Database = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base} {...p}>
    <ellipse cx="12" cy="5" rx="8" ry="3" />
    <path d="M4 5v14c0 1.7 3.6 3 8 3s8-1.3 8-3V5M4 12c0 1.7 3.6 3 8 3s8-1.3 8-3" />
  </svg>
)
export const TrendUp = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base} {...p}>
    <path d="M3 17l6-6 4 4 7-7" />
    <path d="M17 8h4v4" />
  </svg>
)
export const Activity = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base} {...p}>
    <path d="M3 12h4l3 8 4-16 3 8h4" />
  </svg>
)
export const Reddit = (p: SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" fill="currentColor" {...p}>
    <path d="M22 12a2.1 2.1 0 00-3.5-1.6 10.3 10.3 0 00-5.3-1.7l.9-4 2.9.6a1.5 1.5 0 101.5-1.6 1.5 1.5 0 00-1.3.8l-3.3-.7a.4.4 0 00-.5.3l-1 4.6a10.3 10.3 0 00-5.4 1.7A2.1 2.1 0 102 13.4a3.7 3.7 0 000 .6c0 3.2 3.6 5.7 8 5.7s8-2.5 8-5.7a3.7 3.7 0 000-.6A2.1 2.1 0 0022 12zM7 13.5A1.5 1.5 0 118.5 15 1.5 1.5 0 017 13.5zm8.9 4.2a5.7 5.7 0 01-3.9 1.2 5.7 5.7 0 01-3.9-1.2.4.4 0 11.5-.6 5 5 0 003.4 1 5 5 0 003.4-1 .4.4 0 11.5.6zM15.5 15a1.5 1.5 0 111.5-1.5 1.5 1.5 0 01-1.5 1.5z" />
  </svg>
)
