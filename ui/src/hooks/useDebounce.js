import { useEffect, useState } from 'react'

/**
 * useDebounce — returns `value` after it has stayed unchanged for `delay` ms.
 * Keeps typing responsive while list filtering runs on the settled value.
 */
export function useDebounce(value, delay = 150) {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delay)
    return () => clearTimeout(id)
  }, [value, delay])
  return debounced
}
