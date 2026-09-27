/**
 * DPDP Act control register — demonstration data.
 *
 * One entry per obligation the module assesses. `status` is the audit tick:
 * pass | warn | fail | na. `weight` is the configurable contribution to the
 * readiness score (1–3). `penaltyTier` is a reference to the Act's schedule
 * of penalties, for legal review; it is never a computed liability.
 *
 * Dates are ISO (YYYY-MM-DD). All figures are synthetic.
 */

export const PENALTY_TIERS = Object.freeze({
  T1: { label: 'Tier 1', reference: 'Up to ₹250 crore', basis: 'Schedule, item 1 — failure to take reasonable security safeguards (S.8(5))' },
  T2: { label: 'Tier 2', reference: 'Up to ₹200 crore', basis: 'Schedule, items 2–3 — breach notification (S.8(6)); children (S.9)' },
  T3: { label: 'Tier 3', reference: 'Up to ₹150 crore', basis: 'Schedule, item 4 — Significant Data Fiduciary obligations (S.10)' },
  T4: { label: 'Tier 4', reference: 'Up to ₹50 crore',  basis: 'Schedule, item 7 — any other provision of the Act or Rules' },
  T5: { label: 'Tier 5', reference: 'Up to ₹10,000',    basis: 'Schedule, item 5 — duties of Data Principals (S.15)' },
})

export const CATEGORIES = [
  'Lawful basis',
  'Notice & consent',
  'Security & breach',
  'Children',
  'Significant Data Fiduciary',
  'Data Principal rights',
  'Cross-border',
  'Exemptions',
]

