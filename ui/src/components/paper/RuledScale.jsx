import { cn } from '../../lib/utils.js'

/**
 * RuledScale — a 0–100 scale ruled like the margin of an analysis pad, with
 * one marker for the value and optional shaded bands for thresholds.
 *
 *   bands: [{ from, to, className }]
 */
export function RuledScale({ value = 0, max = 100, bands = [], markerClassName = 'bg-gray-900', className, height = 18 }) {
  const pct = Math.max(0, Math.min(100, (value / max) * 100))
  const ticks = Array.from({ length: 11 }, (_, i) => i * 10)
  return (
    <div className={cn('relative w-full', className)} style={{ height }} role="img" aria-label={`${value} of ${max}`}>
      {bands.map((b, i) => (
        <div
          key={i}
          className={cn('absolute top-[3px] bottom-[3px]', b.className)}
          style={{ left: `${(b.from / max) * 100}%`, width: `${((b.to - b.from) / max) * 100}%` }}
        />
      ))}
      <div className="absolute left-0 right-0 bottom-0 h-px bg-gray-400" />
      {ticks.map(t => (
        <div
          key={t}
          className={cn('absolute bottom-0 w-px bg-gray-400', t % 50 === 0 ? 'h-[9px]' : 'h-[5px]')}
          style={{ left: `${t}%` }}
        />
      ))}
      <div className={cn('absolute bottom-0 w-[3px] -ml-[1.5px]', markerClassName)} style={{ left: `${pct}%`, height }} />
    </div>
  )
}
