import { NavLink } from 'react-router-dom'
import { ArrowRight, Download } from 'lucide-react'
import { cn }            from '../../lib/utils.js'
import { PageContainer } from '../../components/layout/PageContainer.jsx'
import { PageHeader }    from '../../components/layout/PageHeader.jsx'
import { Button }        from '../../components/ui/Button.jsx'
import { Sheet, Stamp, TickMark, Ledger, LedgerLine, RuledScale, ClockDigits, severityKind } from '../../components/paper/index.js'
import { AS_OF, TRIAL_BALANCE, ATTACK_PATH, RECENT_ALERTS, MODULE_HEALTH, DPDP_SUMMARY } from '../dashboard/data.js'
import { exportReport }  from '../../lib/exportReport.js'

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatAsOf(iso) {
  const d = new Date(iso)
  return d.toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false })
}

const TAG_TONE = {
  SEC: 'bg-tab-protect',
  IAM: 'bg-tab-discover text-gray-900',
  AI:  'bg-tab-monitor',
  PII: 'bg-tab-comply',
  K8s: 'bg-tab-platform',
}

// ── Trial balance ─────────────────────────────────────────────────────────────

function TrialBalance() {
  const tb = TRIAL_BALANCE
  const riskKind = tb.blendedRisk.score >= 70 ? 'fail' : tb.blendedRisk.score >= 40 ? 'warn' : 'pass'
  return (
    <LedgerLine
      entries={[
        {
          label: 'Blended risk score',
          figure: tb.blendedRisk.score,
          unit: '/100',
          tone: riskKind === 'fail' ? 'text-pencil-red' : riskKind === 'warn' ? 'text-pencil-amber' : 'text-pencil-green',
          movement: `${tb.blendedRisk.movement7d > 0 ? '+' : ''}${tb.blendedRisk.movement7d} pts`,
          movementTone: tb.blendedRisk.movement7d <= 0 ? 'text-pencil-green' : 'text-pencil-red',
          note: 'over 7 days · lower is better',
          children: (
            <RuledScale
              value={tb.blendedRisk.score}
              className="mt-3"
              markerClassName={riskKind === 'fail' ? 'bg-pencil-red' : riskKind === 'warn' ? 'bg-pencil-amber' : 'bg-pencil-green'}
              bands={[{ from: 70, to: 100, className: 'bg-[#F7E3E1]' }, { from: 40, to: 70, className: 'bg-[#F5EBD2]' }]}
            />
          ),
        },
        {
          label: 'Open critical alerts',
          figure: tb.openCritical.count,
          movement: `${tb.openCritical.today} today`,
          movementTone: 'text-pencil-red',
          note: `across ${tb.openCritical.modules} modules · oldest ${tb.openCritical.oldest}`,
          extra: <TickMark kind="fail" label="Exceptions" />,
        },
        {
          label: 'Mean time to freeze',
          figure: tb.meanTimeToFreeze.seconds,
          unit: 's',
          movement: `within ${tb.meanTimeToFreeze.slaSeconds} s SLA`,
          movementTone: 'text-pencil-green',
          note: tb.meanTimeToFreeze.basis,
          extra: <TickMark kind="pass" label="Agreed" />,
        },
        {
          label: 'Modules enforced',
          figure: `${tb.modulesEnforced.enforced}/${tb.modulesEnforced.total}`,
          note: 'every policy bundle in enforce mode, not monitor-only',
          extra: <Stamp tone="stamp">Enforced</Stamp>,
        },
      ]}
    />
  )
}

// ── Attack path ───────────────────────────────────────────────────────────────

