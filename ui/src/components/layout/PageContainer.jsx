import { cn } from '../../lib/utils.js'

/**
 * PageContainer — outer wrapper for every console page: the ledger ground,
 * a 1440px measure, and 24px section rhythm.
 */
export function PageContainer({ className, children, ...props }) {
  return (
    <div className={cn('bg-paper min-h-full', className)} {...props}>
      <div className="max-w-[1440px] mx-auto px-8 py-6 space-y-6">
        {children}
      </div>
    </div>
  )
}
