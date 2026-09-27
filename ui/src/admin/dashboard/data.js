/**
 * Dashboard demonstration figures. Every number here is synthetic and the
 * page stamps them DEMO DATA. Replace with live reads from spm-api and the
 * orchestrator when the unified endpoints exist.
 */

export const AS_OF = '2026-09-14T09:30:00+05:30'

export const TRIAL_BALANCE = {
  blendedRisk:     { score: 72, movement7d: -4 },
  openCritical:    { count: 14, today: 3, modules: 5, oldest: '2h 14m' },
  meanTimeToFreeze:{ seconds: 38, slaSeconds: 60, basis: 'alert → identity frozen, 30-day average' },
  modulesEnforced: { enforced: 8, total: 8 },
}

/** The week's highest-confidence attack path, as the Risk Graph reports it. */
export const ATTACK_PATH = {
  confidence: 0.91,
  nodes: [
    { id: 'sec',  module: 'Code Guardrails', tag: 'SEC', title: 'Hard-coded secret',        asset: 'payments-api repo',      ref: 'CHAIN-1', to: '/admin/inventory' },
    { id: 'iam',  module: 'Cloud Posture',   tag: 'IAM', title: 'Over-privileged role',     asset: 'svc-payments-prod',      ref: 'CHAIN-2', to: '/admin/identity' },
    { id: 'ai',   module: 'AI-SPM',          tag: 'AI',  title: 'Agent credential reuse',   asset: 'billing-assistant agent', ref: 'CHAIN-3', to: '/admin/runtime' },
    { id: 'pii',  module: 'DPDPA',           tag: 'PII', title: 'Customer PII exposure',    asset: 'customer_profiles',       ref: 'CHAIN-4', to: '/admin/dpdp/findings' },
  ],
  related: { tag: 'K8s', title: 'Exposed secret in cluster', asset: 'payments namespace', ref: 'CHAIN-5' },
}

export const RECENT_ALERTS = [
  { id: 'ALT-7731', severity: 'Critical', title: 'PII returned by billing-assistant in simulated exfil test', module: 'AI-SPM · Simulation', age: '12m', to: '/admin/alerts' },
  { id: 'ALT-7729', severity: 'Critical', title: 'Secret committed to payments-api, present in git history', module: 'Code Guardrails',    age: '34m', to: '/admin/alerts' },
  { id: 'ALT-7724', severity: 'High',     title: 'svc-payments-prod flagged over-privileged by CIEM',         module: 'Cloud Posture',      age: '1h',  to: '/admin/alerts' },
  { id: 'ALT-7719', severity: 'High',     title: 'Pentest engagement confirmed exploitable SSRF on api-gateway', module: 'Pentest',         age: '2h',  to: '/admin/alerts' },
  { id: 'ALT-7712', severity: 'Medium',   title: 'DPIA sign-off overdue for recommender processing activity', module: 'DPDPA',              age: '3h',  to: '/admin/dpdp/findings' },
]

export const MODULE_HEALTH = [
  { id: 'aispm',    module: 'AI-SPM',           figures: '212 assets · 3 findings',          status: 'warn', to: '/admin/posture' },
  { id: 'cloud',    module: 'Cloud Posture',    figures: '1,840 resources · 41 findings',    status: 'warn', to: '/admin/inventory' },
  { id: 'code',     module: 'Code Guardrails',  figures: '86 repos · 2 secrets live',        status: 'fail', to: '/admin/alerts' },
  { id: 'autofix',  module: 'AutoFix',          figures: '18 PRs open · 4 pending approval', status: 'pass', to: '/admin/automation' },
  { id: 'pentest',  module: 'Pentest',          figures: '1 engagement live',                status: 'pass', stamp: 'ROE signed', to: '/admin/simulation' },
  { id: 'comply',   module: 'Compliance',       figures: '6 frameworks · avg 88%',           status: 'pass', to: '/admin/posture' },
  { id: 'dpdp',     module: 'DPDPA',            figures: '1 DPIA overdue · clock 0 active',  status: 'warn', to: '/admin/dpdp' },
  { id: 'identity', module: 'Identity & Trust', figures: '0 frozen · MFA 100%',              status: 'pass', to: '/admin/identity' },
]

export const DPDP_SUMMARY = {
  readiness: 64,
  categories: [
    { label: 'Consent (S.5–S.6)',        status: 'warn' },
    { label: 'Rights (S.11–S.13)',       status: 'pass' },
    { label: 'Security & breach (S.8)',  status: 'fail' },
    { label: 'Cross-border (S.16)',      status: 'fail' },
    { label: 'SDF duties (S.10)',        status: 'warn' },
  ],
  breachClocks: 0,
  windowHours: 72,
  lastDrill: '2026-08-20',
}
