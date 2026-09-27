import { useCallback, useEffect, useState } from 'react'
import { RotateCw, Database, Download } from 'lucide-react'
import { PageContainer } from '../../components/layout/PageContainer.jsx'
import { PageHeader }    from '../../components/layout/PageHeader.jsx'
import { Button }        from '../../components/ui/Button.jsx'
import { Sheet, Stamp, TickMark, Ledger, LedgerLine, severityKind } from '../../components/paper/index.js'
import { fetchShadowAiSummary, fetchShadowAiApps, patchShadowAiApp, loadShadowAiSample } from '../api/spm.js'
import { exportReport }  from '../../lib/exportReport.js'

function fmtBytes(n) {
  if (!n) return '0'
  const u = ['B', 'KB', 'MB', 'GB', 'TB']
  let i = 0; let v = n
  while (v >= 1024 && i < u.length - 1) { v /= 1024; i++ }
  return `${v.toFixed(v < 10 && i > 0 ? 1 : 0)} ${u[i]}`
}

export default function ShadowAi() {
  const [summary, setSummary] = useState(null)
  const [apps, setApps] = useState([])
  const [state, setState] = useState({ loading: true, error: null, busy: false })

  const reload = useCallback(async () => {
    setState(s => ({ ...s, loading: true, error: null }))
    try {
      const [sum, list] = await Promise.all([fetchShadowAiSummary(30), fetchShadowAiApps()])
      setSummary(sum); setApps(list)
      setState({ loading: false, error: null, busy: false })
    } catch (err) {
      setState({ loading: false, error: err.message || 'Could not load shadow-AI data.', busy: false })
    }
  }, [])

  useEffect(() => { reload() }, [reload])

  async function loadSample() {
    setState(s => ({ ...s, busy: true }))
    try { await loadShadowAiSample(); await reload() }
    catch (err) { setState(s => ({ ...s, busy: false, error: err.message })) }
  }

  async function setSanction(app, sanctioned) {
    try {
      await patchShadowAiApp(app.id, { sanctioned })
      await reload()
    } catch (err) { setState(s => ({ ...s, error: err.message })) }
  }

  const empty = !state.loading && summary && summary.total_events === 0

  const handleExport = () => {
    exportReport({
      page: 'Shadow-AI-Applications',
      rows: apps,
      columns: [
        { key: 'name', label: 'Application Name' },
        { key: 'domain', label: 'Domain' },
        { key: 'category', label: 'Category' },
        { key: 'risk', label: 'Risk Level' },
        { key: 'events_30d', label: 'Sessions (30d)' },
        { key: 'users_30d', label: 'Users (30d)' },
        { key: 'bytes_30d', label: 'Data Transferred', value: r => fmtBytes(r.bytes_30d) },
        { key: 'sanctioned', label: 'Status', value: r => r.sanctioned ? 'Sanctioned' : r.reviewed ? 'Blocked' : 'Review Needed' },
      ],
      meta: {
        totalApps: apps.length,
        totalEvents: summary?.total_events ?? 0,
        unsanctioned: summary?.unsanctioned_apps ?? 0,
      },
    })
  }

  return (
    <PageContainer>
      <PageHeader
        title="Shadow AI"
        subtitle="End-user AI usage discovered from gateway, DNS, or CASB telemetry, governed by an acceptable-use policy"
        reference="WP D-1"
        actions={
          <>
            <Button variant="outline" size="sm" onClick={reload}><RotateCw size={13} aria-hidden="true" /> Refresh</Button>
            <Button variant="outline" size="sm" onClick={handleExport} className="gap-1.5"><Download size={13} aria-hidden="true" /> Export</Button>
            <Button size="sm" onClick={loadSample} loading={state.busy}><Database size={13} aria-hidden="true" /> Load sample telemetry</Button>
          </>
        }
      />

      {state.loading && <p className="text-[14px] text-gray-600">Loading discovery data…</p>}
      {!state.loading && state.error && (
        <div role="alert" className="bg-white border border-pencil-red px-5 py-4">
          <p className="text-[15px] font-bold text-gray-900">Could not load shadow-AI data.</p>
          <p className="text-[14px] text-gray-700 mt-1">{state.error}</p>
        </div>
      )}

      {empty && (
        <Sheet title="No AI usage ingested yet" reference="WP D-1" contentClassName="px-5 py-8">
          <p className="text-[14px] text-gray-700 max-w-[70ch]">
            Connect a secure web gateway, DNS, or CASB feed to the discovery ingest endpoint, or load 30 days of
            sample telemetry to see how end-user AI usage is classified against the acceptable-use policy.
          </p>
          <div className="mt-4"><Button onClick={loadSample} loading={state.busy}>Load sample telemetry</Button></div>
        </Sheet>
      )}

      {!state.loading && !state.error && summary && !empty && (
        <>
          <LedgerLine entries={[
            { label: 'AI apps in use (30 d)', figure: summary.apps_seen, note: `${summary.apps_sanctioned} sanctioned · ${summary.apps_unsanctioned} not` },
            { label: 'Users', figure: summary.users, note: `${summary.total_events.toLocaleString('en-IN')} sessions` },
            { label: 'Sanctioned share', figure: summary.sanctioned_share != null ? Math.round(summary.sanctioned_share * 100) : '—', unit: summary.sanctioned_share != null ? '%' : '',
              tone: (summary.sanctioned_share ?? 0) >= 0.8 ? 'text-pencil-green' : 'text-pencil-amber',
              note: 'of sessions on approved tools' },
            { label: 'Uploads to AI', figure: summary.uploads, tone: summary.uploads > 0 ? 'text-pencil-red' : 'text-gray-900',
              note: 'file / paste events, a data-egress signal', extra: <TickMark kind={summary.uploads > 0 ? 'warn' : 'pass'} /> },
          ]} />

          <Sheet title="Findings" reference="WP D-1.1" subtitle="Unsanctioned or unreviewed AI applications, most-used first">
            {summary.findings.length === 0 ? (
              <p className="px-5 py-8 text-[14px] text-gray-600">Every AI application in use has been reviewed and sanctioned.</p>
            ) : (
              <Ledger
                columns={[
                  { key: 'severity', label: 'Severity', width: 110 },
                  { key: 'app',      label: 'Application' },
                  { key: 'rule',     label: 'Finding' },
                  { key: 'events',   label: 'Sessions', width: 90, align: 'right' },
                  { key: 'users',    label: 'Users', width: 74, align: 'right' },
                  { key: 'uploads',  label: 'Uploads', width: 84, align: 'right' },
                  { key: 'act',      label: '', width: 120 },
                ]}
                rows={summary.findings}
                rowKey={(f) => f.app_id}
                renderCell={(f, col) => {
                  if (col.key === 'severity') return <TickMark kind={severityKind(f.severity)} label={f.severity} />
                  if (col.key === 'app')      return <span><span className="font-semibold text-gray-900">{f.app}</span><span className="block font-mono text-[12px] text-gray-600">{f.domain}</span></span>
                  if (col.key === 'uploads')  return <span className={f.uploads > 0 ? 'text-pencil-red font-semibold' : 'text-gray-500'}>{f.uploads}</span>
                  if (col.key === 'act')      return <Button size="sm" variant="outline" onClick={() => setSanction({ id: f.app_id }, true)}>Sanction</Button>
                  return f[col.key]
                }}
              />
            )}
          </Sheet>

          <div className="grid grid-cols-12 gap-6">
            <div className="col-span-12 xl:col-span-7">
              <Sheet title="Application catalog" reference="WP D-1.2" subtitle="Every AI SaaS seen, with the acceptable-use decision">
                <Ledger
                  columns={[
                    { key: 'name',    label: 'Application' },
                    { key: 'category',label: 'Category', width: 130 },
                    { key: 'risk',    label: 'Risk', width: 90 },
                    { key: 'events_30d', label: 'Sessions', width: 90, align: 'right' },
                    { key: 'decision',label: 'Policy', width: 150 },
                  ]}
                  rows={apps.filter(a => a.events_30d > 0)}
                  rowKey={(a) => a.id}
                  renderCell={(a, col) => {
                    if (col.key === 'name')     return <span><span className="font-semibold text-gray-900">{a.name}</span><span className="block font-mono text-[12px] text-gray-600">{a.domain}</span></span>
                    if (col.key === 'risk')     return <TickMark kind={a.risk === 'High' || a.risk === 'Critical' ? 'fail' : a.risk === 'Medium' ? 'warn' : 'info'} label={a.risk} />
                    if (col.key === 'decision') return a.sanctioned
                      ? <button onClick={() => setSanction(a, false)} title="Click to revoke"><Stamp tone="green" flat>Sanctioned</Stamp></button>
                      : <button onClick={() => setSanction(a, true)} title="Click to sanction"><Stamp tone="red" flat>{a.reviewed ? 'Blocked' : 'Review'}</Stamp></button>
                    return a[col.key]
                  }}
                />
              </Sheet>
            </div>
            <div className="col-span-12 xl:col-span-5">
              <Sheet title="Usage by department" reference="WP D-1.3" subtitle="Last 30 days">
                <Ledger
                  columns={[
                    { key: 'department', label: 'Department' },
                    { key: 'users',  label: 'Users', width: 74, align: 'right' },
                    { key: 'apps',   label: 'Apps', width: 74, align: 'right' },
                    { key: 'events', label: 'Sessions', width: 90, align: 'right' },
                    { key: 'bytes_out', label: 'Egress', width: 90, align: 'right' },
                  ]}
                  rows={summary.by_department}
                  rowKey={(d) => d.department}
                  renderCell={(d, col) => {
                    if (col.key === 'department') return <span className="font-semibold text-gray-900">{d.department}</span>
                    if (col.key === 'bytes_out')  return fmtBytes(d.bytes_out)
                    return d[col.key]
                  }}
                />
              </Sheet>
            </div>
          </div>

          <p className="text-[12px] text-gray-600 pt-2 border-t border-gray-200">
            Sanctioning an app records the acceptable-use decision; the compliance rule for shadow-AI governance reads it. Sample telemetry is labelled and can be reloaded at any time.
          </p>
        </>
      )}
    </PageContainer>
  )
}
