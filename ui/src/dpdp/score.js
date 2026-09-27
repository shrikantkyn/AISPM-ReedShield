/**
 * DPDP readiness scoring — transparent and configurable.
 *
 * Each control carries a status and a weight. Statuses map to a credit:
 * pass = full weight, warn = half, fail = none, na = excluded from the
 * denominator. The score is the weighted credit over the weighted total of
 * assessed controls, as a 0–100 integer.
 *
 * Nothing here is legal advice: the number summarises evidence, it does not
 * assert compliance.
 */

export const STATUS_CREDIT = Object.freeze({
  pass: 1,
  warn: 0.5,
  fail: 0,
  na:   null,
})

export const STATUS_ORDER = ['fail', 'warn', 'na', 'pass']

/**
 * @param {Array<{id:string, status:'pass'|'warn'|'fail'|'na', weight?:number, category?:string}>} controls
 * @param {{credit?: Record<string, number|null>}} [options]
 * @returns {{score:number, assessed:number, total:number, weighted:number, weightedTotal:number, byCategory:Record<string,{score:number, assessed:number, total:number}>, criticalGaps:Array}}
 */
export function computeReadiness(controls, options = {}) {
  const credit = { ...STATUS_CREDIT, ...(options.credit ?? {}) }
  const list = Array.isArray(controls) ? controls : []

  let weighted = 0
  let weightedTotal = 0
  let assessed = 0
  const cats = {}

  for (const c of list) {
    const w = Number.isFinite(c.weight) && c.weight > 0 ? c.weight : 1
    const cr = credit[c.status]
    const cat = c.category ?? 'Uncategorised'
    cats[cat] ??= { weighted: 0, weightedTotal: 0, assessed: 0, total: 0 }
    cats[cat].total += 1
    if (cr === null || cr === undefined) continue
    assessed += 1
    weighted += w * cr
    weightedTotal += w
    cats[cat].assessed += 1
    cats[cat].weighted += w * cr
    cats[cat].weightedTotal += w
  }

  const byCategory = {}
  for (const [name, v] of Object.entries(cats)) {
    byCategory[name] = {
      score: v.weightedTotal > 0 ? Math.round((v.weighted / v.weightedTotal) * 100) : 0,
      assessed: v.assessed,
      total: v.total,
    }
  }

  const criticalGaps = list
    .filter(c => c.status === 'fail')
    .sort((a, b) => (b.weight ?? 1) - (a.weight ?? 1))

  return {
    score: weightedTotal > 0 ? Math.round((weighted / weightedTotal) * 100) : 0,
    assessed,
    total: list.length,
    weighted,
    weightedTotal,
    byCategory,
    criticalGaps,
  }
}

/** Band a 0–100 readiness score into the tick vocabulary. */
export function readinessKind(score) {
  if (score >= 80) return 'pass'
  if (score >= 55) return 'warn'
  return 'fail'
}

/** Count findings per severity, in a fixed order. */
export function countBySeverity(findings) {
  const out = { Critical: 0, High: 0, Medium: 0, Low: 0 }
  for (const f of findings ?? []) {
    if (f.status === 'resolved') continue
    if (out[f.severity] !== undefined) out[f.severity] += 1
  }
  return out
}
