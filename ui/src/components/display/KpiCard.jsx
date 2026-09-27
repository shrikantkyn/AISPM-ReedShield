import { cn } from '../../lib/utils.js'

/**
 * KpiCard — a single ruled figure. Kept for pages that already import it;
 * the Dashboard uses `paper/LedgerLine` for its trial-balance row.
 */

const TrendArrow = ({ up }) => (
  <svg width="8" height="8" viewBox="0 0 8 8" fill="currentColor" className="shrink-0" aria-hidden="true">
    {up ? <polygon points="4,0 8,8 0,8" /> : <polygon points="0,0 8,0 4,8" />}
  </svg>
)

export function KpiCard({ label, value, delta, up, className }) {
  const color = up ? 'text-pencil-green' : 'text-pencil-red'
  return (
    <div className={cn('bg-white border border-gray-200 px-5 py-4 flex flex-col justify-between min-h-[112px]', className)}>
      <p className="text-[12.5px] font-bold uppercase tracking-[0.08em] text-gray-600 leading-none">{label}</p>
      <p className="text-[36px] font-bold text-gray-900 tabular-nums leading-none mt-3 tracking-[-0.02em]">{value}</p>
      {delta && (
        <div className={cn('flex items-center gap-1.5 mt-2.5', color)}>
          <TrendArrow up={up} />
          <span className="text-[13.5px] font-semibold leading-none">{delta}</span>
        </div>
      )}
    </div>
  )
}

export default KpiCard
