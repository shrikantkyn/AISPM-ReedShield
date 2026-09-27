import { useOutletContext } from 'react-router-dom'
import { Sheet, Stamp, TickMark, Ledger, LedgerLine } from '../../../components/paper/index.js'

const REQ_STATUS = { open: 'Open', in_progress: 'In progress', done: 'Fulfilled' }

export default function Rights() {
  const { rights } = useOutletContext()
  const { consent, requests, grievance, recent } = rights
  const noticePct = Math.round((consent.activitiesWithNotice / consent.activitiesConsentBased) * 100)

  return (
    <>
      <LedgerLine
        entries={[
          {
            label: 'Notice coverage (S.5)',
            figure: `${consent.activitiesWithNotice}/${consent.activitiesConsentBased}`,
            movement: `${noticePct}% of consent-based activities`,
            movementTone: noticePct >= 95 ? 'text-pencil-green' : 'text-pencil-amber',
            note: 'a notice must accompany or precede each consent request',
            extra: <TickMark kind={noticePct >= 95 ? 'pass' : 'warn'} label />,
          },
          {
            label: 'Consent records (S.6)',
            figure: consent.consentRecords.toLocaleString('en-IN'),
            movement: `${consent.purposesRegistered} purposes registered`,
            note: 'one record per principal per purpose',
          },
          {
            label: 'Withdrawal median (S.6(4))',
            figure: consent.withdrawalMedianHours,
            unit: 'h',
            movement: `${consent.withdrawalsLast30d.toLocaleString('en-IN')} withdrawals in 30 days`,
            note: 'time to propagate to every processor',
            extra: <TickMark kind="pass" label />,
          },
          {
            label: 'Consent Manager',
            figure: consent.consentManagerRegistered ? 'Yes' : 'No',
            tone: consent.consentManagerRegistered ? 'text-pencil-green' : 'text-pencil-amber',
            movement: consent.consentManagerRegistered ? 'registered with the Board' : 'not registered',
            note: 'registration under the Rules is optional unless you act as one',
            extra: <TickMark kind={consent.consentManagerRegistered ? 'pass' : 'na'} label />,
          },
        ]}
      />

      <div className="grid grid-cols-12 gap-6">
        <div className="col-span-12 xl:col-span-7">
          <Sheet title="Data Principal requests" reference="WP H-4.1" subtitle="Queue per right against the internal SLA">
            <Ledger
              columns={[
                { key: 'right',      label: 'Right' },
                { key: 'section',    label: 'Section', width: 84, mono: true },
                { key: 'open',       label: 'Open', width: 72, align: 'right' },
                { key: 'overdue',    label: 'Overdue', width: 84, align: 'right' },
                { key: 'medianDays', label: 'Median', width: 84, align: 'right' },
                { key: 'slaDays',    label: 'SLA', width: 72, align: 'right' },
                { key: 'last30d',    label: '30 d', width: 72, align: 'right' },
                { key: 'tick',       label: '', width: 40, align: 'center' },
              ]}
              rows={requests}
              renderCell={(row, col) => {
                if (col.key === 'right')      return <span className="font-semibold text-gray-900">{row.right}</span>
                if (col.key === 'overdue')    return <span className={row.overdue > 0 ? 'font-bold text-pencil-amber' : 'text-gray-500'}>{row.overdue}</span>
                if (col.key === 'medianDays') return <span>{row.medianDays} d</span>
                if (col.key === 'slaDays')    return <span className="text-gray-600">{row.slaDays} d</span>
                if (col.key === 'tick')       return <TickMark kind={row.overdue > 0 ? 'warn' : 'pass'} size={14} />
                return row[col.key]
              }}
            />
          </Sheet>
        </div>

        <div className="col-span-12 xl:col-span-5">
          <Sheet title="Grievance redressal" reference="WP H-4.2" subtitle="Section 13 — officer, cases, response period" className="h-full" contentClassName="px-5 py-4">
            <dl className="space-y-3 text-[14.5px]">
              <div className="flex items-center justify-between">
                <dt className="text-gray-700">Grievance Officer published</dt>
                <dd><TickMark kind={grievance.officerPublished ? 'pass' : 'fail'} label={grievance.officerPublished ? 'Published' : 'Missing'} /></dd>
              </div>
              <div className="flex items-center justify-between">
                <dt className="text-gray-700">Open grievances</dt>
                <dd className="font-bold text-gray-900 tabular-nums">{grievance.openCases}</dd>
              </div>
              <div className="flex items-center justify-between">
                <dt className="text-gray-700">Oldest open</dt>
                <dd className="font-bold text-gray-900 tabular-nums">{grievance.oldestDays} days</dd>
              </div>
              <div className="flex items-center justify-between">
                <dt className="text-gray-700">Response period (Rules)</dt>
                <dd className="text-gray-900 tabular-nums">{grievance.responsePeriodDays} days</dd>
              </div>
            </dl>
            <p className="mt-4 pt-3 border-t border-gray-200 text-[13.5px] text-gray-600">
              A principal may approach the Board only after exhausting this grievance path, so the response period is the first regulatory clock on rights.
            </p>
          </Sheet>
        </div>
      </div>

      <Sheet title="Recent requests" reference="WP H-4.3" subtitle="Newest first">
        <Ledger
          columns={[
            { key: 'id',       label: 'Ref', width: 100, mono: true },
            { key: 'type',     label: 'Right', width: 120 },
            { key: 'channel',  label: 'Channel', width: 110 },
            { key: 'received', label: 'Received', width: 110, mono: true },
            { key: 'due',      label: 'Due', width: 110, mono: true },
            { key: 'status',   label: 'Status', width: 130 },
            { key: 'flagged',  label: 'Note' },
          ]}
          rows={recent}
          renderCell={(row, col) => {
            if (col.key === 'status')  return <Stamp tone={row.status === 'open' ? 'red' : 'amber'} flat>{REQ_STATUS[row.status] ?? row.status}</Stamp>
            if (col.key === 'flagged') return row.flagged ? <TickMark kind="warn" label={row.flagged} /> : <span className="text-gray-400">—</span>
            if (col.key === 'type')    return <span className="font-semibold text-gray-900">{row.type}</span>
            return row[col.key]
          }}
        />
      </Sheet>
    </>
  )
}
