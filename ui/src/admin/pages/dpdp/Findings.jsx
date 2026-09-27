import { useMemo, useState } from 'react'
import { NavLink, useNavigate, useOutletContext, useParams, useSearchParams } from 'react-router-dom'
import { Download } from 'lucide-react'
import { cn } from '../../../lib/utils.js'
import { Button } from '../../../components/ui/Button.jsx'
import { Sheet, Stamp, TickMark, Ledger, severityKind } from '../../../components/paper/index.js'
import { FINDING_STATUS } from '../../../dpdp/findings.js'
import { exportReport }  from '../../../lib/exportReport.js'

const SEVERITIES = ['Critical', 'High', 'Medium', 'Low']

function Select({ label, value, onChange, options }) {
  return (
    <label className="inline-flex items-center gap-2 text-[13.5px] text-gray-700">
      <span className="font-semibold">{label}</span>
      <select value={value} onChange={e => onChange(e.target.value)}
        className="h-8 px-2 border border-gray-200 bg-white text-[14.5px] text-gray-900 focus:outline-none focus:ring-2 focus:ring-accent-400">
        {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </label>
  )
}

const STATUS_TONE = { open: 'red', in_progress: 'amber', resolved: 'green', risk_accepted: 'ink' }

// ── Detail sheet ──────────────────────────────────────────────────────────────

function FindingDetail({ finding, tier, local, onChange }) {
  const status = local.status ?? finding.status
  const steps = local.steps ?? finding.remediation.map(s => s.done)
  const acknowledged = Boolean(local.acknowledged)
  const doneCount = steps.filter(Boolean).length

  const toggleStep = i => onChange({ ...local, steps: steps.map((v, j) => (j === i ? !v : v)) })

  return (
    <Sheet
      title={finding.title}
      reference={finding.id}
      subtitle={`${finding.asset.type} · ${finding.asset.name}`}
      action={<Stamp tone={STATUS_TONE[status]} flat>{FINDING_STATUS[status]}</Stamp>}
      className="h-full"
      contentClassName="flex flex-col"
    >
      <dl className="grid grid-cols-2 gap-x-6 gap-y-3 px-5 py-4 border-b border-gray-200 text-[13.5px]">
        <div><dt className="text-gray-600">Severity</dt><dd className="mt-0.5"><TickMark kind={severityKind(finding.severity)} label={finding.severity} /></dd></div>
        <div><dt className="text-gray-600">Control</dt><dd className="mt-0.5 font-bold text-gray-900"><span className="font-mono font-normal text-gray-700 mr-1.5">{finding.section}</span>{finding.category}</dd></div>
        <div><dt className="text-gray-600">Owner</dt><dd className="mt-0.5 text-gray-900">{finding.owner}</dd></div>
        <div><dt className="text-gray-600">Detected · Due</dt><dd className="mt-0.5 font-mono text-gray-900">{finding.detected} · {finding.due}</dd></div>
      </dl>

      <div className="px-5 py-4 border-b border-gray-200">
        <p className="text-[12.5px] font-bold uppercase tracking-[0.08em] text-gray-600">Rule rationale</p>
        <p className="text-[14.5px] text-gray-800 mt-1.5 leading-relaxed">{finding.rationale}</p>
      </div>

      <div className="px-5 py-4 border-b border-gray-200">
        <p className="text-[12.5px] font-bold uppercase tracking-[0.08em] text-gray-600">Evidence</p>
        <ul className="mt-2 space-y-1.5">
          {finding.evidence.map(e => (
            <li key={e.ref} className="flex items-start gap-3 text-[14.5px]">
              <span className="font-mono text-[12.5px] text-gray-600 mt-0.5 shrink-0 w-[68px]">{e.ref}</span>
              <span className="text-gray-800">{e.label}</span>
            </li>
          ))}
        </ul>
      </div>

      <div className="px-5 py-4 border-b border-gray-200">
        <div className="flex items-baseline justify-between">
          <p className="text-[12.5px] font-bold uppercase tracking-[0.08em] text-gray-600">Remediation</p>
          <span className="text-[13.5px] text-gray-600 tabular-nums">{doneCount} of {steps.length} done</span>
        </div>
        <ol className="mt-2 space-y-1.5">
          {finding.remediation.map((s, i) => (
            <li key={s.step}>
              <label className="flex items-start gap-3 text-[14.5px] cursor-pointer">
                <input
                  type="checkbox"
                  checked={steps[i]}
                  onChange={() => toggleStep(i)}
                  disabled={status === 'resolved' || status === 'risk_accepted'}
                  className="mt-[3px] w-[15px] h-[15px] shrink-0 accent-accent-600 rounded-none"
                />
                <span className={cn('text-gray-800', steps[i] && 'line-through text-gray-500')}>{s.step}</span>
              </label>
            </li>
          ))}
        </ol>
      </div>

      <div className="px-5 py-4 border-b border-gray-200">
        <p className="text-[12.5px] font-bold uppercase tracking-[0.08em] text-gray-600">Penalty tier reference</p>
        <p className="text-[14.5px] font-bold text-gray-900 mt-1.5">{tier?.label} · {tier?.reference}</p>
        <p className="text-[13.5px] text-gray-700 mt-0.5">{tier?.basis}</p>
        <p className="text-[12.5px] text-gray-500 mt-1.5">For legal review. Not a computed liability.</p>
      </div>

      <div className="mt-auto px-5 py-4 flex items-center gap-2">
        <Button
          size="sm"
          onClick={() => onChange({ ...local, acknowledged: true })}
          disabled={acknowledged}
          aria-pressed={acknowledged}
        >
          {acknowledged ? <TickMark kind="pass" size={14} animate className="text-white" /> : null}
          {acknowledged ? 'Acknowledged' : 'Acknowledge'}
        </Button>
        {status === 'open' && (
          <Button size="sm" variant="outline" onClick={() => onChange({ ...local, status: 'in_progress' })}>Start remediation</Button>
        )}
        {(status === 'open' || status === 'in_progress') && (
          <Button size="sm" variant="outline" onClick={() => onChange({ ...local, status: 'resolved', steps: steps.map(() => true) })} disabled={doneCount < steps.length}>
            Mark resolved
          </Button>
        )}
        {(status === 'open' || status === 'in_progress') && (
          <div className="ml-auto pl-6">
            <Button size="sm" variant="destructive" onClick={() => onChange({ ...local, status: 'risk_accepted' })}>Accept risk</Button>
          </div>
        )}
        {(status === 'resolved' || status === 'risk_accepted') && (
          <div className="ml-auto pl-6">
            <Button size="sm" variant="ghost" onClick={() => onChange({ ...local, status: 'open' })}>Reopen</Button>
          </div>
        )}
      </div>
    </Sheet>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function Findings() {
  const data = useOutletContext()
  const navigate = useNavigate()
  const { findingId } = useParams()
  const [params, setParams] = useSearchParams()
  const [local, setLocal] = useState({})   // per-finding session edits: { [id]: { status, steps, acknowledged } }

  const severity = params.get('severity') ?? ''
  const status   = params.get('status') ?? ''
  const section  = params.get('section') ?? ''

  const set = (key, value) => {
    const next = new URLSearchParams(params)
    if (value) next.set(key, value); else next.delete(key)
    setParams(next, { replace: true })
  }

  const rows = useMemo(() => data.findings
    .map(f => ({ ...f, status: local[f.id]?.status ?? f.status }))
    .filter(f => (!severity || f.severity === severity) && (!status || f.status === status) && (!section || f.section === section)),
  [data.findings, local, severity, status, section])

  const selectedId = findingId ?? rows[0]?.id ?? null
  const selected = data.findings.find(f => f.id === selectedId) ?? null
  const sections = [...new Set(data.findings.map(f => f.section))]

  return (
    <div className="grid grid-cols-12 gap-6 items-start">
      <div className="col-span-12 xl:col-span-7">
        <Sheet
          title="Findings"
          reference="WP H-3"
          subtitle={`${rows.length} of ${data.findings.length} shown · exceptions against controls, with evidence and remediation`}
          action={
            <Button
              variant="outline"
              size="sm"
              onClick={() => exportReport({
                page: 'DPDPA-Findings',
                rows,
                columns: [
                  { key: 'id', label: 'Reference ID' },
                  { key: 'severity', label: 'Severity' },
                  { key: 'title', label: 'Finding' },
                  { key: 'status', label: 'Status' },
                  { key: 'section', label: 'DPDPA Section' },
                  { key: 'due', label: 'Due Date' },
                  { key: 'evidence', label: 'Evidence Summary' },
                  { key: 'remediation', label: 'Remediation' },
                ],
                meta: {
                  totalFindings: data.findings.length,
                  filteredCount: rows.length,
                },
              })}
              className="gap-1.5"
            >
              <Download size={13} aria-hidden="true" /> Export
            </Button>
          }
        >
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2 px-5 py-2.5 border-b border-gray-200 bg-white">
            <Select label="Severity" value={severity} onChange={v => set('severity', v)} options={[{ value: '', label: 'All' }, ...SEVERITIES.map(s => ({ value: s, label: s }))]} />
            <Select label="Status" value={status} onChange={v => set('status', v)} options={[{ value: '', label: 'All' }, ...Object.entries(FINDING_STATUS).map(([value, label]) => ({ value, label }))]} />
            <Select label="Section" value={section} onChange={v => set('section', v)} options={[{ value: '', label: 'All' }, ...sections.map(s => ({ value: s, label: s }))]} />
            {(severity || status || section) && (
              <button type="button" onClick={() => setParams(new URLSearchParams(), { replace: true })} className="text-[13.5px] font-semibold text-accent-700 hover:text-accent-900">Clear filters</button>
            )}
          </div>
          <Ledger
            columns={[
              { key: 'id',       label: 'Ref', width: 92, mono: true },
              { key: 'severity', label: 'Severity', width: 96 },
              { key: 'title',    label: 'Finding' },
              { key: 'status',   label: 'Status', width: 108 },
              { key: 'due',      label: 'Due', width: 96, mono: true },
            ]}
            rows={rows}
            activeKey={selectedId}
            onRowClick={row => navigate(`/admin/dpdp/findings/${row.id}${params.toString() ? `?${params}` : ''}`)}
            empty="No findings match these filters."
            renderCell={(row, col) => {
              if (col.key === 'severity') return <TickMark kind={severityKind(row.severity)} label={row.severity} />
              if (col.key === 'title')    return <span><span className="font-semibold text-gray-900">{row.title}</span><span className="block text-[13px] text-gray-600 mt-0.5"><span className="font-mono">{row.section}</span> · {row.owner}</span></span>
              if (col.key === 'status')   return <Stamp tone={STATUS_TONE[row.status]} flat>{FINDING_STATUS[row.status]}</Stamp>
              if (col.key === 'id')       return <span className="text-gray-800">{row.id}</span>
              if (col.key === 'due')      return <span className="text-gray-700">{row.due}</span>
              return row[col.key]
            }}
          />
        </Sheet>
      </div>

      <div className="col-span-12 xl:col-span-5 xl:sticky xl:top-0">
        {selected ? (
          <FindingDetail
            finding={selected}
            tier={data.penaltyTiers[selected.penaltyTier]}
            local={local[selected.id] ?? {}}
            onChange={next => setLocal(prev => ({ ...prev, [selected.id]: next }))}
          />
        ) : (
          <Sheet title="No finding selected" reference="WP H-3" contentClassName="px-5 py-8">
            <p className="text-[14.5px] text-gray-700">Pick a finding on the left to read its evidence and remediation. <NavLink to="/admin/dpdp/findings" className="font-semibold text-accent-700">Clear filters</NavLink></p>
          </Sheet>
        )}
      </div>
    </div>
  )
}
