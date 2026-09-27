import { useEffect, useMemo, useState } from 'react'
import { RotateCw, Download } from 'lucide-react'
import { PageContainer } from '../../components/layout/PageContainer.jsx'
import { PageHeader }    from '../../components/layout/PageHeader.jsx'
import { Button }        from '../../components/ui/Button.jsx'
import { Sheet, Stamp, TickMark, Ledger, LedgerLine, RuledScale } from '../../components/paper/index.js'
import { fetchComplianceReport } from '../api/spm.js'
import { exportReport }  from '../../lib/exportReport.js'

// Human labels and grouping for every framework the evidence engine emits.
const FRAMEWORK_META = {
  NIST_AI_RMF:   { label: 'NIST AI RMF',           group: 'AI governance' },
  ISO_42001:     { label: 'ISO/IEC 42001',         group: 'AI governance' },
  OWASP_LLM_TOP10:{ label: 'OWASP LLM Top 10',     group: 'AI governance' },
  EU_AI_ACT:     { label: 'EU AI Act',             group: 'AI governance' },
  ISO_27001:     { label: 'ISO/IEC 27001:2022',    group: 'Information security' },
  HIPAA:         { label: 'HIPAA Security Rule',    group: 'Healthcare (US)' },
  RBI:           { label: 'RBI (banking, India)',   group: 'India · financial' },
  IRDAI:         { label: 'IRDAI (insurance, India)', group: 'India · financial' },
  SEBI_CSCRF:    { label: 'SEBI CSCRF (markets, India)', group: 'India · financial' },
  CERT_IN:       { label: 'CERT-In Directions 2022', group: 'India · national' },
  DPDPA:         { label: 'DPDP Act, 2023',         group: 'India · privacy' },
}

const STATUS_KIND = { satisfied: 'pass', partial: 'warn', not_satisfied: 'fail' }
const STATUS_LABEL = { satisfied: 'Satisfied', partial: 'Partial', not_satisfied: 'Gap' }

function scoreOf(controls) {
  if (!controls.length) return 0
  const credit = controls.reduce((s, c) => s + (c.status === 'satisfied' ? 1 : c.status === 'partial' ? 0.5 : 0), 0)
  return Math.round((credit / controls.length) * 100)
}
function kindOf(score) { return score >= 80 ? 'pass' : score >= 55 ? 'warn' : 'fail' }
const MARK = { pass: 'bg-pencil-green', warn: 'bg-pencil-amber', fail: 'bg-pencil-red' }
const TEXT = { pass: 'text-pencil-green', warn: 'text-pencil-amber', fail: 'text-pencil-red' }

