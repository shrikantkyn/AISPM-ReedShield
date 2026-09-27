import { useState, useEffect, useRef } from 'react'
import { Outlet, useLocation }         from 'react-router-dom'
import { PanelLeftOpen } from 'lucide-react'
import { AppSidebar }   from './AppSidebar.jsx'
import { Topbar }       from './Topbar.jsx'
import { ReedShieldMark }    from '../../components/brand/ReedShieldMark.jsx'

/**
 * AppShell — root layout for the /admin section: the binder.
 *
 * The sidebar has three modes:
 *   open    the full 256px binder edge with index tabs and labels
 *   rail    a 64px strip of tab chips and icons (default under 1024px)
 *   hidden  tucked away completely; a pull handle on the left edge brings it back
 *
 * The topbar toggle switches open <-> rail. The sidebar's own "Tuck away"
 * control hides it; the edge handle (or the topbar toggle, or Ctrl+B) reopens
 * it. Deliberate choices persist in localStorage; the narrow-viewport default
 * does not.
 */
const STORAGE_KEY = 'reedshield.sidebar'
const MODES = ['open', 'rail', 'hidden']

function readStoredMode() {
  try {
    const v = localStorage.getItem(STORAGE_KEY)
    if (MODES.includes(v)) return v
    if (v === 'collapsed') return 'rail'
  } catch { /* storage unavailable */ }
  return null
}

function PullHandle({ onOpen }) {
  return (
    <button
      type="button"
      onClick={onOpen}
      title="Show navigation (Ctrl+B)"
      aria-label="Show navigation"
      className="fixed left-0 top-1/2 -translate-y-1/2 z-40 flex flex-col items-center gap-2 w-8 py-3 bg-paper-2 border border-l-0 border-gray-200 text-gray-700 hover:bg-white hover:text-gray-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-400 transition-colors duration-150"
    >
      <ReedShieldMark size={20} />
      <PanelLeftOpen size={16} strokeWidth={2} aria-hidden="true" />
    </button>
  )
}

export function AppShell() {
  const [mode, setMode] = useState(() => {
    const stored = readStoredMode()
    if (stored) return stored
    if (typeof window !== 'undefined' && window.innerWidth < 1024) return 'rail'
    return 'open'
  })
  const mainRef      = useRef(null)
  const { pathname } = useLocation()

  const pageKey = pathname.split('/').slice(0, 3).join('/')
  useEffect(() => {
    if (mainRef.current) mainRef.current.scrollTop = 0
  }, [pageKey])

  function choose(next) {
    setMode(next)
    try { localStorage.setItem(STORAGE_KEY, next) } catch { /* storage unavailable */ }
  }

  const toggleRail = () => choose(mode === 'open' ? 'rail' : 'open')
  const tuckAway   = () => choose('hidden')
  const bringBack  = () => choose('open')

  // Ctrl/Cmd + B hides or shows the sidebar, as in most editors.
  useEffect(() => {
    function onKey(e) {
      if ((e.ctrlKey || e.metaKey) && !e.shiftKey && !e.altKey && e.key.toLowerCase() === 'b') {
        e.preventDefault()
        choose(mode === 'hidden' ? 'open' : 'hidden')
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [mode]) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="flex h-screen overflow-hidden bg-paper">
      {mode !== 'hidden' && <AppSidebar collapsed={mode === 'rail'} onTuck={tuckAway} />}
      {mode === 'hidden' && <PullHandle onOpen={bringBack} />}

      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        <Topbar collapsed={mode !== 'open'} onToggle={mode === 'hidden' ? bringBack : toggleRail} />
        <main ref={mainRef} className="flex-1 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
