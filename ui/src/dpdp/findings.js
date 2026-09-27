/**
 * DPDP findings — demonstration data.
 *
 * A finding is an exception against one control, with the evidence that
 * raised it and the remediation that closes it. `status`: open |
 * in_progress | resolved | risk_accepted. Dates ISO (YYYY-MM-DD).
 */

export const FINDING_STATUS = Object.freeze({
  open:          'Open',
  in_progress:   'In progress',
  resolved:      'Resolved',
  risk_accepted: 'Risk accepted',
})

export const FINDINGS = [
  {
    id: 'DPDP-0142', title: 'Public read on S3 bucket holding KYC document scans',
    severity: 'Critical', section: 'S.8(5)', category: 'Security & breach', penaltyTier: 'T1',
    asset: { type: 'Cloud storage', name: 'kyc-uploads-prod (ap-south-1)' },
    owner: 'Cloud Platform', status: 'open', detected: '2026-09-13', due: '2026-09-16',
    rationale: 'Bucket policy grants s3:GetObject to *. Objects include Aadhaar and PAN scans classified as personal data.',
    evidence: [
      { kind: 'scan',   ref: 'WP D-4.2', label: 'Cloud Posture finding CSPM-8817 (bucket policy)' },
      { kind: 'policy', ref: 'WP D-4.3', label: 'Data classification: kyc-uploads-prod = Personal / Sensitive' },
    ],
    remediation: [
      { step: 'Remove the wildcard principal from the bucket policy', done: false },
      { step: 'Enable S3 Block Public Access at the account level', done: false },
      { step: 'Run the retest scan and attach the result to WP D-4.2', done: false },
    ],
  },
  {
    id: 'DPDP-0139', title: 'No encryption-at-rest evidence for customer_profiles database',
    severity: 'High', section: 'S.8(5)', category: 'Security & breach', penaltyTier: 'T1',
    asset: { type: 'Database', name: 'customer_profiles (RDS, ap-south-1)' },
    owner: 'Security Engineering', status: 'in_progress', detected: '2026-09-11', due: '2026-09-25',
    rationale: 'RDS instance reports StorageEncrypted=false. The store holds names, phone numbers and addresses.',
    evidence: [
      { kind: 'scan', ref: 'WP D-4.5', label: 'Cloud Posture finding CSPM-8791 (RDS encryption)' },
    ],
    remediation: [
      { step: 'Snapshot, copy with KMS key, restore encrypted instance', done: true },
      { step: 'Cut over the connection string during the maintenance window', done: false },
      { step: 'Attach the post-cutover configuration export as evidence', done: false },
    ],
  },
  {
    id: 'DPDP-0137', title: 'Marketing consent bundled with account creation on web signup',
    severity: 'High', section: 'S.6', category: 'Notice & consent', penaltyTier: 'T4',
    asset: { type: 'Web flow', name: 'web / signup v3' },
    owner: 'Product Legal', status: 'open', detected: '2026-09-11', due: '2026-10-02',
    rationale: 'A single checkbox covers account terms and marketing messages. Consent is not specific and not unconditional (S.6(1)).',
    evidence: [
      { kind: 'log', ref: 'WP C-2.1', label: 'Consent record schema shows one purpose id for two purposes' },
    ],
    remediation: [
      { step: 'Split the checkbox into terms and marketing with separate purpose ids', done: false },
      { step: 'Backfill existing records as marketing = not given', done: false },
    ],
  },
  {
    id: 'DPDP-0135', title: 'Snowflake replica in us-east-1 has no transfer basis recorded',
    severity: 'High', section: 'S.16', category: 'Cross-border', penaltyTier: 'T4',
    asset: { type: 'Data warehouse', name: 'Snowflake ANALYTICS_PROD (us-east-1 replica)' },
    owner: 'Cloud Platform', status: 'open', detected: '2026-09-13', due: '2026-09-30',
    rationale: 'Replication of the CUSTOMERS schema to a US region is live; the transfer register has no contract clause or purpose against it.',
    evidence: [
      { kind: 'scan',   ref: 'WP F-1.4', label: 'Inventory: cross-region replication enabled' },
      { kind: 'policy', ref: 'WP F-1.1', label: 'Transfer register entry XB-04 incomplete' },
    ],
    remediation: [
      { step: 'Record purpose, data categories and the processor contract clause in XB-04', done: false },
      { step: 'Confirm no Central Government notification restricts the destination', done: false },
    ],
  },
  {
    id: 'DPDP-0133', title: 'Erasure does not propagate to analytics warehouse for 45 days',
    severity: 'Medium', section: 'S.12', category: 'Data Principal rights', penaltyTier: 'T4',
    asset: { type: 'Pipeline', name: 'dbt / customers_snapshot' },
    owner: 'Data Engineering', status: 'in_progress', detected: '2026-09-09', due: '2026-10-09',
    rationale: 'Erasure requests clear primary stores within a day; the daily snapshot model retains keyed rows until the 45-day window rolls.',
    evidence: [
      { kind: 'log', ref: 'WP E-3.2', label: 'Erasure request ER-2210 traced through Lineage' },
    ],
    remediation: [
      { step: 'Add an erasure sweep to the snapshot model', done: true },
      { step: 'Re-run ER-2210 and attach the Lineage trace', done: false },
    ],
  },
  {
    id: 'DPDP-0131', title: 'DPIA overdue for the recommender processing activity',
    severity: 'Medium', section: 'S.10', category: 'Significant Data Fiduciary', penaltyTier: 'T3',
    asset: { type: 'Processing activity', name: 'PA-017 Product recommender' },
    owner: 'DPO', status: 'open', detected: '2026-09-03', due: '2026-09-20',
    rationale: 'The activity profiles behaviour of more than 2M principals; the DPIA scheduled for August was not signed off.',
    evidence: [
      { kind: 'policy', ref: 'WP B-2.6', label: 'Processing registry: PA-017 DPIA status = draft' },
    ],
    remediation: [
      { step: 'Complete the DPIA risk register and sign-off', done: false },
    ],
  },
  {
    id: 'DPDP-0128', title: 'Mobile onboarding collects consent before notice is shown',
    severity: 'Medium', section: 'S.5', category: 'Notice & consent', penaltyTier: 'T4',
    asset: { type: 'Mobile flow', name: 'android / onboarding 4.2' },
    owner: 'Product Legal', status: 'open', detected: '2026-09-02', due: '2026-10-02',
    rationale: 'The consent toggle is on screen 2; the notice link is on screen 4. S.5 requires the notice to accompany or precede the request.',
    evidence: [
      { kind: 'log', ref: 'WP C-1.3', label: 'Screen-flow capture, build 4.2.0' },
    ],
    remediation: [
      { step: 'Move the notice summary above the consent toggle', done: false },
    ],
  },
  {
    id: 'DPDP-0121', title: 'Access request AR-0871 open past 20 days',
    severity: 'Low', section: 'S.11', category: 'Data Principal rights', penaltyTier: 'T4',
    asset: { type: 'Request', name: 'AR-0871' },
    owner: 'Support Operations', status: 'in_progress', detected: '2026-08-30', due: '2026-09-19',
    rationale: 'Export from the legacy CRM is manual; internal SLA is 30 days.',
    evidence: [
      { kind: 'log', ref: 'WP E-1.1', label: 'Request queue export' },
    ],
    remediation: [
      { step: 'Complete the CRM export and deliver', done: false },
    ],
  },
  {
    id: 'DPDP-0117', title: 'Datadog EU log shipping includes customer email addresses',
    severity: 'Low', section: 'S.16', category: 'Cross-border', penaltyTier: 'T4',
    asset: { type: 'Observability', name: 'Datadog (EU1)' },
    owner: 'Platform Engineering', status: 'resolved', detected: '2026-08-21', due: '2026-09-04',
    rationale: 'Application logs carried email addresses in a request field; transfer basis for EU logging was recorded on resolution.',
    evidence: [
      { kind: 'log', ref: 'WP F-2.2', label: 'Log scrubber rule deployed 2026-09-01; sample verified' },
    ],
    remediation: [
      { step: 'Scrub email from request logs at the agent', done: true },
      { step: 'Record transfer basis XB-06', done: true },
    ],
  },
]
