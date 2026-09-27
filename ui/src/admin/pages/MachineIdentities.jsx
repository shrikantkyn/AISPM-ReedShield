import { useCallback, useEffect, useState } from 'react'
import { RotateCw, RefreshCw } from 'lucide-react'
import { PageContainer } from '../../components/layout/PageContainer.jsx'
import { PageHeader }    from '../../components/layout/PageHeader.jsx'
import { Button }        from '../../components/ui/Button.jsx'
import { Sheet, Stamp, TickMark, Ledger, LedgerLine } from '../../components/paper/index.js'
import { fetchIdentities, fetchIdentitiesSummary, syncIdentities, identityAction } from '../api/spm.js'

const KIND_LABEL = {
  agent_mcp: 'Agent · MCP token', agent_llm: 'Agent · LLM credential',
  integration_credential: 'Integration credential', service_account: 'Service account', api_key: 'API key',
}
const FLAG_LABEL = {
  no_owner: 'No owner', no_expiry: 'No expiry', expired: 'Expired',
  rotation_overdue: 'Rotation overdue', stale: 'Stale', broad_scopes: 'Broad scopes',
}
const STATUS_TONE = { active: 'green', frozen: 'amber', revoked: 'red', expired: 'red' }

export default function MachineIdentities() {
  const [rows, setRows] = useState([])
  const [summary, setSummary] = useState(null)
  const [state, setState] = useState({ loading: true, error: null, busy: false })
  const [expanded, setExpanded] = useState(null)

  const reload = useCallback(async () => {
    setState(s => ({ ...s, loading: true, error: null }))
    try {
      const [list, sum] = await Promise.all([fetchIdentities(), fetchIdentitiesSummary()])
      setRows(list); setSummary(sum)
      setState({ loading: false, error: null, busy: false })
    } catch (err) {
      setState({ loading: false, error: err.message || 'Could not load the identity register.', busy: false })
    }
  }, [])

  useEffect(() => { reload() }, [reload])

  async function sync() {
    setState(s => ({ ...s, busy: true }))
    try { await syncIdentities(); await reload() }
    catch (err) { setState(s => ({ ...s, busy: false, error: err.message })) }
  }

  async function act(id, action, patch) {
    try { await identityAction(id, action, patch); await reload() }
    catch (err) { setState(s => ({ ...s, error: err.message })) }
  }

  const empty = !state.loading && rows.length === 0

  return (
    <PageContainer>
      <PageHeader
        title="Machine Identities"
        subtitle="Non-human identities across agents, integrations, and service accounts, with owner, scope, and rotation"
        reference="WP E-2"
        actions={<Button size="sm" onClick={sync} loading={state.busy}><RefreshCw size={13} aria-hidden="true" /> Sync register</Button>}
      />

      {state.loading && <p className="text-[14px] text-gray-600">Loading the identity register…</p>}
      {!state.loading && state.error && (
        <div role="alert" className="bg-white border border-pencil-red px-5 py-4">
          <p className="text-[15px] font-bold text-gray-900">Could not load the identity register.</p>
          <p className="text-[14px] text-gray-700 mt-1">{state.error}</p>
        </div>
      )}

      {empty && (
        <Sheet title="Register is empty" reference="WP E-2" contentClassName="px-5 py-8">
          <p className="text-[14px] text-gray-700 max-w-[70ch]">
            Sync the register to import machine identities from agent tokens, integration credentials, and Keycloak
            service accounts. Secret values are never stored here; only ownership, scope, and rotation are tracked.
          </p>
          <div className="mt-4"><Button onClick={sync} loading={state.busy}>Sync register</Button></div>
        </Sheet>
      )}

      {!state.loading && !state.error && summary && !empty && (
        <>
          <LedgerLine entries={[
            { label: 'Machine identities', figure: summary.total, note: `${summary.active} active` },
            { label: 'With an owner', figure: summary.owned_share != null ? Math.round(summary.owned_share * 100) : '—', unit: summary.owned_share != null ? '%' : '',
              tone: (summary.owned_share ?? 0) >= 0.8 ? 'text-pencil-green' : 'text-pencil-amber', note: 'ownership established' },
            { label: 'Rotation overdue', figure: summary.flags.rotation_overdue, tone: summary.flags.rotation_overdue > 0 ? 'text-pencil-red' : 'text-gray-900',
              note: 'past their rotation window', extra: <TickMark kind={summary.flags.rotation_overdue > 0 ? 'fail' : 'pass'} /> },
            { label: 'No expiry', figure: summary.flags.no_expiry, tone: summary.flags.no_expiry > 0 ? 'text-pencil-amber' : 'text-gray-900',
              note: 'long-lived credentials', extra: <TickMark kind={summary.flags.no_expiry > 0 ? 'warn' : 'pass'} /> },
          ]} />

          <Sheet title="Register" reference="WP E-2.1"
            subtitle={`${rows.length} identities · click a row for scopes and actions · last sync ${summary.last_sync ? new Date(summary.last_sync).toLocaleString('en-IN', { hour12: false }) : 'never'}`}>
            <Ledger
              columns={[
                { key: 'name',   label: 'Identity' },
                { key: 'kind',   label: 'Kind', width: 200 },
                { key: 'owner',  label: 'Owner', width: 150 },
                { key: 'flags',  label: 'Risk', width: 220 },
                { key: 'status', label: 'Status', width: 110 },
              ]}
              rows={rows}
              rowKey={(m) => m.id}
              expandedKey={expanded}
              onRowClick={(m) => setExpanded(e => e === m.id ? null : m.id)}
              renderExpanded={(m) => (
                <div className="px-5 py-4 border-t border-gray-200 grid grid-cols-12 gap-6">
                  <div className="col-span-12 lg:col-span-7">
                    <p className="text-[12.5px] font-bold uppercase tracking-[0.08em] text-gray-600">Scopes</p>
                    {m.scopes.length === 0 ? <p className="text-[13px] text-gray-500 mt-1.5">No scopes recorded.</p> : (
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {m.scopes.map(s => <span key={s} className="font-mono text-[12px] text-gray-800 border border-gray-200 px-1.5 py-0.5">{s}</span>)}
                      </div>
                    )}
                    <dl className="mt-4 grid grid-cols-3 gap-4 text-[12.5px]">
                      <div><dt className="text-gray-600">Source</dt><dd className="text-gray-900 mt-0.5">{m.source} · <span className="font-mono">{m.source_ref}</span></dd></div>
                      <div><dt className="text-gray-600">Last used</dt><dd className="font-mono text-gray-900 mt-0.5">{m.last_used_at ? m.last_used_at.slice(0, 10) : '—'}</dd></div>
                      <div><dt className="text-gray-600">Rotated</dt><dd className="font-mono text-gray-900 mt-0.5">{m.rotated_at ? m.rotated_at.slice(0, 10) : 'never'}</dd></div>
                    </dl>
                  </div>
                  <div className="col-span-12 lg:col-span-5 border-l border-gray-200 pl-6">
                    <p className="text-[12.5px] font-bold uppercase tracking-[0.08em] text-gray-600">Actions</p>
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      <Button size="sm" variant="outline" onClick={() => act(m.id, 'rotate')}><RotateCw size={12} aria-hidden="true" /> Rotate</Button>
                      {!m.owner && <Button size="sm" variant="outline" onClick={() => act(m.id, null, { owner: 'Platform Team' })}>Claim ownership</Button>}
                      {m.rotation_days !== 90 && <Button size="sm" variant="ghost" onClick={() => act(m.id, null, { rotation_days: 90 })}>Set 90-day rotation</Button>}
                      <span className="ml-auto" />
                      {m.status === 'active'
                        ? <Button size="sm" variant="destructive" onClick={() => act(m.id, 'freeze')}>Freeze</Button>
                        : m.status === 'frozen' ? <Button size="sm" variant="outline" onClick={() => act(m.id, 'unfreeze')}>Unfreeze</Button> : null}
                    </div>
                    <p className="text-[11.5px] text-gray-600 mt-3">Rotating an agent token re-mints it; restart the agent so it picks up the new credential. Secret values are never shown.</p>
                  </div>
                </div>
              )}
              renderCell={(m, col) => {
                if (col.key === 'name')  return <span className="font-semibold text-gray-900">{m.name}</span>
                if (col.key === 'kind')  return <span className="text-gray-700">{KIND_LABEL[m.kind] || m.kind}</span>
                if (col.key === 'owner') return m.owner ? <span className="text-gray-800">{m.owner}</span> : <TickMark kind="warn" label="Unowned" />
                if (col.key === 'flags') return m.risk_flags.length === 0
                  ? <TickMark kind="pass" label="Clean" />
                  : <span className="flex flex-wrap gap-1">{m.risk_flags.map(f => <span key={f} className="text-[11px] font-semibold text-pencil-red border border-[#E4A9A4] bg-[#F7E3E1] px-1 py-0.5 rounded">{FLAG_LABEL[f] || f}</span>)}</span>
                if (col.key === 'status') return <Stamp tone={STATUS_TONE[m.status] || 'ink'} flat>{m.status}</Stamp>
                return m[col.key]
              }}
            />
          </Sheet>

          <p className="text-[12px] text-gray-600 pt-2 border-t border-gray-200">
            The register imports from agents, integration credentials, and Keycloak service accounts. It never stores or displays a secret value; rotation and revocation act on the source system.
          </p>
        </>
      )}
    </PageContainer>
  )
}
