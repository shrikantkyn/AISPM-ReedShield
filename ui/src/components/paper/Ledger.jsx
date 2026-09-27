import { Fragment } from 'react'
import { cn } from '../../lib/utils.js'

/**
 * Ledger — a compact enterprise data table: light header row, hairline row
 * separators, hover state, no vertical rulings. Dense by default so security
 * operators see many rows at once.
 *
 *   columns: [{ key, label, align: 'left'|'right'|'center', width, mono, className }]
 *   rows:    array of objects; renderCell(row, col) overrides cell output.
 */
export function Ledger({ columns, rows, rowKey = (r, i) => r.id ?? i, renderCell, onRowClick, activeKey, expandedKey, renderExpanded, empty = 'Nothing to show.', dense = false, className }) {
  return (
    <div className={cn('overflow-x-auto', className)}>
      <table className="w-full border-collapse text-[13.5px] text-gray-700">
        <thead>
          <tr className="bg-gray-50 border-b border-gray-200">
            {columns.map((c) => (
              <th
                key={c.key}
                scope="col"
                style={c.width ? { width: c.width } : undefined}
                className={cn(
                  'px-3 text-[11px] font-semibold uppercase tracking-[0.06em] text-gray-400 whitespace-nowrap',
                  dense ? 'py-2' : 'py-2.5',
                  c.align === 'right' ? 'text-right' : c.align === 'center' ? 'text-center' : 'text-left',
                )}
              >
                {c.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 && (
            <tr>
              <td colSpan={columns.length} className="px-3 py-10 text-center text-[13.5px] text-gray-400">{empty}</td>
            </tr>
          )}
          {rows.map((row, ri) => {
            const key = rowKey(row, ri)
            const active = activeKey != null && key === activeKey
            const expanded = expandedKey != null && key === expandedKey && typeof renderExpanded === 'function'
            return (
              <Fragment key={key}>
              <tr
                onClick={onRowClick ? () => onRowClick(row) : undefined}
                tabIndex={onRowClick ? 0 : undefined}
                onKeyDown={onRowClick ? (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onRowClick(row) } } : undefined}
                aria-selected={onRowClick ? active : undefined}
                aria-expanded={renderExpanded ? expanded : undefined}
                className={cn(
                  'border-b border-gray-100 last:border-b-0 transition-colors',
                  onRowClick && 'cursor-pointer hover:bg-gray-50 focus-visible:bg-gray-50 outline-none',
                  (active || expanded) && 'bg-accent-50 hover:bg-accent-50',
                )}
              >
                {columns.map((c) => (
                  <td
                    key={c.key}
                    className={cn(
                      'px-3 align-middle',
                      dense ? 'py-2' : 'py-3',
                      c.mono && 'font-mono text-[12.5px]',
                      c.align === 'right' ? 'text-right tabular-nums' : c.align === 'center' ? 'text-center' : 'text-left',
                      c.className,
                    )}
                  >
                    {renderCell ? renderCell(row, c) : row[c.key]}
                  </td>
                ))}
              </tr>
              {expanded && (
                <tr className="border-b border-gray-200 bg-gray-50/60">
                  <td colSpan={columns.length} className="px-0 py-0">
                    {renderExpanded(row)}
                  </td>
                </tr>
              )}
              </Fragment>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

/**
 * LedgerLine — a row of summary metric cards: small state accent, large
 * number, concise label, optional movement/note and a trailing element.
 * Each entry: { label, figure, unit, movement, movementTone, note, tone,
 * extra, children }.
 */
export function LedgerLine({ entries, className }) {
  return (
    <div
      className={cn(
        'grid gap-4',
        'grid-cols-1 sm:grid-cols-2',
        entries.length >= 4 ? 'xl:grid-cols-4' : entries.length === 3 ? 'xl:grid-cols-3' : '',
        className,
      )}
    >
      {entries.map(e => (
        <div key={e.label} className="bg-white border border-gray-200 rounded-lg shadow-xs px-5 py-4 min-w-0">
          <p className="text-[12px] font-medium uppercase tracking-[0.05em] text-gray-400 leading-none">{e.label}</p>
          <div className="mt-3 flex items-baseline gap-1.5 min-w-0">
            <span className={cn('text-[30px] font-semibold tabular-nums leading-none tracking-[-0.02em]', e.tone ?? 'text-gray-900')}>{e.figure}</span>
            {e.unit && <span className="text-[14px] text-gray-400 font-medium">{e.unit}</span>}
            {e.extra && <span className="ml-auto shrink-0">{e.extra}</span>}
          </div>
          {(e.movement || e.note) && (
            <p className="mt-2.5 text-[12.5px] leading-snug text-gray-500">
              {e.movement && <span className={cn('font-semibold', e.movementTone ?? 'text-gray-700')}>{e.movement}</span>}
              {e.movement && e.note && <span className="text-gray-300"> · </span>}
              {e.note && <span>{e.note}</span>}
            </p>
          )}
          {e.children}
        </div>
      ))}
    </div>
  )
}
