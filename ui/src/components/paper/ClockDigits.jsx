import { useEffect, useRef, useState } from 'react'
import { cn } from '../../lib/utils.js'

/**
 * ClockDigits — fixed-position digits. Every place keeps its column; a
 * change cross-fades the single digit that moved instead of reflowing.
 *
 *   text: e.g. "47:12:09" — separators keep a narrower column, digits animate.
 */
function Digit({ ch, size }) {
  const [state, setState] = useState({ cur: ch, prev: null })
  const timer = useRef(null)

  useEffect(() => {
    setState(s => (s.cur === ch ? s : { cur: ch, prev: s.cur }))
    clearTimeout(timer.current)
    timer.current = setTimeout(() => setState(s => (s.prev ? { ...s, prev: null } : s)), 180)
    return () => clearTimeout(timer.current)
  }, [ch])

  const isSep = !/\d/.test(ch)
  return (
    <span
      className={cn('relative inline-block text-center tabular-nums', isSep ? 'w-[0.45em]' : 'w-[0.66em]')}
      style={{ fontSize: size, lineHeight: 1 }}
    >
      <span className="block" style={{ opacity: state.prev ? 0 : 1, transition: 'opacity 180ms cubic-bezier(0.16,1,0.3,1)' }}>{state.cur}</span>
      {state.prev && (
        <span className="absolute inset-0 block clock-fade" aria-hidden="true">{state.prev}</span>
      )}
    </span>
  )
}

export function ClockDigits({ text, size = 44, className, muted = false }) {
  return (
    <span className={cn('font-mono inline-flex items-baseline', muted ? 'text-gray-400' : 'text-gray-900', className)} aria-label={text} role="timer">
      {Array.from(text).map((ch, i) => <Digit key={i} ch={ch} size={size} />)}
    </span>
  )
}

/** Format a millisecond duration as HH:MM:SS (hours may exceed 24). */
export function formatHms(ms) {
  const total = Math.max(0, Math.floor(ms / 1000))
  const h = Math.floor(total / 3600)
  const m = Math.floor((total % 3600) / 60)
  const s = total % 60
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}
