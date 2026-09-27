import { cn } from '../../lib/utils.js'

/**
 * Sheet — a titled panel (card) in the light enterprise theme: white surface,
 * 1px hairline border, restrained radius and shadow, a light header row with
 * the title, an optional muted subtitle, and an optional action.
 *
 * The `reference` prop is accepted but no longer rendered (the old
 * working-paper "WP A-3" reference is gone in the clean theme); callers keep
 * passing it without change.
 */
export function Sheet({ title, reference, subtitle, action, className, contentClassName, headerClassName, children, as: Tag = 'section', ...props }) {
  void reference
  return (
    <Tag className={cn('bg-white border border-gray-200 rounded-lg shadow-xs flex flex-col min-w-0', className)} {...props}>
      {(title || action) && (
        <header className={cn('flex flex-wrap items-start justify-between gap-x-4 gap-y-2 px-5 py-3.5 border-b border-gray-200', headerClassName)}>
          <div className="min-w-0 flex-1 basis-[220px]">
            {title && <h2 className="text-[15px] font-semibold text-gray-900 leading-tight tracking-[-0.01em]">{title}</h2>}
            {subtitle && <p className="text-[13px] text-gray-500 mt-0.5 leading-snug">{subtitle}</p>}
          </div>
          {action && <div className="shrink-0 flex items-center gap-2">{action}</div>}
        </header>
      )}
      <div className={cn('flex-1 min-w-0', contentClassName)}>{children}</div>
    </Tag>
  )
}
