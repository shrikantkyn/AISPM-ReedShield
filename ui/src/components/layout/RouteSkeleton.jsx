/**
 * RouteSkeleton — what a page looks like while its code chunk loads: the
 * working-paper header band, a trial-balance line, and two sheets, drawn as
 * empty stock on the ledger ground. No spinner; the shape of the page arrives
 * first and the content fills it.
 */
export function RouteSkeleton() {
  return (
    <div className="bg-paper min-h-full" aria-busy="true" aria-live="polite" aria-label="Loading page">
      <div className="max-w-[1440px] mx-auto px-8 py-6 space-y-6">
        <div className="flex items-end justify-between pb-4 border-b-2 border-gray-200">
          <div className="space-y-2">
            <div className="h-7 w-56 bg-gray-200" />
            <div className="h-3.5 w-96 bg-gray-200" />
          </div>
          <div className="h-9 w-32 bg-gray-200" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-px bg-gray-300 border border-gray-200">
          {[0, 1, 2, 3].map(i => (
            <div key={i} className="bg-white px-5 py-4 space-y-3">
              <div className="h-3 w-32 bg-gray-200" />
              <div className="h-8 w-20 bg-gray-200" />
              <div className="h-3 w-40 bg-gray-200" />
            </div>
          ))}
        </div>
        <div className="grid grid-cols-12 gap-6">
          <div className="col-span-12 xl:col-span-8 bg-white border border-gray-200 h-72">
            <div className="h-11 border-b border-gray-200 bg-gray-100" />
          </div>
          <div className="col-span-12 xl:col-span-4 bg-white border border-gray-200 h-72">
            <div className="h-11 border-b border-gray-200 bg-gray-100" />
          </div>
        </div>
        <p className="text-[13px] text-gray-600">Loading…</p>
      </div>
    </div>
  )
}
