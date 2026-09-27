import { cn } from '../../lib/utils.js'

/**
 * Card — base sheet primitive: lighter stock on the ledger ground, hairline
 * rule, no shadow. Prefer `components/paper/Sheet` for titled working papers.
 */

export function Card({ className, children, ...props }) {
  return (
    <div className={cn('bg-white border border-gray-200 rounded', className)} {...props}>
      {children}
    </div>
  )
}

export function CardHeader({ className, children, ...props }) {
  return (
    <div className={cn('px-5 py-3 border-b border-gray-200 bg-gray-100 flex items-start justify-between gap-4', className)} {...props}>
      {children}
    </div>
  )
}

export function CardTitle({ className, children, ...props }) {
  return (
    <p className={cn('text-[16px] font-bold text-gray-900 leading-snug', className)} {...props}>
      {children}
    </p>
  )
}

export function CardDescription({ className, children, ...props }) {
  return (
    <p className={cn('text-[13.5px] text-gray-500 mt-0.5 leading-snug', className)} {...props}>
      {children}
    </p>
  )
}

export function CardContent({ className, children, ...props }) {
  return (
    <div className={cn('p-5', className)} {...props}>
      {children}
    </div>
  )
}

export function CardFooter({ className, children, ...props }) {
  return (
    <div className={cn('px-5 py-3 border-t border-gray-200 flex items-center', className)} {...props}>
      {children}
    </div>
  )
}
