import { NavLink, Outlet } from 'react-router-dom'
import { RotateCw } from 'lucide-react'
import { cn }            from '../../../lib/utils.js'
import { PageContainer } from '../../../components/layout/PageContainer.jsx'
import { PageHeader }    from '../../../components/layout/PageHeader.jsx'
import { Button }        from '../../../components/ui/Button.jsx'
import { Stamp }         from '../../../components/paper/Stamp.jsx'
import { useDpdp }       from '../../../dpdp/useDpdp.js'

/**
 * DpdpLayout — the DPDPA binder section. Owns the snapshot load and the
 * sub-navigation; child routes read the snapshot from Outlet context.
 */

const TABS = [
  { label: 'Command center',   to: '/admin/dpdp',           end: true },
  { label: 'Controls',         to: '/admin/dpdp/controls' },
  { label: 'Findings',         to: '/admin/dpdp/findings' },
  { label: 'Consent & rights', to: '/admin/dpdp/rights' },
  { label: 'Breach clock',     to: '/admin/dpdp/breach' },
  { label: 'Cross-border',     to: '/admin/dpdp/transfers' },
]

function formatAsOf(iso) {
  return new Date(iso).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false })
}

function SubNav() {
  return (
    <nav aria-label="DPDPA sections" className="flex items-end gap-1 border-b border-gray-200 -mt-2 overflow-x-auto no-scrollbar">
      {TABS.map(t => (
        <NavLink
          key={t.to}
          to={t.to}
          end={t.end}
          className={({ isActive }) => cn(
            'relative px-3.5 h-9 inline-flex items-center text-[14.5px] whitespace-nowrap -mb-px border-b-2 transition-colors duration-150',
            'focus-visible:outline-none focus-visible:bg-gray-100',
            isActive
              ? 'border-tab-comply text-gray-900 font-bold'
              : 'border-transparent text-gray-600 hover:text-gray-900 hover:border-gray-200 font-medium',
          )}
        >
          {t.label}
        </NavLink>
      ))}
    </nav>
  )
}

function LoadingSheets() {
  return (
    <div className="space-y-6" aria-busy="true" aria-live="polite">
      <div className="bg-white border border-gray-200 h-[118px]" />
      <div className="grid grid-cols-12 gap-6">
        <div className="col-span-7 bg-white border border-gray-200 h-64" />
        <div className="col-span-5 bg-white border border-gray-200 h-64" />
      </div>
      <p className="text-[13.5px] text-gray-600">Loading the DPDPA snapshot…</p>
    </div>
  )
}

export default function DpdpLayout() {
  const { data, loading, error, reload } = useDpdp()

  return (
    <PageContainer>
      <PageHeader
        title="DPDPA"
        subtitle="Digital Personal Data Protection Act, 2023 — readiness, findings, rights, breach clock, cross-border register"
        reference="WP H"
        meta={[
          { label: 'Data source', value: data ? (data.source === 'demo' ? 'Demonstration' : 'Live') : '—' },
          { label: 'As of',       value: data ? formatAsOf(data.asOf) : '—', mono: true },
        ]}
        actions={data?.source === 'demo' ? <Stamp tone="red">Demo data</Stamp> : null}
      />

      <SubNav />

      {loading && <LoadingSheets />}

      {!loading && error && (
        <div role="alert" className="bg-white border border-pencil-red px-5 py-4 flex items-start justify-between gap-6">
          <div>
            <p className="text-[16px] font-bold text-gray-900">The DPDPA snapshot did not load.</p>
            <p className="text-[14.5px] text-gray-700 mt-1">{error}</p>
          </div>
          <Button variant="outline" size="sm" onClick={reload}><RotateCw size={13} aria-hidden="true" /> Try again</Button>
        </div>
      )}

      {!loading && !error && data && <Outlet context={data} />}

      <p className="text-[13.5px] text-gray-600 pt-2 border-t border-gray-200">
        Advisory only. Readiness scores and penalty tier references summarise evidence for the Data Protection Officer and counsel; they are not a legal determination of compliance or liability.
      </p>
    </PageContainer>
  )
}
