import { NavLink, useOutletContext, useSearchParams } from 'react-router-dom'
import { Sheet, TickMark, Ledger, TICK_LABEL } from '../../../components/paper/index.js'
import { CATEGORIES } from '../../../dpdp/controls.js'

const STATUS_OPTIONS = [
  { value: '',     label: 'All statuses' },
  { value: 'fail', label: 'Fail' },
  { value: 'warn', label: 'Warning' },
  { value: 'pass', label: 'Pass' },
  { value: 'na',   label: 'Not assessed' },
]

function Select({ label, value, onChange, options }) {
  return (
    <label className="inline-flex items-center gap-2 text-[13.5px] text-gray-700">
      <span className="font-semibold">{label}</span>
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        className="h-8 px-2 border border-gray-200 bg-white text-[14.5px] text-gray-900 focus:outline-none focus:ring-2 focus:ring-accent-400"
      >
        {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </label>
  )
}

function ControlDetail({ control, tier }) {
  return (
    <div className="px-5 py-4 grid grid-cols-12 gap-6 border-t border-gray-200">
      <div className="col-span-12 lg:col-span-7">
        <p className="text-[12.5px] font-bold uppercase tracking-[0.08em] text-gray-600">Assessment</p>
        <p className="text-[14.5px] text-gray-800 mt-1.5 leading-relaxed max-w-[68ch]">{control.summary}</p>
        <dl className="mt-4 grid grid-cols-3 gap-4 text-[13.5px]">
          <div><dt className="text-gray-600">Weight</dt><dd className="font-bold text-gray-900 mt-0.5">{control.weight} of 3</dd></div>
          <div><dt className="text-gray-600">Evidence items</dt><dd className="font-bold text-gray-900 mt-0.5">{control.evidence}</dd></div>
          <div><dt className="text-gray-600">Last assessed</dt><dd className="font-mono text-gray-900 mt-0.5">{control.lastAssessed ?? '—'}</dd></div>
        </dl>
      </div>
      <div className="col-span-12 lg:col-span-5 border-l border-gray-200 pl-6">
        <p className="text-[12.5px] font-bold uppercase tracking-[0.08em] text-gray-600">Penalty tier reference</p>
        <p className="text-[14.5px] font-bold text-gray-900 mt-1.5">{tier?.label} · {tier?.reference}</p>
        <p className="text-[13.5px] text-gray-700 mt-1 leading-snug">{tier?.basis}</p>
        <p className="text-[12.5px] text-gray-500 mt-1.5">Reference for legal review, not a computed liability.</p>
        <div className="mt-4 flex items-center gap-4">
          <NavLink to={`/admin/dpdp/findings?section=${encodeURIComponent(control.id)}`} className="text-[13.5px] font-semibold text-accent-700 hover:text-accent-900">
            {control.findings} linked finding{control.findings === 1 ? '' : 's'}
          </NavLink>
          <span className="text-[13.5px] text-gray-600">Owner: {control.owner}</span>
        </div>
      </div>
    </div>
  )
}

export default function Controls() {
  const data = useOutletContext()
  const [params, setParams] = useSearchParams()
  const category = params.get('category') ?? ''
  const status   = params.get('status') ?? ''
  const expanded = params.get('control') ?? null

  const set = (key, value) => {
    const next = new URLSearchParams(params)
    if (value) next.set(key, value); else next.delete(key)
    setParams(next, { replace: true })
  }

  const rows = data.controls.filter(c => (!category || c.category === category) && (!status || c.status === status))

  return (
    <Sheet
      title="Control register"
      reference="WP H-2"
      subtitle={`${rows.length} of ${data.controls.length} controls · Sections 4 to 18 of the Act`}
      action={
        <div className="flex items-center gap-4">
          <Select label="Obligation" value={category} onChange={v => set('category', v)} options={[{ value: '', label: 'All obligations' }, ...CATEGORIES.map(c => ({ value: c, label: c }))]} />
          <Select label="Status" value={status} onChange={v => set('status', v)} options={STATUS_OPTIONS} />
        </div>
      }
    >
      <Ledger
        columns={[
          { key: 'id',        label: 'Section', width: 96, mono: true },
          { key: 'title',     label: 'Control' },
          { key: 'category',  label: 'Obligation', width: 190 },
          { key: 'status',    label: 'Status', width: 130 },
          { key: 'weight',    label: 'Wt', width: 52, align: 'center' },
          { key: 'evidence',  label: 'Evidence', width: 84, align: 'right' },
          { key: 'findings',  label: 'Findings', width: 84, align: 'right' },
          { key: 'owner',     label: 'Owner', width: 170 },
        ]}
        rows={rows}
        onRowClick={row => set('control', expanded === row.id ? '' : row.id)}
        expandedKey={expanded}
        renderExpanded={row => <ControlDetail control={row} tier={data.penaltyTiers[row.penaltyTier]} />}
        empty="No controls match these filters."
        renderCell={(row, col) => {
          if (col.key === 'id')       return <span className="text-gray-900">{row.id}</span>
          if (col.key === 'title')    return <span className="font-semibold text-gray-900">{row.title}</span>
          if (col.key === 'status')   return <TickMark kind={row.status} label={TICK_LABEL[row.status]} />
          if (col.key === 'findings') return row.findings > 0 ? <span className="font-bold text-pencil-red">{row.findings}</span> : <span className="text-gray-500">0</span>
          if (col.key === 'category') return <span className="text-gray-700">{row.category}</span>
          if (col.key === 'owner')    return <span className="text-gray-700">{row.owner}</span>
          return row[col.key]
        }}
      />
    </Sheet>
  )
}