function AttackPathSheet() {
  const p = ATTACK_PATH
  return (
    <Sheet
      title="Unified Risk Graph"
      reference="WP G-2"
      subtitle={`Highest-confidence attack path this week · confidence ${Math.round(p.confidence * 100)}%`}
      action={
        <NavLink to="/admin/lineage">
          <Button size="sm">Open full graph <ArrowRight size={13} strokeWidth={2.25} aria-hidden="true" /></Button>
        </NavLink>
      }
      contentClassName="p-5"
    >
      <ol className="relative grid grid-cols-2 gap-y-6 md:grid-cols-4 md:gap-y-0" aria-label="Attack path, four steps">
        <div className="hidden md:block absolute left-[12%] right-[12%] top-[26px] h-px bg-gray-900" aria-hidden="true" />
        {p.nodes.map((n, i) => (
          <li key={n.id} className="relative min-w-0 px-2">
            <NavLink to={n.to} className="group block focus-visible:outline-none">
              <div className="flex justify-center">
                <span className={cn(
                  'relative z-10 inline-flex items-center justify-center h-[52px] w-[52px] border-2 border-gray-900 bg-white',
                  'text-[13.5px] font-extrabold tracking-[0.06em] text-white',
                  'group-hover:-translate-y-0.5 group-focus-visible:ring-2 group-focus-visible:ring-accent-400 transition-transform duration-150',
                  TAG_TONE[n.tag],
                )}>
                  {n.tag}
                </span>
              </div>
              <div className="mt-3 text-center">
                <p className="font-mono text-[12px] text-gray-500 leading-none">{String(i + 1).padStart(2, '0')} · {n.ref}</p>
                <p className="text-[14.5px] font-bold text-gray-900 mt-1.5 leading-snug">{n.title}</p>
                <p className="text-[13.5px] text-gray-600 mt-0.5 leading-snug truncate">{n.asset}</p>
                <p className="text-[12.5px] text-gray-500 mt-1 leading-none">{n.module}</p>
              </div>
            </NavLink>
          </li>
        ))}
      </ol>

      <div className="mt-5 pt-3 border-t border-gray-200 flex items-center gap-3 text-[13.5px] text-gray-700">
        <span className={cn('inline-flex items-center justify-center h-6 px-1.5 border border-gray-900 text-[12px] font-extrabold tracking-[0.06em] text-white', TAG_TONE[p.related.tag])}>
          {p.related.tag}
        </span>
        <span><span className="font-semibold text-gray-900">Related:</span> {p.related.title} · {p.related.asset}</span>
        <span className="ml-auto shrink-0 whitespace-nowrap font-mono text-[12.5px] text-gray-500">{p.related.ref}</span>
      </div>
    </Sheet>
  )
}

// ── DPDPA sheet ───────────────────────────────────────────────────────────────

function DpdpSheet() {
  const s = DPDP_SUMMARY
  const kind = s.readiness >= 80 ? 'pass' : s.readiness >= 55 ? 'warn' : 'fail'
  return (
    <Sheet
      title="DPDPA readiness"
      reference="WP H-1"
      subtitle="Digital Personal Data Protection Act, 2023"
      action={
        <NavLink to="/admin/dpdp" className="text-[13.5px] font-semibold text-accent-700 hover:text-accent-900 inline-flex items-center gap-1">
          Command center <ArrowRight size={12} strokeWidth={2.25} aria-hidden="true" />
        </NavLink>
      }
      contentClassName="flex flex-col"
    >
      <div className="px-5 py-4 border-b border-gray-200">
        <div className="flex items-baseline justify-between">
          <p className="text-[12.5px] font-bold uppercase tracking-[0.08em] text-gray-600">Readiness</p>
          <TickMark kind={kind} label />
        </div>
        <div className="flex items-baseline gap-1.5 mt-1.5">
          <span className="text-[36px] font-bold tabular-nums leading-none tracking-[-0.02em] text-gray-900">{s.readiness}</span>
          <span className="text-[14.5px] text-gray-500 font-medium">/100</span>
        </div>
        <RuledScale value={s.readiness} className="mt-3" markerClassName="bg-accent-600" bands={[{ from: 0, to: 55, className: 'bg-[#F7E3E1]' }, { from: 55, to: 80, className: 'bg-[#F5EBD2]' }]} />
      </div>

      <ul className="px-5 py-2 divide-y divide-gray-200">
        {s.categories.map(c => (
          <li key={c.label} className="flex items-center justify-between py-1.5 text-[14.5px]">
            <span className="text-gray-800">{c.label}</span>
            <TickMark kind={c.status} label />
          </li>
        ))}
      </ul>

      <div className="mt-auto px-5 py-4 border-t border-gray-200 bg-gray-100">
        <div className="flex items-baseline justify-between">
          <p className="text-[12.5px] font-bold uppercase tracking-[0.08em] text-gray-600">Breach clock</p>
          <span className="text-[12.5px] text-gray-600">{s.windowHours}-hour Board window</span>
        </div>
        <div className="mt-2 flex items-end justify-between gap-3">
          <ClockDigits text="00:00:00" size={28} muted />
          <p className="text-[13.5px] text-gray-700 text-right leading-snug">
            {s.breachClocks === 0 ? 'No clock running' : `${s.breachClocks} running`}<br />
            <span className="text-gray-500">Last drill {s.lastDrill}</span>
          </p>
        </div>
      </div>
    </Sheet>
  )
}

// ── Recent alerts ─────────────────────────────────────────────────────────────

const ALERT_COLUMNS = [
  { key: 'severity', label: 'Severity', width: 120 },
  { key: 'title',    label: 'Alert' },
  { key: 'module',   label: 'Module', width: 200 },
  { key: 'age',      label: 'Age', width: 72, align: 'right', mono: true },
]

