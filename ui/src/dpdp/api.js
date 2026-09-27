/**
 * DPDP data access.
 *
 * There is no DPDP backend yet. This module returns the demonstration
 * dataset behind the same shape a future endpoint will serve, so pages can
 * swap `getDpdpSnapshot` for a fetch without changing.
 *
 * Planned endpoint: GET /api/spm/dpdp/snapshot → { source, asOf, controls,
 * findings, rights, breach, transfers }.
 */
import { CONTROLS, READINESS_HISTORY, PENALTY_TIERS } from './controls.js'
import { FINDINGS } from './findings.js'
import { CONSENT, REQUESTS, GRIEVANCE, RECENT_REQUESTS } from './rights.js'
import { NOTIFICATION_WINDOWS, READINESS_CHECKLIST, LAST_DRILL, INCIDENTS } from './breach.js'
import { TRANSFERS, RESTRICTED_COUNTRIES_NOTE } from './transfers.js'

export const DEMO_AS_OF = '2026-09-14T09:30:00+05:30'

/** @returns {Promise<object>} the DPDP snapshot; `source` is 'demo' until a backend exists. */
export async function getDpdpSnapshot() {
  return {
    source: 'demo',
    asOf: DEMO_AS_OF,
    controls: CONTROLS,
    history: READINESS_HISTORY,
    penaltyTiers: PENALTY_TIERS,
    findings: FINDINGS,
    rights: { consent: CONSENT, requests: REQUESTS, grievance: GRIEVANCE, recent: RECENT_REQUESTS },
    breach: { windows: NOTIFICATION_WINDOWS, checklist: READINESS_CHECKLIST, lastDrill: LAST_DRILL, incidents: INCIDENTS },
    transfers: { entries: TRANSFERS, restrictedNote: RESTRICTED_COUNTRIES_NOTE },
  }
}
