import { cn } from '../../lib/utils.js'

/**
 * TickMark — a status indicator: a small filled dot plus, optionally, a label.
 * Never color-only — pass `label` to print the word, or the dot carries an
 * aria-label. Kinds cover the security status palette (Low green, Medium
 * amber, High orange, Critical red) plus pass / warn / fail / info / na.
 */
export const TICK_LABEL = {
  pass: 'Pass',
  fail: 'Fail',
  warn: 'Warning',
  na:   'Not assessed',
  info: 'Note',
  low:  'Low',
  medium: 'Medium',
  high: 'High',
  critical: 'Critical',
}

const TONE = {
  pass:     'text-status-low',
  fail:     'text-status-critical',
  warn:     'text-status-medium',
  na:       'text-gray-400',
  info:     'text-status-info',
  low:      'text-status-low',
  medium:   'text-status-medium',
  high:     'text-status-high',
  critical: 'text-status-critical',
}

const DOT = {
  pass:     'bg-status-low',
  fail:     'bg-status-critical',
  warn:     'bg-status-medium',
  na:       'bg-gray-300',
  info:     'bg-status-info',
  low:      'bg-status-low',
  medium:   'bg-status-medium',
  high:     'bg-status-high',
  critical: 'bg-status-critical',
}

export function TickMark({ kind = 'na', size = 16, label = false, animate = false, className, labelClassName }) {
  const k = TONE[kind] ? kind : 'na'
  const text = TICK_LABEL[k]
  const dotSize = Math.max(7, Math.round(size * 0.55))
  return (
    <span className={cn('inline-flex items-center gap-2 align-middle', TONE[k], className)}>
      <span
        className={cn('shrink-0 rounded-full', DOT[k], animate && 'tick-draw')}
        style={{ width: dotSize, height: dotSize }}
        role="img"
        aria-label={label ? undefined : text}
        aria-hidden={label ? 'true' : undefined}
      />
      {label && (
        <span className={cn('text-[13px] font-medium leading-none', labelClassName)}>
          {typeof label === 'string' ? label : text}
        </span>
      )}
    </span>
  )
}

/** Map a severity word onto the status vocabulary (Low green … Critical red). */
export function severityKind(sev) {
  const s = String(sev || '').toLowerCase()
  if (s === 'critical') return 'critical'
  if (s === 'high') return 'high'
  if (s === 'medium') return 'medium'
  if (s === 'low') return 'low'
  return 'na'
}
