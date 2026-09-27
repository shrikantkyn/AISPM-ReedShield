// A polished, self-contained representation of the ReedShield console — the product
// itself as the hero's visual proof. Pure SVG/CSS, no data fetch, no imagery.
export function DashboardPreview() {
  const bars = [62, 48, 70, 40, 55, 33, 58]
  return (
    <div className="rounded-xl border border-gray-200 bg-white shadow-lg overflow-hidden">
      {/* window chrome */}
      <div className="h-9 border-b border-gray-200 bg-gray-50 flex items-center gap-1.5 px-4">
        <span className="w-2.5 h-2.5 rounded-full bg-gray-300" />
        <span className="w-2.5 h-2.5 rounded-full bg-gray-300" />
        <span className="w-2.5 h-2.5 rounded-full bg-gray-300" />
        <span className="ml-3 text-[11px] text-gray-400 font-mono">app.reedshield.io/admin/dashboard</span>
      </div>
      <div className="flex">
        {/* mini sidebar */}
        <div className="hidden sm:flex flex-col w-40 shrink-0 border-r border-gray-200 bg-white py-3">
          <div className="px-4 pb-3 text-[12px] font-bold text-gray-900">ReedShield</div>
          {['Dashboard', 'Posture', 'Alerts', 'Inventory', 'Shadow AI', 'Identities', 'Runtime', 'Frameworks'].map((l, i) => (
            <div key={l} className={`mx-2 px-3 h-7 flex items-center rounded-md text-[11.5px] ${i === 0 ? 'bg-accent-50 text-accent-800 font-semibold' : 'text-gray-500'}`}>{l}</div>
          ))}
        </div>
        {/* content */}
        <div className="flex-1 p-4 bg-[#FAFAF9] min-w-0">
          <div className="grid grid-cols-4 gap-2.5">
            {[['Blended risk', '72', 'text-status-high'], ['Critical', '14', 'text-status-critical'], ['Time to freeze', '38s', 'text-status-low'], ['Enforced', '8/8', 'text-gray-900']].map(([l, v, c]) => (
              <div key={l} className="rounded-lg border border-gray-200 bg-white px-3 py-2.5">
                <div className="text-[9px] uppercase tracking-wide text-gray-400">{l}</div>
                <div className={`text-[18px] font-semibold ${c} mt-1`}>{v}</div>
              </div>
            ))}
          </div>
          <div className="mt-3 grid grid-cols-3 gap-2.5">
            <div className="col-span-2 rounded-lg border border-gray-200 bg-white p-3">
              <div className="text-[11px] font-semibold text-gray-700">Alerts, last 7 days</div>
              <div className="mt-3 flex items-end gap-1.5 h-20">
                {bars.map((h, i) => (
                  <div key={i} className="flex-1 rounded-sm bg-accent-500/80" style={{ height: `${h}%` }} />
                ))}
              </div>
            </div>
            <div className="rounded-lg border border-gray-200 bg-white p-3">
              <div className="text-[11px] font-semibold text-gray-700">DPDPA readiness</div>
              <div className="text-[26px] font-semibold text-status-medium mt-1">64<span className="text-[12px] text-gray-400">/100</span></div>
              <div className="mt-2 space-y-1.5">
                {[['Consent', 'medium'], ['Rights', 'low'], ['Security', 'critical']].map(([l, s]) => (
                  <div key={l} className="flex items-center justify-between text-[10.5px] text-gray-500">
                    <span>{l}</span>
                    <span className={`w-2 h-2 rounded-full ${s === 'low' ? 'bg-status-low' : s === 'medium' ? 'bg-status-medium' : 'bg-status-critical'}`} />
                  </div>
                ))}
              </div>
            </div>
          </div>
          <div className="mt-3 rounded-lg border border-gray-200 bg-white p-3">
            <div className="text-[11px] font-semibold text-gray-700">Recent alerts</div>
            <div className="mt-2 space-y-1.5">
              {[['Critical', 'PII returned by billing-assistant'], ['High', 'Secret committed to payments-api'], ['Medium', 'DPIA sign-off overdue']].map(([sev, t]) => (
                <div key={t} className="flex items-center gap-2 text-[11px]">
                  <span className={`w-2 h-2 rounded-full ${sev === 'Critical' ? 'bg-status-critical' : sev === 'High' ? 'bg-status-high' : 'bg-status-medium'}`} />
                  <span className="text-gray-600 truncate">{t}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
