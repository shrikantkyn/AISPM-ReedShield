// src/admin/shell/Topbar.jsx
import { useState, useEffect, useRef } from 'react'
import { PanelLeftClose, PanelLeftOpen, CalendarDays, ChevronDown, CircleHelp, Settings, LogOut } from 'lucide-react'
import { NavLink } from 'react-router-dom'
import { cn } from '../../lib/utils.js'
import { SearchCommand }     from './SearchCommand.jsx'
import { NotificationsMenu } from './NotificationsMenu.jsx'
import { IconButton }        from '../../components/ui/IconButton.jsx'
import { Separator }         from '../../components/ui/Separator.jsx'
import { Breadcrumbs }       from '../../components/navigation/Breadcrumbs.jsx'
import { logout }            from '../../api.js'

// ── Period selector ───────────────────────────────────────────────────────────
const PERIODS = ['Last 1 hour', 'Last 24 hours', 'Last 7 days', 'Last 30 days']

function PeriodSelect() {
  const [value, setValue] = useState(PERIODS[1])
  return (
    <label className={cn(
      'relative flex items-center gap-2 h-9 pl-3 pr-8 border border-gray-200 bg-white',
      'text-[14.5px] font-medium text-gray-800 whitespace-nowrap shrink-0',
      'hover:border-gray-500 focus-within:ring-2 focus-within:ring-accent-400 transition-colors duration-150',
    )}>
      <CalendarDays size={14} strokeWidth={1.75} className="text-gray-600 shrink-0" aria-hidden="true" />
      <span className="sr-only">Period</span>
      <select
        value={value}
        onChange={e => setValue(e.target.value)}
        className="appearance-none bg-transparent outline-none pr-1 cursor-pointer"
      >
        {PERIODS.map(p => <option key={p}>{p}</option>)}
      </select>
      <ChevronDown size={12} strokeWidth={2} className="absolute right-2.5 text-gray-600 pointer-events-none" aria-hidden="true" />
    </label>
  )
}

// ── Account menu ──────────────────────────────────────────────────────────────
function AccountMenu() {
  const [open, setOpen] = useState(false)
  const [pos, setPos]   = useState({ top: 0, right: 0 })
  const btnRef   = useRef(null)
  const panelRef = useRef(null)

  function handleOpen() {
    if (btnRef.current) {
      const r = btnRef.current.getBoundingClientRect()
      setPos({ top: r.bottom + 6, right: window.innerWidth - r.right })
    }
    setOpen(v => !v)
  }

  useEffect(() => {
    if (!open) return
    function handle(e) {
      const outsideBtn   = btnRef.current   && !btnRef.current.contains(e.target)
      const outsidePanel = panelRef.current && !panelRef.current.contains(e.target)
      if (outsideBtn && outsidePanel) setOpen(false)
    }
    function onKey(e) { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('mousedown', handle)
    document.addEventListener('keydown', onKey)
    return () => { document.removeEventListener('mousedown', handle); document.removeEventListener('keydown', onKey) }
  }, [open])

  return (
    <div className="relative shrink-0">
      <button
        ref={btnRef}
        onClick={handleOpen}
        className="w-9 h-9 bg-accent-600 text-white flex items-center justify-center text-[13.5px] font-extrabold shrink-0 hover:bg-accent-700 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-400 focus-visible:ring-offset-2"
        title="Account"
        aria-haspopup="menu"
        aria-expanded={open}
      >
        A
      </button>

      {open && (
        <div
          ref={panelRef}
          role="menu"
          style={{ position: 'fixed', top: pos.top, right: pos.right, zIndex: 9999 }}
          className="animate-dropdown w-60 bg-white border border-gray-200 shadow-lg py-1"
        >
          <div className="px-4 py-3">
            <p className="text-[14.5px] font-semibold text-gray-900 leading-tight">Admin</p>
            <p className="text-[13.5px] text-gray-600 leading-tight mt-0.5 font-mono">admin@reedshield.io</p>
            <p className="text-[12.5px] text-gray-600 leading-tight mt-1">Role: spm:admin</p>
          </div>
          <div className="h-px bg-gray-300 mx-1 my-1" />
          <NavLink to="/admin/settings" role="menuitem" onClick={() => setOpen(false)}
            className="flex items-center gap-2.5 w-full px-4 py-2 text-[14.5px] text-gray-700 hover:bg-gray-100 hover:text-gray-900">
            <Settings size={14} strokeWidth={1.75} className="text-gray-600 shrink-0" aria-hidden="true" />
            Settings
          </NavLink>
          <div className="h-px bg-gray-300 mx-1 my-1" />
          <div className="px-2 pt-2 pb-1">
            <button
              role="menuitem"
              onClick={() => { setOpen(false); logout() }}
              className="flex items-center gap-2.5 w-full px-2 py-2 text-[14.5px] font-semibold text-pencil-red border border-pencil-red hover:bg-pencil-red hover:text-white transition-colors duration-150"
            >
              <LogOut size={14} strokeWidth={1.75} className="shrink-0" aria-hidden="true" />
              Log out
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Topbar ────────────────────────────────────────────────────────────────────
export function Topbar({ collapsed, onToggle }) {
  return (
    <header className="h-[60px] shrink-0 bg-white border-b border-gray-200 flex items-center px-3 gap-2.5">
      <IconButton onClick={onToggle} title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'} aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'} size="sm">
        {collapsed
          ? <PanelLeftOpen  size={17} strokeWidth={1.75} />
          : <PanelLeftClose size={17} strokeWidth={1.75} />}
      </IconButton>

      <Separator orientation="vertical" />

      <div className="flex-1 min-w-0 flex items-center">
        <Breadcrumbs />
      </div>

      <div className="flex items-center gap-2">
        <div className="hidden lg:block"><SearchCommand /></div>
        <div className="hidden md:block"><PeriodSelect /></div>
        <Separator orientation="vertical" className="ml-1 hidden md:block" />
        <div className="flex items-center gap-0.5">
          <NotificationsMenu />
          <IconButton title="Help" aria-label="Help" size="sm">
            <CircleHelp size={17} strokeWidth={1.75} />
          </IconButton>
        </div>
        <Separator orientation="vertical" />
        <AccountMenu />
      </div>
    </header>
  )
}