function RecentAlertsSheet() {
  return (
    <Sheet
      title="Recent alerts"
      reference="WP A-3"
      subtitle="Cross-module alert stream, newest first"
      action={
        <NavLink to="/admin/alerts" className="text-[13.5px] font-semibold text-accent-700 hover:text-accent-900 inline-flex items-center gap-1">
          View all alerts <ArrowRight size={12} strokeWidth={2.25} aria-hidden="true" />
        </NavLink>
      }
    >
      <Ledger
        columns={ALERT_COLUMNS}
        rows={RECENT_ALERTS}
        renderCell={(row, col) => {
          if (col.key === 'severity') return <TickMark kind={severityKind(row.severity)} label={row.severity} />
          if (col.key === 'title')    return <NavLink to={row.to} className="text-gray-900 hover:underline underline-offset-4 decoration-gray-400">{row.title}</NavLink>
          if (col.key === 'module')   return <span className="text-gray-700">{row.module}</span>
          if (col.key === 'age')      return <span className="text-gray-600">{row.age}</span>
          return row[col.key]
        }}
      />
    </Sheet>
  )
}

// ── Module health ─────────────────────────────────────────────────────────────

function ModuleHealthSheet() {
  return (
    <Sheet title="Module health" reference="WP A-4" subtitle="One line per module, ticked against its own SLA">
      <ul className="divide-y divide-gray-200">
        {MODULE_HEALTH.map(m => (
          <li key={m.id}>
            <NavLink to={m.to} className="flex items-center gap-3 px-5 py-2.5 hover:bg-gray-100 transition-colors duration-150 focus-visible:outline-none focus-visible:bg-gray-100">
              <TickMark kind={m.status} size={15} />
              <span className="text-[14.5px] font-semibold text-gray-900 w-32 sm:w-36 shrink-0">{m.module}</span>
              <span className="text-[14px] text-gray-700 flex-1 min-w-0 truncate">{m.figures}</span>
              {m.stamp && <Stamp tone="green" flat className="shrink-0">{m.stamp}</Stamp>}
            </NavLink>
          </li>
        ))}
      </ul>
    </Sheet>
  )
}

// ── Legend ────────────────────────────────────────────────────────────────────

function TickLegend() {
  return (
    <div className="flex flex-wrap items-center gap-x-6 gap-y-2 pt-2 text-[13.5px] text-gray-700">
      <span className="font-bold uppercase tracking-[0.08em] text-[12.5px] text-gray-600">Tick marks</span>
      <TickMark kind="pass" label="Agreed to evidence" />
      <TickMark kind="warn" label="Follow up" />
      <TickMark kind="fail" label="Exception" />
      <TickMark kind="na"   label="Not assessed" />
      <span className="ml-auto inline-flex items-center gap-3">
        <Stamp tone="red" flat>Demo data</Stamp>
        <span className="text-gray-600">All figures on this sheet are demonstration data pending live endpoints.</span>
      </span>
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function Dashboard() {
  return (
    <PageContainer>
      <PageHeader
        title="Dashboard"
        subtitle="Organizational posture across AI, cloud, code, offensive validation, and DPDPA"
        reference="WP A-1"
        meta={[
          { label: 'Prepared by', value: 'admin@reedshield.io', mono: true },
          { label: 'As of',       value: formatAsOf(AS_OF), mono: true },
        ]}
        actions={
          <Button
            variant="outline"
            size="sm"
            onClick={() => exportReport({
              page: 'Executive-Posture-Dashboard',
              rows: RECENT_ALERTS,
              columns: [
                { key: 'id', label: 'Alert Ref' },
                { key: 'severity', label: 'Severity' },
                { key: 'title', label: 'Finding Title' },
                { key: 'module', label: 'Originating Module' },
                { key: 'age', label: 'Reported Age' },
              ],
              meta: {
                preparedBy: 'admin@reedshield.io',
                asOf: AS_OF,
                blendedRiskScore: TRIAL_BALANCE.blendedRisk.score,
                openCriticalAlerts: TRIAL_BALANCE.openCritical.count,
                meanTimeToFreeze: `${TRIAL_BALANCE.meanTimeToFreeze.seconds}s`,
                modulesEnforced: `${TRIAL_BALANCE.modulesEnforced.enforced}/${TRIAL_BALANCE.modulesEnforced.total}`,
              },
            })}
          >
            <Download size={13} strokeWidth={2} aria-hidden="true" /> Export sheet
          </Button>
        }
      />

      <TrialBalance />

      <div className="grid grid-cols-12 gap-6">
        <div className="col-span-12 xl:col-span-8"><AttackPathSheet /></div>
        <div className="col-span-12 xl:col-span-4"><DpdpSheet /></div>
      </div>

      <div className="grid grid-cols-12 gap-6">
        <div className="col-span-12 xl:col-span-7"><RecentAlertsSheet /></div>
        <div className="col-span-12 xl:col-span-5"><ModuleHealthSheet /></div>
      </div>

      <TickLegend />
    </PageContainer>
  )
}
