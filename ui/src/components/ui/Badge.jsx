import { cn } from '../../lib/utils.js'

/**
 * Badge — semantic label. Pencil vocabulary: red for critical, burnt orange
 * for high, amber for medium, green for low/success, stamp violet for info.
 */

const variants = {
  critical: 'bg-[#F7E3E1] text-[#8E1F19] border-[#E4A9A4]',
  high:     'bg-[#F6E7D8] text-[#7C3B0C] border-[#E1B58F]',
  medium:   'bg-[#F5EBD2] text-[#6E4708] border-[#DEC07A]',
  low:      'bg-[#E1EFE0] text-[#1F5A2B] border-[#A8CBA9]',
  success:  'bg-[#E1EFE0] text-[#1F5A2B] border-[#A8CBA9]',
  info:     'bg-accent-50 text-accent-800 border-accent-200',
  neutral:  'bg-gray-100 text-gray-600 border-gray-200',
}

export function Badge({ variant = 'neutral', className, children, ...props }) {
  return (
    <span
      className={cn(
        'inline-flex items-center px-1.5 py-[2px] rounded border',
        'text-[12.5px] font-bold tracking-[0.02em] whitespace-nowrap leading-none',
        variants[variant] ?? variants.neutral,
        className,
      )}
      {...props}
    >
      {children}
    </span>
  )
}
