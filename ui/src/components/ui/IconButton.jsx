import { cn } from '../../lib/utils.js'

/**
 * IconButton — square icon-only control, 40×40 (sm: 32×32).
 */

const sizes = {
  sm: 'w-8  h-8',
  md: 'w-10 h-10',
}

export function IconButton({ size = 'md', active = false, className, children, ...props }) {
  return (
    <button
      type="button"
      className={cn(
        'inline-flex items-center justify-center rounded shrink-0',
        'transition-colors duration-150 focus-visible:outline-none',
        'focus-visible:ring-2 focus-visible:ring-accent-400 focus-visible:ring-offset-1',
        'disabled:opacity-50 disabled:pointer-events-none',
        active
          ? 'bg-gray-200 text-gray-900'
          : 'text-gray-600 hover:text-gray-900 hover:bg-gray-200/60',
        sizes[size] ?? sizes.md,
        className,
      )}
      {...props}
    >
      {children}
    </button>
  )
}
