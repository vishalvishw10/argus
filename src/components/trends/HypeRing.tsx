import { hypeColor } from '../../lib/severity'

export default function HypeRing({ value, size = 64 }: { value: number; size?: number }) {
  const stroke = 5
  const r = (size - stroke) / 2
  const c = 2 * Math.PI * r
  const pct = Math.max(0, Math.min(100, value))
  const dash = (pct / 100) * c
  const color = hypeColor(value)

  return (
    <div className="relative grid place-items-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(148,163,184,0.12)" strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={`${dash} ${c}`}
          style={{ transition: 'stroke-dasharray 0.6s ease' }}
        />
      </svg>
      <div className="absolute flex flex-col items-center leading-none">
        <span className="font-mono text-lg font-bold" style={{ color }}>
          {value}
        </span>
        <span className="mt-0.5 text-[8px] font-semibold uppercase tracking-widest text-slate-500">
          hype
        </span>
      </div>
    </div>
  )
}
