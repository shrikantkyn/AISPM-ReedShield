import { cn } from '../../lib/utils.js'

/**
 * Stamp — a rubber stamp for states that are facts: ENFORCED, DEMO DATA,
 * ROE SIGNED. Rotated by default like a hand stamp; `flat` for table cells.
 */
const TONE = {
  ink:   'text-gray-900',
  stamp: 'text-accent-600',
  red:   'text-pencil-red',
  green: 'text-pencil-green',
  amber: 'text-pencil-amber',
}

export function Stamp({ tone = 'ink', flat = false, className, children, ...props }) {
  return (
    <span className={cn('stamp', flat && 'stamp--flat', TONE[tone] ?? TONE.ink, className)} {...props}>
      {children}
    </span>
  )
}
