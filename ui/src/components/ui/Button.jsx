import { cn } from '../../lib/utils.js'

/**
 * Button — base interactive control.
 *
 * Variants:  default (stamp ink) | outline | ghost | destructive (red pencil, outline until focused)
 * Sizes:     sm (h-8) | md (h-10) | lg (h-11)
 */

const variants = {
  default:     'bg-accent-600 text-white border-accent-700 hover:bg-accent-700 active:bg-accent-800 focus-visible:ring-accent-400',
  outline:     'bg-white text-gray-800 border-gray-200 hover:bg-gray-100 hover:border-gray-500 focus-visible:ring-accent-400',
  ghost:       'bg-transparent text-gray-700 border-transparent hover:bg-gray-200/60 focus-visible:ring-accent-400',
  destructive: 'bg-white text-pencil-red border-pencil-red hover:bg-pencil-red hover:text-white focus:bg-pencil-red focus:text-white focus-visible:ring-pencil-red',
}

const sizes = {
  sm: 'h-8  px-3 text-[13.5px] gap-1.5',
  md: 'h-10 px-4 text-[14.5px] gap-2',
  lg: 'h-11 px-5 text-[16px] gap-2',
}

export function Button({
  variant = 'default',
  size = 'md',
  className,
  children,
  disabled,
  loading = false,
  ...props
}) {
  return (
    <button
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={cn(
        'inline-flex items-center justify-center rounded border font-semibold tracking-[0.005em]',
        'transition-colors duration-150 select-none whitespace-nowrap',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-white',
        'disabled:opacity-50 disabled:pointer-events-none',
        variants[variant] ?? variants.default,
        sizes[size]     ?? sizes.md,
        className,
      )}
      {...props}
    >
      {loading && (
        <span className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" aria-hidden="true" />
      )}
      {children}
    </button>
  )
}
