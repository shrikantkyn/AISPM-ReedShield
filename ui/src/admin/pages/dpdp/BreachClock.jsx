import { useEffect, useState } from 'react'
import { useOutletContext } from 'react-router-dom'
import { cn } from '../../../lib/utils.js'
import { Button } from '../../../components/ui/Button.jsx'
import { Sheet, Stamp, TickMark, Ledger, ClockDigits, formatHms } from '../../../components/paper/index.js'
import { LOCAL_STORAGE_KEY } from '../../../dpdp/breach.js'

/**
 * BreachClock — once a breach is declared, every notification window counts
 * down from the moment of awareness. State persists in localStorage so a
 * refresh does not lose the clock; a real backend will own it later.
 */

function readClock() {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY)
    return raw ? JSON.parse(raw) : null
  } catch { return null }
}
function writeClock(v) {
  try {
    if (v) localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(v)); else localStorage.removeItem(LOCAL_STORAGE_KEY)
  } catch { /* storage unavailable */ }
}

function useNow(active) {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    if (!active) return
    const id = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(id)
  }, [active])
  return now
}

function toLocalInput(ms) {
  const d = new Date(ms)
  const p = n => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`
}

export default function BreachClock() {
  const { breach } = useOutletContext()
  const [clock, setClock] = useState(readClock)
  const [declaring, setDeclaring] = useState(false)
  const [form, setForm] = useState({ summary: '', awareAt: toLocalInput(Date.now()) })
  const [closing, setClosing] = useState(false)
  const now = useNow(Boolean(clock))

  useEffect(() => { writeClock(clock) }, [clock])

  const elapsed = clock ? now - new Date(clock.awareAt).getTime() : 0

  function start(e) {
    e.preventDefault()
    if (!form.summary.trim()) return
    setClock({ id: `BR-${new Date().getFullYear()}-${String(breach.incidents.length + 3).padStart(3, '0')}`, summary: form.summary.trim(), awareAt: new Date(form.awareAt).toISOString(), notified: {} })
    setDeclaring(false)
  }
  function markNotified(id) {
    setClock(c => ({ ...c, notified: { ...c.notified, [id]: new Date().toISOString() } }))
  }
  function closeIncident() {
    setClock(null)
    setClosing(false)
  }

  return (
    <>
      <div className="grid grid-cols-12 gap-6">
        <div className="col-span-12 xl:col-span-7">
          <Sheet
            title={clock ? `Breach clock running · ${clock.id}` : 'Breach clock'}
            reference="WP H-5"
            subtitle={clock ? clock.summary : 'No breach declared. The clock starts from the moment of awareness.'}
            action={clock ? <Stamp tone="red">Active</Stamp> : <Stamp tone="green" flat>Standing by</Stamp>}
            contentClassName="flex flex-col"
          >
            <div className="px-5 py-5 border-b border-gray-200">
              <p className="text-[12.5px] font-bold uppercase tracking-[0.08em] text-gray-600">Elapsed since awareness</p>
              <div className="mt-2 flex items-end justify-between gap-6">
                <ClockDigits text={formatHms(elapsed)} size={56} muted={!clock} />
                {clock && <p className="font-mono text-[13.5px] text-gray-600 text-right">aware at<br />{new Date(clock.awareAt).toLocaleString('en-IN', { hour12: false })}</p>}
              </div>
            </div>

            <ul className="divide-y divide-gray-200">
              {breach.windows.map(w => {
                const deadline = w.hours != null ? w.hours * 3600 * 1000 : null
                const remaining = deadline != null ? deadline - elapsed : null
                const notifiedAt = clock?.notified?.[w.id]
                const kind = !clock ? 'na' : notifiedAt ? 'pass' : remaining != null && remaining <= 0 ? 'fail' : remaining != null && remaining < 6 * 3600 * 1000 ? 'warn' : 'info'
                return (
                  <li key={w.id} className="px-5 py-3 flex items-center gap-4">
                    <TickMark kind={kind} size={16} className="shrink-0" />
                    <div className="min-w-0 flex-1">
                      <p className="text-[14.5px] font-bold text-gray-900">{w.authority} <span className="font-normal text-gray-600">· {w.hours != null ? `${w.hours} h` : 'without delay'}</span></p>
                      <p className="text-[13.5px] text-gray-600 leading-snug">{w.basis}</p>
                    </div>
                    <div className="shrink-0 text-right">
                      {clock && !notifiedAt && remaining != null && (
                        <ClockDigits text={remaining > 0 ? formatHms(remaining) : '00:00:00'} size={22} className={cn(remaining <= 0 && 'text-pencil-red')} />
                      )}
                      {clock && !notifiedAt && remaining == null && <span className="font-mono text-[13.5px] text-gray-600">as soon as possible</span>}
                      {clock && notifiedAt && <span className="font-mono text-[13.5px] text-pencil-green">notified {new Date(notifiedAt).toLocaleTimeString('en-IN', { hour12: false })}</span>}
                      {!clock && <span className="font-mono text-[13.5px] text-gray-500">{w.hours != null ? formatHms(w.hours * 3600 * 1000) : '—'}</span>}
                    </div>
                    {clock && !notifiedAt && (
                      <Button size="sm" variant="outline" onClick={() => markNotified(w.id)}>Mark notified</Button>
                    )}
                  </li>
                )
              })}
            </ul>

            <div className="mt-auto px-5 py-4 border-t border-gray-200 bg-gray-100">
              {!clock && !declaring && (
                <Button onClick={() => { setForm({ summary: '', awareAt: toLocalInput(Date.now()) }); setDeclaring(true) }}>Declare a breach</Button>
              )}
              {!clock && declaring && (
                <form onSubmit={start} className="flex flex-wrap items-end gap-3">
                  <label className="flex-1 min-w-[260px] text-[13.5px] text-gray-700">
                    <span className="font-semibold">What happened</span>
                    <input
                      autoFocus
                      value={form.summary}
                      onChange={e => setForm(f => ({ ...f, summary: e.target.value }))}
                      placeholder="e.g. Support-agent credential used to export 12,000 profiles"
                      className="mt-1 w-full h-9 px-2.5 border border-gray-200 bg-white text-[14.5px] text-gray-900 focus:outline-none focus:ring-2 focus:ring-accent-400"
                    />
                  </label>
                  <label className="text-[13.5px] text-gray-700">
                    <span className="font-semibold">Aware at</span>
                    <input
                      type="datetime-local"
                      value={form.awareAt}
                      max={toLocalInput(Date.now())}
                      onChange={e => setForm(f => ({ ...f, awareAt: e.target.value }))}
                      className="mt-1 block h-9 px-2.5 border border-gray-200 bg-white text-[14.5px] font-mono text-gray-900 focus:outline-none focus:ring-2 focus:ring-accent-400"
                    />
                  </label>
                  <Button type="submit" disabled={!form.summary.trim()}>Start clock</Button>
                  <Button type="button" variant="ghost" onClick={() => setDeclaring(false)}>Cancel</Button>
                </form>
              )}
              {clock && !closing && (
                <div className="flex items-center">
                  <p className="text-[13.5px] text-gray-700">Windows keep counting until each authority is marked notified.</p>
                  <div className="ml-auto pl-8">
                    <Button variant="destructive" size="sm" onClick={() => setClosing(true)}>Close incident</Button>
                  </div>
                </div>
              )}
              {clock && closing && (
                <div className="flex items-center gap-3">
                  <p className="text-[14.5px] text-gray-900 font-semibold">Close {clock.id} and stop the clock?</p>
                  <span className="text-[13.5px] text-gray-600">Notification records stay in the incident log.</span>
                  <div className="ml-auto pl-8 flex items-center gap-2">
                    <Button variant="ghost" size="sm" onClick={() => setClosing(false)}>Keep running</Button>
                    <Button variant="destructive" size="sm" onClick={closeIncident}>Confirm close</Button>
                  </div>
                </div>
              )}
            </div>
          </Sheet>
        </div>

        <div className="col-span-12 xl:col-span-5">
          <Sheet title="Readiness checklist" reference="WP H-5.1" subtitle="What must already be true before the clock starts" className="h-full">
            <ul className="divide-y divide-gray-200">
              {breach.checklist.map(item => (
                <li key={item.id} className="px-5 py-3 flex items-start gap-3">
                  <TickMark kind={item.status} size={15} className="mt-0.5 shrink-0" />
                  <div className="min-w-0">
                    <p className="text-[14.5px] font-semibold text-gray-900 leading-snug">{item.label}</p>
                    <p className="text-[13.5px] text-gray-600 mt-0.5">{item.note}</p>
                  </div>
                </li>
              ))}
            </ul>
            <div className="px-5 py-4 border-t border-gray-200 bg-gray-100 text-[13.5px] text-gray-700">
              <p className="font-bold uppercase tracking-[0.08em] text-[12.5px] text-gray-600">Last drill · {breach.lastDrill.date}</p>
              <p className="mt-1.5 text-gray-800">{breach.lastDrill.scenario}</p>
              <p className="mt-1">First draft notice in {breach.lastDrill.timeToDraftMinutes} min · Board-ready in {breach.lastDrill.timeToBoardReadyHours} h · <span className="font-semibold text-pencil-green">{breach.lastDrill.result}</span></p>
            </div>
          </Sheet>
        </div>
      </div>

      <Sheet title="Incident log" reference="WP H-5.2" subtitle="Declared breaches and their notification record">
        <Ledger
          columns={[
            { key: 'id',       label: 'Ref', width: 130, mono: true },
            { key: 'declared', label: 'Declared', width: 190, mono: true },
            { key: 'summary',  label: 'Summary' },
            { key: 'outcome',  label: 'Outcome', width: 240 },
          ]}
          rows={breach.incidents}
          empty="No incidents recorded."
          renderCell={(row, col) => {
            if (col.key === 'declared') return new Date(row.declared).toLocaleString('en-IN', { hour12: false })
            if (col.key === 'outcome')  return <TickMark kind="pass" label={row.outcome} />
            return row[col.key]
          }}
        />
      </Sheet>
    </>
  )
}
