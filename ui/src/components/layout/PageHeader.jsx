import { cn } from '../../lib/utils.js'

/**
 * PageHeader — the page title row for the light enterprise console.
 *
 *   title      → the page title
 *   subtitle   → one line of purpose
 *   meta       → [{ label, value }] shown as small muted key/values on the right
 *   actions    → primary / secondary controls
 *
 * `reference` is accepted for call-site compatibility but not rendered.
 */
export function PageHeader({ title, subtitle, reference, meta, actions, className, ...props }) {
  void reference
  return (
    <div className={cn('flex flex-wrap items-start justify-between gap-x-6 gap-y-3 pb-5 border-b border-gray-200', className)} {...props}>
      <div className="min-w-0">
        <h1 className="text-[22px] font-semibold text-gray-900 tracking-[-0.02em] leading-tight">{title}</h1>
        {subtitle && <p className="text-[14px] text-gray-500 mt-1.5 leading-snug max-w-[70ch]">{subtitle}</p>}
      </div>

      <div className="flex items-center gap-4 shrink-0">
        {meta && meta.length > 0 && (
          <dl className="hidden lg:flex items-center gap-5 text-[12px]">
            {meta.map(m => (
              <div key={m.label} className="text-right">
                <dt className="uppercase tracking-[0.06em] font-semibold text-gray-400 leading-none text-[10.5px]">{m.label}</dt>
                <dd className={cn('mt-1 text-gray-700 leading-none', m.mono && 'font-mono')}>{m.value}</dd>
              </div>
            ))}
          </dl>
        )}
        {actions && <div className="flex items-center gap-2">{actions}</div>}
      </div>
    </div>
  )
}
