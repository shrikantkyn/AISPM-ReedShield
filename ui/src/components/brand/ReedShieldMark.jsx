/**
 * ReedShieldMark — the brand mark: a steel shield holding an interlaced orange
 * knot with a diagonal slash. Matches public/reedshield-mark.svg. Gradient ids
 * are suffixed per instance so multiple marks on one page don't collide.
 */
let _uid = 0
export function ReedShieldMark({ size = 32, className, title = 'ReedShield' }) {
  const u = `rs${++_uid}`
  return (
    <svg
      width={size} height={size} viewBox="0 0 64 64" className={className}
      role="img" aria-label={title}
    >
      <defs>
        <linearGradient id={`${u}-steel`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#D2D7DD" /><stop offset="1" stopColor="#6A6F76" />
        </linearGradient>
        <linearGradient id={`${u}-face`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#2A2D33" /><stop offset="1" stopColor="#141519" />
        </linearGradient>
        <linearGradient id={`${u}-orange`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#F89A3C" /><stop offset="1" stopColor="#E4530C" />
        </linearGradient>
      </defs>
      <path d="M32 3 L55 11 V33 C55 47 45 56 32 61 C19 56 9 47 9 33 V11 Z" fill={`url(#${u}-steel)`} />
      <path d="M32 8 L50 14.5 V33 C50 44.5 42 51.5 32 56 C22 51.5 14 44.5 14 33 V14.5 Z" fill={`url(#${u}-face)`} />
      <path d="M49 12 L52.5 15 L27 58 L23.5 55 Z" fill={`url(#${u}-orange)`} opacity="0.9" />
      <g fill="none" stroke={`url(#${u}-orange)`} strokeWidth="4.4" strokeLinejoin="round" strokeLinecap="round">
        <path d="M22.5 41 L32 23 L41.5 41" transform="rotate(0 32 33)" />
        <path d="M22.5 41 L32 23 L41.5 41" transform="rotate(120 32 33)" />
        <path d="M22.5 41 L32 23 L41.5 41" transform="rotate(240 32 33)" />
      </g>
      <g fill="none" stroke="#FFC078" strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round" opacity="0.85">
        <path d="M23.4 40 L32 24.4 L40.6 40" transform="rotate(0 32 33)" />
        <path d="M23.4 40 L32 24.4 L40.6 40" transform="rotate(120 32 33)" />
        <path d="M23.4 40 L32 24.4 L40.6 40" transform="rotate(240 32 33)" />
      </g>
    </svg>
  )
}

/** Wordmark — the mark plus the name, for the login and chat surfaces. */
export function ReedShieldWordmark({ size = 28, className }) {
  return (
    <span className={className} style={{ display: 'inline-flex', alignItems: 'center', gap: 10 }}>
      <ReedShieldMark size={size} />
      <span style={{ fontWeight: 700, fontSize: size * 0.72, letterSpacing: '-0.01em', color: '#1C1917', lineHeight: 1 }}>
        ReedShield
      </span>
    </span>
  )
}