export const CONTROLS = [
  {
    id: 'S.4', section: 'Section 4', title: 'Grounds for processing personal data',
    category: 'Lawful basis', weight: 3, status: 'pass', penaltyTier: 'T4',
    evidence: 6, findings: 0, owner: 'Privacy Office', lastAssessed: '2026-09-12',
    summary: 'Every processing activity in the registry records a lawful purpose and either a consent record or a listed legitimate use.',
  },
  {
    id: 'S.5', section: 'Section 5', title: 'Notice to the Data Principal',
    category: 'Notice & consent', weight: 2, status: 'warn', penaltyTier: 'T4',
    evidence: 4, findings: 1, owner: 'Privacy Office', lastAssessed: '2026-09-12',
    summary: 'Notices exist for 86% of consent-based activities. Two mobile flows collect consent before the notice is shown.',
  },
  {
    id: 'S.6', section: 'Section 6', title: 'Consent: free, specific, informed, unconditional, unambiguous',
    category: 'Notice & consent', weight: 3, status: 'warn', penaltyTier: 'T4',
    evidence: 5, findings: 2, owner: 'Product Legal', lastAssessed: '2026-09-11',
    summary: 'Consent records are captured per purpose. Marketing consent is bundled with account creation in the web signup.',
  },
  {
    id: 'S.6(4)', section: 'Section 6(4)', title: 'Withdrawal of consent as easy as giving it',
    category: 'Notice & consent', weight: 2, status: 'pass', penaltyTier: 'T4',
    evidence: 3, findings: 0, owner: 'Product Legal', lastAssessed: '2026-09-11',
    summary: 'Withdrawal is one action in account settings; median propagation to processors is 5.2 hours.',
  },
  {
    id: 'S.7', section: 'Section 7', title: 'Certain legitimate uses',
    category: 'Lawful basis', weight: 2, status: 'pass', penaltyTier: 'T4',
    evidence: 4, findings: 0, owner: 'Privacy Office', lastAssessed: '2026-09-12',
    summary: 'Legitimate-use claims (employment, emergencies, legal obligation) are enumerated in the registry with the specific clause.',
  },
  {
    id: 'S.8(5)', section: 'Section 8(5)', title: 'Reasonable security safeguards',
    category: 'Security & breach', weight: 3, status: 'fail', penaltyTier: 'T1',
    evidence: 9, findings: 3, owner: 'Security Engineering', lastAssessed: '2026-09-13',
    summary: 'Three production stores holding personal data have no encryption-at-rest evidence; one has public read on a bucket policy.',
  },
  {
    id: 'S.8(6)', section: 'Section 8(6)', title: 'Breach intimation to the Board and affected Data Principals',
    category: 'Security & breach', weight: 3, status: 'pass', penaltyTier: 'T2',
    evidence: 5, findings: 0, owner: 'Incident Response', lastAssessed: '2026-09-13',
    summary: 'Runbook rehearsed on 2026-08-20; templates for the Board and principals approved; 72-hour and 6-hour windows tracked.',
  },
  {
    id: 'S.9', section: 'Section 9', title: 'Processing of personal data of children',
    category: 'Children', weight: 3, status: 'na', penaltyTier: 'T2',
    evidence: 0, findings: 0, owner: 'Product Legal', lastAssessed: null,
    summary: 'Age assurance and verifiable parental consent are out of scope for this pass. No age signal is collected today.',
  },
  {
    id: 'S.10', section: 'Section 10', title: 'Significant Data Fiduciary obligations',
    category: 'Significant Data Fiduciary', weight: 2, status: 'warn', penaltyTier: 'T3',
    evidence: 2, findings: 1, owner: 'DPO', lastAssessed: '2026-09-10',
    summary: 'DPO appointed and resident in India. Independent data audit not yet scheduled; DPIA overdue for the recommender activity.',
  },
  {
    id: 'S.11', section: 'Section 11', title: 'Right to access information about personal data',
    category: 'Data Principal rights', weight: 2, status: 'pass', penaltyTier: 'T4',
    evidence: 4, findings: 0, owner: 'Support Operations', lastAssessed: '2026-09-12',
    summary: 'Access requests fulfilled in a median of 6 days against a 30-day internal SLA; 1 request open past 20 days.',
  },
  {
    id: 'S.12', section: 'Section 12', title: 'Right to correction and erasure',
    category: 'Data Principal rights', weight: 2, status: 'warn', penaltyTier: 'T4',
    evidence: 3, findings: 1, owner: 'Support Operations', lastAssessed: '2026-09-12',
    summary: 'Erasure propagates to primary stores; the analytics warehouse retains a keyed copy for 45 days past the request.',
  },
  {
    id: 'S.13', section: 'Section 13', title: 'Right of grievance redressal',
    category: 'Data Principal rights', weight: 2, status: 'pass', penaltyTier: 'T4',
    evidence: 3, findings: 0, owner: 'Grievance Officer', lastAssessed: '2026-09-12',
    summary: 'Grievance Officer published; 3 open grievances, oldest 9 days, all within the 90-day response period.',
  },
  {
    id: 'S.16', section: 'Section 16', title: 'Processing of personal data outside India',
    category: 'Cross-border', weight: 2, status: 'fail', penaltyTier: 'T4',
    evidence: 2, findings: 1, owner: 'Cloud Platform', lastAssessed: '2026-09-13',
    summary: 'Seven transfers documented; two replicas (Snowflake us-east-1, Datadog EU) have no transfer basis or contract clause recorded.',
  },
  {
    id: 'S.18', section: 'Section 18', title: 'Exemptions claimed and documented',
    category: 'Exemptions', weight: 1, status: 'pass', penaltyTier: 'T4',
    evidence: 2, findings: 0, owner: 'Privacy Office', lastAssessed: '2026-09-12',
    summary: 'Two exemption claims (research statistics; legal claims) recorded with the specific sub-clause and a review date.',
  },
]

/** Eight weekly readiness readings, oldest first (synthetic). */
export const READINESS_HISTORY = [
  { week: '2026-07-27', score: 48 },
  { week: '2026-08-03', score: 51 },
  { week: '2026-08-10', score: 53 },
  { week: '2026-08-17', score: 57 },
  { week: '2026-08-24', score: 60 },
  { week: '2026-08-31', score: 58 },
  { week: '2026-09-07', score: 62 },
  { week: '2026-09-14', score: 64 },
]
