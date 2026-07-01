import type { Severity } from '../types'

export interface SevStyle {
  label: string
  text: string
  bg: string
  border: string
  dot: string
  ring: string // hex for SVG strokes
}

export const SEVERITY: Record<Severity, SevStyle> = {
  CRITICAL: {
    label: 'Critical',
    text: 'text-sev-critical',
    bg: 'bg-sev-critical/12',
    border: 'border-sev-critical/30',
    dot: 'bg-sev-critical',
    ring: '#f43f5e',
  },
  HIGH: {
    label: 'High',
    text: 'text-sev-high',
    bg: 'bg-sev-high/12',
    border: 'border-sev-high/30',
    dot: 'bg-sev-high',
    ring: '#fb923c',
  },
  MEDIUM: {
    label: 'Medium',
    text: 'text-sev-medium',
    bg: 'bg-sev-medium/12',
    border: 'border-sev-medium/30',
    dot: 'bg-sev-medium',
    ring: '#facc15',
  },
  LOW: {
    label: 'Low',
    text: 'text-sev-low',
    bg: 'bg-sev-low/12',
    border: 'border-sev-low/30',
    dot: 'bg-sev-low',
    ring: '#38bdf8',
  },
  UNKNOWN: {
    label: 'Unknown',
    text: 'text-sev-none',
    bg: 'bg-sev-none/12',
    border: 'border-sev-none/30',
    dot: 'bg-sev-none',
    ring: '#64748b',
  },
}

export function epssPct(epss: number | null): string {
  if (epss == null) return '—'
  if (epss < 0.001) return '<0.1%'
  return (epss * 100).toFixed(epss < 0.1 ? 1 : 0) + '%'
}

export function hypeColor(h: number): string {
  if (h >= 70) return '#f43f5e'
  if (h >= 50) return '#fb923c'
  if (h >= 30) return '#facc15'
  return '#2dd4bf'
}
