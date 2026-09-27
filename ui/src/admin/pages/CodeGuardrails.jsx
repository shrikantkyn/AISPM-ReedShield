import { useCallback, useEffect, useState } from 'react'
import { RotateCw, Play } from 'lucide-react'
import { PageContainer } from '../../components/layout/PageContainer.jsx'
import { PageHeader }    from '../../components/layout/PageHeader.jsx'
import { Button }        from '../../components/ui/Button.jsx'
import { Sheet, Stamp, TickMark, Ledger, LedgerLine, severityKind } from '../../components/paper/index.js'
import { fetchCodeScans, fetchCodeScan, runCodeSample } from '../api/spm.js'

const SEV_ORDER = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW']
const SEV_WORD = { CRITICAL: 'Critical', HIGH: 'High', MEDIUM: 'Medium', LOW: 'Low' }

export default function CodeGuardrails() {
  const [scans, setScans] = useState([])
  const [detail, setDetail] = useState(null)
  const [state, setState] = useState({ loading: true, error: null, busy: false })

  const reload = useCallback(async () => {
    setState(s => ({ ...s, loading: true, error: null }))
    try {
      const list = await fetchCodeScans()
      setScans(list)
      if (list.length) {
        const d = await fetchCodeScan(list[0].id)
        setDetail(d)
      } else {
        setDetail(null)
      }
      setState({ loading: false, error: null, busy: false })
    } catch (err) {
      setState({ loading: false, error: err.message || 'Could not load code scans.', busy: false })
    }
  }, [])

  useEffect(() => { reload() }, [reload])

  async function runSample() {
    setState(s => ({ ...s, busy: true }))
    try { const d = await runCodeSample(); setDetail(d); await reload() }
    catch (err) { setState(s => ({ ...s, busy: false, error: err.message })) }
  }

  async function open(id) {
    try { setDetail(await fetchCodeScan(id)) }
    catch (err) { setState(s => ({ ...s, error: err.message })) }
  }

  const empty = !state.loading && scans.length === 0
  const latest = scans[0]

  return (
    <PageContainer>
      <PageHeader
        title="Code Guardrails"
        subtitle="Shift-left scanning of AI application code for hardcoded secrets and unsafe AI patterns, in the IDE, in CI, and here"
        reference="WP B-3"
        actions={
          <>
            <Button variant="outline" size="sm" onClick={reload}><RotateCw size={13} aria-hidden="true" /> Refresh</Button>
            <Button size="sm" onClick={runSample} loading={state.busy}><Play size={13} aria-hidden="true" /> Scan sample repo</Button>
          </>
        }
      />

      {state.loading && <p className="text-[14px] text-gray-600">Loading scans…</p>}
      {!state.loading && state.error && (
        <div role="alert" className="bg-white border border-pencil-red px-5 py-4">
          <p className="text-[15px] font-bold text-gray-900">Could not load code scans.</p>
          <p className="text-[14px] text-gray-700 mt-1">{state.error}</p>
        </div>
      )}

      {empty && (
        <Sheet title="No scans yet" reference="WP B-3" contentClassName="px-5 py-8">
          <p className="text-[14px] text-gray-700 max-w-[72ch]">
            Add the Code Guardrails check to a repository with the CLI or the CI workflow, or scan the built-in sample
            repository to see the rules in action. The gate fails a pull request on any critical or high finding.
          </p>
          <pre className="mt-4">python scripts/reedshield_codeguard.py . --fail-on HIGH \
  --post https://reedshield.example.com/api/spm --token $REEDSHIELD_TOKEN</pre>
          <div className="mt-4"><Button onClick={runSample} loading={state.busy}>Scan sample repo</Button></div>
        </Sheet>
      )}

      {!state.loading && !state.error && latest && !empty && (
        <>
          <LedgerLine entries={[
            { label: 'Latest scan', figure: latest.status === 'passed' ? 'Pass' : 'Fail',
              tone: latest.status === 'passed' ? 'text-pencil-green' : 'text-pencil-red',
              note: `${latest.repo} · ${latest.files_scanned} files`, extra: <Stamp tone={latest.status === 'passed' ? 'green' : 'red'}>{latest.status}</Stamp> },
            { label: 'Critical', figure: latest.critical, tone: latest.critical > 0 ? 'text-pencil-red' : 'text-gray-900', note: 'secrets, code execution from model output' },
            { label: 'High', figure: latest.high, tone: latest.high > 0 ? 'text-pencil-red' : 'text-gray-900', note: 'unsafe loads, prompt building, tool abuse' },
            { label: 'Medium + Low', figure: latest.medium + latest.low, note: 'hardening opportunities' },
          ]} />

          <div className="grid grid-cols-12 gap-6 items-start">
            <div className="col-span-12 xl:col-span-4">
              <Sheet title="Scans" reference="WP B-3.1" subtitle="Newest first">
                <Ledger
                  columns={[
                    { key: 'repo',   label: 'Repository' },
                    { key: 'counts', label: 'C/H/M/L', width: 110, align: 'right' },
                    { key: 'status', label: '', width: 84 },
                  ]}
                  rows={scans}
                  rowKey={(s) => s.id}
                  activeKey={detail?.id}
                  onRowClick={(s) => open(s.id)}
                  renderCell={(s, col) => {
                    if (col.key === 'repo')   return <span><span className="font-semibold text-gray-900">{s.repo}</span><span className="block font-mono text-[12px] text-gray-600">{s.ref} · {s.source}</span></span>
                    if (col.key === 'counts') return <span className="tabular-nums font-mono text-[12.5px]"><span className="text-pencil-red">{s.critical}</span>/<span className="text-pencil-red">{s.high}</span>/<span className="text-pencil-amber">{s.medium}</span>/{s.low}</span>
                    if (col.key === 'status') return <Stamp tone={s.status === 'passed' ? 'green' : 'red'} flat>{s.status}</Stamp>
                    return s[col.key]
                  }}
                />
              </Sheet>
            </div>

            <div className="col-span-12 xl:col-span-8">
              <Sheet
                title={detail ? `Findings — ${detail.repo}` : 'Findings'}
                reference="WP B-3.2"
                subtitle={detail ? `${(detail.findings || []).length} findings · ${detail.files_scanned} files · ${detail.ref}` : ''}
                action={detail && <Stamp tone={detail.status === 'passed' ? 'green' : 'red'} flat>{detail.status}</Stamp>}
              >
                {detail && (detail.findings || []).length === 0 ? (
                  <p className="px-5 py-8 text-[14px] text-gray-600">No findings. This code passes the guardrails.</p>
                ) : (
                  <Ledger
                    columns={[
                      { key: 'severity', label: 'Severity', width: 104 },
                      { key: 'rule_id',  label: 'Rule', width: 84, mono: true },
                      { key: 'message',  label: 'Finding' },
                      { key: 'location', label: 'Location', width: 200, mono: true },
                    ]}
                    rows={(detail?.findings || []).slice().sort((a, b) => SEV_ORDER.indexOf(a.severity) - SEV_ORDER.indexOf(b.severity))}
                    rowKey={(f) => f.id}
                    renderCell={(f, col) => {
                      if (col.key === 'severity') return <TickMark kind={severityKind(SEV_WORD[f.severity] || f.severity)} label={f.severity} />
                      if (col.key === 'message')  return <span><span className="font-semibold text-gray-900">{f.message}</span>{f.snippet && <span className="block font-mono text-[12px] text-gray-600 truncate max-w-[52ch]">{f.snippet}</span>}{f.remediation && <span className="block text-[12px] text-gray-600 mt-0.5">{f.remediation}</span>}</span>
                      if (col.key === 'location') return <span className="text-gray-700">{f.file_path}{f.line ? `:${f.line}` : ''}</span>
                      return f[col.key]
                    }}
                  />
                )}
              </Sheet>
            </div>
          </div>

          <p className="text-[12px] text-gray-600 pt-2 border-t border-gray-200">
            The same rules run in the CLI and the CI workflow (<span className="font-mono">.github/workflows/reedshield-codeguard.yml.example</span>). Finding snippets are redacted, so a secret is never reproduced in a scan record.
          </p>
        </>
      )}
    </PageContainer>
  )
}
