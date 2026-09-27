/**
 * Cross-border transfer register (S.16) — demonstration data. Dates ISO.
 *
 * S.16 permits transfers outside India except to countries the Central
 * Government notifies as restricted. The register records purpose, data
 * categories, the contractual basis, and review status per transfer.
 */

export const TRANSFER_STATUS = Object.freeze({
  documented: 'Documented',
  review:     'Needs review',
  incomplete: 'Basis missing',
  blocked:    'Blocked',
})

export const TRANSFERS = [
  {
    id: 'XB-01', processor: 'Amazon Web Services', service: 'Backups (S3 cross-region replication)',
    from: 'ap-south-1 (Mumbai)', to: 'ap-southeast-1 (Singapore)', country: 'Singapore',
    purpose: 'Disaster recovery', dataCategories: ['Identity', 'Contact', 'Transaction'],
    basis: 'DPA + SCC-equivalent clauses; contract cl. 9.2', status: 'documented', volume: '~4.1 TB', lastReviewed: '2026-07-30',
  },
  {
    id: 'XB-02', processor: 'Twilio', service: 'SMS / OTP delivery',
    from: 'ap-south-1', to: 'us-east-1', country: 'United States',
    purpose: 'Authentication messages', dataCategories: ['Contact (phone)'],
    basis: 'Processor terms; contract cl. 4.1', status: 'documented', volume: '~2.6M messages/mo', lastReviewed: '2026-08-12',
  },
  {
    id: 'XB-03', processor: 'Zendesk', service: 'Support ticketing',
    from: 'ap-south-1', to: 'eu-west-1', country: 'Ireland',
    purpose: 'Customer support', dataCategories: ['Identity', 'Contact', 'Support content'],
    basis: 'DPA 2025-03; contract cl. 7', status: 'documented', volume: '~18k tickets/mo', lastReviewed: '2026-08-12',
  },
  {
    id: 'XB-04', processor: 'Snowflake', service: 'ANALYTICS_PROD replica',
    from: 'ap-south-1', to: 'us-east-1', country: 'United States',
    purpose: 'Not recorded', dataCategories: ['CUSTOMERS schema (unclassified)'],
    basis: 'Not recorded', status: 'incomplete', volume: '~1.2M rows', lastReviewed: null,
    finding: 'DPDP-0135',
  },
  {
    id: 'XB-05', processor: 'OpenRouter / model providers', service: 'LLM inference for billing-assistant',
    from: 'ap-south-1', to: 'Multiple (US)', country: 'United States',
    purpose: 'Assistant responses', dataCategories: ['Prompt content (PII-screened by guard model)'],
    basis: 'Provider terms; guard-model PII block enforced (Policy Impact trace)', status: 'review', volume: '~310k requests/mo', lastReviewed: '2026-09-01',
  },
  {
    id: 'XB-06', processor: 'Datadog', service: 'Logs and APM',
    from: 'ap-south-1', to: 'EU1', country: 'Germany',
    purpose: 'Observability', dataCategories: ['Request metadata (email scrubbed)'],
    basis: 'DPA; scrubber rule LOG-EMAIL-01', status: 'documented', volume: '~900 GB/mo', lastReviewed: '2026-09-01',
  },
  {
    id: 'XB-07', processor: 'Salesforce', service: 'CRM',
    from: 'ap-south-1', to: 'ap-northeast-1 (Tokyo)', country: 'Japan',
    purpose: 'Sales and account management', dataCategories: ['Identity', 'Contact', 'Commercial'],
    basis: 'DPA; contract cl. 11', status: 'review', volume: '~86k records', lastReviewed: '2026-03-15',
    note: 'Review older than 180 days',
  },
]

export const RESTRICTED_COUNTRIES_NOTE = 'No countries notified as restricted under S.16 as of the last register review. Re-check the Central Government notification list at each review.'
