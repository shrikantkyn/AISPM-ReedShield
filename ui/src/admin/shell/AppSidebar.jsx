import { NavLink, useLocation } from 'react-router-dom'
import { PanelLeftClose } from 'lucide-react'
import { cn } from '../../lib/utils.js'
import { NAV, PINNED, sectionForPath } from '../../config/navigation.js'
import { ReedShieldMark } from '../../components/brand/ReedShieldMark.jsx'

/**
 * AppSidebar — clean light navigation rail.
 *
 * Plain uppercase section labels, and an active item marked by a very light
 * brand-wash background with a violet left indicator. Collapses to a 64px
 * icon rail with tooltips.
 */

function NavItem({ to, icon: Icon, label, end = false, collapsed }) {
  return (
    <div className="relative group/navitem">
      <NavLink
        to={to}
        end={end}
        className={({ isActive }) =>
          cn(
            'relative flex items-center h-9 text-[14px] select-none transition-colors duration-150',
            collapsed ? 'justify-center mx-2 rounded-md' : 'gap-3 pl-4 pr-3 mx-2 rounded-md',
            isActive
              ? 'bg-accent-50 text-accent-800 font-semibold'
              : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900 font-medium',
          )
        }
      >
        {({ isActive }) => (
          <>
            {isActive && !collapsed && (
              <span className="absolute left-0 top-1.5 bottom-1.5 w-[3px] rounded-full bg-accent-600" aria-hidden="true" />
            )}
            <Icon
              size={17}
              strokeWidth={isActive ? 2.1 : 1.75}
              className={cn('block shrink-0', isActive ? 'text-accent-700' : 'text-gray-500 group-hover/navitem:text-gray-700')}
            />
            {!collapsed && <span className="truncate leading-none">{label}</span>}
          </>
        )}
      </NavLink>

      {collapsed && (
        <div
          role="tooltip"
          className={cn(
            'pointer-events-none absolute left-full top-1/2 -translate-y-1/2 ml-2 z-50',
            'px-2.5 py-1.5 bg-gray-900 text-white text-[13px] font-medium whitespace-nowrap rounded-md shadow-md',
            'opacity-0 group-hover/navitem:opacity-100 group-focus-within/navitem:opacity-100 transition-opacity duration-150',
          )}
        >
          {label}
        </div>
      )}
    </div>
  )
}

export function AppSidebar({ collapsed, onTuck }) {
  const { pathname } = useLocation()
  void sectionForPath
  void pathname

  return (
    <aside
      className={cn(
        'shrink-0 h-screen flex flex-col bg-white border-r border-gray-200',
        'transition-[width] duration-200 ease-in-out',
        collapsed ? 'w-16' : 'w-64',
      )}
      style={{ willChange: 'width' }}
      aria-label="Console navigation"
    >
      {/* Brand */}
      <NavLink
        to="/admin/overview"
        className={cn(
          'h-[60px] shrink-0 flex items-center border-b border-gray-200',
          collapsed ? 'justify-center' : 'px-4 gap-2.5',
        )}
        aria-label="ReedShield home"
      >
        <ReedShieldMark size={30} />
        {!collapsed && (
          <div className="min-w-0">
            <p className="text-[17px] font-bold text-gray-900 leading-none tracking-[-0.02em]">ReedShield</p>
            <p className="text-[10.5px] font-medium uppercase tracking-[0.1em] text-gray-400 mt-1 leading-none">AI Security Posture</p>
          </div>
        )}
      </NavLink>

      {/* Navigation */}
      <nav className="flex-1 py-3 overflow-y-auto overflow-x-hidden">
        <NavItem collapsed={collapsed} {...PINNED} />

        {NAV.map(({ section, key, items }) => (
          <div key={key} className="mt-4 first:mt-3">
            {!collapsed
              ? <p className="px-4 mb-1.5 text-[10.5px] font-semibold uppercase tracking-[0.08em] text-gray-400">{section}</p>
              : <div className="mx-4 my-2 border-t border-gray-200" aria-hidden="true" />}
            <div className="space-y-0.5">
              {items.map(item => (
                <NavItem key={item.to} collapsed={collapsed} {...item} />
              ))}
            </div>
          </div>
        ))}
      </nav>

      {/* Tuck away — hides the sidebar completely; the edge handle brings it back */}
      {onTuck && (
        <div className="border-t border-gray-200 shrink-0 py-1.5 px-2">
          <button
            type="button"
            onClick={onTuck}
            title="Tuck the sidebar away (Ctrl+B)"
            aria-label="Tuck the sidebar away"
            className={cn(
              'flex items-center gap-2 h-9 rounded-md text-[13px] font-medium text-gray-500 hover:text-gray-900 hover:bg-gray-100',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-400 transition-colors duration-150',
              collapsed ? 'w-full justify-center' : 'w-full px-2',
            )}
          >
            <PanelLeftClose size={16} strokeWidth={1.9} aria-hidden="true" />
            {!collapsed && <span>Tuck away</span>}
            {!collapsed && <span className="ml-auto font-mono text-[11px] text-gray-400">Ctrl+B</span>}
          </button>
        </div>
      )}

      {/* Footer — signed-in user */}
      <div className="border-t border-gray-200 shrink-0 py-3">
        <div className={cn('flex items-center', collapsed ? 'justify-center' : 'gap-3 px-4')}>
          <div className="w-8 h-8 rounded-full bg-accent-600 text-white flex items-center justify-center text-[12.5px] font-semibold shrink-0" aria-hidden="true">
            A
          </div>
          {!collapsed && (
            <div className="flex-1 min-w-0">
              <p className="text-[13.5px] font-semibold text-gray-900 truncate leading-snug">Admin</p>
              <p className="text-[12px] text-gray-500 truncate leading-snug">admin@reedshield.io</p>
            </div>
          )}
        </div>
      </div>
    </aside>
  )
}
