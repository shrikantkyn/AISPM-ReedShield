import { useEffect, useState } from 'react'
import { getDpdpSnapshot } from './api.js'

/**
 * useDpdp — loads the DPDP snapshot once per mount.
 * Returns { data, loading, error, reload }.
 */
export function useDpdp() {
  const [state, setState] = useState({ data: null, loading: true, error: null })
  const [tick, setTick] = useState(0)

  useEffect(() => {
    let cancelled = false
    setState(s => ({ ...s, loading: true, error: null }))
    getDpdpSnapshot()
      .then(data => { if (!cancelled) setState({ data, loading: false, error: null }) })
      .catch(err => { if (!cancelled) setState({ data: null, loading: false, error: err instanceof Error ? err.message : 'Could not load the DPDP snapshot.' }) })
    return () => { cancelled = true }
  }, [tick])

  return { ...state, reload: () => setTick(t => t + 1) }
}
