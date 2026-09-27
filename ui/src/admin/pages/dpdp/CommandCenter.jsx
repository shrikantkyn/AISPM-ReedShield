import { useMemo } from 'react'
import { NavLink, useOutletContext } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'
import { cn } from '../../../lib/utils.js'
import { Sheet, TickMark, Ledger, LedgerLine, RuledScale, ClockDigits } from '../../../components/paper/index.js'
import { computeReadiness, readinessKind, countBySeverity } from '../../../dpdp/score.js'
import { CATEGORIES } from '../../../dpdp/controls.js'

const KIND_MARKER = { pass: 'bg-pencil-green', warn: 'bg-pencil-amber', fail: 'bg-pencil-red' }
const KIND_TEXT   = { pass: 'text-pencil-green', warn: 'text-pencil-amber', fail: 'text-pencil-red' }

// ── Trend on ruled paper ──────────────────────────────────────────────────────

function ReadinessTrend({ history }) {
  const W = 640, H = 150, padL = 34, padR = 16, padT = 14, padB = 26
  const xs = history.map((_, i) => padL + (i / (history.length - 1)) * (W - padL - padR))
  const y  = v => padT + (1 - v / 100) * (H - padT - padB)
  const d  = history.map((h, i) => `${i === 0 ? 'M' : 'L'} ${xs[i].toFixed(1)} ${y(h.score).toFixed(1)}`).join(' ')
  const gridVals = [0, 25, 50, 75, 100]
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto" role="img" aria-label={`Readiness by week, ${history[0].score} to ${history[history.length - 1].score}`}>
      {gridVals.map(v => (
        <g key={v}>
          <line x1={padL} x2={W - padR} y1={y(v)} y2={y(v)} stroke="var(--rule)" strokeWidth="1" />
          <text x={padL - 6} y={y(v) + 3.5} textAnchor="end" fontSize="11.5" fill="var(--ink-3)" fontFamily="Fragment Mono, monospace">{v}</text>
        </g>
      ))}
      <rect x={padL} y={y(80)} width={W - padL - padR} height={y(55) - y(80)} fill="#F5EBD2" opacity="0.6" />
      <rect x={padL} y={y(55)} width={W - padL - padR} height={y(0) - y(55)} fill="#F7E3E1" opacity="0.55" />
      <path d={d} fill="none" stroke="var(--stamp)" strokeWidth="2" strokeLinejoin="miter" strokeLinecap="square" />
      {history.map((h, i) => (
        <g key={h.week}>
          <rect x={xs[i] - 3} y={y(h.score) - 3} width="6" height="6" fill="var(--sheet)" stroke="var(--stamp)" strokeWidth="2" />
          <text x={xs[i]} y={y(h.score) - 8} textAnchor="middle" fontSize="12.5" fontWeight="700" fill="var(--ink)" fontFamily="Archivo, sans-serif">{h.score}</text>
          <text x={xs[i]} y={H - 8} textAnchor="middle" fontSize="11.5" fill="var(--ink-3)" fontFamily="Fragment Mono, monospace">{h.week.slice(5)}</text>
        </g>
      ))}
    </svg>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function CommandCenter() {
  const data = useOutletContext()
  const readiness = useMemo(() => computeReadiness(data.controls), [data.controls])
  const kind = readinessKind(readiness.score)
  const sev = countBySeverity(data.findings)
  const overdueRequests = data.rights.requests.reduce((n, r) => n + r.overdue, 0)
  const activeClocks = 0

  const categoryRows = CATEGORIES
    .filter(c => readiness.byCategory[c])
    .map(c => ({ id: c, category: c, ...readiness.byCategory[c], controls: data.controls.filter(x => x.category === c) }))

  return (
    <>
      <LedgerLine
        entries={[
          {
            label: 'Readiness score',
            figure: readiness.score,
            unit: '/100',
            tone: KIND_TEXT[kind],
            movement: `${readiness.assessed} of ${readiness.total} controls assessed`,
            note: 'weighted; not-assessed controls excluded',
            children: <RuledScale value={readiness.score} className="mt-3" markerClassName={KIND_MARKER[kind]} bands={[{ from: 0, to: 55, className: 'bg-[#F7E3E1]' }, { from: 55, to: 80, className: 'bg-[#F5EBD2]' }]} />,
          },
          {
            label: 'Open findings',
            figure: sev.Critical + sev.High + sev.Medium + sev.Low,
            movement: `${sev.Critical} critical · ${sev.High} high`,
            movementTone: sev.Critical > 0 ? 'text-pencil-red' : 'text-gray-800',
            note: `${sev.Medium} medium · ${sev.Low} low`,
            extra: <NavLink to="/admin/dpdp/findings" className="text-[13.5px] font-semibold text-accent-700 hover:text-accent-900 inline-flex items-center gap-1">Open <ArrowRight size={12} aria-hidden="true" /></NavLink>,
          },
          {
            label: 'Breach clock',
            figure: <ClockDigits text="00:00:00" size={30} muted={activeClocks === 0} />,
            movement: activeClocks === 0 ? 'No clock running' : `${activeClocks} running`,
            note: `72-hour Board window · last drill ${data.breach.lastDrill.date}`,
          },
          {
            label: 'Requests overdue',
            figure: overdueRequests,
            tone: overdueRequests > 0 ? 'text-pencil-amber' : 'text-gray-900',
            movement: `${data.rights.requests.reduce((n, r) => n + r.open, 0)} open`,
            note: 'Data Principal requests against internal SLA',
            extra: <TickMark kind={overdueRequests > 0 ? 'warn' : 'pass'} label />,
          },
        ]}
      />

      <div className="grid grid-cols-12 gap-6">
        <div className="col-span-12 xl:col-span-7">
          <Sheet title="Readiness by obligation" reference="WP H-1.1" subtitle="Each category scored from its own controls">
            <Ledger
              columns={[
                { key: 'category', label: 'Obligation' },
                { key: 'controls', label: 'Controls', width: 150 },
                { key: 'score',    label: 'Score', width: 90, align: 'right' },
                { key: 'scale',    label: '', width: 160 },
              ]}
              rows={categoryRows}
              renderCell={(row, col) => {
                if (col.key === 'category') return <NavLink to={`/admin/dpdp/controls?category=${encodeURIComponent(row.category)}`} className="font-semibold text-gray-900 hover:underline underline-offset-4 decoration-gray-400">{row.category}</NavLink>
                if (col.key === 'controls') return (
                  <span className="inline-flex items-center gap-2">
                    {row.controls.map(c => <TickMark key={c.id} kind={c.status} size={13} />)}
                    <span className="text-[13.5px] text-gray-600">{row.assessed}/{row.total}</span>
                  </span>
                )
                if (col.key === 'score') return <span className={cn('font-bold tabular-nums', row.assessed === 0 ? 'text-gray-400' : KIND_TEXT[readinessKind(row.score)])}>{row.assessed === 0 ? '—' : row.score}</span>
                if (col.key === 'scale') return row.assessed === 0 ? <span className="text-[12.5px] text-gray-500">Not assessed</span> : <RuledScale value={row.score} height={14} markerClassName={KIND_MARKER[readinessKind(row.score)]} />
                return null
              }}
            />
          </Sheet>
        </div>

        <div className="col-span-12 xl:col-span-5">
          <Sheet title="Critical gaps" reference="WP H-1.2" subtitle="Controls marked as exceptions, heaviest weight first" className="h-full">
            {readiness.criticalGaps.length === 0 ? (
              <p className="px-5 py-8 text-[14.5px] text-gray-600">No control is currently marked as an exception.</p>
            ) : (
              <ul className="divide-y divide-gray-200">
                {readiness.criticalGaps.map(c => {
                  const tier = data.penaltyTiers[c.penaltyTier]
                  return (
                    <li key={c.id} className="px-5 py-3">
                      <div className="flex items-start gap-3">
                        <TickMark kind="fail" size={15} className="mt-0.5" />
                        <div className="min-w-0 flex-1">
                          <p className="text-[14.5px] font-bold text-gray-900 leading-snug"><span className="font-mono text-[12.5px] text-gray-600 mr-2">{c.id}</span>{c.title}</p>
                          <p className="text-[13.5px] text-gray-700 mt-1 leading-snug">{c.summary}</p>
                          <p className="text-[12.5px] text-gray-600 mt-1.5">
                            Owner {c.owner} · weight {c.weight} · penalty tier reference: {tier?.reference} <span className="text-gray-500">(legal review)</span>
                          </p>
                        </div>
                        <NavLink to={`/admin/dpdp/findings?section=${encodeURIComponent(c.id)}`} className="shrink-0 text-[13.5px] font-semibold text-accent-700 hover:text-accent-900">{c.findings} finding{c.findings === 1 ? '' : 's'}</NavLink>
                      </div>
                    </li>
                  )
                })}
              </ul>
            )}
          </Sheet>
        </div>
      </div>

      <Sheet title="Readiness by week" reference="WP H-1.3" subtitle="Eight weekly readings; bands mark the 55 and 80 thresholds" contentClassName="px-5 py-4">
        <ReadinessTrend history={data.history} />
      </Sheet>
    </>
  )
}
