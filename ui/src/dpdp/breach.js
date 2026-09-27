/**
 * Breach-notification readiness — demonstration data. Dates ISO.
 *
 * Windows are the notification deadlines the clock tracks once a breach is
 * declared. Hours are counted from the moment of awareness.
 */

export const NOTIFICATION_WINDOWS = [
  {
    id: 'board', authority: 'Data Protection Board of India', hours: 72,
    basis: 'DPDP Rules, 2025 — detailed intimation within 72 hours of becoming aware',
    template: 'Board intimation template v3 (approved 2026-08-18)',
  },
  {
    id: 'cert-in', authority: 'CERT-In', hours: 6,
    basis: 'CERT-In Directions, 28 April 2022 — reporting within 6 hours of noticing',
    template: 'CERT-In incident form (mandatory fields pre-filled)',
  },
  {
    id: 'principals', authority: 'Affected Data Principals', hours: null,
    basis: 'S.8(6) — intimation without delay; Rules — nature, extent, timing, consequences, mitigation, contact',
    template: 'Principal notice template v2 (SMS + email)',
  },
]

/** Readiness checklist — each item is a tick the DPO can verify. */
export const READINESS_CHECKLIST = [
  { id: 'runbook',   label: 'Breach runbook approved and rehearsed within 90 days', status: 'pass', note: 'Drill 2026-08-20; 38 minutes to first draft notice' },
  { id: 'templates', label: 'Board, CERT-In and principal notice templates approved', status: 'pass', note: 'Legal sign-off 2026-08-18' },
  { id: 'contacts',  label: 'Board and CERT-In contact channels verified this quarter', status: 'warn', note: 'CERT-In portal login expired 2026-09-05' },
  { id: 'roster',    label: 'On-call roster covers DPO, Security, Legal, Comms', status: 'pass', note: 'Rotation published to 2026-12-31' },
  { id: 'scope',     label: 'Personal-data inventory current enough to scope affected principals', status: 'warn', note: '2 stores without classification (see S.8(5))' },
  { id: 'evidence',  label: 'Evidence capture path tested (Lineage export)', status: 'pass', note: 'Export verified 2026-09-02' },
]

export const LAST_DRILL = {
  date: '2026-08-20',
  scenario: 'Compromised support-agent credential exfiltrates 12,000 profiles',
  timeToDraftMinutes: 38,
  timeToBoardReadyHours: 21,
  result: 'Within window',
}

/** Past incidents, newest first. None currently active. */
export const INCIDENTS = [
  {
    id: 'BR-2026-002', declared: '2026-05-04T11:20:00+05:30', closed: '2026-05-11',
    summary: 'Misdirected export email — 340 principals; Board intimated at 41h, principals at 19h',
    outcome: 'Closed, no penalty proceedings',
  },
]

export const LOCAL_STORAGE_KEY = 'reedshield.dpdp.breachClock'