export default function Frameworks() {
  const [state, setState] = useState({ loading: true, error: null, controls: [] })
  const [active, setActive] = useState(null)
  const [tick, setTick] = useState(0)

  useEffect(() => {
    let cancelled = false
    setState(s => ({ ...s, loading: true, error: null }))
    fetchComplianceReport('all')
      .then(report => {
        if (cancelled) return
        const controls = []
        const fns = report.functions || {}
        for (const fn of Object.values(fns)) {
          for (const c of (fn.controls || [])) controls.push(c)
        }
        const flat = Array.isArray(report.controls) ? report.controls : controls
        setState({ loading: false, error: null, controls: flat.length ? flat : controls })
      })
      .catch(err => !cancelled && setState({ loading: false, error: err.message || 'Could not load compliance evidence.', controls: [] }))
    return () => { cancelled = true }
  }, [tick])

  const byFramework = useMemo(() => {
    const map = {}
    for (const c of state.controls) {
      const fw = c.framework || 'OTHER'
      ;(map[fw] ||= []).push(c)
    }
    return map
  }, [state.controls])

  const rows = useMemo(() => Object.entries(byFramework).map(([fw, controls]) => {
    const meta = FRAMEWORK_META[fw] || { label: fw, group: 'Other' }
    const score = scoreOf(controls)
    return {
      id: fw, label: meta.label, group: meta.group, total: controls.length,
      satisfied: controls.filter(c => c.status === 'satisfied').length,
      partial: controls.filter(c => c.status === 'partial').length,
      gap: controls.filter(c => c.status === 'not_satisfied').length,
      score, kind: kindOf(score),
    }
  }).sort((a, b) => a.group.localeCompare(b.group) || b.score - a.score), [byFramework])

  const overall = useMemo(() => scoreOf(state.controls), [state.controls])
  const activeControls = active ? (byFramework[active] || []) : []

  const handleExport = () => {
    exportReport({
      page: 'Compliance-Frameworks',
      rows,
      columns: [
        { key: 'label', label: 'Framework' },
        { key: 'group', label: 'Jurisdiction / Category' },
        { key: 'score', label: 'Score', value: r => `${r.score}%` },
        { key: 'kind', label: 'Readiness Tier' },
        { key: 'total', label: 'Total Controls' },
        { key: 'satisfied', label: 'Satisfied' },
        { key: 'partial', label: 'Partial' },
        { key: 'gap', label: 'Gaps Open' },
      ],
      meta: {
        overallScore: `${overall}%`,
        totalControls: state.controls.length,
        openGaps: state.controls.filter(c => c.status === 'not_satisfied').length,
      },
    })
  }

  return (
    <PageContainer>
      <PageHeader
        title="Compliance Frameworks"
        subtitle="Live control coverage across AI governance, information security, healthcare, and Indian financial and national frameworks"
        reference="WP C-1"
        actions={
          <>
            <Button variant="outline" size="sm" onClick={() => setTick(t => t + 1)}>
              <RotateCw size={13} aria-hidden="true" /> Re-evaluate
            </Button>
            <Button variant="outline" size="sm" onClick={handleExport} className="gap-1.5">
              <Download size={13} aria-hidden="true" /> Export
            </Button>
          </>
        }
      />

      {state.loading && <p className="text-[14px] text-gray-600">Evaluating controls…</p>}

      {!state.loading && state.error && (
        <div role="alert" className="bg-white border border-pencil-red px-5 py-4">
          <p className="text-[15px] font-bold text-gray-900">Could not load compliance evidence.</p>
          <p className="text-[14px] text-gray-700 mt-1">{state.error}</p>
        </div>
      )}

      {!state.loading && !state.error && (
        <>
          <LedgerLine entries={[
            { label: 'Frameworks tracked', figure: rows.length, note: 'each scored from live control evidence' },
            { label: 'Controls evaluated', figure: state.controls.length, note: 'across all frameworks' },
            { label: 'Overall coverage', figure: overall, unit: '/100', tone: TEXT[kindOf(overall)],
              children: <RuledScale value={overall} className="mt-3" markerClassName={MARK[kindOf(overall)]} bands={[{ from: 0, to: 55, className: 'bg-[#F7E3E1]' }, { from: 55, to: 80, className: 'bg-[#F5EBD2]' }]} /> },
            { label: 'Gaps open', figure: state.controls.filter(c => c.status === 'not_satisfied').length,
              tone: 'text-pencil-red', note: 'controls with no satisfying evidence', extra: <TickMark kind="fail" /> },
          ]} />

          <Sheet title="Coverage by framework" reference="WP C-1.1" subtitle="Click a framework to read its controls">
            <Ledger
              columns={[
                { key: 'label',     label: 'Framework' },
                { key: 'group',     label: 'Domain', width: 190 },
                { key: 'controls',  label: 'Satisfied / Partial / Gap', width: 220 },
                { key: 'score',     label: 'Score', width: 84, align: 'right' },
                { key: 'scale',     label: '', width: 170 },
              ]}
              rows={rows}
              activeKey={active}
              onRowClick={r => setActive(a => a === r.id ? null : r.id)}
              renderCell={(r, col) => {
                if (col.key === 'label')    return <span className="font-semibold text-gray-900">{r.label}</span>
                if (col.key === 'group')    return <span className="text-gray-700">{r.group}</span>
                if (col.key === 'controls') return (
                  <span className="inline-flex items-center gap-3 tabular-nums">
                    <span className="text-pencil-green font-semibold">{r.satisfied}</span>
                    <span className="text-pencil-amber font-semibold">{r.partial}</span>
                    <span className="text-pencil-red font-semibold">{r.gap}</span>
                    <span className="text-gray-500">of {r.total}</span>
                  </span>
                )
                if (col.key === 'score') return <span className={`font-bold tabular-nums ${TEXT[r.kind]}`}>{r.score}</span>
                if (col.key === 'scale') return <RuledScale value={r.score} height={14} markerClassName={MARK[r.kind]} />
                return null
              }}
            />
          </Sheet>

          {active && (
            <Sheet
              title={`${FRAMEWORK_META[active]?.label || active} — controls`}
              reference="WP C-1.2"
              subtitle={`${activeControls.length} controls with their mapped ReedShield control and current evidence`}
              action={<Stamp tone={kindOf(scoreOf(activeControls)) === 'pass' ? 'green' : kindOf(scoreOf(activeControls)) === 'warn' ? 'amber' : 'red'} flat>{scoreOf(activeControls)}/100</Stamp>}
            >
              <Ledger
                columns={[
                  { key: 'category',    label: 'Control', width: 160, mono: true },
                  { key: 'subcategory', label: 'Requirement' },
                  { key: 'cpm_control', label: 'ReedShield control', width: 240 },
                  { key: 'status',      label: 'Evidence', width: 130 },
                ]}
                rows={activeControls}
                rowKey={(c, i) => c.category || i}
                renderCell={(c, col) => {
                  if (col.key === 'status') return <TickMark kind={STATUS_KIND[c.status] || 'na'} label={STATUS_LABEL[c.status] || c.status} />
                  if (col.key === 'subcategory') return <span className="text-gray-800">{c.subcategory || c.category}</span>
                  if (col.key === 'cpm_control') return <span className="text-gray-700">{c.cpm_control}</span>
                  return c[col.key]
                }}
              />
            </Sheet>
          )}
        </>
      )}
    </PageContainer>
  )
}
