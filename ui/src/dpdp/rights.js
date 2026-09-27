/**
 * Consent and Data Principal rights — demonstration data. Dates ISO.
 */

export const CONSENT = {
  activitiesConsentBased: 21,
  activitiesWithNotice: 18,          // S.5 coverage: 18 of 21
  consentRecords: 1_284_310,
  purposesRegistered: 14,
  withdrawalMedianHours: 5.2,        // S.6(4)
  withdrawalsLast30d: 4_120,
  consentManagerRegistered: false,   // Rules: Consent Manager registration with the Board
}

/** Data Principal request queue, per right. slaDays is the internal SLA. */
export const REQUESTS = [
  { id: 'access',     right: 'Access',       section: 'S.11', open: 12, overdue: 1, medianDays: 6,  slaDays: 30, last30d: 41 },
  { id: 'correction', right: 'Correction',   section: 'S.12', open: 7,  overdue: 0, medianDays: 3,  slaDays: 30, last30d: 28 },
  { id: 'erasure',    right: 'Erasure',      section: 'S.12', open: 9,  overdue: 0, medianDays: 4,  slaDays: 30, last30d: 33 },
  { id: 'nomination', right: 'Nomination',   section: 'S.14', open: 2,  overdue: 0, medianDays: 2,  slaDays: 30, last30d: 5  },
  { id: 'grievance',  right: 'Grievance',    section: 'S.13', open: 3,  overdue: 0, medianDays: 9,  slaDays: 90, last30d: 6  },
]

export const GRIEVANCE = {
  officerPublished: true,
  officerName: 'Grievance Officer (published on privacy page)',
  openCases: 3,
  oldestDays: 9,
  responsePeriodDays: 90,
}

/** Recent requests, newest first. */
export const RECENT_REQUESTS = [
  { id: 'AR-0912', type: 'Access',     received: '2026-09-14', due: '2026-10-14', status: 'open',        channel: 'Web form' },
  { id: 'ER-0911', type: 'Erasure',    received: '2026-09-14', due: '2026-10-14', status: 'open',        channel: 'Email' },
  { id: 'CR-0910', type: 'Correction', received: '2026-09-13', due: '2026-10-13', status: 'in_progress', channel: 'App' },
  { id: 'GR-0909', type: 'Grievance',  received: '2026-09-12', due: '2026-12-11', status: 'open',        channel: 'Web form' },
  { id: 'AR-0871', type: 'Access',     received: '2026-08-25', due: '2026-09-24', status: 'in_progress', channel: 'Email', flagged: 'Open 20 days' },
]
