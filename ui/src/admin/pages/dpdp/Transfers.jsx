import { NavLink, useOutletContext } from 'react-router-dom'
import { Sheet, Stamp, TickMark, Ledger, LedgerLine } from '../../../components/paper/index.js'
import { TRANSFER_STATUS } from '../../../dpdp/transfers.js'

const STATUS_KIND = { documented: 'pass', review: 'warn', incomplete: 'fail', blocked: 'fail' }

export default function Transfers() {
  const { transfers } = useOutletContext()
  const rows = transfers.entries
  const count = s => rows.filter(r => r.status === s).length

  return (
    <>
      <LedgerLine
        entries={[
          { label: 'Transfers on register', figure: rows.length, note: 'processors receiving personal data outside India (S.16)' },
          { label: 'Documented', figure: count('documented'), tone: 'text-pencil-green', note: 'purpose, categories and contract clause recorded', extra: <TickMark kind="pass" /> },
          { label: 'Needs review', figure: count('review'), tone: 'text-pencil-amber', note: 'review older than 180 days or basis under discussion', extra: <TickMark kind="warn" /> },
          { label: 'Basis missing', figure: count('incomplete') + count('blocked'), tone: 'text-pencil-red', note: 'live transfer with no recorded basis', extra: <TickMark kind="fail" /> },
        ]}
      />

      <Sheet title="Cross-border transfer register" reference="WP H-6" subtitle="Section 16 — every transfer of personal data to a processor or replica outside India">
        <Ledger
          columns={[
            { key: 'id',        label: 'Ref', width: 72, mono: true },
            { key: 'processor', label: 'Processor · service' },
            { key: 'route',     label: 'From → To', width: 230 },
            { key: 'purpose',   label: 'Purpose', width: 170 },
            { key: 'data',      label: 'Data categories', width: 210 },
            { key: 'basis',     label: 'Basis', width: 230 },
            { key: 'status',    label: 'Status', width: 130 },
            { key: 'reviewed',  label: 'Reviewed', width: 104, mono: true },
          ]}
          rows={rows}
          renderCell={(row, col) => {
            if (col.key === 'processor') return (
              <span>
                <span className="font-semibold text-gray-900">{row.processor}</span>
                <span className="block text-[13.5px] text-gray-600">{row.service} · {row.volume}</span>
              </span>
            )
            if (col.key === 'route')  return <span className="font-mono text-[13.5px] text-gray-800">{row.from} → {row.to}<span className="block text-gray-600">{row.country}</span></span>
            if (col.key === 'purpose') return <span className={row.purpose === 'Not recorded' ? 'text-pencil-red font-semibold' : 'text-gray-800'}>{row.purpose}</span>
            if (col.key === 'data')   return <span className="text-gray-800">{row.dataCategories.join(', ')}</span>
            if (col.key === 'basis')  return <span className={row.basis === 'Not recorded' ? 'text-pencil-red font-semibold' : 'text-gray-800'}>{row.basis}{row.finding && <NavLink to={`/admin/dpdp/findings/${row.finding}`} className="block text-[13.5px] font-semibold text-accent-700 hover:text-accent-900">{row.finding}</NavLink>}</span>
            if (col.key === 'status') return (
              <span className="inline-flex flex-col items-start gap-1">
                <TickMark kind={STATUS_KIND[row.status]} label={TRANSFER_STATUS[row.status]} />
                {row.note && <span className="text-[12.5px] text-gray-600">{row.note}</span>}
              </span>
            )
            if (col.key === 'reviewed') return row.lastReviewed ?? <span className="text-pencil-red">never</span>
            return row[col.key]
          }}
        />
        <div className="px-5 py-3 border-t border-gray-200 bg-gray-100 flex items-center gap-3 text-[13.5px] text-gray-700">
          <Stamp tone="ink" flat>S.16</Stamp>
          <span>{transfers.restrictedNote}</span>
        </div>
      </Sheet>
    </>
  )
}
